'use client';

// ─── VouchersModule ───────────────────────────────────────────────────────────
// Completely rebuilt client component: clean, premium glassmorphic UI.
// Matches the emerald/slate design of Accounts / Purchases / Sales modules.
// Added a fully working double-entry Journal Voucher module under "General".
// No overlapping elements, consistent spacing, proper z-index, aligned tables.

import {
  useState, useRef, useEffect, useCallback, useTransition, Fragment,
} from 'react';
import Link from 'next/link';
import {
  Sun, Moon, LogOut, Zap, User, Lock, Plus, Search,
  ChevronDown, ChevronUp, X, Check, AlertCircle, Trash2, Loader2,
  Settings, ShoppingCart, TrendingUp, Package, Banknote,
  ArrowDownToLine, ArrowUpFromLine, Landmark, Clock, Hammer,
  Hash, Calendar, FileText, RotateCcw, Receipt, ChevronRight,
  SlidersHorizontal, ArrowLeftRight, Scale, Info, Printer
, LineChart, Grid3X3} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';

import { createVoucher, deleteVoucher, createContraVoucher } from '@/app/vouchers/actions';
import { createJournalVoucher, deleteJournalVoucher } from '@/app/vouchers/journal-actions';
import type {
  Voucher, VoucherInsert, VoucherType, BusinessSettings, Account, Purchase,
  JournalVoucher, JournalVoucherLine, JournalVoucherWithRelations,
} from '@/types/database';

// ─── Types ────────────────────────────────────────────────────────────────────

interface User { name: string; role: string; }

// ─── Constants ────────────────────────────────────────────────────────────────


const NAV_ITEMS: { id: string; label: string; icon: any; href: string; disabled?: boolean }[] = [
  { id: 'dashboard',  label: 'Dashboard',  icon: Grid3X3,        href: '/' },
  { id: 'accounts',  label: 'Accounts',  icon: User,         href: '/accounts' },
  { id: 'products',  label: 'Products',  icon: Package,      href: '/products' },
  { id: 'purchases', label: 'Purchases', icon: ShoppingCart, href: '/purchases' },
  { id: 'sales',     label: 'Sales',     icon: TrendingUp,   href: '/sales' },
  { id: 'vouchers',  label: 'Vouchers',  icon: Banknote,     href: '/vouchers' },
  { id: 'settings',  label: 'Settings',  icon: Settings,     href: '/settings' },
  { id: 'reports',   label: 'Reports',   icon: LineChart,    href: '/reports' },
];

const VOUCHER_TABS: { type: VoucherType; label: string; short: string; icon: any; color: string; dir: 'receipt' | 'payment'; }[] = [
  { type: 'Cash Receipt',  label: 'Cash Receipt',  short: 'CR', icon: ArrowDownToLine, color: '#10b981', dir: 'receipt' },
  { type: 'Cash Payment',  label: 'Cash Payment',  short: 'CP', icon: ArrowUpFromLine, color: '#ef4444', dir: 'payment' },
  { type: 'Bank Receipt',  label: 'Bank Receipt',  short: 'BR', icon: Landmark,        color: '#10b981', dir: 'receipt' },
  { type: 'Bank Payment',  label: 'Bank Payment',  short: 'BP', icon: Landmark,        color: '#ef4444', dir: 'payment' },
  { type: 'General',       label: 'Journal Voucher', short: 'JV', icon: ArrowLeftRight,  color: '#6366f1', dir: 'receipt' },
  { type: 'Contra Voucher',label: 'Contra Voucher', short: 'CV', icon: ArrowLeftRight,  color: '#f59e0b', dir: 'payment' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const cls = (...args: (string | boolean | undefined | null)[]) => args.filter(Boolean).join(' ');

function formatPKR(val: number) {
  return val.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: string) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return d; }
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

// ─── useMounted ───────────────────────────────────────────────────────────────

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return mounted;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastItem { id: number; msg: string; type: 'success' | 'error'; }

function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const next = useRef(0);

  const addToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    const id = next.current++;
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(p => p.filter(t => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

function ToastStack({ toasts, removeToast }: { toasts: ToastItem[]; removeToast: (id: number) => void }) {
  return (
    <div className="toast-stack">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            className={cls('toast', t.type === 'error' ? 'toast-error' : 'toast-success')}
          >
            {t.type === 'error' ? <AlertCircle size={15} /> : <Check size={15} />}
            <span style={{ flex: 1 }}>{t.msg}</span>
            <button className="toast-close" onClick={() => removeToast(t.id)}><X size={13} /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Combobox: Account Selector (from fixed list, required) ──────────────────

function AccountCombobox({
  accounts,
  valueId,
  onChange,
  placeholder,
  hasError,
  icon: Icon = Landmark,
}: {
  accounts: Account[];
  valueId: string;
  onChange: (id: string, name: string) => void;
  placeholder: string;
  hasError?: boolean;
  icon?: any;
}) {
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState('');
  const [cursor, setCursor] = useState(-1);
  const root   = useRef<HTMLDivElement>(null);
  const input  = useRef<HTMLInputElement>(null);

  const selected = accounts.find(a => a.id === valueId);

  // Sync display text when value changes from outside
  useEffect(() => {
    if (!open) setQuery(selected ? selected.account_title : '');
  }, [selected, open]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) {
        setOpen(false);
        setCursor(-1);
        setQuery(selected ? selected.account_title : '');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [selected]);

  const filtered = query && !(selected && query === selected.account_title)
    ? accounts.filter(a => a.account_title.toLowerCase().includes(query.toLowerCase()))
    : accounts;

  const pick = (a: Account) => {
    onChange(a.id, a.account_title);
    setQuery(a.account_title);
    setOpen(false);
    setCursor(-1);
  };

  const clear = () => {
    onChange('', '');
    setQuery('');
    setOpen(true);
    input.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { setOpen(true); return; }
    if (e.key === 'Escape') { setOpen(false); setQuery(selected ? selected.account_title : ''); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (cursor >= 0 && filtered[cursor]) pick(filtered[cursor]);
      else if (filtered.length === 1) pick(filtered[0]);
    }
  };

  return (
    <div ref={root} className="combobox-root">
      <div className="input-wrapper">
        <Icon size={16} className="input-icon" />
        <input
          ref={input}
          className={cls('field-input', hasError && 'error')}
          value={open ? query : (selected ? `${selected.account_title}${selected.total_due ? ` (Due: PKR ${formatPKR(selected.total_due)})` : ''}` : query)}
          onChange={e => { setQuery(e.target.value); setOpen(true); setCursor(-1); }}
          onFocus={() => { setOpen(true); if (selected) setQuery(''); }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
        />
        {valueId && (
          <button type="button" className="combobox-clear" tabIndex={-1} onClick={clear}>
            <X size={12} />
          </button>
        )}
        <button type="button" className="combobox-chevron" tabIndex={-1}
          onClick={() => { setOpen(o => !o); input.current?.focus(); }}>
          <ChevronDown size={14} className={cls('chevron-icon', open && 'rotated')} />
        </button>
      </div>

      {open && (
        <ul className="combobox-dropdown" role="listbox" style={{ zIndex: 200 }}>
          {filtered.length === 0
            ? <li className="combobox-empty">No accounts found</li>
            : filtered.map((a, i) => (
              <li key={a.id} role="option" aria-selected={a.id === valueId}
                className={cls('combobox-item', a.id === valueId && 'selected', cursor === i && 'highlighted')}
                onClick={() => pick(a)}
                onMouseEnter={() => setCursor(i)}>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.account_title}
                </span>
                {!!a.total_due && a.total_due > 0 && (
                  <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: 4, background: '#fee2e2', color: '#991b1b', flexShrink: 0, marginLeft: 8, fontWeight: 700 }}>
                    Due: PKR {formatPKR(a.total_due)}
                  </span>
                )}
                <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: 4, background: 'var(--c-bg-alt)', color: 'var(--c-text-muted)', flexShrink: 0, marginLeft: 8 }}>
                  {a.region}
                </span>
              </li>
            ))
          }
        </ul>
      )}
    </div>
  );
}

// ─── Combobox: Party Selector (from list + free text allowed) ────────────────

function PartyCombobox({
  accounts,
  valueId,
  valueName,
  onChange,
  placeholder,
  hasError,
}: {
  accounts: Account[];
  valueId: string;
  valueName: string;
  onChange: (id: string | null, name: string) => void;
  placeholder: string;
  hasError?: boolean;
}) {
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState(valueName);
  const [cursor, setCursor] = useState(-1);
  const root  = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { setQuery(valueName); }, [valueName]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) {
        setOpen(false);
        setCursor(-1);
        // Persist whatever was typed as a custom entry
        if (query.trim() && query !== valueName) {
          onChange(null, query.trim());
        }
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [query, valueName, onChange]);

  const filtered = accounts.filter(a =>
    !query || a.account_title.toLowerCase().includes(query.toLowerCase())
  );
  const isCustom = query.trim() !== '' && !accounts.some(
    a => a.account_title.toLowerCase() === query.trim().toLowerCase()
  );

  const pick = (a: Account) => {
    onChange(a.id, a.account_title);
    setQuery(a.account_title);
    setOpen(false);
    setCursor(-1);
  };

  const confirmCustom = () => {
    const v = query.trim();
    if (!v) return;
    onChange(null, v);
    setOpen(false);
    setCursor(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { setOpen(true); return; }
    if (e.key === 'Escape') { setOpen(false); setQuery(valueName); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (cursor >= 0 && filtered[cursor]) pick(filtered[cursor]);
      else if (isCustom) confirmCustom();
      else if (filtered.length === 1) pick(filtered[0]);
    }
  };

  return (
    <div ref={root} className="combobox-root">
      <div className="input-wrapper">
        <User size={16} className="input-icon" />
        <input
          ref={input}
          className={cls('field-input', hasError && 'error')}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setCursor(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
        />
        {query && (
          <button type="button" className="combobox-clear" tabIndex={-1}
            onClick={() => { onChange(null, ''); setQuery(''); setOpen(true); input.current?.focus(); }}>
            <X size={12} />
          </button>
        )}
        <button type="button" className="combobox-chevron" tabIndex={-1}
          onClick={() => { setOpen(o => !o); input.current?.focus(); }}>
          <ChevronDown size={14} className={cls('chevron-icon', open && 'rotated')} />
        </button>
      </div>

      {open && (
        <ul className="combobox-dropdown" role="listbox" style={{ zIndex: 200 }}>
          {filtered.map((a, i) => (
            <li key={a.id} role="option" aria-selected={a.id === valueId}
              className={cls('combobox-item', a.id === valueId && 'selected', cursor === i && 'highlighted')}
              onClick={() => pick(a)}
              onMouseEnter={() => setCursor(i)}>
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {a.account_title}
              </span>
              {a.account_type === 'Suppliers' && (a as any)._remainingDue > 0 && (
                <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: 4, background: 'rgba(239,68,68,0.12)', color: '#ef4444', flexShrink: 0, marginLeft: 4, fontWeight: 700 }}>
                  Due: Rs {new Intl.NumberFormat('en-PK').format((a as any)._remainingDue)}
                </span>
              )}
              <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: 4, background: 'var(--c-primary-light)', color: 'var(--c-primary-dark)', flexShrink: 0, marginLeft: 8 }}>
                {a.account_type}
              </span>
            </li>
          ))}
          {isCustom && (
            <li className="combobox-custom-row" onClick={confirmCustom} role="option" aria-selected={false}>
              <span className="combobox-custom-icon"><Plus size={13} /></span>
              <span>Use&nbsp;<strong>&ldquo;{query.trim()}&rdquo;</strong></span>
              <span className="combobox-custom-hint">↵ Enter</span>
            </li>
          )}
          {filtered.length === 0 && !isCustom && (
            <li className="combobox-empty">No accounts found</li>
          )}
        </ul>
      )}
    </div>
  );
}

