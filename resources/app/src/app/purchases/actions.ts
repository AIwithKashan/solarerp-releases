'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';

import type { Purchase, PurchaseInsert, PurchaseUpdate, ActionResult, Account } from '@/types/database';

const PURCHASES_PATH = '/purchases';

function extractMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const errorObj = err as { message?: string, code?: string };
    if (errorObj.code === '23503' || (errorObj.message && errorObj.message.includes('Foreign key constraint failed'))) {
      return 'Deletion blocked: This record is actively used in other transactions.';
    }
    if (errorObj.message) return String(errorObj.message);
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

function calculateAmount(unit: string, qty: number, rate: number, power: number | null | undefined): number {
  const normalizedUnit = unit.toLowerCase();
  const isWattBased = ['watt', 'kw'].includes(normalizedUnit);
  
  if (isWattBased) {
    const pVal = Number(power) || 0;
    if (normalizedUnit === 'kw') {
      return (pVal / 1000) * rate * qty;
    }
    return pVal * rate * qty;
  }
  return rate * qty;
}

export async function getSuppliers(): Promise<ActionResult<Account[]>> {
  try {
    const data = await prisma.account.findMany({
      where: { account_type: 'Suppliers' },
      orderBy: { account_title: 'asc' }
    });
    return { success: true, data: data as any };
  } catch (err) {
    const message = extractMessage(err, 'Failed to fetch suppliers');
    console.error('[getSuppliers]', message, err);
    return { success: false, error: message };
  }
}

export async function getPaymentAccounts(): Promise<ActionResult<Account[]>> {
  try {
    const data = await prisma.account.findMany({
      where: { 
        account_type: { in: ['Cash Account', 'Bank Account'] } 
      },
      orderBy: { account_title: 'asc' }
    });
    return { success: true, data: data as any };
  } catch (err) {
    return { success: false, error: extractMessage(err, 'Failed to fetch payment accounts') };
  }
}

export async function getPurchases(): Promise<ActionResult<Purchase[]>> {
  try {
    const data = await prisma.purchase.findMany({
      orderBy: { created_at: 'desc' }
    });
    return { success: true, data: data as any };
  } catch (err) {
    const message = extractMessage(err, 'Failed to fetch purchases');
    console.error('[getPurchases]', message, err);
    return { success: false, error: message };
  }
}

export async function getPurchaseById(id: string): Promise<ActionResult<Purchase>> {
  try {
    const data = await prisma.purchase.findFirst({
      where: { id }
    });
    if (!data) return { success: false, error: 'Purchase not found' };
    return { success: true, data: data as any };
  } catch (err) {
    const message = extractMessage(err, 'Failed to fetch purchase');
    return { success: false, error: message };
  }
}

export async function createPurchase(payload: PurchaseInsert): Promise<ActionResult<Purchase>> {
  try {

    if (!payload.item_name?.trim()) throw new Error('Item name is required.');
    if (!payload.accounting_unit?.trim()) throw new Error('Accounting unit is required.');
    if (!payload.supplier_id) throw new Error('Supplier is required.');

    const qty = Number(payload.quantity);
    const rate = Number(payload.rate);
    
    if (isNaN(qty) || qty <= 0) throw new Error('Quantity must be a positive number.');
    if (isNaN(rate) || rate < 0) throw new Error('Rate must be a non-negative number.');

    const supplierAcc = await prisma.account.findUnique({
      where: { id: payload.supplier_id }
    });

    if (!supplierAcc) throw new Error('Selected supplier does not exist.');
    if (supplierAcc.account_type !== 'Suppliers') throw new Error('Selected account is not registered as a supplier.');

    const isWattBased = ['watt', 'kw'].includes(payload.accounting_unit.toLowerCase());
    let finalPower: number | null = null;
    
    if (isWattBased) {
      finalPower = Number(payload.power_watt);
      if (isNaN(finalPower) || finalPower <= 0) {
        throw new Error('Power (Watt) is required and must be a positive number for watt-based units.');
      }
    } else {
      finalPower = payload.power_watt ? Number(payload.power_watt) : null;
    }

    const purchaseDate = payload.purchase_date ? payload.purchase_date.trim() : new Date().toISOString().split('T')[0];
    const amount = calculateAmount(payload.accounting_unit, qty, rate, finalPower);

    // Generate Invoice No based on existing count
    const count = await prisma.purchase.count();
    const invoice_no = payload.invoice_no || `PR-${1000 + count + 1}`;

    const data = await prisma.purchase.create({
      data: {
        item_name: payload.item_name.trim(),
        accounting_unit: payload.accounting_unit.trim(),
        quantity: qty,
        rate: rate,
        power_watt: finalPower,
        amount: amount,
        paidAmount: 0,
        remainingAmount: amount,
        paymentStatus: 'unpaid',
        supplier_id: payload.supplier_id,
        supplier_name: supplierAcc.account_title,
        purchase_date: purchaseDate,
        remarks: payload.remarks?.trim() || null,
        invoice_no: invoice_no
      }
    });

    revalidatePath(PURCHASES_PATH);
    return { success: true, data: data as any };
  } catch (err) {
    const message = extractMessage(err, 'Failed to create purchase');
    console.error('[createPurchase]', message, err);
    return { success: false, error: message };
  }
}

