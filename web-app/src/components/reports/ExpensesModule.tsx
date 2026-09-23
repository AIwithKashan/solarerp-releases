'use client';

import { useState, useEffect } from 'react';
import { Calendar, Search, Printer, Download, Receipt, ArrowLeft, Loader2, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getExpensesReport } from '@/app/reports/actions';
import { downloadCsv, triggerPrint, generateCsv } from '@/lib/exportUtils';
import type { UnifiedTransaction } from '@/types/reports';

export default function ExpensesModule({ 
  initialData, 
  defaultFrom,
  defaultTo
}: { 
  initialData: UnifiedTransaction[],
  defaultFrom: string,
  defaultTo: string
}) {
  const router = useRouter();
  
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [data, setData] = useState<UnifiedTransaction[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const result = await getExpensesReport(fromDate, toDate);
    if (result.success) {
      setData(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleExportCsv = () => {
    const csvData = data.map(t => ({
      date: t.txn_date,
      type: t.source_type,
      ref: t.ref_no,
      account: t.account_name,
      description: t.description,
      amount: t.debit - t.credit // Net Expense Amount
    }));

    const totalExpense = csvData.reduce((sum, row) => sum + row.amount, 0);

    csvData.push({
      date: '', type: 'TOTAL EXPENSES' as any, ref: '', account: '', description: '',
      amount: totalExpense
    });

    const headers = ['Date', 'Source', 'Ref No', 'Expense Account', 'Description', 'Net Amount (Rs)'];
    const csvString = generateCsv(headers, csvData, (row) => [
      row.date, row.type, row.ref, row.account, row.description, row.amount
    ]);
    
    downloadCsv(csvString, `expenses_report_${fromDate}_to_${toDate}.csv`);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 2 }).format(val);
  };

  const totalExpense = data.reduce((sum, item) => sum + (item.debit - item.credit), 0);

  return (
    <div className="animate-fade-in">
      {/* ─── Print Header ─── */}
      <div className="print-header" style={{ display: 'none' }}>
        <h1>AIwithKashan</h1>
        <p>Expenses Report</p>
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
          <div className="form-header-icon" style={{ background: 'var(--c-danger-light)', color: 'var(--c-danger)' }}>
            <Receipt size={22} strokeWidth={2.5} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 className="form-title">Expenses Report</h1>
            <p className="form-subtitle">Detailed breakdown of all operational expenses.</p>
          </div>
          
          <div className="form-actions">
            <button className="btn-secondary" onClick={triggerPrint} disabled={loading || data.length === 0}>
              <Printer size={16} /> Print
            </button>
            <button className="btn-secondary" onClick={handleExportCsv} disabled={loading || data.length === 0}>
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
            <button className="btn-primary" onClick={fetchData} disabled={loading} style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
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

      {/* ─── Summary Cards ─── */}
      <div className="stats-bar" style={{ marginBottom: '24px' }}>
        <div className="stat-card stat-total" style={{ flex: 1, background: 'var(--c-danger-light)', borderColor: 'rgba(239,68,68,0.3)' }}>
          <div className="stat-icon" style={{ background: 'var(--c-danger)', color: '#fff' }}>
            <TrendingUp size={20} />
          </div>
          <div>
            <div className="stat-count" style={{ color: '#991b1b' }}>{formatCurrency(totalExpense)}</div>
            <div className="stat-label" style={{ color: '#991b1b', opacity: 0.8 }}>TOTAL EXPENSES</div>
          </div>
        </div>
      </div>

      {/* ─── Data Table ─── */}
      <div className="account-table-wrap">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th className="th-sortable" style={{ width: '100px' }}>Date</th>
                <th className="th-sortable" style={{ width: '140px' }}>Source</th>
                <th className="th-sortable" style={{ width: '120px' }}>Ref No</th>
                <th className="th-sortable" style={{ width: '180px' }}>Expense Account</th>
                <th className="th-sortable">Description</th>
                <th className="th-actions" style={{ width: '160px' }}>Net Amount (Rs)</th>
              </tr>
            </thead>
            <tbody>
              {loading && data.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>
                    <Loader2 size={24} className="spin" style={{ margin: '0 auto', color: 'var(--c-text-subtle)' }} />
                    <div style={{ marginTop: '8px', color: 'var(--c-text-muted)' }}>Loading expenses...</div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--c-text-subtle)' }}>
                    No expenses found for this period.
                  </td>
                </tr>
              ) : (
                <>
                  {data.map((t, idx) => {
                    const netAmount = t.debit - t.credit;
                    return (
                      <tr key={`${t.source_id}-${idx}`} className="data-row">
                        <td className="td-num" data-label="Date" style={{ whiteSpace: 'nowrap' }}>{t.txn_date}</td>
                        <td data-label="Source">
                          <span className="type-badge" style={{ '--badge-color': '#ef4444' } as any}>
                            {t.source_type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td data-label="Ref No" style={{ fontWeight: 500 }}>{t.ref_no || '-'}</td>
                        <td className="td-title" data-label="Expense Account">{t.account_name}</td>
                        <td data-label="Description" style={{ color: 'var(--c-text-muted)', fontSize: '0.85rem' }}>{t.description || '-'}</td>
                        <td data-label="Net Amount (Rs)" style={{ textAlign: 'right', fontWeight: 600, color: netAmount > 0 ? 'var(--c-danger)' : 'var(--c-text-subtle)' }}>
                          {formatCurrency(netAmount)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Period Totals Row */}
                  <tr className="data-row" style={{ background: 'var(--c-danger-light)', fontWeight: 700, borderTop: '2px solid var(--c-border)' }}>
                    <td colSpan={5} style={{ textAlign: 'right', color: '#991b1b' }}>TOTAL EXPENSES</td>
                    <td data-label="Total Expenses" style={{ textAlign: 'right', color: 'var(--c-danger)' }}>
                      {formatCurrency(totalExpense)}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
