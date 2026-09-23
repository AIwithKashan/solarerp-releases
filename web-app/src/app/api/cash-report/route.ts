import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    if (!dateParam) {
      return NextResponse.json({ success: false, error: 'Date is required' }, { status: 400 });
    }

    
    // Fetch Business Settings
    const settings = await prisma.businessSettings.findFirst({
      
    });
    const businessName = settings?.business_name || 'Marwa Sky Tech Energy';

    // Fetch Cash Accounts (to calculate opening balance up to previous day)
    const cashAccounts = await prisma.account.findMany({ 
      where: { account_type: 'Cash Account' } 
    });

    // 1. Calculate Previous Balance (Opening Balance for dateParam)
    let previousBalance = 0;
    
    // Include account initial opening balances if any
    cashAccounts.forEach(a => {
      if ((a as any).opening_balance) {
        previousBalance += Number((a as any).opening_balance) || 0;
      }
    });

    const isCashAcc = (id: string | null) => cashAccounts.some(a => a.id === id);

    // Vouchers prior to dateParam
    const allVouchersBefore = await prisma.voucher.findMany({ 
      where: { voucher_date: { lt: dateParam }  } 
    });

    // Journal Vouchers prior to dateParam OR opening balance JVs on or before dateParam
    const allJVsBefore = await prisma.journalVoucherLine.findMany({
      where: {
        OR: [
          { voucher: { voucher_date: { lt: dateParam } } },
          { voucher: { voucher_no: 'OB-SETUP', voucher_date: { lte: dateParam } } },
          { voucher: { remarks: { contains: 'Opening' }, voucher_date: { lte: dateParam } } },
          { remarks: { contains: 'Opening' }, voucher: { voucher_date: { lte: dateParam } } }
        ]
      },
      include: { voucher: true }
    });

    const allSalePaymentsBefore = await prisma.salePayment.findMany({ 
      where: { sale: {}, pay_date: { lt: dateParam } } 
    });

    allVouchersBefore.forEach(v => {
      if (isCashAcc(v.main_account_id)) {
        if (v.direction === 'receipt') previousBalance += v.amount;
        else previousBalance -= v.amount;
      }
      if (isCashAcc(v.party_account_id)) {
        if (v.direction === 'receipt') previousBalance -= v.amount;
        else previousBalance += v.amount;
      }
    });

    // Track processed JV line IDs to avoid double counting
    const processedJvLineIds = new Set<string>();

    allJVsBefore.forEach(line => {
      if (isCashAcc(line.account_id)) {
        processedJvLineIds.add(line.id);
        previousBalance += line.debit;
        previousBalance -= line.credit;
      }
    });

    allSalePaymentsBefore.forEach(sp => {
      if (isCashAcc(sp.payment_account_id) || sp.payment_account_name?.toLowerCase().includes('cash')) {
        previousBalance += sp.amount;
      }
    });

    // 2. Fetch today's cash transactions
    const receipts: any[] = [];
    const payments: any[] = [];
    const expenses: any[] = [];

    // Today's non-opening Journal Vouchers
    const jvsToday = await prisma.journalVoucherLine.findMany({
      where: {
        voucher: { voucher_date: dateParam },
        id: { notIn: Array.from(processedJvLineIds) }
      },
      include: { voucher: true }
    });

    jvsToday.forEach(line => {
      if (isCashAcc(line.account_id)) {
        if (line.debit > 0) {
          receipts.push({
            billNo: line.voucher.voucher_no,
            details: line.remarks || line.voucher.remarks || `JV Cash Debit`,
            amount: line.debit
          });
        }
        if (line.credit > 0) {
          payments.push({
            billNo: line.voucher.voucher_no,
            details: line.remarks || line.voucher.remarks || `JV Cash Credit`,
            amount: -line.credit
          });
        }
      }
    });

    // Vouchers for today
    const vouchersToday = await prisma.voucher.findMany({
      where: { voucher_date: dateParam }
    });

    vouchersToday.forEach(v => {
      const vType = v.voucher_type?.toLowerCase() || '';
      
      // Is it a cash transaction?
      if (!vType.includes('cash') && !isCashAcc(v.main_account_id) && !isCashAcc(v.party_account_id)) {
        return; // Skip non-cash
      }

      const isReceipt = v.direction === 'receipt';
      
      // We need to decide if it's an Expense. 
      // If the party account title contains 'expense' or it's a payment with no specific party, it's an expense.
      const partyNameLower = v.party_account_name?.toLowerCase() || '';
      const isExpense = !isReceipt && (partyNameLower.includes('expense') || partyNameLower.includes('fee') || partyNameLower.includes('charge') || partyNameLower.includes('bill'));

      const entry = {
        billNo: v.voucher_no,
        details: v.details || (isReceipt ? `Received from ${v.party_account_name || 'Walk-in'}` : `Paid to ${v.party_account_name || 'Walk-in'}`),
        amount: v.amount
      };

      if (isReceipt) {
        receipts.push(entry);
      } else if (isExpense) {
        expenses.push(entry);
      } else {
        payments.push(entry);
      }
    });

    // Sale Payments for today (Cash Receipts)
    const salePaymentsToday = await prisma.salePayment.findMany({
      where: { sale: {}, pay_date: dateParam },
      include: { sale: true }
    });

    salePaymentsToday.forEach(sp => {
      if (isCashAcc(sp.payment_account_id) || sp.payment_account_name?.toLowerCase().includes('cash')) {
        receipts.push({
          billNo: sp.sale.invoice_no,
          details: `Sale Payment: ${sp.sale.customer_name || 'Walk-in'}`,
          amount: sp.amount
        });
      }
    });

    // 3. Fetch saved denominations for today
    // Check if table exists (we might get an error if Prisma client doesn't know about it yet,
    // but Prisma is supposed to know since we updated schema.prisma)
    let denominations = null;
    try {
      // We will cast to any to avoid TS errors if Prisma client isn't regenerated in dev environment immediately
      const db = prisma as any;
      if (db.cashDenomination) {
        denominations = await db.cashDenomination.findUnique({
          where: { date: dateParam }
        });
      }
    } catch (e) {
      console.warn('CashDenomination table might not be accessible yet:', e);
    }

    return NextResponse.json({
      success: true,
      data: {
        businessName,
        previousBalance,
        receipts,
        payments,
        expenses,
        denominations
      }
    });

  } catch (err: any) {
    console.error('Cash Report Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
