import os from 'os';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const SECRET_SALT = 'AIwithKashan_SolarERP_Secret_2026';
export const TRIAL_DURATION_MS = 2 * 24 * 60 * 60 * 1000; // 2 Days Default Trial

export const DURATION_MAP: Record<string, number> = {
  '1M': 1 * 60 * 1000,                  // 1 Minute
  '1H': 60 * 60 * 1000,                 // 1 Hour
  '1D': 24 * 60 * 60 * 1000,            // 1 Day
  '7D': 7 * 24 * 60 * 60 * 1000,        // 7 Days
  '30D': 30 * 24 * 60 * 60 * 1000,      // 30 Days (1 Month)
  '180D': 180 * 24 * 60 * 60 * 1000,    // 180 Days (6 Months)
  '365D': 365 * 24 * 60 * 60 * 1000,    // 365 Days (1 Year)
  'LIFE': 0                             // Lifetime
};

function getLicenseFilePath(): string {
  const dataDir = process.env.DATABASE_DIR || path.join(os.homedir(), 'SolarERP_Data');
  if (!fs.existsSync(dataDir)) {
    try { fs.mkdirSync(dataDir, { recursive: true }); } catch (e) {}
  }
  return path.join(dataDir, 'license_config.json');
}

function getRegistryVal(valName: string): string | null {
  if (process.platform !== 'win32') return null;
  try {
    const stdout = execSync(`reg query "HKCU\\Software\\SolarERP" /v ${valName}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    const match = stdout.match(new RegExp(`${valName}\\s+REG_SZ\\s+(.*)`));
    if (match && match[1]) return match[1].trim();
  } catch (e) {}
  return null;
}

function setRegistryVal(valName: string, value: string) {
  if (process.platform !== 'win32') return;
  try {
    execSync(`reg add "HKCU\\Software\\SolarERP" /v ${valName} /t REG_SZ /d "${value}" /f`, { stdio: 'ignore' });
  } catch (e) {}
}

export function getHWID(): string {
  const raw = `${os.hostname()}-${os.arch()}-${os.cpus()[0]?.model || 'CPU'}-${os.totalmem()}`;
  const hash = crypto.createHash('sha256').update(raw).digest('hex').toUpperCase();
  return `HWID-${hash.substring(0, 4)}-${hash.substring(4, 8)}-${hash.substring(8, 12)}`;
}

export function generateValidKey(hwid: string, typeCode: string = 'LIFE', customNonce?: string): string {
  const code = typeCode.toUpperCase();
  const nonce = (customNonce || crypto.randomBytes(2).toString('hex')).toUpperCase();
  const message = `${hwid.trim()}_${code}_${nonce}`;
  const hash = crypto.createHmac('sha256', SECRET_SALT).update(message).digest('hex').toUpperCase();
  return `KEY-${code}-${nonce}-${hash.substring(0, 4)}-${hash.substring(4, 8)}`;
}

export function verifyKey(hwid: string, inputKey: string): { valid: boolean; typeCode: string; nonce?: string } {
  const trimmed = inputKey.trim().toUpperCase();
  
  // 1. Single-Use Nonce Key Format (KEY-[TYPE]-[NONCE]-[HASH1]-[HASH2]) e.g. KEY-1D-A892-F3B1-92AC
  const parts = trimmed.split('-');
  if (parts.length >= 5 && parts[0] === 'KEY') {
    const typeCode = parts[1];
    const nonce = parts[2];
    const message = `${hwid.trim()}_${typeCode}_${nonce}`;
    const hash = crypto.createHmac('sha256', SECRET_SALT).update(message).digest('hex').toUpperCase();
    const expected = `KEY-${typeCode}-${nonce}-${hash.substring(0, 4)}-${hash.substring(4, 8)}`;
    if (trimmed === expected) {
      return { valid: true, typeCode, nonce };
    }
  }

  // 2. Legacy / Standard Key Format (KEY-[TYPE]-[HASH1]-[HASH2]-[HASH3])
  if (parts.length >= 4 && parts[0] === 'KEY') {
    const typeCode = parts[1];
    const message = `${hwid.trim()}_${typeCode}`;
    const hash = crypto.createHmac('sha256', SECRET_SALT).update(message).digest('hex').toUpperCase();
    const expected = `KEY-${typeCode}-${hash.substring(0, 4)}-${hash.substring(4, 8)}-${hash.substring(8, 12)}`;
    if (trimmed === expected) {
      return { valid: true, typeCode };
    }
  }

  // 3. Legacy Lifetime Key Format (KEY-XXXX-XXXX-XXXX-XXXX)
  const legacyExpected = crypto.createHmac('sha256', SECRET_SALT).update(hwid.trim()).digest('hex').toUpperCase();
  const legacyFormatted = `KEY-${legacyExpected.substring(0, 4)}-${legacyExpected.substring(4, 8)}-${legacyExpected.substring(8, 12)}-${legacyExpected.substring(12, 16)}`;
  if (trimmed === legacyFormatted) {
    return { valid: true, typeCode: 'LIFE' };
  }

  return { valid: false, typeCode: '' };
}

export interface LicenseStatus {
  hwid: string;
  isActivated: boolean;
  isLifetime: boolean;
  isExpired: boolean;
  licenseType: string;
  trialStartedAt: number;
  remainingSeconds: number;
}

export function getLicenseStatus(): LicenseStatus {
  const hwid = getHWID();
  const filePath = getLicenseFilePath();

  let regTrialStr = getRegistryVal('TrialStartTime');
  let regTrialStart = regTrialStr ? parseInt(regTrialStr, 10) : null;
  let regLicenseKey = getRegistryVal('LicenseKey') || '';

  const now = Date.now();

  if (!regTrialStart) {
    regTrialStart = now;
    setRegistryVal('TrialStartTime', regTrialStart.toString());
  }

  let config: {
    trialStartedAt: number;
    licenseKey: string;
    licenseType: string;
    activatedAt: number;
    expiresAt: number;
    usedKeys?: string[];
  } = {
    trialStartedAt: regTrialStart,
    licenseKey: regLicenseKey,
    licenseType: 'Trial',
    activatedAt: 0,
    expiresAt: 0,
    usedKeys: []
  };

  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (data.trialStartedAt && data.trialStartedAt < config.trialStartedAt) {
        config.trialStartedAt = data.trialStartedAt;
      }
      if (data.licenseKey) config.licenseKey = data.licenseKey;
      if (data.licenseType) config.licenseType = data.licenseType;
      if (data.activatedAt) config.activatedAt = data.activatedAt;
      if (data.expiresAt) config.expiresAt = data.expiresAt;
      if (Array.isArray(data.usedKeys)) config.usedKeys = data.usedKeys;
    } catch (e) {}
  } else {
    try { fs.writeFileSync(filePath, JSON.stringify(config, null, 2)); } catch (e) {}
  }

  const { valid, typeCode } = verifyKey(hwid, config.licenseKey);
  
  if (valid && config.activatedAt > 0) {
    if (typeCode === 'LIFE') {
      return {
        hwid,
        isActivated: true,
        isLifetime: true,
        isExpired: false,
        licenseType: 'Lifetime Unlimited Access',
        trialStartedAt: config.trialStartedAt,
        remainingSeconds: 999999999
      };
    } else {
      const durationMs = DURATION_MAP[typeCode] || 0;
      const expiresAt = config.expiresAt || (config.activatedAt + durationMs);
      const remainingMs = expiresAt - now;
      const isExpired = remainingMs <= 0;

      return {
        hwid,
        isActivated: !isExpired,
        isLifetime: false,
        isExpired,
        licenseType: `${typeCode}`,
        trialStartedAt: config.trialStartedAt,
        remainingSeconds: Math.max(0, Math.floor(remainingMs / 1000))
      };
    }
  }

  const elapsedTrial = now - config.trialStartedAt;
  const remainingTrialMs = TRIAL_DURATION_MS - elapsedTrial;
  const isTrialExpired = remainingTrialMs <= 0;

  return {
    hwid,
    isActivated: false,
    isLifetime: false,
    isExpired: isTrialExpired,
    licenseType: 'Trial',
    trialStartedAt: config.trialStartedAt,
    remainingSeconds: Math.max(0, Math.floor(remainingTrialMs / 1000))
  };
}

export function activateLicense(inputKey: string): { success: boolean; message: string } {
  const hwid = getHWID();
  const trimmed = inputKey.trim().toUpperCase();
  const { valid, typeCode } = verifyKey(hwid, trimmed);

  if (!valid) {
    return { success: false, message: 'Invalid activation key for this computer hardware ID.' };
  }

  const filePath = getLicenseFilePath();
  let config: any = { usedKeys: [] };
  if (fs.existsSync(filePath)) {
    try { config = JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch (e) {}
  }
  if (!Array.isArray(config.usedKeys)) config.usedKeys = [];

  // Check Registry used keys as secondary tamper-proof check
  const regUsedStr = getRegistryVal('UsedKeys') || '';
  const regUsedKeys = regUsedStr.split(',').filter(Boolean);

  // Check if this key has already been activated before
  const isAlreadyUsed = config.usedKeys.includes(trimmed) || regUsedKeys.includes(trimmed);

  if (isAlreadyUsed) {
    return {
      success: false,
      message: 'This activation key has already been used and cannot be re-activated. Please contact support for a new license.'
    };
  }

  const now = Date.now();
  const durationMs = DURATION_MAP[typeCode] || 0;
  const expiresAt = typeCode === 'LIFE' ? 0 : now + durationMs;

  config.licenseKey = trimmed;
  config.licenseType = typeCode;
  config.activatedAt = now;
  config.expiresAt = expiresAt;
  config.usedKeys.push(trimmed);

  try {
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
  } catch (e) {}

  setRegistryVal('LicenseKey', trimmed);
  setRegistryVal('LicenseType', typeCode);

  const updatedRegUsed = Array.from(new Set([...regUsedKeys, trimmed])).join(',');
  setRegistryVal('UsedKeys', updatedRegUsed);

  const typeDesc = typeCode === 'LIFE' ? 'Lifetime Unlimited Access' : `${typeCode} Active License`;
  return { success: true, message: `License (${typeDesc}) activated successfully!` };
}
