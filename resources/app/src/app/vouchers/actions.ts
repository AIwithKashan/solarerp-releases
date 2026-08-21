'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';

import type {
  Voucher, VoucherInsert, VoucherUpdate, VoucherType, ActionResult, Account
} from '@/types/database';

import { getAccountLiveBalance } from '@/lib/accountingUtils';

const VOUCHERS_PATH = '/vouchers';

function extractMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  return fallback;
}

export async function getCashAccounts(): Promise<ActionResult<Account[]>> {
  try {
    const data = await prisma.account.findMany({
      where: { account_type: 'Cash Account' },
      orderBy: { account_title: 'asc' }
    });
    return { success: true, data: data as any };
  } catch (err) {
    return { success: false, error: extractMessage(err, 'Failed to fetch Cash Accounts') };
  }
}

export async function getBankAccounts(): Promise<ActionResult<Account[]>> {
  try {
    const data = await prisma.account.findMany({
      where: { account_type: 'Bank Account' },
      orderBy: { account_title: 'asc' }
    });
    return { success: true, data: data as any };
  } catch (err) {
    return { success: false, error: extractMessage(err, 'Failed to fetch Bank Accounts') };
  }
}

export async function getPartyAccounts(): Promise<ActionResult<Account[]>> {
  try {
    const data = await prisma.account.findMany({
      orderBy: { account_title: 'asc' }
    });

    // Aggregate dues for Suppliers
    const unpaidPurchases = await prisma.purchase.groupBy({
      by: ['supplier_id'],
      where: { paymentStatus: { in: ['unpaid', 'partial'] }, supplier_id: { not: null } },
      _sum: { remainingAmount: true }
    });

    // Aggregate dues for Customers
    const unpaidSales = await prisma.sale.groupBy({
      by: ['customer_id'],
      where: { status: { in: ['unpaid', 'partial'] }, customer_id: { not: null } },
      _sum: { remaining_balance: true }
    });

    const supplierDues = unpaidPurchases.reduce((acc, curr) => {
      if (curr.supplier_id) acc[curr.supplier_id] = curr._sum.remainingAmount || 0;
      return acc;
    }, {} as Record<string, number>);

    const customerDues = unpaidSales.reduce((acc, curr) => {
      if (curr.customer_id) acc[curr.customer_id] = curr._sum.remaining_balance || 0;
      return acc;
    }, {} as Record<string, number>);

    const enriched = data.map(account => {
      let total_due = 0;
      if (account.account_type === 'Suppliers') total_due = supplierDues[account.id] || 0;
      if (account.account_type === 'Customers') total_due = customerDues[account.id] || 0;
      return { ...account, total_due };
    });

    return { success: true, data: enriched as any };
  } catch (err) {
    return { success: false, error: extractMessage(err, 'Failed to fetch Party Accounts') };
  }
}

