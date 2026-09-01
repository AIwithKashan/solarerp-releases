'use client';

import { useState, useEffect } from 'react';
import { Search, Printer, Download, PackageSearch, ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getStockReport } from '@/app/reports/actions';
import { downloadCsv, triggerPrint, generateCsv } from '@/lib/exportUtils';

interface StockData {
  item_name: string;
  power_watt: number;
  accounting_unit: string;
  total_in: number;
  total_out: number;
  current_stock: number;
  avg_cost: number;
  stock_value: number;
}

export default function StockModule({ 
  initialData
}: { 
  initialData: StockData[]
}) {
  const router = useRouter();
  
  const [data, setData] = useState<StockData[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const result = await getStockReport();
    if (result.success) {
      setData(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleExportCsv = () => {
    const csvData = data.map(s => ({
      item: `${s.item_name} ${s.power_watt ? `(${s.power_watt}W)` : ''}`,
      unit: s.accounting_unit,
      in: s.total_in,
      out: s.total_out,
      stock: s.current_stock,
      avg: s.avg_cost,
      value: s.stock_value
    }));

    csvData.push({
      item: 'TOTAL INVENTORY VALUE' as any,
      unit: '',
      in: 0 as any, out: 0 as any, stock: 0 as any, avg: 0 as any,
      value: totalValue
    });


    const headers = ['Item Name', 'Unit', 'Total In', 'Total Out', 'Current Stock', 'Avg Cost (Rs)', 'Stock Value (Rs)'];
    const csvString = generateCsv(headers, csvData, (row) => [
      row.item, row.unit, row.in, row.out, row.stock, row.avg, row.value
    ]);
    
    downloadCsv(csvString, `stock_report_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 2 }).format(val);
  };

  const totalValue = data.reduce((sum, item) => sum + item.stock_value, 0);

  return (
    <div className="animate-fade-in">
      <div className="print-header" style={{ display: 'none' }}>
        <h1>AIwithKashan</h1>
        <p>Stock Valuation Report</p>
        <p>Date: {new Date().toLocaleDateString()}</p>
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
          <div className="form-header-icon" style={{ background: 'color-mix(in srgb, #14b8a6 15%, transparent)', color: '#14b8a6' }}>
            <PackageSearch size={22} strokeWidth={2.5} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 className="form-title">Stock in Store</h1>
            <p className="form-subtitle">Current inventory valuation using average cost method.</p>
          </div>
          
          <div className="form-actions">
            <button className="btn-secondary" onClick={fetchData} disabled={loading}>
              <Search size={16} /> Refresh
            </button>
            <button className="btn-secondary" onClick={triggerPrint} disabled={loading || data.length === 0}>
              <Printer size={16} /> Print
            </button>
            <button className="btn-secondary" onClick={handleExportCsv} disabled={loading || data.length === 0}>
              <Download size={16} /> Export CSV
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
        <div className="stat-card stat-total" style={{ flex: 1, background: 'color-mix(in srgb, #14b8a6 15%, transparent)', borderColor: 'color-mix(in srgb, #14b8a6 30%, transparent)' }}>
          <div className="stat-icon" style={{ background: '#14b8a6', color: '#fff' }}>
            <PackageSearch size={20} />
          </div>
          <div>
            <div className="stat-count" style={{ color: '#0f766e' }}>{formatCurrency(totalValue)}</div>
            <div className="stat-label" style={{ color: '#0f766e', opacity: 0.8 }}>TOTAL INVENTORY VALUE</div>
          </div>
        </div>
      </div>

      <div className="account-table-wrap">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th className="th-sortable" style={{ width: '250px' }}>Item Name</th>
                <th className="th-sortable" style={{ width: '100px', textAlign: 'center' }}>Total In</th>
                <th className="th-sortable" style={{ width: '100px', textAlign: 'center' }}>Total Out</th>
                <th className="th-actions" style={{ width: '140px', textAlign: 'center' }}>Current Stock</th>
                <th className="th-actions" style={{ width: '160px' }}>Avg Cost (Rs)</th>
                <th className="th-actions" style={{ width: '180px' }}>Total Value (Rs)</th>
              </tr>
            </thead>
            <tbody>
              {loading && data.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>
                    <Loader2 size={24} className="spin" style={{ margin: '0 auto', color: 'var(--c-text-subtle)' }} />
                    <div style={{ marginTop: '8px', color: 'var(--c-text-muted)' }}>Loading stock...</div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--c-text-subtle)' }}>
                    No items in inventory.
                  </td>
                </tr>
              ) : (
                <>
                  {data.map((item, idx) => (
                    <tr key={idx} className="data-row">
                      <td className="td-title" data-label="Item Name">
                        {item.item_name}
                        {item.power_watt > 0 && ['watt', 'kw'].includes(item.accounting_unit.toLowerCase()) && <span style={{ color: 'var(--c-text-muted)', marginLeft: '8px', fontSize: '0.85rem' }}>({item.power_watt}W)</span>}
                      </td>
                      <td data-label="Total In" style={{ textAlign: 'center', color: 'var(--c-text-muted)' }}>{item.total_in} <span style={{ fontSize: '0.8em' }}>{item.accounting_unit}</span></td>
                      <td data-label="Total Out" style={{ textAlign: 'center', color: 'var(--c-text-muted)' }}>{item.total_out} <span style={{ fontSize: '0.8em' }}>{item.accounting_unit}</span></td>
                      <td data-label="Current Stock" style={{ textAlign: 'center', fontWeight: 700, color: item.current_stock > 0 ? '#14b8a6' : 'var(--c-danger)' }}>
                        {item.current_stock} <span style={{ fontSize: '0.8em', fontWeight: 400 }}>{item.accounting_unit}</span>
                      </td>
                      <td data-label="Avg Cost (Rs)" style={{ textAlign: 'right', fontWeight: 500 }}>{formatCurrency(item.avg_cost)}</td>
                      <td data-label="Total Value (Rs)" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--c-text)' }}>{formatCurrency(item.stock_value)}</td>
                    </tr>
                  ))}
                  <tr className="data-row" style={{ background: 'color-mix(in srgb, #14b8a6 10%, transparent)', fontWeight: 700, borderTop: '2px solid var(--c-border)' }}>
                    <td colSpan={5} style={{ textAlign: 'right', color: '#0f766e' }}>TOTAL VALUATION</td>
                    <td data-label="Total Valuation" style={{ textAlign: 'right', color: '#0f766e' }}>{formatCurrency(totalValue)}</td>
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
