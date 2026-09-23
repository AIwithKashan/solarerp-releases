import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const bankIdParam = searchParams.get('bankId')?.trim() || '';

    // 1. Fetch Business Settings
    const settings = await prisma.businessSettings.findFirst({});
    const businessName = settings?.business_name || 'SolarERP Business';

    // 2. Fetch all Bank Accounts
    const bankAccounts = await prisma.account.findMany({
      where: { account_type: 'Bank Account' },
      orderBy: { account_title: 'asc' }
    });

    const isAllBanks = !bankIdParam || bankIdParam === 'all';
    const targetBankAccounts = isAllBanks
      ? bankAccounts
      : bankAccounts.filter(b => b.id === bankIdParam);

    const targetBankIds = new Set(targetBankAccounts.map(b => b.id));
    const allBankIds = new Set(bankAccounts.map(b => b.id));

    // Helper to check if an ID is among the queried banks
    const isTargetBank = (id: string | null | undefined) => !!id && targetBankIds.has(id);

    // 3. Fetch Historical Data (prior to dateParam) to compute Previous/Opening Balances
    const prevBalancesMap: Record<string, number> = {};
    bankAccounts.forEach(b => {
      prevBalancesMap[b.id] = b.balance || 0;
    });

    // Historical Vouchers
    const vouchersBefore = await prisma.voucher.findMany({
      where: { voucher_date: { lt: dateParam } }
    });

    vouchersBefore.forEach(v => {
      // Main bank account
      if (allBankIds.has(v.main_account_id)) {
        if (v.direction === 'receipt') {
          prevBalancesMap[v.main_account_id] = (prevBalancesMap[v.main_account_id] || 0) + v.amount;
        } else {
          prevBalancesMap[v.main_account_id] = (prevBalancesMap[v.main_account_id] || 0) - v.amount;
        }
      }
      // Party bank account (e.g. transfer into bank or out of bank)
      if (v.party_account_id && allBankIds.has(v.party_account_id)) {
        if (v.direction === 'payment') {
          // Paid TO this bank
          prevBalancesMap[v.party_account_id] = (prevBalancesMap[v.party_account_id] || 0) + v.amount;
        } else {
          // Received FROM this bank
          prevBalancesMap[v.party_account_id] = (prevBalancesMap[v.party_account_id] || 0) - v.amount;
        }
      }
    });

    // Historical Sale Payments
    const salePaymentsBefore = await prisma.salePayment.findMany({
      where: {
        pay_date: { lt: dateParam },
        payment_account_id: { in: Array.from(allBankIds) }
      }
    });

    salePaymentsBefore.forEach(sp => {
      if (sp.payment_account_id && prevBalancesMap[sp.payment_account_id] !== undefined) {
        prevBalancesMap[sp.payment_account_id] += sp.amount;
      }
    });

    // Historical Purchase Payment Vouchers
    const paymentVouchersBefore = await prisma.paymentVoucher.findMany({
      where: {
        date: { lt: dateParam },
        paidFromAccountId: { in: Array.from(allBankIds) }
      }
    });

    paymentVouchersBefore.forEach(pv => {
      if (prevBalancesMap[pv.paidFromAccountId] !== undefined) {
        prevBalancesMap[pv.paidFromAccountId] -= pv.amount;
      }
    });

    // Historical Journal Vouchers
    const jvsBefore = await prisma.journalVoucherLine.findMany({
      where: {
        account_id: { in: Array.from(allBankIds) },
        OR: [
          { voucher: { voucher_date: { lt: dateParam } } },
          { voucher: { voucher_no: 'OB-SETUP', voucher_date: { lte: dateParam } } },
          { voucher: { remarks: { contains: 'Opening' }, voucher_date: { lte: dateParam } } },
          { remarks: { contains: 'Opening' }, voucher: { voucher_date: { lte: dateParam } } }
        ]
      },
      include: { voucher: true }
    });

    const processedJvLineIds = new Set<string>();
    jvsBefore.forEach(line => {
      processedJvLineIds.add(line.id);
      if (prevBalancesMap[line.account_id] !== undefined) {
        prevBalancesMap[line.account_id] += (line.debit - line.credit);
      }
    });

    // 4. Fetch Today's Transactions (on dateParam)
    interface BankTxn {
      billNo: string;
      bankId: string;
      bankName: string;
      details: string;
      amount: number;
      type: 'receipt' | 'payment' | 'expense';
      source: string;
    }

    const receipts: BankTxn[] = [];
    const payments: BankTxn[] = [];
    const expenses: BankTxn[] = [];

    // Vouchers on dateParam
    const vouchersToday = await prisma.voucher.findMany({
      where: { voucher_date: dateParam }
    });

    vouchersToday.forEach(v => {
      // If main account is one of our target banks
      if (isTargetBank(v.main_account_id)) {
        const bankName = bankAccounts.find(b => b.id === v.main_account_id)?.account_title || 'Bank';
        const isReceipt = v.direction === 'receipt';
        const partyNameLower = (v.party_account_name || '').toLowerCase();
        const isExpense = !isReceipt && (partyNameLower.includes('expense') || partyNameLower.includes('fee') || partyNameLower.includes('charge') || partyNameLower.includes('tax') || partyNameLower.includes('bank charge'));

        const entry: BankTxn = {
          billNo: v.voucher_no,
          bankId: v.main_account_id,
          bankName,
          details: v.details || (isReceipt ? `Received from ${v.party_account_name || 'Party'}` : `Paid to ${v.party_account_name || 'Party'}`),
          amount: v.amount,
          type: isReceipt ? 'receipt' : (isExpense ? 'expense' : 'payment'),
          source: 'Voucher'
        };

        if (isReceipt) {
          receipts.push(entry);
        } else if (isExpense) {
          expenses.push(entry);
        } else {
          payments.push(entry);
        }
      }

      // If party account is one of our target banks (transfer into or out of bank)
      if (v.party_account_id && isTargetBank(v.party_account_id)) {
        const bankName = bankAccounts.find(b => b.id === v.party_account_id)?.account_title || 'Bank';
        if (v.direction === 'payment') {
          // Main account paid into this bank -> Bank Receipt
          receipts.push({
            billNo: v.voucher_no,
            bankId: v.party_account_id,
            bankName,
            details: v.details || `Deposit from ${v.main_account_name}`,
            amount: v.amount,
            type: 'receipt',
            source: 'Voucher Transfer'
          });
        } else {
          // Main account received from this bank -> Bank Payment
          payments.push({
            billNo: v.voucher_no,
            bankId: v.party_account_id,
            bankName,
            details: v.details || `Transfer to ${v.main_account_name}`,
            amount: v.amount,
            type: 'payment',
            source: 'Voucher Transfer'
          });
        }
      }
    });

    // Sale Payments on dateParam deposited into target banks
    const salePaymentsToday = await prisma.salePayment.findMany({
      where: {
        pay_date: dateParam,
        payment_account_id: { in: Array.from(targetBankIds) }
      },
      include: { sale: true }
    });

    salePaymentsToday.forEach(sp => {
      const bankName = bankAccounts.find(b => b.id === sp.payment_account_id)?.account_title || 'Bank';
      receipts.push({
        billNo: sp.sale?.invoice_no || 'SALE',
        bankId: sp.payment_account_id || '',
        bankName,
        details: `Customer Sale Receipt: ${sp.sale?.customer_name || 'Customer'}${sp.remarks ? ' (' + sp.remarks + ')' : ''}`,
        amount: sp.amount,
        type: 'receipt',
        source: 'Sale Payment'
      });
    });

    // Purchase Payment Vouchers on dateParam drawn from target banks
    const purchasePaymentsToday = await prisma.paymentVoucher.findMany({
      where: {
        date: dateParam,
        paidFromAccountId: { in: Array.from(targetBankIds) }
      }
    });

    purchasePaymentsToday.forEach(pv => {
      const bankName = bankAccounts.find(b => b.id === pv.paidFromAccountId)?.account_title || 'Bank';
      payments.push({
        billNo: pv.voucherNo,
        bankId: pv.paidFromAccountId,
        bankName,
        details: `Supplier Payment: ${pv.supplierName}${pv.notes ? ' (' + pv.notes + ')' : ''}`,
        amount: pv.amount,
        type: 'payment',
        source: 'Purchase Payment'
      });
    });

    // Today's non-opening Journal Vouchers
    const jvsToday = await prisma.journalVoucherLine.findMany({
      where: {
        account_id: { in: Array.from(targetBankIds) },
        voucher: { voucher_date: dateParam },
        id: { notIn: Array.from(processedJvLineIds) }
      },
      include: { voucher: true }
    });

    jvsToday.forEach(line => {
      const bankName = bankAccounts.find(b => b.id === line.account_id)?.account_title || 'Bank';
      if (line.debit > 0) {
        receipts.push({
          billNo: line.voucher.voucher_no,
          bankId: line.account_id,
          bankName,
          details: line.remarks || line.voucher.remarks || 'JV Bank Inflow (Debit)',
          amount: line.debit,
          type: 'receipt',
          source: 'Journal Voucher'
        });
      }
      if (line.credit > 0) {
        payments.push({
          billNo: line.voucher.voucher_no,
          bankId: line.account_id,
          bankName,
          details: line.remarks || line.voucher.remarks || 'JV Bank Outflow (Credit)',
          amount: line.credit,
          type: 'payment',
          source: 'Journal Voucher'
        });
      }
    });

    // 5. Aggregate metrics per bank and overall summary
    const bankMetrics = targetBankAccounts.map(b => {
      const prev = prevBalancesMap[b.id] || 0;
      const bankRec = receipts.filter(r => r.bankId === b.id).reduce((s, r) => s + r.amount, 0);
      const bankPay = payments.filter(p => p.bankId === b.id).reduce((s, p) => s + p.amount, 0);
      const bankExp = expenses.filter(e => e.bankId === b.id).reduce((s, e) => s + e.amount, 0);
      const closing = prev + bankRec - bankPay - bankExp;

      return {
        id: b.id,
        title: b.account_title,
        contactNumber: b.contact_number,
        previousBalance: prev,
        totalReceipts: bankRec,
        totalPayments: bankPay,
        totalExpenses: bankExp,
        closingBalance: closing
      };
    });

    const summary = {
      previousBalance: bankMetrics.reduce((s, b) => s + b.previousBalance, 0),
      totalReceipts: receipts.reduce((s, r) => s + r.amount, 0),
      totalPayments: payments.reduce((s, p) => s + p.amount, 0),
      totalExpenses: expenses.reduce((s, e) => s + e.amount, 0),
      closingBalance: bankMetrics.reduce((s, b) => s + b.closingBalance, 0)
    };

    return NextResponse.json({
      success: true,
      data: {
        businessName,
        date: dateParam,
        selectedBankId: bankIdParam || 'all',
        allBanks: bankAccounts.map(b => ({ id: b.id, title: b.account_title })),
        banks: bankMetrics,
        summary,
        receipts,
        payments,
        expenses
      }
    });

  } catch (err: any) {
    console.error('Bank Balance Report Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
