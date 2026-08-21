import { getSalesReport } from '@/app/reports/actions';
import SaleModule from '@/components/reports/SaleModule';
import type { Metadata } from 'next';

function getLocalISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}


export const metadata: Metadata = {
  title: 'Sales Report — AIwithKashan',
  description: 'Comprehensive sales report including discounts and net totals.',
};

export default async function SalesPage() {
  const now = new Date();
  const firstDay = getLocalISODate(new Date(now.getFullYear(), now.getMonth(), 1));
  const lastDay = getLocalISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  
  const result = await getSalesReport(firstDay, lastDay);
  
  return <SaleModule initialData={result.success ? result.data : []} defaultFrom={firstDay} defaultTo={lastDay} />;
}
