'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';

import type {
  Sale, SaleInsert, SaleUpdate, SaleItem, SaleItemInsert,
  SalePayment, SalePaymentInsert, SaleOtherCredit, SaleOtherCreditInsert,
  SaleWithRelations, ActionResult, Account
} from '@/types/database';

const SALES_PATH = '/sales';

function extractMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  return fallback;
}

export async function getCustomers(): Promise<ActionResult<Account[]>> {
  try {
    const data = await prisma.account.findMany({
      where: { account_type: 'Customers' },
      orderBy: { account_title: 'asc' }
    });

    const unpaidSales = await prisma.sale.groupBy({
      by: ['customer_id'],
      where: { remaining_balance: { gt: 0 }, customer_id: { not: null } },
      _sum: { remaining_balance: true }
    });

    const duesMap: Record<string, number> = {};
    for (const u of unpaidSales) {
      if (u.customer_id) duesMap[u.customer_id] = u._sum.remaining_balance || 0;
    }

    const enriched = data.map(cust => {
      const opening = cust.balance || 0;
      const salesDue = duesMap[cust.id] || 0;
      const totalDue = opening + salesDue;
      return {
        ...cust,
        balance: totalDue,
        total_due: totalDue
      };
    });

    return { success: true, data: enriched as any };
  } catch (err) {
    return { success: false, error: extractMessage(err, 'Failed to fetch customers') };
  }
}

export async function getBankAccounts(): Promise<ActionResult<Account[]>> {
  try {
    const data = await prisma.account.findMany({
      where: { 
        account_type: { in: ['Bank Account', 'Cash Account'] } 
      },
      orderBy: { account_title: 'asc' }
    });
    return { success: true, data: data as any };
  } catch (err) {
    return { success: false, error: extractMessage(err, 'Failed to fetch bank/cash accounts') };
  }
}

export async function getAvailableStock(): Promise<ActionResult<Array<{
  item_name: string;
  power_watt: number | null;
  bilti_no: string | null;
  purchased: number;
  sold: number;
  available: number;
}>>> {
  try {
    const purchases = await prisma.purchase.findMany({
      select: { item_name: true, power_watt: true, bilti_no: true, quantity: true }
    });
    
    const saleItems = await prisma.saleItem.findMany({
      select: { item_name: true, power_watt: true, bilti_no: true, quantity: true }
    });

    const stockMap: Record<string, any> = {};
    
    purchases.forEach(p => {
      const name = p.item_name;
      const watt = p.power_watt ? Number(p.power_watt) : null;
      const bilti = p.bilti_no ? p.bilti_no.trim() : null;
      const key = `${name.toLowerCase().trim()}::${watt ?? 'none'}::${bilti ?? 'none'}`;
      if (!stockMap[key]) {
        stockMap[key] = { item_name: name, power_watt: watt, bilti_no: bilti, purchased: 0, sold: 0 };
      }
      stockMap[key].purchased += Number(p.quantity) || 0;
    });
    
    saleItems.forEach(s => {
      const name = s.item_name;
      const watt = s.power_watt ? Number(s.power_watt) : null;
      const bilti = s.bilti_no ? s.bilti_no.trim() : null;
      const key = `${name.toLowerCase().trim()}::${watt ?? 'none'}::${bilti ?? 'none'}`;
      if (!stockMap[key]) {
        stockMap[key] = { item_name: name, power_watt: watt, bilti_no: bilti, purchased: 0, sold: 0 };
      }
      stockMap[key].sold += Number(s.quantity) || 0;
    });

    const list = Object.values(stockMap).map(s => ({
      item_name: s.item_name,
      power_watt: s.power_watt,
      bilti_no: s.bilti_no,
      purchased: s.purchased,
      sold: s.sold,
      available: s.purchased - s.sold
    }));
    
    return { success: true, data: list };
  } catch (err) {
    return { success: false, error: extractMessage(err, 'Failed to calculate available stock') };
  }
}

