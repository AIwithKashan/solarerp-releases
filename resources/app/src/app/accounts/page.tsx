// Server Component — fetches accounts at render time (no client-side fetch)
// and streams the pre-loaded data into the interactive AccountsModule.

import { getAccounts } from '@/app/accounts/actions';
import { getSettings } from '@/app/settings/actions';
import AccountsModule from '@/components/accounts/AccountsModule';
import type { Account, BusinessSettings } from '@/types/database';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Accounts — AIwithKashan',
  description: 'Manage your Chart of Accounts: cash, bank, suppliers, customers, staff, and more.',
};

export default async function AccountsPage() {
  // Fetch on the server — zero loading spinners for the initial render
  const result = await getAccounts();
  const initialAccounts: Account[] = result.success ? result.data : [];

  const settingsResult = await getSettings();
  const settings: BusinessSettings = settingsResult.success ? settingsResult.data : {
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

  return <AccountsModule initialAccounts={initialAccounts} settings={settings} />;
}
