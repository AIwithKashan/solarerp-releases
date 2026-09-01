'use client';
import { useState, useEffect } from 'react';
import { Printer, Calendar, TrendingUp, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TradingItem {
  itemName: string;
  powerWatt: number | null;
  biltiNo?: string | null;
  qtySold: number;
  purchaseRate: number;
  sellRate: number;
  totalSaleValue: number;
  profit: number;
}

interface AccMovement {
  accountName: string;
  amount: number;
}

interface ContainerSummary {
  biltiNo: string;
  totalPurchasedCost: number;
  totalPurchasedQty: number;
  totalSalesRevenue: number;
  totalSoldQty: number;
  containerProfit: number;
  profitMargin: number;
  isProfitable: boolean;
}

interface ProfitLossData {
  businessName: string;
  biltiFilter?: string;
  availableBiltis?: string[];
  containerSummary?: ContainerSummary | null;
  tradingItems: TradingItem[];
  grossTradingProfit: number;
  otherIncome: AccMovement[];
  totalOtherIncome: number;
  expenses: AccMovement[];
  totalExpenses: number;
  totalSale: number;
  netProfit: number;
}

function formatPKR(val: number) {
  return val.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ProfitLossModule({ defaultFrom, defaultTo }: { defaultFrom: string; defaultTo: string }) {
  const router = useRouter();
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [selectedBilti, setSelectedBilti] = useState('');
  const [data, setData] = useState<ProfitLossData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [fromDate, toDate, selectedBilti]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const biltiParam = selectedBilti.trim() ? `&bilti=${encodeURIComponent(selectedBilti.trim())}` : '';
      const res = await fetch(`/api/reports/profit-loss?from=${fromDate}&to=${toDate}${biltiParam}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setData(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="pl-container" style={{ padding: '20px', maxWidth: '1050px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      
      {/* ─── CONTROLS (Hidden on Print) ─── */}
      <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px', background: 'var(--c-bg-card)', padding: '16px 20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid var(--c-border)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          <button 
            onClick={() => router.push('/reports')}
            className="btn-ghost-sm" 
            style={{ margin: '0', width: '36px', height: '36px', border: '1px solid var(--c-border)', borderRadius: '8px', background: 'var(--c-bg)' }}
            title="Back to Reports"
          >
            <ArrowLeft size={16} style={{ margin: 'auto' }} />
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--c-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>From Date</label>
            <div style={{ position: 'relative' }}>
              <Calendar size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-muted)' }} />
              <input 
                type="date" 
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                style={{ padding: '6px 12px 6px 32px', borderRadius: '6px', border: '1px solid var(--c-border)', background: 'var(--c-bg)', color: 'var(--c-text)', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--c-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>To Date</label>
            <div style={{ position: 'relative' }}>
              <Calendar size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-muted)' }} />
              <input 
                type="date" 
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                style={{ padding: '6px 12px 6px 32px', borderRadius: '6px', border: '1px solid var(--c-border)', background: 'var(--c-bg)', color: 'var(--c-text)', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>
          </div>

          {/* Bilti / Container Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--c-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Container / Bilti Filter</label>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input 
                type="text" 
                list="bilti-options"
                placeholder="All Containers (or type Bilti #)…"
                value={selectedBilti}
                onChange={e => setSelectedBilti(e.target.value)}
                style={{ padding: '6px 12px', minWidth: '220px', borderRadius: '6px', border: '1px solid var(--c-border)', background: 'var(--c-bg)', color: 'var(--c-text)', fontSize: '0.9rem', outline: 'none' }}
              />
              <datalist id="bilti-options">
                {(data?.availableBiltis || []).map(b => (
                  <option key={b} value={b} />
                ))}
              </datalist>
              {selectedBilti && (
                <button 
                  onClick={() => setSelectedBilti('')}
                  style={{ background: 'none', border: 'none', color: 'var(--c-text-muted)', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--c-primary)', color: '#fff', padding: '8px 16px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
          <Printer size={16} /> Print Statement
        </button>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: 'var(--c-text-muted)' }}>
          <Loader2 className="spin" size={32} />
        </div>
      )}

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {data && !loading && (
        <div className="pl-paper" style={{ background: '#fff', color: '#000', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          
          {/* ─── HEADER ─── */}
          <div style={{ textAlign: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid #e2e8f0' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {data.businessName}
            </h1>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155', margin: '0 0 8px 0', letterSpacing: '0.5px' }}>
              {selectedBilti ? `Container P&L Statement (${selectedBilti})` : 'Profit & Loss Statement'}
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
              Period: {new Date(fromDate).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })} – {new Date(toDate).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>

          {/* ─── CONTAINER SUMMARY BANNER (If filtered by Bilti) ─── */}
          {data.containerSummary && (
            <div style={{ marginBottom: '24px', padding: '16px 20px', borderRadius: '8px', background: data.containerSummary.isProfitable ? '#f0fdf4' : '#fef2f2', border: `1.5px solid ${data.containerSummary.isProfitable ? '#bbf7d0' : '#fecaca'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: data.containerSummary.isProfitable ? '#166534' : '#991b1b', letterSpacing: '0.5px' }}>
                  📦 Container Batch: {data.containerSummary.biltiNo}
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: data.containerSummary.isProfitable ? '#22c55e' : '#ef4444', color: '#fff' }}>
                  {data.containerSummary.isProfitable ? 'NET PROFIT' : 'NET LOSS'} ({data.containerSummary.profitMargin.toFixed(1)}%)
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', fontSize: '0.85rem' }}>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Total Purchase Cost:</div>
                  <strong style={{ color: '#0f172a' }}>PKR {formatPKR(data.containerSummary.totalPurchasedCost)}</strong>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Qty: {data.containerSummary.totalPurchasedQty} units</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Total Sales Revenue:</div>
                  <strong style={{ color: '#059669' }}>PKR {formatPKR(data.containerSummary.totalSalesRevenue)}</strong>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Sold: {data.containerSummary.totalSoldQty} units</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Container Gross Margin:</div>
                  <strong style={{ color: data.containerSummary.isProfitable ? '#16a34a' : '#dc2626', fontSize: '0.95rem' }}>
                    PKR {formatPKR(data.containerSummary.containerProfit)}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* ─── SECTION 1: TRADING PROFIT ─── */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#0f172a', fontWeight: 700, margin: '0 0 12px 0', padding: '6px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
              Trading Profit (Item-Wise Margins)
            </h3>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', fontFamily: 'monospace' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left', color: '#475569', width: '40px' }}>#</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', color: '#475569' }}>Item Description</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', color: '#475569', width: '80px' }}>Qty Sold</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', color: '#475569', width: '110px' }}>Avg Purchase Rate</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', color: '#475569', width: '110px' }}>Avg Sell Rate</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', color: '#475569', width: '130px' }}>Profit / Loss</th>
                </tr>
              </thead>
              <tbody>
                {data.tradingItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                      No items traded in this period.
                    </td>
                  </tr>
                ) : (
                  data.tradingItems.map((item, idx) => (
                    <tr key={`${item.itemName}-${item.powerWatt || 0}-${idx}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 8px', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 600 }}>
                        {item.itemName} {item.powerWatt ? `(${item.powerWatt}W)` : ''}
                        {item.biltiNo && (
                          <span style={{ marginLeft: '6px', fontSize: '9px', padding: '1px 5px', borderRadius: '3px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
                            📦 {item.biltiNo}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>{item.qtySold}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>{formatPKR(item.purchaseRate)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>{formatPKR(item.sellRate)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: item.profit >= 0 ? '#059669' : '#e11d48' }}>
                        {item.profit < 0 ? '-' : ''}{formatPKR(Math.abs(item.profit))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid #94a3b8', background: '#f8fafc' }}>
                  <td colSpan={5} style={{ padding: '8px', textAlign: 'right', fontWeight: 700, fontSize: '12px' }}>
                    Gross Trading Profit
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800, fontSize: '13px', color: data.grossTradingProfit >= 0 ? '#059669' : '#e11d48' }}>
                    {formatPKR(data.grossTradingProfit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
            
            {/* ─── SECTION 2: OTHER INCOME ─── */}
            <div>
              <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#0f172a', fontWeight: 700, margin: '0 0 12px 0', padding: '6px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                Other Income (Non-Trading)
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', fontFamily: 'monospace' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left', color: '#475569' }}>Income Head</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', color: '#475569', width: '120px' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.otherIncome.length === 0 ? (
                    <tr><td colSpan={2} style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>No other income</td></tr>
                  ) : (
                    data.otherIncome.map((inc, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 8px', fontWeight: 600 }}>{inc.accountName}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', color: '#059669' }}>{formatPKR(inc.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid #94a3b8', background: '#f8fafc' }}>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, fontSize: '12px' }}>Total Income</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800, fontSize: '12px', color: '#059669' }}>{formatPKR(data.totalOtherIncome)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* ─── SECTION 3: EXPENSES ─── */}
            <div>
              <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#0f172a', fontWeight: 700, margin: '0 0 12px 0', padding: '6px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                Operating Expenses
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', fontFamily: 'monospace' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left', color: '#475569' }}>Expense Head</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', color: '#475569', width: '120px' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.expenses.length === 0 ? (
                    <tr><td colSpan={2} style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>No expenses logged</td></tr>
                  ) : (
                    data.expenses.map((exp, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 8px', fontWeight: 600 }}>{exp.accountName}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', color: '#e11d48' }}>{formatPKR(exp.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid #94a3b8', background: '#f8fafc' }}>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, fontSize: '12px' }}>Total Expenses</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800, fontSize: '12px', color: '#e11d48' }}>{formatPKR(data.totalExpenses)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ─── SECTION 4: FINAL SUMMARY ─── */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
            <div style={{ width: '380px', border: '2px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}>
                <span style={{ fontWeight: 600, color: '#475569' }}>Gross Trading Profit:</span>
                <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{formatPKR(data.grossTradingProfit)}</span>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}>
                <span style={{ fontWeight: 600, color: '#475569' }}>Total Other Income:</span>
                <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#059669' }}>+ {formatPKR(data.totalOtherIncome)}</span>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}>
                <span style={{ fontWeight: 600, color: '#475569' }}>Total Expenses:</span>
                <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#e11d48' }}>- {formatPKR(data.totalExpenses)}</span>
              </div>
              <div style={{ 
                padding: '16px', 
                background: data.netProfit >= 0 ? '#ecfdf5' : '#fff1f2',
                color: data.netProfit >= 0 ? '#065f46' : '#9f1239',
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                borderTop: `3px solid ${data.netProfit >= 0 ? '#10b981' : '#f43f5e'}`
              }}>
                <span style={{ fontWeight: 800, fontSize: '15px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={18} />
                  NET {data.netProfit >= 0 ? 'PROFIT' : 'LOSS'}
                </span>
                <span style={{ fontWeight: 800, fontSize: '18px', fontFamily: 'monospace' }}>
                  PKR {formatPKR(Math.abs(data.netProfit))}
                </span>
              </div>
            </div>
          </div>
          
        </div>
      )}

      {/* Global Print Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background: #fff !important; }
          .no-print { display: none !important; }
          .sidebar { display: none !important; }
          header { display: none !important; }
          .pl-container { max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
          .pl-paper { box-shadow: none !important; padding: 0 !important; border: none !important; }
          @page { size: A4 portrait; margin: 1.5cm; }
        }
      `}} />
    </div>
  );
}