export async function getSales(): Promise<ActionResult<Sale[]>> {
  try {
    // Dynamic self-healing recalculation for all sales
    const allSales = await prisma.sale.findMany({
      include: {
        sale_items: true,
        sale_payments: true,
        voucher_allocations: true,
        sale_other_credits: true
      }
    });

    for (const s of allSales) {
      const itemsSubtotal = (s.sale_items || []).reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
      const creditsTotal = (s.sale_other_credits || []).reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
      const discAmt = Number(s.discount_amount) || 0;
      const calculatedNet = Math.max(0, itemsSubtotal + creditsTotal - discAmt);
      const paymentsSum = (s.sale_payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const vouchersSum = (s.voucher_allocations || []).reduce((sum: number, v: any) => sum + (Number(v.allocatedAmount) || 0), 0);
      const trueReceived = paymentsSum + vouchersSum;
      const trueRemaining = Math.max(0, calculatedNet - trueReceived);
      const trueStatus = trueRemaining <= 0.01 ? 'paid' : (trueReceived > 0 ? 'partial' : 'unpaid');

      if (
        Math.abs(s.subtotal - itemsSubtotal) > 0.01 ||
        Math.abs(s.net_total - calculatedNet) > 0.01 ||
        Math.abs(s.total_received - trueReceived) > 0.01 ||
        Math.abs(s.remaining_balance - trueRemaining) > 0.01 ||
        s.status !== trueStatus
      ) {
        s.subtotal = itemsSubtotal;
        s.net_total = calculatedNet;
        s.total_received = trueReceived;
        s.remaining_balance = trueRemaining;
        s.status = trueStatus;

        await prisma.sale.update({
          where: { id: s.id },
          data: {
            subtotal: itemsSubtotal,
            net_total: calculatedNet,
            total_received: trueReceived,
            remaining_balance: trueRemaining,
            status: trueStatus
          }
        });
      }
    }

    const data = await prisma.sale.findMany({
      orderBy: { created_at: 'desc' }
    });
    return { success: true, data: data as any };
  } catch (err) {
    return { success: false, error: extractMessage(err, 'Failed to fetch sales') };
  }
}

export async function getSaleById(id: string): Promise<ActionResult<SaleWithRelations>> {
  try {
    if (!id) throw new Error('Sale ID is required.');
    
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        sale_items: true,
        sale_payments: true,
        sale_other_credits: true,
        voucher_allocations: {
          include: { voucher: true }
        }
      }
    });

    if (!sale) throw new Error('Sale not found');

    return { success: true, data: sale as any };
  } catch (err) {
    return { success: false, error: extractMessage(err, 'Failed to fetch sale details') };
  }
}

export async function createSale(
  header: Omit<SaleInsert, 'subtotal' | 'net_total' | 'total_received' | 'remaining_balance'>,
  items: SaleItemInsert[],
  payments: SalePaymentInsert[],
  otherCredits: SaleOtherCreditInsert[]
): Promise<ActionResult<Sale>> {
  try {

    if (!header.customer_name?.trim()) throw new Error('Customer name is required.');
    if (items.length === 0 && otherCredits.length === 0) {
      throw new Error('A sale must have at least one item or credit.');
    }

    const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const creditsTotal = otherCredits.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const grossSubtotal = subtotal + creditsTotal;
    const discountAmount = Number(header.discount_amount) || 0;
    const discountPercent = Number(header.discount_percent) || (grossSubtotal > 0 ? (discountAmount / grossSubtotal) * 100 : 0);
    const netTotal = Math.max(0, subtotal - discountAmount + creditsTotal);
    const received = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const remaining = netTotal - received;
    const status = remaining <= 0.01 ? 'paid' : (received > 0 ? 'partial' : 'unpaid');

    const count = await prisma.sale.count();
    const invoice_no = header.invoice_no || `SL-${1000 + count + 1}`;

    const newSale = await prisma.sale.create({
      data: {
        invoice_no,
        sale_date: header.sale_date,
        customer_id: header.customer_id || null,
        customer_name: header.customer_name,
        remarks: header.remarks || null,
        subtotal: subtotal,
        discount_percent: discountPercent,
        discount_amount: discountAmount,
        net_total: netTotal,
        total_received: received,
        remaining_balance: remaining,
        status: status,
        sale_items: {
          create: items.map(item => ({
            item_name: item.item_name,
            power_watt: item.power_watt,
            bilti_no: item.bilti_no || null,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.amount,
            accounting_unit: item.accounting_unit || 'Nos',
            remarks: item.remarks || null
          }))
        },
        sale_payments: {
          create: payments.map(p => ({
            payment_account_id: p.payment_account_id || null,
            payment_account_name: p.payment_account_name || 'Cash',
            pay_date: p.pay_date || new Date().toISOString().split('T')[0],
            amount: p.amount,
            remarks: p.remarks || null
          }))
        },
        sale_other_credits: {
          create: otherCredits.map(c => ({
            item_name: c.item_name || 'Credit',
            quantity: c.quantity || 1,
            rate: c.rate || c.amount,
            amount: c.amount
          }))
        }
      }
    });

    revalidatePath(SALES_PATH);
    return { success: true, data: newSale as any };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to create sale' };
  }
}

