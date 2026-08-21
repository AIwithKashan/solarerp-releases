'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { getAccountLiveBalance } from '@/lib/accountingUtils';
import type { PaymentVoucherInsert, PaymentVoucher, PaymentAllocation, ActionResult } from '@/types/database';

const PURCHASES_PATH = '/purchases';

function extractMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  return fallback;
}

export async function createPaymentVoucher(payload: PaymentVoucherInsert): Promise<ActionResult<PaymentVoucher>> {
  try {
    
    if (!payload.supplierId) throw new Error('Supplier is required');
    if (!payload.paidFromAccountId) throw new Error('Payment account is required');
    if (payload.amount <= 0) throw new Error('Amount must be greater than zero');
    if (!payload.allocations || payload.allocations.length === 0) throw new Error('No invoices allocated');

    // Generate Voucher No
    const count = await prisma.paymentVoucher.count({  });
    const voucherNo = payload.voucherNo || `PV-${1000 + count + 1}`;
    const date = payload.date || new Date().toISOString().split('T')[0];

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the Voucher
      const voucher = await tx.paymentVoucher.create({
        data: {
                    voucherNo,
          date,
          supplierId: payload.supplierId,
          supplierName: payload.supplierName,
          paidFromAccountId: payload.paidFromAccountId,
          paidFromAccountName: payload.paidFromAccountName,
          amount: payload.amount,
          paymentMode: payload.paymentMode,
          reference: payload.reference,
          notes: payload.notes,
          allocations: {
            create: payload.allocations.map(a => ({
              purchaseId: a.purchaseId,
              allocatedAmount: a.allocatedAmount
            }))
          }
        },
        include: { allocations: true }
      });

      // 2. Update Purchase records
      let totalAllocated = 0;
      for (const alloc of payload.allocations) {
        if (alloc.allocatedAmount <= 0) continue;
        totalAllocated += alloc.allocatedAmount;
        
        const purchase = await tx.purchase.findUnique({ where: { id: alloc.purchaseId } });
        if (!purchase) throw new Error(`Purchase ${alloc.purchaseId} not found`);
        
        const newPaidAmount = purchase.paidAmount + alloc.allocatedAmount;
        const newRemainingAmount = purchase.amount - newPaidAmount;
        
        if (newRemainingAmount < -0.01) {
          throw new Error(`Allocation of ${alloc.allocatedAmount} exceeds remaining balance for Invoice ${purchase.invoice_no}`);
        }
        
        let newStatus = 'partial';
        if (newRemainingAmount <= 0.01) {
          newStatus = 'paid';
        } else if (newPaidAmount <= 0.01) {
          newStatus = 'unpaid';
        }

        await tx.purchase.update({
          where: { id: alloc.purchaseId },
          data: {
            paidAmount: newPaidAmount,
            remainingAmount: newRemainingAmount,
            paymentStatus: newStatus
          }
        });
      }

      // Check allocation matches total amount exactly
      if (Math.abs(totalAllocated - payload.amount) > 0.01) {
         throw new Error(`Total allocated amount (${totalAllocated}) does not match voucher amount (${payload.amount})`);
      }

      // 3. Check and update Cash/Bank Account balance
      const account = await tx.account.findUnique({ where: { id: payload.paidFromAccountId } });
      if (account) {
        const available = await getAccountLiveBalance(payload.paidFromAccountId);
        if (available < payload.amount) {
          throw new Error(`Insufficient Balance in ${account.account_title}! Available balance is PKR ${available.toLocaleString('en-PK', { minimumFractionDigits: 2 })}, but payment amount is PKR ${payload.amount.toLocaleString('en-PK', { minimumFractionDigits: 2 })}.`);
        }
      }

      // 4. Update Supplier balance (Suppliers usually have a credit balance for payables, 
      // but in this system it might be positive or negative depending on chart of accounts logic.
      // Usually, a payment to a supplier DECREASES our liability (decreases their balance if balance = how much we owe them))
      const supplier = await tx.account.findUnique({ where: { id: payload.supplierId } });
      if (supplier) {
        // Assuming supplier balance represents how much we owe them:
        // Payment decreases the balance.
        await tx.account.update({
          where: { id: supplier.id },
          data: { balance: (supplier.balance || 0) - payload.amount }
        });
      }

      return voucher;
    });

    revalidatePath(PURCHASES_PATH);
    return { success: true, data: result as any };
  } catch (err) {
    console.error('[createPaymentVoucher]', err);
    return { success: false, error: extractMessage(err, 'Failed to create payment voucher') };
  }
}

export async function deletePaymentVoucher(id: string): Promise<ActionResult<void>> {
  try {
        
    await prisma.$transaction(async (tx) => {
      const voucher = await tx.paymentVoucher.findUnique({
        where: { id },
        include: { allocations: true }
      });
      if (!voucher) throw new Error('Voucher not found');

      // 1. Reverse Purchase allocations
      for (const alloc of voucher.allocations) {
        const purchase = await tx.purchase.findUnique({ where: { id: alloc.purchaseId } });
        if (purchase) {
          const newPaidAmount = purchase.paidAmount - alloc.allocatedAmount;
          const newRemainingAmount = purchase.amount - newPaidAmount;
          
          let newStatus = 'partial';
          if (newRemainingAmount <= 0.01) {
            newStatus = 'paid';
          } else if (newPaidAmount <= 0.01) {
            newStatus = 'unpaid';
          }

          await tx.purchase.update({
            where: { id: purchase.id },
            data: {
              paidAmount: newPaidAmount,
              remainingAmount: newRemainingAmount,
              paymentStatus: newStatus
            }
          });
        }
      }

      // 2. Reverse Bank/Cash balance
      const account = await tx.account.findUnique({ where: { id: voucher.paidFromAccountId } });
      if (account) {
        await tx.account.update({
          where: { id: account.id },
          data: { balance: (account.balance || 0) + voucher.amount }
        });
      }

      // 3. Reverse Supplier balance
      const supplier = await tx.account.findUnique({ where: { id: voucher.supplierId } });
      if (supplier) {
        await tx.account.update({
          where: { id: supplier.id },
          data: { balance: (supplier.balance || 0) + voucher.amount }
        });
      }

      // 4. Delete the voucher (allocations deleted via cascade)
      await tx.paymentVoucher.delete({ where: { id } });
    });

    revalidatePath(PURCHASES_PATH);
    return { success: true, data: undefined };
  } catch (err) {
    console.error('[deletePaymentVoucher]', err);
    return { success: false, error: extractMessage(err, 'Failed to delete payment voucher') };
  }
}

export async function getPurchasePayments(purchaseId: string): Promise<ActionResult<any[]>> {
  try {
        const allocations = await prisma.paymentAllocation.findMany({
      where: { purchaseId },
      include: { voucher: true },
      orderBy: { voucher: { date: 'asc' } }
    });
    
    // Map to a flatter structure
    const data = allocations.map(a => ({
      id: a.voucher.id,
      voucherNo: a.voucher.voucherNo,
      date: a.voucher.date,
      paymentMode: a.voucher.paymentMode,
      paidFromAccountName: a.voucher.paidFromAccountName,
      allocatedAmount: a.allocatedAmount,
      reference: a.voucher.reference
    }));
    
    return { success: true, data };
  } catch (err) {
    return { success: false, error: extractMessage(err, 'Failed to fetch purchase payments') };
  }
}
