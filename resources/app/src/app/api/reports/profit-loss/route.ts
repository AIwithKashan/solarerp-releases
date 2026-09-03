import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const biltiParam = searchParams.get('bilti')?.trim() || '';
    
    if (!fromParam || !toParam) {
      return NextResponse.json({ success: false, error: 'From and To dates are required' }, { status: 400 });
    }

    // 1. Fetch Business Settings
    const settings = await prisma.businessSettings.findFirst({});
    const businessName = settings?.business_name || 'Business Name';

    // 2. Fetch distinct bilti numbers for dropdown selector
    const biltiPurchases = await prisma.purchase.findMany({
      where: { bilti_no: { not: null } },
      select: { bilti_no: true },
      distinct: ['bilti_no']
    });
    const biltiSales = await prisma.saleItem.findMany({
      where: { bilti_no: { not: null } },
      select: { bilti_no: true },
      distinct: ['bilti_no']
    });
    const availableBiltisSet = new Set<string>();
    biltiPurchases.forEach(p => { if (p.bilti_no?.trim()) availableBiltisSet.add(p.bilti_no.trim()); });
    biltiSales.forEach(s => { if (s.bilti_no?.trim()) availableBiltisSet.add(s.bilti_no.trim()); });
    const availableBiltis = Array.from(availableBiltisSet).sort();

    // 3. Fetch Sales within date range (filtered by bilti if specified)
    const salesWhere: any = { sale_date: { gte: fromParam, lte: toParam } };
    if (biltiParam) {
      salesWhere.sale_items = { some: { bilti_no: biltiParam } };
    }
    const sales = await prisma.sale.findMany({
      where: salesWhere,
      include: { sale_items: true }
    });

    // 4. Fetch Purchases up to 'to' date to calculate weighted average cost (or container cost)
    const purchasesWhere: any = { purchase_date: { lte: toParam } };
    if (biltiParam) {
      purchasesWhere.bilti_no = biltiParam;
    }
    const purchases = await prisma.purchase.findMany({
      where: purchasesWhere
    });

    // Calculate Average Cost per item
    const costMap = new Map<string, { qty: number; value: number }>();
    purchases.forEach(p => {
      const key = `${p.item_name}|${p.power_watt || 0}`;
      if (!costMap.has(key)) costMap.set(key, { qty: 0, value: 0 });
      const entry = costMap.get(key)!;
      entry.qty += p.quantity;
      entry.value += p.amount;
    });

    const getAvgCost = (itemName: string, powerWatt: number | null) => {
      const key = `${itemName}|${powerWatt || 0}`;
      const entry = costMap.get(key);
      if (!entry || entry.qty === 0) return 0;
      return entry.value / entry.qty;
    };

    // 5. Calculate Trading Profit
    const tradingItems: any[] = [];
    let grossTradingProfit = 0;

    sales.forEach(sale => {
      sale.sale_items.forEach(item => {
        if (biltiParam && item.bilti_no !== biltiParam) {
          return; // Skip items from other biltis when filtering
        }

        const avgCost = getAvgCost(item.item_name, item.power_watt);
        const sellRate = item.quantity > 0 ? (item.amount / item.quantity) : item.rate;
        const effectiveSellRate = sellRate * (1 - (sale.discount_percent / 100));
        
        const profit = (effectiveSellRate - avgCost) * item.quantity;
        grossTradingProfit += profit;

        const key = `${item.item_name}|${item.power_watt || 0}|${item.bilti_no || 'none'}|${avgCost.toFixed(2)}|${effectiveSellRate.toFixed(2)}`;
        const existing = tradingItems.find(t => t.key === key);
        if (existing) {
          existing.qtySold += item.quantity;
          existing.totalSaleValue += (effectiveSellRate * item.quantity);
          existing.profit += profit;
        } else {
          tradingItems.push({
            key,
            itemName: item.item_name,
            powerWatt: item.power_watt,
            biltiNo: item.bilti_no || null,
            qtySold: item.quantity,
            purchaseRate: avgCost,
            sellRate: effectiveSellRate,
            totalSaleValue: effectiveSellRate * item.quantity,
            profit
          });
        }
      });
    });

    // Container specific metrics
    let containerSummary: any = null;
    if (biltiParam) {
      // Instead of Total Purchased Cost (all stock), use Cost of Goods Sold (COGS)
      const totalCOGS = tradingItems.reduce((sum, t) => sum + (t.qtySold * t.purchaseRate), 0);
      const totalSalesRevenue = tradingItems.reduce((sum, t) => sum + t.totalSaleValue, 0);
      const totalSoldQty = tradingItems.reduce((sum, t) => sum + t.qtySold, 0);
      const containerProfit = totalSalesRevenue - totalCOGS;
      const profitMargin = totalSalesRevenue > 0 ? (containerProfit / totalSalesRevenue) * 100 : 0;

      containerSummary = {
        biltiNo: biltiParam,
        totalPurchasedCost: totalCOGS, 
        totalPurchasedQty: totalSoldQty, 
        totalSalesRevenue,
        totalSoldQty,
        containerProfit,
        profitMargin,
        isProfitable: containerProfit >= 0
      };
    }

    // 6. Fetch Vouchers and JVs for Other Income and Expenses within date range
    const accounts = await prisma.account.findMany({
      where: { 
        account_type: { in: ['Income Account', 'Expense Account'] } 
      }
    });

    const incomeAccounts = accounts.filter(a => a.account_type === 'Income Account');
    const expenseAccounts = accounts.filter(a => a.account_type === 'Expense Account');

    const allVouchers = await prisma.voucher.findMany({ 
      where: { voucher_date: { gte: fromParam, lte: toParam }  } 
    });
    
    const allJVs = await prisma.journalVoucherLine.findMany({
      where: { voucher: { voucher_date: { gte: fromParam, lte: toParam } } },
      include: { voucher: true }
    });

    const movements = new Map<string, number>();

    const addMovement = (accId: string, debit: number, credit: number) => {
      if (!accId) return;
      if (!movements.has(accId)) movements.set(accId, 0);
      movements.set(accId, movements.get(accId)! + (debit - credit));
    };

    allVouchers.forEach(v => {
      if (v.direction === 'receipt') {
        addMovement(v.main_account_id, v.amount, 0);
        if (v.party_account_id) addMovement(v.party_account_id, 0, v.amount);
      } else {
        addMovement(v.main_account_id, 0, v.amount);
        if (v.party_account_id) addMovement(v.party_account_id, v.amount, 0);
      }
    });

    allJVs.forEach(line => {
      addMovement(line.account_id, line.debit, line.credit);
    });

    const otherIncome: any[] = [];
    let totalOtherIncome = 0;

    incomeAccounts.forEach(acc => {
      const movement = movements.get(acc.id) || 0;
      const netIncome = -movement; 
      if (netIncome !== 0) {
        otherIncome.push({ accountName: acc.account_title, amount: netIncome });
        totalOtherIncome += netIncome;
      }
    });

    const expenses: any[] = [];
    let totalExpenses = 0;

    expenseAccounts.forEach(acc => {
      const movement = movements.get(acc.id) || 0;
      const netExpense = movement;
      if (netExpense !== 0) {
        expenses.push({ accountName: acc.account_title, amount: netExpense });
        totalExpenses += netExpense;
      }
    });

    // 7. Net Profit Calculation
    const totalSale = grossTradingProfit + totalOtherIncome;
    const netProfit = totalSale - totalExpenses;

    return NextResponse.json({
      success: true,
      data: {
        businessName,
        biltiFilter: biltiParam,
        availableBiltis,
        containerSummary,
        tradingItems: tradingItems.sort((a, b) => b.profit - a.profit),
        grossTradingProfit,
        otherIncome,
        totalOtherIncome,
        expenses,
        totalExpenses,
        totalSale,
        netProfit
      }
    });

  } catch (err: any) {
    console.error('Profit/Loss Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
