'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import type { BusinessSettings, BusinessSettingsUpdate, ActionResult } from '@/types/database';
import fs from 'fs';
import path from 'path';

const SETTINGS_PATH = '/settings';

function extractMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  return fallback;
}

export async function getSettings(): Promise<ActionResult<BusinessSettings>> {
  try {
    let existing = await prisma.businessSettings.findFirst();

    if (existing) {
      return { success: true, data: existing as any };
    }

    const inserted = await prisma.businessSettings.create({
      data: {
        business_name: 'AIwithKashan',
        owner_name: 'Kashan Khan',
        phone: '+92 3341911680',
        email: 'kashanyousaf45000@gmail.com',
        address: 'Main Peshawar Road, Serai Naurang, KP',
        region: 'Serai Naurang',
        ntn_or_tax_id: '',
        currency: 'PKR',
        receipt_footer_note: 'Thank you for choosing AIwithKashan! Powering a green tomorrow.'
      }
    });

    return { success: true, data: inserted as any };
  } catch (err) {
    const message = extractMessage(err, 'Failed to fetch business settings');
    console.error('[getSettings]', message, err);
    return { success: false, error: message };
  }
}

export async function updateSettings(payload: BusinessSettingsUpdate): Promise<ActionResult<BusinessSettings>> {
  try {
    if (!payload.id) throw new Error('Settings ID is required for update.');
    if (!payload.business_name || !payload.business_name.trim()) {
      throw new Error('Business name is required.');
    }

    const businessNameTrimmed = payload.business_name.trim();
    const { id, ...fields } = payload;

    const data = await prisma.businessSettings.update({
      where: { id },
      data: {
        business_name:       businessNameTrimmed,
        owner_name:          fields.owner_name?.trim() || null,
        phone:               fields.phone?.trim() || null,
        email:               fields.email?.trim() || null,
        address:             fields.address?.trim() || null,
        region:              fields.region?.trim() || null,
        ntn_or_tax_id:       fields.ntn_or_tax_id?.trim() || null,
        currency:            fields.currency?.trim() || 'PKR',
        receipt_footer_note: fields.receipt_footer_note?.trim() || null,
      }
    });

    revalidatePath('/', 'layout');
    revalidatePath('/accounts');
    revalidatePath('/products');
    revalidatePath('/settings');
    
    return { success: true, data: data as any };
  } catch (err) {
    const message = extractMessage(err, 'Failed to update business settings');
    console.error('[updateSettings]', message, err);
    return { success: false, error: message };
  }
}

export async function uploadLogo(formData: FormData): Promise<ActionResult<string>> {
  try {
    const file = formData.get('file') as File | null;
    const settingsId = formData.get('settingsId') as string | null;

    if (!file) throw new Error('No file provided.');
    if (!settingsId) throw new Error('Settings ID is required.');

    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      throw new Error('Image size must be smaller than 2MB.');
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Only PNG, JPG, JPEG, SVG, and WEBP formats are allowed.');
    }

    const ext = file.name.split('.').pop() || 'png';
    const filename = `logo-${Date.now()}.${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${filename}`;

    await prisma.businessSettings.update({
      where: { id: settingsId },
      data: { logo_url: publicUrl }
    });

    revalidatePath('/', 'layout');
    revalidatePath('/accounts');
    revalidatePath('/products');
    revalidatePath('/settings');

    return { success: true, data: publicUrl };
  } catch (err) {
    const message = extractMessage(err, 'Logo upload failed');
    console.error('[uploadLogo]', message, err);
    return { success: false, error: message };
  }
}

export interface DatabaseLocationInfo {
  activeDbPath: string;
  activeDbDir: string;
  fileSizeBytes: number;
}

export async function getDatabasePathInfo(): Promise<ActionResult<DatabaseLocationInfo>> {
  try {
    const dbUrl = process.env.DATABASE_URL || '';
    let dbPath = '';
    if (!dbUrl) {
      dbPath = path.resolve(process.cwd(), 'server', 'prisma', 'dev.db');
    } else if (dbUrl.startsWith('file:')) {
      dbPath = path.resolve(dbUrl.slice(5));
    } else {
      dbPath = path.resolve(dbUrl);
    }

    const activeDbDir = path.dirname(dbPath);
    let fileSizeBytes = 0;
    if (fs.existsSync(dbPath)) {
      fileSizeBytes = fs.statSync(dbPath).size;
    }

    return {
      success: true,
      data: {
        activeDbPath: dbPath,
        activeDbDir,
        fileSizeBytes
      }
    };
  } catch (err) {
    return { success: false, error: extractMessage(err, 'Failed to fetch database path info') };
  }
}

export async function switchDatabasePath(newDirPath: string, copyCurrentData: boolean): Promise<ActionResult<string>> {
  try {
    const trimmedDir = newDirPath.trim();
    if (!trimmedDir) {
      return { success: false, error: 'Target directory path cannot be empty.' };
    }

    if (!fs.existsSync(trimmedDir)) {
      fs.mkdirSync(trimmedDir, { recursive: true });
    }

    const currentInfo = await getDatabasePathInfo();
    const currentDir = currentInfo.success && currentInfo.data ? currentInfo.data.activeDbDir : '';
    const currentDbPath = currentInfo.success && currentInfo.data ? currentInfo.data.activeDbPath : '';

    if (copyCurrentData && currentDbPath && fs.existsSync(currentDbPath)) {
      const targetDb = path.join(trimmedDir, 'dev.db');
      fs.copyFileSync(currentDbPath, targetDb);

      const oldLicense = path.join(currentDir, 'license_config.json');
      const targetLicense = path.join(trimmedDir, 'license_config.json');
      if (fs.existsSync(oldLicense)) {
        try { fs.copyFileSync(oldLicense, targetLicense); } catch (e) {}
      }

      const oldBackup = path.join(currentDir, 'backup-config.json');
      const targetBackup = path.join(trimmedDir, 'backup-config.json');
      if (fs.existsSync(oldBackup)) {
        try { fs.copyFileSync(oldBackup, targetBackup); } catch (e) {}
      }
    }

    // Update Windows Registry if on Windows
    if (process.platform === 'win32') {
      try {
        const { execSync } = require('child_process');
        execSync(`reg add "HKCU\\Software\\SolarERP" /v DatabasePath /t REG_SZ /d "${trimmedDir}" /f`, { stdio: 'ignore' });
      } catch (e) {
        console.warn('[Registry update error]:', e);
      }
    }

    revalidatePath('/settings');
    return {
      success: true,
      data: `Database location switched to "${trimmedDir}". Please restart SolarERP for the new database location to take effect.`
    };
  } catch (err) {
    return { success: false, error: extractMessage(err, 'Failed to switch database location') };
  }
}

