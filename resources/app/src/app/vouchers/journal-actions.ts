'use server';

// ─── Journal Voucher Server Actions ──────────────────────────────────────────
// Handles CRUD operations for double-entry Journal Vouchers.
// Utilizes an atomic Postgres transaction function (RPC) for postings.
// Revalidates paths to refresh components with updated balance states.

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { getAccountLiveBalance } from '@/lib/accountingUtils';
import type {
  JournalVoucher,
  JournalVoucherInsert,
  JournalVoucherLineInsert,
  JournalVoucherWithRelations,
  Account,
  ActionResult,
} from '@/types/database';

const VOUCHERS_PATH = '/vouchers';

function extractMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  return fallback;
}

/**
 * Fetch all ledger accounts with running balances for selection
 */
export async function getAllAccounts(): Promise<ActionResult<Account[]>> {
  try {
        const data = await prisma.account.findMany({
      orderBy: { account_title: 'asc' }
    });
    return { success: true, data: data as any[] };
  } catch (err) {
    return { success: false, error: extractMessage(err, 'Failed to fetch ledger accounts') };
  }
}

/**
 * Creates a Journal Voucher atomically using the DB transaction helper.
 * Validates balance sheet equality (debit == credit) and double-entry rules.
 */
export async function createJournalVoucher(
  header: { voucher_date: string; remarks: string | null },
  lines: Omit<JournalVoucherLineInsert, 'account_name'>[] // account_name will be resolved server-side for security/accuracy
): Promise<ActionResult<JournalVoucher>> {
  try {
    // 1. Validation in server code as a first line of defense
    if (!lines || lines.length < 2) {
      return { success: false, error: 'A Journal Voucher must contain at least 2 posting lines.' };
    }

    let sumDebit = 0;
    let sumCredit = 0;
    const finalLines: {
      account_id: string;
      account_name: string;
      remarks: string | null;
      debit: number;
      credit: number;
    }[] = [];

    // Fetch account titles to populate denormalized account_name cleanly
    const accounts = await prisma.account.findMany({
      select: { id: true, account_title: true }
    });
    const accountMap = new Map(accounts.map(a => [a.id, a.account_title]));

    for (const line of lines) {
      if (!line.account_id) {
        return { success: false, error: 'All journal lines must have a valid account selected.' };
      }
      
      const title = accountMap.get(line.account_id);
      if (!title) {
        return { success: false, error: `Account ID ${line.account_id} does not exist.` };
      }

      const d = line.debit || 0;
      const c = line.credit || 0;

      if (d < 0 || c < 0) {
        return { success: false, error: 'Debit and Credit amounts cannot be negative.' };
      }
      if (d > 0 && c > 0) {
        return { success: false, error: 'A single line cannot be both a Debit and a Credit.' };
      }
      if (d === 0 && c === 0) {
        return { success: false, error: 'Each line must have either a Debit or a Credit value greater than 0.' };
      }

      sumDebit += d;
      sumCredit += c;

      finalLines.push({
        account_id: line.account_id,
        account_name: title,
        remarks: line.remarks || null,
        debit: d,
        credit: c
      });
    }

    // Rounding safety check to prevent decimal precision mismatches
    const diff = Math.abs(sumDebit - sumCredit);
    if (diff > 0.009) {
      return {
        success: false,
        error: `Unbalanced Journal Voucher. Total Debit (PKR ${sumDebit.toFixed(2)}) must equal Total Credit (PKR ${sumCredit.toFixed(2)}). Difference is PKR ${diff.toFixed(2)}.`
      };
    }

    // Check available balances for any Cash / Bank accounts being credited (money transferred out)
    const allAccountsFull = await prisma.account.findMany({
      where: { id: { in: finalLines.map(l => l.account_id) } }
    });
    const fullAccMap = new Map(allAccountsFull.map(a => [a.id, a]));

    for (const line of finalLines) {
      if (line.credit > 0) {
        const acc = fullAccMap.get(line.account_id);
        if (acc && (acc.account_type === 'Cash Account' || acc.account_type === 'Bank Account')) {
          const available = await getAccountLiveBalance(line.account_id);
          if (available < line.credit) {
            return {
              success: false,
              error: `Insufficient Balance in ${acc.account_title}! Available balance is PKR ${available.toLocaleString('en-PK', { minimumFractionDigits: 2 })}, but requested transfer credit amount is PKR ${line.credit.toLocaleString('en-PK', { minimumFractionDigits: 2 })}.`
            };
          }
        }
      }
    }

    // 2. Insert using Prisma transaction
    const count = await prisma.journalVoucher.count({  });
    const voucher_no = `JV-${1000 + count + 1}`;

    const data = await prisma.$transaction(async (tx) => {
      const jv = await tx.journalVoucher.create({
        data: {
                    voucher_no,
          voucher_date: header.voucher_date,
          remarks: header.remarks || null,
          total_debit: sumDebit,
          total_credit: sumCredit,
          lines: {
            create: finalLines.map(line => ({
              account_id: line.account_id,
              account_name: line.account_name,
              remarks: line.remarks,
              debit: line.debit,
              credit: line.credit
            }))
          }
        },
        include: { lines: true }
      });

      const ops: any[] = [];

      for (const line of finalLines) {
        if (line.debit > 0 || line.credit > 0) {
          ops.push(tx.account.update({
            where: { id: line.account_id },
            data: { balance: { increment: line.debit - line.credit } }
          }));
        }
      }

      const accountIds = finalLines.map(l => l.account_id);
      const lineAccounts = await tx.account.findMany({ where: { id: { in: accountIds } } });
      const accMap = new Map(lineAccounts.map(a => [a.id, a.account_type]));

      for (const line of finalLines) {
        const type = accMap.get(line.account_id);
        
        // ── Supplier: Debit clears purchases (paying them off) ──────────
        if (type === 'Suppliers' && line.debit > 0) {
          const unpaidPurchases = await tx.purchase.findMany({
            where: { supplier_id: line.account_id, paymentStatus: { in: ['unpaid', 'partial'] } },
            orderBy: { created_at: 'asc' }
          });

          let remainingAmount = line.debit;
          for (const purchase of unpaidPurchases) {
            if (remainingAmount <= 0) break;
            const currentRemaining = purchase.remainingAmount || (purchase.amount - (purchase.paidAmount || 0));
            const allocate = Math.min(remainingAmount, currentRemaining);
            if (allocate <= 0) continue;

            const newPaid = (purchase.paidAmount || 0) + allocate;
            const newRemaining = purchase.amount - newPaid;
            const newStatus = newRemaining <= 0.01 ? 'paid' : 'partial';

            ops.push(tx.purchase.update({
              where: { id: purchase.id },
              data: { paidAmount: newPaid, remainingAmount: Math.max(0, newRemaining), paymentStatus: newStatus }
            }));

            ops.push(tx.voucherPurchaseAllocation.create({
              data: { journal_voucher_id: jv.id, purchase_id: purchase.id, allocatedAmount: allocate }
            }));

            remainingAmount -= allocate;
          }
        }

        // ── Customer: Debit clears sales (they owe you, settle their invoice) ──
        if (type === 'Customers' && line.debit > 0) {
          const unpaidSales = await tx.sale.findMany({
            where: { customer_id: line.account_id, status: { in: ['unpaid', 'partial'] } },
            orderBy: { created_at: 'asc' }
          });

          let remainingAmount = line.debit;
          for (const sale of unpaidSales) {
            if (remainingAmount <= 0) break;
            const currentRemaining = sale.remaining_balance || (sale.net_total - (sale.total_received || 0));
            const allocate = Math.min(remainingAmount, currentRemaining);
            if (allocate <= 0) continue;

            const newReceived = (sale.total_received || 0) + allocate;
            const newRemaining = sale.net_total - newReceived;
            const newStatus = newRemaining <= 0.01 ? 'paid' : 'partial';

            ops.push(tx.sale.update({
              where: { id: sale.id },
              data: { total_received: newReceived, remaining_balance: Math.max(0, newRemaining), status: newStatus }
            }));

            ops.push(tx.voucherSaleAllocation.create({
              data: { journal_voucher_id: jv.id, sale_id: sale.id, allocatedAmount: allocate }
            }));

            remainingAmount -= allocate;
          }
        }

        // ── Customer: Credit also clears sales (receiving payment from them) ──
        if (type === 'Customers' && line.credit > 0) {
          const unpaidSales = await tx.sale.findMany({
            where: { customer_id: line.account_id, status: { in: ['unpaid', 'partial'] } },
            orderBy: { created_at: 'asc' }
          });

          let remainingAmount = line.credit;
          for (const sale of unpaidSales) {
            if (remainingAmount <= 0) break;
            const currentRemaining = sale.remaining_balance || (sale.net_total - (sale.total_received || 0));
            const allocate = Math.min(remainingAmount, currentRemaining);
            if (allocate <= 0) continue;

            const newReceived = (sale.total_received || 0) + allocate;
            const newRemaining = sale.net_total - newReceived;
            const newStatus = newRemaining <= 0.01 ? 'paid' : 'partial';

            ops.push(tx.sale.update({
              where: { id: sale.id },
              data: { total_received: newReceived, remaining_balance: Math.max(0, newRemaining), status: newStatus }
            }));

            ops.push(tx.voucherSaleAllocation.create({
              data: { journal_voucher_id: jv.id, sale_id: sale.id, allocatedAmount: allocate }
            }));

            remainingAmount -= allocate;
          }
        }

        // ── Supplier: Credit also clears purchases (acknowledging their bill) ──
        if (type === 'Suppliers' && line.credit > 0) {
          const unpaidPurchases = await tx.purchase.findMany({
            where: { supplier_id: line.account_id, paymentStatus: { in: ['unpaid', 'partial'] } },
            orderBy: { created_at: 'asc' }
          });

          let remainingAmount = line.credit;
          for (const purchase of unpaidPurchases) {
            if (remainingAmount <= 0) break;
            const currentRemaining = purchase.remainingAmount || (purchase.amount - (purchase.paidAmount || 0));
            const allocate = Math.min(remainingAmount, currentRemaining);
            if (allocate <= 0) continue;

            const newPaid = (purchase.paidAmount || 0) + allocate;
            const newRemaining = purchase.amount - newPaid;
            const newStatus = newRemaining <= 0.01 ? 'paid' : 'partial';

            ops.push(tx.purchase.update({
              where: { id: purchase.id },
              data: { paidAmount: newPaid, remainingAmount: Math.max(0, newRemaining), paymentStatus: newStatus }
            }));

            ops.push(tx.voucherPurchaseAllocation.create({
              data: { journal_voucher_id: jv.id, purchase_id: purchase.id, allocatedAmount: allocate }
            }));

            remainingAmount -= allocate;
          }
        }
      }

      await Promise.all(ops);
      return jv;
    });

    // 3. Revalidate path to refresh accounting dashboard and run balance lists
    revalidatePath(VOUCHERS_PATH);
    revalidatePath('/accounts');
    revalidatePath('/purchases');
    revalidatePath('/sales');

    return { success: true, data: data as unknown as JournalVoucher };
  } catch (err) {
    console.error('[createJournalVoucher] Exception:', err);
    return { success: false, error: extractMessage(err, 'Failed to post Journal Voucher') };
  }
}

