'use client';

import { useState, useEffect } from 'react';
import { Calendar, Printer, Loader2, Save, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Transaction {
  billNo: string;
  details: string;
  amount: number;
}

interface CashReportData {
  businessName: string;
  previousBalance: number;
  receipts: Transaction[];
  payments: Transaction[];
  expenses: Transaction[];
  denominations: any;
}

export default function DailyCashModule({ defaultDate }: { defaultDate: string }) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const [data, setData] = useState<CashReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Denominations State
  const [notes, setNotes] = useState({
    n5000: 0,
    n1000: 0,
    n500: 0,
    n100: 0,
    n50: 0,
    n20: 0,
    n10: 0,
    coins: 0,
  });

  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate]);

  const fetchData = async (date: string) => {
    setLoading(true);
    setError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/cash-report?date=${date}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        if (json.data.denominations) {
          const d = json.data.denominations;
          setNotes({
            n5000: d.n5000 || 0,
            n1000: d.n1000 || 0,
            n500: d.n500 || 0,
            n100: d.n100 || 0,
            n50: d.n50 || 0,
            n20: d.n20 || 0,
            n10: d.n10 || 0,
            coins: d.coins || 0,
          });
        } else {
          setNotes({ n5000: 0, n1000: 0, n500: 0, n100: 0, n50: 0, n20: 0, n10: 0, coins: 0 });
        }
      } else {
        setError(json.error || 'Failed to fetch cash report');
      }
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleSaveDenominations = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/cash-report/denominations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          ...notes,
          total: totalCashInHand
        })
      });
      const json = await res.json();
      if (json.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert(json.error || 'Failed to save');
      }
    } catch (err: any) {
      alert(err.message);
    }
    setSaving(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleNoteChange = (key: keyof typeof notes, val: string) => {
    const num = parseInt(val, 10);
    setNotes(prev => ({ ...prev, [key]: isNaN(num) ? 0 : num }));
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val || 0);
  };

  // Calculations
  const totalCashInHand = 
    (notes.n5000 * 5000) + 
    (notes.n1000 * 1000) + 
    (notes.n500 * 500) + 
    (notes.n100 * 100) + 
    (notes.n50 * 50) + 
    (notes.n20 * 20) + 
    (notes.n10 * 10) + 
    notes.coins;

  const previousBalance = data?.previousBalance || 0;
  const totalReceipts = data?.receipts.reduce((sum, r) => sum + r.amount, 0) || 0;
  const grandTotal = previousBalance + totalReceipts;
  
  const totalPayments = data?.payments.reduce((sum, p) => sum + p.amount, 0) || 0;
  const totalExpenses = data?.expenses.reduce((sum, e) => sum + e.amount, 0) || 0;
  const closingBalance = grandTotal - totalPayments - totalExpenses;
  
  const isBalanced = totalCashInHand === closingBalance;

  const renderTable = (title: string, rows: Transaction[], isDeduction: boolean = false) => (
    <div className="dc-section">
      <h3 className="dc-section-title">{title}</h3>
      <table className="dc-table">
        <thead>
          <tr>
            <th>Bill No</th>
            <th className="dc-w-full">Details</th>
            <th className="dc-text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((row, i) => (
              <tr key={i}>
                <td>{row.billNo}</td>
                <td>{row.details}</td>
                <td className="dc-text-right">
                  {isDeduction && row.amount > 0 ? '-' : ''}{formatCurrency(row.amount)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} className="dc-empty-row">No entries</td>
            </tr>
          )}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr>
              <td colSpan={2} className="dc-text-right dc-total-label">Total</td>
              <td className="dc-text-right">{isDeduction ? '-' : ''}{formatCurrency(rows.reduce((s, r) => s + r.amount, 0))}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );

  return (
    <div className="dc-wrapper">
      {/* Floating Back Button */}
      <button 
        onClick={() => router.back()} 
        className="no-print"
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          background: 'var(--c-bg-card)',
          border: '1px solid var(--c-border)',
          borderRadius: '8px',
          cursor: 'pointer',
          color: 'var(--c-text)',
          fontWeight: 600,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          zIndex: 100
        }}
      >
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="dc-main-page">
        
        {/* Header */}
        <div className="dc-header">
          <div>
            <h1 className="dc-brand">{data?.businessName || 'Marwa Sky Tech Energy'}</h1>
            <p className="dc-report-name">Daily Cash Details & Reconciliation</p>
          </div>
          <div className="dc-date-picker-wrap">
            <div className="dc-date-picker no-print">
              <Calendar size={16} />
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              <button onClick={handlePrint} className="dc-btn-print" title="Print Report">
                <Printer size={16} />
              </button>
            </div>
            <div className="dc-print-date print-only">
              Date: {new Date(selectedDate).toLocaleDateString('en-GB')}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="dc-loading no-print">
            <Loader2 size={32} className="dc-spin" />
            <p>Loading Cash Report...</p>
          </div>
        ) : error ? (
          <div className="dc-error no-print">{error}</div>
        ) : data ? (
          <div className="dc-layout">
            
            {/* LEFT COLUMN: LEDGER */}
            <div className="dc-ledger">
              {renderTable('Receipts', data.receipts, false)}
              {renderTable('Payments', data.payments, true)}
              {renderTable('Expenses', data.expenses, true)}
            </div>

            {/* RIGHT COLUMN: RECONCILIATION */}
            <div className="dc-recon">
              
              {/* Financial Summary */}
              <div className="dc-summary-box">
                <h3 className="dc-section-title">System Balance</h3>
                <div className="dc-summary-row">
                  <span>Previous Balance:</span>
                  <span>{formatCurrency(previousBalance)}</span>
                </div>
                <div className="dc-summary-row">
                  <span>+ Receipts:</span>
                  <span>{formatCurrency(totalReceipts)}</span>
                </div>
                <div className="dc-summary-row dc-bold dc-border-bottom">
                  <span>Total:</span>
                  <span>{formatCurrency(grandTotal)}</span>
                </div>
                <div className="dc-summary-row">
                  <span>- Payments:</span>
                  <span>-{formatCurrency(totalPayments)}</span>
                </div>
                <div className="dc-summary-row">
                  <span>- Expenses:</span>
                  <span>-{formatCurrency(totalExpenses)}</span>
                </div>
                <div className="dc-summary-row dc-closing-box">
                  <span>Closing Balance:</span>
                  <span>{formatCurrency(closingBalance)}</span>
                </div>
              </div>

              {/* Denominations */}
              <div className="dc-denominations-box mt-6">
                <h3 className="dc-section-title">Physical Cash</h3>
                <table className="dc-table">
                  <thead>
                    <tr>
                      <th>Notes</th>
                      <th className="dc-text-right">Qty</th>
                      <th className="dc-text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { val: 5000, key: 'n5000', label: '5000' },
                      { val: 1000, key: 'n1000', label: '1000' },
                      { val: 500, key: 'n500', label: '500' },
                      { val: 100, key: 'n100', label: '100' },
                      { val: 50, key: 'n50', label: '50' },
                      { val: 20, key: 'n20', label: '20' },
                      { val: 10, key: 'n10', label: '10' },
                      { val: 1, key: 'coins', label: 'Coins (Rs)' },
                    ].map((note) => (
                      <tr key={note.key}>
                        <td>{note.label}</td>
                        <td className="dc-text-right">
                          <input 
                            type="number" 
                            min="0"
                            value={notes[note.key as keyof typeof notes] === 0 ? '' : notes[note.key as keyof typeof notes]}
                            onChange={(e) => handleNoteChange(note.key as keyof typeof notes, e.target.value)}
                            className="dc-qty-input"
                          />
                          <span className="dc-qty-print print-only">{notes[note.key as keyof typeof notes]}</span>
                        </td>
                        <td className="dc-text-right">{formatCurrency((note.val === 1 ? 1 : note.val) * notes[note.key as keyof typeof notes])}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2} className="dc-text-right dc-total-label">Cash In Hand</td>
                      <td className={`dc-text-right dc-bold ${!isBalanced ? 'dc-text-danger' : 'dc-text-success'}`}>
                        {formatCurrency(totalCashInHand)}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Save Button */}
                <div className="dc-save-row no-print">
                  {saveSuccess && <span className="dc-success-text">Saved!</span>}
                  <button onClick={handleSaveDenominations} disabled={saving} className="dc-btn-save">
                    {saving ? <Loader2 size={16} className="dc-spin" /> : <Save size={16} />}
                    {saving ? 'Saving...' : 'Save Cash Count'}
                  </button>
                </div>
                
                {!isBalanced && (
                  <div className="dc-balance-alert no-print">
                    Difference: {formatCurrency(closingBalance - totalCashInHand)}
                  </div>
                )}
              </div>

            </div>
          </div>
        ) : null}
      </div>

      {/* ─── STYLES ─── */}
      <style dangerouslySetInnerHTML={{__html: `
        .dc-wrapper {
          padding: 24px;
          min-height: 100vh;
          font-family: var(--font-inter, sans-serif);
          background: var(--c-bg);
          color: var(--c-text);
        }

        .dc-main-page {
          width: 100%;
          max-width: 890px;
          margin: 0 auto;
          background: var(--c-bg-card);
          border: 1px solid var(--c-border);
          border-radius: var(--radius-md);
          padding: 32px 40px;
          box-shadow: var(--shadow-sm);
        }

        /* HEADER */
        .dc-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          border-bottom: 2px solid var(--c-text);
          padding-bottom: 16px;
          margin-bottom: 24px;
        }

        .dc-brand {
          font-size: 24px;
          font-weight: 900;
          color: var(--c-primary-dark);
          text-transform: uppercase;
          letter-spacing: -0.5px;
          margin: 0 0 4px 0;
        }

        .dc-report-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--c-text-muted);
          text-transform: uppercase;
          margin: 0;
        }

        .dc-date-picker-wrap {
          text-align: right;
        }

        .dc-date-picker {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--c-text-muted);
        }

        .dc-date-picker input {
          background: transparent;
          border: 1px solid var(--c-border);
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 14px;
          color: var(--c-text);
          outline: none;
        }

        .dc-date-picker input:focus { border-color: var(--c-primary); }

        .dc-btn-print {
          background: var(--c-primary);
          color: white;
          border: none;
          padding: 6px;
          border-radius: 4px;
          cursor: pointer;
        }
        .dc-btn-print:hover { background: var(--c-primary-dark); }

        .dc-print-date {
          display: none;
          font-size: 14px;
          font-weight: bold;
        }

        /* LAYOUT */
        .dc-layout {
          display: flex;
          gap: 32px;
        }

        .dc-ledger { flex: 7; }
        .dc-recon { flex: 3; }

        @media (max-width: 768px) {
          .dc-layout { flex-direction: column; }
        }

        /* TABLES & SECTIONS */
        .dc-section {
          margin-bottom: 24px;
          break-inside: avoid;
        }

        .dc-section-title {
          font-size: 12px;
          font-weight: 800;
          color: var(--c-text);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 8px 0;
          border-bottom: 2px solid var(--c-primary);
          display: inline-block;
          padding-bottom: 2px;
        }

        .dc-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          text-align: left;
        }

        /* Dotted borders for dense accounting look */
        .dc-table th, .dc-table td {
          padding: 4px 6px;
          border-bottom: 1px dotted var(--c-border);
        }

        .dc-table thead {
          border-bottom: 1px solid var(--c-border);
        }

        .dc-table th {
          font-weight: 700;
          color: var(--c-text-muted);
          text-transform: uppercase;
        }

        .dc-table tfoot {
          border-top: 1px solid var(--c-border);
          font-weight: 700;
        }
        
        .dc-table tfoot td {
          border-bottom: none;
          padding-top: 6px;
        }

        .dc-w-full { width: 100%; }
        .dc-text-right { text-align: right; }
        .dc-total-label { text-transform: uppercase; font-size: 10px; }
        .dc-bold { font-weight: 700; }
        
        .dc-text-danger { color: var(--c-danger); }
        .dc-text-success { color: var(--c-primary-dark); }

        .dc-empty-row {
          text-align: center;
          color: var(--c-text-subtle);
          font-style: italic;
          padding: 12px;
          border-bottom: none !important;
        }

        /* RECONCILIATION SUMMARY */
        .dc-summary-box {
          background: var(--c-bg-input);
          border: 1px solid var(--c-border);
          padding: 12px;
          border-radius: 4px;
        }

        .dc-summary-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          padding: 4px 0;
        }
        
        .dc-border-bottom {
          border-bottom: 1px solid var(--c-border);
          margin-bottom: 4px;
          padding-bottom: 6px;
        }

        .dc-closing-box {
          margin-top: 8px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid var(--c-primary);
          padding: 8px;
          font-weight: 800;
          font-size: 13px;
          border-radius: 4px;
          color: var(--c-primary-dark);
        }

        /* INPUTS */
        .dc-qty-input {
          width: 50px;
          text-align: right;
          background: transparent;
          border: 1px solid var(--c-border);
          border-radius: 3px;
          padding: 2px 4px;
          font-size: 11px;
          color: var(--c-text);
          outline: none;
        }
        .dc-qty-input:focus {
          border-color: var(--c-primary);
          background: var(--c-bg-input);
        }
        .dc-qty-print { display: none; }

        .dc-save-row {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 12px;
          margin-top: 12px;
        }

        .dc-success-text {
          color: var(--c-primary);
          font-size: 12px;
          font-weight: bold;
        }

        .dc-btn-save {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--c-primary);
          color: white;
          border: none;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 600;
          border-radius: 4px;
          cursor: pointer;
        }
        .dc-btn-save:disabled { opacity: 0.7; cursor: not-allowed; }

        .dc-balance-alert {
          margin-top: 8px;
          font-size: 11px;
          color: var(--c-danger);
          text-align: right;
          font-weight: bold;
        }

        /* LOADING / ERROR */
        .dc-loading, .dc-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 0;
          color: var(--c-primary);
        }
        
        .dc-error { color: var(--c-danger); }
        .dc-spin { animation: spin 1s linear infinite; margin-bottom: 16px; }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        .mt-6 { margin-top: 24px; }

        /* ─── PRINT OPTIMIZATIONS ─── */
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          
          body, html {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .no-print { display: none !important; }
          .print-only { display: block !important; }

          .dc-wrapper {
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }

          .dc-main-page {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            max-width: 100% !important;
          }
          
          .dc-header { border-bottom: 2px solid black !important; }
          .dc-brand, .dc-report-name, .dc-print-date { color: black !important; }
          .dc-section-title { color: black !important; border-bottom: 2px solid black !important; }

          .dc-table th, .dc-table td {
            border-bottom: 1px dotted black !important;
            color: black !important;
          }

          .dc-table thead, .dc-table tfoot { border-color: black !important; }
          
          .dc-summary-box {
            border: 1px solid black !important;
            background: transparent !important;
          }
          .dc-closing-box {
            border: 2px solid black !important;
            background: transparent !important;
            color: black !important;
          }
          
          .dc-border-bottom { border-bottom: 1px solid black !important; }

          .dc-qty-input { display: none !important; }
          .dc-qty-print { display: inline-block !important; font-weight: bold; }
          
          .dc-text-danger, .dc-text-success { color: black !important; }
          
          header, aside, nav, .sidebar { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; width: 100% !important; }
        }
      `}} />
    </div>
  );
}
