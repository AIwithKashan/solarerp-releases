'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Save, Search, Banknote } from 'lucide-react';
import { createPaymentVoucher } from '@/app/purchases/paymentActions';
import type { Purchase, Account } from '@/types/database';

interface PaymentVoucherModalProps {
  open: boolean;
  onClose: () => void;
  purchases: Purchase[];
  suppliers: Account[];
  bankAccounts: Account[];
  onSuccess: () => void;
  preselectedPurchase?: Purchase | null;
}

export default function PaymentVoucherModal({
  open,
  onClose,
  purchases,
  suppliers,
  bankAccounts,
  onSuccess,
  preselectedPurchase
}: PaymentVoucherModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [supplierId, setSupplierId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState('cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  
  // Array of { purchaseId, invoiceNo, remaining, allocated }
  const [allocations, setAllocations] = useState<{ id: string, invoice: string, remaining: number, amount: number, checked: boolean }[]>([]);

  useEffect(() => {
    if (open) {
      if (preselectedPurchase) {
        setSupplierId(preselectedPurchase.supplier_id || '');
        const supplierPurchases = purchases.filter(p => p.supplier_id === preselectedPurchase.supplier_id && p.remainingAmount > 0);
        setAllocations(supplierPurchases.map(p => ({
          id: p.id,
          invoice: p.invoice_no,
          remaining: p.remainingAmount,
          amount: p.id === preselectedPurchase.id ? p.remainingAmount : 0,
          checked: p.id === preselectedPurchase.id
        })));
      } else {
        setSupplierId('');
        setAllocations([]);
      }
      setAccountId(bankAccounts.length > 0 ? bankAccounts[0].id : '');
      setDate(new Date().toISOString().split('T')[0]);
      setPaymentMode('cash');
      setReference('');
      setNotes('');
      setError(null);
    }
  }, [open, preselectedPurchase, purchases, bankAccounts]);

  const handleSupplierChange = (id: string) => {
    setSupplierId(id);
    const supplierPurchases = purchases.filter(p => p.supplier_id === id && p.remainingAmount > 0);
    setAllocations(supplierPurchases.map(p => ({
      id: p.id,
      invoice: p.invoice_no,
      remaining: p.remainingAmount,
      amount: p.remainingAmount,
      checked: false
    })));
  };

  const handleAllocationAmount = (id: string, val: string) => {
    const num = parseFloat(val);
    setAllocations(prev => prev.map(a => {
      if (a.id === id) {
        return { ...a, amount: isNaN(num) ? 0 : Math.min(num, a.remaining), checked: num > 0 };
      }
      return a;
    }));
  };

  const toggleAllocation = (id: string, checked: boolean) => {
    setAllocations(prev => prev.map(a => {
      if (a.id === id) {
        return { ...a, checked, amount: checked ? a.remaining : 0 };
      }
      return a;
    }));
  };

  const totalAllocated = allocations.filter(a => a.checked).reduce((sum, a) => sum + a.amount, 0);

  const handleSubmit = async () => {
    setError(null);
    if (!supplierId) return setError('Please select a supplier');
    if (!accountId) return setError('Please select a payment account');
    
    const finalAllocations = allocations.filter(a => a.checked && a.amount > 0);
    if (finalAllocations.length === 0) return setError('Please allocate payment to at least one invoice');
    
    setLoading(true);
    
    const supplier = suppliers.find(s => s.id === supplierId);
    const account = bankAccounts.find(a => a.id === accountId);

    const res = await createPaymentVoucher({
      supplierId,
      supplierName: supplier?.account_title || 'Unknown',
      paidFromAccountId: accountId,
      paidFromAccountName: account?.account_title || 'Unknown',
      amount: totalAllocated,
      paymentMode,
      date,
      reference,
      notes,
      allocations: finalAllocations.map(a => ({
        purchaseId: a.id,
        allocatedAmount: a.amount
      }))
    });

    if (res.success) {
      onSuccess();
    } else {
      setError(res.error || 'Failed to record payment');
    }
    setLoading(false);
  };

  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '800px', width: '90vw' }}>
        <div className="modal-header">
          <h2 className="modal-title">
            <Banknote size={20} style={{ marginRight: '8px' }} />
            {preselectedPurchase ? 'Payment for ' + preselectedPurchase.invoice_no : 'New Payment Voucher'}
          </h2>
          <button className="btn-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body" style={{ padding: '24px' }}>
          {error && <div className="error-banner mb-6">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="field-group">
              <label className="field-label">Supplier</label>
              <select className="field-input" value={supplierId} onChange={e => handleSupplierChange(e.target.value)} disabled={!!preselectedPurchase}>
                <option value="">Select Supplier...</option>
                {suppliers.map(s => {
                  const supplierPurchases = purchases.filter(p => p.supplier_id === s.id && p.remainingAmount > 0);
                  const totalDue = supplierPurchases.reduce((sum, p) => sum + p.remainingAmount, 0);
                  return (
                    <option key={s.id} value={s.id}>
                      {s.account_title} {totalDue > 0 ? `(Due: Rs ${new Intl.NumberFormat('en-PK').format(totalDue)})` : '(Cleared)'}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="field-group">
              <label className="field-label">Payment Date</label>
              <input type="date" className="field-input" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="field-group">
              <label className="field-label">Paid From Account</label>
              <select className="field-input" value={accountId} onChange={e => setAccountId(e.target.value)}>
                {bankAccounts.map(b => (
                  <option key={b.id} value={b.id}>{b.account_title}</option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label className="field-label">Payment Mode</label>
              <select className="field-input" value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="online">Online</option>
              </select>
            </div>
            <div className="field-group">
              <label className="field-label">Reference (Optional)</label>
              <input type="text" className="field-input" placeholder="Cheque No / Txn ID" value={reference} onChange={e => setReference(e.target.value)} />
            </div>
          </div>

          {supplierId && (
            <div style={{ marginTop: '24px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--c-text)', marginBottom: '12px' }}>Outstanding Invoices</h3>
              {allocations.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', background: 'var(--c-bg-alt)', borderRadius: 'var(--radius-md)', color: 'var(--c-text-muted)' }}>
                  This supplier has no outstanding invoices.
                </div>
              ) : (
                <div className="table-scroll" style={{ border: '1px solid var(--c-border)', borderRadius: 'var(--radius-md)' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '50px' }}>Pay</th>
                        <th>Invoice No</th>
                        <th style={{ textAlign: 'right' }}>Remaining Balance</th>
                        <th style={{ width: '180px', textAlign: 'right' }}>Payment Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allocations.map(a => (
                        <tr key={a.id} style={{ background: a.checked ? 'color-mix(in srgb, var(--c-primary) 5%, transparent)' : 'transparent' }}>
                          <td style={{ textAlign: 'center' }}>
                            <input 
                              type="checkbox" 
                              checked={a.checked} 
                              onChange={(e) => toggleAllocation(a.id, e.target.checked)} 
                              style={{ width: '16px', height: '16px', accentColor: 'var(--c-primary)', cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ fontWeight: 600 }}>{a.invoice}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--c-danger)' }}>
                            {new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(a.remaining)}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <input 
                              type="number" 
                              className="field-input" 
                              style={{ textAlign: 'right', padding: '6px', height: '32px' }}
                              value={a.checked ? a.amount : ''} 
                              onChange={e => handleAllocationAmount(a.id, e.target.value)}
                              disabled={!a.checked}
                              max={a.remaining}
                              min={0}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="field-group" style={{ marginTop: '24px' }}>
            <label className="field-label">Notes (Optional)</label>
            <input type="text" className="field-input" placeholder="Any additional notes..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid var(--c-border)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--c-bg-alt)' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--c-text-muted)' }}>Total Payment</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--c-primary)' }}>
              {new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(totalAllocated)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
            <button className="btn-primary" onClick={handleSubmit} disabled={loading || totalAllocated <= 0}>
              {loading ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
              Record Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