/**
 * Fetch all Journal Vouchers with totals, ordered newest first
 */
export async function getJournalVouchers(): Promise<ActionResult<JournalVoucher[]>> {
  try {
    const data = await prisma.journalVoucher.findMany({
      orderBy: { created_at: 'desc' }
    });
    return { success: true, data: data as any };
  } catch (err) {
    return { success: false, error: extractMessage(err, 'Failed to fetch Journal Vouchers') };
  }
}

/**
 * Fetch a single Journal Voucher with its line entries
 */
export async function getJournalVoucherById(id: string): Promise<ActionResult<JournalVoucherWithRelations>> {
  try {
        const data = await prisma.journalVoucher.findUnique({
      where: { id },
      include: { lines: true }
    });
    if (!data) throw new Error('Journal Voucher not found');
    return { success: true, data: data as any };
  } catch (err) {
    return { success: false, error: extractMessage(err, 'Failed to fetch Journal Voucher details') };
  }
}

/**
 * Delete a Journal Voucher.
 * Database triggers automatically handle reversal of account balances
 * and cascading deletion of lines.
 */
export async function deleteJournalVoucher(id: string): Promise<ActionResult<void>> {
  try {
        const voucher = await prisma.journalVoucher.findUnique({
      where: { id },
      include: { lines: true }
    });
    if (!voucher) throw new Error('Journal Voucher not found');

    const ops: any[] = [];
    
    // Reverse balances since SQLite lacks triggers
    for (const line of voucher.lines) {
      if (line.debit > 0 || line.credit > 0) {
        ops.push(prisma.account.update({
          where: { id: line.account_id },
          data: { balance: { decrement: line.debit - line.credit } }
        }));
      }
    }
    
    // Find and reverse any purchase allocations
    const purchaseAllocations = await prisma.voucherPurchaseAllocation.findMany({
      where: { journal_voucher_id: id }
    });

    for (const alloc of purchaseAllocations) {
      const purchase = await prisma.purchase.findUnique({ where: { id: alloc.purchase_id } });
      if (purchase) {
        const newPaid = Math.max(0, purchase.paidAmount - alloc.allocatedAmount);
        const newRemaining = purchase.amount - newPaid;
        const newStatus = newRemaining >= purchase.amount - 0.01 ? 'unpaid' : (newRemaining <= 0.01 ? 'paid' : 'partial');
        
        ops.push(prisma.purchase.update({
          where: { id: purchase.id },
          data: { paidAmount: newPaid, remainingAmount: newRemaining, paymentStatus: newStatus }
        }));
      }
    }

    // Find and reverse any sale allocations
    const saleAllocations = await prisma.voucherSaleAllocation.findMany({
      where: { journal_voucher_id: id }
    });

    for (const alloc of saleAllocations) {
      const sale = await prisma.sale.findUnique({ where: { id: alloc.sale_id } });
      if (sale) {
        const newReceived = Math.max(0, sale.total_received - alloc.allocatedAmount);
        const newRemaining = sale.net_total - newReceived;
        const newStatus = newRemaining >= sale.net_total - 0.01 ? 'unpaid' : (newRemaining <= 0.01 ? 'paid' : 'partial');
        
        ops.push(prisma.sale.update({
          where: { id: sale.id },
          data: { total_received: newReceived, remaining_balance: newRemaining, status: newStatus }
        }));
      }
    }
    
    ops.push(prisma.journalVoucher.delete({ where: { id } }));
    await prisma.$transaction(ops);

    revalidatePath(VOUCHERS_PATH);
    revalidatePath('/accounts');
    revalidatePath('/purchases');
    revalidatePath('/sales');

    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: extractMessage(err, 'Failed to delete Journal Voucher') };
  }
}
