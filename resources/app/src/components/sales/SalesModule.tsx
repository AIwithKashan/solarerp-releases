'use client';

// ─── SalesModule ──────────────────────────────────────────────────────────────
// Client Component: manages all Sales Management UI, invoices, stock checks,
// discount linking, bank accounts, and print-ready formats.

import {
  useState, useRef, useEffect, useCallback, useTransition,
} from 'react';
import Link from 'next/link';
import {
  Sun, Moon, Zap, User, Lock, Eye, EyeOff, Plus, Search, Building2, Phone, MapPin, Tag,
  ChevronDown, X, Check, AlertCircle, Trash2, Edit3, Users, CreditCard, Briefcase, Package,
  Home, TrendingUp, Shield, SlidersHorizontal, Grid3X3, List, Filter, ChevronUp, Bell,
  Settings, BarChart3, Loader2, LogOut, LogIn, ShoppingCart, FileText, ChevronRight, Layers, Hash, Calendar, DollarSign, Banknote
, LineChart} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';

import { createSale, updateSale, deleteSale, getSaleById, getAvailableStock } from '@/app/sales/actions';
import type {
  Sale, SaleInsert, SaleUpdate, SaleItem, SaleItemInsert,
  SalePayment, SalePaymentInsert, SaleOtherCredit, SaleOtherCreditInsert,
  SaleWithRelations, BusinessSettings, Account
} from '@/types/database';

const PRELOADED_UNITS = [
  'Number', 'Liter', 'Kg', 'KW', 'Yard', 'Meter', 'Foot', 'Roll', 'Box',
  'Set', 'Pair', 'Watt', 'Ampere', 'Volt', 'Area', 'None'
];

const NAV_ITEMS: { id: string; label: string; icon: any; href: string; disabled?: boolean }[] = [
  { id: 'dashboard',  label: 'Dashboard',  icon: Grid3X3,        href: '/' },
  { id: 'accounts',  label: 'Accounts',  icon: Users,        href: '/accounts' },
  { id: 'products',  label: 'Products',  icon: Package,      href: '/products' },
  { id: 'purchases', label: 'Purchases', icon: ShoppingCart, href: '/purchases' },
  { id: 'sales',     label: 'Sales',     icon: TrendingUp,   href: '/sales' },
  { id: 'vouchers',  label: 'Vouchers',  icon: Banknote,     href: '/vouchers' },
  { id: 'settings',  label: 'Settings',  icon: Settings,     href: '/settings' },
  { id: 'reports',   label: 'Reports',   icon: LineChart,    href: '/reports' },
];


const cls = (...args: (string | boolean | undefined | null)[]) =>
  args.filter(Boolean).join(' ');

// ─── Formatting Helpers ───────────────────────────────────────────────────────

function formatPKR(val: number): string {
  return val.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDatePK(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

// ─── Toast Hook & UI ─────────────────────────────────────────────────────────

interface Toast { id: number; message: string; type: 'success' | 'error' }

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const add = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);
  const remove = useCallback((id: number) => setToasts(p => p.filter(t => t.id !== id)), []);
  return { toasts, addToast: add, removeToast: remove };
}

function ToastStack({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: number) => void }) {
  return (
    <div className="toast-stack">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="toast-close"><X size={14} /></button>
        </div>
      ))}
    </div>
  );
}

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return mounted;
}

// ─── Pakistan Regions Preload list ───────────────────────────────────────────

const PAKISTAN_AREAS = [
  'Serai Naurang', 'Bannu', 'Lakki Marwat', 'Karak', 'Kohat', 'Peshawar',
  'D.I. Khan', 'Mardan', 'Swat', 'Islamabad', 'Rawalpindi', 'Lahore',
  'Karachi', 'Quetta'
];

// ─── Searchable Customers Combobox (Search + Free text) ──────────────────────

