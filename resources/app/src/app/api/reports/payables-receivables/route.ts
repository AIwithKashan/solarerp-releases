import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const asOfDate = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // 1. Fetch Business Settings
    const settings = await prisma.businessSettings.findFirst({});
    const businessName = settings?.business_name || 'SolarERP Business';

    // 2. Fetch Accounts (exclude purely cash/bank or nominal accounts like capital/assets unless they have party dues)
    const accounts = await prisma.account.findMany({
      orderBy: { account_title: 'asc' }
    });

    // 3. Fetch Transactions up to asOfDate
    const sales = await prisma.sale.findMany({
      where: { sale_date: { lte: asOfDate } }
    });

    const salePayments = await prisma.salePayment.findMany({
      where: { pay_date: { lte: asOfDate } },
      include: { sale: true }
    });

    const purchases = await prisma.purchase.findMany({
      where: { purchase_date: { lte: asOfDate } }
    });

    const paymentVouchers = await prisma.paymentVoucher.findMany({
      where: { date: { lte: asOfDate } }
    });

    const vouchers = await prisma.voucher.findMany({
      where: { voucher_date: { lte: asOfDate } }
    });

    const jvLines = await prisma.journalVoucherLine.findMany({
      where: { voucher: { voucher_date: { lte: asOfDate } } },
      include: { voucher: true }
    });

    // 4. Build per-party transaction aggregates
    interface PartyAggregate {
      id: string;
      title: string;
      type: string;
      phone: string;
      region: string;
      openingBalance: number;
      totalDebits: number;
      totalCredits: number;
      totalBilled: number;   // Total sales or purchases amount
      totalSettled: number;  // Total paid or received
      unpaidInvoicesCount: number;
      unpaidInvoicesTotal: number;
      lastDate: string | null;
    }

    const partyMap = new Map<string, PartyAggregate>();

    accounts.forEach(acc => {
      const opening = acc.balance || 0;
      partyMap.set(acc.id, {
        id: acc.id,
        title: acc.account_title,
        type: acc.account_type,
        phone: acc.contact_number || '',
        region: acc.region || '',
        openingBalance: opening,
        totalDebits: opening > 0 ? opening : 0,
        totalCredits: opening < 0 ? Math.abs(opening) : 0,
        totalBilled: 0,
        totalSettled: 0,
        unpaidInvoicesCount: 0,
        unpaidInvoicesTotal: 0,
        lastDate: null
      });
    });

    // Helper to update last date
    const trackDate = (p: PartyAggregate, dt: string | null | undefined) => {
      if (!dt) return;
      if (!p.lastDate || dt > p.lastDate) {
        p.lastDate = dt;
      }
    };

    // Sales (Debit customer, increase billed)
    sales.forEach(s => {
      if (s.customer_id && partyMap.has(s.customer_id)) {
        const p = partyMap.get(s.customer_id)!;
        p.totalDebits += s.net_total;
        p.totalBilled += s.net_total;
        if (s.remaining_balance > 0) {
          p.unpaidInvoicesCount += 1;
          p.unpaidInvoicesTotal += s.remaining_balance;
        }
        trackDate(p, s.sale_date);
      }
    });

    // Sale Payments (Credit customer, increase settled)
    salePayments.forEach(sp => {
      const custId = sp.sale?.customer_id;
      if (custId && partyMap.has(custId)) {
        const p = partyMap.get(custId)!;
        p.totalCredits += sp.amount;
        p.totalSettled += sp.amount;
        trackDate(p, sp.pay_date);
      }
    });

    // Purchases (Credit supplier, increase billed)
    purchases.forEach(pr => {
      if (pr.supplier_id && partyMap.has(pr.supplier_id)) {
        const p = partyMap.get(pr.supplier_id)!;
        p.totalCredits += pr.amount;
        p.totalBilled += pr.amount;
        if (pr.remainingAmount > 0) {
          p.unpaidInvoicesCount += 1;
          p.unpaidInvoicesTotal += pr.remainingAmount;
        }
        trackDate(p, pr.purchase_date);
      }
    });

    // Purchase Payment Vouchers (Debit supplier, increase settled)
    paymentVouchers.forEach(pv => {
      if (pv.supplierId && partyMap.has(pv.supplierId)) {
        const p = partyMap.get(pv.supplierId)!;
        p.totalDebits += pv.amount;
        p.totalSettled += pv.amount;
        trackDate(p, pv.date);
      }
    });

    // Vouchers (Direct receipts and payments)
    vouchers.forEach(v => {
      // Party account
      if (v.party_account_id && partyMap.has(v.party_account_id)) {
        const p = partyMap.get(v.party_account_id)!;
        if (v.direction === 'payment') {
          p.totalDebits += v.amount;
          p.totalSettled += v.amount;
        } else {
          p.totalCredits += v.amount;
          p.totalSettled += v.amount;
        }
        trackDate(p, v.voucher_date);
      }

      // If main account was a party account (rare, but supported)
      if (partyMap.has(v.main_account_id)) {
        const p = partyMap.get(v.main_account_id)!;
        if (v.direction === 'receipt') {
          p.totalDebits += v.amount;
        } else {
          p.totalCredits += v.amount;
        }
        trackDate(p, v.voucher_date);
      }
    });

    // Journal Vouchers
    jvLines.forEach(line => {
      if (partyMap.has(line.account_id)) {
        const p = partyMap.get(line.account_id)!;
        p.totalDebits += line.debit;
        p.totalCredits += line.credit;
        trackDate(p, line.voucher.voucher_date);
      }
    });

    // 5. Separate into Receivables and Payables
    const receivables: any[] = [];
    const payables: any[] = [];

    // Relevant account types for party balances:
    const partyTypes = new Set(['Customers', 'Suppliers', 'Staff', 'Customer', 'Supplier', 'Employee']);

    partyMap.forEach(p => {
      // Exclude pure Cash Account or Bank Account
      if (p.type === 'Cash Account' || p.type === 'Bank Account') return;

      const balance = p.totalDebits - p.totalCredits;

      // Only include accounts that either belong to party types or have transaction activity / non-zero balance
      const isParty = partyTypes.has(p.type) || p.totalBilled > 0 || p.unpaidInvoicesCount > 0;
      if (!isParty && balance === 0) return;

      if (balance > 0.01) {
        // RECEIVABLE (They owe us money)
        receivables.push({
          accountId: p.id,
          accountTitle: p.title,
          accountType: p.type,
          phone: p.phone,
          region: p.region,
          openingBalance: p.openingBalance,
          totalBilled: p.totalBilled,
          totalReceived: p.totalSettled,
          amountDue: balance,
          unpaidInvoicesCount: p.unpaidInvoicesCount,
          unpaidInvoicesTotal: p.unpaidInvoicesTotal,
          lastDate: p.lastDate
        });
      } else if (balance < -0.01) {
        // PAYABLE (We owe them money)
        const amountToPay = Math.abs(balance);
        payables.push({
          accountId: p.id,
          accountTitle: p.title,
          accountType: p.type,
          phone: p.phone,
          region: p.region,
          openingBalance: p.openingBalance,
          totalPurchased: p.totalBilled,
          totalPaid: p.totalSettled,
          amountToPay,
          unpaidInvoicesCount: p.unpaidInvoicesCount,
          unpaidInvoicesTotal: p.unpaidInvoicesTotal,
          lastDate: p.lastDate
        });
      } else if (p.unpaidInvoicesCount > 0) {
        // Invoices still open on record even if offset by something
        if (p.type === 'Customers' && p.unpaidInvoicesTotal > 0) {
          receivables.push({
            accountId: p.id,
            accountTitle: p.title,
            accountType: p.type,
            phone: p.phone,
            region: p.region,
            openingBalance: p.openingBalance,
            totalBilled: p.totalBilled,
            totalReceived: p.totalSettled,
            amountDue: p.unpaidInvoicesTotal,
            unpaidInvoicesCount: p.unpaidInvoicesCount,
            unpaidInvoicesTotal: p.unpaidInvoicesTotal,
            lastDate: p.lastDate
          });
        } else if (p.type === 'Suppliers' && p.unpaidInvoicesTotal > 0) {
          payables.push({
            accountId: p.id,
            accountTitle: p.title,
            accountType: p.type,
            phone: p.phone,
            region: p.region,
            openingBalance: p.openingBalance,
            totalPurchased: p.totalBilled,
            totalPaid: p.totalSettled,
            amountToPay: p.unpaidInvoicesTotal,
            unpaidInvoicesCount: p.unpaidInvoicesCount,
            unpaidInvoicesTotal: p.unpaidInvoicesTotal,
            lastDate: p.lastDate
          });
        }
      }
    });

    // Sort descending by highest amount
    receivables.sort((a, b) => b.amountDue - a.amountDue);
    payables.sort((a, b) => b.amountToPay - a.amountToPay);

    const totalReceivables = receivables.reduce((sum, r) => sum + r.amountDue, 0);
    const totalPayables = payables.reduce((sum, p) => sum + p.amountToPay, 0);
    const netPosition = totalReceivables - totalPayables;

    return NextResponse.json({
      success: true,
      data: {
        businessName,
        asOfDate,
        summary: {
          totalReceivables,
          totalPayables,
          netPosition,
          receivablesCount: receivables.length,
          payablesCount: payables.length
        },
        receivables,
        payables
      }
    });

  } catch (err: any) {
    console.error('Payables/Receivables Report Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