// ─── Unified Voucher Form (Single Window for Receipts & Payments) ──────────────

interface UnifiedFormState {
  direction:          'receipt' | 'payment';
  voucher_date:       string;
  main_account_id:    string;
  main_account_name:  string;
  party_account_id:   string;
  party_account_name: string;
  amount:             string;
  details:            string;
  remarks:            string;
}

const EMPTY_UNIFIED_FORM = (): UnifiedFormState => ({
  direction:          'receipt',
  voucher_date:       todayISO(),
  main_account_id:    '',
  main_account_name:  '',
  party_account_id:   '',
  party_account_name: '',
  amount:             '',
  details:            '',
  remarks:            '',
});

function UnifiedVoucherForm({
  cashAccounts,
  bankAccounts,
  partyAccounts,
  onSave,
  isPending,
}: {
  cashAccounts: Account[];
  bankAccounts: Account[];
  partyAccounts: Account[];
  onSave: (payload: Omit<VoucherInsert, 'direction' | 'voucher_no'>) => void;
  isPending: boolean;
}) {
  const [form, setForm]     = useState<UnifiedFormState>(EMPTY_UNIFIED_FORM());
  const [errors, setErrors] = useState<Partial<Record<keyof UnifiedFormState, string>>>({});

  const cashBankAccounts = [...cashAccounts, ...bankAccounts];
  const isReceipt = form.direction === 'receipt';
  const accentColor = isReceipt ? '#10b981' : '#ef4444';

  const set = (k: keyof UnifiedFormState) => (v: any) => setForm(f => ({ ...f, [k]: v }));

  const validate = (): boolean => {
    const errs: Partial<Record<keyof UnifiedFormState, string>> = {};
    if (!form.main_account_id)           errs.main_account_id = 'Please select a Cash or Bank account.';
    if (!form.party_account_name.trim()) errs.party_account_name = isReceipt ? 'Received From name is required.' : 'Paid To name is required.';
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) errs.amount = 'Enter a valid amount (> 0).';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const channelAcc = cashBankAccounts.find(a => a.id === form.main_account_id);
    const isCash = channelAcc?.account_type === 'Cash Account';
    const voucher_type: VoucherType = isReceipt
      ? (isCash ? 'Cash Receipt' : 'Bank Receipt')
      : (isCash ? 'Cash Payment' : 'Bank Payment');

    onSave({
      voucher_type,
      voucher_date:       form.voucher_date,
      main_account_id:    form.main_account_id,
      main_account_name:  form.main_account_name,
      party_account_id:   form.party_account_id || null,
      party_account_name: form.party_account_name.trim() || null,
      amount:             parseFloat(form.amount),
      details:            form.details.trim() || null,
      remarks:            form.remarks.trim() || null,
    });
  };

  const handleReset = () => { setForm(EMPTY_UNIFIED_FORM()); setErrors({}); };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="account-form" style={{ borderTop: `3.5px solid ${accentColor}`, transition: 'border-color 0.2s' }}>

        {/* Transaction Direction Segmented Selector */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => set('direction')('receipt')}
            style={{
              flex: 1, minWidth: '180px', padding: '12px 18px', borderRadius: '10px',
              border: `2px solid ${isReceipt ? '#10b981' : 'var(--c-border)'}`,
              background: isReceipt ? 'rgba(16, 185, 129, 0.12)' : 'var(--c-bg-card)',
              color: isReceipt ? '#10b981' : 'var(--c-text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            <ArrowDownToLine size={18} />
            <span>Money IN (Received From)</span>
          </button>

          <button
            type="button"
            onClick={() => set('direction')('payment')}
            style={{
              flex: 1, minWidth: '180px', padding: '12px 18px', borderRadius: '10px',
              border: `2px solid ${!isReceipt ? '#ef4444' : 'var(--c-border)'}`,
              background: !isReceipt ? 'rgba(239, 68, 68, 0.12)' : 'var(--c-bg-card)',
              color: !isReceipt ? '#ef4444' : 'var(--c-text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            <ArrowUpFromLine size={18} />
            <span>Money OUT (Paid To)</span>
          </button>
        </div>

        {/* Form header description */}
        <div className="form-header" style={{ marginBottom: 20 }}>
          <div className="form-header-icon" style={{ background: `${accentColor}18`, color: accentColor }}>
            {isReceipt ? <ArrowDownToLine size={20} /> : <ArrowUpFromLine size={20} />}
          </div>
          <div>
            <p className="form-title" style={{ color: accentColor }}>
              {isReceipt ? 'Record Receipt (Money Received)' : 'Record Payment (Money Paid)'}
            </p>
            <p className="form-subtitle">
              {isReceipt
                ? 'Record payment received from a customer, refund, or other income into Cash or Bank.'
                : 'Record payment made to a supplier, expense, staff salary, or vendor from Cash or Bank.'}
            </p>
          </div>
        </div>

        {/* No accounts warning */}
        {cashBankAccounts.length === 0 && (
          <div className="error-banner" style={{ marginBottom: 20, background: 'rgba(251,191,36,.12)', borderColor: 'rgba(251,191,36,.4)', color: '#b45309' }}>
            <AlertCircle size={14} />
            <span>
              No Cash or Bank accounts found. Please create one in{' '}
              <Link href="/accounts" style={{ textDecoration: 'underline' }}>Account Management</Link> first.
            </span>
          </div>
        )}

        {/* Wrong Party Type Warning */}
        {(() => {
          if (!form.party_account_id) return null;
          const selectedParty = partyAccounts.find(a => a.id === form.party_account_id);
          if (!selectedParty) return null;

          if (isReceipt && selectedParty.account_type === 'Suppliers') {
            return (
              <div className="error-banner" style={{ marginBottom: 20, background: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.4)', color: '#b45309' }}>
                <span style={{ fontSize: '1.2rem', marginRight: '8px' }}>⚠️</span>
                <span>
                  <strong>Note:</strong> You are receiving money from a <strong>Supplier</strong> (e.g. refund/rebate). If paying a supplier invoice, select <strong>Money OUT (Paid To)</strong>.
                </span>
              </div>
            );
          }
          if (!isReceipt && selectedParty.account_type === 'Customers') {
            return (
              <div className="error-banner" style={{ marginBottom: 20, background: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.4)', color: '#b45309' }}>
                <span style={{ fontSize: '1.2rem', marginRight: '8px' }}>⚠️</span>
                <span>
                  <strong>Note:</strong> You are paying money to a <strong>Customer</strong> (e.g. refund). If collecting sales cash, select <strong>Money IN (Received From)</strong>.
                </span>
              </div>
            );
          }

          const enteredAmount = parseFloat(form.amount) || 0;
          if (
            enteredAmount > 0 && 
            selectedParty.total_due !== undefined && 
            enteredAmount > selectedParty.total_due &&
            (selectedParty.account_type === 'Suppliers' || selectedParty.account_type === 'Customers')
          ) {
            if ((!isReceipt && selectedParty.account_type === 'Suppliers') || (isReceipt && selectedParty.account_type === 'Customers')) {
              const overpayment = enteredAmount - selectedParty.total_due;
              return (
                <div className="error-banner" style={{ marginBottom: 20, background: 'rgba(59, 130, 246, 0.12)', borderColor: 'rgba(59, 130, 246, 0.4)', color: '#1d4ed8' }}>
                  <Info size={16} style={{ marginRight: '8px', flexShrink: 0 }} />
                  <span>
                    <strong>Overpayment Notice:</strong> Pending due is <strong>PKR {formatPKR(selectedParty.total_due)}</strong>. Extra <strong>PKR {formatPKR(overpayment)}</strong> will be logged as advance credit.
                  </span>
                </div>
              );
            }
          }

          return null;
        })()}

        {/* Row 1: Voucher Date & Auto Voucher No */}
        <div className="form-grid">
          <div className="field-group">
            <label className="field-label">Voucher Number</label>
            <div className="input-wrapper">
              <Hash size={16} className="input-icon" />
              <input
                className="field-input"
                value="Auto-generated on save"
                readOnly
                disabled
                style={{ opacity: 0.6, cursor: 'default', fontStyle: 'italic' }}
              />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">Voucher Date <span className="required">*</span></label>
            <div className="input-wrapper">
              <Calendar size={16} className="input-icon" />
              <input
                type="date"
                className="field-input"
                value={form.voucher_date}
                onChange={e => set('voucher_date')(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>
        </div>

        {/* Row 2: Payment Channel (Cash/Bank) + Party Account */}
        <div className="form-grid" style={{ position: 'relative', zIndex: 10 }}>
          <div className="field-group" style={{ position: 'relative', zIndex: 20 }}>
            <label className="field-label">
              Through Account (Cash / Bank) <span className="required">*</span>
            </label>
            <AccountCombobox
              accounts={cashBankAccounts}
              valueId={form.main_account_id}
              onChange={(id, name) => setForm(f => ({ ...f, main_account_id: id, main_account_name: name }))}
              placeholder="Select Cash or Bank account…"
              hasError={!!errors.main_account_id}
              icon={Landmark}
            />
            {errors.main_account_id && <p className="field-error"><AlertCircle size={12} />{errors.main_account_id}</p>}
          </div>

          <div className="field-group" style={{ position: 'relative', zIndex: 10 }}>
            <label className="field-label">
              {isReceipt ? 'Received From (Party / Customer / Income)' : 'Paid To (Party / Supplier / Expense)'} <span className="required">*</span>
            </label>
            <PartyCombobox
              accounts={partyAccounts}
              valueId={form.party_account_id}
              valueName={form.party_account_name}
              onChange={(id, name) => setForm(f => ({
                ...f,
                party_account_id:   id || '',
                party_account_name: name,
              }))}
              placeholder="Search party or type any custom name…"
              hasError={!!errors.party_account_name}
            />
            {errors.party_account_name && <p className="field-error"><AlertCircle size={12} />{errors.party_account_name}</p>}
          </div>
        </div>

        {/* Row 3: Amount + Narration */}
        <div className="form-grid">
          <div className="field-group">
            <label className="field-label">Amount (PKR) <span className="required">*</span></label>
            <div className="input-wrapper">
              <Banknote size={16} className="input-icon" />
              <input
                type="number"
                step="any"
                min="0.01"
                className={cls('field-input', errors.amount && 'error')}
                placeholder="0.00"
                value={form.amount}
                onChange={e => set('amount')(e.target.value)}
                disabled={isPending}
              />
            </div>
            {errors.amount && <p className="field-error"><AlertCircle size={12} />{errors.amount}</p>}
          </div>

          <div className="field-group">
            <label className="field-label">Details / Cheque / Narration</label>
            <div className="input-wrapper">
              <FileText size={16} className="input-icon" />
              <input
                className="field-input"
                placeholder="e.g. Cheque #89421 / Invoice #SA-0192"
                value={form.details}
                onChange={e => set('details')(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>
        </div>

        {/* Row 4: Remarks */}
        <div className="field-group" style={{ marginBottom: 24 }}>
          <label className="field-label">Remarks</label>
          <div className="input-wrapper" style={{ alignItems: 'flex-start' }}>
            <FileText size={16} className="input-icon" style={{ top: 12 }} />
            <textarea
              className="field-input field-textarea"
              placeholder="Optional remarks or notes for this voucher…"
              value={form.remarks}
              onChange={e => set('remarks')(e.target.value)}
              disabled={isPending}
              rows={2}
              style={{ paddingTop: 10 }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={handleReset} disabled={isPending}>
            <RotateCcw size={15} /> Reset
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={isPending || cashBankAccounts.length === 0}
            style={{ background: isReceipt ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)' }}
          >
            {isPending ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
            {isPending ? 'Saving…' : `Save ${isReceipt ? 'Receipt' : 'Payment'} Voucher`}
          </button>
        </div>
      </div>
    </form>
  );
}

// ─── Unified Voucher List ──────────────────────────────────────────────────────

function UnifiedVoucherList({
  vouchers,
  onDelete,
  isPending,
}: {
  vouchers: Voucher[];
  onDelete: (id: string) => void;
  isPending: boolean;
}) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'receipt' | 'payment' | 'cash' | 'bank'>('all');

  const filtered = vouchers.filter(v => {
    // Type/Category Filter
    if (filterType === 'receipt' && v.direction !== 'receipt') return false;
    if (filterType === 'payment' && v.direction !== 'payment') return false;
    if (filterType === 'cash' && !v.voucher_type.startsWith('Cash')) return false;
    if (filterType === 'bank' && !v.voucher_type.startsWith('Bank')) return false;

    const q = search.toLowerCase();
    if (!q) return true;
    return (
      v.voucher_no.toLowerCase().includes(q) ||
      v.voucher_type.toLowerCase().includes(q) ||
      v.main_account_name.toLowerCase().includes(q) ||
      (v.party_account_name ?? '').toLowerCase().includes(q) ||
      (v.details ?? '').toLowerCase().includes(q) ||
      (v.remarks ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="account-table-wrap">
      {/* Toolbar with Search and Filters */}
      <div className="table-toolbar" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div className="toolbar-left" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="input-wrapper search-wrapper">
            <Search size={15} className="input-icon" />
            <input
              className="field-input search-input"
              placeholder="Search vouchers (no, party, details)…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="input-icon-right" onClick={() => setSearch('')}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick Filter Buttons */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--c-bg)', padding: '3px', borderRadius: '8px', border: '1px solid var(--c-border)' }}>
            <button
              type="button"
              onClick={() => setFilterType('all')}
              style={{
                padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, borderRadius: '6px', border: 'none', cursor: 'pointer',
                background: filterType === 'all' ? 'var(--c-primary)' : 'transparent',
                color: filterType === 'all' ? '#fff' : 'var(--c-text-muted)'
              }}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterType('receipt')}
              style={{
                padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, borderRadius: '6px', border: 'none', cursor: 'pointer',
                background: filterType === 'receipt' ? '#10b981' : 'transparent',
                color: filterType === 'receipt' ? '#fff' : 'var(--c-text-muted)'
              }}
            >
              🟢 Money IN
            </button>
            <button
              type="button"
              onClick={() => setFilterType('payment')}
              style={{
                padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, borderRadius: '6px', border: 'none', cursor: 'pointer',
                background: filterType === 'payment' ? '#ef4444' : 'transparent',
                color: filterType === 'payment' ? '#fff' : 'var(--c-text-muted)'
              }}
            >
              🔴 Money OUT
            </button>
            <button
              type="button"
              onClick={() => setFilterType('cash')}
              style={{
                padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, borderRadius: '6px', border: 'none', cursor: 'pointer',
                background: filterType === 'cash' ? 'var(--c-text)' : 'transparent',
                color: filterType === 'cash' ? 'var(--c-bg)' : 'var(--c-text-muted)'
              }}
            >
              Cash
            </button>
            <button
              type="button"
              onClick={() => setFilterType('bank')}
              style={{
                padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, borderRadius: '6px', border: 'none', cursor: 'pointer',
                background: filterType === 'bank' ? 'var(--c-text)' : 'transparent',
                color: filterType === 'bank' ? 'var(--c-bg)' : 'var(--c-text-muted)'
              }}
            >
              Bank
            </button>
          </div>
        </div>

        <div className="toolbar-right">
          <span className="account-count">
            {filtered.length} {filtered.length === 1 ? 'voucher' : 'vouchers'}
          </span>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Receipt size={32} /></div>
          <p className="empty-title">No vouchers found</p>
          <p className="empty-sub">
            {search ? 'No results match your search.' : 'Use the form above to log your first voucher.'}
          </p>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th className="th-sortable" style={{ cursor: 'default' }}><span>Voucher No</span></th>
                <th className="th-sortable" style={{ cursor: 'default' }}><span>Date</span></th>
                <th className="th-sortable" style={{ cursor: 'default' }}><span>Type</span></th>
                <th className="th-sortable" style={{ cursor: 'default' }}><span>Through Account</span></th>
                <th className="th-sortable" style={{ cursor: 'default' }}><span>Received From / Paid To</span></th>
                <th className="th-sortable th-actions" style={{ cursor: 'default', textAlign: 'right' }}><span>Amount</span></th>
                <th className="th-sortable" style={{ cursor: 'default' }}><span>Narration</span></th>
                <th className="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout" initial={false}>
                {filtered.map(v => {
                  const isRec = v.direction === 'receipt';
                  const badgeColor = isRec ? '#10b981' : '#ef4444';

                  return (
                    <motion.tr
                      key={v.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.18 }}
                      className="data-row"
                    >
                      {/* Voucher No */}
                      <td data-label="Voucher #">
                        <span className="type-badge" style={{ '--badge-color': badgeColor } as React.CSSProperties}>
                          {v.voucher_no}
                        </span>
                      </td>

                      {/* Date */}
                      <td data-label="Date" style={{ color: 'var(--c-text-muted)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        {formatDate(v.voucher_date)}
                      </td>

                      {/* Voucher Type */}
                      <td data-label="Type">
                        <span style={{
                          fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
                          background: isRec ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                          color: isRec ? '#10b981' : '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '4px'
                        }}>
                          {isRec ? '↓ Money IN' : '↑ Money OUT'}
                          <span style={{ opacity: 0.7, fontSize: '0.68rem' }}>({v.voucher_type})</span>
                        </span>
                      </td>

                      {/* Main account */}
                      <td className="td-title" data-label="Through Account" style={{ maxWidth: 160 }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                          {v.main_account_name}
                        </span>
                      </td>

                      {/* Party */}
                      <td data-label="Party" style={{ maxWidth: 160 }}>
                        {v.party_account_name
                          ? <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--c-text-muted)', fontSize: '0.875rem' }}>
                              {v.party_account_name}
                            </span>
                          : <span style={{ color: 'var(--c-text-subtle)', fontStyle: 'italic' }}>—</span>
                        }
                      </td>

                      {/* Amount */}
                      <td data-label="Amount" style={{ textAlign: 'right', fontWeight: 700, color: badgeColor, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {isRec ? '+' : '-'} PKR {formatPKR(v.amount)}
                      </td>

                      {/* Narration */}
                      <td data-label="Narration" style={{ maxWidth: 220 }}>
                        {v.details || v.remarks
                          ? <div>
                              {v.details && <p style={{ color: 'var(--c-text)', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.details}</p>}
                              {v.remarks && <p style={{ color: 'var(--c-text-muted)', fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{v.remarks}</p>}
                            </div>
                          : <span style={{ color: 'var(--c-text-subtle)', fontStyle: 'italic' }}>—</span>
                        }
                      </td>

                      {/* Actions */}
                      <td onClick={e => e.stopPropagation()}>
                        <div className="row-actions">
                          <Link href={`/vouchers/${v.id}/invoice`} target="_blank" className="action-btn" style={{ color: 'var(--c-text-muted)' }} title="Print Voucher">
                            <Printer size={14} />
                          </Link>
                          <button
                            className="action-btn delete"
                            onClick={() => onDelete(v.id)}
                            disabled={isPending}
                            title="Delete voucher"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ vouchers }: { vouchers: Voucher[] }) {
  const receipts = vouchers.filter(v => v.direction === 'receipt');
  const payments = vouchers.filter(v => v.direction === 'payment');
  const totalIn  = receipts.reduce((s, v) => s + (v.amount || 0), 0);
  const totalOut = payments.reduce((s, v) => s + (v.amount || 0), 0);
  const net      = totalIn - totalOut;

  const cards = [
    { label: 'Total Receipts',  value: totalIn,  sub: `${receipts.length} entries`,  color: '#10b981', icon: ArrowDownToLine },
    { label: 'Total Payments',  value: totalOut, sub: `${payments.length} entries`,  color: '#ef4444', icon: ArrowUpFromLine },
    { label: 'Net Flow',        value: net,       sub: 'Receipts − Payments',         color: net >= 0 ? '#10b981' : '#ef4444', icon: Banknote },
    { label: 'Total Vouchers',  value: vouchers.length, sub: 'All types combined',    color: '#6366f1', icon: Receipt, isCount: true },
  ];

  return (
    <div className="stats-bar">
      {cards.map(c => {
        const Icon = c.icon;
        return (
          <div key={c.label} className="stat-card">
            <div className="stat-icon" style={{ background: `${c.color}18`, color: c.color }}>
              <Icon size={18} />
            </div>
            <div>
              <p className="stat-count" style={{ color: (c as any).isCount ? undefined : c.color }}>
                {(c as any).isCount ? c.value : `PKR ${formatPKR(c.value as number)}`}
              </p>
              <p className="stat-label">{c.label}</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--c-text-subtle)' }}>{c.sub}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({
  collapsed, onToggle, settings,
}: {
  
  
  collapsed: boolean;
  onToggle: () => void;
  settings: BusinessSettings;
}) {
  return (
    <aside className={cls('sidebar', collapsed && 'collapsed')}>
      <div className="sidebar-brand" onClick={collapsed ? onToggle : undefined}
        style={{ cursor: collapsed ? 'pointer' : 'default' }}>
        {settings.logo_url
          ? <img src={settings.logo_url} alt="Logo" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
          : <div className="sidebar-brand-icon"><Zap size={20} /></div>
        }
        {!collapsed && <span className="sidebar-brand-text">{settings.business_name}</span>}
        <button className="sidebar-collapse-btn"
          onClick={e => { if (collapsed) e.stopPropagation(); onToggle(); }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <ChevronRight size={15} /> : <SlidersHorizontal size={15} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const active = item.id === 'vouchers';
          if (item.disabled) {
            return (
              <button key={item.id} className="nav-item disabled" disabled title={collapsed ? item.label : undefined}>
                <Icon size={18} />
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && <span className="soon-badge">Soon</span>}
              </button>
            );
          }
          return (
            <Link key={item.id} href={item.href}
              className={cls('nav-item', active && 'active')}
              title={collapsed ? item.label : undefined}>
              <Icon size={18} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={cls('sidebar-footer', collapsed && 'collapsed')}>
        <div className="user-avatar-sm">{(settings?.owner_name || 'User').charAt(0)}</div>
        {!collapsed && (
          <div className="user-info-sm">
            <p className="user-name-sm">{settings?.owner_name || 'User'}</p>
            <p className="user-role-sm">{'Role'}</p>
          </div>
        )}
        
      </div>
    </aside>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header({ toggleDark, dark, voucherCount, isPending, settings }: {
  toggleDark: () => void;
  dark: boolean;
  
  voucherCount: number;
  isPending: boolean;
  settings: any;
}) {
  const mounted = useMounted();
  const now = mounted
    ? new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <header className="app-header">
      <div className="header-left">
        <h1 className="header-title">Voucher Management</h1>
        <p className="header-date" suppressHydrationWarning>{now}</p>
      </div>
      <div className="header-right">
        <div className="stat-pill">
          {isPending ? <Loader2 size={13} className="spin" /> : <Receipt size={13} />}
          <span>{voucherCount} Vouchers</span>
        </div>
        <button className="icon-btn" onClick={toggleDark} title="Toggle theme">
          {dark ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        <div className="user-chip">
          <div className="user-avatar">{(settings?.owner_name || 'User').charAt(0)}</div>
          <span className="user-chip-name">{settings?.owner_name || 'User'}</span>
        </div>
      </div>
    </header>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

// ─── Journal Account Combobox (For dynamic lines table) ─────────────────────

function JournalAccountCombobox({
  accounts,
  valueId,
  onChange,
  placeholder,
  hasError,
}: {
  accounts: Account[];
  valueId: string;
  onChange: (id: string, name: string) => void;
  placeholder: string;
  hasError?: boolean;
}) {
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState('');
  const [cursor, setCursor] = useState(-1);
  const root   = useRef<HTMLDivElement>(null);
  const input  = useRef<HTMLInputElement>(null);

  const selected = accounts.find(a => a.id === valueId);

  useEffect(() => {
    if (!open) setQuery(selected ? selected.account_title : '');
  }, [selected, open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) {
        setOpen(false);
        setCursor(-1);
        setQuery(selected ? selected.account_title : '');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [selected]);

  const filtered = query && !(selected && query === selected.account_title)
    ? accounts.filter(a => a.account_title.toLowerCase().includes(query.toLowerCase()))
    : accounts;

  const pick = (a: Account) => {
    onChange(a.id, a.account_title);
    setQuery(a.account_title);
    setOpen(false);
    setCursor(-1);
  };

  const clear = () => {
    onChange('', '');
    setQuery('');
    setOpen(true);
    input.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { setOpen(true); return; }
    if (e.key === 'Escape') { setOpen(false); setQuery(selected ? selected.account_title : ''); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (cursor >= 0 && filtered[cursor]) pick(filtered[cursor]);
      else if (filtered.length === 1) pick(filtered[0]);
    }
  };

  return (
    <div ref={root} className="combobox-root" style={{ minWidth: 160 }}>
      <div className="input-wrapper">
        <Landmark size={15} className="input-icon" />
        <input
          ref={input}
          className={cls('field-input', hasError && 'error')}
          value={open ? query : (selected ? `${selected.account_title}${selected.total_due ? ` (Due: PKR ${formatPKR(selected.total_due)})` : ''}` : query)}
          onChange={e => { setQuery(e.target.value); setOpen(true); setCursor(-1); }}
          onFocus={() => { setOpen(true); if (selected) setQuery(''); }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          style={{ paddingLeft: 34, paddingRight: 45, height: 38 }}
        />
        {valueId && (
          <button type="button" className="combobox-clear" tabIndex={-1} onClick={clear} style={{ right: 26, width: 16, height: 16 }}>
            <X size={10} />
          </button>
        )}
        <button type="button" className="combobox-chevron" tabIndex={-1}
          onClick={() => { setOpen(o => !o); input.current?.focus(); }} style={{ right: 4 }}>
          <ChevronDown size={12} className={cls('chevron-icon', open && 'rotated')} />
        </button>
      </div>

      {open && (
        <ul className="combobox-dropdown" role="listbox" style={{ zIndex: 300, maxHeight: 180 }}>
          {filtered.length === 0
            ? <li className="combobox-empty">No accounts</li>
            : filtered.map((a, i) => (
              <li key={a.id} role="option" aria-selected={a.id === valueId}
                className={cls('combobox-item', a.id === valueId && 'selected', cursor === i && 'highlighted')}
                onClick={() => pick(a)}
                onMouseEnter={() => setCursor(i)}
                style={{ padding: '6px 10px', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0 }}>
                  <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.account_title}
                  </span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2, fontSize: '0.68rem', color: 'var(--c-text-muted)' }}>
                    <span>{a.account_type}</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {!!a.total_due && a.total_due > 0 && (
                        <span style={{ fontWeight: 700, color: '#ef4444' }}>
                          Due: PKR {formatPKR(a.total_due)}
                        </span>
                      )}
                      {!['Customers', 'Suppliers'].includes(a.account_type) && (
                        <span style={{ fontWeight: 700, color: (a.balance || 0) >= 0 ? 'var(--c-primary)' : '#ef4444' }}>
                          Bal: PKR {formatPKR(a.balance || 0)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))
          }
        </ul>
      )}
    </div>
  );
}

// ─── Journal Voucher Form ─────────────────────────────────────────────────────

interface JournalLineState {
  account_id: string;
  account_name: string;
  remarks: string;
  debit: string;
  credit: string;
}

function JournalVoucherForm({
  accounts,
  onSave,
  isPending,
}: {
  accounts: Account[];
  onSave: (header: { voucher_date: string; remarks: string | null }, lines: JournalLineState[]) => void;
  isPending: boolean;
}) {
  const [voucherDate, setVoucherDate] = useState(todayISO());
  const [remarks, setRemarks]         = useState('');
  const [lines, setLines]             = useState<JournalLineState[]>([
    { account_id: '', account_name: '', remarks: '', debit: '', credit: '' },
    { account_id: '', account_name: '', remarks: '', debit: '', credit: '' }
  ]);
  const [errors, setErrors]           = useState<string | null>(null);

  const addLine = () => {
    setLines(p => [...p, { account_id: '', account_name: '', remarks: '', debit: '', credit: '' }]);
  };

  const removeLine = (idx: number) => {
    if (lines.length <= 2) return;
    setLines(p => p.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, key: keyof JournalLineState, val: string) => {
    setLines(p => p.map((l, i) => {
      if (i !== idx) return l;
      const updated = { ...l, [key]: val };

      // Mutually exclusive: Debit clears Credit, Credit clears Debit
      if (key === 'debit' && parseFloat(val) > 0) {
        updated.credit = '';
      } else if (key === 'credit' && parseFloat(val) > 0) {
        updated.debit = '';
      }
      return updated;
    }));
  };

  const totalDebit  = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
  const diff        = Math.abs(totalDebit - totalCredit);
  const isBalanced  = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.01;
  const hasValidAccounts = lines.every(l => l.account_id !== '');

  const handleReset = () => {
    setVoucherDate(todayISO());
    setRemarks('');
    setLines([
      { account_id: '', account_name: '', remarks: '', debit: '', credit: '' },
      { account_id: '', account_name: '', remarks: '', debit: '', credit: '' }
    ]);
    setErrors(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors(null);

    if (lines.length < 2) {
      setErrors('A journal voucher must contain at least 2 posting lines.');
      return;
    }
    if (!hasValidAccounts) {
      setErrors('Please select an account for all line entries.');
      return;
    }
    if (!isBalanced) {
      setErrors(`Voucher is out of balance. Total Debit must equal Total Credit.`);
      return;
    }

    onSave(
      { voucher_date: voucherDate, remarks: remarks.trim() || null },
      lines
    );
  };

  // Reset lines on successful save
  useEffect(() => {
    if (!isPending && errors === null) {
      // Checked if saved successfully
    }
  }, [isPending]);

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="account-form" style={{ borderTop: '3px solid #6366f1' }}>
        
        {/* Form header */}
        <div className="form-header">
          <div className="form-header-icon" style={{ background: '#6366f118', color: '#6366f1' }}>
            <ArrowLeftRight size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <p className="form-title">General Journal / Adjusting Entry</p>
            <p className="form-subtitle">Settle balances and post non-cash double-entry adjustments between ledgers</p>
          </div>
        </div>

        {/* Info box explaining settlements */}
        <div style={{
          display: 'flex', gap: 10, padding: 14, background: 'var(--c-bg-input)',
          border: '1.5px solid var(--c-border)', borderRadius: 'var(--radius-sm)',
          fontSize: '0.82rem', color: 'var(--c-text-muted)', marginBottom: 20,
          alignItems: 'flex-start'
        }}>
          <Info size={16} style={{ color: '#6366f1', flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>How it works:</strong> Use Journal Vouchers for double-entry transactions (e.g., settling accounts where Party A pays Party B directly, or posting depreciation and adjustments). Every line is either a <strong>Debit</strong> or a <strong>Credit</strong>. Total Debit must equal Total Credit.
          </div>
        </div>

        {/* Row 1: Voucher No + Date */}
        <div className="form-grid" style={{ marginBottom: 20 }}>
          <div className="field-group">
            <label className="field-label">Voucher Number</label>
            <div className="input-wrapper">
              <Hash size={16} className="input-icon" />
              <input
                className="field-input"
                value="Auto-generated (JV-XXXXX)"
                readOnly
                disabled
                style={{ opacity: 0.6, cursor: 'default', fontStyle: 'italic' }}
              />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">Voucher Date <span className="required">*</span></label>
            <div className="input-wrapper">
              <Calendar size={16} className="input-icon" />
              <input
                type="date"
                className="field-input"
                value={voucherDate}
                onChange={e => setVoucherDate(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>
        </div>

        {/* Dynamic Lines Table */}
        <div className="table-scroll" style={{ marginBottom: 20, overflow: 'visible' }}>
          <table className="data-table table-keep" style={{ borderCollapse: 'separate', borderSpacing: '0 8px' }}>
            <thead>
              <tr>
                <th style={{ background: 'transparent', border: 'none', paddingLeft: 4, width: '40%' }}>Account Name <span className="required">*</span></th>
                <th style={{ background: 'transparent', border: 'none', width: '30%' }}>Line Remarks / Narration</th>
                <th style={{ background: 'transparent', border: 'none', width: '15%', textAlign: 'right' }}>Debit (IN / Asset +)</th>
                <th style={{ background: 'transparent', border: 'none', width: '15%', textAlign: 'right' }}>Credit (OUT / Asset -)</th>
                <th style={{ background: 'transparent', border: 'none', width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx} style={{ background: 'var(--c-bg-input)', borderRadius: 'var(--radius-sm)' }}>
                  {/* Account Combobox */}
                  <td style={{ border: 'none', padding: '6px 8px', overflow: 'visible' }}>
                    <JournalAccountCombobox
                      accounts={accounts}
                      valueId={line.account_id}
                      onChange={(id, name) => {
                        setLines(p => p.map((l, i) => i === idx ? { ...l, account_id: id, account_name: name } : l));
                      }}
                      placeholder="Select account…"
                    />
                  </td>

                  {/* Remarks */}
                  <td style={{ border: 'none', padding: '6px 8px' }}>
                    <input
                      className="field-input"
                      value={line.remarks}
                      placeholder="Optional narration…"
                      onChange={e => updateLine(idx, 'remarks', e.target.value)}
                      disabled={isPending}
                      style={{ height: 38, paddingLeft: 12 }}
                    />
                  </td>

                  {/* Debit */}
                  <td style={{ border: 'none', padding: '6px 8px' }}>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="field-input"
                      value={line.debit}
                      placeholder="0.00"
                      onChange={e => updateLine(idx, 'debit', e.target.value)}
                      disabled={isPending || parseFloat(line.credit) > 0}
                      style={{ height: 38, paddingLeft: 12, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                    />
                  </td>

                  {/* Credit */}
                  <td style={{ border: 'none', padding: '6px 8px' }}>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="field-input"
                      value={line.credit}
                      placeholder="0.00"
                      onChange={e => updateLine(idx, 'credit', e.target.value)}
                      disabled={isPending || parseFloat(line.debit) > 0}
                      style={{ height: 38, paddingLeft: 12, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                    />
                  </td>

                  {/* Delete Button */}
                  <td style={{ border: 'none', padding: '6px 8px', textAlign: 'center' }}>
                    <button
                      type="button"
                      className="action-btn delete"
                      onClick={() => removeLine(idx)}
                      disabled={isPending || lines.length <= 2}
                      style={{ opacity: lines.length <= 2 ? 0.4 : 1, cursor: lines.length <= 2 ? 'not-allowed' : 'pointer' }}
                      title="Remove line"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Line button */}
        <button
          type="button"
          className="btn-secondary"
          onClick={addLine}
          disabled={isPending}
          style={{ minHeight: 36, padding: '6px 16px', fontSize: '0.85rem', marginBottom: 24 }}
        >
          <Plus size={14} /> Add Posting Line
        </button>

        {/* Error Notification */}
        {errors && (
          <div className="error-banner" style={{ marginBottom: 20 }}>
            <AlertCircle size={14} />
            <span>{errors}</span>
          </div>
        )}

        {/* Footer info: overall remarks + totals */}
        <div style={{
          display: 'grid', gap: 20,
          borderTop: '1.5px solid var(--c-border)', paddingTop: 20, marginTop: 10,
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))'
        }}>
          
          {/* Left: Overall Remarks */}
          <div className="field-group">
            <label className="field-label">Overall Journal Remarks / Description</label>
            <textarea
              className="field-input field-textarea"
              placeholder="Provide context or explanation for this journal entry adjustments…"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              disabled={isPending}
              rows={2}
              style={{ minHeight: 70 }}
            />
          </div>

          {/* Right: Totals, Difference, status indicator */}
          <div style={{
            background: 'var(--c-bg-input)', border: '1.5px solid var(--c-border)',
            borderRadius: 'var(--radius-sm)', padding: '16px 20px', display: 'flex',
            flexDirection: 'column', gap: 10
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
              <span style={{ color: 'var(--c-text-muted)', fontWeight: 500 }}>Total Debits:</span>
              <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>PKR {formatPKR(totalDebit)}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
              <span style={{ color: 'var(--c-text-muted)', fontWeight: 500 }}>Total Credits:</span>
              <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>PKR {formatPKR(totalCredit)}</span>
            </div>

            <div style={{
              display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem',
              borderTop: '1px dashed var(--c-border)', paddingTop: 8, marginTop: 2
            }}>
              <span style={{ color: 'var(--c-text-muted)', fontWeight: 500 }}>Difference:</span>
              <span style={{ fontWeight: 700, color: diff > 0.01 ? 'var(--c-danger)' : 'var(--c-primary)', fontVariantNumeric: 'tabular-nums' }}>
                PKR {formatPKR(diff)}
              </span>
            </div>

            {/* Balanced Indicator */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem',
              background: isBalanced ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.06)',
              border: `1px solid ${isBalanced ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.15)'}`,
              borderRadius: 6, padding: '8px 12px', marginTop: 4,
              color: isBalanced ? 'var(--c-primary-dark)' : 'var(--c-danger)'
            }}>
              {isBalanced ? <Scale size={16} /> : <AlertCircle size={16} />}
              <span style={{ fontWeight: 600 }}>
                {isBalanced
                  ? 'Balanced ✅ — Ready to post'
                  : totalDebit === 0 && totalCredit === 0
                    ? 'Enter debit and credit amounts'
                    : `Out of balance by PKR ${formatPKR(diff)}`
                }
              </span>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="form-actions" style={{ marginTop: 24, borderTop: '1px solid var(--c-border)', paddingTop: 20 }}>
          <button type="button" className="btn-secondary" onClick={handleReset} disabled={isPending}>
            <RotateCcw size={15} /> Reset
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={isPending || !isBalanced || !hasValidAccounts}
            style={isBalanced && hasValidAccounts ? { background: 'linear-gradient(135deg, #6366f1, #4f46e5)' } : undefined}
          >
            {isPending ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
            {isPending ? 'Posting Entry…' : 'Post Journal Voucher'}
          </button>
        </div>

      </div>
    </form>
  );
}

// ─── Contra Voucher Form ──────────────────────────────────────────────────────

function ContraVoucherForm({
  cashBankAccounts,
  onSave,
  isPending,
}: {
  cashBankAccounts: Account[];
  onSave: (payload: any) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({ voucher_date: todayISO(), from_account_id: '', to_account_id: '', amount: '', remarks: '' });
  const [errors, setErrors] = useState<any>({});
  const [fromBalance, setFromBalance] = useState<number | null>(null);
  const [fetchingBalance, setFetchingBalance] = useState(false);

  useEffect(() => {
    if (form.from_account_id) {
      setFetchingBalance(true);
      fetch(`/api/reports/account-statement?accountId=${form.from_account_id}&from=2000-01-01&to=2099-12-31`)
        .then(res => res.json())
        .then(json => {
          if (json.success && json.data) {
            setFromBalance(json.data.closingBalance);
          }
        })
        .finally(() => setFetchingBalance(false));
    } else {
      setFromBalance(null);
    }
  }, [form.from_account_id]);

  const validate = () => {
    const errs: any = {};
    if (!form.from_account_id) errs.from_account_id = 'Please select a From Account.';
    if (!form.to_account_id) errs.to_account_id = 'Please select a To Account.';
    if (form.from_account_id === form.to_account_id) errs.to_account_id = 'From and To accounts cannot be the same.';
    const amt = parseFloat(form.amount);
    if (!amt || isNaN(amt) || amt <= 0) errs.amount = 'Amount must be greater than 0.';
    if (amt > 0 && fromBalance !== null && amt > fromBalance) errs.amount = 'Amount exceeds available balance.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const fromAcc = cashBankAccounts.find(a => a.id === form.from_account_id);
    const toAcc = cashBankAccounts.find(a => a.id === form.to_account_id);
    onSave({
      voucher_date: form.voucher_date,
      from_account_id: fromAcc?.id,
      from_account_name: fromAcc?.account_title,
      to_account_id: toAcc?.id,
      to_account_name: toAcc?.account_title,
      amount: parseFloat(form.amount),
      remarks: form.remarks
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="account-form" style={{ borderTop: `3px solid #f59e0b` }}>
        <div className="form-header">
          <div className="form-header-icon" style={{ background: `#f59e0b18`, color: '#f59e0b' }}>
            <ArrowLeftRight size={20} />
          </div>
          <div>
            <p className="form-title">Contra Voucher</p>
            <p className="form-subtitle">Record internal fund transfers (e.g. Cash to Bank, Bank to Bank).</p>
          </div>
        </div>

        {errors.general && (
          <div className="error-banner" style={{ marginBottom: 20 }}>
            <AlertCircle size={14} /><span>{errors.general}</span>
          </div>
        )}

        <div className="form-grid">
          <div className="field-group">
            <label className="field-label">Voucher Date <span className="required">*</span></label>
            <div className="input-wrapper">
              <Calendar size={16} className="input-icon" />
              <input type="date" className="field-input" value={form.voucher_date} onChange={e => setForm(f => ({ ...f, voucher_date: e.target.value }))} disabled={isPending} />
            </div>
          </div>
          <div className="field-group">
          </div>
        </div>

        <div className="form-grid" style={{ position: 'relative', zIndex: 20 }}>
          <div className="field-group">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label className="field-label">From Account (Credit) <span className="required">*</span></label>
              {fetchingBalance ? (
                <span style={{ fontSize: '0.7rem', color: 'var(--c-text-muted)' }}><Loader2 size={10} className="spin" style={{ display: 'inline' }}/> checking balance...</span>
              ) : fromBalance !== null ? (
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: fromBalance >= 0 ? 'var(--c-primary-dark)' : 'var(--c-danger)' }}>
                  Avail: {formatPKR(fromBalance)}
                </span>
              ) : null}
            </div>
            <select className={cls('field-input', errors.from_account_id && 'error')} value={form.from_account_id} onChange={e => setForm(f => ({ ...f, from_account_id: e.target.value }))} disabled={isPending}>
              <option value="">Select Cash/Bank Account...</option>
              {cashBankAccounts.map(a => <option key={a.id} value={a.id}>{a.account_title}</option>)}
            </select>
            {errors.from_account_id && <span className="field-error">{errors.from_account_id}</span>}
          </div>

          <div className="field-group">
            <label className="field-label">To Account (Debit) <span className="required">*</span></label>
            <select className={cls('field-input', errors.to_account_id && 'error')} value={form.to_account_id} onChange={e => setForm(f => ({ ...f, to_account_id: e.target.value }))} disabled={isPending}>
              <option value="">Select Cash/Bank Account...</option>
              {cashBankAccounts.map(a => <option key={a.id} value={a.id}>{a.account_title}</option>)}
            </select>
            {errors.to_account_id && <span className="field-error">{errors.to_account_id}</span>}
          </div>
        </div>

        <div className="form-grid">
          <div className="field-group">
            <label className="field-label">Amount (PKR) <span className="required">*</span></label>
            <div className="input-wrapper">
              <Banknote size={16} className="input-icon" />
              <input type="number" step="0.01" className={cls('field-input', errors.amount && 'error')} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} disabled={isPending} placeholder="0.00" />
            </div>
            {errors.amount && <span className="field-error">{errors.amount}</span>}
          </div>

          <div className="field-group">
            <label className="field-label">Remarks / Details</label>
            <div className="input-wrapper">
              <FileText size={16} className="input-icon" />
              <input type="text" className="field-input" value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} disabled={isPending} placeholder="Cheque no, transfer ref, etc." />
            </div>
          </div>
        </div>

        <div className="form-actions" style={{ marginTop: 24, borderTop: '1px solid var(--c-border)', paddingTop: 20 }}>
          <button type="button" className="btn-secondary" onClick={() => { setForm({ voucher_date: todayISO(), from_account_id: '', to_account_id: '', amount: '', remarks: '' }); setErrors({}); }} disabled={isPending}>
            <RotateCcw size={15} /> Reset
          </button>
          <button type="submit" className="btn-primary" disabled={isPending} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            {isPending ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
            {isPending ? 'Saving…' : 'Save Contra Voucher'}
          </button>
        </div>
      </div>
    </form>
  );
}

// ─── Journal Voucher List ─────────────────────────────────────────────────────

function JournalVoucherList({
  vouchers,
  onDelete,
  isPending,
}: {
  vouchers: JournalVoucher[];
  onDelete: (id: string) => void;
  isPending: boolean;
}) {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedLines, setExpandedLines] = useState<Record<string, JournalVoucherLine[]>>({});
  const [loadingLines, setLoadingLines] = useState<Record<string, boolean>>({});

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(id);

    // If lines not loaded yet, fetch them
    if (!expandedLines[id]) {
      setLoadingLines(p => ({ ...p, [id]: true }));
      try {
        const { getJournalVoucherById } = await import('@/app/vouchers/journal-actions');
        const res = await getJournalVoucherById(id);
        if (res.success) {
          setExpandedLines(p => ({ ...p, [id]: res.data.lines }));
        }
      } catch (err) {
        console.error('Failed to load voucher lines:', err);
      } finally {
        setLoadingLines(p => ({ ...p, [id]: false }));
      }
    }
  };

  const filtered = vouchers.filter(v => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      v.voucher_no.toLowerCase().includes(q) ||
      (v.remarks ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="account-table-wrap">
      {/* Toolbar */}
      <div className="table-toolbar">
        <div className="toolbar-left">
          <div className="input-wrapper search-wrapper">
            <Search size={15} className="input-icon" />
            <input
              className="field-input search-input"
              placeholder="Search journals (JV-XXXXX)…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="input-icon-right" onClick={() => setSearch('')}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        <div className="toolbar-right">
          <span className="account-count">
            {filtered.length} {filtered.length === 1 ? 'journal' : 'journals'}
          </span>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Receipt size={32} /></div>
          <p className="empty-title">No Journal Vouchers logged</p>
          <p className="empty-sub">
            {search ? 'No results match your search.' : 'Use the form above to log your first double-entry journal.'}
          </p>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="data-table table-keep" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th className="th-sortable" style={{ cursor: 'default' }}><span>Voucher No</span></th>
                <th className="th-sortable" style={{ cursor: 'default' }}><span>Date</span></th>
                <th className="th-sortable th-actions" style={{ cursor: 'default', textAlign: 'right', paddingRight: 40 }}>
                  <span>Debit / Credit Total</span>
                </th>
                <th className="th-sortable" style={{ cursor: 'default' }}><span>General Remarks</span></th>
                <th className="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => {
                const isExpanded = expandedId === v.id;
                const lines = expandedLines[v.id] || [];
                const isLoading = loadingLines[v.id];

                return (
                  <Fragment key={v.id}>
                    {/* Header Row */}
                    <tr
                      key={v.id}
                      className={cls('data-row', isExpanded && 'expanded-header')}
                      onClick={() => toggleExpand(v.id)}
                      style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                    >
                      {/* Chevron Toggle */}
                      <td style={{ textAlign: 'center', padding: '12px 6px' }}>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </td>

                      {/* Voucher No */}
                      <td>
                        <span className="type-badge" style={{ '--badge-color': '#6366f1' } as React.CSSProperties}>
                          {v.voucher_no}
                        </span>
                      </td>

                      {/* Date */}
                      <td style={{ color: 'var(--c-text-muted)', fontSize: '0.85rem' }}>
                        {formatDate(v.voucher_date)}
                      </td>

                      {/* Total Amount (balanced) */}
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--c-text)', paddingRight: 40, fontVariantNumeric: 'tabular-nums' }}>
                        PKR {formatPKR(v.total_debit)}
                      </td>

                      {/* Remarks */}
                      <td style={{ color: 'var(--c-text-muted)', fontSize: '0.84rem', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {v.remarks || <span style={{ fontStyle: 'italic', color: 'var(--c-text-subtle)' }}>No remarks</span>}
                      </td>

                      {/* Actions (Delete/Print) */}
                      <td onClick={e => e.stopPropagation()}>
                        <div className="row-actions">
                          <Link href={`/vouchers/${v.id}/invoice`} target="_blank" className="action-btn" style={{ color: 'var(--c-text-muted)' }} title="Print Journal Voucher">
                            <Printer size={14} />
                          </Link>
                          <button
                            className="action-btn delete"
                            onClick={() => onDelete(v.id)}
                            disabled={isPending}
                            title="Delete Journal Voucher"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Line Details */}
                    {isExpanded && (
                      <tr style={{ background: 'color-mix(in srgb, var(--c-primary) 3%, transparent)' }}>
                        <td colSpan={6} style={{ padding: '16px 24px', borderBottom: '1.5px solid var(--c-border)' }}>
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{ overflow: 'hidden' }}
                          >
                            <h5 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--c-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
                              Double-Entry Journal Postings
                            </h5>

                            {isLoading ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, color: 'var(--c-text-muted)', fontSize: '0.85rem' }}>
                                <Loader2 size={14} className="spin" /> Loading posting entries…
                              </div>
                            ) : (
                              <table className="data-table table-keep" style={{ background: 'var(--c-bg-card)', border: '1.5px solid var(--c-border)', borderRadius: 8, width: '100%', fontSize: '0.82rem' }}>
                                <thead>
                                  <tr style={{ background: 'var(--c-bg-input)' }}>
                                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--c-text-muted)' }}>Account Name</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--c-text-muted)' }}>Line Remarks / Narration</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--c-text-muted)', width: '130px' }}>Debit (PKR)</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--c-text-muted)', width: '130px' }}>Credit (PKR)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {lines.map(line => (
                                    <tr key={line.id} style={{ borderBottom: '1px solid var(--c-border)' }}>
                                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{line.account_name}</td>
                                      <td style={{ padding: '8px 12px', color: 'var(--c-text-muted)' }}>{line.remarks || '—'}</td>
                                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: line.debit > 0 ? '#6366f1' : undefined, fontVariantNumeric: 'tabular-nums' }}>
                                        {line.debit > 0 ? formatPKR(line.debit) : '—'}
                                      </td>
                                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: line.credit > 0 ? '#ef4444' : undefined, fontVariantNumeric: 'tabular-nums' }}>
                                        {line.credit > 0 ? formatPKR(line.credit) : '—'}
                                      </td>
                                    </tr>
                                  ))}
                                  {/* Summary Row */}
                                  <tr style={{ background: 'var(--c-bg-input)', fontWeight: 700 }}>
                                    <td colSpan={2} style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--c-text-muted)' }}>Balanced Total:</td>
                                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#6366f1', fontVariantNumeric: 'tabular-nums' }}>
                                      PKR {formatPKR(v.total_debit)}
                                    </td>
                                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#ef4444', fontVariantNumeric: 'tabular-nums' }}>
                                      PKR {formatPKR(v.total_credit)}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            )}
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TabBar({ activeType, onChange }: { activeType: string; onChange: (v: any) => void }) {
  const tabs = [
    { id: 'Unified', label: 'Vouchers (Receipt & Payment)', icon: <ArrowLeftRight size={15} /> },
    { id: 'General', label: 'Journal Voucher (JV)', icon: <Scale size={15} /> },
    { id: 'Contra Voucher', label: 'Contra Voucher (CV)', icon: <Landmark size={15} /> },
  ];

  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap', overflowX: 'auto' }} className="hide-scroll">
      {tabs.map(t => {
        const isActive = activeType === t.id || (t.id === 'Unified' && ['Cash Receipt', 'Cash Payment', 'Bank Receipt', 'Bank Payment'].includes(activeType));
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id as any)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '8px 18px', borderRadius: '100px', fontSize: '0.9rem',
              fontWeight: 600, cursor: 'pointer',
              backgroundColor: isActive ? 'var(--c-emerald)' : 'var(--c-surface)',
              color: isActive ? '#fff' : 'var(--c-text)',
              border: `1.5px solid ${isActive ? 'var(--c-emerald)' : 'var(--c-border)'}`,
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
              boxShadow: isActive ? '0 2px 8px rgba(16, 185, 129, 0.25)' : 'none'
            }}
          >
            {t.icon}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main VouchersModule ──────────────────────────────────────────────────────

export default function VouchersModule({
  initialCashAccounts,
  initialBankAccounts,
  initialPartyAccounts,
  initialVouchers,
  initialJournalVouchers,
  initialPurchases = [],
  settings,
}: {
  initialCashAccounts:    Account[];
  initialBankAccounts:    Account[];
  initialPartyAccounts:   Account[];
  initialVouchers:        Voucher[];
  initialJournalVouchers: JournalVoucher[];
  initialPurchases?:      Purchase[];
  settings:               BusinessSettings;
}) {
  
  const mounted  = useMounted();

  // ── Theme
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved) setDark(saved === 'dark');
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  // ── Auth
  const handleLogin = (u: any) => { 
    sessionStorage.setItem('erp_user', JSON.stringify(u));
    if (typeof addToast === 'function') addToast(`Welcome back, ${u.name}!`); 
  };
  
  // ── Data
  const cashAccounts  = initialCashAccounts;
  const bankAccounts  = initialBankAccounts;
  // Enrich party accounts with remaining due from purchases
  const partyAccounts = initialPartyAccounts.map(a => {
    if (a.account_type === 'Suppliers') {
      const due = (initialPurchases || []).filter(p => p.supplier_id === a.id && (p.remainingAmount || 0) > 0).reduce((s, p) => s + (p.remainingAmount || 0), 0);
      return { ...a, _remainingDue: due } as any;
    }
    return a;
  });
  const [vouchers, setVouchers] = useState<Voucher[]>(initialVouchers);
  const [journalVouchers, setJournalVouchers] = useState<JournalVoucher[]>(initialJournalVouchers);

  // ── UI State (Defaults to Unified single-window voucher)
  const [activeTab, setActiveTab]           = useState<string>('Unified');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isPending, startTransition]        = useTransition();
  const { toasts, addToast, removeToast }   = useToast();

  // ── Create Cash/Bank voucher
  const handleSave = (payload: Omit<VoucherInsert, 'direction' | 'voucher_no'>) => {
    startTransition(async () => {
      const result = await createVoucher(payload);
      if (result.success) {
        setVouchers(prev => [result.data, ...prev]);
        addToast(`Voucher ${result.data.voucher_no} logged successfully!`);
      } else {
        addToast(result.error, 'error');
      }
    });
  };

  // ── Delete Cash/Bank voucher
  const handleDelete = (id: string) => {
    const backup = [...vouchers];
    setVouchers(prev => prev.filter(v => v.id !== id));
    startTransition(async () => {
      const result = await deleteVoucher(id);
      if (result.success) {
        addToast('Voucher deleted.', 'error');
      } else {
        setVouchers(backup);
        addToast(result.error, 'error');
      }
    });
  };

  // ── Create Journal Voucher
  const handleSaveJournal = (
    header: { voucher_date: string; remarks: string | null },
    lines: JournalLineState[]
  ) => {
    startTransition(async () => {
      const formattedLines = lines.map(l => ({
        account_id: l.account_id,
        remarks: l.remarks.trim() || null,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0
      }));

      const result = await createJournalVoucher(header, formattedLines);
      if (result.success) {
        setJournalVouchers(prev => [result.data, ...prev]);
        addToast(`Journal Voucher ${result.data.voucher_no} posted successfully!`);
      } else {
        addToast(result.error, 'error');
      }
    });
  };

  // ── Delete Journal Voucher
  const handleDeleteJournal = (id: string) => {
    const backup = [...journalVouchers];
    setJournalVouchers(prev => prev.filter(v => v.id !== id));
    startTransition(async () => {
      const result = await deleteJournalVoucher(id);
      if (result.success) {
        addToast('Journal Voucher deleted and postings reversed.', 'error');
      } else {
        setJournalVouchers(backup);
        addToast(result.error, 'error');
      }
    });
  };

  // ── Create Contra Voucher
  const handleSaveContra = (payload: any) => {
    startTransition(async () => {
      const result = await createContraVoucher(payload);
      if (result.success) {
        setVouchers(prev => [result.data, ...prev]);
        addToast(`Contra Voucher ${result.data.voucher_no} logged successfully!`);
      } else {
        addToast(result.error, 'error');
      }
    });
  };

  const contraVouchers = vouchers.filter(v => v.voucher_type === 'Contra Voucher');

  // Hydration guard
  if (!mounted) {
    return <div style={{ visibility: 'hidden', minHeight: '100vh' }} suppressHydrationWarning />;
  }

  return (
    <div className="app-shell" suppressHydrationWarning>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(c => !c)}
        settings={settings}
      />

      <div className="app-main">
        <Header
          toggleDark={() => setDark(d => !d)}
          dark={dark}
          voucherCount={vouchers.length + journalVouchers.length}
          isPending={isPending}
          settings={settings}
        />

        <main className="app-content">
          {/* Stats */}
          <StatsBar vouchers={vouchers} />

          {/* Tab Bar */}
          <TabBar activeType={activeTab} onChange={setActiveTab} />

          {/* Tab content */}
          <AnimatePresence mode="wait">
            {activeTab === 'General' ? (
              <motion.div
                key="general"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
              >
                {/* Journal Voucher Form */}
                <JournalVoucherForm
                  accounts={partyAccounts}
                  onSave={handleSaveJournal}
                  isPending={isPending}
                />

                {/* Journal Voucher List */}
                <JournalVoucherList
                  vouchers={journalVouchers}
                  onDelete={handleDeleteJournal}
                  isPending={isPending}
                />
              </motion.div>
            ) : activeTab === 'Contra Voucher' ? (
              <motion.div
                key="contra"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
              >
                {/* Contra Voucher Form */}
                <ContraVoucherForm
                  cashBankAccounts={[...cashAccounts, ...bankAccounts]}
                  onSave={handleSaveContra}
                  isPending={isPending}
                />

                {/* Contra Voucher List */}
                <UnifiedVoucherList
                  vouchers={contraVouchers}
                  onDelete={handleDelete}
                  isPending={isPending}
                />
              </motion.div>
            ) : (
              <motion.div
                key="unified"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
              >
                {/* Unified Receipt & Payment Form */}
                <UnifiedVoucherForm
                  cashAccounts={cashAccounts}
                  bankAccounts={bankAccounts}
                  partyAccounts={partyAccounts}
                  onSave={handleSave}
                  isPending={isPending}
                />

                {/* Unified All Vouchers List */}
                <UnifiedVoucherList
                  vouchers={vouchers}
                  onDelete={handleDelete}
                  isPending={isPending}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <ToastStack toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

