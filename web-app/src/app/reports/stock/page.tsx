import { getStockReport } from '@/app/reports/actions';
import StockModule from '@/components/reports/StockModule';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Stock Report — AIwithKashan',
  description: 'View current inventory valuation and stock levels.',
};

export default async function StockPage() {
  const result = await getStockReport();
  
  return <StockModule initialData={result.success ? result.data : []} />;
}
