import ProfitLossModule from '@/components/reports/ProfitLossModule';
import type { Metadata } from 'next';

function getFirstDayOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const metadata: Metadata = {
  title: 'Profit & Loss Statement — AIwithKashan',
  description: 'View item-wise trading margins, other income, operating expenses, and net profit.',
};

export default function ProfitLossPage() {
  return <ProfitLossModule defaultFrom={getFirstDayOfMonth()} defaultTo={getToday()} />;
}
