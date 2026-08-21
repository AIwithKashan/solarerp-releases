'use client';

import { useState, useEffect } from 'react';
import { Calendar, Search, Printer, Download, ShoppingCart, ArrowLeft, Loader2, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getPurchasesReport } from '@/app/reports/actions';
import { downloadCsv, triggerPrint, generateCsv } from '@/lib/exportUtils';

export default function PurchaseModule({ 
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
    const result = await getPurchasesReport(fromDate, toDate);
    if (result.success) {
      setData(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleExportCsv = () => {
    const csvData = data.map(p => ({
      date: p.purchase_date,
      invoice: p.invoice_no,
      supplier: p.supplier_name,
      item: `${p.item_name} ${p.power_watt ? `(${p.power_watt}W)` : ''}`,
      qty: `${p.quantity} ${p.accounting_unit}`,
      rate: p.rate,
      amount: p.amount
    }));

    csvData.push({
      date: '', invoice: 'TOTAL PURCHASES' as any, supplier: '', item: '', qty: '', rate: 0,
      amount: totalAmount
    });

    const headers = ['Purchase Date', 'Invoice No', 'Supplier', 'Item', 'Quantity', 'Rate (Rs)', 'Amount (Rs)'];
    const csvString = generateCsv(headers, csvData, (row) => [
      row.date, row.invoice, row.supplier, row.item, row.qty, row.rate, row.amount
    ]);
    
    downloadCsv(csvString, `purchases_report_${fromDate}_to_${toDate}.csv`);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 2 }).format(val);
  };

  const totalAmount = data.reduce((sum, item) => sum + Number(item.amount), 0);

  return (
    <div className="animate-fade-in">
      <div className="print-header" style={{ display: 'none' }}>
        <h1>AIwithKashan</h1>
        <p>Purchases Report</p>
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
          <div className="form-header-icon" style={{ background: 'color-mix(in srgb, #f59e0b 15%, transparent)', color: '#f59e0b' }}>
            <ShoppingCart size={22} strokeWidth={2.5} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 className="form-title">Purchases Report</h1>
            <p className="form-subtitle">Detailed history of inventory acquisitions.</p>
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
            <button className="btn-primary" onClick={fetchData} disabled={loading} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
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
        <div className="stat-card stat-total" style={{ flex: 1, background: 'color-mix(in srgb, #f59e0b 15%, transparent)', borderColor: 'color-mix(in srgb, #f59e0b 30%, transparent)' }}>
          <div className="stat-icon" style={{ background: '#f59e0b', color: '#fff' }}>
            <TrendingUp size={20} />
          </div>
          <div>
            <div className="stat-count" style={{ color: '#b45309' }}>{formatCurrency(totalAmount)}</div>
            <div className="stat-label" style={{ color: '#b45309', opacity: 0.8 }}>TOTAL PURCHASES</div>
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
                <th className="th-sortable" style={{ width: '180px' }}>Supplier</th>
                <th className="th-sortable">Item</th>
                <th className="th-sortable" style={{ width: '120px', textAlign: 'center' }}>Qty</th>
                <th className="th-actions" style={{ width: '120px' }}>Rate (Rs)</th>
                <th className="th-actions" style={{ width: '140px' }}>Amount (Rs)</th>
              </tr>
            </thead>
            <tbody>
              {loading && data.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                    <Loader2 size={24} className="spin" style={{ margin: '0 auto', color: 'var(--c-text-subtle)' }} />
                    <div style={{ marginTop: '8px', color: 'var(--c-text-muted)' }}>Loading purchases...</div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--c-text-subtle)' }}>
                    No purchases found for this period.
                  </td>
                </tr>
              ) : (
                <>
                  {data.map((p, idx) => (
                    <tr key={idx} className="data-row">
                      <td className="td-num" style={{ whiteSpace: 'nowrap' }}>{p.purchase_date}</td>
                      <td style={{ fontWeight: 500 }}>{p.invoice_no}</td>
                      <td className="td-title">{p.supplier_name}</td>
                      <td>
                        {p.item_name}
                        {p.power_watt > 0 && <span style={{ color: 'var(--c-text-muted)', marginLeft: '8px', fontSize: '0.85rem' }}>({p.power_watt}W)</span>}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {p.quantity} <span style={{ color: 'var(--c-text-muted)', fontSize: '0.85em' }}>{p.accounting_unit}</span>
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--c-text-muted)' }}>{formatCurrency(p.rate)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--c-text)' }}>{formatCurrency(p.amount)}</td>
                    </tr>
                  ))}
                  <tr className="data-row" style={{ background: 'color-mix(in srgb, #f59e0b 10%, transparent)', fontWeight: 700, borderTop: '2px solid var(--c-border)' }}>
                    <td colSpan={6} style={{ textAlign: 'right', color: '#b45309' }}>TOTAL PURCHASES</td>
                    <td style={{ textAlign: 'right', color: '#b45309' }}>{formatCurrency(totalAmount)}</td>
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
