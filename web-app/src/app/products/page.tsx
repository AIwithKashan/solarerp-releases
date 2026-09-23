// Server Component — fetches products server-side at render time
// and forwards the initial list to the interactive ProductsModule.

import { getProducts } from '@/app/products/actions';
import { getSettings } from '@/app/settings/actions';
import ProductsModule from '@/components/products/ProductsModule';
import type { Product, BusinessSettings } from '@/types/database';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Products — AIwithKashan',
  description: 'Manage your product inventory: panels, inverters, cables, and more.',
};

export default async function ProductsPage() {
  const result = await getProducts();
  const initialProducts: Product[] = result.success ? result.data : [];

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

  return <ProductsModule initialProducts={initialProducts} settings={settings} />;
}
