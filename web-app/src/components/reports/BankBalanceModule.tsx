'use client';

import { useState, useEffect } from 'react';
import { Calendar, Printer, Loader2, ArrowLeft, Building2, Landmark, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface BankTxn {
  billNo: string;
  bankId: string;
  bankName: string;
  details: string;
  amount: number;
  type: 'receipt' | 'payment' | 'expense';
  source: string;
}

interface BankMetric {
  id: string;
  title: string;
  contactNumber: string | null;
  previousBalance: number;
  totalReceipts: number;
  totalPayments: number;
  totalExpenses: number;
  closingBalance: number;
}

interface BankReportData {
  businessName: string;
  date: string;
  selectedBankId: string;
  allBanks: { id: string; title: string }[];
  banks: BankMetric[];
  summary: {
    previousBalance: number;
    totalReceipts: number;
    totalPayments: number;
    totalExpenses: number;
    closingBalance: number;
  };
  receipts: BankTxn[];
  payments: BankTxn[];
  expenses: BankTxn[];
}

export default function BankBalanceModule({ defaultDate }: { defaultDate: string }) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const [selectedBankId, setSelectedBankId] = useState('all');
  const [data, setData] = useState<BankReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData(selectedDate, selectedBankId);
  }, [selectedDate, selectedBankId]);

  const fetchData = async (date: string, bankId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/bank-balance?date=${date}&bankId=${bankId}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || 'Failed to fetch bank balance report');
      }
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val || 0);
  };

  const summary = data?.summary || {
    previousBalance: 0,
    totalReceipts: 0,
    totalPayments: 0,
    totalExpenses: 0,
    closingBalance: 0,
  };

  const grandTotalInflow = summary.previousBalance + summary.totalReceipts;

  const renderTable = (title: string, list: BankTxn[], isNegative: boolean = false) => {
    const total = list.reduce((s, x) => s + x.amount, 0);

    return (
      <div className="bb-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 className="bb-section-title">{title}</h3>
          <span style={{ fontSize: '11px', color: 'var(--c-text-muted)' }}>{list.length} transaction{list.length === 1 ? '' : 's'}</span>
        </div>
        <table className="bb-table">
          <thead>
            <tr>
              <th style={{ width: '90px' }}>Ref / Bill #</th>
              {selectedBankId === 'all' && <th style={{ width: '130px' }}>Bank</th>}
              <th>Description / Account</th>
              <th style={{ width: '90px' }}>Source</th>
              <th className="bb-text-right" style={{ width: '100px' }}>Amount (PKR)</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={selectedBankId === 'all' ? 5 : 4} className="bb-text-center" style={{ padding: '16px', color: 'var(--c-text-subtle)' }}>
                  No transactions recorded
                </td>
              </tr>
            ) : (
              list.map((item, idx) => (
                <tr key={idx}>
                  <td className="bb-mono" style={{ fontWeight: 600 }}>{item.billNo}</td>
                  {selectedBankId === 'all' && (
                    <td style={{ color: 'var(--c-primary-dark)', fontWeight: 500 }}>
                      {item.bankName}
                    </td>
                  )}
                  <td>{item.details}</td>
                  <td style={{ fontSize: '10px', color: 'var(--c-text-muted)' }}>{item.source}</td>
                  <td className="bb-text-right bb-mono" style={{ fontWeight: 600 }}>
                    {isNegative ? '-' : ''}{formatCurrency(item.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={selectedBankId === 'all' ? 4 : 3} className="bb-text-right bb-total-label">
                Total {title}
              </td>
              <td className="bb-text-right bb-bold bb-mono">
                {isNegative ? '-' : ''}{formatCurrency(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  return (
    <div className="bb-wrapper">
      <div className="bb-main-page">
        {/* Header */}
        <div className="bb-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button 
              onClick={() => router.push('/reports')} 
              className="btn-ghost-sm no-print"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '38px',
                height: '38px',
                background: 'var(--c-bg)',
                border: '1px solid var(--c-border)',
                borderRadius: '8px',
                cursor: 'pointer',
                color: 'var(--c-text)',
                transition: 'all 0.2s',
                flexShrink: 0
              }}
              title="Back to Reports"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Landmark size={24} style={{ color: '#0ea5e9' }} />
                <h1 className="bb-brand">{data?.businessName || 'SolarERP'}</h1>
              </div>
              <p className="bb-report-name">Bank Balances & Reconciliation</p>
            </div>
          </div>

          <div className="bb-date-picker-wrap">
            <div className="bb-date-picker no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'flex-end' }}>
              <select 
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                style={{
                  background: 'var(--c-bg)',
                  border: '1px solid var(--c-border)',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '13px',
                  color: 'var(--c-text)',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="all">🏦 All Banks (Combined)</option>
                {(data?.allBanks || []).map(b => (
                  <option key={b.id} value={b.id}>{b.title}</option>
                ))}
              </select>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                  style={{
                    background: 'var(--c-bg)',
                    border: '1px solid var(--c-border)',
                    borderRadius: '6px',
                    padding: '5px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--c-text)',
                    cursor: 'pointer'
                  }}
                >
                  📅 Today
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={16} />
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>

              <button onClick={handlePrint} className="bb-btn-print" title="Print Statement">
                <Printer size={16} /> Print
              </button>
            </div>

            <div className="bb-print-date print-only">
              Date: {new Date(selectedDate).toLocaleDateString('en-GB')} {selectedBankId !== 'all' && `(${data?.banks[0]?.title})`}
            </div>
          </div>
        </div>

        {/* Bank Balances Cards */}
        {data && (
          <div className="bb-cards-grid no-print" style={{ marginBottom: '24px' }}>
            <div 
              className={`bb-card ${selectedBankId === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedBankId('all')}
              style={{ cursor: 'pointer' }}
            >
              <div className="bb-card-icon" style={{ background: '#0ea5e915', color: '#0ea5e9' }}>
                <Building2 size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="bb-card-label">TOTAL ALL BANKS</div>
                <div className="bb-card-val bb-mono" style={{ color: summary.closingBalance >= 0 ? '#0284c7' : '#e11d48' }}>
                  PKR {formatCurrency(summary.closingBalance)}
                </div>
              </div>
            </div>

            {data.banks.map(bank => (
              <div 
                key={bank.id} 
                className={`bb-card ${selectedBankId === bank.id ? 'active' : ''}`}
                onClick={() => setSelectedBankId(bank.id)}
                style={{ cursor: 'pointer' }}
              >
                <div className="bb-card-icon" style={{ background: '#3b82f615', color: '#3b82f6' }}>
                  <Landmark size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="bb-card-label">{bank.title.toUpperCase()}</div>
                  <div className="bb-card-val bb-mono" style={{ color: bank.closingBalance >= 0 ? '#059669' : '#e11d48' }}>
                    PKR {formatCurrency(bank.closingBalance)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="bb-loading no-print">
            <Loader2 size={32} className="bb-spin" />
            <p>Loading Bank Report...</p>
          </div>
        ) : error ? (
          <div className="bb-error no-print">{error}</div>
        ) : data ? (
          <div className="bb-layout">
            {/* LEFT COLUMN: LEDGER */}
            <div className="bb-ledger">
              {renderTable('Deposits & Receipts', data.receipts, false)}
              {renderTable('Withdrawals & Payments', data.payments, true)}
              {data.expenses.length > 0 && renderTable('Bank Charges & Expenses', data.expenses, true)}
            </div>

            {/* RIGHT COLUMN: RECONCILIATION */}
            <div className="bb-recon">
              {/* Financial Summary */}
              <div className="bb-summary-box">
                <h3 className="bb-section-title">
                  {selectedBankId === 'all' ? 'All Banks Summary' : `${data.banks[0]?.title || 'Bank'} Summary`}
                </h3>
                <div className="bb-summary-row">
                  <span>Previous Balance:</span>
                  <span className="bb-mono">{formatCurrency(summary.previousBalance)}</span>
                </div>
                <div className="bb-summary-row">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#059669' }}>
                    <ArrowDownLeft size={14} /> Receipts / Inflow:
                  </span>
                  <span className="bb-mono" style={{ color: '#059669', fontWeight: 600 }}>
                    +{formatCurrency(summary.totalReceipts)}
                  </span>
                </div>
                <div className="bb-summary-row bb-bold bb-border-bottom">
                  <span>Subtotal:</span>
                  <span className="bb-mono">{formatCurrency(grandTotalInflow)}</span>
                </div>
                <div className="bb-summary-row">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#e11d48' }}>
                    <ArrowUpRight size={14} /> Payments / Outflow:
                  </span>
                  <span className="bb-mono" style={{ color: '#e11d48', fontWeight: 600 }}>
                    -{formatCurrency(summary.totalPayments)}
                  </span>
                </div>
                {summary.totalExpenses > 0 && (
                  <div className="bb-summary-row">
                    <span>Bank Charges:</span>
                    <span className="bb-mono" style={{ color: '#e11d48' }}>-{formatCurrency(summary.totalExpenses)}</span>
                  </div>
                )}
                <div className="bb-summary-row bb-closing-box">
                  <span style={{ fontWeight: 800 }}>Ending Bank Balance:</span>
                  <span className="bb-mono" style={{ fontWeight: 800, fontSize: '15px', color: summary.closingBalance >= 0 ? '#0284c7' : '#e11d48' }}>
                    {formatCurrency(summary.closingBalance)}
                  </span>
                </div>
              </div>

              {/* Per-Bank Breakdown in Right Column */}
              {selectedBankId === 'all' && data.banks.length > 1 && (
                <div className="bb-summary-box" style={{ marginTop: '20px' }}>
                  <h3 className="bb-section-title">Breakdown by Bank</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginTop: '6px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--c-border)', color: 'var(--c-text-muted)' }}>
                        <th style={{ textAlign: 'left', padding: '4px' }}>Bank</th>
                        <th style={{ textAlign: 'right', padding: '4px' }}>Closing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.banks.map(b => (
                        <tr key={b.id} style={{ borderBottom: '1px dotted var(--c-border)' }}>
                          <td style={{ padding: '6px 4px', fontWeight: 600 }}>{b.title}</td>
                          <td className="bb-mono" style={{ textAlign: 'right', padding: '6px 4px', fontWeight: 700, color: b.closingBalance >= 0 ? '#059669' : '#e11d48' }}>
                            {formatCurrency(b.closingBalance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* STYLES */}
      <style dangerouslySetInnerHTML={{__html: `
        .bb-wrapper {
          padding: 24px;
          min-height: 100vh;
          font-family: var(--font-inter, sans-serif);
          background: var(--c-bg);
          color: var(--c-text);
        }

        .bb-main-page {
          width: 100%;
          max-width: 960px;
          margin: 0 auto;
          background: var(--c-bg-card);
          border: 1px solid var(--c-border);
          border-radius: var(--radius-md);
          padding: 32px 40px;
          box-shadow: var(--shadow-sm);
        }

        .bb-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          border-bottom: 2px solid var(--c-text);
          padding-bottom: 16px;
          margin-bottom: 20px;
        }

        .bb-brand {
          font-size: 22px;
          font-weight: 900;
          color: #0ea5e9;
          text-transform: uppercase;
          letter-spacing: -0.5px;
          margin: 0;
        }

        .bb-report-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--c-text-muted);
          text-transform: uppercase;
          margin: 2px 0 0 0;
        }

        .bb-date-picker-wrap {
          text-align: right;
        }

        .bb-date-picker {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--c-text-muted);
        }

        .bb-date-picker input {
          background: transparent;
          border: 1px solid var(--c-border);
          border-radius: 6px;
          padding: 5px 8px;
          font-size: 13px;
          color: var(--c-text);
          outline: none;
        }

        .bb-date-picker input:focus { border-color: #0ea5e9; }

        .bb-btn-print {
          background: #0ea5e9;
          color: white;
          border: none;
          padding: 6px 10px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: background 0.2s;
        }
        .bb-btn-print:hover { background: #0284c7; }

        .bb-print-date {
          display: none;
          font-size: 13px;
          font-weight: bold;
        }

        .bb-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
        }

        .bb-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: var(--c-bg);
          border: 1px solid var(--c-border);
          border-radius: 8px;
          transition: all 0.2s;
        }
        .bb-card:hover {
          border-color: #0ea5e9;
          transform: translateY(-1px);
        }
        .bb-card.active {
          border-color: #0ea5e9;
          background: color-mix(in srgb, #0ea5e9 8%, var(--c-bg-card));
        }

        .bb-card-icon {
          width: 38px;
          height: 38px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .bb-card-label {
          font-size: 10px;
          font-weight: 700;
          color: var(--c-text-muted);
          letter-spacing: 0.5px;
        }

        .bb-card-val {
          font-size: 15px;
          font-weight: 800;
          margin-top: 2px;
        }

        .bb-layout {
          display: flex;
          gap: 28px;
        }

        .bb-ledger { flex: 7; }
        .bb-recon { flex: 3.5; }

        @media (max-width: 820px) {
          .bb-layout { flex-direction: column; }
        }

        .bb-section {
          margin-bottom: 24px;
          break-inside: avoid;
        }

        .bb-section-title {
          font-size: 12px;
          font-weight: 800;
          color: var(--c-text);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0;
          border-bottom: 2px solid #0ea5e9;
          display: inline-block;
          padding-bottom: 2px;
        }

        .bb-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          text-align: left;
        }

        .bb-table th, .bb-table td {
          padding: 6px 8px;
          border-bottom: 1px dotted var(--c-border);
        }

        .bb-table th {
          background: transparent;
          font-weight: 700;
          color: var(--c-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-size: 10px;
          border-bottom: 1px solid var(--c-text);
        }

        .bb-table tfoot td {
          border-top: 1px solid var(--c-text);
          border-bottom: none;
          padding-top: 6px;
        }

        .bb-total-label {
          font-weight: 700;
          text-transform: uppercase;
          font-size: 10px;
        }

        .bb-text-right { text-align: right; }
        .bb-text-center { text-align: center; }
        .bb-mono { font-family: monospace; }
        .bb-bold { font-weight: 700; }

        .bb-summary-box {
          background: var(--c-bg);
          border: 1px solid var(--c-border);
          border-radius: 6px;
          padding: 16px;
        }

        .bb-summary-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          font-size: 12px;
        }

        .bb-border-bottom {
          border-bottom: 1px solid var(--c-border);
          padding-bottom: 8px;
          margin-bottom: 4px;
        }

        .bb-closing-box {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 2px solid var(--c-text);
        }

        .bb-loading, .bb-error {
          text-align: center;
          padding: 40px;
          color: var(--c-text-muted);
        }

        .bb-error {
          background: #fee2e2;
          color: #991b1b;
          border-radius: 6px;
        }

        .bb-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .bb-wrapper { padding: 0 !important; background: transparent !important; }
          .bb-main-page {
            max-width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          .bb-header {
            border-bottom: 2px solid black !important;
          }
          .bb-brand { color: black !important; }
          .bb-section-title { border-bottom: 2px solid black !important; }
          .bb-table th { border-bottom: 1px solid black !important; color: black !important; }
          .bb-table th, .bb-table td { border-bottom-color: #ddd !important; }
          .bb-table tfoot td { border-top: 1px solid black !important; }
          .bb-summary-box { border: 1px solid black !important; background: transparent !important; }
          .bb-closing-box { border-top: 2px solid black !important; }
        }
      `}} />
    </div>
  );
}
