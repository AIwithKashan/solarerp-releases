'use server';

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { spawn } from 'child_process';
import type { ActionResult } from '@/types/database';

const CURRENT_APP_VERSION = '2.0.2';

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseDate: string;
  changelog: string[];
  downloadUrl?: string;
  isUpToDate: boolean;
}

export async function checkForAppUpdates(): Promise<ActionResult<UpdateInfo>> {
  try {
    // Check remote version manifest with timeout
    const remoteManifestUrl = 'https://raw.githubusercontent.com/aiwithkashan/solarerp-releases/main/version.json';
    
    let remoteData: any = null;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(remoteManifestUrl, {
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache' }
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        remoteData = await res.json();
      }
    } catch (e) {
      // Remote check timed out or offline
    }

    const latestVersion = remoteData?.version || CURRENT_APP_VERSION;
    const hasUpdate = compareVersions(latestVersion, CURRENT_APP_VERSION) > 0;
    const changelog = remoteData?.changelog || [
      'Fixed Cash & Bank Available Balance calculation in Vouchers and Purchases.',
      'Upgraded License system to enforce single-use one-time activation keys.',
      'Added Custom Database Storage Location selection during installation.',
      'Added In-App Database Location Switcher and Migration in Settings.'
    ];

    return {
      success: true,
      data: {
        hasUpdate,
        currentVersion: CURRENT_APP_VERSION,
        latestVersion,
        releaseDate: remoteData?.releaseDate || new Date().toISOString().split('T')[0],
        changelog,
        downloadUrl: remoteData?.downloadUrl || '',
        isUpToDate: !hasUpdate
      }
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to check for updates'
    };
  }
}

function compareVersions(v1: string, v2: string): number {
  const cleanV1 = v1.replace(/^v/, '').split('.').map(Number);
  const cleanV2 = v2.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < Math.max(cleanV1.length, cleanV2.length); i++) {
    const num1 = cleanV1[i] || 0;
    const num2 = cleanV2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

export async function downloadAndRunUpdate(downloadUrl?: string): Promise<ActionResult<string>> {
  try {
    if (!downloadUrl) {
      return {
        success: false,
        error: 'No update package URL specified.'
      };
    }

    const tempDir = process.env.TEMP || process.env.TMP || 'C:\\Windows\\Temp';
    const installerPath = path.join(tempDir, `SolarERP_Update_${Date.now()}.exe`);

    await downloadFile(downloadUrl, installerPath);

    // Launch installer detached and exit current process
    if (process.platform === 'win32') {
      const child = spawn(installerPath, ['/SILENT'], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    }

    return {
      success: true,
      data: 'Update downloaded! Installer is launching to apply the update.'
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to download update'
    };
  }
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const client = url.startsWith('https') ? https : http;
    client.get(url, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        // Follow redirect
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`Download failed with status ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve());
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}
