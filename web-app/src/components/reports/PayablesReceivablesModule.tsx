'use client';

import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Printer, 
  Loader2, 
  Calendar, 
  Search, 
  TrendingDown, 
  TrendingUp, 
  Scale, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Phone, 
  ExternalLink,
  Users,
  Building
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ReceivableItem {
  accountId: string;
  accountTitle: string;
  accountType: string;
  phone: string;
  region: string;
  openingBalance: number;
  totalBilled: number;
  totalReceived: number;
  amountDue: number;
  unpaidInvoicesCount: number;
  unpaidInvoicesTotal: number;
  lastDate: string | null;
}

interface PayableItem {
  accountId: string;
  accountTitle: string;
  accountType: string;
  phone: string;
  region: string;
  openingBalance: number;
  totalPurchased: number;
  totalPaid: number;
  amountToPay: number;
  unpaidInvoicesCount: number;
  unpaidInvoicesTotal: number;
  lastDate: string | null;
}

interface ReportData {
  businessName: string;
  asOfDate: string;
  summary: {
    totalReceivables: number;
    totalPayables: number;
    netPosition: number;
    receivablesCount: number;
    payablesCount: number;
  };
  receivables: ReceivableItem[];
  payables: PayableItem[];
}

export default function PayablesReceivablesModule({ defaultDate }: { defaultDate: string }) {
  const router = useRouter();
  const [fromDate, setFromDate] = useState('2000-01-01');
  const [toDate, setToDate] = useState(defaultDate);
  const [isAllTime, setIsAllTime] = useState(true);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'receivables' | 'payables'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData(fromDate, toDate, isAllTime);
  }, [fromDate, toDate, isAllTime]);

  const fetchData = async (from: string, to: string, allTime: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const url = allTime
        ? `/api/reports/payables-receivables?allTime=true`
        : `/api/reports/payables-receivables?from=${from}&to=${to}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || 'Failed to fetch payables and receivables');
      }
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const formatPKR = (val: number) => {
    return new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val || 0);
  };

  // Filtered lists
  const query = searchQuery.toLowerCase().trim();
  const filteredReceivables = (data?.receivables || []).filter(r => 
    !query || r.accountTitle.toLowerCase().includes(query) || (r.phone && r.phone.toLowerCase().includes(query)) || (r.region && r.region.toLowerCase().includes(query))
  );

  const filteredPayables = (data?.payables || []).filter(p => 
    !query || p.accountTitle.toLowerCase().includes(query) || (p.phone && p.phone.toLowerCase().includes(query)) || (p.region && p.region.toLowerCase().includes(query))
  );

  const totalFilteredReceivables = filteredReceivables.reduce((s, r) => s + r.amountDue, 0);
  const totalFilteredPayables = filteredPayables.reduce((s, p) => s + p.amountToPay, 0);

  return (
    <div className="pr-wrapper">
      <div className="pr-main-page">
        {/* Header */}
        <div className="pr-header">
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
                <Scale size={24} style={{ color: '#8b5cf6' }} />
                <h1 className="pr-brand">{data?.businessName || 'SolarERP'}</h1>
              </div>
              <p className="pr-report-name">Payables & Receivables Report (Who to Pay & From Whom to Receive)</p>
            </div>
          </div>

          <div className="pr-date-picker-wrap">
            <div className="pr-date-picker no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsAllTime(true);
                    setFromDate('2000-01-01');
                    setToDate(defaultDate);
                  }}
                  className={`pr-quick-date-btn ${isAllTime ? 'active' : ''}`}
                >
                  ⚡ All Time
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAllTime(false);
                    const now = new Date();
                    const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
                    setFromDate(firstDay);
                    setToDate(defaultDate);
                  }}
                  className={`pr-quick-date-btn ${!isAllTime && fromDate !== defaultDate ? 'active' : ''}`}
                >
                  📅 This Month
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--c-text-muted)' }}>From:</span>
                <input 
                  type="date" 
                  value={fromDate === '2000-01-01' ? '' : fromDate}
                  onChange={(e) => {
                    setIsAllTime(false);
                    setFromDate(e.target.value);
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--c-text-muted)' }}>To:</span>
                <input 
                  type="date" 
                  value={toDate}
                  onChange={(e) => {
                    setIsAllTime(false);
                    setToDate(e.target.value);
                  }}
                />
              </div>

              <button onClick={handlePrint} className="pr-btn-print" title="Print Statement">
                <Printer size={16} /> Print Statement
              </button>
            </div>

            <div className="pr-print-date print-only">
              {isAllTime ? 'All Time Statement' : `Period: ${fromDate} to ${toDate}`}
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        {data && (
          <div className="pr-kpi-grid">
            {/* Receivables Card */}
            <div 
              className={`pr-kpi-card ${activeTab === 'receivables' ? 'active-rec' : ''}`}
              onClick={() => setActiveTab(activeTab === 'receivables' ? 'all' : 'receivables')}
              style={{ cursor: 'pointer' }}
            >
              <div className="pr-kpi-top">
                <span className="pr-kpi-label">FROM WHOM TO RECEIVE (CUSTOMERS)</span>
                <div className="pr-kpi-icon" style={{ background: '#05966918', color: '#059669' }}>
                  <ArrowDownLeft size={20} />
                </div>
              </div>
              <div className="pr-kpi-val pr-mono" style={{ color: '#059669' }}>
                PKR {formatPKR(data.summary.totalReceivables)}
              </div>
              <div className="pr-kpi-sub">
                <span>{data.summary.receivablesCount} customer{data.summary.receivablesCount === 1 ? '' : 's'} with balance</span>
              </div>
            </div>

            {/* Payables Card */}
            <div 
              className={`pr-kpi-card ${activeTab === 'payables' ? 'active-pay' : ''}`}
              onClick={() => setActiveTab(activeTab === 'payables' ? 'all' : 'payables')}
              style={{ cursor: 'pointer' }}
            >
              <div className="pr-kpi-top">
                <span className="pr-kpi-label">WHO TO PAY (SUPPLIERS & CREDITORS)</span>
                <div className="pr-kpi-icon" style={{ background: '#e11d4818', color: '#e11d48' }}>
                  <ArrowUpRight size={20} />
                </div>
              </div>
              <div className="pr-kpi-val pr-mono" style={{ color: '#e11d48' }}>
                PKR {formatPKR(data.summary.totalPayables)}
              </div>
              <div className="pr-kpi-sub">
                <span>{data.summary.payablesCount} supplier{data.summary.payablesCount === 1 ? '' : 's'} to pay</span>
              </div>
            </div>

            {/* Net Position Card */}
            <div className="pr-kpi-card">
              <div className="pr-kpi-top">
                <span className="pr-kpi-label">NET CASHFLOW BALANCE</span>
                <div className="pr-kpi-icon" style={{ background: '#3b82f618', color: '#3b82f6' }}>
                  <Scale size={20} />
                </div>
              </div>
              <div className="pr-kpi-val pr-mono" style={{ color: data.summary.netPosition >= 0 ? '#0284c7' : '#ea580c' }}>
                {data.summary.netPosition >= 0 ? '+' : ''}PKR {formatPKR(data.summary.netPosition)}
              </div>
              <div className="pr-kpi-sub">
                <span>{data.summary.netPosition >= 0 ? 'Surplus (Receivables exceed Payables)' : 'Liabilities exceed Receivables'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Controls: Search & Tabs */}
        <div className="pr-controls no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0 16px 0', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className={`pr-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All Overview
            </button>
            <button 
              className={`pr-tab-btn ${activeTab === 'receivables' ? 'active' : ''}`}
              onClick={() => setActiveTab('receivables')}
            >
              📥 Receivables ({data?.summary.receivablesCount || 0})
            </button>
            <button 
              className={`pr-tab-btn ${activeTab === 'payables' ? 'active' : ''}`}
              onClick={() => setActiveTab('payables')}
            >
              📤 Payables ({data?.summary.payablesCount || 0})
            </button>
          </div>

          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search by party name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 12px 6px 32px',
                borderRadius: '6px',
                border: '1px solid var(--c-border)',
                background: 'var(--c-bg)',
                color: 'var(--c-text)',
                fontSize: '12px',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {loading ? (
          <div className="pr-loading no-print">
            <Loader2 size={32} className="pr-spin" />
            <p>Loading Payables & Receivables...</p>
          </div>
        ) : error ? (
          <div className="pr-error no-print">{error}</div>
        ) : data ? (
          <div className="pr-tables-container">
            
            {/* ─── SECTION 1: RECEIVABLES (FROM WHOM TO RECEIVE) ─── */}
            {(activeTab === 'all' || activeTab === 'receivables') && (
              <div className="pr-section" style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669' }} />
                    <h3 className="pr-section-title" style={{ borderColor: '#059669' }}>
                      From Whom to Receive (Customers / Debtors)
                    </h3>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--c-text-muted)', fontWeight: 600 }}>
                    Total: <strong className="pr-mono" style={{ color: '#059669' }}>PKR {formatPKR(totalFilteredReceivables)}</strong>
                  </span>
                </div>

                <div className="pr-table-wrap">
                  <table className="pr-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>#</th>
                        <th>Customer / Party Name</th>
                        <th style={{ width: '120px' }}>Contact</th>
                        <th className="pr-text-right" style={{ width: '110px' }}>Total Invoiced</th>
                        <th className="pr-text-right" style={{ width: '110px' }}>Total Received</th>
                        <th className="pr-text-right" style={{ width: '130px', color: '#059669' }}>To Receive (Due)</th>
                        <th style={{ width: '100px', textAlign: 'center' }}>Unpaid Invoices</th>
                        <th style={{ width: '90px' }}>Last Date</th>
                        <th className="no-print" style={{ width: '90px', textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReceivables.length === 0 ? (
                        <tr>
                          <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: 'var(--c-text-subtle)' }}>
                            No receivables matching criteria
                          </td>
                        </tr>
                      ) : (
                        filteredReceivables.map((rec, idx) => (
                          <tr key={rec.accountId}>
                            <td style={{ color: 'var(--c-text-muted)' }}>{idx + 1}</td>
                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--c-text)' }}>{rec.accountTitle}</div>
                              {rec.region && <div style={{ fontSize: '10px', color: 'var(--c-text-muted)' }}>{rec.region}</div>}
                            </td>
                            <td style={{ fontSize: '11px', color: 'var(--c-text-muted)' }}>
                              {rec.phone ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Phone size={11} /> {rec.phone}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="pr-text-right pr-mono">{formatPKR(rec.totalBilled)}</td>
                            <td className="pr-text-right pr-mono">{formatPKR(rec.totalReceived)}</td>
                            <td className="pr-text-right pr-mono" style={{ fontWeight: 700, color: '#059669', fontSize: '12px' }}>
                              PKR {formatPKR(rec.amountDue)}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {rec.unpaidInvoicesCount > 0 ? (
                                <span className="pr-badge-due">
                                  {rec.unpaidInvoicesCount} Bill{rec.unpaidInvoicesCount === 1 ? '' : 's'}
                                </span>
                              ) : (
                                <span className="pr-badge-settled">Direct Due</span>
                              )}
                            </td>
                            <td style={{ fontSize: '11px', color: 'var(--c-text-muted)' }}>{rec.lastDate || '-'}</td>
                            <td className="no-print" style={{ textAlign: 'center' }}>
                              <button 
                                onClick={() => router.push(`/reports/account-statement?accountId=${rec.accountId}`)}
                                className="pr-btn-view"
                                title="View Account Ledger"
                              >
                                Statement <ExternalLink size={11} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={5} className="pr-text-right pr-bold">TOTAL RECEIVABLES</td>
                        <td className="pr-text-right pr-bold pr-mono" style={{ color: '#059669', fontSize: '13px' }}>
                          PKR {formatPKR(totalFilteredReceivables)}
                        </td>
                        <td colSpan={3}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* ─── SECTION 2: PAYABLES (WHO TO PAY) ─── */}
            {(activeTab === 'all' || activeTab === 'payables') && (
              <div className="pr-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#e11d48' }} />
                    <h3 className="pr-section-title" style={{ borderColor: '#e11d48' }}>
                      Who to Pay (Suppliers & Creditors)
                    </h3>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--c-text-muted)', fontWeight: 600 }}>
                    Total: <strong className="pr-mono" style={{ color: '#e11d48' }}>PKR {formatPKR(totalFilteredPayables)}</strong>
                  </span>
                </div>

                <div className="pr-table-wrap">
                  <table className="pr-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>#</th>
                        <th>Supplier / Creditor Name</th>
                        <th style={{ width: '120px' }}>Contact</th>
                        <th className="pr-text-right" style={{ width: '110px' }}>Total Purchases</th>
                        <th className="pr-text-right" style={{ width: '110px' }}>Total Paid by Us</th>
                        <th className="pr-text-right" style={{ width: '130px', color: '#e11d48' }}>To Pay (Liability)</th>
                        <th style={{ width: '100px', textAlign: 'center' }}>Pending Invoices</th>
                        <th style={{ width: '90px' }}>Last Date</th>
                        <th className="no-print" style={{ width: '90px', textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayables.length === 0 ? (
                        <tr>
                          <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: 'var(--c-text-subtle)' }}>
                            No payables matching criteria
                          </td>
                        </tr>
                      ) : (
                        filteredPayables.map((pay, idx) => (
                          <tr key={pay.accountId}>
                            <td style={{ color: 'var(--c-text-muted)' }}>{idx + 1}</td>
                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--c-text)' }}>{pay.accountTitle}</div>
                              {pay.region && <div style={{ fontSize: '10px', color: 'var(--c-text-muted)' }}>{pay.region}</div>}
                            </td>
                            <td style={{ fontSize: '11px', color: 'var(--c-text-muted)' }}>
                              {pay.phone ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Phone size={11} /> {pay.phone}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="pr-text-right pr-mono">{formatPKR(pay.totalPurchased)}</td>
                            <td className="pr-text-right pr-mono">{formatPKR(pay.totalPaid)}</td>
                            <td className="pr-text-right pr-mono" style={{ fontWeight: 700, color: '#e11d48', fontSize: '12px' }}>
                              PKR {formatPKR(pay.amountToPay)}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {pay.unpaidInvoicesCount > 0 ? (
                                <span className="pr-badge-pay">
                                  {pay.unpaidInvoicesCount} Bill{pay.unpaidInvoicesCount === 1 ? '' : 's'}
                                </span>
                              ) : (
                                <span className="pr-badge-settled">Direct Balance</span>
                              )}
                            </td>
                            <td style={{ fontSize: '11px', color: 'var(--c-text-muted)' }}>{pay.lastDate || '-'}</td>
                            <td className="no-print" style={{ textAlign: 'center' }}>
                              <button 
                                onClick={() => router.push(`/reports/account-statement?accountId=${pay.accountId}`)}
                                className="pr-btn-view"
                                title="View Account Ledger"
                              >
                                Statement <ExternalLink size={11} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={5} className="pr-text-right pr-bold">TOTAL PAYABLES</td>
                        <td className="pr-text-right pr-bold pr-mono" style={{ color: '#e11d48', fontSize: '13px' }}>
                          PKR {formatPKR(totalFilteredPayables)}
                        </td>
                        <td colSpan={3}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

          </div>
        ) : null}
      </div>

      {/* STYLES */}
      <style dangerouslySetInnerHTML={{__html: `
        .pr-wrapper {
          padding: 24px;
          min-height: 100vh;
          font-family: var(--font-inter, sans-serif);
          background: var(--c-bg);
          color: var(--c-text);
        }

        .pr-main-page {
          width: 100%;
          max-width: 1060px;
          margin: 0 auto;
          background: var(--c-bg-card);
          border: 1px solid var(--c-border);
          border-radius: var(--radius-md);
          padding: 32px 40px;
          box-shadow: var(--shadow-sm);
        }

        .pr-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          border-bottom: 2px solid var(--c-text);
          padding-bottom: 16px;
          margin-bottom: 20px;
        }

        .pr-brand {
          font-size: 22px;
          font-weight: 900;
          color: #8b5cf6;
          text-transform: uppercase;
          letter-spacing: -0.5px;
          margin: 0;
        }

        .pr-report-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--c-text-muted);
          text-transform: uppercase;
          margin: 2px 0 0 0;
        }

        .pr-date-picker-wrap {
          text-align: right;
        }

        .pr-date-picker {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--c-text-muted);
        }

        .pr-date-picker input {
          background: transparent;
          border: 1px solid var(--c-border);
          border-radius: 6px;
          padding: 5px 8px;
          font-size: 13px;
          color: var(--c-text);
          outline: none;
        }

        .pr-quick-date-btn {
          background: var(--c-bg);
          border: 1px solid var(--c-border);
          border-radius: 6px;
          padding: 5px 10px;
          font-size: 11px;
          font-weight: 600;
          color: var(--c-text-muted);
          cursor: pointer;
          transition: all 0.2s;
        }
        .pr-quick-date-btn:hover {
          color: var(--c-text);
          border-color: var(--c-text);
        }
        .pr-quick-date-btn.active {
          background: #8b5cf6;
          color: white;
          border-color: #8b5cf6;
        }

        .pr-btn-print {
          background: #8b5cf6;
          color: white;
          border: none;
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: background 0.2s;
        }
        .pr-btn-print:hover { background: #7c3aed; }

        .pr-print-date {
          display: none;
          font-size: 13px;
          font-weight: bold;
        }

        .pr-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .pr-kpi-card {
          background: var(--c-bg);
          border: 1px solid var(--c-border);
          border-radius: 8px;
          padding: 16px;
          transition: all 0.2s;
        }
        .pr-kpi-card:hover {
          transform: translateY(-1px);
        }
        .pr-kpi-card.active-rec {
          border-color: #059669;
          background: color-mix(in srgb, #059669 6%, var(--c-bg-card));
        }
        .pr-kpi-card.active-pay {
          border-color: #e11d48;
          background: color-mix(in srgb, #e11d48 6%, var(--c-bg-card));
        }

        .pr-kpi-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .pr-kpi-label {
          font-size: 10px;
          font-weight: 700;
          color: var(--c-text-muted);
          letter-spacing: 0.5px;
        }

        .pr-kpi-icon {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pr-kpi-val {
          font-size: 20px;
          font-weight: 800;
        }

        .pr-kpi-sub {
          font-size: 11px;
          color: var(--c-text-muted);
          margin-top: 4px;
        }

        .pr-tab-btn {
          background: var(--c-bg);
          border: 1px solid var(--c-border);
          border-radius: 6px;
          padding: 6px 14px;
          font-size: 12px;
          font-weight: 600;
          color: var(--c-text-muted);
          cursor: pointer;
          transition: all 0.2s;
        }
        .pr-tab-btn.active {
          background: var(--c-text);
          color: var(--c-bg);
          border-color: var(--c-text);
        }

        .pr-section-title {
          font-size: 13px;
          font-weight: 800;
          color: var(--c-text);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0;
          border-bottom: 2px solid;
          display: inline-block;
          padding-bottom: 2px;
        }

        .pr-table-wrap {
          border: 1px solid var(--c-border);
          border-radius: 8px;
          overflow: hidden;
        }

        .pr-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          text-align: left;
        }

        .pr-table th, .pr-table td {
          padding: 8px 10px;
          border-bottom: 1px solid var(--c-border);
        }

        .pr-table th {
          background: var(--c-bg);
          font-weight: 700;
          color: var(--c-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-size: 10px;
        }

        .pr-table tbody tr:hover {
          background: color-mix(in srgb, var(--c-primary) 3%, transparent);
        }

        .pr-table tfoot td {
          border-top: 2px solid var(--c-text);
          background: var(--c-bg);
          padding: 10px;
        }

        .pr-text-right { text-align: right; }
        .pr-mono { font-family: monospace; }
        .pr-bold { font-weight: 700; }

        .pr-badge-due {
          display: inline-block;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          background: #05966918;
          color: #059669;
          border: 1px solid #05966930;
        }

        .pr-badge-pay {
          display: inline-block;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          background: #e11d4818;
          color: #e11d48;
          border: 1px solid #e11d4830;
        }

        .pr-badge-settled {
          display: inline-block;
          font-size: 10px;
          font-weight: 500;
          padding: 2px 6px;
          border-radius: 4px;
          background: #64748b15;
          color: #64748b;
        }

        .pr-btn-view {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: transparent;
          border: 1px solid var(--c-border);
          border-radius: 4px;
          padding: 3px 8px;
          font-size: 10px;
          font-weight: 600;
          color: var(--c-primary);
          cursor: pointer;
          transition: all 0.2s;
        }
        .pr-btn-view:hover {
          background: var(--c-primary);
          color: white;
          border-color: var(--c-primary);
        }

        .pr-loading, .pr-error {
          text-align: center;
          padding: 40px;
          color: var(--c-text-muted);
        }

        .pr-error {
          background: #fee2e2;
          color: #991b1b;
          border-radius: 6px;
        }

        .pr-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .pr-wrapper { padding: 0 !important; background: transparent !important; }
          .pr-main-page {
            max-width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          .pr-header {
            border-bottom: 2px solid black !important;
          }
          .pr-brand { color: black !important; }
          .pr-table th { border-bottom: 1px solid black !important; color: black !important; background: transparent !important; }
          .pr-table th, .pr-table td { border-bottom-color: #ddd !important; }
          .pr-table tfoot td { border-top: 1px solid black !important; background: transparent !important; }
        }
      `}} />
    </div>
  );
}
