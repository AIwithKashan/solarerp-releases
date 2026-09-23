import { getExpensesReport } from '@/app/reports/actions';
import ExpensesModule from '@/components/reports/ExpensesModule';
import type { Metadata } from 'next';

function getLocalISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}


export const metadata: Metadata = {
  title: 'Expenses Report — AIwithKashan',
  description: 'View all business and operational expenses.',
};

export default async function ExpensesPage() {
  const now = new Date();
  const firstDay = getLocalISODate(new Date(now.getFullYear(), now.getMonth(), 1));
  const lastDay = getLocalISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  
  const result = await getExpensesReport(firstDay, lastDay);
  
  return <ExpensesModule initialData={result.success ? result.data : []} defaultFrom={firstDay} defaultTo={lastDay} />;
}
