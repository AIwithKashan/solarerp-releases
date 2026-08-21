'use server';

import { prisma } from '@/lib/db';
import type { ActionResult } from '@/types/database';
import type { DailyBookReport, ProfitReport, UnifiedTransaction } from '@/types/reports';

function extractMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  return fallback;
}

// ─── 1. Daily Book & Account Ledger ────────────────────────────────────────────────────────────
export async function getDailyBook(startDate: string, endDate: string, accountId?: string): Promise<ActionResult<DailyBookReport>> {
  try {
    
    const sales = await prisma.sale.findMany({  });
    const salePayments = await prisma.salePayment.findMany({ include: { sale: true } });
    const purchases = await prisma.purchase.findMany({  });
    const vouchers = await prisma.voucher.findMany({  });
    const jvLines = await prisma.journalVoucherLine.findMany({ include: { voucher: true } });
    
    let allTxns: UnifiedTransaction[] = [];
    
    // Process Sales (Customer is debited, Revenue is credited)
    sales.forEach(s => {
      // Sale Invoice (Debit Customer)
      allTxns.push({
        source_type: 'SALE', source_id: s.id, txn_date: s.sale_date,
        account_id: s.customer_id || '', account_name: s.customer_name || 'Walk-in',
        description: `Sale Invoice ${s.invoice_no}`,
        debit: s.net_total, credit: 0, balance: 0,
        ref_no: '',
        created_at: new Date(s.created_at).getTime()
      });
    });
    
    // Process Sale Payments (Cash/Bank is debited, Customer is credited)
    salePayments.forEach(sp => {
      const parentSale = sp.sale;
      if (parentSale) {
        // Find cash account ID if null
        const cashAccountId = sp.payment_account_id || '';
        const payDate = sp.pay_date || parentSale.sale_date;
        allTxns.push({
          source_type: 'SALE_PAYMENT_RECEIPT', source_id: sp.id, txn_date: payDate,
          account_id: cashAccountId, account_name: sp.payment_account_name || 'Cash',
          description: `Payment Received for ${parentSale.invoice_no}`,
          debit: sp.amount, credit: 0, balance: 0,
          ref_no: '',
          created_at: new Date(parentSale.created_at).getTime() + 1 // slight offset
        });
        allTxns.push({
          source_type: 'SALE_PAYMENT_RECEIPT', source_id: sp.id, txn_date: payDate,
          account_id: parentSale.customer_id || '', account_name: parentSale.customer_name || 'Walk-in',
          description: `Payment against Invoice ${parentSale.invoice_no}`,
          debit: 0, credit: sp.amount, balance: 0,
          ref_no: '',
          created_at: new Date(parentSale.created_at).getTime() + 1
        });
      }
    });

    // Process Purchases (Supplier is credited, Inventory is debited)
    purchases.forEach(p => {
      allTxns.push({
        source_type: 'PURCHASE', source_id: p.id, txn_date: p.purchase_date,
        account_id: p.supplier_id || '', account_name: p.supplier_name || 'Walk-in',
        description: `Purchase Invoice ${p.invoice_no}`,
        debit: 0, credit: p.amount, balance: 0,
        ref_no: '',
        created_at: new Date(p.created_at).getTime()
      });
    });

    // Process Vouchers
    vouchers.forEach(v => {
      if (v.direction === 'receipt') {
        allTxns.push({
          source_type: 'VOUCHER_MAIN', source_id: v.id, txn_date: v.voucher_date,
          account_id: v.main_account_id, account_name: v.main_account_name,
          description: `Receipt ${v.voucher_no} from ${v.party_account_name || ''}`,
          debit: v.amount, credit: 0, balance: 0,
          ref_no: '',
          created_at: new Date(v.created_at).getTime()
        });
        if (v.party_account_id) {
          allTxns.push({
            source_type: 'VOUCHER_MAIN', source_id: v.id, txn_date: v.voucher_date,
            account_id: v.party_account_id || '', account_name: v.party_account_name || 'Unknown',
            description: `Payment given via ${v.voucher_no}`,
            debit: 0, credit: v.amount, balance: 0,
            ref_no: '',
            created_at: new Date(v.created_at).getTime()
          });
        }
      } else {
        allTxns.push({
          source_type: 'VOUCHER_MAIN', source_id: v.id, txn_date: v.voucher_date,
          account_id: v.main_account_id, account_name: v.main_account_name,
          description: `Payment ${v.voucher_no} to ${v.party_account_name || ''}`,
          debit: 0, credit: v.amount, balance: 0,
          ref_no: '',
          created_at: new Date(v.created_at).getTime()
        });
        if (v.party_account_id) {
          allTxns.push({
            source_type: 'VOUCHER_MAIN', source_id: v.id, txn_date: v.voucher_date,
            account_id: v.party_account_id || '', account_name: v.party_account_name || 'Unknown',
            description: `Received payment via ${v.voucher_no}`,
            debit: v.amount, credit: 0, balance: 0,
            ref_no: '',
            created_at: new Date(v.created_at).getTime()
          });
        }
      }
    });

    // Process Journal Vouchers
    jvLines.forEach(line => {
      if (line.voucher) {
        allTxns.push({
          source_type: 'JOURNAL_VOUCHER', source_id: line.id, txn_date: line.voucher.voucher_date,
          account_id: line.account_id, account_name: line.account_name,
          description: `Journal ${line.voucher.voucher_no} ${line.remarks ? '- ' + line.remarks : ''}`,
          debit: line.debit, credit: line.credit, balance: 0,
          ref_no: '',
          created_at: new Date(line.voucher.created_at).getTime()
        });
      }
    });

    // If an account is specified, filter by it
    if (accountId) {
      allTxns = allTxns.filter(t => t.account_id === accountId);
    }

    // Sort by date then created_at for a stable chronological order
    allTxns.sort((a, b) => {
      const d1 = new Date(a.txn_date).getTime();
      const d2 = new Date(b.txn_date).getTime();
      if (d1 === d2) {
        return (a.created_at || 0) - (b.created_at || 0);
      }
      return d1 - d2;
    });

    let runningBal = 0;
    let openingBal = 0;

    const filtered: UnifiedTransaction[] = [];

    for (const t of allTxns) {
      if (t.txn_date < startDate) {
        openingBal += (t.debit - t.credit);
      } else if (t.txn_date <= endDate) {
        if (filtered.length === 0) runningBal = openingBal;
        runningBal += (t.debit - t.credit);
        t.balance = runningBal;
        filtered.push(t);
      }
    }

    const totalDebit = filtered.reduce((s, t) => s + t.debit, 0);
    const totalCredit = filtered.reduce((s, t) => s + t.credit, 0);
    const closingBal = openingBal + totalDebit - totalCredit;

    return { 
      success: true, 
      data: { opening_balance: openingBal, period_debit: totalDebit, period_credit: totalCredit, closing_balance: closingBal, transactions: filtered } 
    };
  } catch (err) {
    return { success: false, error: extractMessage(err, 'Failed to fetch Daily Book') };
  }
}

