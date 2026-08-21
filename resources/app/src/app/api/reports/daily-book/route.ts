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

    // 1. Fetch Sales for the day
    const sales = await prisma.sale.findMany({
      where: { sale_date: dateParam },
      include: { 
        sale_items: true,
        sale_payments: true,
        sale_other_credits: true,
        voucher_allocations: {
          include: { voucher: true }
        }
      }
    });

    const formattedSales = sales.map(s => {
      const lines: any[] = [];
      
      // Main products
      s.sale_items.forEach(item => {
        lines.push({
          product: `${item.item_name} ${item.power_watt ? item.power_watt + 'W' : ''}`.trim(),
          qty: item.quantity,
          rate: item.rate,
          amount: item.amount
        });
      });

      // Discount
      if (s.discount_amount > 0) {
        lines.push({
          product: 'Discount',
          qty: null,
          rate: null,
          amount: -s.discount_amount
        });
      }

      // Other credits/charges
      s.sale_other_credits.forEach(credit => {
        lines.push({
          product: credit.item_name,
          qty: credit.quantity,
          rate: credit.rate,
          amount: credit.amount // Assuming this is an addition. If credit means deduction, make it negative. Usually in this schema it's an addition to the bill.
        });
      });

      // Payments received against this bill
      s.sale_payments.forEach(pay => {
        lines.push({
          product: `Payment (${pay.payment_account_name || 'Cash'})`,
          qty: null,
          rate: null,
          amount: -pay.amount // Payment reduces the remaining bill balance
        });
      });

      // Payments received via Vouchers
      if (s.voucher_allocations) {
        s.voucher_allocations.forEach((alloc: any) => {
          lines.push({
            product: `Payment via Voucher (${alloc.voucher?.voucher_no || 'Receipt'})`,
            qty: null,
            rate: null,
            amount: -(alloc.allocatedAmount || 0)
          });
        });
      }

      return {
        billNo: s.invoice_no,
        account: s.customer_name || 'Walk-in',
        lines
      };
    });

    // 2. Fetch Purchases for the day
    const purchases = await prisma.purchase.findMany({
      where: { purchase_date: dateParam },
      include: { allocations: true }
    });

    // We must group purchases by invoice_no, because the schema stores them as individual rows per item
    const purchaseGroups = new Map<string, { billNo: string; account: string; lines: any[] }>();
    
    purchases.forEach(p => {
      if (!purchaseGroups.has(p.invoice_no)) {
        purchaseGroups.set(p.invoice_no, {
          billNo: p.invoice_no,
          account: p.supplier_name || 'Walk-in',
          lines: []
        });
      }
      
      const group = purchaseGroups.get(p.invoice_no)!;
      group.lines.push({
        product: `${p.item_name} ${p.power_watt ? p.power_watt + 'W' : ''}`.trim(),
        qty: p.quantity,
        rate: p.rate,
        amount: p.amount
      });
      
      // If paid amount was recorded at time of purchase, we can show it as a line.
      // But typically it's recorded via Voucher/PaymentVoucher. 
      // For simplicity, we just list the items.
    });

    const formattedPurchases = Array.from(purchaseGroups.values());

    // 3. Fetch Journal Vouchers for the day
    const journalVouchers = await prisma.journalVoucher.findMany({
      where: { voucher_date: dateParam },
      include: { lines: true }
    });

    const formattedJournalVouchers = journalVouchers.map(jv => ({
      billNo: jv.voucher_no,
      lines: jv.lines.map(line => ({
        account: `${line.account_name} (${line.debit > 0 ? 'Dr' : 'Cr'})`,
        amount: line.debit > 0 ? line.debit : line.credit
      }))
    }));

    // 4. Other Vouchers (Cash Receipts, Cash Payments, etc.)
    const vouchers = await prisma.voucher.findMany({
      where: { voucher_date: dateParam }
    });

    const cashReceipts: any[] = [];
    const cashPayments: any[] = [];
    const bankReceipts: any[] = [];
    const bankPayments: any[] = [];

    vouchers.forEach(v => {
      const entry = {
        billNo: v.voucher_no,
        account: v.party_account_name || v.main_account_name,
        amount: v.amount
      };

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
        if (v.direction === 'receipt') {
          cashReceipts.push(entry);
        } else {
          cashPayments.push(entry);
        }
      }
    });

    // 5. Running Stock (Only for products traded today)
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
          entry.opening -= item.quantity;
        } else {
          entry.out += item.quantity;
        }
        entry.closing = entry.opening + entry.in - entry.out;
      });
    });

    // Filter to ONLY include items that were active today (in > 0 || out > 0)
    const runningStock = Array.from(stockMap.values()).filter(s => s.in > 0 || s.out > 0);
    runningStock.sort((a, b) => a.product.localeCompare(b.product));

    // 6. Running Balance (Ledger)
    const accounts = await prisma.account.findMany({  });
    const allVouchers = await prisma.voucher.findMany({ where: { voucher_date: { lte: dateParam }  } });
    const allJVs = await prisma.journalVoucherLine.findMany({
      where: { voucher: { voucher_date: { lte: dateParam } } },
      include: { voucher: true }
    });
    
    const balanceMap = new Map<string, { account: string; opening: number; debit: number; credit: number; closing: number }>();
    
    accounts.forEach(acc => {
      // Set opening to initial balance if any
      balanceMap.set(acc.id, { account: acc.account_title, opening: acc.balance || 0, debit: 0, credit: 0, closing: acc.balance || 0 });
    });
    
    const addBal = (accId: string, date: string, debit: number, credit: number) => {
      if (!accId) return;
      let entry = balanceMap.get(accId);
      if (!entry) {
        entry = { account: 'Unknown Account', opening: 0, debit: 0, credit: 0, closing: 0 };
        balanceMap.set(accId, entry);
      }
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
    const allPurchasesParams = await prisma.purchase.findMany({ where: { purchase_date: { lte: dateParam } } });
    const allSalePayments = await prisma.salePayment.findMany({ where: { } });
    
    allSales.forEach(s => {
      if (s.customer_id) addBal(s.customer_id, s.sale_date, s.net_total, 0);
    });
    
    allSalePayments.forEach(sp => {
      const parentSale = allSales.find(s => s.id === sp.sale_id);
      if (parentSale && sp.payment_account_id) {
        addBal(sp.payment_account_id, parentSale.sale_date, sp.amount, 0); // Bank/Cash gets debit
        if (parentSale.customer_id) addBal(parentSale.customer_id, parentSale.sale_date, 0, sp.amount); // Customer gets credit
      }
    });
    
    allPurchasesParams.forEach(p => {
      if (p.supplier_id) addBal(p.supplier_id, p.purchase_date, 0, p.amount); // Supplier gets credit on purchase
    });

    // Filter to ONLY include accounts touched today (debit > 0 || credit > 0)
    const runningBalance = Array.from(balanceMap.values()).filter(b => b.debit > 0 || b.credit > 0);
    runningBalance.sort((a, b) => a.account.localeCompare(b.account));

    return NextResponse.json({
      success: true,
      data: {
        businessName,
        purchases: formattedPurchases,
        sales: formattedSales,
        journalVouchers: formattedJournalVouchers,
        cashReceipts,
        cashPayments,
        bankReceipts,
        bankPayments,
        runningStock,
        runningBalance
      }
    });

  } catch (err: any) {
    console.error('Daybook Refined Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
