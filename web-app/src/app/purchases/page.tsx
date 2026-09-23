// Server Component — fetches purchases, settings, and suppliers server-side
// at render time and forwards them to the interactive PurchasesModule.

import { getPurchases, getSuppliers, getPaymentAccounts } from '@/app/purchases/actions';
import { getSettings } from '@/app/settings/actions';
import { getProducts } from '@/app/products/actions';
import PurchasesModule from '@/components/purchases/PurchasesModule';
import type { Purchase, BusinessSettings, Account, Product } from '@/types/database';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Purchases — AIwithKashan',
  description: 'Manage your purchase entries, track inventory expenses, and auto-calculate totals.',
};

export default async function PurchasesPage() {
  const [result, suppliersResult, settingsResult, productsResult, accountsResult] = await Promise.all([
    getPurchases(),
    getSuppliers(),
    getSettings(),
    getProducts(),
    getPaymentAccounts()
  ]);

  const initialPurchases: Purchase[] = result.success ? result.data : [];
  const initialSuppliers: Account[] = suppliersResult.success ? suppliersResult.data : [];
  const initialProducts: Product[] = productsResult.success ? productsResult.data : [];
  const bankAccounts: Account[] = accountsResult.success ? accountsResult.data : [];

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
    <PurchasesModule 
      initialPurchases={initialPurchases} 
      initialSuppliers={initialSuppliers}
      initialProducts={initialProducts}
      bankAccounts={bankAccounts}
      settings={settings} 
    />
  );
}
