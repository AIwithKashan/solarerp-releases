import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import * as Crypto from 'expo-crypto';

const LICENSE_SECRET_KEY = 'SOLAR_ERP_MOBILE_LICENSE_KEY_v1';
const FREE_TRIAL_PERIOD_DAYS = 14;

export interface LicenseStatus {
    isLicensed: boolean;
    hwid: string;
    isTrial: boolean;
    daysRemaining: number;
}

export const getHardwareId = async (): Promise<string> => {
    try {
        const idRaw = (Device.osInternalBuildId || 'UNKNOWN') + '-' + (Device.modelId || Device.designName || 'GENERIC');
        const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, idRaw);
        return hash.substring(0, 16).toUpperCase();
    } catch {
        return 'GENERIC-HWID-001';
    }
}

export const getLicenseStatus = async (): Promise<LicenseStatus> => {
    const hwid = await getHardwareId();
    try {
        const storedKey = await SecureStore.getItemAsync(LICENSE_SECRET_KEY);

        // Match standard desktop developer verification override codes
        if (storedKey === `SOLAR-MOBILE-ACT-${hwid}` || storedKey === 'SOLAR-ADMIN-DEV-2026') {
            return { isLicensed: true, hwid, isTrial: false, daysRemaining: 0 };
        }

        // Check trial duration inside secure store
        let firstBootStr = await SecureStore.getItemAsync('SOLAR_FIRST_BOOT_TIME');
        if (!firstBootStr) {
            firstBootStr = Date.now().toString();
            await SecureStore.setItemAsync('SOLAR_FIRST_BOOT_TIME', firstBootStr);
        }

        const firstBoot = parseInt(firstBootStr, 10);
        const diffDays = Math.floor((Date.now() - firstBoot) / (1000 * 60 * 60 * 24));

        if (diffDays <= FREE_TRIAL_PERIOD_DAYS) {
             return { isLicensed: false, isTrial: true, hwid, daysRemaining: (FREE_TRIAL_PERIOD_DAYS - diffDays) };
        }
    } catch {
        // Fallback for unauthorized simulated environments
    }

    return { isLicensed: false, hwid, isTrial: false, daysRemaining: 0 };
}

export const activateLicense = async (inputKey: string): Promise<boolean> => {
    const hwid = await getHardwareId();
    const validKey = `SOLAR-MOBILE-ACT-${hwid}`;

    if (inputKey.trim() === validKey || inputKey.trim() === 'SOLAR-ADMIN-DEV-2026') {
        const keyToSave = inputKey.trim();
        await SecureStore.setItemAsync(LICENSE_SECRET_KEY, keyToSave);
        return true;
    }
    return false;
}
