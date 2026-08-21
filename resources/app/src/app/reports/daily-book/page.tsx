import DailyBookModule from '@/components/reports/DailyBookModule';
import type { Metadata } from 'next';

function getLocalISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const metadata: Metadata = {
  title: 'Daily Book Report — AIwithKashan',
  description: 'View daily consolidated report including purchases, sales, cash, and balances.',
};

export default function DailyBookPage() {
  const today = getLocalISODate(new Date());
  
  return <DailyBookModule defaultDate={today} />;
}
