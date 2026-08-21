import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    if (!dateParam) {
      return NextResponse.json({ success: false, error: 'Date is required' }, { status: 400 });
    }

    
    // 1. Fetch Business Settings
    const settings = await prisma.businessSettings.findFirst({
      
    });
    const businessName = settings?.business_name || 'Marwa Sky Tech Energy';

    // 2. Fetch Ledger Accounts & Transactions up to date
    const accounts = await prisma.account.findMany({  });
    
    const allVouchers = await prisma.voucher.findMany({ where: { voucher_date: { lte: dateParam }  } });
    const allJVs = await prisma.journalVoucherLine.findMany({
      where: { voucher: { voucher_date: { lte: dateParam } } },
      include: { voucher: true }
    });
    const allSales = await prisma.sale.findMany({ where: { sale_date: { lte: dateParam } } });
    const allPurchases = await prisma.purchase.findMany({ where: { purchase_date: { lte: dateParam } } });
    const allSalePayments = await prisma.salePayment.findMany({ where: { sale: { sale_date: { lte: dateParam } } } }); // Wait, pay_date should be used? The schema has `pay_date` on SalePayment. We should filter by `pay_date`. Let's fetch all and filter in JS if needed. Actually we'll fetch where pay_date <= dateParam.
    
    const allSalePaymentsCorrected = await prisma.salePayment.findMany({
      where: { sale: {}, pay_date: { lte: dateParam } }
    });

    // 3. Compute Account Balances
    const balanceMap = new Map<string, { id: string; title: string; type: string; debit: number; credit: number; balance: number }>();
    
    accounts.forEach(acc => {
      // Opening balance from account creation
      balanceMap.set(acc.id, { 
        id: acc.id, 
        title: acc.account_title, 
        type: acc.account_type, 
        debit: acc.balance && acc.balance > 0 ? acc.balance : 0, 
        credit: acc.balance && acc.balance < 0 ? Math.abs(acc.balance) : 0, 
        balance: acc.balance || 0 
      });
    });
    
    const addBal = (accId: string, debit: number, credit: number) => {
      if (!accId) return;
      let entry = balanceMap.get(accId);
      if (!entry) return; // If account was deleted but transactions remain, ignore or create dummy
      entry.debit += debit;
      entry.credit += credit;
      entry.balance += (debit - credit);
    };
    
    allVouchers.forEach(v => {
      if (v.direction === 'receipt') {
        addBal(v.main_account_id, v.amount, 0); // debit main
        if (v.party_account_id) addBal(v.party_account_id, 0, v.amount); // credit party
      } else {
        addBal(v.main_account_id, 0, v.amount); // credit main
        if (v.party_account_id) addBal(v.party_account_id, v.amount, 0); // debit party
      }
    });
    
    allJVs.forEach(line => {
      addBal(line.account_id, line.debit, line.credit);
    });
    
    let totalSalesValue = 0;
    allSales.forEach(s => {
      totalSalesValue += s.net_total;
      if (s.customer_id) addBal(s.customer_id, s.net_total, 0); // Customer gets debit
    });
    
    let totalPurchasesValue = 0;
    allPurchases.forEach(p => {
      totalPurchasesValue += p.amount;
      if (p.supplier_id) addBal(p.supplier_id, 0, p.amount); // Supplier gets credit
    });

    const defaultCashAcc = accounts.find(a => a.account_type === 'Cash Account');
    
    allSalePaymentsCorrected.forEach(sp => {
      const paymentAccountId = sp.payment_account_id || defaultCashAcc?.id;
      if (paymentAccountId) {
        addBal(paymentAccountId, sp.amount, 0); // Cash/Bank gets debit
      }
      // Customer gets credit
      const parentSale = allSales.find(s => s.id === sp.sale_id);
      if (parentSale && parentSale.customer_id) {
        addBal(parentSale.customer_id, 0, sp.amount);
      }
    });

    // 4. Compute Inventory Value
    // Sum Qty In and Value In
    const stockMap = new Map<string, { qtyIn: number; valueIn: number; qtyOut: number; closingQty: number; avgRate: number; stockValue: number }>();
    
    allPurchases.forEach(p => {
      const key = `${p.item_name}|${p.power_watt || 0}`;
      if (!stockMap.has(key)) stockMap.set(key, { qtyIn: 0, valueIn: 0, qtyOut: 0, closingQty: 0, avgRate: 0, stockValue: 0 });
      const entry = stockMap.get(key)!;
      entry.qtyIn += p.quantity;
      entry.valueIn += p.amount; // total purchase value for this item
    });

    const allSalesItems = await prisma.saleItem.findMany({
      where: { sale: { sale_date: { lte: dateParam } } }
    });

    allSalesItems.forEach(item => {
      const key = `${item.item_name}|${item.power_watt || 0}`;
      if (!stockMap.has(key)) stockMap.set(key, { qtyIn: 0, valueIn: 0, qtyOut: 0, closingQty: 0, avgRate: 0, stockValue: 0 });
      const entry = stockMap.get(key)!;
      entry.qtyOut += item.quantity;
    });

    let totalInventoryValue = 0;
    stockMap.forEach(entry => {
      entry.closingQty = entry.qtyIn - entry.qtyOut;
      entry.avgRate = entry.qtyIn > 0 ? entry.valueIn / entry.qtyIn : 0;
      if (entry.closingQty > 0) {
        entry.stockValue = entry.closingQty * entry.avgRate;
        totalInventoryValue += entry.stockValue;
      }
    });

    // 5. Group Accounts and Calculate Maliat
    const groups: Record<string, any[]> = {
      cash: [],
      bank: [],
      suppliers: [],
      customers: [],
      staff: [],
      expenses: [],
      investors: [],
      assets: []
    };

    let cashTotal = 0;
    let bankTotal = 0;
    let customersTotal = 0; // Debits are positive
    let suppliersTotal = 0; // Credits are positive for suppliers (liability), we'll keep balance as (debit - credit), so negative means we owe them. Wait, if it's a liability, let's just use the raw balance and interpret.
    let staffTotal = 0;
    let expensesTotal = 0;
    let investorsTotal = 0; // Credit nature
    let assetsTotal = 0; // Debit nature

    Array.from(balanceMap.values()).forEach(acc => {
      if (acc.debit === 0 && acc.credit === 0 && acc.balance === 0) return; // Skip zero activity

      const item = { title: acc.title, debit: acc.debit, credit: acc.credit, balance: acc.balance };

      switch(acc.type) {
        case 'Cash Account':
          groups.cash.push(item);
          cashTotal += acc.balance;
          break;
        case 'Bank Account':
          groups.bank.push(item);
          bankTotal += acc.balance;
          break;
        case 'Suppliers':
          groups.suppliers.push(item);
          suppliersTotal += acc.balance; // Negative means we owe (Liability)
          break;
        case 'Customers':
          groups.customers.push(item);
          customersTotal += acc.balance; // Positive means they owe us (Asset)
          break;
        case 'Staff':
          groups.staff.push(item);
          staffTotal += acc.balance;
          break;
        case 'Expense Account':
          groups.expenses.push(item);
          expensesTotal += acc.balance; // Expenses are debit nature
          break;
        case 'Investors':
          groups.investors.push(item);
          investorsTotal += acc.balance; // Credit nature (negative balance means they invested)
          break;
        case 'Assets Account':
        case 'Movable & Non Movable Property':
          groups.assets.push(item);
          assetsTotal += acc.balance; // Debit nature
          break;
        default:
          break;
      }
    });

    // Subtotals Calculations
    // Standard accounting:
    // Total Assets = Cash + Bank + Inventory + Fixed Assets + positive balances from (Customers, Suppliers, Staff)
    // Total Liabilities = negative balances from (Customers, Suppliers, Staff)
    let totalAssets = cashTotal + bankTotal + totalInventoryValue + assetsTotal;
    let totalLiabilities = 0;

    groups.customers.forEach(c => {
      if (c.balance > 0) totalAssets += c.balance;
      else if (c.balance < 0) totalLiabilities += Math.abs(c.balance);
    });

    groups.suppliers.forEach(s => {
      if (s.balance > 0) totalAssets += s.balance;
      else if (s.balance < 0) totalLiabilities += Math.abs(s.balance);
    });

    groups.staff.forEach(s => {
      if (s.balance > 0) totalAssets += s.balance;
      else if (s.balance < 0) totalLiabilities += Math.abs(s.balance);
    });

    const maliat = totalAssets - totalLiabilities;

    // Opening Investment: Total of Investors account. Since it's credit nature, the balance is negative.
    // We take the absolute value as the investment amount.
    const openingInvestment = Math.abs(investorsTotal);
    const growth = maliat - openingInvestment;

    return NextResponse.json({
      success: true,
      data: {
        businessName,
        totalSales: totalSalesValue,
        totalPurchases: totalPurchasesValue,
        inventoryValue: totalInventoryValue,
        groups: {
          cash: { items: groups.cash, total: cashTotal },
          bank: { items: groups.bank, total: bankTotal },
          suppliers: { items: groups.suppliers, total: suppliersTotal },
          customers: { items: groups.customers, total: customersTotal },
          staff: { items: groups.staff, total: staffTotal },
          expenses: { items: groups.expenses, total: expensesTotal },
          investors: { items: groups.investors, total: investorsTotal },
          assets: { items: groups.assets, total: assetsTotal }
        },
        financials: {
          totalAssets,
          totalLiabilities,
          maliat,
          openingInvestment,
          growth
        }
      }
    });

  } catch (err: any) {
    console.error('Chart of Accounts API Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