export async function updateSale(
  id: string,
  header: Sale,
  items: SaleItemInsert[],
  payments: SalePaymentInsert[],
  otherCredits: SaleOtherCreditInsert[]
): Promise<ActionResult<Sale>> {
  try {

    if (!id) throw new Error('Sale ID is required.');
    if (!header.customer_name?.trim()) throw new Error('Customer name is required.');
    
    if (items.length === 0 && otherCredits.length === 0) {
      throw new Error('A sale must have at least one item or credit.');
    }

    const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const creditsTotal = otherCredits.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const grossSubtotal = subtotal + creditsTotal;
    const discountAmount = Number(header.discount_amount) || 0;
    const discountPercent = Number(header.discount_percent) || (grossSubtotal > 0 ? (discountAmount / grossSubtotal) * 100 : 0);
    const netTotal = Math.max(0, subtotal - discountAmount + creditsTotal);
    
    // Fetch any voucher allocations attached to this sale
    const voucherAllocs = await prisma.voucherSaleAllocation.findMany({ where: { sale_id: id } });
    const voucherReceived = voucherAllocs.reduce((sum, a) => sum + (Number(a.allocatedAmount) || 0), 0);

    const directReceived = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const totalReceived = directReceived + voucherReceived;
    const remaining = netTotal - totalReceived;
    const status = remaining <= 0.01 ? 'paid' : (totalReceived > 0 ? 'partial' : 'unpaid');

    // Use transaction to completely replace child records
    const [updatedSale] = await prisma.$transaction([
      prisma.sale.update({
        where: { id },
        data: {
          sale_date: header.sale_date,
          customer_id: header.customer_id || null,
          customer_name: header.customer_name,
          remarks: header.remarks || null,
          subtotal,
          discount_percent: discountPercent,
          discount_amount: discountAmount,
          net_total: netTotal,
          total_received: totalReceived,
          remaining_balance: remaining,
          status: status
        }
      }),
      prisma.saleItem.deleteMany({ where: { sale_id: id } }),
      prisma.salePayment.deleteMany({ where: { sale_id: id } }),
      prisma.saleOtherCredit.deleteMany({ where: { sale_id: id } }),
      prisma.saleItem.createMany({
        data: items.map(item => ({
          sale_id: id,
          item_name: item.item_name,
          power_watt: item.power_watt,
          bilti_no: item.bilti_no || null,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount,
          accounting_unit: item.accounting_unit || 'Nos',
          remarks: item.remarks || null
        }))
      }),
      prisma.salePayment.createMany({
        data: payments.map(p => ({
          sale_id: id,
          payment_account_id: p.payment_account_id || null,
          payment_account_name: p.payment_account_name || 'Cash',
          pay_date: p.pay_date || new Date().toISOString().split('T')[0],
          amount: p.amount,
          remarks: p.remarks || null
        }))
      }),
      prisma.saleOtherCredit.createMany({
        data: otherCredits.map(c => ({
          sale_id: id,
          item_name: c.item_name || 'Credit',
          quantity: c.quantity || 1,
          rate: c.rate || c.amount,
          amount: c.amount
        }))
      })
    ]);

    revalidatePath(SALES_PATH);
    return { success: true, data: updatedSale as any };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update sale' };
  }
}

export async function deleteSale(id: string): Promise<ActionResult<void>> {
  try {
    if (!id) throw new Error('Sale ID is required.');
    
    // Note: cascade delete is supported if relations are set up, otherwise we delete items manually first.
    await prisma.sale.delete({ where: { id } });

    revalidatePath(SALES_PATH);
    return { success: true, data: undefined };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete sale' };
  }
}
