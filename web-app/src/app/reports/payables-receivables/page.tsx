import PayablesReceivablesModule from '@/components/reports/PayablesReceivablesModule';

export default function PayablesReceivablesPage() {
  const today = new Date().toISOString().split('T')[0];
  return <PayablesReceivablesModule defaultDate={today} />;
}
