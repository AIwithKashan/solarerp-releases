import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    
    if (!fromParam || !toParam) {
      return NextResponse.json({ success: false, error: 'From and To dates are required' }, { status: 400 });
    }

    
    // 1. Fetch Business Settings
    const settings = await prisma.businessSettings.findFirst({
      
    });
    const businessName = settings?.business_name || 'Business Name';

    // 2. Fetch Sales within date range (to get trading items)
    const sales = await prisma.sale.findMany({
      where: { sale_date: { gte: fromParam, lte: toParam } },
      include: { sale_items: true }
    });

    // 3. Fetch Purchases up to 'to' date to calculate weighted average cost
    const purchases = await prisma.purchase.findMany({
      where: { purchase_date: { lte: toParam } }
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

    // 4. Calculate Trading Profit
    const tradingItems: any[] = [];
    let grossTradingProfit = 0;

    sales.forEach(sale => {
      // In a real P&L, you might group by item rather than list every single invoice line.
      // But the user requested: "A table listing every item sold within the date range"
      // To keep it somewhat concise, we'll group by item within the date range.
      sale.sale_items.forEach(item => {
        const avgCost = getAvgCost(item.item_name, item.power_watt);
        const sellRate = item.quantity > 0 ? (item.amount / item.quantity) : item.rate;
        // Discount on sale level should ideally be distributed to items, but we'll use exact item rate 
        // minus a proportional discount if needed. The user said: "Profit/Loss per line = (Sell Rate - Purchase Rate) * Qty."
        // We will strictly follow that. If there's a global discount on the sale, we can subtract it later or distribute it.
        // Let's distribute the global discount percentage to the sell rate to be accurate.
        const effectiveSellRate = sellRate * (1 - (sale.discount_percent / 100));
        
        const profit = (effectiveSellRate - avgCost) * item.quantity;
        grossTradingProfit += profit;

        // Grouping by item for cleaner display (optional, but requested "listing every item sold").
        // Let's group by item name so the table isn't 1000s of rows.
        const key = `${item.item_name}|${item.power_watt || 0}`;
        const existing = tradingItems.find(t => t.key === key);
        if (existing) {
          existing.qtySold += item.quantity;
          // Weighted average effective sell rate
          existing.totalSaleValue += (effectiveSellRate * item.quantity);
          existing.sellRate = existing.totalSaleValue / existing.qtySold;
          existing.profit += profit;
        } else {
          tradingItems.push({
            key,
            itemName: item.item_name,
            powerWatt: item.power_watt,
            qtySold: item.quantity,
            purchaseRate: avgCost,
            sellRate: effectiveSellRate,
            totalSaleValue: effectiveSellRate * item.quantity,
            profit
          });
        }
      });
    });

    // 5. Fetch Vouchers and JVs for Other Income and Expenses within date range
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

    // Calculate movements
    // Income = Credit - Debit
    // Expense = Debit - Credit
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
      // Income increases with Credit, so Net Income = Credit - Debit = -movement
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
      // Expense increases with Debit, so Net Expense = Debit - Credit = movement
      const netExpense = movement;
      if (netExpense !== 0) {
        expenses.push({ accountName: acc.account_title, amount: netExpense });
        totalExpenses += netExpense;
      }
    });

    // 6. Net Profit Calculation
    const totalSale = grossTradingProfit + totalOtherIncome;
    const netProfit = totalSale - totalExpenses;

    return NextResponse.json({
      success: true,
      data: {
        businessName,
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
