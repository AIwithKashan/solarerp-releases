import ChartOfAccountsModule from '@/components/reports/ChartOfAccountsModule';
import type { Metadata } from 'next';

function getLocalISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const metadata: Metadata = {
  title: 'Chart of Accounts Statement — AIwithKashan',
  description: 'View consolidated Chart of Accounts and net worth (Maliat).',
};

export default function ChartOfAccountsPage() {
  const today = getLocalISODate(new Date());
  
  return <ChartOfAccountsModule defaultDate={today} />;
}
