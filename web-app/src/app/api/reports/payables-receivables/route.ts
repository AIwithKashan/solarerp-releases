import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from')?.trim() || '';
    const toParam = searchParams.get('to')?.trim() || searchParams.get('date')?.trim() || new Date().toISOString().split('T')[0];
    const isAllTime = searchParams.get('allTime') === 'true' || fromParam === '2000-01-01' || (!fromParam && !searchParams.get('date'));

    // 1. Fetch Business Settings
    const settings = await prisma.businessSettings.findFirst({});
    const businessName = settings?.business_name || 'SolarERP Business';

    // 2. Fetch Accounts
    const accounts = await prisma.account.findMany({
      orderBy: { account_title: 'asc' }
    });

    const titleToAccId = new Map<string, string>();
    accounts.forEach(a => {
      titleToAccId.set(a.account_title.toLowerCase().trim(), a.id);
    });

    // 3. Date Filters
    const salesWhere: any = {};
    const purchasesWhere: any = {};
    const salePaymentsWhere: any = {};
    const paymentVouchersWhere: any = {};
    const vouchersWhere: any = {};
    const jvWhere: any = {};

    if (!isAllTime) {
      if (fromParam) {
        salesWhere.sale_date = { gte: fromParam, lte: toParam };
        purchasesWhere.purchase_date = { gte: fromParam, lte: toParam };
        salePaymentsWhere.pay_date = { gte: fromParam, lte: toParam };
        paymentVouchersWhere.date = { gte: fromParam, lte: toParam };
        vouchersWhere.voucher_date = { gte: fromParam, lte: toParam };
        jvWhere.voucher = { voucher_date: { gte: fromParam, lte: toParam } };
      } else {
        salesWhere.sale_date = { lte: toParam };
        purchasesWhere.purchase_date = { lte: toParam };
        salePaymentsWhere.pay_date = { lte: toParam };
        paymentVouchersWhere.date = { lte: toParam };
        vouchersWhere.voucher_date = { lte: toParam };
        jvWhere.voucher = { voucher_date: { lte: toParam } };
      }
    }

    const sales = await prisma.sale.findMany({
      where: salesWhere
    });

    const salePayments = await prisma.salePayment.findMany({
      where: salePaymentsWhere,
      include: { sale: true }
    });

    const purchases = await prisma.purchase.findMany({
      where: purchasesWhere
    });

    const paymentVouchers = await prisma.paymentVoucher.findMany({
      where: paymentVouchersWhere
    });

    const vouchers = await prisma.voucher.findMany({
      where: vouchersWhere
    });

    const jvLines = await prisma.journalVoucherLine.findMany({
      where: jvWhere,
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
      isDirectAccount: boolean;
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
        lastDate: null,
        isDirectAccount: true
      });
    });

    // Helper to update last date
    const trackDate = (p: PartyAggregate, dt: string | null | undefined) => {
      if (!dt) return;
      if (!p.lastDate || dt > p.lastDate) {
        p.lastDate = dt;
      }
    };

    // Process Sales (Debit customer, increase billed)
    sales.forEach(s => {
      let partyId = s.customer_id;
      if (!partyId && s.customer_name?.trim()) {
        partyId = titleToAccId.get(s.customer_name.toLowerCase().trim()) || null;
      }

      if (partyId && partyMap.has(partyId)) {
        const p = partyMap.get(partyId)!;
        p.totalDebits += s.net_total;
        p.totalBilled += s.net_total;
        if (s.remaining_balance > 0) {
          p.unpaidInvoicesCount += 1;
          p.unpaidInvoicesTotal += s.remaining_balance;
        }
        trackDate(p, s.sale_date);
      } else if (s.customer_name?.trim()) {
        const key = `cust_${s.customer_name.trim().toLowerCase()}`;
        if (!partyMap.has(key)) {
          partyMap.set(key, {
            id: key,
            title: s.customer_name.trim(),
            type: 'Customers',
            phone: s.customer_phone || '',
            region: s.customer_area || 'Walk-in',
            openingBalance: 0,
            totalDebits: s.net_total,
            totalCredits: s.total_received,
            totalBilled: s.net_total,
            totalSettled: s.total_received,
            unpaidInvoicesCount: s.remaining_balance > 0 ? 1 : 0,
            unpaidInvoicesTotal: s.remaining_balance,
            lastDate: s.sale_date,
            isDirectAccount: false
          });
        } else {
          const p = partyMap.get(key)!;
          p.totalDebits += s.net_total;
          p.totalCredits += s.total_received;
          p.totalBilled += s.net_total;
          p.totalSettled += s.total_received;
          if (s.remaining_balance > 0) {
            p.unpaidInvoicesCount += 1;
            p.unpaidInvoicesTotal += s.remaining_balance;
          }
          trackDate(p, s.sale_date);
        }
      }
    });

    // Process Sale Payments (Credit customer, increase settled)
    salePayments.forEach(sp => {
      let custId = sp.sale?.customer_id;
      if (!custId && sp.sale?.customer_name?.trim()) {
        custId = titleToAccId.get(sp.sale.customer_name.toLowerCase().trim()) || null;
      }

      if (custId && partyMap.has(custId)) {
        const p = partyMap.get(custId)!;
        p.totalCredits += sp.amount;
        p.totalSettled += sp.amount;
        trackDate(p, sp.pay_date);
      }
    });

    // Process Purchases (Credit supplier, increase billed)
    purchases.forEach(pr => {
      let suppId = pr.supplier_id;
      if (!suppId && pr.supplier_name?.trim()) {
        suppId = titleToAccId.get(pr.supplier_name.toLowerCase().trim()) || null;
      }

      if (suppId && partyMap.has(suppId)) {
        const p = partyMap.get(suppId)!;
        p.totalCredits += pr.amount;
        p.totalBilled += pr.amount;
        if (pr.remainingAmount > 0) {
          p.unpaidInvoicesCount += 1;
          p.unpaidInvoicesTotal += pr.remainingAmount;
        }
        trackDate(p, pr.purchase_date);
      } else if (pr.supplier_name?.trim()) {
        const key = `supp_${pr.supplier_name.trim().toLowerCase()}`;
        if (!partyMap.has(key)) {
          partyMap.set(key, {
            id: key,
            title: pr.supplier_name.trim(),
            type: 'Suppliers',
            phone: '',
            region: '',
            openingBalance: 0,
            totalDebits: pr.paidAmount || 0,
            totalCredits: pr.amount,
            totalBilled: pr.amount,
            totalSettled: pr.paidAmount || 0,
            unpaidInvoicesCount: pr.remainingAmount > 0 ? 1 : 0,
            unpaidInvoicesTotal: pr.remainingAmount,
            lastDate: pr.purchase_date,
            isDirectAccount: false
          });
        }
      }
    });

    // Process Purchase Payment Vouchers (Debit supplier, increase settled)
    paymentVouchers.forEach(pv => {
      let suppId: string | null = pv.supplierId;
      if (!suppId && pv.supplierName?.trim()) {
        suppId = titleToAccId.get(pv.supplierName.toLowerCase().trim()) || null;
      }

      if (suppId && partyMap.has(suppId)) {
        const p = partyMap.get(suppId)!;
        p.totalDebits += pv.amount;
        p.totalSettled += pv.amount;
        trackDate(p, pv.date);
      }
    });

    // Process Vouchers (Direct receipts and payments)
    vouchers.forEach(v => {
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

    // Process Journal Vouchers
    jvLines.forEach(line => {
      if (partyMap.has(line.account_id)) {
        const p = partyMap.get(line.account_id)!;
        p.totalDebits += line.debit;
        p.totalCredits += line.credit;
        trackDate(p, line.voucher?.voucher_date);
      }
    });

    // 5. Separate into Receivables and Payables
    const receivables: any[] = [];
    const payables: any[] = [];

    const partyTypes = new Set(['Customers', 'Suppliers', 'Staff', 'Customer', 'Supplier', 'Employee']);

    partyMap.forEach(p => {
      if (p.type === 'Cash Account' || p.type === 'Bank Account') return;

      const balance = p.totalDebits - p.totalCredits;

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
          lastDate: p.lastDate,
          hasAccount: p.isDirectAccount
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
          lastDate: p.lastDate,
          hasAccount: p.isDirectAccount
        });
      } else if (p.unpaidInvoicesCount > 0) {
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
            lastDate: p.lastDate,
            hasAccount: p.isDirectAccount
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
            lastDate: p.lastDate,
            hasAccount: p.isDirectAccount
          });
        }
      }
    });

    receivables.sort((a, b) => b.amountDue - a.amountDue);
    payables.sort((a, b) => b.amountToPay - a.amountToPay);

    const totalReceivables = receivables.reduce((sum, r) => sum + r.amountDue, 0);
    const totalPayables = payables.reduce((sum, p) => sum + p.amountToPay, 0);
    const netPosition = totalReceivables - totalPayables;

    return NextResponse.json({
      success: true,
      data: {
        businessName,
        from: fromParam || null,
        to: toParam,
        isAllTime,
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
