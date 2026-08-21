// Server Component — fetches business settings server-side
// and boots the interactive SettingsModule client layout.

import { getSettings } from '@/app/settings/actions';
import SettingsModule from '@/components/settings/SettingsModule';
import type { BusinessSettings } from '@/types/database';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings — AIwithKashan',
  description: 'Manage business identity, profile, and system settings.',
};

export default async function SettingsPage() {
  const result = await getSettings();
  const settings: BusinessSettings = result.success 
    ? result.data 
    : {
        id: '',
        business_name: 'AIwithKashan',
        logo_url: null,
        owner_name: 'Ahmad Khan',
        phone: '091-5270101',
        email: 'info@marwatechenergy.com',
        address: 'Main Peshawar Road, Serai Naurang, KP',
        region: 'Serai Naurang',
        ntn_or_tax_id: 'NTN-8729101-4',
        currency: 'PKR',
        receipt_footer_note: 'Thank you for choosing AIwithKashan! Powering a green tomorrow.',
        books_start_date: null,
        updated_at: ''
      };

  return <SettingsModule initialSettings={settings} />;
}