function CustomerCombobox({ valueId, valueName, onChange, customers, placeholder, hasError }: {
  valueId: string;
  valueName: string;
  onChange: (id: string | null, title: string, phone?: string, area?: string) => void;
  customers: Account[];
  placeholder: string;
  hasError?: boolean;
}) {
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState(valueName);
  const [cursor, setCursor] = useState(-1);
  const rootRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLUListElement>(null);

  const queryRef = useRef(query);
  useEffect(() => { queryRef.current = query; }, [query]);

  useEffect(() => {
    setQuery(valueName);
    setCursor(-1);
  }, [valueName, valueId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCursor(-1);
        const typed = queryRef.current.trim();
        const matched = customers.find(c => c.account_title.toLowerCase() === typed.toLowerCase());
        if (matched) {
          onChange(matched.id, matched.account_title, matched.contact_number || '', matched.region || '');
        } else {
          onChange(null, typed);
        }
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onChange, customers]);

  const filtered = query === ''
    ? customers
    : customers.filter(c => c.account_title.toLowerCase().includes(query.toLowerCase()));

  const isCustom = query.trim() !== '' && !customers.some(c => c.account_title.toLowerCase() === query.trim().toLowerCase());

  const select = (cust: Account) => {
    onChange(cust.id, cust.account_title, cust.contact_number || '', cust.region || '');
    setQuery(cust.account_title);
    setOpen(false);
    setCursor(-1);
  };

  const confirmCustom = () => {
    const v = query.trim();
    if (!v) return;
    onChange(null, v);
    setQuery(v);
    setOpen(false);
    setCursor(-1);
  };

  useEffect(() => {
    if (cursor >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-cbitem]');
      (items[cursor] as HTMLElement)?.scrollIntoView({ block: 'nearest' });
    }
  }, [cursor]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { setOpen(true); return; }
    if (e.key === 'Escape') { setOpen(false); setCursor(-1); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (cursor >= 0 && filtered[cursor]) select(filtered[cursor]);
      else if (isCustom) confirmCustom();
      else if (filtered.length === 1) select(filtered[0]);
    }
  };

  return (
    <div ref={rootRef} className="combobox-root">
      <div className="input-wrapper">
        <User size={16} className="input-icon" />
        <input
          ref={inputRef}
          className={cls('field-input', hasError && 'error')}
          value={query}
          onChange={e => { setQuery(e.target.value); setCursor(-1); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
        />
        {query && (
          <button type="button" className="combobox-clear" tabIndex={-1} aria-label="Clear"
            onClick={() => { onChange(null, ''); setQuery(''); setOpen(true); inputRef.current?.focus(); }}>
            <X size={13} />
          </button>
        )}
        <button type="button" className="combobox-chevron" tabIndex={-1}
          onClick={() => { setOpen(o => !o); inputRef.current?.focus(); }}>
          <ChevronDown size={14} className={cls('chevron-icon', open && 'rotated')} />
        </button>
      </div>

      {open && (
        <ul ref={listRef} className="combobox-dropdown" role="listbox">
          {filtered.map((cust, idx) => {
            const due = (cust as any).total_due !== undefined ? (cust as any).total_due : cust.balance;
            return (
              <li key={cust.id} data-cbitem
                className={cls('combobox-item', valueId === cust.id && 'selected', cursor === idx && 'highlighted')}
                onClick={() => select(cust)}
                onMouseEnter={() => setCursor(idx)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}
                role="option" aria-selected={valueId === cust.id}>
                <span>{cust.account_title}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {due !== undefined && due !== 0 && (
                    <span style={{ fontSize: '0.72rem', padding: '1px 6px', borderRadius: '4px', background: due > 0 ? '#fef2f2' : 'var(--c-primary-light)', color: due > 0 ? '#ef4444' : 'var(--c-primary-dark)', fontWeight: 700 }}>
                      {due > 0 ? `Due: PKR ${formatPKR(due)}` : `Adv: PKR ${formatPKR(Math.abs(due))}`}
                    </span>
                  )}
                  {valueId === cust.id && <Check size={13} />}
                </div>
              </li>
            );
          })}
          {isCustom && (
            <li className="combobox-custom-row" onClick={confirmCustom} role="option" aria-selected={false}>
              <span className="combobox-custom-icon"><Plus size={13} /></span>
              <span>Use&nbsp;<strong>&ldquo;{query.trim()}&rdquo;</strong></span>
              <span className="combobox-custom-hint">↵ Enter</span>
            </li>
          )}
          {filtered.length === 0 && !isCustom && (
            <li className="combobox-empty">
              {customers.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--c-text-muted)', whiteSpace: 'normal' }}>
                    No customers found. Add a customer in Account Management first.
                  </span>
                  <Link href="/accounts" className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto', display: 'inline-flex', alignSelf: 'flex-start', textDecoration: 'none' }}>
                    <Plus size={12} /> Go to Accounts
                  </Link>
                </div>
              ) : (
                "No customers matched"
              )}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

// ─── Searchable Area Combobox (Search + Free text) ───────────────────────────

function AreaCombobox({ value, onChange, options, placeholder, hasError }: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  hasError?: boolean;
}) {
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState(value);
  const [cursor, setCursor] = useState(-1);
  const rootRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLUListElement>(null);

  const queryRef = useRef(query);
  useEffect(() => { queryRef.current = query; }, [query]);

  useEffect(() => { setQuery(value); setCursor(-1); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCursor(-1);
        onChange(queryRef.current.trim());
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onChange]);

  const filtered = (query === value || query === '')
    ? options
    : options.filter(o => o.toLowerCase().includes(query.toLowerCase()));

  const isCustom = query.trim() !== '' && !options.some(o => o.toLowerCase() === query.trim().toLowerCase());

  const confirmCustom = () => {
    const v = query.trim();
    if (!v) return;
    onChange(v); setQuery(v); setOpen(false); setCursor(-1);
  };
  const select = (opt: string) => { onChange(opt); setQuery(opt); setOpen(false); setCursor(-1); };

  useEffect(() => {
    if (cursor >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-cbitem]');
      (items[cursor] as HTMLElement)?.scrollIntoView({ block: 'nearest' });
    }
  }, [cursor]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { setOpen(true); return; }
    if (e.key === 'Escape') { setOpen(false); setCursor(-1); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (cursor >= 0 && filtered[cursor]) select(filtered[cursor]);
      else if (isCustom) confirmCustom();
      else if (filtered.length === 1) select(filtered[0]);
    }
  };

  return (
    <div ref={rootRef} className="combobox-root">
      <div className="input-wrapper">
        <MapPin size={16} className="input-icon" />
        <input
          ref={inputRef}
          className={cls('field-input', hasError && 'error')}
          value={query}
          onChange={e => { setQuery(e.target.value); setCursor(-1); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
        />
        {query && (
          <button type="button" className="combobox-clear" tabIndex={-1} aria-label="Clear"
            onClick={() => { onChange(''); setQuery(''); setOpen(true); inputRef.current?.focus(); }}>
            <X size={13} />
          </button>
        )}
        <button type="button" className="combobox-chevron" tabIndex={-1}
          onClick={() => { setOpen(o => !o); inputRef.current?.focus(); }}>
          <ChevronDown size={14} className={cls('chevron-icon', open && 'rotated')} />
        </button>
      </div>

      {open && (
        <ul ref={listRef} className="combobox-dropdown" role="listbox">
          {filtered.map((opt, idx) => (
            <li key={opt} data-cbitem
              className={cls('combobox-item', value === opt && 'selected', cursor === idx && 'highlighted')}
              onClick={() => select(opt)}
              onMouseEnter={() => setCursor(idx)}
              role="option" aria-selected={value === opt}>
              <span>{opt}</span>
              {value === opt && <Check size={13} />}
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
            <li className="combobox-empty">No options matched</li>
          )}
        </ul>
      )}
    </div>
  );
}

// ─── Searchable Product Stock Combobox ───────────────────────────────────────

function ProductStockCombobox({ value, powerWatt, onChange, stockItems, placeholder, hasError }: {
  value: string;
  powerWatt: number | null;
  onChange: (item_name: string, powerWatt: number | null, bilti_no?: string | null) => void;
  stockItems: Array<{ item_name: string; power_watt: number | null; bilti_no?: string | null; available: number }>;
  placeholder: string;
  hasError?: boolean;
}) {
  const [open, setOpen]     = useState(false);
  
  const getDisplayVal = (name: string, watt: number | null) => {
    if (!name) return '';
    return `${name}${watt ? ` — ${watt}W` : ''}`;
  };

  const [query, setQuery]   = useState(getDisplayVal(value, powerWatt));
  const [cursor, setCursor] = useState(-1);
  const rootRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLUListElement>(null);

  const queryRef = useRef(query);
  useEffect(() => { queryRef.current = query; }, [query]);

  useEffect(() => {
    setQuery(getDisplayVal(value, powerWatt));
    setCursor(-1);
  }, [value, powerWatt]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCursor(-1);
        setQuery(getDisplayVal(value, powerWatt));
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [value, powerWatt]);

  const filtered = query === getDisplayVal(value, powerWatt) || query === ''
    ? stockItems
    : stockItems.filter(s => 
        s.item_name.toLowerCase().includes(query.toLowerCase()) ||
        (s.power_watt && `${s.power_watt}W`.includes(query)) ||
        (s.bilti_no && s.bilti_no.toLowerCase().includes(query.toLowerCase()))
      );

  const select = (s: typeof stockItems[0]) => {
    onChange(s.item_name, s.power_watt, s.bilti_no);
    setQuery(getDisplayVal(s.item_name, s.power_watt));
    setOpen(false);
    setCursor(-1);
  };

  useEffect(() => {
    if (cursor >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-cbitem]');
      (items[cursor] as HTMLElement)?.scrollIntoView({ block: 'nearest' });
    }
  }, [cursor]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { setOpen(true); return; }
    if (e.key === 'Escape') { setOpen(false); setCursor(-1); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (cursor >= 0 && filtered[cursor]) select(filtered[cursor]);
      else if (filtered.length === 1) select(filtered[0]);
    }
  };

  return (
    <div ref={rootRef} className="combobox-root">
      <div className="input-wrapper">
        <ShoppingCart size={16} className="input-icon" />
        <input
          ref={inputRef}
          className={cls('field-input', hasError && 'error')}
          value={query}
          onChange={e => { setQuery(e.target.value); setCursor(-1); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
        />
        {query && (
          <button type="button" className="combobox-clear" tabIndex={-1} aria-label="Clear"
            onClick={() => { onChange('', null); setQuery(''); setOpen(true); inputRef.current?.focus(); }}>
            <X size={13} />
          </button>
        )}
        <button type="button" className="combobox-chevron" tabIndex={-1}
          onClick={() => { setOpen(o => !o); inputRef.current?.focus(); }}>
          <ChevronDown size={14} className={cls('chevron-icon', open && 'rotated')} />
        </button>
      </div>

      {open && (
        <ul ref={listRef} className="combobox-dropdown" role="listbox">
          {filtered.map((s, idx) => {
            const isSel = value === s.item_name && powerWatt === s.power_watt;
            return (
              <li key={`${s.item_name}::${s.power_watt ?? 'none'}`} data-cbitem
                className={cls('combobox-item', isSel && 'selected', cursor === idx && 'highlighted')}
                onClick={() => select(s)}
                onMouseEnter={() => setCursor(idx)}
                role="option" aria-selected={isSel}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '8px' }}>
                  <span>
                    {s.item_name}
                    {s.power_watt && (
                      <span className="power-badge" style={{ marginLeft: '6px', fontSize: '0.7rem', padding: '1px 5px', background: 'var(--c-bg-alt)', borderRadius: '4px' }}>
                        {s.power_watt}W
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: s.available > 0 ? 'var(--c-primary)' : 'var(--c-text-muted)', fontWeight: 600 }}>
                    Stock: {s.available}
                  </span>
                </div>
                {isSel && <Check size={13} style={{ marginLeft: '8px' }} />}
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="combobox-empty">No stock items matched</li>
          )}
        </ul>
      )}
    </div>
  );
}

// ─── Simple Unit Combobox ───────────────────────────────────────────────────

function UnitCombobox({ value, onChange, options, placeholder, hasError }: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  hasError?: boolean;
}) {
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState(value);
  const [cursor, setCursor] = useState(-1);
  const rootRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLUListElement>(null);

  const queryRef = useRef(query);
  useEffect(() => { queryRef.current = query; }, [query]);

  useEffect(() => { setQuery(value); setCursor(-1); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCursor(-1);
        onChange(queryRef.current.trim());
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onChange]);

  const filtered = (query === value || query === '')
    ? options
    : options.filter(o => o.toLowerCase().includes(query.toLowerCase()));

  const isCustom = query.trim() !== '' && !options.some(o => o.toLowerCase() === query.trim().toLowerCase());

  const confirmCustom = () => {
    const v = query.trim();
    if (!v) return;
    onChange(v); setQuery(v); setOpen(false); setCursor(-1);
  };
  const select = (opt: string) => { onChange(opt); setQuery(opt); setOpen(false); setCursor(-1); };

  useEffect(() => {
    if (cursor >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-cbitem]');
      (items[cursor] as HTMLElement)?.scrollIntoView({ block: 'nearest' });
    }
  }, [cursor]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { setOpen(true); return; }
    if (e.key === 'Escape') { setOpen(false); setCursor(-1); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (cursor >= 0 && filtered[cursor]) select(filtered[cursor]);
      else if (isCustom) confirmCustom();
      else if (filtered.length === 1) select(filtered[0]);
    }
  };

  return (
    <div ref={rootRef} className="combobox-root">
      <div className="input-wrapper">
        <Tag size={16} className="input-icon" />
        <input
          ref={inputRef}
          className={cls('field-input', hasError && 'error')}
          value={query}
          onChange={e => { setQuery(e.target.value); setCursor(-1); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
        />
        {query && (
          <button type="button" className="combobox-clear" tabIndex={-1} aria-label="Clear"
            onClick={() => { onChange(''); setQuery(''); setOpen(true); inputRef.current?.focus(); }}>
            <X size={13} />
          </button>
        )}
        <button type="button" className="combobox-chevron" tabIndex={-1}
          onClick={() => { setOpen(o => !o); inputRef.current?.focus(); }}>
          <ChevronDown size={14} className={cls('chevron-icon', open && 'rotated')} />
        </button>
      </div>

      {open && (
        <ul ref={listRef} className="combobox-dropdown" role="listbox">
          {filtered.map((opt, idx) => (
            <li key={opt} data-cbitem
              className={cls('combobox-item', value === opt && 'selected', cursor === idx && 'highlighted')}
              onClick={() => select(opt)}
              onMouseEnter={() => setCursor(idx)}
              role="option" aria-selected={value === opt}>
              <span>{opt}</span>
              {value === opt && <Check size={13} />}
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
            <li className="combobox-empty">No options matched</li>
          )}
        </ul>
      )}
    </div>
  );
}

// ─── Sheet Component (Large Overlay Style) ───────────────────────────────────

function LargeSheet({ isOpen, onClose, title, children }: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className={cls('sheet-overlay', isOpen && 'open')} onClick={onClose} style={{ zIndex: 100 }} />
      <div className={cls('sheet-content', isOpen && 'open')} style={{ zIndex: 101 }}>
        <div className="sheet-header">
          <h3 className="sheet-title">{title}</h3>
          <button type="button" className="btn-ghost-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="sheet-body" style={{ padding: '24px 32px' }}>{children}</div>
      </div>
    </>
  );
}

// ─── Full Rebuilt Sales Form Component ────────────────────────────────────────

function SaleForm({
  onSave, editTarget, isPending, onClose, customers, bankAccounts, stockItems
}: {
  onSave: (
    header: Omit<SaleInsert, 'subtotal' | 'net_total' | 'total_received' | 'remaining_balance'>,
    items: SaleItemInsert[],
    payments: SalePaymentInsert[],
    otherCredits: SaleOtherCreditInsert[]
  ) => void;
  editTarget: SaleWithRelations | null;
  isPending: boolean;
  onClose: () => void;
  customers: Account[];
  bankAccounts: Account[];
  stockItems: Array<{ item_name: string; power_watt: number | null; available: number }>;
}) {
  // Form state elements
  const [customer_id, setCustomerId]         = useState('');
  const [customer_name, setCustomerName]     = useState('');
  const [customer_phone, setCustomerPhone]   = useState('');
  const [customer_area, setCustomerArea]     = useState('');
  const [reference, setReference]             = useState('');
  const [sale_date, setSaleDate]             = useState(new Date().toISOString().split('T')[0]);
  const [discount_amount, setDiscountAmt]    = useState(0);
  const [remarks, setRemarks]                 = useState('');

  const [items, setItems]                     = useState<SaleItemInsert[]>([]);
  const [payments, setPayments]               = useState<SalePaymentInsert[]>([]);
  const [otherCredits, setOtherCredits]       = useState<SaleOtherCreditInsert[]>([]);
  
  const [errors, setErrors]                   = useState<Record<string, string>>({});
  const [payableInput, setPayableInput]       = useState('');
  const [isPayableFocused, setIsPayableFocused] = useState(false);

  // Initialize form from editTarget
  useEffect(() => {
    if (editTarget) {
      setCustomerId(editTarget.customer_id ?? '');
      setCustomerName(editTarget.customer_name ?? '');
      setCustomerPhone(editTarget.customer_phone ?? '');
      setCustomerArea(editTarget.customer_area ?? '');
      setReference(editTarget.reference ?? '');
      setSaleDate(editTarget.sale_date ? editTarget.sale_date.split('T')[0] : new Date().toISOString().split('T')[0]);
      setDiscountAmt(Number(editTarget.discount_amount) || 0);
      setRemarks(editTarget.remarks ?? '');
      setItems(editTarget.sale_items ? editTarget.sale_items.map(it => ({
        item_name: it.item_name,
        accounting_unit: it.accounting_unit,
        power_watt: it.power_watt,
        quantity: it.quantity,
        rate: it.rate,
        amount: it.amount,
        remarks: it.remarks
      })) : []);
      setPayments(editTarget.sale_payments ? editTarget.sale_payments.map(p => ({
        payment_account_id: p.payment_account_id,
        payment_account_name: p.payment_account_name,
        pay_date: p.pay_date ? p.pay_date.split('T')[0] : new Date().toISOString().split('T')[0],
        remarks: p.remarks,
        amount: p.amount
      })) : []);
      setOtherCredits(editTarget.sale_other_credits ? editTarget.sale_other_credits.map(c => ({
        item_name: c.item_name,
        quantity: c.quantity,
        rate: c.rate ?? 0,
        amount: c.amount ?? 0,
        remarks: c.remarks
      })) : []);
    } else {
      setCustomerId('');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerArea('');
      setReference('');
      setSaleDate(new Date().toISOString().split('T')[0]);
      setDiscountAmt(0);
      setRemarks('');
      setItems([]);
      setPayments([]);
      setOtherCredits([]);
    }
    setErrors({});
  }, [editTarget]);

  // Stock Map compilation (taking editTarget into account so edit quantities are freed back)
  const stockMap = stockItems.reduce((acc, cur) => {
    const key = `${cur.item_name.toLowerCase().trim()}::${cur.power_watt ?? 'none'}`;
    acc[key] = cur.available;
    return acc;
  }, {} as Record<string, number>);

  if (editTarget && editTarget.sale_items) {
    editTarget.sale_items.forEach(it => {
      const key = `${it.item_name.toLowerCase().trim()}::${it.power_watt ?? 'none'}`;
      if (stockMap[key] !== undefined) {
        stockMap[key] += it.quantity;
      } else {
        stockMap[key] = it.quantity;
      }
    });
  }

  // Calculations — subtotal includes both stocked items AND other-credit items
  const itemsSubtotal = items.reduce((sum, it) => sum + (it.amount || 0), 0);
  const creditsSubtotal = otherCredits.reduce((sum, c) => sum + (c.amount || 0), 0);
  const subtotal = itemsSubtotal + creditsSubtotal;
  const discount_percent = subtotal > 0 ? parseFloat(((discount_amount / subtotal) * 100).toFixed(2)) : 0;
  const net_payable = subtotal - discount_amount;
  const voucher_received = (editTarget?.voucher_allocations || []).reduce((sum: number, a: any) => sum + (a.allocatedAmount || 0), 0);
  const total_received = payments.reduce((sum, p) => sum + (p.amount || 0), 0) + voucher_received;
  const remaining_balance = net_payable - total_received;

  // Keep payableInput synced when not typing
  useEffect(() => {
    if (!isPayableFocused) {
      setPayableInput(net_payable > 0 ? net_payable.toFixed(2) : '');
    }
  }, [net_payable, isPayableFocused]);

  // Two-way link: Net Payable -> back-calculate discount
  const handleNetPayableChange = (valStr: string) => {
    const val = parseFloat(valStr) || 0;
    const disc = Math.max(0, subtotal - val);
    setDiscountAmt(parseFloat(disc.toFixed(2)));
  };

  // Helper to recalc other-credit row amount
  const updateCreditAmount = (idx: number, qty: number, rate: number) => {
    setOtherCredits(prev => prev.map((c, i) => i === idx ? { ...c, amount: qty * rate } : c));
  };

  const handleSaveItemField = (index: number, field: keyof SaleItemInsert, val: any) => {
    setItems(prev => prev.map((it, idx) => {
      if (idx !== index) return it;
      const updated = { ...it, [field]: val };
      
      const isWatt = ['watt', 'kw'].includes(updated.accounting_unit.toLowerCase());
      const q = parseFloat(String(updated.quantity)) || 0;
      const r = parseFloat(String(updated.rate)) || 0;
      const p = parseFloat(String(updated.power_watt)) || 0;

      if (isWatt) {
        if (updated.accounting_unit.toLowerCase() === 'kw') {
          updated.amount = (p / 1000) * r * q;
        } else {
          updated.amount = p * r * q;
        }
      } else {
        updated.amount = r * q;
      }
      return updated;
    }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!customer_name.trim()) errs.customer_name = 'Customer name is required.';
    if (!sale_date) errs.sale_date = 'Sale date is required.';
    if (items.length === 0 && otherCredits.length === 0) {
      errs.general = 'Please add at least one line item or credit item.';
    }

    // Items check
    items.forEach((it, idx) => {
      if (!it.item_name) errs[`item_${idx}_name`] = 'Item name is required.';
      if (it.quantity <= 0) errs[`item_${idx}_qty`] = 'Qty must be > 0.';
      const key = `${it.item_name.toLowerCase().trim()}::${it.power_watt ?? 'none'}`;
      const available = stockMap[key] || 0;
      if (it.quantity > available) {
        errs[`item_${idx}_qty`] = `Only ${available} available in stock.`;
      }
    });

    // Payments check
    payments.forEach((p, idx) => {
      if (!p.payment_account_name) errs[`pay_${idx}_acc`] = 'Payment account is required.';
      if (p.amount <= 0) errs[`pay_${idx}_amt`] = 'Amount must be > 0.';
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSave(
      {
        customer_id: customer_id || null,
        customer_name: customer_name.trim(),
        customer_phone: customer_phone.trim() || null,
        customer_area: customer_area.trim() || null,
        reference: reference.trim() || null,
        sale_date,
        discount_percent,
        discount_amount,
        remarks: remarks.trim() || null
      },
      items,
      payments,
      otherCredits
    );
  };

  return (
    <form onSubmit={handleSubmit} className="sheet-form space-y-6">
      {errors.general && (
        <div className="error-banner animate-pulse">
          <AlertCircle size={15} />
          <span>{errors.general}</span>
        </div>
      )}

      {/* SECTION A: Header */}
      <div className="account-table-wrap" style={{ overflow: 'visible', padding: '20px', background: 'var(--c-bg-card)', border: '1px solid var(--c-border)', borderRadius: '8px' }}>
        <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--c-primary)', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Briefcase size={15} /> SECTION A — Sale Header
        </h4>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          
          {/* Customer Name Combobox */}
          <div className="field-group" style={{ zIndex: 100, position: 'relative' }}>
            <label className="field-label">Customer Name *</label>
            <CustomerCombobox
              valueId={customer_id}
              valueName={customer_name}
              onChange={(id, name, phone, area) => {
                setCustomerId(id || '');
                setCustomerName(name);
                if (phone !== undefined) setCustomerPhone(phone);
                if (area !== undefined) setCustomerArea(area);
              }}
              customers={customers}
              placeholder="Search or type customer name…"
              hasError={!!errors.customer_name}
            />
            {(() => {
              const selectedCustomer = customers.find(c => c.id === customer_id);
              if (!selectedCustomer) return null;
              const due = (selectedCustomer as any).total_due !== undefined ? (selectedCustomer as any).total_due : (selectedCustomer.balance || 0);
              return (
                <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--c-bg-input)', borderRadius: '6px', border: '1px solid var(--c-border)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--c-text-muted)', fontWeight: 600 }}>Previous Khata / Due:</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: due > 0 ? '#ef4444' : 'var(--c-primary)' }}>
                    {due > 0 ? `PKR ${formatPKR(due)} (Udhaar)` : due < 0 ? `PKR ${formatPKR(Math.abs(due))} (Advance)` : 'PKR 0.00 (Nil)'}
                  </span>
                </div>
              );
            })()}
            {errors.customer_name && <p className="field-error">{errors.customer_name}</p>}
          </div>

          {/* Reference */}
          <div className="field-group">
            <label className="field-label">Reference</label>
            <div className="input-wrapper">
              <FileText size={16} className="input-icon" />
              <input
                className="field-input"
                placeholder="e.g. PO Number, Project, or Walk-in notes…"
                value={reference}
                onChange={e => setReference(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          {/* Sale Date */}
          <div className="field-group">
            <label className="field-label">Sale Date *</label>
            <div className="input-wrapper">
              <Calendar size={16} className="input-icon" />
              <input
                type="date"
                className="field-input"
                value={sale_date}
                onChange={e => setSaleDate(e.target.value)}
                disabled={isPending}
                required
              />
            </div>
            {errors.sale_date && <p className="field-error">{errors.sale_date}</p>}
          </div>

          {/* Invoice Number */}
          <div className="field-group">
            <label className="field-label">Invoice Number</label>
            <div className="input-wrapper">
              <Hash size={16} className="input-icon" />
              <input
                className="field-input read-only"
                value={editTarget ? editTarget.invoice_no : 'SAL-xxxx (Auto-generated)'}
                readOnly
                disabled
                style={{ opacity: 0.8 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION B: Items */}
      <div className="account-table-wrap" style={{ overflow: 'visible', padding: '20px', background: 'var(--c-bg-card)', border: '1px solid var(--c-border)', borderRadius: '8px' }}>
        <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--c-primary)', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShoppingCart size={15} /> SECTION B — Items (In-Stock Sales)
        </h4>

        {items.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--c-text-muted)', fontStyle: 'italic', marginBottom: '12px' }}>
            No line items added yet. Standard inventory items must check stock balances.
          </p>
        ) : (
          <div className="space-y-4 mb-4">
            {items.map((it, idx) => {
              const key = `${it.item_name.toLowerCase().trim()}::${it.power_watt ?? 'none'}`;
              const maxAvailable = stockMap[key] || 0;
              return (
                <div key={idx} className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', alignItems: 'flex-end', padding: '16px', border: '1px dashed var(--c-border)', borderRadius: '8px', background: 'var(--c-bg-alt)', borderColor: 'var(--c-border)', zIndex: 80 - idx, position: 'relative' }}>
                  
                  {/* Item Selection Combobox */}
                  <div className="md:col-span-2 field-group" style={{ zIndex: 100, position: 'relative' }}>
                    <label className="field-label">Item Description *</label>
                    <ProductStockCombobox
                      value={it.item_name}
                      powerWatt={it.power_watt}
                      onChange={(val, watt, bilti) => {
                        const unit = watt ? 'Watt' : 'Number';
                        setItems(prev => prev.map((item, i) => {
                          if (i !== idx) return item;
                          const updated = {
                            ...item,
                            item_name: val,
                            power_watt: watt,
                            accounting_unit: unit,
                            bilti_no: bilti || item.bilti_no || null,
                            quantity: 1,
                          };
                          // Recalculate subtotal
                          const q = parseFloat(String(updated.quantity)) || 0;
                          const r = parseFloat(String(updated.rate)) || 0;
                          const p = parseFloat(String(updated.power_watt)) || 0;
                          if (updated.accounting_unit.toLowerCase() === 'kw') {
                            updated.amount = (p / 1000) * r * q;
                          } else if (updated.accounting_unit.toLowerCase() === 'watt' || p > 0) {
                            updated.amount = p * r * q;
                          } else {
                            updated.amount = r * q;
                          }
                          return updated;
                        }));
                      }}
                      stockItems={stockItems}
                      placeholder="Select item variant…"
                      hasError={!!errors[`item_${idx}_name`]}
                    />
                  </div>

                  {/* Accounting Unit */}
                  <div className="field-group" style={{ zIndex: 90, position: 'relative' }}>
                    <label className="field-label">Unit *</label>
                    <UnitCombobox
                      value={it.accounting_unit}
                      onChange={val => handleSaveItemField(idx, 'accounting_unit', val)}
                      options={PRELOADED_UNITS}
                      placeholder="Unit…"
                    />
                  </div>

                  {/* Power Rating (Watts - Read-only and Locked) */}
                  <div className="field-group">
                    <label className="field-label">Power (Watt)</label>
                    <div className="input-wrapper">
                      {it.power_watt ? <Lock size={13} className="input-icon" style={{ color: 'var(--c-text-subtle)' }} /> : null}
                      <input
                        type="number"
                        className="field-input read-only"
                        placeholder="—"
                        value={it.power_watt || ''}
                        disabled
                        readOnly
                        style={{ paddingLeft: it.power_watt ? '32px' : '12px', opacity: 0.8 }}
                      />
                    </div>
                  </div>

                  {/* Bilti No / Container # */}
                  <div className="field-group">
                    <label className="field-label">Bilti / Batch</label>
                    <input
                      className="field-input"
                      placeholder="e.g. BL-9042"
                      value={it.bilti_no || ''}
                      onChange={e => handleSaveItemField(idx, 'bilti_no', e.target.value)}
                    />
                  </div>

                  {/* Quantity (Capped at available stock) */}
                  <div className="field-group">
                    <label className="field-label">Qty *</label>
                    <input
                      type="number"
                      max={maxAvailable}
                      className={cls('field-input', errors[`item_${idx}_qty`] && 'error')}
                      placeholder="1.00"
                      value={it.quantity || ''}
                      onChange={e => {
                        let q = parseFloat(e.target.value) || 0;
                        if (q > maxAvailable) {
                          q = maxAvailable;
                        }
                        handleSaveItemField(idx, 'quantity', q);
                      }}
                    />
                    {it.item_name && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--c-text-subtle)', display: 'block', marginTop: '2px' }}>
                        Stock: {maxAvailable}
                      </span>
                    )}
                    {errors[`item_${idx}_qty`] && <p className="field-error" style={{ fontSize: '0.72rem' }}>{errors[`item_${idx}_qty`]}</p>}
                  </div>

                  {/* Rate */}
                  <div className="field-group">
                    <label className="field-label">Rate *</label>
                    <input
                      type="number"
                      className="field-input"
                      placeholder="0.00"
                      value={it.rate || ''}
                      onChange={e => handleSaveItemField(idx, 'rate', parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  {/* Amount / Subtotal (Read Only) */}
                  <div className="md:col-span-2 field-group">
                    <label className="field-label">Subtotal (PKR)</label>
                    <input
                      className="field-input read-only"
                      value={formatPKR(it.amount)}
                      disabled
                      readOnly
                    />
                  </div>

                  {/* Remarks */}
                  <div className="md:col-span-2 field-group">
                    <label className="field-label">Remarks</label>
                    <input
                      className="field-input"
                      placeholder="Line comments…"
                      value={it.remarks || ''}
                      onChange={e => handleSaveItemField(idx, 'remarks', e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-1" style={{ display: 'flex', justifyContent: 'flex-end', height: '38px', alignItems: 'center' }}>
                    <button type="button" className="btn-ghost-sm text-red-500" onClick={() => setItems(p => p.filter((_, i) => i !== idx))}>
                      <Trash2 size={15} />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}

        <button type="button" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto' }}
          onClick={() => setItems(p => [...p, { item_name: '', accounting_unit: 'Number', power_watt: null, bilti_no: null, quantity: 1, rate: 0, amount: 0, remarks: null }])}>
          <Plus size={14} /> Add Line Item
        </button>

        <div style={{ marginTop: '16px', textAlign: 'right', fontSize: '0.95rem', fontWeight: 700 }}>
          Items Subtotal: <span style={{ color: 'var(--c-primary)', marginLeft: '6px' }}>PKR {formatPKR(itemsSubtotal)}</span>
        </div>
      </div>

      {/* SECTION C: Other Credits */}
      <div className="account-table-wrap" style={{ overflow: 'visible', padding: '20px', background: 'var(--c-bg-card)', border: '1px solid var(--c-border)', borderRadius: '8px' }}>
        <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--c-primary)', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Layers size={15} /> SECTION C — Other Credits (Bypass stock checks)
        </h4>

        {otherCredits.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--c-text-muted)', fontStyle: 'italic', marginBottom: '12px' }}>
            No credit line items logged. Use this for items sold but not yet purchased/in stock.
          </p>
        ) : (
          <div className="space-y-4 mb-4">
            {otherCredits.map((c, idx) => (
              <div key={idx} className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', alignItems: 'flex-end', padding: '16px', border: '1px dashed var(--c-border)', borderRadius: '8px', background: 'var(--c-bg-alt)', borderColor: 'var(--c-border)' }}>

                {/* Item Name */}
                <div className="md:col-span-2 field-group">
                  <label className="field-label">Item Description *</label>
                  <input
                    className="field-input"
                    value={c.item_name}
                    onChange={e => setOtherCredits(prev => prev.map((x, i) => i === idx ? { ...x, item_name: e.target.value } : x))}
                    placeholder="e.g. Installation Labour…"
                    required
                  />
                </div>

                {/* Quantity */}
                <div className="field-group">
                  <label className="field-label">Qty *</label>
                  <input
                    type="number"
                    step="any"
                    className="field-input"
                    value={c.quantity || ''}
                    onChange={e => {
                      const qty = parseFloat(e.target.value) || 0;
                      setOtherCredits(prev => prev.map((x, i) => i === idx ? { ...x, quantity: qty, amount: qty * (x.rate || 0) } : x));
                    }}
                    placeholder="1"
                    required
                  />
                </div>

                {/* Rate */}
                <div className="field-group">
                  <label className="field-label">Rate (PKR) *</label>
                  <input
                    type="number"
                    step="any"
                    className="field-input"
                    value={c.rate || ''}
                    onChange={e => {
                      const rate = parseFloat(e.target.value) || 0;
                      setOtherCredits(prev => prev.map((x, i) => i === idx ? { ...x, rate, amount: (x.quantity || 0) * rate } : x));
                    }}
                    placeholder="0.00"
                    required
                  />
                </div>

                {/* Amount (auto-calculated) */}
                <div className="field-group">
                  <label className="field-label">Amount (PKR)</label>
                  <input
                    className="field-input read-only font-mono"
                    value={formatPKR(c.amount || 0)}
                    readOnly
                    disabled
                  />
                </div>

                {/* Remarks */}
                <div className="field-group">
                  <label className="field-label">Remarks</label>
                  <input
                    className="field-input"
                    value={c.remarks || ''}
                    onChange={e => setOtherCredits(prev => prev.map((x, i) => i === idx ? { ...x, remarks: e.target.value } : x))}
                    placeholder="Notes…"
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', height: '38px', alignItems: 'center' }}>
                  <button type="button" className="btn-ghost-sm text-red-500" onClick={() => setOtherCredits(prev => prev.filter((_, i) => i !== idx))}>
                    <Trash2 size={15} />
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}

        <button type="button" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto' }}
          onClick={() => setOtherCredits(prev => [...prev, { item_name: '', quantity: 1, rate: 0, amount: 0, remarks: null }])}>
          <Plus size={14} /> Add Credit Item
        </button>

        {creditsSubtotal > 0 && (
          <div style={{ marginTop: '16px', textAlign: 'right', fontSize: '0.95rem', fontWeight: 700 }}>
            Credits Subtotal: <span style={{ color: 'var(--c-primary)', marginLeft: '6px' }}>PKR {formatPKR(creditsSubtotal)}</span>
          </div>
        )}
      </div>

      {/* SECTION D: Discount / Payable */}
      <div className="account-table-wrap" style={{ overflow: 'visible', padding: '20px', background: 'var(--c-bg-card)', border: '1px solid var(--c-border)', borderRadius: '8px' }}>
        <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--c-primary)', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Tag size={15} /> SECTION D — Discount & Payable Adjustments
        </h4>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div className="field-group">
            <label className="field-label">Discount Amount (PKR)</label>
            <input
              type="number"
              step="any"
              className="field-input"
              value={discount_amount || ''}
              onChange={e => setDiscountAmt(Math.max(0, parseFloat(e.target.value) || 0))}
              placeholder="0.00"
            />
          </div>

          <div className="field-group">
            <label className="field-label">Discount % (Calculated)</label>
            <input
              className="field-input read-only font-mono"
              value={`${discount_percent}%`}
              readOnly
              disabled
            />
          </div>

          <div className="field-group">
            <label className="field-label">Net Payable Total *</label>
            <input
              type="number"
              step="any"
              className="field-input font-bold"
              value={isPayableFocused ? payableInput : (net_payable > 0 ? net_payable.toFixed(2) : '')}
              onFocus={() => {
                setIsPayableFocused(true);
                setPayableInput(net_payable > 0 ? net_payable.toString() : '');
              }}
              onBlur={() => setIsPayableFocused(false)}
              onChange={e => {
                const val = e.target.value;
                setPayableInput(val);
                handleNetPayableChange(val);
              }}
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      {/* SECTION E: Receipts / Payments */}
      <div className="account-table-wrap" style={{ overflow: 'visible', padding: '20px', background: 'var(--c-bg-card)', border: '1px solid var(--c-border)', borderRadius: '8px' }}>
        <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--c-primary)', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <DollarSign size={15} /> SECTION E — Receipt Payments
        </h4>

        {payments.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--c-text-muted)', fontStyle: 'italic', marginBottom: '12px' }}>
            No payments logged. Unpaid balance will go into customers ledger as Udhaar.
          </p>
        ) : (
          <div className="space-y-4 mb-4">
            {payments.map((p, idx) => (
              <div key={idx} className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', alignItems: 'flex-end', padding: '16px', border: '1px dashed var(--c-border)', borderRadius: '8px', background: 'var(--c-bg-alt)', borderColor: 'var(--c-border)' }}>
                
                {/* Bank / Cash Selection */}
                <div className="field-group">
                  <label className="field-label">Payment Account *</label>
                  <select
                    className="field-input"
                    value={p.payment_account_id ? `${p.payment_account_id}:${p.payment_account_name}` : `:${p.payment_account_name}`}
                    onChange={e => {
                      const [id, name] = e.target.value.split(':');
                      setPayments(prev => prev.map((x, i) => i === idx ? {
                        ...x,
                        payment_account_id: id || null,
                        payment_account_name: name
                      } : x));
                    }}
                  >
                    <option value="">-- Select Payment Account --</option>
                    {bankAccounts.map(b => (
                      <option key={b.id} value={`${b.id}:${b.account_title}`}>
                        {b.account_title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div className="field-group">
                  <label className="field-label">Receipt Date *</label>
                  <input
                    type="date"
                    className="field-input"
                    value={p.pay_date}
                    onChange={e => setPayments(prev => prev.map((x, i) => i === idx ? { ...x, pay_date: e.target.value } : x))}
                  />
                </div>

                {/* Amount */}
                <div className="field-group">
                  <label className="field-label">Amount (PKR) *</label>
                  <input
                    type="number"
                    step="any"
                    className="field-input font-mono"
                    value={p.amount || ''}
                    onChange={e => setPayments(prev => prev.map((x, i) => i === idx ? { ...x, amount: parseFloat(e.target.value) || 0 } : x))}
                    placeholder="0.00"
                  />
                </div>

                {/* Remarks */}
                <div className="field-group">
                  <label className="field-label">Payment Remarks</label>
                  <input
                    className="field-input"
                    placeholder="Ref or check details…"
                    value={p.remarks || ''}
                    onChange={e => setPayments(prev => prev.map((x, i) => i === idx ? { ...x, remarks: e.target.value } : x))}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', height: '38px', alignItems: 'center' }}>
                  <button type="button" className="btn-ghost-sm text-red-500" onClick={() => setPayments(prev => prev.filter((_, i) => i !== idx))}>
                    <Trash2 size={15} />
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}

        <button type="button" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto' }}
          onClick={() => {
            const defaultAcc = bankAccounts.find(a => a.account_type === 'Cash Account') || bankAccounts[0];
            setPayments(prev => [...prev, { 
              payment_account_id: defaultAcc?.id || null, 
              payment_account_name: defaultAcc?.account_title || 'Cash in Hand', 
              pay_date: new Date().toISOString().split('T')[0], 
              amount: 0, 
              remarks: null 
            }]);
          }}>
          <Plus size={14} /> Add Payment Row
        </button>

        <div style={{ marginTop: '16px', textAlign: 'right', fontSize: '0.95rem', fontWeight: 700 }}>
          Total Received: <span style={{ color: 'var(--c-primary)', marginLeft: '6px' }}>PKR {formatPKR(total_received)}</span>
        </div>
      </div>

      {/* SECTION F: Summary / Balance */}
      <div className="account-table-wrap" style={{ overflow: 'visible', padding: '20px', background: 'var(--c-bg-card)', border: '1px solid var(--c-border)', borderRadius: '8px' }}>
        <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--c-primary)', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Check size={15} /> SECTION F — Sale Summary & Ledger Status
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="space-y-3">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--c-text-muted)' }}>Items Subtotal:</span>
              <span>PKR {formatPKR(itemsSubtotal)}</span>
            </div>
            {creditsSubtotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--c-text-muted)' }}>Custom Charges / Credits:</span>
                <span>PKR {formatPKR(creditsSubtotal)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--c-text-muted)' }}>Discount ({discount_percent}%):</span>
              <span style={{ color: '#ef4444' }}>- PKR {formatPKR(discount_amount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 700, borderTop: '1px solid var(--c-border)', paddingTop: '6px' }}>
              <span>Net Payable Outlay:</span>
              <span>PKR {formatPKR(net_payable)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--c-text-muted)' }}>Direct Payments Received:</span>
              <span style={{ color: 'var(--c-primary)' }}>PKR {formatPKR(payments.reduce((s, p) => s + (p.amount || 0), 0))}</span>
            </div>
            {voucher_received > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--c-text-muted)' }}>Voucher Allocations Received:</span>
                <span style={{ color: 'var(--c-primary)' }}>PKR {formatPKR(voucher_received)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 600 }}>
              <span style={{ color: 'var(--c-text-muted)' }}>Total Money Received:</span>
              <span style={{ color: 'var(--c-primary)' }}>PKR {formatPKR(total_received)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800, borderTop: '1px double var(--c-border)', paddingTop: '8px' }}>
              <span>Remaining Balance:</span>
              <span style={{ color: remaining_balance === 0 ? 'var(--c-primary)' : '#ef4444' }}>
                PKR {formatPKR(remaining_balance)}
              </span>
            </div>

            <div style={{ marginTop: '12px' }}>
              {remaining_balance <= 0 ? (
                <div style={{ background: 'var(--c-primary-light)', color: 'var(--c-primary-dark)', padding: '10px 14px', borderRadius: '6px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                  Khata Clear ✅
                </div>
              ) : (
                <div style={{ background: '#fef2f2', color: '#ef4444', padding: '10px 14px', borderRadius: '6px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                  Outstanding balance (Udhaar)
                </div>
              )}
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">Overall Sale Remarks</label>
            <div className="input-wrapper">
              <FileText size={16} className="input-icon textarea-icon" />
              <textarea
                className="field-input field-textarea"
                placeholder="Overall sale remarks or customer description notes…"
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                disabled={isPending}
                style={{ height: '110px' }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="form-actions" style={{ marginTop: '24px' }}>
        <button type="button" className="btn-secondary" onClick={onClose} disabled={isPending}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? <Loader2 size={16} className="spin" /> : editTarget ? <Check size={16} /> : <Plus size={16} />}
          {isPending ? 'Saving…' : editTarget ? 'Update Sale' : 'Create Sale'}
        </button>
      </div>
    </form>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ sales }: { sales: Sale[] }) {
  const totalEarned = sales.reduce((sum, s) => sum + s.net_total, 0);
  const totalOutstanding = sales.reduce((sum, s) => sum + s.remaining_balance, 0);
  const totalCount = sales.length;
  const avgNet = totalCount > 0 ? totalEarned / totalCount : 0;

  return (
    <div className="stats-bar">
      <div className="stat-card">
        <div className="stat-icon" style={{ background: '#10b98120', color: '#10b981' }}><TrendingUp size={18} /></div>
        <div>
          <p className="stat-count">{totalCount}</p>
          <p className="stat-label">Sales Entries</p>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon" style={{ background: '#06b6d420', color: '#06b6d4' }}><CreditCard size={18} /></div>
        <div>
          <p className="stat-count" style={{ fontSize: '1.05rem', whiteSpace: 'nowrap' }}>PKR {formatPKR(totalEarned)}</p>
          <p className="stat-label">Net Sales Revenue</p>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon" style={{ background: '#ef444420', color: '#ef4444' }}><AlertCircle size={18} /></div>
        <div>
          <p className="stat-count" style={{ fontSize: '1.05rem', whiteSpace: 'nowrap', color: '#ef4444' }}>PKR {formatPKR(totalOutstanding)}</p>
          <p className="stat-label">Total Outstanding (Udhaar)</p>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon" style={{ background: '#f59e0b20', color: '#f59e0b' }}><Zap size={18} /></div>
        <div>
          <p className="stat-count" style={{ fontSize: '1.05rem', whiteSpace: 'nowrap' }}>PKR {formatPKR(avgNet)}</p>
          <p className="stat-label">Average Sale Order</p>
        </div>
      </div>
    </div>
  );
}

// ─── Sales Table ─────────────────────────────────────────────────────────────

function SaleTable({
  sales, onDelete, onEdit, isPending,
}: {
  sales: Sale[];
  onDelete: (id: string) => void;
  onEdit: (s: Sale) => void;
  isPending: boolean;
}) {
  const [search, setSearch]       = useState('');
  const [viewMode, setViewMode]   = useState<'table' | 'grid'>('table');
  const [sortKey, setSortKey]     = useState<keyof Sale>('created_at');
  const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('desc');

  const toggleSort = (key: keyof Sale) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const filtered = sales
    .filter(s => {
      const q = search.toLowerCase();
      return !q || s.customer_name?.toLowerCase().includes(q) || s.invoice_no.toLowerCase().includes(q) || s.sale_date.includes(q) || (s.remarks ?? '').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortKey === 'net_total' || sortKey === 'total_received' || sortKey === 'remaining_balance' || sortKey === 'discount_percent') {
        const av = Number(a[sortKey] ?? 0);
        const bv = Number(b[sortKey] ?? 0);
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const av = String(a[sortKey] ?? '').toLowerCase();
      const bv = String(b[sortKey] ?? '').toLowerCase();
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });

  const grandNetSum = filtered.reduce((sum, s) => sum + s.net_total, 0);
  const grandReceivedSum = filtered.reduce((sum, s) => sum + s.total_received, 0);
  const grandOutstandingSum = filtered.reduce((sum, s) => sum + s.remaining_balance, 0);

  const SortIcon = ({ col }: { col: keyof Sale }) =>
    sortKey === col
      ? sortDir === 'asc' ? <ChevronUp size={13} className="sort-active" /> : <ChevronDown size={13} className="sort-active" />
      : <ChevronDown size={13} className="sort-inactive" />;

  const handleDelete = (id: string, no: string) => {
    if (confirm(`Are you sure you want to delete sale entry "${no}"?`)) {
      onDelete(id);
    }
  };

  return (
    <div className="account-table-wrap animate-fade-in" suppressHydrationWarning>
      {/* Toolbar */}
      <div className="table-toolbar" suppressHydrationWarning>
        <div className="toolbar-left">
          <div className="input-wrapper search-wrapper">
            <Search size={15} className="input-icon" />
            <input
              className="field-input search-input"
              placeholder="Search sales by date, invoice #, customer…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && <button className="input-icon-right" onClick={() => setSearch('')}><X size={14} /></button>}
          </div>
        </div>

        <div className="toolbar-right">
          <span className="account-count">{filtered.length} order{filtered.length !== 1 ? 's' : ''}</span>
          <div className="view-toggle">
            <button className={cls('view-btn', viewMode === 'table' && 'active')} onClick={() => setViewMode('table')} title="Table view"><List size={15} /></button>
            <button className={cls('view-btn', viewMode === 'grid' && 'active')} onClick={() => setViewMode('grid')} title="Grid view"><Grid3X3 size={15} /></button>
          </div>
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><TrendingUp size={32} /></div>
          <p className="empty-title">No sale records found</p>
          <p className="empty-sub">Create a new sale order using the button in the header or modify search filters.</p>
        </div>
      ) : viewMode === 'table' ? (
        <div className="table-scroll" suppressHydrationWarning>
          <table className="data-table" suppressHydrationWarning>
            <thead>
              <tr>
                {([['#', 'id'], ['Date', 'sale_date'], ['Invoice #', 'invoice_no'], ['Customer', 'customer_name'], ['Discount (%)', 'discount_percent'], ['Net Total', 'net_total'], ['Received', 'total_received'], ['Remaining Balance', 'remaining_balance']] as [string, keyof Sale][]).map(([label, key]) => (
                  <th key={key} onClick={() => toggleSort(key)} className="th-sortable">
                    <span>{label}</span><SortIcon col={key} />
                  </th>
                ))}
                <th className="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id} className="data-row">
                  <td className="td-num">{i + 1}</td>
                  <td data-label="Date" style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>{formatDatePK(s.sale_date)}</td>
                  <td data-label="Invoice #" style={{ fontWeight: 700, color: 'var(--c-text-muted)', whiteSpace: 'nowrap' }}>{s.invoice_no}</td>
                  <td className="td-title" data-label="Customer" style={{ fontWeight: 600, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.customer_name ?? ''}>
                    {s.customer_name ?? '—'}
                  </td>
                  <td data-label="Discount (%)">{s.discount_percent}%</td>
                  <td data-label="Net Total" style={{ fontWeight: 700 }}>{formatPKR(s.net_total)}</td>
                  <td data-label="Received" style={{ fontWeight: 600, color: 'var(--c-primary)' }}>{formatPKR(s.total_received)}</td>
                  <td data-label="Remaining Balance">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, color: s.remaining_balance === 0 ? 'var(--c-primary)' : '#ef4444' }}>
                        {formatPKR(s.remaining_balance)}
                      </span>
                      {s.remaining_balance <= 0 ? (
                        <span className="power-badge" style={{ background: 'var(--c-primary-light)', color: 'var(--c-primary-dark)', padding: '1px 5px', fontSize: '0.65rem' }}>Clear</span>
                      ) : (
                        <span className="power-badge" style={{ background: '#fef2f2', color: '#ef4444', padding: '1px 5px', fontSize: '0.65rem' }}>Udhaar</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="row-actions">
                      <Link href={`/sales/${s.id}/invoice`} className="action-btn edit" title="Generate Invoice">
                        <FileText size={14} />
                      </Link>
                      <button className="action-btn edit" onClick={() => onEdit(s)} disabled={isPending} title="Edit"><Edit3 size={14} /></button>
                      <button className="action-btn delete" onClick={() => handleDelete(s.id, s.invoice_no)} disabled={isPending} title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Total Row */}
            <tfoot>
              <tr style={{ background: 'var(--c-bg-alt)', borderTop: '2px solid var(--c-border)', fontWeight: 800 }}>
                <td colSpan={5} style={{ textAlign: 'right', padding: '16px 20px', fontSize: '0.95rem', color: 'var(--c-text-muted)' }}>
                  Grand Totals:
                </td>
                <td data-label="Net Total" style={{ padding: '16px 20px', fontSize: '1rem', color: 'var(--c-text)' }}>PKR {formatPKR(grandNetSum)}</td>
                <td data-label="Received" style={{ padding: '16px 20px', fontSize: '1rem', color: 'var(--c-primary)' }}>PKR {formatPKR(grandReceivedSum)}</td>
                <td data-label="Outstanding" style={{ padding: '16px 20px', fontSize: '1rem', color: '#ef4444' }}>PKR {formatPKR(grandOutstandingSum)}</td>
                <td colSpan={1}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div>
          <div className="card-grid">
            {filtered.map(s => (
              <div key={s.id} className="account-card animate-fade-in">
                <div className="card-accent" style={{ background: s.remaining_balance === 0 ? 'var(--c-primary)' : '#f59e0b' }} />
                <div className="card-body">
                  <div className="card-top">
                    <div className="card-icon-wrap" style={{ background: 'var(--c-primary-light)', color: 'var(--c-primary-dark)' }}><TrendingUp size={20} /></div>
                    <div className="card-actions">
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 7px', background: 'var(--c-bg-alt)', border: '1px solid var(--c-border)', borderRadius: '4px', color: 'var(--c-text-muted)', marginRight: '6px' }}>
                        {s.invoice_no}
                      </span>
                      <Link href={`/sales/${s.id}/invoice`} className="action-btn edit" title="Generate Invoice" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginRight: '4px' }}>
                        <FileText size={13} />
                      </Link>
                      <button className="action-btn edit" onClick={() => onEdit(s)} disabled={isPending}><Edit3 size={13} /></button>
                      <button className="action-btn delete" onClick={() => handleDelete(s.id, s.invoice_no)} disabled={isPending}><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <p className="card-type">Date: {formatDatePK(s.sale_date)}</p>
                  <h4 className="card-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.customer_name ?? ''}>
                    {s.customer_name ?? '—'}
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', margin: '14px 0', padding: '10px 0', borderTop: '1px solid var(--c-border)', borderBottom: '1px solid var(--c-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--c-text-muted)' }}>Discount:</span>
                      <span>{s.discount_percent}% (-PKR {formatPKR(s.discount_amount)})</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--c-text-muted)' }}>Net Total:</span>
                      <span style={{ fontWeight: 600 }}>PKR {formatPKR(s.net_total)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--c-text-muted)' }}>Total Received:</span>
                      <span style={{ fontWeight: 600, color: 'var(--c-primary)' }}>PKR {formatPKR(s.total_received)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginTop: '4px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--c-text)' }}>Remaining Balance:</span>
                      <span style={{ fontWeight: 800, color: s.remaining_balance === 0 ? 'var(--c-primary)' : '#ef4444' }}>
                        PKR {formatPKR(s.remaining_balance)}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '140px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <FileText size={11} style={{ color: 'var(--c-text-subtle)' }} />
                      {s.remarks || <span style={{ fontStyle: 'italic', color: 'var(--c-text-subtle)' }}>No remarks</span>}
                    </span>
                    {s.remaining_balance <= 0 ? (
                      <span className="power-badge" style={{ background: 'var(--c-primary-light)', color: 'var(--c-primary-dark)', fontSize: '0.65rem' }}>Khata Clear</span>
                    ) : (
                      <span className="power-badge" style={{ background: '#fef2f2', color: '#ef4444', fontSize: '0.65rem' }}>Outstanding</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Grand Totals */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '20px', background: 'var(--c-bg-card)', border: '1px solid var(--c-border)', borderRadius: 'var(--radius-md)', padding: '18px 24px', marginTop: '20px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: '0.9rem' }}><span style={{ color: 'var(--c-text-muted)' }}>Net Sales:</span> <strong style={{ color: 'var(--c-text)' }}>PKR {formatPKR(grandNetSum)}</strong></div>
            <div style={{ fontSize: '0.9rem' }}><span style={{ color: 'var(--c-text-muted)' }}>Received:</span> <strong style={{ color: 'var(--c-primary)' }}>PKR {formatPKR(grandReceivedSum)}</strong></div>
            <div style={{ fontSize: '0.9rem' }}><span style={{ color: 'var(--c-text-muted)' }}>Outstanding:</span> <strong style={{ color: '#ef4444' }}>PKR {formatPKR(grandOutstandingSum)}</strong></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ collapsed, onToggle, settings }: {
  
  
  collapsed: boolean;
  onToggle: () => void;
  settings: BusinessSettings;
}) {
  return (
    <aside className={cls('sidebar', collapsed && 'collapsed')}>
      <div className="sidebar-brand" onClick={collapsed ? onToggle : undefined} style={{ cursor: collapsed ? 'pointer' : 'default' }}>
        {settings.logo_url ? (
          <img src={settings.logo_url} alt="Logo" style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }} />
        ) : (
          <div className="sidebar-brand-icon"><Zap size={20} /></div>
        )}
        {!collapsed && <span className="sidebar-brand-text">{settings.business_name}</span>}
        <button className="sidebar-collapse-btn" onClick={(e) => { if (collapsed) e.stopPropagation(); onToggle(); }} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {collapsed ? <ChevronRight size={15} /> : <SlidersHorizontal size={15} />}
        </button>
      </div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const active = item.id === 'sales';
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
            <Link key={item.id} href={item.href} className={cls('nav-item', active && 'active')} title={collapsed ? item.label : undefined}>
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

function Header({ toggleDark, dark, salesCount, isPending, onAddOpen, settings }: {
  toggleDark: () => void;
  dark: boolean;
  
  salesCount: number;
  isPending: boolean;
  onAddOpen: () => void;
  settings: any;
}) {
  const mounted = useMounted();
  const searchParams = useSearchParams();
  const now = mounted
    ? new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <header className="app-header" suppressHydrationWarning>
      <div className="header-left" suppressHydrationWarning>
        <h1 className="header-title">Sales Management</h1>
        <p className="header-date" suppressHydrationWarning>{now}</p>
      </div>
      <div className="header-right" suppressHydrationWarning>
        {/* "+ Add Sale" button in Header */}
        <button type="button" className="btn-primary" style={{ padding: '8px 16px', minHeight: '38px' }} onClick={onAddOpen}>
          <Plus size={15} />
          <span>Add Sale Order</span>
        </button>

        <div className="stat-pill">
          {isPending ? <Loader2 size={13} className="spin" /> : <TrendingUp size={13} />}
          <span>{salesCount} Orders</span>
        </div>
        <button className="icon-btn" title="Notifications"><Bell size={17} /><span className="notif-dot" /></button>
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

// ─── Main SalesModule Component ───────────────────────────────────────────────

export default function SalesModule({
  initialSales,
  initialCustomers,
  initialBankAccounts,
  initialStock,
  settings
}: {
  initialSales: Sale[];
  initialCustomers: Account[];
  initialBankAccounts: Account[];
  initialStock: Array<{ item_name: string; power_watt: number | null; available: number }>;
  settings: BusinessSettings;
}) {
  
  const mounted                       = useMounted();
  const [dark, setDark]               = useState(false);
  
  

  const handleLogin = (u: any) => { 
     
    sessionStorage.setItem('erp_user', JSON.stringify(u));
    if (typeof addToast === 'function') addToast(`Welcome back, ${u.name}!`); 
  };
  
  

  const [sales, setSales]             = useState<Sale[]>(initialSales);
  const [customers, setCustomers]     = useState<Account[]>(initialCustomers);
  const [bankAccounts, setBankAccounts] = useState<Account[]>(initialBankAccounts);
  const [stockItems, setStockItems]   = useState<Array<{ item_name: string; power_watt: number | null; available: number }>>(initialStock);
  const [editTarget, setEditTarget]   = useState<SaleWithRelations | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isPending, startTransition]  = useTransition();
  const { toasts, addToast, removeToast } = useToast();

  // Sync initial props from server-side navigation
  useEffect(() => {
    setSales(initialSales);
    setCustomers(initialCustomers);
    setBankAccounts(initialBankAccounts);
    setStockItems(initialStock);
  }, [initialSales, initialCustomers, initialBankAccounts, initialStock]);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      setDark(true);
    } else {
      setDark(false);
    }
  }, []);

  // Apply theme attribute to <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, [dark]);

  // Keep logged-in user profile synced with settings owner name
  

  const toggleTheme = () => {
    setDark(d => {
      const next = !d;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  };

  const handleEditInit = async (sale: Sale) => {
    startTransition(async () => {
      const result = await getSaleById(sale.id);
      if (result.success && result.data) {
        setEditTarget(result.data);
        setIsSheetOpen(true);
      } else {
        addToast(result.success === false ? result.error : 'Failed to load sale details', 'error');
      }
    });
  };

  const reloadStock = async () => {
    const res = await getAvailableStock();
    if (res.success && res.data) {
      setStockItems(res.data);
    }
  };

  const handleSave = async (
    header: Omit<SaleInsert, 'subtotal' | 'net_total' | 'total_received' | 'remaining_balance'>,
    items: SaleItemInsert[],
    payments: SalePaymentInsert[],
    otherCredits: SaleOtherCreditInsert[]
  ) => {
    if (editTarget) {
      startTransition(async () => {
        const result = await updateSale(editTarget.id, header as Sale, items, payments, otherCredits);
        if (result.success) {
          setSales(s => s.map(x => x.id === result.data.id ? result.data : x));
          addToast(`Sale transaction "${result.data.invoice_no}" successfully updated!`);
          setIsSheetOpen(false);
          setEditTarget(null);
          await reloadStock();
        } else {
          addToast(result.success === false ? result.error : 'Failed to update sale', 'error');
        }
      });
    } else {
      startTransition(async () => {
        const result = await createSale(header, items, payments, otherCredits);
        if (result.success) {
          setSales(s => [result.data, ...s]);
          addToast(`Sale transaction "${result.data.invoice_no}" successfully created!`);
          setIsSheetOpen(false);
          await reloadStock();
        } else {
          addToast(result.success === false ? result.error : 'Failed to create sale', 'error');
        }
      });
    }
  };

  const handleDelete = (id: string) => {
    const original = [...sales];
    const target = sales.find(x => x.id === id);
    setSales(s => s.filter(x => x.id !== id));
    
    startTransition(async () => {
      const result = await deleteSale(id);
      if (result.success) {
        addToast('Sale order successfully deleted.', 'error');
        await reloadStock();
      } else {
        setSales(original);
        addToast(result.success === false ? result.error : 'Failed to delete sale', 'error');
      }
    });
  };

  if (!mounted) {
    return <div style={{ visibility: 'hidden', minHeight: '100vh' }} suppressHydrationWarning />;
  }



  return (
    <div className="app-shell" suppressHydrationWarning>
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(c => !c)} settings={settings} />
      
      <div className="app-main" suppressHydrationWarning>
        <Header
          toggleDark={toggleTheme}
          dark={dark}
          salesCount={sales.length}
          isPending={isPending}
          onAddOpen={() => { setEditTarget(null); setIsSheetOpen(true); }}
          settings={settings}
        />
        
        <main className="app-content" suppressHydrationWarning>
          <StatsBar sales={sales} />
          
          <SaleTable
            sales={sales}
            onDelete={handleDelete}
            onEdit={handleEditInit}
            isPending={isPending}
          />
        </main>
      </div>

      <LargeSheet
        isOpen={isSheetOpen}
        onClose={() => { setIsSheetOpen(false); setEditTarget(null); }}
        title={editTarget ? 'Edit Sales Invoice details' : 'Record New Sales Order'}
      >
        <SaleForm
          onSave={handleSave}
          editTarget={editTarget}
          isPending={isPending}
          onClose={() => { setIsSheetOpen(false); setEditTarget(null); }}
          customers={customers}
          bankAccounts={bankAccounts}
          stockItems={stockItems}
        />
      </LargeSheet>

      <ToastStack toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

