import { getProfitReport } from '@/app/reports/actions';
import ProfitModule from '@/components/reports/ProfitModule';
import type { Metadata } from 'next';

function getLocalISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}


export const metadata: Metadata = {
  title: 'Profit & Loss Report — AIwithKashan',
  description: 'View gross profit, expenses, and net profit.',
};

export default async function ProfitPage() {
  const now = new Date();
  const firstDay = getLocalISODate(new Date(now.getFullYear(), now.getMonth(), 1));
  const lastDay = getLocalISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  
  const result = await getProfitReport(firstDay, lastDay);
  
  return <ProfitModule initialData={result.success ? result.data : null} defaultFrom={firstDay} defaultTo={lastDay} />;
}
