// Server Component — preloads sales, customers, bank accounts, settings,
// and stock availability server-side at render time.

import { getSales, getCustomers, getBankAccounts, getAvailableStock, getPurchaseBiltis } from '@/app/sales/actions';
import { getSettings } from '@/app/settings/actions';
import SalesModule from '@/components/sales/SalesModule';
import type { Sale, BusinessSettings, Account } from '@/types/database';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sales — AIwithKashan',
  description: 'Manage sales transactions, invoice customers, track receipts, other credits, and verify stock levels.',
};

export default async function SalesPage() {
  const [
    salesResult,
    customersResult,
    bankAccountsResult,
    stockResult,
    settingsResult,
    biltisResult
  ] = await Promise.all([
    getSales(),
    getCustomers(),
    getBankAccounts(),
    getAvailableStock(),
    getSettings(),
    getPurchaseBiltis()
  ]);

  const initialSales: Sale[] = salesResult.success ? salesResult.data : [];
  const initialCustomers: Account[] = customersResult.success ? customersResult.data : [];
  const initialBankAccounts: Account[] = bankAccountsResult.success ? bankAccountsResult.data : [];
  const initialStock = stockResult.success ? stockResult.data : [];
  const initialBiltis: string[] = biltisResult.success ? biltisResult.data : [];

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
    <SalesModule
      initialSales={initialSales}
      initialCustomers={initialCustomers}
      initialBankAccounts={initialBankAccounts}
      initialStock={initialStock || []}
      initialBiltis={initialBiltis}
      settings={settings}
    />
  );
}
