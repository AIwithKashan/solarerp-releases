'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Trash2, Calendar, Hash, Banknote, ShieldAlert } from 'lucide-react';
import { getPurchasePayments, deletePaymentVoucher } from '@/app/purchases/paymentActions';

export default function PaymentHistoryModal({
  open,
  onClose,
  purchaseId,
  invoiceNo,
  onUpdate
}: {
  open: boolean;
  onClose: () => void;
  purchaseId: string;
  invoiceNo: string;
  onUpdate: () => void;
}) {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (open && purchaseId) {
      loadPayments();
    }
  }, [open, purchaseId]);

  const loadPayments = async () => {
    setLoading(true);
    setError(null);
    const res = await getPurchasePayments(purchaseId);
    if (res.success) {
      setPayments(res.data);
    } else {
      setError(res.error || 'Failed to load payment history');
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to reverse this payment? This will restore the purchase balance and update accounts.')) {
      return;
    }
    setDeletingId(id);
    const res = await deletePaymentVoucher(id);
    if (res.success) {
      await loadPayments();
      onUpdate();
    } else {
      alert(res.error || 'Failed to reverse payment');
    }
    setDeletingId(null);
  };

  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '700px' }}>
        <div className="modal-header">
          <h2 className="modal-title">
            <Banknote size={20} style={{ marginRight: '8px' }} />
            Payment History — {invoiceNo}
          </h2>
          <button className="btn-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body" style={{ padding: '20px' }}>
          {error && <div className="error-banner mb-4">{error}</div>}
          
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <Loader2 size={24} className="spin" style={{ margin: '0 auto', color: 'var(--c-text-subtle)' }} />
              <div style={{ marginTop: '8px', color: 'var(--c-text-muted)' }}>Loading history...</div>
            </div>
          ) : payments.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--c-text-subtle)', background: 'var(--c-bg-alt)', borderRadius: 'var(--radius-md)' }}>
              No payments recorded for this invoice yet.
            </div>
          ) : (
            <div className="table-scroll" style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--c-border)', borderRadius: 'var(--radius-md)' }}>
              <table className="data-table">
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--c-bg-card)' }}>
                  <tr>
                    <th>Date</th>
                    <th>Voucher No</th>
                    <th>Mode</th>
                    <th>Account</th>
                    <th style={{ textAlign: 'right' }}>Amount Paid</th>
                    <th style={{ width: '60px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={13} style={{ color: 'var(--c-text-muted)' }} />
                          {p.date}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--c-text)' }}>
                        {p.voucherNo}
                      </td>
                      <td>
                        <span style={{ textTransform: 'capitalize', fontSize: '0.8rem', padding: '2px 6px', background: 'var(--c-bg-input)', borderRadius: '4px' }}>
                          {p.paymentMode.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ color: 'var(--c-text-muted)' }}>
                        {p.paidFromAccountName}
                        {p.reference && <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Ref: {p.reference}</div>}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--c-success)' }}>
                        {new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(p.allocatedAmount)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          className="btn-icon" 
                          style={{ color: 'var(--c-danger)' }}
                          onClick={() => handleDelete(p.id)}
                          disabled={deletingId === p.id}
                          title="Reverse Payment"
                        >
                          {deletingId === p.id ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid var(--c-border)', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', background: 'var(--c-bg-alt)' }}>
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
