'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';

import type { Product, ProductInsert, ProductUpdate, ActionResult } from '@/types/database';

const PRODUCTS_PATH = '/products';

function extractMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const errorObj = err as { message?: string, code?: string };
    if (errorObj.code === '23503' || (errorObj.message && errorObj.message.includes('Foreign key constraint failed'))) {
      return 'Deletion blocked: This record is actively used in other transactions.';
    }
    if (errorObj.code === 'P2002') {
      return 'A record with this name already exists.';
    }
    if (errorObj.message) return String(errorObj.message);
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export async function getProducts(): Promise<ActionResult<Product[]>> {
  try {
    const data = await prisma.product.findMany({
      orderBy: { created_at: 'desc' }
    });
    return { success: true, data: data as any };
  } catch (err) {
    const message = extractMessage(err, 'Failed to fetch products');
    console.error('[getProducts]', message, err);
    return { success: false, error: message };
  }
}

export async function createProduct(payload: ProductInsert): Promise<ActionResult<Product>> {
  try {

    if (!payload.item_name?.trim()) throw new Error('Item name is required.');
    if (!payload.category) throw new Error('Category is required.');

    const unit = payload.accounting_unit?.trim() || 'N/O';

    const data = await prisma.product.create({
      data: {
        item_name: payload.item_name.trim(),
        accounting_unit: unit,
        category: payload.category,
        remarks: payload.remarks?.trim() || null,
      }
    });

    revalidatePath(PRODUCTS_PATH);
    return { success: true, data: data as any };
  } catch (err) {
    const message = extractMessage(err, 'Failed to create product');
    console.error('[createProduct]', message, err);
    return { success: false, error: message };
  }
}

export async function updateProduct(payload: ProductUpdate): Promise<ActionResult<Product>> {
  try {

    if (!payload.id) throw new Error('Product ID is required for update.');

    const { id, ...fields } = payload;
    const updateFields: any = {};
    if (fields.item_name) updateFields.item_name = fields.item_name.trim();
    if ('accounting_unit' in fields) updateFields.accounting_unit = fields.accounting_unit?.trim() || 'N/O';
    if (fields.category) updateFields.category = fields.category;
    if ('remarks' in fields) updateFields.remarks = fields.remarks?.trim() || null;

    const data = await prisma.product.update({
      where: { id },
      data: updateFields
    });

    revalidatePath(PRODUCTS_PATH);
    return { success: true, data: data as any };
  } catch (err) {
    const message = extractMessage(err, 'Failed to update product');
    console.error('[updateProduct]', message, err);
    return { success: false, error: message };
  }
}

export async function deleteProduct(id: string): Promise<ActionResult<void>> {
  try {

    if (!id) throw new Error('Product ID is required for deletion.');

    await prisma.product.delete({
      where: { id }
    });

    revalidatePath(PRODUCTS_PATH);
    return { success: true, data: undefined };
  } catch (err) {
    const message = extractMessage(err, 'Failed to delete product');
    console.error('[deleteProduct]', message, err);
    return { success: false, error: message };
  }
}