// ─── 2. Daily Cash ────────────────────────────────────────────────────────────
export async function getDailyCash(startDate: string, endDate: string): Promise<ActionResult<DailyBookReport>> {
  try {
        const cashAccs = await prisma.account.findMany({ where: { account_type: 'Cash Account' } });
    if (cashAccs.length === 0) return { success: true, data: { opening_balance: 0, period_debit: 0, period_credit: 0, closing_balance: 0, transactions: [] } };
    
    // Normally there's one main Cash Account. We'll use the first one.
    return getDailyBook(startDate, endDate, cashAccs[0].id);
  } catch (err) {
    return { success: false, error: extractMessage(err, 'Failed to fetch Daily Cash') };
  }
}

// ─── 3. Chart of Accounts ─────────────────────────────────────────────────────
export async function getChartOfAccounts(): Promise<ActionResult<any[]>> {
  try {
        const accounts = await prisma.account.findMany({ orderBy: { account_title: 'asc' } });
    
    return { success: true, data: accounts };
  } catch (err) {
    return { success: false, error: extractMessage(err, 'Failed to fetch Chart of Accounts') };
  }
}

// ─── 4. Profit Report ─────────────────────────────────────────────────────────
export async function getProfitReport(startDate: string, endDate: string): Promise<ActionResult<ProfitReport>> {
  try {
        const sales = await prisma.sale.findMany({
      where: { sale_date: { gte: startDate, lte: endDate } }
    });
    const purchases = await prisma.purchase.findMany({
      where: { purchase_date: { gte: startDate, lte: endDate } }
    });
    const vouchers = await prisma.voucher.findMany({
      where: { voucher_date: { gte: startDate, lte: endDate }  }
    });

    const totalRevenue = sales.reduce((s, x) => s + x.net_total, 0);
    const totalCOGS = purchases.reduce((s, x) => s + x.amount, 0);
    const grossProfit = totalRevenue - totalCOGS;

    // Estimate expenses by vouchers marked as payments where no party is involved, 
    // or by party accounts of type "Expense Account"
    // Since we don't strictly have "Expense Account" type in the schema, we'll aggregate vouchers
    let totalExpenses = 0;
    vouchers.forEach(v => {
      if (v.direction === 'payment') totalExpenses += v.amount;
    });

    const netProfit = grossProfit - totalExpenses;

    return { 
      success: true, 
      data: {
        gross_sales: totalRevenue, // simplified
        discount: 0,
        net_sales: totalRevenue,
        cogs: totalCOGS,
        gross_profit: grossProfit,
        expenses: totalExpenses,
        net_profit: netProfit,
        sales_breakdown: [] // simplified for now or provide empty array
      } 
    };
  } catch (err) {
    return { success: false, error: extractMessage(err, 'Failed to fetch Profit Report') };
  }
}

