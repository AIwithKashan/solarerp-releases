'use server';

import { prisma } from '@/lib/db';

import type { ActionResult } from '@/types/database';
import { getStockReport } from '@/app/reports/actions';

function getLocalISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function getSummaryMetrics(): Promise<ActionResult<{
  monthlyRevenue: number;
  totalReceivables: number;
  totalPayables: number;
  liquidCash: number;
}>> {
  try {

    
    const now = new Date();
    const firstDay = getLocalISODate(new Date(now.getFullYear(), now.getMonth(), 1));
    const lastDay = getLocalISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    
    const sales = await prisma.sale.findMany({
      where: { sale_date: { gte: firstDay, lte: lastDay } },
      select: { net_total: true }
    });
    
    const monthlyRevenue = sales.reduce((sum, s) => sum + s.net_total, 0);

    const accounts = await prisma.account.findMany({
      select: { id: true, account_type: true, balance: true }
    });
    
    // Total Receivables & Payables based on unpaid invoices
    const unpaidPurchases = await prisma.purchase.aggregate({
      where: { paymentStatus: { in: ['unpaid', 'partial'] }, supplier_id: { not: null } },
      _sum: { remainingAmount: true }
    });
    
    const unpaidSales = await prisma.sale.aggregate({
      where: { status: { in: ['unpaid', 'partial'] }, customer_id: { not: null } },
      _sum: { remaining_balance: true }
    });

    let totalReceivables = unpaidSales._sum.remaining_balance || 0;
    let totalPayables = unpaidPurchases._sum.remainingAmount || 0;
    
    // Liquid Cash = Opening Balances + Receipts - Payments + JVs for Cash and Bank Accounts
    const cashBankAccounts = accounts.filter(a => ['Cash Account', 'Bank Account', 'Cash', 'Bank'].includes(a.account_type));
    let liquidCash = 0;

    for (const acc of cashBankAccounts) {
      let balance = acc.balance || 0;
      
      // Vouchers where this is main account
      const mainVouchers = await prisma.voucher.findMany({ where: { main_account_id: acc.id } });
      mainVouchers.forEach(v => {
        if (v.direction === 'receipt') balance += v.amount;
        if (v.direction === 'payment') balance -= v.amount;
      });

      // Vouchers where this is party account
      const partyVouchers = await prisma.voucher.findMany({ where: { party_account_id: acc.id } });
      partyVouchers.forEach(v => {
        if (v.direction === 'receipt') balance -= v.amount;
        if (v.direction === 'payment') balance += v.amount;
      });

      // Sale Payments
      const salePayments = await prisma.salePayment.aggregate({
        where: { payment_account_id: acc.id },
        _sum: { amount: true }
      });
      balance += salePayments._sum.amount || 0;

      // Purchase Payments
      const purchasePayments = await prisma.paymentVoucher.aggregate({
        where: { paidFromAccountId: acc.id },
        _sum: { amount: true }
      });
      balance -= purchasePayments._sum.amount || 0;

      // Journal Vouchers
      const jvLines = await prisma.journalVoucherLine.findMany({
        where: { account_id: acc.id }
      });
      jvLines.forEach(line => {
        balance += line.debit;
        balance -= line.credit;
      });

      liquidCash += balance;
    }
    
    return { 
      success: true, 
      data: { monthlyRevenue, totalReceivables, totalPayables, liquidCash } 
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch metrics' };
  }
}

export async function getLowStockAlerts(): Promise<ActionResult<any[]>> {
  try {
    const stockRes = await getStockReport();
    if (!stockRes.success) throw new Error(stockRes.error);
    
    const lowStock = stockRes.data.filter((item: any) => item.current_stock < 5);
    lowStock.sort((a: any, b: any) => a.current_stock - b.current_stock);
    
    return { success: true, data: lowStock.slice(0, 5) };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch low stock alerts' };
  }
}

export async function getRecentActivity(): Promise<ActionResult<any[]>> {
  try {

    
    const sales = await prisma.sale.findMany({ take: 10, orderBy: { created_at: 'desc' } });
    const purchases = await prisma.purchase.findMany({ take: 10, orderBy: { created_at: 'desc' } });
    const vouchers = await prisma.voucher.findMany({ take: 10, orderBy: { created_at: 'desc' } });
    
    const combined = [
      ...sales.map(s => ({
        source_type: 'Sale',
        source_id: s.id,
        txn_date: s.sale_date,
        description: `Sale ${s.invoice_no}`,
        amount: s.net_total,
        created_at: s.created_at
      })),
      ...purchases.map(p => ({
        source_type: 'Purchase',
        source_id: p.id,
        txn_date: p.purchase_date,
        description: `Purchase ${p.invoice_no}`,
        amount: p.amount,
        created_at: p.created_at
      })),
      ...vouchers.map(v => ({
        source_type: 'Voucher',
        source_id: v.id,
        txn_date: v.voucher_date,
        description: `Voucher ${v.voucher_no} - ${v.voucher_type}`,
        amount: v.amount,
        created_at: v.created_at
      }))
    ];
    
    combined.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    
    return { success: true, data: combined.slice(0, 5) };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch recent activity' };
  }
}

export async function getSalesTrend(): Promise<ActionResult<any[]>> {
  try {

    
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - (13 * 24 * 60 * 60 * 1000));
    const startDate = getLocalISODate(fourteenDaysAgo);
    
    const data = await prisma.sale.findMany({
      where: { sale_date: { gte: startDate } },
      select: { sale_date: true, net_total: true },
      orderBy: { sale_date: 'asc' }
    });
    
    const trendMap = new Map<string, number>();
    
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      trendMap.set(getLocalISODate(d), 0);
    }
    
    data.forEach(s => {
      const current = trendMap.get(s.sale_date) || 0;
      trendMap.set(s.sale_date, current + s.net_total);
    });
    
    const trendList = Array.from(trendMap.entries()).map(([dateStr, revenue]) => {
      const [y, m, d] = dateStr.split('-');
      const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
      const displayDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return { date: dateStr, displayDate, revenue };
    });
    
    return { success: true, data: trendList };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch sales trend' };
  }
}
