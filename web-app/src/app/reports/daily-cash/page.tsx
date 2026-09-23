import DailyCashModule from '@/components/reports/DailyCashModule';
import type { Metadata } from 'next';

function getLocalISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const metadata: Metadata = {
  title: 'Daily Cash Report — AIwithKashan',
  description: 'View daily cash transactions and reconcile physical cash denominations.',
};

export default function DailyCashPage() {
  const today = getLocalISODate(new Date());
  
  return <DailyCashModule defaultDate={today} />;
}