// ─── 5. Expenses Report ───────────────────────────────────────────────────────
export async function getExpensesReport(startDate: string, endDate: string): Promise<ActionResult<UnifiedTransaction[]>> {
  try {
        const vouchers = await prisma.voucher.findMany({
      where: { voucher_date: { gte: startDate, lte: endDate }, direction: 'payment' }
    });
    
    const mapped: UnifiedTransaction[] = vouchers.map(v => ({
      source_type: 'VOUCHER_MAIN', source_id: v.id, txn_date: v.voucher_date,
      account_id: v.party_account_id || '', account_name: v.party_account_name || 'Unknown',
      description: v.details || 'Expense', debit: v.amount, credit: 0, balance: 0,
      ref_no: ''
    }));
    return { success: true, data: mapped };
  } catch (err) {
    return { success: false, error: extractMessage(err, 'Failed to fetch Expenses Report') };
  }
}

// ─── 6. Purchases Report ──────────────────────────────────────────────────────
export async function getPurchasesReport(startDate: string, endDate: string): Promise<ActionResult<any[]>> {
  try {
        const data = await prisma.purchase.findMany({
      where: { purchase_date: { gte: startDate, lte: endDate } },
      orderBy: { purchase_date: 'asc' }
    });
    return { success: true, data: data as any };
  } catch (err) {
    return { success: false, error: extractMessage(err, 'Failed to fetch Purchases') };
  }
}

// ─── 7. Sales Report ──────────────────────────────────────────────────────────
export async function getSalesReport(startDate: string, endDate: string): Promise<ActionResult<any[]>> {
  try {
        const data = await prisma.sale.findMany({
      where: { sale_date: { gte: startDate, lte: endDate } },
      include: { sale_items: true, sale_payments: true },
      orderBy: { sale_date: 'asc' }
    });
    return { success: true, data: data as any };
  } catch (err) {
    return { success: false, error: extractMessage(err, 'Failed to fetch Sales') };
  }
}

// ─── 8. Stock Report ──────────────────────────────────────────────────────────
export async function getStockReport(): Promise<ActionResult<any[]>> {
  try {
        
    const purchases = await prisma.purchase.findMany({ select: { item_name: true, power_watt: true, quantity: true, accounting_unit: true, amount: true } });
    const saleItems = await prisma.saleItem.findMany({ where: { }, select: { item_name: true, power_watt: true, quantity: true } });

    const stockMap = new Map<string, any>();

    purchases.forEach(p => {
      const key = `${p.item_name}|${p.power_watt || 0}`;
      if (!stockMap.has(key)) {
        stockMap.set(key, { item_name: p.item_name, power_watt: p.power_watt, accounting_unit: p.accounting_unit, total_in: 0, total_out: 0, total_value_in: 0 });
      }
      const entry = stockMap.get(key);
      entry.total_in += Number(p.quantity);
      entry.total_value_in += Number(p.amount);
    });

    saleItems.forEach(s => {
      const key = `${s.item_name}|${s.power_watt || 0}`;
      if (stockMap.has(key)) {
        stockMap.get(key).total_out += Number(s.quantity);
      } else {
        stockMap.set(key, { item_name: s.item_name, power_watt: s.power_watt, accounting_unit: 'Unknown', total_in: 0, total_out: Number(s.quantity), total_value_in: 0 });
      }
    });

    const stockList = Array.from(stockMap.values()).map(entry => {
      const current_stock = entry.total_in - entry.total_out;
      const avg_cost = entry.total_in > 0 ? (entry.total_value_in / entry.total_in) : 0;
      return { ...entry, current_stock, avg_cost, stock_value: current_stock * avg_cost };
    });

    stockList.sort((a, b) => a.item_name.localeCompare(b.item_name));
    return { success: true, data: stockList };
  } catch (err) {
    return { success: false, error: extractMessage(err, 'Failed to calculate Stock') };
  }
}

// ─── 9. Helper: Accounts List ──────────────────────────────────────────────────
export async function getAccountsList(): Promise<ActionResult<{ id: string, name: string, type: string }[]>> {
  try {
        const data = await prisma.account.findMany({
      select: { id: true, account_title: true, account_type: true },
      orderBy: { account_title: 'asc' }
    });
    const mapped = data.map(d => ({ id: d.id, name: d.account_title, type: d.account_type }));
    return { success: true, data: mapped };
  } catch (err) {
    return { success: false, error: extractMessage(err, 'Failed to fetch accounts list') };
  }
}
