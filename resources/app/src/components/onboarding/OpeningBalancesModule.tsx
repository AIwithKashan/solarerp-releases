'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, Banknote, Landmark, Users, Package, Scale, 
  Plus, Trash2, Check, AlertCircle, Loader2, ArrowLeft,
  Calendar, Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function formatPKR(val: number) {
  return val.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function OpeningBalancesModule({
  accounts,
  products
}: {
  accounts: any[];
  products: any[];
}) {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [booksStartDate, setBooksStartDate] = useState('');
  
  const [cashList, setCashList] = useState<{ id: string, accountId: string, accountName: string, amount: string }[]>([]);
  const [bankList, setBankList] = useState<{ id: string, accountId: string, accountName: string, amount: string }[]>([]);
  const [receivableList, setReceivableList] = useState<{ id: string, accountId: string, accountName: string, amount: string }[]>([]);
  const [payableList, setPayableList] = useState<{ id: string, accountId: string, accountName: string, amount: string }[]>([]);
  const [stockList, setStockList] = useState<{ id: string, productName: string, qty: string, rate: string }[]>([]);

  const cashAccounts = accounts.filter(a => a.account_type === 'Cash' || a.account_type === 'Cash Account');
  const bankAccounts = accounts.filter(a => a.account_type === 'Bank' || a.account_type === 'Bank Account');
  const otherAccounts = accounts.filter(a => !['Cash', 'Cash Account', 'Bank', 'Bank Account'].includes(a.account_type));

  useEffect(() => {
    fetchExisting();
  }, []);

  const fetchExisting = async () => {
    try {
      const res = await fetch('/api/opening-balances');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      if (json.data.booksStartDate) {
        setBooksStartDate(new Date(json.data.booksStartDate).toISOString().split('T')[0]);
      }
      
      const jv = json.data.journalVoucher;
      if (jv && jv.lines) {
        const cash: any[] = [];
        const bank: any[] = [];
        const rec: any[] = [];
        const pay: any[] = [];
        
        jv.lines.forEach((l: any) => {
          if (l.remarks === 'Opening Cash Balance') cash.push({ id: Math.random().toString(), accountId: l.account_id, accountName: l.account_name, amount: l.debit.toString() });
          else if (l.remarks === 'Opening Bank Balance') bank.push({ id: Math.random().toString(), accountId: l.account_id, accountName: l.account_name, amount: l.debit.toString() });
          else if (l.remarks === 'Opening Receivable') rec.push({ id: Math.random().toString(), accountId: l.account_id, accountName: l.account_name, amount: l.debit.toString() });
          else if (l.remarks === 'Opening Payable') pay.push({ id: Math.random().toString(), accountId: l.account_id, accountName: l.account_name, amount: l.credit.toString() });
        });
        setCashList(cash);
        setBankList(bank);
        setReceivableList(rec);
        setPayableList(pay);
      }

      const st = json.data.stockPurchases || [];
      const stockMapped = st.map((s: any) => ({
        id: Math.random().toString(),
        productName: s.item_name,
        qty: s.quantity.toString(),
        rate: s.rate.toString()
      }));
      setStockList(stockMapped);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addRow = (setter: any) => {
    setter((prev: any) => [...prev, { id: Math.random().toString(), accountId: '', accountName: '', amount: '' }]);
  };
  const addStockRow = () => {
    setStockList(prev => [...prev, { id: Math.random().toString(), productName: '', qty: '', rate: '' }]);
  };

  const updateRow = (setter: any, id: string, field: string, val: string) => {
    setter((prev: any) => prev.map((r: any) => r.id === id ? { ...r, [field]: val } : r));
  };
  const removeRow = (setter: any, id: string) => {
    setter((prev: any) => prev.filter((r: any) => r.id !== id));
  };

  const totalAssets = 
    cashList.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0) +
    bankList.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0) +
    receivableList.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0) +
    stockList.reduce((s, r) => s + ((parseFloat(r.qty) || 0) * (parseFloat(r.rate) || 0)), 0);

  const totalLiabilities = payableList.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  
  const computedCapital = totalAssets - totalLiabilities;
  const isBalanced = computedCapital >= 0; // Capital should normally be positive

  const handleSave = async () => {
    if (!booksStartDate) return setError("Books Start Date is required.");
    if (!isBalanced) return setError("Assets cannot be less than liabilities. Check your figures.");

    setSaving(true);
    setError(null);
    try {
      const payload = {
        booksStartDate,
        cashAccounts: cashList.map(r => ({ ...r, amount: parseFloat(r.amount) || 0 })).filter(r => r.amount > 0 && r.accountId),
        bankAccounts: bankList.map(r => ({ ...r, amount: parseFloat(r.amount) || 0 })).filter(r => r.amount > 0 && r.accountId),
        receivables: receivableList.map(r => ({ ...r, amount: parseFloat(r.amount) || 0 })).filter(r => r.amount > 0 && r.accountId),
        payables: payableList.map(r => ({ ...r, amount: parseFloat(r.amount) || 0 })).filter(r => r.amount > 0 && r.accountId),
        stocks: stockList.map(r => ({ 
          productName: r.productName, 
          qty: parseFloat(r.qty) || 0, 
          rate: parseFloat(r.rate) || 0,
          amount: (parseFloat(r.qty) || 0) * (parseFloat(r.rate) || 0)
        })).filter(r => r.amount > 0 && r.productName),
        capital: { amount: computedCapital }
      };

      const res = await fetch('/api/opening-balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      
      alert("Opening Balances saved successfully.");
      router.push('/settings');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}><Loader2 className="spin" /></div>;
  }

  const renderAccountRows = (title: string, list: any[], setter: any, options: any[]) => (
    <div style={{ marginBottom: 24, background: 'var(--c-bg-alt)', padding: 20, borderRadius: 12, border: '1px solid var(--c-border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          {title}
        </h3>
        <button type="button" onClick={() => addRow(setter)} className="btn-ghost-sm">
          <Plus size={16} /> Add Row
        </button>
      </div>
      {list.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--c-text-muted)' }}>No entries.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {list.map(row => (
          <div key={row.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <select
              value={row.accountId}
              onChange={e => {
                const acc = options.find(a => a.id === e.target.value);
                updateRow(setter, row.id, 'accountId', e.target.value);
                updateRow(setter, row.id, 'accountName', acc?.account_title || '');
              }}
              className="field-input"
              style={{ flex: 1 }}
            >
              <option value="">Select Account...</option>
              {options.map(o => <option key={o.id} value={o.id}>{o.account_title}</option>)}
            </select>
            <input 
              type="number"
              placeholder="Amount"
              value={row.amount}
              onChange={e => updateRow(setter, row.id, 'amount', e.target.value)}
              className="field-input"
              style={{ width: 150 }}
            />
            <button type="button" onClick={() => removeRow(setter, row.id)} className="btn-ghost-sm" style={{ color: 'var(--c-danger)' }}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ maxWidth: 900, margin: '0 auto', padding: '24px' }}>
      
      <div className="form-header" style={{ marginBottom: 24 }}>
        <button onClick={() => router.push('/settings')} className="btn-ghost-sm" style={{ marginRight: 12 }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="form-title">Business Onboarding & Opening Balances</h1>
          <p className="form-subtitle">Enter starting figures for cash, bank, inventory, and ledgers before beginning daily transactions.</p>
        </div>
      </div>

      {error && (
        <div style={{ padding: 12, background: 'var(--c-danger-light)', color: 'var(--c-danger)', borderRadius: 8, marginBottom: 24, display: 'flex', gap: 8 }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        
        {/* Left Col: Forms */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: 'var(--c-bg-card)', padding: 24, borderRadius: 12, border: '1px solid var(--c-border)', boxShadow: 'var(--shadow-sm)' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--c-text-muted)', marginBottom: 8 }}>Books Start Date <span style={{color:'red'}}>*</span></label>
            <div style={{ position: 'relative', width: 250 }}>
              <Calendar size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-muted)' }} />
              <input 
                type="date"
                value={booksStartDate}
                onChange={e => setBooksStartDate(e.target.value)}
                className="field-input"
                style={{ paddingLeft: 36 }}
              />
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--c-text-muted)', marginTop: 8 }}>All opening entries will be posted on this date.</p>
          </div>

          {renderAccountRows('Cash In Hand', cashList, setCashList, cashAccounts)}
          {renderAccountRows('Bank Accounts', bankList, setBankList, bankAccounts)}
          {renderAccountRows('All Receivables (Debits)', receivableList, setReceivableList, otherAccounts)}
          {renderAccountRows('All Payables (Credits)', payableList, setPayableList, otherAccounts)}

          {/* Stock Rows */}
          <div style={{ background: 'var(--c-bg-alt)', padding: 20, borderRadius: 12, border: '1px solid var(--c-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                Opening Stock
              </h3>
              <button type="button" onClick={addStockRow} className="btn-ghost-sm">
                <Plus size={16} /> Add Product
              </button>
            </div>
            {stockList.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--c-text-muted)' }}>No inventory.</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {stockList.map(row => (
                <div key={row.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <select
                    value={row.productName}
                    onChange={e => updateRow(setStockList, row.id, 'productName', e.target.value)}
                    className="field-input"
                    style={{ flex: 1 }}
                  >
                    <option value="">Select Product...</option>
                    {products.map(p => <option key={p.id} value={p.item_name}>{p.item_name}</option>)}
                  </select>
                  <input 
                    type="number" placeholder="Qty" value={row.qty}
                    onChange={e => updateRow(setStockList, row.id, 'qty', e.target.value)}
                    className="field-input" style={{ width: 100 }}
                  />
                  <input 
                    type="number" placeholder="Rate" value={row.rate}
                    onChange={e => updateRow(setStockList, row.id, 'rate', e.target.value)}
                    className="field-input" style={{ width: 120 }}
                  />
                  <button type="button" onClick={() => removeRow(setStockList, row.id)} className="btn-ghost-sm" style={{ color: 'var(--c-danger)' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Trial Balance Panel */}
        <div style={{ position: 'sticky', top: 24, alignSelf: 'start', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: 'var(--c-bg-card)', padding: 24, borderRadius: 12, border: '1px solid var(--c-border)', boxShadow: 'var(--shadow-md)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Scale size={20} className="text-emerald-500" /> Opening Trial Balance
            </h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--c-text-muted)' }}>Total Assets (Dr)</span>
              <span style={{ fontWeight: 600 }}>{formatPKR(totalAssets)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--c-text-muted)' }}>Total Liabilities (Cr)</span>
              <span style={{ fontWeight: 600 }}>{formatPKR(totalLiabilities)}</span>
            </div>
            
            <div style={{ height: 1, background: 'var(--c-border)', margin: '16px 0' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: '1rem', fontWeight: 800, color: 'var(--c-primary)' }}>
              <span>Computed Capital (Cr)</span>
              <span>{formatPKR(computedCapital)}</span>
            </div>
            
            <p style={{ fontSize: '0.8rem', color: 'var(--c-text-muted)', lineHeight: 1.4, marginTop: 12 }}>
              The system automatically calculates the owner's Opening Capital to perfectly balance the ledger (Assets - Liabilities = Capital).
            </p>

            <button 
              onClick={handleSave} 
              disabled={saving || !isBalanced}
              className="btn-primary" 
              style={{ width: '100%', marginTop: 24, height: 44 }}
            >
              {saving ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
              Save Opening Setup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
