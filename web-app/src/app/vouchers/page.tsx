// Server Component — preloads cash/bank accounts, party accounts, initial vouchers, journal vouchers, and settings.
import { getCashAccounts, getBankAccounts, getPartyAccounts, getVouchers } from '@/app/vouchers/actions';
import { getJournalVouchers } from '@/app/vouchers/journal-actions';
import { getPurchases } from '@/app/purchases/actions';
import { getSettings } from '@/app/settings/actions';
import VouchersModule from '@/components/vouchers/VouchersModule';
import type { Voucher, JournalVoucher, BusinessSettings, Account, Purchase } from '@/types/database';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vouchers — AIwithKashan',
  description: 'Manage cash/bank vouchers and double-entry journal vouchers to settle accounts and log receipts/payments.',
};

export default async function VouchersPage() {
  const [
    cashResult,
    bankResult,
    partyResult,
    vouchersResult,
    journalResult,
    settingsResult,
    purchasesResult
  ] = await Promise.all([
    getCashAccounts(),
    getBankAccounts(),
    getPartyAccounts(),
    getVouchers(),
    getJournalVouchers(),
    getSettings(),
    getPurchases()
  ]);

  const initialCashAccounts: Account[] = cashResult.success ? cashResult.data : [];
  const initialBankAccounts: Account[] = bankResult.success ? bankResult.data : [];
  const initialPartyAccounts: Account[] = partyResult.success ? partyResult.data : [];
  const initialVouchers: Voucher[] = vouchersResult.success ? vouchersResult.data : [];
  const initialJournalVouchers: JournalVoucher[] = journalResult.success ? journalResult.data : [];
  const initialPurchases: Purchase[] = purchasesResult.success ? purchasesResult.data : [];

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

  return (
    <VouchersModule
      initialCashAccounts={initialCashAccounts}
      initialBankAccounts={initialBankAccounts}
      initialPartyAccounts={initialPartyAccounts}
      initialVouchers={initialVouchers}
      initialJournalVouchers={initialJournalVouchers}
      initialPurchases={initialPurchases}
      settings={settings}
    />
  );
}