export async function createVoucher(payload: Omit<VoucherInsert, 'direction' | 'voucher_no'>): Promise<ActionResult<Voucher>> {
  try {


    if (!payload.main_account_id) {
      return { success: false, error: 'Main Cash/Bank account is required.' };
    }
    if (!payload.main_account_name) {
      return { success: false, error: 'Main Cash/Bank account name is required.' };
    }
    if (!payload.amount || payload.amount <= 0) {
      return { success: false, error: 'Voucher amount must be greater than 0.' };
    }

    const direction: 'receipt' | 'payment' =
      (payload.voucher_type === 'Cash Receipt' || payload.voucher_type === 'Bank Receipt')
        ? 'receipt'
        : 'payment';

    if (direction === 'payment') {
      const mainAcc = await prisma.account.findUnique({ where: { id: payload.main_account_id } });
      if (mainAcc && (mainAcc.account_type === 'Cash Account' || mainAcc.account_type === 'Bank Account')) {
        const available = await getAccountLiveBalance(payload.main_account_id);
        if (available < payload.amount) {
          return {
            success: false,
            error: `Insufficient Balance in ${mainAcc.account_title}! Available balance is PKR ${available.toLocaleString('en-PK', { minimumFractionDigits: 2 })}, but requested payment is PKR ${payload.amount.toLocaleString('en-PK', { minimumFractionDigits: 2 })}.`
          };
        }
      }
    }

    const count = await prisma.voucher.count();
    const voucher_no = `VCH-${1000 + count + 1}`;

    const data = await prisma.voucher.create({
      data: {
        voucher_type: payload.voucher_type,
        voucher_date: payload.voucher_date,
        main_account_id: payload.main_account_id,
        main_account_name: payload.main_account_name,
        party_account_id: payload.party_account_id || null,
        party_account_name: payload.party_account_name || null,
        direction,
        amount: payload.amount,
        details: payload.details || null,
        remarks: payload.remarks || null,
        voucher_no
      }
    });

    // ── Auto-update account balances since SQLite lacks triggers ──────
    if (direction === 'receipt') {
      await prisma.account.update({ where: { id: payload.main_account_id }, data: { balance: { increment: payload.amount } } });
      if (payload.party_account_id) {
        await prisma.account.update({ where: { id: payload.party_account_id }, data: { balance: { decrement: payload.amount } } });
      }
    } else {
      await prisma.account.update({ where: { id: payload.main_account_id }, data: { balance: { decrement: payload.amount } } });
      if (payload.party_account_id) {
        await prisma.account.update({ where: { id: payload.party_account_id }, data: { balance: { increment: payload.amount } } });
      }
    }

    // ── Auto-update Purchase remaining due when paying a Supplier ──────
    // If this is a Payment voucher AND the party is a Supplier account,
    // automatically allocate the payment to their oldest unpaid purchases (FIFO).
    if (payload.party_account_id) {
      const partyAccount = await prisma.account.findUnique({
        where: { id: payload.party_account_id }
      });

      if (partyAccount && partyAccount.account_type === 'Suppliers' && direction === 'payment') {
        // Get all unpaid/partial purchases for this supplier, oldest first
        const unpaidPurchases = await prisma.purchase.findMany({
          where: {
            supplier_id: payload.party_account_id,
            paymentStatus: { in: ['unpaid', 'partial'] }
          },
          orderBy: { created_at: 'asc' }
        });

        let remainingPayment = payload.amount;

        for (const purchase of unpaidPurchases) {
          if (remainingPayment <= 0) break;

          const currentRemaining = purchase.remainingAmount || (purchase.amount - (purchase.paidAmount || 0));
          const allocate = Math.min(remainingPayment, currentRemaining);

          if (allocate <= 0) continue;

          const newPaid = (purchase.paidAmount || 0) + allocate;
          const newRemaining = purchase.amount - newPaid;
          const newStatus = newRemaining <= 0.01 ? 'paid' : 'partial';

          await prisma.purchase.update({
            where: { id: purchase.id },
            data: {
              paidAmount: newPaid,
              remainingAmount: Math.max(0, newRemaining),
              paymentStatus: newStatus
            }
          });

          await prisma.voucherPurchaseAllocation.create({
            data: {
              voucher_id: data.id,
              purchase_id: purchase.id,
              allocatedAmount: allocate
            }
          });

          remainingPayment -= allocate;
        }
      } else if (partyAccount && partyAccount.account_type === 'Customers' && direction === 'receipt') {
        // Auto-update Sale remaining due when receiving from a Customer (FIFO)
        const unpaidSales = await prisma.sale.findMany({
          where: {
            customer_id: payload.party_account_id,
            status: { in: ['unpaid', 'partial'] }
          },
          orderBy: { created_at: 'asc' }
        });

        let remainingReceipt = payload.amount;

        for (const sale of unpaidSales) {
          if (remainingReceipt <= 0) break;

          const currentRemaining = sale.remaining_balance || (sale.net_total - (sale.total_received || 0));
          const allocate = Math.min(remainingReceipt, currentRemaining);

          if (allocate <= 0) continue;

          const newReceived = (sale.total_received || 0) + allocate;
          const newRemaining = sale.net_total - newReceived;
          const newStatus = newRemaining <= 0.01 ? 'paid' : 'partial';

          await prisma.sale.update({
            where: { id: sale.id },
            data: {
              total_received: newReceived,
              remaining_balance: Math.max(0, newRemaining),
              status: newStatus
            }
          });

          await prisma.voucherSaleAllocation.create({
            data: {
              voucher_id: data.id,
              sale_id: sale.id,
              allocatedAmount: allocate
            }
          });

          remainingReceipt -= allocate;
        }
      }
    }

    revalidatePath(VOUCHERS_PATH);
    revalidatePath('/purchases');
    revalidatePath('/sales');
    revalidatePath('/accounts');
    return { success: true, data: data as any };
  } catch (err: any) {
    const msg = err?.message ?? 'Failed to create voucher';
    console.error('[createVoucher] Exception →', err);
    return { success: false, error: msg };
  }
}

export async function getVouchers(filterType?: VoucherType): Promise<ActionResult<Voucher[]>> {
  try {
    const whereClause: any = {};
    if (filterType) {
      whereClause.voucher_type = filterType;
    }

    const data = await prisma.voucher.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' }
    });

    return { success: true, data: data as any };
  } catch (err) {
    return { success: false, error: extractMessage(err, 'Failed to fetch vouchers') };
  }
}

