'use client';
import { useState, useEffect, useRef } from 'react';
import { Printer, Calendar, Loader2, AlertCircle, Search, ChevronDown, Check, X, FileText, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Account {
  id: string;
  account_type: string;
  account_title: string;
  region: string;
}

interface Transaction {
  date: string;
  timestamp?: number;
  ref: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
  sourceType: string;
  sourceId: string;
}

interface StatementData {
  businessName: string;
  account: {
    id: string;
    account_title: string;
    account_type: string;
    contact: string | null;
    region: string;
  };
  openingBalance: number;
  transactions: Transaction[];
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
}

function formatPKR(val: number) {
  return val.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AccountStatementModule({ 
  initialAccounts, 
  defaultFrom, 
  defaultTo 
}: { 
  initialAccounts: Account[]; 
  defaultFrom: string; 
  defaultTo: string; 
}) {
  const router = useRouter();
  
  const [accounts] = useState(initialAccounts);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  
  const [data, setData] = useState<StatementData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Combobox State
  const [comboOpen, setComboOpen] = useState(false);
  const [comboQuery, setComboQuery] = useState('');
  const comboRoot = useRef<HTMLDivElement>(null);
  const comboInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (comboRoot.current && !comboRoot.current.contains(e.target as Node)) {
        setComboOpen(false);
        const sel = accounts.find(a => a.id === selectedAccountId);
        setComboQuery(sel ? sel.account_title : '');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [selectedAccountId, accounts]);

  const filteredAccounts = comboQuery && !(accounts.find(a => a.id === selectedAccountId) && comboQuery === accounts.find(a => a.id === selectedAccountId)?.account_title)
    ? accounts.filter(a => a.account_title.toLowerCase().includes(comboQuery.toLowerCase()))
    : accounts;

  useEffect(() => {
    if (selectedAccountId && fromDate && toDate) {
      fetchStatement();
    }
  }, [selectedAccountId, fromDate, toDate]);

  const fetchStatement = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/account-statement?accountId=${selectedAccountId}&from=${fromDate}&to=${toDate}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setData(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (tx: Transaction) => {
    if (tx.sourceType === 'sale') {
      router.push(`/sales/${tx.sourceId}/invoice`);
    } else if (tx.sourceType === 'purchase') {
      router.push(`/purchases/${tx.sourceId}/invoice`);
    } else if (tx.sourceType === 'voucher' || tx.sourceType === 'jv') {
      router.push(`/vouchers/${tx.sourceId}/invoice`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="as-container" style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      
      {/* ─── CONTROLS (Hidden on Print) ─── */}
      <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', background: 'var(--c-bg-card)', padding: '16px 20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid var(--c-border)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end', flex: 1 }}>
          <button 
            onClick={() => router.push('/reports')}
            className="btn-ghost-sm" 
            style={{ marginBottom: '4px', width: '36px', height: '36px', border: '1px solid var(--c-border)', borderRadius: '8px', background: 'var(--c-bg)' }}
            title="Back to Reports"
          >
            <ArrowLeft size={16} style={{ margin: 'auto' }} />
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '250px' }} ref={comboRoot}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--c-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Select Ledger Account</label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-muted)', zIndex: 10 }} />
              <input 
                ref={comboInput}
                value={comboOpen ? comboQuery : (accounts.find(a => a.id === selectedAccountId)?.account_title || comboQuery)}
                onChange={e => { setComboQuery(e.target.value); setComboOpen(true); }}
                onFocus={() => { setComboOpen(true); if (selectedAccountId) setComboQuery(''); }}
                placeholder="Search Account..."
                style={{ width: '100%', padding: '8px 32px', borderRadius: '6px', border: '1px solid var(--c-border)', background: 'var(--c-bg)', color: 'var(--c-text)', fontSize: '0.9rem', outline: 'none' }}
              />
              <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-muted)', pointerEvents: 'none' }} />
              
              {comboOpen && (
                <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--c-bg-card)', border: '1px solid var(--c-border)', borderRadius: '6px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', maxHeight: '300px', overflowY: 'auto', zIndex: 100, listStyle: 'none', padding: '4px', margin: '4px 0 0 0' }}>
                  {filteredAccounts.length === 0 ? (
                    <li style={{ padding: '8px 12px', fontSize: '0.85rem', color: 'var(--c-text-muted)' }}>No accounts found</li>
                  ) : (
                    filteredAccounts.map(a => (
                      <li 
                        key={a.id}
                        onClick={() => {
                          setSelectedAccountId(a.id);
                          setComboQuery(a.account_title);
                          setComboOpen(false);
                        }}
                        style={{ padding: '8px 12px', fontSize: '0.85rem', cursor: 'pointer', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: a.id === selectedAccountId ? 'var(--c-bg-alt)' : 'transparent' }}
                      >
                        <span style={{ fontWeight: 600 }}>{a.account_title}</span>
                        <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'var(--c-bg-alt)', borderRadius: '4px', color: 'var(--c-text-muted)' }}>{a.account_type}</span>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--c-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>From Date</label>
            <div style={{ position: 'relative' }}>
              <Calendar size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-muted)' }} />
              <input 
                type="date" 
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                style={{ padding: '8px 12px 8px 32px', borderRadius: '6px', border: '1px solid var(--c-border)', background: 'var(--c-bg)', color: 'var(--c-text)', fontSize: '0.9rem', outline: 'none' }}
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
                style={{ padding: '8px 12px 8px 32px', borderRadius: '6px', border: '1px solid var(--c-border)', background: 'var(--c-bg)', color: 'var(--c-text)', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>
          </div>
        </div>

        <button onClick={handlePrint} disabled={!data} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: data ? 'var(--c-primary)' : 'var(--c-bg-alt)', color: data ? '#fff' : 'var(--c-text-muted)', padding: '8px 16px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, border: 'none', cursor: data ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>
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
          <div style={{ textAlign: 'center', marginBottom: '30px', paddingBottom: '20px', borderBottom: '2px solid #e2e8f0' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {data.businessName}
            </h1>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155', margin: '0 0 8px 0', letterSpacing: '0.5px' }}>
              Account Statement (Ledger)
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
              Period: {new Date(fromDate).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })} – {new Date(toDate).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 4px 0', color: '#0f172a' }}>{data.account.account_title}</h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>Account Type: <strong style={{ color: '#334155' }}>{data.account.account_type}</strong></p>
              {data.account.region && <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>Region: <strong style={{ color: '#334155' }}>{data.account.region}</strong></p>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 4px 0' }}>Current Balance as of {new Date(toDate).toLocaleDateString('en-PK')}</p>
              <h4 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: data.closingBalance >= 0 ? '#059669' : '#e11d48' }}>
                {data.closingBalance < 0 ? '-' : ''}PKR {formatPKR(Math.abs(data.closingBalance))}
                <span style={{ fontSize: '0.8rem', marginLeft: '6px', color: '#64748b' }}>
                  ({(data.account as any)?.isCreditNature ? (data.closingBalance >= 0 ? 'Cr' : 'Dr') : (data.closingBalance >= 0 ? 'Dr' : 'Cr')})
                </span>
              </h4>
            </div>
          </div>

          {/* ─── TRANSACTIONS TABLE ─── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', fontFamily: 'monospace' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: '8px', textAlign: 'left', color: '#475569', width: '130px' }}>Date</th>
                <th style={{ padding: '8px', textAlign: 'left', color: '#475569', width: '120px' }}>Ref / Voucher No</th>
                <th style={{ padding: '8px', textAlign: 'left', color: '#475569' }}>Description</th>
                <th style={{ padding: '8px', textAlign: 'right', color: '#475569', width: '100px' }}>Debit (PKR)</th>
                <th style={{ padding: '8px', textAlign: 'right', color: '#475569', width: '100px' }}>Credit (PKR)</th>
                <th style={{ padding: '8px', textAlign: 'right', color: '#475569', width: '110px' }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {/* Opening Balance Row */}
              <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc', fontWeight: 700 }}>
                <td style={{ padding: '8px', color: '#64748b' }}>{new Date(fromDate).toLocaleDateString('en-PK', { day: '2-digit', month: 'short' })}</td>
                <td style={{ padding: '8px', color: '#64748b' }}>-</td>
                <td style={{ padding: '8px', color: '#334155' }}>OPENING BALANCE</td>
                <td style={{ padding: '8px', textAlign: 'right' }}></td>
                <td style={{ padding: '8px', textAlign: 'right' }}></td>
                <td style={{ padding: '8px', textAlign: 'right', color: data.openingBalance >= 0 ? '#059669' : '#e11d48' }}>
                  {data.openingBalance < 0 ? '-' : ''}{formatPKR(Math.abs(data.openingBalance))}
                </td>
              </tr>

              {/* Transactions */}
              {data.transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                    No transactions found in this date range.
                  </td>
                </tr>
              ) : (
                data.transactions.map((tx, idx) => (
                  <tr 
                    key={`${tx.sourceId}-${idx}`} 
                    onClick={() => handleRowClick(tx)}
                    className="as-row"
                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.2s' }}
                    title="Click to view source document"
                  >
                    <td style={{ padding: '8px', color: '#64748b' }}>
              {new Date(tx.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short' })}
              {tx.timestamp && <span style={{ display: 'block', fontSize: '9px', color: '#94a3b8' }}>{new Date(tx.timestamp).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>}
            </td>
                    <td style={{ padding: '8px', color: '#3b82f6', textDecoration: 'underline' }}>{tx.ref}</td>
                    <td style={{ padding: '8px', color: '#334155' }}>{tx.description}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: tx.debit > 0 ? '#334155' : 'transparent' }}>
                      {tx.debit > 0 ? formatPKR(tx.debit) : ''}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', color: tx.credit > 0 ? '#334155' : 'transparent' }}>
                      {tx.credit > 0 ? formatPKR(tx.credit) : ''}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: tx.runningBalance >= 0 ? '#059669' : '#e11d48' }}>
                      {tx.runningBalance < 0 ? '-' : ''}{formatPKR(Math.abs(tx.runningBalance))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              {/* Closing Totals */}
              <tr style={{ borderTop: '2px solid #94a3b8', background: '#f8fafc' }}>
                <td colSpan={3} style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, fontSize: '12px' }}>CLOSING TOTALS</td>
                <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, fontSize: '12px' }}>{formatPKR(data.totalDebit)}</td>
                <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, fontSize: '12px' }}>{formatPKR(data.totalCredit)}</td>
                <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 800, fontSize: '13px', color: data.closingBalance >= 0 ? '#059669' : '#e11d48' }}>
                  {data.closingBalance < 0 ? '-' : ''}{formatPKR(Math.abs(data.closingBalance))}
                </td>
              </tr>
            </tfoot>
          </table>

        </div>
      )}

      {/* Global Styles including hover effect for clickable rows */}
      <style dangerouslySetInnerHTML={{__html: `
        .as-row:hover { background-color: #f1f5f9 !important; }
        @media print {
          body { background: #fff !important; }
          .no-print { display: none !important; }
          .sidebar { display: none !important; }
          header { display: none !important; }
          .as-container { max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
          .pl-paper { box-shadow: none !important; padding: 0 !important; border: none !important; }
          @page { size: A4 portrait; margin: 1.5cm; }
        }
      `}} />
    </div>
  );
}
