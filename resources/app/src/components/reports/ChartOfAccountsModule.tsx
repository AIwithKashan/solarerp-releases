'use client';

import { useState, useEffect } from 'react';
import { Calendar, Printer, Loader2, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AccountItem {
  title: string;
  debit: number;
  credit: number;
  balance: number;
}

interface AccountGroup {
  items: AccountItem[];
  total: number;
}

interface Financials {
  totalAssets: number;
  totalLiabilities: number;
  maliat: number;
  openingInvestment: number;
  growth: number;
}

interface ChartOfAccountsData {
  businessName: string;
  totalSales: number;
  totalPurchases: number;
  inventoryValue: number;
  groups: {
    cash: AccountGroup;
    bank: AccountGroup;
    suppliers: AccountGroup;
    customers: AccountGroup;
    staff: AccountGroup;
    expenses: AccountGroup;
    investors: AccountGroup;
    assets: AccountGroup;
  };
  financials: Financials;
}

const SECTIONS = [
  { id: 'sales', label: 'Sale Accounts' },
  { id: 'purchases', label: 'Purchase Accounts' },
  { id: 'suppliers', label: 'Supplier Accounts' },
  { id: 'cash', label: 'Cash Account' },
  { id: 'bank', label: 'Bank Accounts' },
  { id: 'expenses', label: 'Expense Accounts' },
  { id: 'customers', label: 'Customer / Receivable' },
  { id: 'assets', label: 'Assets & Property' },
  { id: 'staff', label: 'Staff Accounts' },
  { id: 'investors', label: 'Investors / Equity' },
];

export default function ChartOfAccountsModule({ defaultDate }: { defaultDate: string }) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const [data, setData] = useState<ChartOfAccountsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [visibleSections, setVisibleSections] = useState<Record<string, boolean>>(
    SECTIONS.reduce((acc, s) => ({ ...acc, [s.id]: true }), {})
  );

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate]);

  const fetchData = async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/chart-of-accounts?date=${date}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || 'Failed to fetch chart of accounts');
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
    return new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.abs(val) || 0);
  };

  const toggleSection = (id: string) => {
    setVisibleSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleCollapse = (id: string) => {
    setCollapsedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderAccountGroup = (
    id: string,
    title: string,
    group: AccountGroup | undefined,
    inverseBalanceColor: boolean = false
  ) => {
    if (!visibleSections[id]) return null;
    const isCollapsed = collapsedSections[id];
    
    // For standard accounts (Assets, Expenses), positive balance is Debit (Emerald), negative is Credit (Red)
    // For inverse accounts (Liabilities, Equity, Revenue), we still use the raw balance, but we might want to color them differently based on business logic. 
    // In our system, balance = debit - credit.
    // So for Suppliers, a negative balance means we owe them (Liability, Red).
    // For Customers, a positive balance means they owe us (Asset, Emerald).
    // It naturally fits the Red = Liability, Emerald = Asset logic.

    const items = group?.items || [];
    const total = group?.total || 0;

    return (
      <div className="coa-section">
        <div 
          className="coa-section-header no-print-interactive" 
          onClick={() => toggleCollapse(id)}
        >
          <h3 className="coa-section-title">{title}</h3>
          <div className="coa-section-controls">
            <span className={`coa-group-total ${total > 0 ? 'coa-text-emerald' : total < 0 ? 'coa-text-red' : ''}`}>
              Net: {total < 0 ? '-' : ''}{formatCurrency(total)}
            </span>
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </div>
        </div>

        {!isCollapsed && (
          <table className="coa-table">
            <thead>
              <tr>
                <th>Account Name</th>
                <th className="coa-text-right">Debit</th>
                <th className="coa-text-right">Credit</th>
                <th className="coa-text-right">Net Balance</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((row, i) => (
                  <tr key={i}>
                    <td>{row.title}</td>
                    <td className="coa-text-right">{row.debit > 0 ? formatCurrency(row.debit) : '-'}</td>
                    <td className="coa-text-right">{row.credit > 0 ? formatCurrency(row.credit) : '-'}</td>
                    <td className={`coa-text-right coa-bold ${row.balance > 0 ? 'coa-text-emerald' : row.balance < 0 ? 'coa-text-red' : ''}`}>
                      {row.balance < 0 ? '-' : ''}{formatCurrency(row.balance)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="coa-empty-row">No accounts found in this category</td>
                </tr>
              )}
            </tbody>
            {items.length > 0 && (
              <tfoot>
                <tr>
                  <td className="coa-text-right coa-total-label" colSpan={3}>Subtotal</td>
                  <td className={`coa-text-right coa-bold ${total > 0 ? 'coa-text-emerald' : total < 0 ? 'coa-text-red' : ''}`}>
                    {total < 0 ? '-' : ''}{formatCurrency(total)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
    );
  };

  const renderSimpleRow = (id: string, title: string, amount: number, colorType: 'asset' | 'liability') => {
    if (!visibleSections[id]) return null;
    const isCollapsed = collapsedSections[id];
    return (
      <div className="coa-section">
        <div 
          className="coa-section-header no-print-interactive" 
          onClick={() => toggleCollapse(id)}
        >
          <h3 className="coa-section-title">{title}</h3>
          <div className="coa-section-controls">
            <span className={`coa-group-total ${colorType === 'asset' ? 'coa-text-emerald' : 'coa-text-red'}`}>
              Net: {formatCurrency(amount)}
            </span>
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </div>
        </div>

        {!isCollapsed && (
          <table className="coa-table">
            <thead>
              <tr>
                <th>Description</th>
                <th className="coa-text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{title} Aggregated Total</td>
                <td className={`coa-text-right coa-bold ${colorType === 'asset' ? 'coa-text-emerald' : 'coa-text-red'}`}>
                  {formatCurrency(amount)}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    );
  };

  return (
    <div className="coa-wrapper">
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

      {/* Main Page Area */}
      <div className="coa-main-page">
        
        {/* Header */}
        <div className="coa-header">
          <div>
            <h1 className="coa-brand">{data?.businessName || 'Loading...'}</h1>
            <p className="coa-report-name">Chart of Accounts — Consolidated Statement</p>
          </div>
          <div className="coa-date-picker-wrap">
            <div className="coa-date-picker no-print">
              <Calendar size={16} />
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="coa-print-date print-only">
              As of: {new Date(selectedDate).toLocaleDateString('en-GB')}
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="coa-loading no-print">
            <Loader2 size={32} className="coa-spin" />
            <p>Compiling Financials...</p>
          </div>
        ) : error ? (
          <div className="coa-error no-print">{error}</div>
        ) : data ? (
          <div className="coa-content">
            
            {/* Top Summary Cards */}
            <div className="coa-summary-grid">
              <div className="coa-summary-card coa-card-assets">
                <h4>Total Assets</h4>
                <div className="coa-value">{formatCurrency(data.financials.totalAssets)}</div>
                <div className="coa-subtitle">Cash, Bank, Stock, Receivables</div>
              </div>
              <div className="coa-summary-card coa-card-liabilities">
                <h4>Total Liabilities</h4>
                <div className="coa-value">{formatCurrency(data.financials.totalLiabilities)}</div>
                <div className="coa-subtitle">Payables & Debts</div>
              </div>
              <div className="coa-summary-card coa-card-maliat">
                <h4>Grand Total (Maliat)</h4>
                <div className="coa-value">{formatCurrency(data.financials.maliat)}</div>
                <div className="coa-subtitle">Net Worth</div>
              </div>
            </div>

            {/* Growth Indicator */}
            {data.financials.openingInvestment > 0 && (
              <div className="coa-growth-banner">
                <span><strong>Opening Investment:</strong> {formatCurrency(data.financials.openingInvestment)}</span>
                <span className="coa-growth-divider">|</span>
                <span>
                  <strong>Growth (Profit/Loss):</strong> 
                  <span className={data.financials.growth >= 0 ? 'coa-text-emerald' : 'coa-text-red'} style={{ marginLeft: '8px', fontWeight: 'bold' }}>
                    {data.financials.growth >= 0 ? '+' : '-'}{formatCurrency(data.financials.growth)}
                  </span>
                </span>
              </div>
            )}

            <div className="coa-sections-list">
              {renderSimpleRow('sales', 'Sale Accounts (Revenue)', data.totalSales, 'asset')}
              {renderSimpleRow('purchases', 'Purchase Accounts (COGS)', data.totalPurchases, 'liability')}
              
              {renderAccountGroup('suppliers', 'Supplier Accounts (Payables)', data.groups.suppliers)}
              {renderAccountGroup('cash', 'Cash Account', data.groups.cash)}
              {renderAccountGroup('bank', 'Bank Accounts', data.groups.bank)}
              {renderAccountGroup('expenses', 'Expense Accounts', data.groups.expenses)}
              
              {renderAccountGroup('customers', 'Customer Accounts (Receivables)', data.groups.customers)}
              {renderSimpleRow('inventory', 'Inventory / Stock Value', data.inventoryValue, 'asset')}
              
              {renderAccountGroup('assets', 'Fixed Assets & Property', data.groups.assets)}
              {renderAccountGroup('staff', 'Staff Accounts', data.groups.staff)}
              {renderAccountGroup('investors', 'Investors / Equity', data.groups.investors)}
            </div>

          </div>
        ) : null}
      </div>

      {/* Right-Side Control Panel */}
      <div className="coa-sidebar no-print">
        <div className="coa-sidebar-header">
          <h2>View Options</h2>
          <button onClick={handlePrint} className="coa-btn-print" title="Print / Save PDF">
            <Printer size={16} />
          </button>
        </div>
        
        <p className="coa-sidebar-hint">Toggle sections to show/hide in the report.</p>
        
        <div className="coa-checklist">
          {SECTIONS.map(section => (
            <label key={section.id} className="coa-check-item">
              <input 
                type="checkbox"
                checked={visibleSections[section.id]}
                onChange={() => toggleSection(section.id)}
              />
              <span>{section.label}</span>
            </label>
          ))}
          <label className="coa-check-item">
            <input 
              type="checkbox"
              checked={visibleSections['inventory'] ?? true}
              onChange={() => toggleSection('inventory')}
            />
            <span>Inventory / Stock Value</span>
          </label>
        </div>
      </div>
      
      {/* ─── STYLES (Dense Emerald + Slate Accounting Theme) ─── */}
      <style dangerouslySetInnerHTML={{__html: `
        .coa-wrapper {
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
          .coa-wrapper {
            flex-direction: column;
          }
        }

        /* MAIN PAGE (A4 Simulator) */
        .coa-main-page {
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
        .coa-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          border-bottom: 2px solid var(--c-text);
          padding-bottom: 16px;
          margin-bottom: 24px;
        }

        .coa-brand {
          font-size: 24px;
          font-weight: 900;
          color: var(--c-primary-dark);
          text-transform: uppercase;
          letter-spacing: -0.5px;
          margin: 0 0 4px 0;
        }

        .coa-report-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--c-text-muted);
          text-transform: uppercase;
          margin: 0;
        }

        .coa-date-picker-wrap {
          text-align: right;
        }

        .coa-date-picker {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--c-text-muted);
          margin-bottom: 8px;
        }

        .coa-date-picker input {
          background: transparent;
          border: 1px solid var(--c-border);
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 14px;
          color: var(--c-text);
          outline: none;
        }

        .coa-print-date {
          display: none;
          font-size: 14px;
          font-weight: bold;
        }

        /* SUMMARY CARDS */
        .coa-summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 20px;
        }
        
        .coa-summary-card {
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          text-align: center;
          background: #ffffff;
        }

        .coa-summary-card h4 {
          margin: 0 0 8px 0;
          font-size: 12px;
          text-transform: uppercase;
          color: var(--c-text-muted);
          letter-spacing: 0.05em;
        }

        .coa-value {
          font-size: 22px;
          font-weight: 800;
          margin-bottom: 4px;
        }

        .coa-subtitle {
          font-size: 10px;
          color: var(--c-text-subtle);
        }

        .coa-card-assets {
          border-top: 4px solid #10b981; /* Emerald */
        }
        .coa-card-assets .coa-value {
          color: #10b981;
        }

        .coa-card-liabilities {
          border-top: 4px solid #ef4444; /* Red */
        }
        .coa-card-liabilities .coa-value {
          color: #ef4444;
        }

        .coa-card-maliat {
          background: #f0fdf4; /* Light Emerald */
          border: 2px solid #10b981;
        }
        .coa-card-maliat .coa-value {
          color: #047857; /* Dark Emerald */
          font-size: 26px;
        }

        .coa-growth-banner {
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          padding: 12px 16px;
          border-radius: 6px;
          margin-bottom: 24px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          font-size: 13px;
        }

        .coa-growth-divider {
          color: #94a3b8;
        }

        /* SECTIONS & TABLES */
        .coa-sections-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .coa-section {
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
          page-break-inside: avoid;
        }

        .coa-section-header {
          background: #f8fafc;
          padding: 8px 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .no-print-interactive {
          cursor: pointer;
          user-select: none;
        }
        
        .no-print-interactive:hover {
          background: #f1f5f9;
        }

        .coa-section-title {
          font-size: 12px;
          font-weight: 700;
          color: var(--c-text);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0;
        }

        .coa-section-controls {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .coa-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px; /* DENSE DATA SIZE */
          text-align: left;
          background: white;
        }

        .coa-table th, .coa-table td {
          padding: 6px 8px;
          border-top: 1px solid #e2e8f0; 
        }
        
        .coa-table th:not(:last-child), .coa-table td:not(:last-child) {
          border-right: 1px dashed #e2e8f0;
        }

        .coa-table thead th {
          background: #fdfbf7; /* Subtle beige background */
          font-weight: 600;
          color: var(--c-text);
          border-top: none;
          border-bottom: 2px solid #e2e8f0;
        }

        .coa-table tfoot td {
          background: #f8fafc;
          font-weight: 700;
          border-top: 2px solid #e2e8f0;
        }

        .coa-text-right { text-align: right; }
        .coa-total-label { text-transform: uppercase; font-size: 10px; }
        .coa-bold { font-weight: 700; }
        .coa-text-emerald { color: #10b981 !important; }
        .coa-text-red { color: #ef4444 !important; }

        .coa-empty-row {
          text-align: center;
          color: var(--c-text-subtle);
          font-style: italic;
          padding: 12px !important;
        }

        /* SIDEBAR (Controls) */
        .coa-sidebar {
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
          .coa-sidebar {
            width: 100%;
            position: static;
          }
        }

        .coa-sidebar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--c-border);
          padding-bottom: 12px;
          margin-bottom: 12px;
        }

        .coa-sidebar-header h2 {
          font-size: 16px;
          font-weight: 600;
          margin: 0;
        }

        .coa-btn-print {
          background: var(--c-primary);
          color: white;
          border: none;
          padding: 6px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .coa-btn-print:hover {
          background: var(--c-primary-dark);
        }

        .coa-sidebar-hint {
          font-size: 12px;
          color: var(--c-text-muted);
          margin: 0 0 16px 0;
        }

        .coa-checklist {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 60vh;
          overflow-y: auto;
        }

        .coa-check-item {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 13px;
          color: var(--c-text);
          padding: 4px;
          border-radius: 4px;
        }
        
        .coa-check-item:hover {
          background: var(--c-bg-input);
        }

        .coa-check-item input {
          accent-color: var(--c-primary);
          width: 14px;
          height: 14px;
        }

        /* LOADING / ERROR */
        .coa-loading, .coa-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 0;
          color: var(--c-primary);
        }
        
        .coa-error { color: var(--c-danger); }
        .coa-spin { animation: spin 1s linear infinite; margin-bottom: 16px; }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        /* ─── PRINT OPTIMIZATIONS ─── */
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          
          body, html {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .no-print { display: none !important; }
          .print-only { display: block !important; }

          .coa-wrapper {
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            display: block !important;
          }

          .coa-main-page {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          
          .coa-header { border-bottom: 2px solid black !important; }
          .coa-brand, .coa-report-name, .coa-print-date { color: black !important; }
          
          .coa-summary-grid {
            margin-bottom: 16px !important;
          }

          .coa-summary-card {
            border: 1px solid #000 !important;
          }
          
          .coa-card-maliat {
            border: 2px solid #000 !important;
            background: white !important;
          }

          .coa-growth-banner {
            border: 1px solid #000 !important;
            background: white !important;
            color: black !important;
          }

          .coa-section {
            border: 1px solid black !important;
            margin-bottom: 12px !important;
          }

          .coa-section-header {
            background: #fdfbf7 !important;
            border-bottom: 1px solid black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .coa-section-title, .coa-group-total {
            color: black !important;
          }

          .coa-table {
            border-collapse: collapse !important;
            color: black !important;
          }

          .coa-table th, .coa-table td {
            border-top: 1px solid black !important;
            border-right: 1px dotted black !important;
          }
          .coa-table th:last-child, .coa-table td:last-child {
            border-right: none !important;
          }

          .coa-table thead th {
            background: #fdfbf7 !important;
            border-bottom: 2px solid black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .coa-table tfoot td {
            border-top: 2px solid black !important;
          }
          
          /* Uncollapse all sections for printing */
          .coa-table { display: table !important; }
          .coa-section-controls svg { display: none !important; }
          
          /* Colors for print */
          .coa-text-emerald, .coa-text-red {
            color: black !important; 
          }

          /* Hide app sidebar */
          header, aside, nav, .sidebar { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; width: 100% !important; }
        }
      `}} />
    </div>
  );
}
