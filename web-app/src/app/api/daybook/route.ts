import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    if (!dateParam) {
      return NextResponse.json({ success: false, error: 'Date is required' }, { status: 400 });
    }

    
    // Fetch data for the specific date
    const purchases = await prisma.purchase.findMany({
      where: { purchase_date: dateParam }
    });

    const sales = await prisma.sale.findMany({
      where: { sale_date: dateParam },
      include: { sale_items: true }
    });

    const vouchers = await prisma.voucher.findMany({
      where: { voucher_date: dateParam }
    });

    const journalVouchers = await prisma.journalVoucher.findMany({
      where: { voucher_date: dateParam },
      include: { lines: true }
    });

    // Formatting for the report

    // 1. Purchases
    const formattedPurchases = purchases.map(p => ({
      billNo: p.invoice_no,
      account: p.supplier_name || 'Walk-in',
      product: `${p.item_name} ${p.power_watt ? p.power_watt + 'W' : ''}`.trim(),
      qty: p.quantity,
      rate: p.rate,
      amount: p.amount
    }));

    // 2. Purchase Return (Stub)
    const formattedPurchaseReturns: any[] = [];

    // 3. Sales
    // A sale can have multiple items, we'll flatten them for the report
    const formattedSales = sales.flatMap(s => 
      s.sale_items.map(item => ({
        billNo: s.invoice_no,
        account: s.customer_name || 'Walk-in',
        product: `${item.item_name} ${item.power_watt ? item.power_watt + 'W' : ''}`.trim(),
        qty: item.quantity,
        rate: item.rate,
        amount: item.amount
      }))
    );

    // 4. Sale Return (Stub)
    const formattedSaleReturns: any[] = [];

    // 5. Wastage (Stub)
    const formattedWastage: any[] = [];

    // 6. Wastage Sale (Stub)
    const formattedWastageSale: any[] = [];

    // 7-10. Cash/Bank Receipts & Payments
    // We classify based on voucher_type
    const cashReceipts: any[] = [];
    const cashPayments: any[] = [];
    const bankReceipts: any[] = [];
    const bankPayments: any[] = [];

    vouchers.forEach(v => {
      const entry = {
        billNo: v.voucher_no,
        account: v.party_account_name || v.main_account_name, // Typically party is the other side
        amount: v.amount
      };

      // Depending on how vouchers are logged, we group them
      // Assuming voucher_type like 'Cash Payment', 'Bank Payment', 'Cash Receipt', 'Bank Receipt'
      const vType = v.voucher_type?.toLowerCase() || '';
      
      if (vType.includes('cash') && (vType.includes('receipt') || v.direction === 'receipt')) {
        cashReceipts.push(entry);
      } else if (vType.includes('cash') && (vType.includes('payment') || v.direction === 'payment')) {
        cashPayments.push(entry);
      } else if (vType.includes('bank') && (vType.includes('receipt') || v.direction === 'receipt')) {
        bankReceipts.push(entry);
      } else if (vType.includes('bank') && (vType.includes('payment') || v.direction === 'payment')) {
        bankPayments.push(entry);
      } else {
        // Fallback based on direction if type is not clear
        if (v.direction === 'receipt') {
          cashReceipts.push(entry);
        } else {
          cashPayments.push(entry);
        }
      }
    });

    // 11. Journal Vouchers
    const formattedJournalVouchers = journalVouchers.flatMap(jv => 
      jv.lines.map(line => ({
        voucherNo: jv.voucher_no,
        account: `${line.account_name} (${line.debit > 0 ? 'Dr' : 'Cr'})`,
        amount: line.debit > 0 ? line.debit : line.credit
      }))
    );

    // 12. Running Stock
    // To compute running stock, we need to get ALL purchases and sales up to this date
    const allPurchasesUpToDate = await prisma.purchase.findMany({
      where: { purchase_date: { lte: dateParam } },
      select: { item_name: true, power_watt: true, quantity: true, purchase_date: true }
    });

    const allSalesUpToDate = await prisma.sale.findMany({
      where: { sale_date: { lte: dateParam } },
      include: { sale_items: { select: { item_name: true, power_watt: true, quantity: true } } }
    });

    const stockMap = new Map<string, { product: string; opening: number; in: number; out: number; closing: number }>();

    allPurchasesUpToDate.forEach(p => {
      const key = `${p.item_name}|${p.power_watt || 0}`;
      if (!stockMap.has(key)) {
        stockMap.set(key, { product: `${p.item_name} ${p.power_watt ? p.power_watt + 'W' : ''}`.trim(), opening: 0, in: 0, out: 0, closing: 0 });
      }
      const entry = stockMap.get(key)!;
      if (p.purchase_date < dateParam) {
        entry.opening += p.quantity;
      } else {
        entry.in += p.quantity;
      }
      entry.closing = entry.opening + entry.in - entry.out;
    });

    allSalesUpToDate.forEach(s => {
      s.sale_items.forEach(item => {
        const key = `${item.item_name}|${item.power_watt || 0}`;
        if (!stockMap.has(key)) {
          stockMap.set(key, { product: `${item.item_name} ${item.power_watt ? item.power_watt + 'W' : ''}`.trim(), opening: 0, in: 0, out: 0, closing: 0 });
        }
        const entry = stockMap.get(key)!;
        if (s.sale_date < dateParam) {
          entry.opening -= item.quantity; // it's out before today
        } else {
          entry.out += item.quantity;
        }
        entry.closing = entry.opening + entry.in - entry.out;
      });
    });

    const runningStock = Array.from(stockMap.values()).filter(s => s.opening !== 0 || s.in !== 0 || s.out !== 0 || s.closing !== 0);
    runningStock.sort((a, b) => a.product.localeCompare(b.product));

    // 13. Running Balance
    const accounts = await prisma.account.findMany({  });
    const allVouchers = await prisma.voucher.findMany({ where: { voucher_date: { lte: dateParam }  } });
    const allJVs = await prisma.journalVoucherLine.findMany({
      where: { voucher: { voucher_date: { lte: dateParam } } },
      include: { voucher: true }
    });
    
    const balanceMap = new Map<string, { account: string; opening: number; debit: number; credit: number; closing: number }>();
    
    accounts.forEach(acc => {
      balanceMap.set(acc.id, { account: acc.account_title, opening: 0, debit: 0, credit: 0, closing: 0 });
    });
    
    const addBal = (accId: string, date: string, debit: number, credit: number) => {
      if (!accId) return;
      const entry = balanceMap.get(accId);
      if (!entry) return;
      if (date < dateParam) {
        entry.opening += (debit - credit);
      } else {
        entry.debit += debit;
        entry.credit += credit;
      }
      entry.closing = entry.opening + entry.debit - entry.credit;
    };
    
    allVouchers.forEach(v => {
      if (v.direction === 'receipt') {
        addBal(v.main_account_id, v.voucher_date, v.amount, 0);
        if (v.party_account_id) addBal(v.party_account_id, v.voucher_date, 0, v.amount);
      } else {
        addBal(v.main_account_id, v.voucher_date, 0, v.amount);
        if (v.party_account_id) addBal(v.party_account_id, v.voucher_date, v.amount, 0);
      }
    });
    
    allJVs.forEach(line => {
      addBal(line.account_id, line.voucher.voucher_date, line.debit, line.credit);
    });
    
    const allSales = await prisma.sale.findMany({ where: { sale_date: { lte: dateParam } } });
    const allPurchases = await prisma.purchase.findMany({ where: { purchase_date: { lte: dateParam } } });
    const allSalePayments = await prisma.salePayment.findMany({ where: { } });
    
    allSales.forEach(s => {
      if (s.customer_id) addBal(s.customer_id, s.sale_date, s.net_total, 0);
    });
    
    allSalePayments.forEach(sp => {
      const parentSale = allSales.find(s => s.id === sp.sale_id);
      if (parentSale && sp.payment_account_id) {
        addBal(sp.payment_account_id, parentSale.sale_date, sp.amount, 0);
        if (parentSale.customer_id) addBal(parentSale.customer_id, parentSale.sale_date, 0, sp.amount);
      }
    });
    
    allPurchases.forEach(p => {
      if (p.supplier_id) addBal(p.supplier_id, p.purchase_date, 0, p.amount);
    });
    
    const runningBalance = Array.from(balanceMap.values()).filter(b => b.opening !== 0 || b.debit !== 0 || b.credit !== 0 || b.closing !== 0);
    runningBalance.sort((a, b) => a.account.localeCompare(b.account));

    return NextResponse.json({
      success: true,
      data: {
        purchases: formattedPurchases,
        purchaseReturns: formattedPurchaseReturns,
        sales: formattedSales,
        saleReturns: formattedSaleReturns,
        wastage: formattedWastage,
        wastageSale: formattedWastageSale,
        cashReceipts,
        cashPayments,
        bankReceipts,
        bankPayments,
        journalVouchers: formattedJournalVouchers,
        runningStock,
        runningBalance
      }
    });

  } catch (err: any) {
    console.error('Daybook Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
