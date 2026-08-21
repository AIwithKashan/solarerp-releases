import ReportsLanding from '@/components/reports/ReportsLanding';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reports Dashboard — AIwithKashan',
  description: 'Comprehensive financial, sales, and inventory reports for AIwithKashan.',
};

export default function ReportsPage() {
  return <ReportsLanding />;
}