export async function updatePurchase(payload: PurchaseUpdate): Promise<ActionResult<Purchase>> {
  try {

    if (!payload.id) throw new Error('Purchase ID is required for update.');

    const { id, ...fields } = payload;
    const updateFields: any = {};
    
    if (fields.item_name) updateFields.item_name = fields.item_name.trim();
    if (fields.purchase_date) updateFields.purchase_date = fields.purchase_date.trim();
    if (fields.remarks !== undefined) updateFields.remarks = fields.remarks?.trim() || null;
    
    let supplierAcc;
    if (fields.supplier_id) {
      supplierAcc = await prisma.account.findUnique({
        where: { id: fields.supplier_id }
      });
      if (!supplierAcc) throw new Error('Selected supplier does not exist.');
      if (supplierAcc.account_type !== 'Suppliers') throw new Error('Selected account is not registered as a supplier.');
      updateFields.supplier_id = fields.supplier_id;
      updateFields.supplier_name = supplierAcc.account_title;
    }

    const currentRecord = await prisma.purchase.findUnique({ where: { id } });
    if (!currentRecord) throw new Error('Purchase record not found.');

    const qty = fields.quantity !== undefined ? Number(fields.quantity) : Number(currentRecord.quantity);
    const rate = fields.rate !== undefined ? Number(fields.rate) : Number(currentRecord.rate);
    const unit = fields.accounting_unit !== undefined ? fields.accounting_unit.trim() : currentRecord.accounting_unit;
    
    if (isNaN(qty) || qty <= 0) throw new Error('Quantity must be a positive number.');
    if (isNaN(rate) || rate < 0) throw new Error('Rate must be a non-negative number.');

    const isWattBased = ['watt', 'kw'].includes(unit.toLowerCase());
    let finalPower = currentRecord.power_watt;
    
    if (fields.power_watt !== undefined) {
      if (isWattBased) {
        finalPower = Number(fields.power_watt);
        if (isNaN(finalPower) || finalPower <= 0) throw new Error('Power is required for watt-based units.');
      } else {
        finalPower = fields.power_watt ? Number(fields.power_watt) : null;
      }
    } else if (isWattBased && (!finalPower || finalPower <= 0)) {
      throw new Error('Power is required for watt-based units.');
    }

    updateFields.quantity = qty;
    updateFields.rate = rate;
    updateFields.accounting_unit = unit;
    updateFields.power_watt = finalPower;
    updateFields.amount = calculateAmount(unit, qty, rate, finalPower);
    const newRemaining = updateFields.amount - (currentRecord.paidAmount || 0);
    updateFields.remainingAmount = newRemaining;
    updateFields.paymentStatus = newRemaining <= 0 ? 'paid' : ((currentRecord.paidAmount || 0) > 0 ? 'partial' : 'unpaid');

    const data = await prisma.purchase.update({
      where: { id },
      data: updateFields
    });

    revalidatePath(PURCHASES_PATH);
    return { success: true, data: data as any };
  } catch (err) {
    const message = extractMessage(err, 'Failed to update purchase');
    console.error('[updatePurchase]', message, err);
    return { success: false, error: message };
  }
}

export async function deletePurchase(id: string): Promise<ActionResult<void>> {
  try {

    if (!id) throw new Error('Purchase ID is required for deletion.');

    await prisma.purchase.delete({
      where: { id }
    });

    revalidatePath(PURCHASES_PATH);
    return { success: true, data: undefined };
  } catch (err) {
    const message = extractMessage(err, 'Failed to delete purchase');
    console.error('[deletePurchase]', message, err);
    return { success: false, error: message };
  }
}