export async function deleteVoucher(id: string): Promise<ActionResult<void>> {
  try {
    // Find the voucher
    const voucher = await prisma.voucher.findFirst({
      where: { id }
    });
    if (!voucher) return { success: false, error: 'Voucher not found' };

    // Reverse Account Balances manually since SQLite lacks triggers
    if (voucher.direction === 'receipt') {
      await prisma.account.update({ where: { id: voucher.main_account_id }, data: { balance: { decrement: voucher.amount } } });
      if (voucher.party_account_id) {
        await prisma.account.update({ where: { id: voucher.party_account_id }, data: { balance: { increment: voucher.amount } } });
      }
    } else {
      await prisma.account.update({ where: { id: voucher.main_account_id }, data: { balance: { increment: voucher.amount } } });
      if (voucher.party_account_id) {
        await prisma.account.update({ where: { id: voucher.party_account_id }, data: { balance: { decrement: voucher.amount } } });
      }
    }

    // Find and reverse any purchase allocations
    const allocations = await prisma.voucherPurchaseAllocation.findMany({
      where: { voucher_id: id }
    });

    for (const alloc of allocations) {
      const purchase = await prisma.purchase.findUnique({
        where: { id: alloc.purchase_id }
      });
      if (purchase) {
        const newPaid = Math.max(0, purchase.paidAmount - alloc.allocatedAmount);
        const newRemaining = purchase.amount - newPaid;
        const newStatus = newRemaining >= purchase.amount - 0.01 ? 'unpaid' : (newRemaining <= 0.01 ? 'paid' : 'partial');
        
        await prisma.purchase.update({
          where: { id: purchase.id },
          data: {
            paidAmount: newPaid,
            remainingAmount: newRemaining,
            paymentStatus: newStatus
          }
        });
      }
    }

    // Find and reverse any sale allocations
    const saleAllocations = await prisma.voucherSaleAllocation.findMany({
      where: { voucher_id: id }
    });

    for (const alloc of saleAllocations) {
      const sale = await prisma.sale.findUnique({
        where: { id: alloc.sale_id }
      });
      if (sale) {
        const newReceived = Math.max(0, sale.total_received - alloc.allocatedAmount);
        const newRemaining = sale.net_total - newReceived;
        const newStatus = newRemaining >= sale.net_total - 0.01 ? 'unpaid' : (newRemaining <= 0.01 ? 'paid' : 'partial');
        
        await prisma.sale.update({
          where: { id: sale.id },
          data: {
            total_received: newReceived,
            remaining_balance: newRemaining,
            status: newStatus
          }
        });
      }
    }

    // Delete the voucher (allocations cascade)
    await prisma.voucher.delete({
      where: { id }
    });

    revalidatePath(VOUCHERS_PATH);
    revalidatePath('/purchases');
    revalidatePath('/sales');
    return { success: true, data: undefined };
  } catch (err: any) {
    console.error('[deleteVoucher] Exception:', err);
    return { success: false, error: err?.message || 'Failed to delete voucher' };
  }
}

export async function createContraVoucher(payload: {
  voucher_date: string;
  from_account_id: string;
  from_account_name: string;
  to_account_id: string;
  to_account_name: string;
  amount: number;
  remarks?: string;
}): Promise<ActionResult<Voucher>> {
  try {


    if (payload.from_account_id === payload.to_account_id) {
      return { success: false, error: 'From and To accounts cannot be the same.' };
    }
    if (!payload.amount || payload.amount <= 0) {
      return { success: false, error: 'Amount must be greater than 0.' };
    }

    const count = await prisma.voucher.count({ where: { voucher_type: 'Contra Voucher' } });
    const voucher_no = `CV-${1001 + count}`;

    const data = await prisma.voucher.create({
      data: {
        voucher_no,
        voucher_type: 'Contra Voucher',
        voucher_date: payload.voucher_date,
        main_account_id: payload.from_account_id,
        main_account_name: payload.from_account_name,
        party_account_id: payload.to_account_id,
        party_account_name: payload.to_account_name,
        direction: 'payment', // payment means main_account is credited (decreased), party_account is debited (increased)
        amount: payload.amount,
        details: payload.remarks || 'Contra Transfer',
        remarks: payload.remarks,
      }
    });

    revalidatePath(VOUCHERS_PATH);
    revalidatePath('/reports');
    return { success: true, data: data as any };
  } catch (err) {
    return { success: false, error: extractMessage(err, 'Failed to create Contra Voucher') };
  }
}

export async function getVoucherById(id: string): Promise<ActionResult<any>> {
  try {
    const data = await prisma.voucher.findUnique({
      where: { id }
    });
    if (!data) return { success: false, error: 'Voucher not found' };
    return { success: true, data };
  } catch (err) {
    return { success: false, error: extractMessage(err, 'Failed to fetch voucher') };
  }
}
