import BankBalanceModule from '@/components/reports/BankBalanceModule';

export default function BankBalanceReportPage() {
  const today = new Date().toISOString().split('T')[0];
  return <BankBalanceModule defaultDate={today} />;
}
