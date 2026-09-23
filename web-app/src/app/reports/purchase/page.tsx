import { getPurchasesReport } from '@/app/reports/actions';
import PurchaseModule from '@/components/reports/PurchaseModule';
import type { Metadata } from 'next';

function getLocalISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}


export const metadata: Metadata = {
  title: 'Purchases Report — AIwithKashan',
  description: 'Detailed purchase history and inventory acquisitions.',
};

export default async function PurchasesPage() {
  const now = new Date();
  const firstDay = getLocalISODate(new Date(now.getFullYear(), now.getMonth(), 1));
  const lastDay = getLocalISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  
  const result = await getPurchasesReport(firstDay, lastDay);
  
  return <PurchaseModule initialData={result.success ? result.data : []} defaultFrom={firstDay} defaultTo={lastDay} />;
}
