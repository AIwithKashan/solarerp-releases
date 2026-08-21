'use server';

import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/db';
import type { ActionResult } from '@/types/database';

export interface BackupConfig {
  clientId: string;
  clientSecret: string;
  refreshToken?: string;
  accessToken?: string;
  tokenExpiry?: number;
  connected?: boolean;
  email?: string;
}

function getPaths(): { dbDir: string; dbPath: string; configPath: string } {
  const dbUrl = process.env.DATABASE_URL;
  let dbPath = '';
  if (!dbUrl) {
    dbPath = path.resolve(process.cwd(), 'server', 'prisma', 'dev.db');
  } else if (dbUrl.startsWith('file:')) {
    dbPath = path.resolve(dbUrl.slice(5));
  } else {
    dbPath = path.resolve(dbUrl);
  }
  const dbDir = path.dirname(dbPath);
  const configPath = path.join(dbDir, 'backup-config.json');
  return { dbDir, dbPath, configPath };
}

export async function getBackupConfig(): Promise<ActionResult<BackupConfig | null>> {
  try {
    const { configPath } = getPaths();
    if (!fs.existsSync(configPath)) {
      return { success: true, data: null };
    }
    const raw = fs.readFileSync(configPath, 'utf8');
    const data = JSON.parse(raw);
    return { success: true, data };
  } catch (err) {
    console.error('[getBackupConfig]', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to read backup config' };
  }
}

const MASTER_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '1047648392019-solarerp.apps.googleusercontent.com';
const MASTER_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'GOCSPX-solarerp-master-secret';

export async function getGoogleAuthUrl(customClientId?: string, customClientSecret?: string): Promise<ActionResult<string>> {
  try {
    const finalClientId = (customClientId && customClientId.trim()) ? customClientId.trim() : MASTER_CLIENT_ID;
    const finalClientSecret = (customClientSecret && customClientSecret.trim()) ? customClientSecret.trim() : MASTER_CLIENT_SECRET;

    if (!finalClientId || !finalClientSecret) {
      throw new Error('Google OAuth Credentials are required.');
    }

    const { dbDir, configPath } = getPaths();
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    let existing: Partial<BackupConfig> = {};
    if (fs.existsSync(configPath)) {
      try { existing = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch (e) {}
    }

    // Save initial configuration before starting OAuth flow
    const config: BackupConfig = {
      ...existing,
      clientId: finalClientId,
      clientSecret: finalClientSecret,
      connected: false
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');

    const redirectUri = encodeURIComponent('http://localhost:3000/api/auth/google/callback');
    const scope = encodeURIComponent('https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email');
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${config.clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;

    return { success: true, data: authUrl };
  } catch (err) {
    console.error('[getGoogleAuthUrl]', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to generate auth URL' };
  }
}

export async function disconnectGoogleDrive(): Promise<ActionResult<null>> {
  try {
    const { configPath } = getPaths();
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
    return { success: true, data: null };
  } catch (err) {
    console.error('[disconnectGoogleDrive]', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to disconnect Google Drive' };
  }
}

async function getValidAccessToken(config: BackupConfig, configPath: string): Promise<string> {
  if (!config.refreshToken) {
    throw new Error('Google Drive account is not connected. Please connect first.');
  }

  // Token is still valid (with a 5-minute buffer)
  if (config.accessToken && config.tokenExpiry && Date.now() < config.tokenExpiry - 300000) {
    return config.accessToken;
  }

  // Refresh the token
  console.log('[Google Drive] Refreshing access token...');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(`Failed to refresh Google token: ${data.error_description || data.error}`);
  }

  config.accessToken = data.access_token;
  config.tokenExpiry = Date.now() + (data.expires_in * 1000);

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  return data.access_token;
}

export async function backupToCloud(): Promise<ActionResult<string>> {
  try {
    const { configPath, dbPath } = getPaths();
    if (!fs.existsSync(configPath)) {
      throw new Error('Google Drive backup settings are not configured.');
    }

    const config: BackupConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const accessToken = await getValidAccessToken(config, configPath);

    if (!fs.existsSync(dbPath)) {
      throw new Error('Local database file not found.');
    }
    const dbBuffer = fs.readFileSync(dbPath);

    const fileName = 'solar_erp_backup.db';

    // 1. Search for existing file
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and trashed=false&fields=files(id)`;
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!searchRes.ok) {
      throw new Error(`Google Drive search failed: ${searchRes.statusText}`);
    }
    const searchData = await searchRes.json();
    const files = searchData.files || [];

    let fileId = '';
    if (files.length > 0) {
      fileId = files[0].id;
    } else {
      // 2. Create metadata if not exists
      console.log('[Google Drive] Creating new file metadata...');
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: fileName,
          mimeType: 'application/x-sqlite3',
        }),
      });
      if (!createRes.ok) {
        throw new Error(`Failed to create file on Google Drive: ${createRes.statusText}`);
      }
      const createData = await createRes.json();
      fileId = createData.id;
    }

    // 3. Upload content via media upload
    console.log(`[Google Drive] Uploading database content to file ${fileId}...`);
    const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
    const uploadRes = await fetch(uploadUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-sqlite3',
      },
      body: dbBuffer,
    });

    if (!uploadRes.ok) {
      throw new Error(`Upload failed: ${uploadRes.statusText}`);
    }

    return { success: true, data: 'Database backed up to Google Drive successfully.' };
  } catch (err) {
    console.error('[Google Drive Backup Error]', err);
    return { success: false, error: err instanceof Error ? err.message : 'Backup failed.' };
  }
}

export async function restoreFromCloud(): Promise<ActionResult<string>> {
  try {
    const { configPath, dbPath } = getPaths();
    if (!fs.existsSync(configPath)) {
      throw new Error('Google Drive backup settings are not configured.');
    }

    const config: BackupConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const accessToken = await getValidAccessToken(config, configPath);

    const fileName = 'solar_erp_backup.db';

    // 1. Search for existing file
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and trashed=false&fields=files(id)`;
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!searchRes.ok) {
      throw new Error(`Google Drive search failed: ${searchRes.statusText}`);
    }
    const searchData = await searchRes.json();
    const files = searchData.files || [];

    if (files.length === 0) {
      throw new Error('No backup file named "solar_erp_backup.db" was found on your Google Drive. Make sure you have uploaded first.');
    }

    const fileId = files[0].id;

    // 2. Download alt=media content
    console.log(`[Google Drive] Downloading database file ${fileId}...`);
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const downloadRes = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!downloadRes.ok) {
      throw new Error(`Failed to download backup content: ${downloadRes.statusText}`);
    }

    const arrayBuffer = await downloadRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Disconnect prisma client to release database file lock
    await prisma.$disconnect();

    // Overwrite database file
    fs.writeFileSync(dbPath, buffer);

    return { success: true, data: 'Database restored from Google Drive successfully. Reloading data...' };
  } catch (err) {
    console.error('[Google Drive Restore Error]', err);
    return { success: false, error: err instanceof Error ? err.message : 'Restore failed.' };
  }
}
