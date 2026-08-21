import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    
    if (!accountId || !fromParam || !toParam) {
      return NextResponse.json({ success: false, error: 'Account ID, From, and To dates are required' }, { status: 400 });
    }

    
    // 1. Fetch Settings & Account
    const settings = await prisma.businessSettings.findFirst({  });
    const businessName = settings?.business_name || 'Business Name';

    const account = await prisma.account.findFirst({
      where: { id: accountId }
    });

    if (!account) {
      return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 });
    }

    let initialSetupBalanceDebit = account.balance && account.balance > 0 ? account.balance : 0;
    let initialSetupBalanceCredit = account.balance && account.balance < 0 ? Math.abs(account.balance) : 0;

    // 2. Fetch all transactions up to `toParam`
    const transactions: any[] = [];

    // Sales (Customer Debit)
    const sales = await prisma.sale.findMany({
      where: { customer_id: accountId, sale_date: { lte: toParam }, status: { not: 'cancelled' } }
    });
    sales.forEach(s => {
      transactions.push({
        date: s.sale_date,
        timestamp: new Date(s.created_at).getTime(),
        ref: s.invoice_no,
        description: `Sale Invoice`,
        debit: s.net_total,
        credit: 0,
        sourceType: 'sale',
        sourceId: s.id
      });
    });

    // Purchases (Supplier Credit)
    const purchases = await prisma.purchase.findMany({
      where: { supplier_id: accountId, purchase_date: { lte: toParam } }
    });
    purchases.forEach(p => {
      transactions.push({
        date: p.purchase_date,
        timestamp: new Date(p.created_at).getTime(),
        ref: p.invoice_no,
        description: `Purchase Invoice`,
        debit: 0,
        credit: p.amount,
        sourceType: 'purchase',
        sourceId: p.id
      });
    });

    // Vouchers (Main Account)
    const vouchersMain = await prisma.voucher.findMany({
      where: { main_account_id: accountId, voucher_date: { lte: toParam } }
    });
    vouchersMain.forEach(v => {
      transactions.push({
        date: v.voucher_date,
        timestamp: new Date(v.created_at).getTime(),
        ref: v.voucher_no,
        description: `Voucher - ${v.party_account_name || 'General'}${v.details ? ` - ${v.details}` : ''}`,
        debit: v.direction === 'receipt' ? v.amount : 0,
        credit: v.direction === 'payment' ? v.amount : 0,
        sourceType: 'voucher',
        sourceId: v.id
      });
    });

    // Vouchers (Party Account)
    const vouchersParty = await prisma.voucher.findMany({
      where: { party_account_id: accountId, voucher_date: { lte: toParam } }
    });
    vouchersParty.forEach(v => {
      transactions.push({
        date: v.voucher_date,
        timestamp: new Date(v.created_at).getTime(),
        ref: v.voucher_no,
        description: `Voucher - ${v.main_account_name}${v.details ? ` - ${v.details}` : ''}`,
        debit: v.direction === 'payment' ? v.amount : 0,
        credit: v.direction === 'receipt' ? v.amount : 0,
        sourceType: 'voucher',
        sourceId: v.id
      });
    });

    // Sale Payments (Cash/Bank Account receiving money)
    const salePaymentsMain = await prisma.salePayment.findMany({
      where: { payment_account_id: accountId, pay_date: { lte: toParam }, sale: {} },
      include: { sale: true }
    });
    salePaymentsMain.forEach(sp => {
      transactions.push({
        date: sp.pay_date,
        timestamp: new Date(sp.sale.created_at).getTime(),
        ref: sp.sale.invoice_no,
        description: `Receipt against Sale`,
        debit: sp.amount,
        credit: 0,
        sourceType: 'sale',
        sourceId: sp.sale.id
      });
    });

    // Sale Payments (Customer Account crediting money)
    const salePaymentsParty = await prisma.salePayment.findMany({
      where: { sale: { customer_id: accountId }, pay_date: { lte: toParam } },
      include: { sale: true }
    });
    salePaymentsParty.forEach(sp => {
      transactions.push({
        date: sp.pay_date,
        timestamp: new Date(sp.sale.created_at).getTime(),
        ref: sp.sale.invoice_no,
        description: `Payment via ${sp.payment_account_name || 'Cash'}`,
        debit: 0,
        credit: sp.amount,
        sourceType: 'sale',
        sourceId: sp.sale.id
      });
    });

    // Journal Vouchers
    const jvLines = await prisma.journalVoucherLine.findMany({
      where: { account_id: accountId, voucher: { voucher_date: { lte: toParam } } },
      include: { voucher: true }
    });
    jvLines.forEach(line => {
      transactions.push({
        date: line.voucher.voucher_date,
        timestamp: new Date(line.voucher.created_at).getTime(),
        ref: line.voucher.voucher_no,
        description: `JV: ${line.remarks || line.voucher.remarks || 'Journal Entry'}`,
        debit: line.debit,
        credit: line.credit,
        sourceType: 'jv',
        sourceId: line.voucher.id
      });
    });

    // 3. Sort chronologically (and by ID to ensure stable sort if same date)
      transactions.sort((a, b) => {
        if (a.date < b.date) return -1;
        if (a.date > b.date) return 1;
        if (a.timestamp && b.timestamp) {
          if (a.timestamp < b.timestamp) return -1;
          if (a.timestamp > b.timestamp) return 1;
        }
        return a.sourceId.localeCompare(b.sourceId);
      });

    // 4. Split and compute balances
    const typeLower = (account.account_type || '').toLowerCase();
    const isCreditNature = typeLower.includes('equity') || typeLower.includes('capital') || 
                           typeLower.includes('liability') || typeLower.includes('supplier') || 
                           typeLower.includes('payable') || typeLower.includes('income') || 
                           typeLower.includes('revenue') || typeLower.includes('sale');

    let openingDebit = initialSetupBalanceDebit;
    let openingCredit = initialSetupBalanceCredit;
    
    const statementLines: any[] = [];

    transactions.forEach(tx => {
      if (tx.date < fromParam) {
        openingDebit += tx.debit;
        openingCredit += tx.credit;
      } else {
        statementLines.push(tx);
      }
    });

    const openingBalance = isCreditNature ? (openingCredit - openingDebit) : (openingDebit - openingCredit);
    let runningBalance = openingBalance;

    let totalDebitInRange = 0;
    let totalCreditInRange = 0;

    const formattedLines = statementLines.map(tx => {
      totalDebitInRange += tx.debit;
      totalCreditInRange += tx.credit;
      if (isCreditNature) {
        runningBalance += (tx.credit - tx.debit);
      } else {
        runningBalance += (tx.debit - tx.credit);
      }
      return {
        ...tx,
        runningBalance
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        businessName,
        account: {
          id: account.id,
          account_title: account.account_title,
          account_type: account.account_type,
          contact: account.contact_number,
          region: account.region,
          isCreditNature
        },
        openingBalance,
        transactions: formattedLines,
        totalDebit: totalDebitInRange,
        totalCredit: totalCreditInRange,
        closingBalance: runningBalance
      }
    });

  } catch (err: any) {
    console.error('Account Statement Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
