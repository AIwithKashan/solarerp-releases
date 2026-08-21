'use client';

import { useState, useEffect } from 'react';
import { Calendar, Search, Printer, Download, TrendingUp, ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getSalesReport } from '@/app/reports/actions';
import { downloadCsv, triggerPrint, generateCsv } from '@/lib/exportUtils';

export default function SaleModule({ 
  initialData, 
  defaultFrom,
  defaultTo
}: { 
  initialData: any[],
  defaultFrom: string,
  defaultTo: string
}) {
  const router = useRouter();
  
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [data, setData] = useState<any[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const result = await getSalesReport(fromDate, toDate);
    if (result.success) {
      setData(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleExportCsv = () => {
    const csvData = data.map(s => ({
      date: s.sale_date,
      invoice: s.invoice_no,
      customer: s.customer_name || 'Walk-in Customer',
      subtotal: s.subtotal,
      discount: s.discount_amount,
      net: s.net_total
    }));

    csvData.push({
      date: '', invoice: 'TOTAL SALES' as any, customer: '',
      subtotal: totals.subtotal,
      discount: totals.discount,
      net: totals.net
    });

    const headers = ['Sale Date', 'Invoice No', 'Customer Name', 'Subtotal (Rs)', 'Discount (Rs)', 'Net Total (Rs)'];
    const csvString = generateCsv(headers, csvData, (row) => [
      row.date, row.invoice, row.customer, row.subtotal, row.discount, row.net
    ]);
    
    downloadCsv(csvString, `sales_report_${fromDate}_to_${toDate}.csv`);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 2 }).format(val);
  };

  const totals = data.reduce((acc, item) => {
    acc.subtotal += Number(item.subtotal || 0);
    acc.discount += Number(item.discount_amount || 0);
    acc.net += Number(item.net_total || 0);
    return acc;
  }, { subtotal: 0, discount: 0, net: 0 });

  return (
    <div className="animate-fade-in">
      <div className="print-header" style={{ display: 'none' }}>
        <h1>AIwithKashan</h1>
        <p>Sales Report</p>
        <p>Period: {fromDate} to {toDate}</p>
      </div>

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
          <div className="form-header-icon" style={{ background: 'color-mix(in srgb, #ec4899 15%, transparent)', color: '#ec4899' }}>
            <TrendingUp size={22} strokeWidth={2.5} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 className="form-title">Sales Report</h1>
            <p className="form-subtitle">Comprehensive sales history including discounts and net totals.</p>
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
            <button className="btn-primary" onClick={fetchData} disabled={loading} style={{ background: 'linear-gradient(135deg, #ec4899, #be185d)' }}>
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

      <div className="stats-bar" style={{ marginBottom: '24px' }}>
        <div className="stat-card stat-total" style={{ flex: 1, background: 'color-mix(in srgb, #ec4899 15%, transparent)', borderColor: 'color-mix(in srgb, #ec4899 30%, transparent)' }}>
          <div className="stat-icon" style={{ background: '#ec4899', color: '#fff' }}>
            <TrendingUp size={20} />
          </div>
          <div>
            <div className="stat-count" style={{ color: '#be185d' }}>{formatCurrency(totals.net)}</div>
            <div className="stat-label" style={{ color: '#be185d', opacity: 0.8 }}>TOTAL NET SALES</div>
          </div>
        </div>
      </div>

      <div className="account-table-wrap">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th className="th-sortable" style={{ width: '100px' }}>Date</th>
                <th className="th-sortable" style={{ width: '120px' }}>Invoice No</th>
                <th className="th-sortable">Customer</th>
                <th className="th-actions" style={{ width: '140px' }}>Subtotal (Rs)</th>
                <th className="th-actions" style={{ width: '140px' }}>Discount (Rs)</th>
                <th className="th-actions" style={{ width: '140px' }}>Net Total (Rs)</th>
              </tr>
            </thead>
            <tbody>
              {loading && data.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>
                    <Loader2 size={24} className="spin" style={{ margin: '0 auto', color: 'var(--c-text-subtle)' }} />
                    <div style={{ marginTop: '8px', color: 'var(--c-text-muted)' }}>Loading sales...</div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--c-text-subtle)' }}>
                    No sales found for this period.
                  </td>
                </tr>
              ) : (
                <>
                  {data.map((s, idx) => (
                    <tr key={idx} className="data-row">
                      <td className="td-num" style={{ whiteSpace: 'nowrap' }}>{s.sale_date}</td>
                      <td style={{ fontWeight: 500 }}>{s.invoice_no}</td>
                      <td className="td-title">{s.customer_name || 'Walk-in Customer'}</td>
                      <td style={{ textAlign: 'right', color: 'var(--c-text-muted)' }}>{formatCurrency(s.subtotal)}</td>
                      <td style={{ textAlign: 'right', color: 'var(--c-danger)' }}>{s.discount_amount > 0 ? formatCurrency(s.discount_amount) : '-'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--c-text)' }}>{formatCurrency(s.net_total)}</td>
                    </tr>
                  ))}
                  <tr className="data-row" style={{ background: 'color-mix(in srgb, #ec4899 10%, transparent)', fontWeight: 700, borderTop: '2px solid var(--c-border)' }}>
                    <td colSpan={3} style={{ textAlign: 'right', color: '#be185d' }}>TOTAL SALES</td>
                    <td style={{ textAlign: 'right', color: 'var(--c-text-muted)' }}>{formatCurrency(totals.subtotal)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--c-danger)' }}>{formatCurrency(totals.discount)}</td>
                    <td style={{ textAlign: 'right', color: '#be185d' }}>{formatCurrency(totals.net)}</td>
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
