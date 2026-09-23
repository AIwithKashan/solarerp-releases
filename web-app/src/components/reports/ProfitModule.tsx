'use client';

import { useState, useEffect } from 'react';
import { Calendar, Search, Printer, Download, LineChart, ArrowLeft, Loader2, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getProfitReport } from '@/app/reports/actions';
import { downloadCsv, triggerPrint, generateCsv } from '@/lib/exportUtils';
import type { ProfitReport } from '@/types/reports';

export default function ProfitModule({ 
  initialData, 
  defaultFrom,
  defaultTo
}: { 
  initialData: ProfitReport | null,
  defaultFrom: string,
  defaultTo: string
}) {
  const router = useRouter();
  
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [data, setData] = useState<ProfitReport | null>(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const result = await getProfitReport(fromDate, toDate);
    if (result.success) {
      setData(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!initialData) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExportCsv = () => {
    if (!data) return;
    
    const csvData = data.sales_breakdown.map(s => ({
      date: s.sale_date,
      invoice: s.invoice_no,
      customer: s.customer_name || 'Walk-in Customer',
      sales: s.net_total,
      cogs: s.cogs,
      profit: s.gross_profit
    }));

    csvData.push({
      date: '', invoice: 'PERIOD TOTALS' as any, customer: '',
      profit: data.gross_profit,
      cogs: data.cogs,
      sales: data.net_sales
    });

    const headers = ['Sale Date', 'Invoice No', 'Customer Name', 'Net Sales (Rs)', 'COGS (Rs)', 'Gross Profit (Rs)'];
    const csvString = generateCsv(headers, csvData, (row) => [
      row.date, row.invoice, row.customer, row.sales, row.cogs, row.profit
    ]);
    
    downloadCsv(csvString, `profit_report_${fromDate}_to_${toDate}.csv`);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 2 }).format(val);
  };

  return (
    <div className="animate-fade-in">
      {/* ─── Print Header ─── */}
      <div className="print-header" style={{ display: 'none' }}>
        <h1>AIwithKashan</h1>
        <p>Profit & Loss Report</p>
        <p>Period: {fromDate} to {toDate}</p>
      </div>

      {/* ─── Header & Filters ─── */}
      <div className="account-form" style={{ marginBottom: '24px' }}>
        <div className="form-header" style={{ alignItems: 'center' }}>
          <button 
            onClick={() => router.push('/reports')}
            className="btn-ghost-sm" 
            style={{ margin: '0 12px 0 0', width: '36px', height: '36px' }}
            title="Back to Reports"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="form-header-icon" style={{ background: 'color-mix(in srgb, #22c55e 15%, transparent)', color: '#22c55e' }}>
            <LineChart size={22} strokeWidth={2.5} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 className="form-title">Profit & Loss</h1>
            <p className="form-subtitle">Calculates Gross Profit (Sales - COGS) and Net Profit (Gross - Expenses).</p>
          </div>
          
          <div className="form-actions">
            <button className="btn-secondary" onClick={triggerPrint} disabled={loading || !data}>
              <Printer size={16} /> Print
            </button>
            <button className="btn-secondary" onClick={handleExportCsv} disabled={loading || !data}>
              <Download size={16} /> Export CSV
            </button>
          </div>
        </div>

        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div className="field-group">
            <label className="field-label">From Date</label>
            <div className="input-wrapper">
              <Calendar size={16} className="input-icon" />
              <input 
                type="date" 
                className="field-input" 
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
          </div>
          <div className="field-group">
            <label className="field-label">To Date</label>
            <div className="input-wrapper">
              <Calendar size={16} className="input-icon" />
              <input 
                type="date" 
                className="field-input" 
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>
          <div className="field-group" style={{ justifyContent: 'flex-end' }}>
            <button className="btn-primary" onClick={fetchData} disabled={loading} style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
              {loading ? <Loader2 size={18} className="spin" /> : <Search size={18} />}
              Filter Data
            </button>
          </div>
        </div>

        {error && (
          <div className="error-banner" style={{ marginTop: '16px' }}>
            {error}
          </div>
        )}
      </div>

      {/* ─── P&L Summary Cards ─── */}
      {data && (
        <div className="stats-bar" style={{ marginBottom: '24px' }}>
          <div className="stat-card" style={{ flex: 1, minWidth: '180px' }}>
            <div className="stat-icon" style={{ background: 'var(--c-primary-light)', color: 'var(--c-primary)' }}>
              <TrendingUp size={20} />
            </div>
            <div>
              <div className="stat-count">{formatCurrency(data.net_sales)}</div>
              <div className="stat-label">NET SALES</div>
            </div>
          </div>
          <div className="stat-card" style={{ flex: 1, minWidth: '180px' }}>
            <div className="stat-icon" style={{ background: 'var(--c-danger-light)', color: 'var(--c-danger)' }}>
              <TrendingDown size={20} />
            </div>
            <div>
              <div className="stat-count">{formatCurrency(data.cogs)}</div>
              <div className="stat-label">COGS (AVG COST)</div>
            </div>
          </div>
          <div className="stat-card stat-total" style={{ flex: 1, minWidth: '180px' }}>
            <div className="stat-icon" style={{ background: 'color-mix(in srgb, #f59e0b 20%, transparent)', color: '#d97706' }}>
              <DollarSign size={20} />
            </div>
            <div>
              <div className="stat-count" style={{ color: '#b45309' }}>{formatCurrency(data.gross_profit)}</div>
              <div className="stat-label" style={{ color: '#b45309', opacity: 0.8 }}>GROSS PROFIT</div>
            </div>
          </div>
          <div className="stat-card" style={{ flex: 1, minWidth: '180px' }}>
            <div className="stat-icon" style={{ background: 'var(--c-danger-light)', color: 'var(--c-danger)' }}>
              <TrendingDown size={20} />
            </div>
            <div>
              <div className="stat-count">{formatCurrency(data.expenses)}</div>
              <div className="stat-label">EXPENSES</div>
            </div>
          </div>
          <div className="stat-card stat-total" style={{ flex: 1.2, minWidth: '220px', background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(22,163,74,0.05))', borderColor: 'rgba(34,197,94,0.3)' }}>
            <div className="stat-icon" style={{ background: '#22c55e', color: '#fff', boxShadow: '0 4px 12px rgba(34,197,94,0.3)' }}>
              <LineChart size={20} />
            </div>
            <div>
              <div className="stat-count" style={{ color: '#15803d', fontSize: '1.6rem' }}>{formatCurrency(data.net_profit)}</div>
              <div className="stat-label" style={{ color: '#15803d', opacity: 0.9, fontWeight: 700 }}>NET PROFIT</div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Data Table ─── */}
      <div className="account-table-wrap">
        <div className="table-toolbar">
          <div className="toolbar-left">
            <h3 className="form-title" style={{ fontSize: '1rem' }}>Sales Breakdown</h3>
          </div>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th className="th-sortable" style={{ width: '120px' }}>Sale Date</th>
                <th className="th-sortable" style={{ width: '140px' }}>Invoice No</th>
                <th className="th-sortable">Customer Name</th>
                <th className="th-actions" style={{ width: '150px' }}>Net Sales (Rs)</th>
                <th className="th-actions" style={{ width: '150px' }}>COGS (Rs)</th>
                <th className="th-actions" style={{ width: '160px' }}>Gross Profit (Rs)</th>
              </tr>
            </thead>
            <tbody>
              {loading && !data ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>
                    <Loader2 size={24} className="spin" style={{ margin: '0 auto', color: 'var(--c-text-subtle)' }} />
                    <div style={{ marginTop: '8px', color: 'var(--c-text-muted)' }}>Calculating profit...</div>
                  </td>
                </tr>
              ) : data ? (
                <>
                  {data.sales_breakdown.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--c-text-subtle)' }}>
                        No sales found for this period.
                      </td>
                    </tr>
                  ) : (
                    data.sales_breakdown.map((s, idx) => (
                      <tr key={idx} className="data-row">
                        <td className="td-num" data-label="Sale Date" style={{ whiteSpace: 'nowrap' }}>{s.sale_date}</td>
                        <td data-label="Invoice No" style={{ fontWeight: 600 }}>{s.invoice_no}</td>
                        <td className="td-title" data-label="Customer">{s.customer_name || 'Walk-in Customer'}</td>
                        <td data-label="Net Sales (Rs)" style={{ textAlign: 'right', fontWeight: 500, color: 'var(--c-text)' }}>
                          {formatCurrency(s.net_total)}
                        </td>
                        <td data-label="COGS (Rs)" style={{ textAlign: 'right', fontWeight: 500, color: 'var(--c-danger)' }}>
                          {formatCurrency(s.cogs)}
                        </td>
                        <td data-label="Gross Profit (Rs)" style={{ textAlign: 'right', fontWeight: 600, color: s.gross_profit >= 0 ? '#b45309' : 'var(--c-danger)' }}>
                          {formatCurrency(s.gross_profit)}
                        </td>
                      </tr>
                    ))
                  )}

                  {/* Period Totals Row */}
                  <tr className="data-row" style={{ background: 'color-mix(in srgb, #f59e0b 10%, transparent)', fontWeight: 700, borderTop: '2px solid var(--c-border)' }}>
                    <td colSpan={3} style={{ textAlign: 'right', color: '#b45309' }}>TOTALS</td>
                    <td data-label="Net Sales" style={{ textAlign: 'right', color: 'var(--c-text)' }}>
                      {formatCurrency(data.net_sales)}
                    </td>
                    <td data-label="COGS" style={{ textAlign: 'right', color: 'var(--c-danger)' }}>
                      {formatCurrency(data.cogs)}
                    </td>
                    <td data-label="Gross Profit" style={{ textAlign: 'right', color: '#b45309' }}>
                      {formatCurrency(data.gross_profit)}
                    </td>
                  </tr>
                </>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
