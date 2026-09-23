'use client';

import { useState, useEffect } from 'react';
import { Calendar, Printer, Loader2, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DayBookData {
  businessName: string;
  purchases: any[];
  sales: any[];
  journalVouchers: any[];
  cashReceipts: any[];
  cashPayments: any[];
  bankReceipts: any[];
  bankPayments: any[];
  runningStock: any[];
  runningBalance: any[];
}

const SECTIONS = [
  { id: 'purchases', label: 'Purchases' },
  { id: 'sales', label: 'Sales' },
  { id: 'cashReceipts', label: 'Cash Receipts' },
  { id: 'cashPayments', label: 'Cash Payments' },
  { id: 'bankReceipts', label: 'Bank Receipts' },
  { id: 'bankPayments', label: 'Bank Payments' },
  { id: 'journalVouchers', label: 'Journal Voucher' },
  { id: 'runningStock', label: 'Running Stock' },
  { id: 'runningBalance', label: 'Running Accounts' },
];

export default function DailyBookModule({ defaultDate }: { defaultDate: string }) {
  const router = useRouter();
  
  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const [data, setData] = useState<DayBookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [visibleSections, setVisibleSections] = useState<Record<string, boolean>>(
    SECTIONS.reduce((acc, s) => ({ ...acc, [s.id]: true }), {})
  );

  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate]);

  const fetchData = async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/daily-book?date=${date}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || 'Failed to fetch day book');
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

  const formatQty = (val: number) => {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(val || 0);
  };

  const toggleSection = (id: string) => {
    setVisibleSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Renders simple 1-line tables (Cash/Bank)
  const renderSimpleTable = (
    id: string, 
    title: string, 
    headers: string[], 
    rows: any[], 
    renderRow: (row: any, i: number) => React.ReactNode,
    renderFooter?: () => React.ReactNode
  ) => {
    if (!visibleSections[id]) return null;

    return (
      <div className="db-section">
        <h3 className="db-section-title">{title}</h3>
        <table className="db-table">
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} className={['Amount', 'Qty', 'Rate', 'Debit', 'Credit', 'Balance', 'Closing'].some(kw => h.includes(kw)) ? 'db-text-right' : ''}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row, i) => renderRow(row, i))
            ) : (
              <tr>
                <td colSpan={headers.length} className="db-empty-row">No entries</td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && renderFooter && (
            <tfoot>
              {renderFooter()}
            </tfoot>
          )}
        </table>
      </div>
    );
  };

  // Render Grouped Tables (Sales, Purchases, JVs)
  const renderGroupedTable = (
    id: string, 
    title: string, 
    groups: any[],
    type: 'invoice' | 'jv'
  ) => {
    if (!visibleSections[id]) return null;

    let totalAmount = 0;

    return (
      <div className="db-section">
        <h3 className="db-section-title">{title}</h3>
        <table className="db-table">
          <thead>
            {type === 'invoice' ? (
              <tr>
                <th>Bill No</th>
                <th>Account</th>
                <th>Product / Description</th>
                <th className="db-text-right">Qty</th>
                <th className="db-text-right">Rate</th>
                <th className="db-text-right">Amount</th>
              </tr>
            ) : (
              <tr>
                <th>Voucher No</th>
                <th>Account</th>
                <th className="db-text-right">Amount</th>
              </tr>
            )}
          </thead>
          <tbody>
            {groups.length > 0 ? (
              groups.map((group, groupIdx) => {
                if (type === 'invoice') {
                  const lines = group.lines || [];
                  const billTotal = lines.reduce((s: number, l: any) => s + (l.amount || 0), 0);
                  totalAmount += billTotal;
                  return lines.map((line: any, lineIdx: number) => (
                    <tr key={`${groupIdx}-${lineIdx}`} className={lineIdx === lines.length - 1 ? 'db-row-group-end' : ''}>
                      {lineIdx === 0 ? (
                        <>
                          <td className="db-valign-top" rowSpan={lines.length || 1}>{group.billNo}</td>
                          <td className="db-valign-top" rowSpan={lines.length || 1}>{group.account}</td>
                        </>
                      ) : null}
                      <td>{line.product}</td>
                      <td className="db-text-right">{line.qty !== null && line.qty !== undefined ? formatQty(line.qty) : ''}</td>
                      <td className="db-text-right">{line.rate !== null && line.rate !== undefined ? formatCurrency(line.rate) : ''}</td>
                      <td className="db-text-right">{formatCurrency(line.amount)}</td>
                    </tr>
                  ));
                } else {
                  // Journal Voucher
                  const lines = group.lines || [];
                  const jvTotal = lines.reduce((s: number, l: any) => s + (l.amount > 0 ? l.amount : 0), 0);
                  totalAmount += jvTotal;
                  return lines.map((line: any, lineIdx: number) => (
                    <tr key={`${groupIdx}-${lineIdx}`} className={lineIdx === lines.length - 1 ? 'db-row-group-end' : ''}>
                      {lineIdx === 0 ? (
                        <td className="db-valign-top" rowSpan={lines.length || 1}>{group.billNo || group.voucherNo}</td>
                      ) : null}
                      <td>{line.account}</td>
                      <td className="db-text-right">{formatCurrency(line.amount)}</td>
                    </tr>
                  ));
                }
              })
            ) : (
              <tr>
                <td colSpan={type === 'invoice' ? 6 : 3} className="db-empty-row">No entries</td>
              </tr>
            )}
          </tbody>
          {groups.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={type === 'invoice' ? 5 : 2} className="db-text-right db-total-label">Total</td>
                <td className="db-text-right">{formatCurrency(totalAmount)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    );
  };

  return (
    <div className="db-wrapper">
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

      {/* Main Report Area - A4 Portrait Simulation */}
      <div className="db-main-page">
        
        {/* Header */}
        <div className="db-header">
          <div>
            <h1 className="db-brand">{data?.businessName || 'Loading...'}</h1>
            <p className="db-report-name">Daily Book Report</p>
          </div>
          <div className="db-date-picker-wrap">
            <div className="db-date-picker no-print">
              <Calendar size={16} />
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="db-print-date print-only">
              Date: {new Date(selectedDate).toLocaleDateString('en-GB')}
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="db-loading no-print">
            <Loader2 size={32} className="db-spin" />
            <p>Loading Daily Book...</p>
          </div>
        ) : error ? (
          <div className="db-error no-print">
            {error}
          </div>
        ) : data ? (
          <div className="db-content">
            
            {/* 1. Purchases */}
            {renderGroupedTable('purchases', 'Purchases', data.purchases, 'invoice')}

            {/* 2. Sales */}
            {renderGroupedTable('sales', 'Sales', data.sales, 'invoice')}

            {/* 3. Cash Receipts */}
            {renderSimpleTable('cashReceipts', 'Cash Receipts', ['Bill No', 'Account', 'Amount'], data.cashReceipts, (row, i) => (
              <tr key={i}>
                <td>{row.billNo}</td>
                <td>{row.account}</td>
                <td className="db-text-right">{formatCurrency(row.amount)}</td>
              </tr>
            ), () => (
              <tr>
                <td colSpan={2} className="db-text-right db-total-label">Total</td>
                <td className="db-text-right">{formatCurrency(data.cashReceipts.reduce((s, r) => s + r.amount, 0))}</td>
              </tr>
            ))}

            {/* 4. Cash Payments */}
            {renderSimpleTable('cashPayments', 'Cash Payments', ['Bill No', 'Account', 'Amount'], data.cashPayments, (row, i) => (
              <tr key={i}>
                <td>{row.billNo}</td>
                <td>{row.account}</td>
                <td className="db-text-right">{formatCurrency(row.amount)}</td>
              </tr>
            ), () => (
              <tr>
                <td colSpan={2} className="db-text-right db-total-label">Total</td>
                <td className="db-text-right">{formatCurrency(data.cashPayments.reduce((s, r) => s + r.amount, 0))}</td>
              </tr>
            ))}

            {/* 5. Bank Receipts */}
            {renderSimpleTable('bankReceipts', 'Bank Receipts', ['Bill No', 'Account', 'Amount'], data.bankReceipts, (row, i) => (
              <tr key={i}>
                <td>{row.billNo}</td>
                <td>{row.account}</td>
                <td className="db-text-right">{formatCurrency(row.amount)}</td>
              </tr>
            ), () => (
              <tr>
                <td colSpan={2} className="db-text-right db-total-label">Total</td>
                <td className="db-text-right">{formatCurrency(data.bankReceipts.reduce((s, r) => s + r.amount, 0))}</td>
              </tr>
            ))}

            {/* 6. Bank Payments */}
            {renderSimpleTable('bankPayments', 'Bank Payments', ['Bill No', 'Account', 'Amount'], data.bankPayments, (row, i) => (
              <tr key={i}>
                <td>{row.billNo}</td>
                <td>{row.account}</td>
                <td className="db-text-right">{formatCurrency(row.amount)}</td>
              </tr>
            ), () => (
              <tr>
                <td colSpan={2} className="db-text-right db-total-label">Total</td>
                <td className="db-text-right">{formatCurrency(data.bankPayments.reduce((s, r) => s + r.amount, 0))}</td>
              </tr>
            ))}

            {/* 7. Journal Voucher */}
            {renderGroupedTable('journalVouchers', 'Journal Voucher', data.journalVouchers, 'jv')}

            {/* 8. Running Stock */}
            {renderSimpleTable('runningStock', 'Running Stock (Traded Today)', ['Product', 'Sales (Qty Out)', 'Purchases (Qty In)', 'Stock (Closing)'], data.runningStock, (row, i) => (
              <tr key={i}>
                <td>{row.product}</td>
                <td className="db-text-right">{formatQty(row.out)}</td>
                <td className="db-text-right">{formatQty(row.in)}</td>
                <td className="db-text-right db-bold">{formatQty(row.closing)}</td>
              </tr>
            ))}

            {/* 9. Running Accounts */}
            {renderSimpleTable('runningBalance', 'Running Accounts (Ledger Summary)', ['Account', 'Debit', 'Credit', 'Balance'], data.runningBalance, (row, i) => (
              <tr key={i}>
                <td className="db-truncate-account">{row.account}</td>
                <td className="db-text-right">{formatCurrency(row.debit)}</td>
                <td className="db-text-right">{formatCurrency(row.credit)}</td>
                <td className={`db-text-right db-bold ${row.closing > 0 ? 'db-text-emerald' : row.closing < 0 ? 'db-text-red' : ''}`}>
                  {formatCurrency(row.closing)}
                </td>
              </tr>
            ))}
            
          </div>
        ) : null}
      </div>

      {/* Right-Side Control Panel */}
      <div className="db-sidebar no-print">
        <div className="db-sidebar-header">
          <h2>View Options</h2>
          <button onClick={handlePrint} className="db-btn-print" title="Print / Save PDF">
            <Printer size={16} />
          </button>
        </div>
        
        <p className="db-sidebar-hint">Toggle sections to show/hide in the report.</p>
        
        <div className="db-checklist">
          {SECTIONS.map(section => (
            <label key={section.id} className="db-check-item">
              <input 
                type="checkbox"
                checked={visibleSections[section.id]}
                onChange={() => toggleSection(section.id)}
              />
              <span>{section.label}</span>
            </label>
          ))}
        </div>
      </div>
      
      {/* ─── STYLES (11px Dense Accounting Theme) ─── */}
      <style dangerouslySetInnerHTML={{__html: `
        .db-wrapper {
          display: flex;
          flex-direction: row;
          gap: 24px;
          padding: 24px;
          min-height: 100vh;
          font-family: var(--font-inter, sans-serif);
          align-items: flex-start;
          background: var(--c-bg);
          color: var(--c-text);
        }

        @media (max-width: 1024px) {
          .db-wrapper {
            flex-direction: column;
          }
        }

        /* MAIN PAGE (A4 Simulator) */
        .db-main-page {
          flex: 1;
          width: 100%;
          max-width: 794px; /* A4 width roughly */
          margin: 0 auto;
          background: var(--c-bg-card);
          border: 1px solid var(--c-border);
          border-radius: var(--radius-md);
          padding: 40px;
          box-shadow: var(--shadow-sm);
        }

        /* HEADER */
        .db-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          border-bottom: 2px solid var(--c-text);
          padding-bottom: 16px;
          margin-bottom: 24px;
        }

        .db-brand {
          font-size: 24px;
          font-weight: 900;
          color: var(--c-primary-dark);
          text-transform: uppercase;
          letter-spacing: -0.5px;
          margin: 0 0 4px 0;
        }

        .db-report-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--c-text-muted);
          text-transform: uppercase;
          margin: 0;
        }

        .db-date-picker-wrap {
          text-align: right;
        }

        .db-date-picker {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--c-text-muted);
          margin-bottom: 8px;
        }

        .db-date-picker input {
          background: transparent;
          border: 1px solid var(--c-border);
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 14px;
          color: var(--c-text);
          outline: none;
        }

        .db-date-picker input:focus {
          border-color: var(--c-primary);
        }

        .db-print-date {
          display: none;
          font-size: 14px;
          font-weight: bold;
        }

        /* TABLES & SECTIONS */
        .db-section {
          margin-bottom: 24px;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .db-section-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--c-text);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 8px 0;
          border-bottom: 2px solid var(--c-primary);
          display: inline-block;
          padding-bottom: 2px;
        }

        .db-table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #e2e8f0; /* Thin light gray border */
          font-size: 11px; /* DENSE DATA SIZE */
          text-align: left;
        }

        .db-table th, .db-table td {
          padding: 4px 6px;
          border: 1px solid #e2e8f0; /* Thin light gray border */
        }

        .db-table thead th {
          background: #fdfbf7; /* Subtle beige background */
          font-weight: 600;
          color: var(--c-text);
        }

        .db-table tfoot {
          background: #f8fafc;
          font-weight: 600;
        }

        .db-valign-top {
          vertical-align: top;
          background: #ffffff; /* keep group spanning cells white */
        }
        
        .db-row-group-end td {
          border-bottom: 1.5px solid #cbd5e1 !important; /* Slightly thicker border between groups */
        }

        .db-text-right {
          text-align: right;
        }

        .db-total-label {
          text-transform: uppercase;
          font-size: 10px;
        }

        .db-bold {
          font-weight: 700;
        }
        
        .db-text-emerald {
          color: #10b981 !important; /* Emerald for positive */
        }
        
        .db-text-red {
          color: #ef4444 !important; /* Red for negative */
        }

        .db-empty-row {
          text-align: center;
          color: var(--c-text-subtle);
          font-style: italic;
          padding: 12px;
        }
        
        .db-truncate-account {
          max-width: 200px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* SIDEBAR (Controls) */
        .db-sidebar {
          width: 260px;
          flex-shrink: 0;
          background: var(--c-bg-card);
          border: 1px solid var(--c-border);
          border-radius: var(--radius-md);
          padding: 16px;
          position: sticky;
          top: 24px;
        }

        @media (max-width: 1024px) {
          .db-sidebar {
            width: 100%;
            position: static;
          }
        }

        .db-sidebar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--c-border);
          padding-bottom: 12px;
          margin-bottom: 12px;
        }

        .db-sidebar-header h2 {
          font-size: 16px;
          font-weight: 600;
          margin: 0;
        }

        .db-btn-print {
          background: var(--c-primary);
          color: white;
          border: none;
          padding: 6px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .db-btn-print:hover {
          background: var(--c-primary-dark);
        }

        .db-sidebar-hint {
          font-size: 12px;
          color: var(--c-text-muted);
          margin: 0 0 16px 0;
        }

        .db-checklist {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 60vh;
          overflow-y: auto;
        }

        .db-check-item {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 14px;
          color: var(--c-text);
          padding: 4px;
          border-radius: 4px;
        }
        
        .db-check-item:hover {
          background: var(--c-bg-input);
        }

        .db-check-item input {
          accent-color: var(--c-primary);
          width: 16px;
          height: 16px;
        }

        /* LOADING / ERROR */
        .db-loading, .db-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 0;
          color: var(--c-primary);
        }
        
        .db-error {
          color: var(--c-danger);
        }

        .db-spin {
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }
        
        @keyframes spin { 100% { transform: rotate(360deg); } }

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

          .no-print {
            display: none !important;
          }

          .print-only {
            display: block !important;
          }

          .db-wrapper {
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            display: block !important;
          }

          .db-main-page {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          
          .db-header {
            border-bottom: 2px solid black !important;
          }

          .db-brand {
            color: black !important;
          }
          
          .db-report-name, .db-print-date {
            color: black !important;
          }
          
          .db-section-title {
            color: black !important;
            border-bottom: 2px solid black !important;
          }

          .db-table {
            border: 1px solid black !important;
            color: black !important;
          }

          .db-table th, .db-table td {
            border: 1px solid black !important;
          }
          
          .db-row-group-end td {
            border-bottom: 1.5px solid black !important;
          }

          .db-table thead th {
            background: #fdfbf7 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .db-table tfoot {
            background: #f8fafc !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .db-text-emerald, .db-text-red {
            color: black !important;
          }
          
          /* Hide app sidebar */
          header, aside, nav, .sidebar { 
            display: none !important; 
          }
          main { 
            margin: 0 !important; 
            padding: 0 !important;
            width: 100% !important;
          }
        }
      `}} />
    </div>
  );
}
