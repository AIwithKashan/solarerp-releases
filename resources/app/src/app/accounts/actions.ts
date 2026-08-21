'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';

import type { Account, AccountInsert, AccountUpdate, ActionResult } from '@/types/database';

const ACCOUNTS_PATH = '/accounts';

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

export async function getAccounts(): Promise<ActionResult<Account[]>> {
  try {
    const data = await prisma.account.findMany({
      orderBy: { created_at: 'desc' }
    });
    return { success: true, data: data as any };
  } catch (err) {
    const message = extractMessage(err, 'Failed to fetch accounts');
    console.error('[getAccounts]', message, err);
    return { success: false, error: message };
  }
}

export async function createAccount(payload: AccountInsert): Promise<ActionResult<Account>> {
  try {

    if (!payload.account_type) throw new Error('Account type is required.');
    if (!payload.account_title?.trim()) throw new Error('Account title is required.');
    if (!payload.region?.trim()) throw new Error('Region is required.');

    const titleNorm = payload.account_title.trim();
    const contactNorm = payload.contact_number?.trim() || '';

    // Check existing
    const existing = await prisma.account.findFirst({
      where: {
        account_type: payload.account_type,
        account_title: titleNorm,
        contact_number: contactNorm || null
      }
    });

    if (existing) {
      return { success: false, error: `An account with this name and contact already exists under ${payload.account_type}.` };
    }

    const data = await prisma.account.create({
      data: {
        account_type: payload.account_type,
        account_title: titleNorm,
        region: payload.region.trim(),
        contact_number: contactNorm || null,
      }
    });

    revalidatePath(ACCOUNTS_PATH);
    return { success: true, data: data as any };
  } catch (err) {
    const message = extractMessage(err, 'Failed to create account');
    console.error('[createAccount]', message, err);
    return { success: false, error: message };
  }
}

export async function updateAccount(payload: AccountUpdate): Promise<ActionResult<Account>> {
  try {

    if (!payload.id) throw new Error('Account id is required for update.');

    const { id, ...fields } = payload;
    const updateFields: any = {};
    if (fields.account_type) updateFields.account_type = fields.account_type;
    if (fields.account_title) updateFields.account_title = fields.account_title.trim();
    if (fields.region) updateFields.region = fields.region.trim();
    if ('contact_number' in fields) {
      updateFields.contact_number = fields.contact_number?.trim() || null;
    }

    const currentRecord = await prisma.account.findUnique({ where: { id } });
    if (!currentRecord) throw new Error('Account not found');

    const finalType = fields.account_type || currentRecord.account_type;
    const finalTitle = fields.account_title ? fields.account_title.trim() : currentRecord.account_title;
    const finalContact = 'contact_number' in fields ? (fields.contact_number?.trim() || null) : currentRecord.contact_number;

    const existing = await prisma.account.findFirst({
      where: {
        id: { not: id },
        account_type: finalType,
        account_title: finalTitle,
        contact_number: finalContact
      }
    });

    if (existing) {
      return { success: false, error: `An account with this name and contact already exists under ${finalType}.` };
    }

    const data = await prisma.account.update({
      where: { id },
      data: updateFields
    });

    revalidatePath(ACCOUNTS_PATH);
    return { success: true, data: data as any };
  } catch (err) {
    const message = extractMessage(err, 'Failed to update account');
    console.error('[updateAccount]', message, err);
    return { success: false, error: message };
  }
}

export async function deleteAccount(id: string): Promise<ActionResult<void>> {
  try {

    if (!id) throw new Error('Account id is required for deletion.');

    await prisma.account.delete({
      where: { id }
    });

    revalidatePath(ACCOUNTS_PATH);
    return { success: true, data: undefined };
  } catch (err) {
    const message = extractMessage(err, 'Failed to delete account');
    console.error('[deleteAccount]', message, err);
    return { success: false, error: message };
  }
}
