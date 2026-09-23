'use client';

import { Printer, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PrintButtons() {
  const router = useRouter();

  return (
    <div className="no-print" style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
      <button onClick={() => router.back()} className="btn-ghost" style={{ border: '1px solid #e2e8f0', background: '#fff' }}>
        <ArrowLeft size={16} /> Back
      </button>
      <button onClick={() => window.print()} className="btn-primary">
        <Printer size={16} /> Print Voucher
      </button>
    </div>
  );
}
