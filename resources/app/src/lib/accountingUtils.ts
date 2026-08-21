import { prisma } from '@/lib/db';

/**
 * Calculates the exact real-time live running balance of any Cash, Bank, or Ledger account.
 * This dynamically aggregates all transaction sources (Vouchers, Sale Receipts, Purchase Payments, Journal Vouchers).
 * 
 * @param accountId - The UUID of the account
 * @param excludeVoucherId - Optional voucher ID to exclude when calculating balance for an edit/update operation
 */
export async function getAccountLiveBalance(accountId: string, excludeVoucherId?: string): Promise<number> {
  if (!accountId) return 0;

  const account = await prisma.account.findUnique({
    where: { id: accountId }
  });

  if (!account) return 0;

  // 1. Initial Opening Setup Balance
  let balance = account.balance || 0;

  // 2. Direct Vouchers where this is the main Cash/Bank account
  const mainVouchers = await prisma.voucher.findMany({
    where: {
      main_account_id: accountId,
      ...(excludeVoucherId ? { id: { not: excludeVoucherId } } : {})
    }
  });

  for (const v of mainVouchers) {
    if (v.direction === 'receipt') {
      balance += v.amount;
    } else if (v.direction === 'payment') {
      balance -= v.amount;
    }
  }

  // 3. Direct Vouchers where this is the party account (e.g. transfer between accounts)
  const partyVouchers = await prisma.voucher.findMany({
    where: {
      party_account_id: accountId,
      ...(excludeVoucherId ? { id: { not: excludeVoucherId } } : {})
    }
  });

  for (const v of partyVouchers) {
    if (v.direction === 'payment') {
      balance += v.amount; // Money paid TO this party account
    } else if (v.direction === 'receipt') {
      balance -= v.amount; // Money received FROM this party account
    }
  }

  // 4. Sale Payments (Cash/Bank received from customer sales)
  const isDefaultCash = account.account_type === 'Cash Account';
  
  if (isDefaultCash) {
    // If Cash Account, include payments assigned to this account ID OR unassigned (default cash)
    const salePayments = await prisma.salePayment.findMany({
      where: {
        OR: [
          { payment_account_id: accountId },
          { payment_account_id: null },
          { payment_account_id: '' }
        ]
      }
    });
    for (const sp of salePayments) {
      balance += sp.amount;
    }
  } else {
    // For Bank Accounts, only include payments specifically allocated to this bank account
    const salePayments = await prisma.salePayment.findMany({
      where: { payment_account_id: accountId }
    });
    for (const sp of salePayments) {
      balance += sp.amount;
    }
  }

  // 5. Purchase Payment Vouchers (Supplier payments deducted from Cash/Bank)
  const purchasePayments = await prisma.paymentVoucher.findMany({
    where: { paidFromAccountId: accountId }
  });

  for (const pv of purchasePayments) {
    balance -= pv.amount;
  }

  // 6. Journal Vouchers (Double-entry line adjustments)
  const jvLines = await prisma.journalVoucherLine.findMany({
    where: { account_id: accountId }
  });

  for (const line of jvLines) {
    balance += (line.debit || 0) - (line.credit || 0);
  }

  return balance;
}
