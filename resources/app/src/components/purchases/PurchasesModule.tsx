'use client';

// ─── PurchasesModule ───────────────────────────────────────────────────────────
// Client Component: handles all Purchase Management UI.
// Connects to Next.js Server Actions to perform CRUD operations in Supabase.
// Reuses the slate/emerald glassmorphic theme.

import {
  useState, useRef, useEffect, useCallback, useTransition,
} from 'react';
import Link from 'next/link';
import {
  Sun, Moon, Zap, User, Lock, Eye, EyeOff, Plus, Search, Building2, Phone, MapPin, Tag,
  ChevronDown, X, Check, AlertCircle, Trash2, Edit3, Users, CreditCard, Briefcase, Package,
  Home, TrendingUp, Shield, SlidersHorizontal, Grid3X3, List, Filter, ChevronUp, Bell,
  Settings, BarChart3, Loader2, LogOut, LogIn, ShoppingCart, FileText, ChevronRight, Layers, Hash, Calendar, Banknote, Truck
, LineChart} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';

import { createPurchase, updatePurchase, deletePurchase } from '@/app/purchases/actions';
import type { Purchase, PurchaseInsert, PurchaseUpdate, BusinessSettings, Account, Product } from '@/types/database';

// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── Combobox Component (Units) ───────────────────────────────────────────────

function Combobox({ value, onChange, options, placeholder, hasError }: {
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

// ─── ProductCombobox Component ──────────────────────────────────────────────────

function ProductCombobox({ value, onChange, products, placeholder, hasError }: {
  value: string;
  onChange: (val: string, unit?: string) => void;
  products: Product[];
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
        const q = queryRef.current.trim().toLowerCase();
        const matched = products.find(p => p.item_name.toLowerCase() === q);
        if (matched) {
          onChange(matched.item_name, matched.accounting_unit);
        } else {
          onChange('');
        }
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onChange]);

  const filtered = (query === value || query === '')
    ? products
    : products.filter(p => p.item_name.toLowerCase().includes(query.toLowerCase()));
  const select = (p: Product) => {
    onChange(p.item_name, p.accounting_unit);
    setQuery(p.item_name);
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
            onClick={() => { onChange('', ''); setQuery(''); setOpen(true); inputRef.current?.focus(); }}>
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
          {filtered.map((p, idx) => (
            <li key={p.id} data-cbitem
              className={cls('combobox-item', value === p.item_name && 'selected', cursor === idx && 'highlighted')}
              onClick={() => select(p)}
              onMouseEnter={() => setCursor(idx)}
              role="option" aria-selected={value === p.item_name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <span>{p.item_name}</span>
                <span className="power-badge" style={{ fontSize: '0.7rem', padding: '1px 5px', background: 'var(--c-bg-alt)', borderRadius: '4px' }}>
                  {p.accounting_unit}
                </span>
              </div>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="combobox-empty">No products matched</li>
          )}
        </ul>
      )}
    </div>
  );
}

// ─── SupplierCombobox Component (Rich Format & Custom Entry Support) ─────────

function SupplierCombobox({ valueId, onChange, suppliers, placeholder, hasError }: {
  valueId: string;
  onChange: (id: string, title: string) => void;
  suppliers: Account[];
  placeholder: string;
  hasError?: boolean;
}) {
  const [open, setOpen]     = useState(false);
  const selected = suppliers.find(s => s.id === valueId);
  const [query, setQuery]   = useState(selected ? selected.account_title : '');
  const [cursor, setCursor] = useState(-1);
  const rootRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLUListElement>(null);

  const queryRef = useRef(query);
  useEffect(() => { queryRef.current = query; }, [query]);

  useEffect(() => {
    const sel = suppliers.find(s => s.id === valueId);
    setQuery(sel ? sel.account_title : (valueId || ''));
    setCursor(-1);
  }, [valueId, suppliers]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCursor(-1);
        const sel = suppliers.find(s => s.id === valueId);
        if (sel) {
          setQuery(sel.account_title);
        } else if (queryRef.current.trim()) {
          onChange('', queryRef.current.trim());
        }
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [valueId, suppliers, onChange]);

  const filtered = query === (selected ? selected.account_title : '') || query === ''
    ? suppliers
    : suppliers.filter(s => 
        s.account_title.toLowerCase().includes(query.toLowerCase()) ||
        (s.region && s.region.toLowerCase().includes(query.toLowerCase())) ||
        (s.contact_number && s.contact_number.includes(query))
      );

  const isCustom = query.trim() !== '' && !suppliers.some(s => s.account_title.toLowerCase() === query.trim().toLowerCase());

  const select = (sup: Account) => {
    onChange(sup.id, sup.account_title);
    setQuery(sup.account_title);
    setOpen(false);
    setCursor(-1);
  };

  const confirmCustom = () => {
    const v = query.trim();
    if (!v) return;
    onChange('', v);
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
        <Building2 size={16} className="input-icon" />
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
            onClick={() => { onChange('', ''); setQuery(''); setOpen(true); inputRef.current?.focus(); }}>
            <X size={13} />
          </button>
        )}
        <button type="button" className="combobox-chevron" tabIndex={-1}
          onClick={() => { setOpen(o => !o); inputRef.current?.focus(); }}>
          <ChevronDown size={14} className={cls('chevron-icon', open && 'rotated')} />
        </button>
      </div>

      {open && (
        <ul ref={listRef} className="combobox-dropdown" role="listbox" style={{ zIndex: 120, maxHeight: '240px' }}>
          {filtered.map((sup, idx) => {
            const due = (sup as any).total_due !== undefined ? (sup as any).total_due : sup.balance;
            return (
              <li key={sup.id} data-cbitem
                className={cls('combobox-item', valueId === sup.id && 'selected', cursor === idx && 'highlighted')}
                onClick={() => select(sup)}
                onMouseEnter={() => setCursor(idx)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '8px 12px' }}
                role="option" aria-selected={valueId === sup.id}>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sup.account_title}
                  </span>
                  {(sup.region || sup.contact_number) && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--c-text-muted)', display: 'flex', gap: '8px', marginTop: '2px' }}>
                      {sup.region && <span>📍 {sup.region}</span>}
                      {sup.contact_number && <span>📞 {sup.contact_number}</span>}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  {due !== undefined && due !== 0 && (
                    <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', background: due > 0 ? '#fef2f2' : 'var(--c-primary-light)', color: due > 0 ? '#ef4444' : 'var(--c-primary-dark)', fontWeight: 700 }}>
                      {due > 0 ? `Payable: PKR ${formatPKR(due)}` : `Adv: PKR ${formatPKR(Math.abs(due))}`}
                    </span>
                  )}
                  {valueId === sup.id && <Check size={14} className="text-emerald-500" />}
                </div>
              </li>
            );
          })}
          {isCustom && (
            <li className="combobox-custom-row" onClick={confirmCustom} role="option" aria-selected={false} style={{ padding: '8px 12px' }}>
              <span className="combobox-custom-icon"><Plus size={13} /></span>
              <span>Use&nbsp;<strong>&ldquo;{query.trim()}&rdquo;</strong></span>
              <span className="combobox-custom-hint">↵ Enter</span>
            </li>
          )}
          {filtered.length === 0 && !isCustom && (
            <li className="combobox-empty">
              {suppliers.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--c-text-muted)', whiteSpace: 'normal' }}>
                    No suppliers found. Add a supplier in Account Management first.
                  </span>
                  <Link href="/accounts" className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto', display: 'inline-flex', alignSelf: 'flex-start', textDecoration: 'none' }}>
                    <Plus size={12} /> Go to Accounts
                  </Link>
                </div>
              ) : (
                "No suppliers matched"
              )}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

// ─── Sheet Component ─────────────────────────────────────────────────────────

function Sheet({ isOpen, onClose, title, children }: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className={cls('sheet-overlay', isOpen && 'open')} onClick={onClose} />
      <div className={cls('sheet-content', isOpen && 'open')}>
        <div className="sheet-header">
          <h3 className="sheet-title">{title}</h3>
          <button type="button" className="btn-ghost-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </>
  );
}

// ─── Purchase Form (Inside Sheet) ─────────────────────────────────────────────

interface FormState {
  item_name: string;
  accounting_unit: string;
  quantity: string;
  rate: string;
  power_watt: string;
  bilti_no: string;
  supplier_id: string;
  supplier_name: string;
  purchase_date: string;
  remarks: string;
}

const EMPTY_FORM = (): FormState => ({
  item_name: '',
  accounting_unit: '',
  quantity: '1',
  rate: '0',
  power_watt: '',
  bilti_no: '',
  supplier_id: '',
  supplier_name: '',
  purchase_date: new Date().toISOString().split('T')[0],
  remarks: ''
});

function PurchaseForm({
  onSave, editTarget, isPending, onClose, suppliers, products
}: {
  onSave: (payload: PurchaseInsert) => void;
  editTarget: Purchase | null;
  isPending: boolean;
  onClose: () => void;
  suppliers: Account[];
  products: Product[];
}) {
  const [form, setForm]     = useState<FormState>(EMPTY_FORM());
  const [errors, setErrors] = useState<Partial<FormState>>({});

  useEffect(() => {
    if (editTarget) {
      setForm({
        item_name:       editTarget.item_name,
        accounting_unit: editTarget.accounting_unit,
        quantity:        String(editTarget.quantity),
        rate:            String(editTarget.rate),
        power_watt:      editTarget.power_watt !== null && editTarget.power_watt !== undefined ? String(editTarget.power_watt) : '',
        bilti_no:        editTarget.bilti_no ?? '',
        supplier_id:     editTarget.supplier_id ?? '',
        supplier_name:   editTarget.supplier_name ?? '',
        purchase_date:   editTarget.purchase_date ? editTarget.purchase_date.split('T')[0] : new Date().toISOString().split('T')[0],
        remarks:         editTarget.remarks ?? '',
      });
    } else {
      setForm(EMPTY_FORM());
    }
    setErrors({});
  }, [editTarget]);

  // Watt-based unit determination
  const isWattBased = ['watt', 'kw'].includes(form.accounting_unit.toLowerCase());

  // Live amount calculation
  const qty = parseFloat(form.quantity) || 0;
  const rate = parseFloat(form.rate) || 0;
  const power = parseFloat(form.power_watt) || 0;

  let liveAmount = 0;
  if (isWattBased) {
    if (form.accounting_unit.toLowerCase() === 'kw') {
      liveAmount = (power / 1000) * rate * qty;
    } else {
      liveAmount = power * rate * qty;
    }
  } else {
    liveAmount = rate * qty;
  }

  const validate = (): boolean => {
    const errs: Partial<FormState> = {};
    if (!form.item_name.trim()) errs.item_name = 'Item Name is required.';
    if (!form.accounting_unit.trim()) errs.accounting_unit = 'Accounting Unit is required.';
    if (!form.supplier_id) errs.supplier_id = 'Supplier selection is required.';
    if (!form.purchase_date) errs.purchase_date = 'Purchase Date is required.';
    
    const qVal = Number(form.quantity);
    if (!form.quantity.trim()) {
      errs.quantity = 'Quantity is required.';
    } else if (isNaN(qVal) || qVal <= 0) {
      errs.quantity = 'Quantity must be a positive number.';
    }

    const rVal = Number(form.rate);
    if (!form.rate.trim()) {
      errs.rate = 'Rate is required.';
    } else if (isNaN(rVal) || rVal < 0) {
      errs.rate = 'Rate must be a non-negative number.';
    }

    const pVal = Number(form.power_watt);
    if (isWattBased) {
      if (!form.power_watt.trim()) {
        errs.power_watt = 'Power rating (Watts) is required.';
      } else if (isNaN(pVal) || pVal <= 0) {
        errs.power_watt = 'Power rating must be a positive number.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      item_name:       form.item_name.trim(),
      accounting_unit: form.accounting_unit.trim(),
      quantity:        parseFloat(form.quantity),
      rate:            parseFloat(form.rate),
      power_watt:      isWattBased ? parseFloat(form.power_watt) : null,
      bilti_no:        form.bilti_no.trim() || null,
      supplier_id:     form.supplier_id,
      supplier_name:   form.supplier_name,
      purchase_date:   form.purchase_date,
      amount:          liveAmount,
      remarks:         form.remarks.trim() || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="sheet-form space-y-4">
      {/* Rebuilt Form Layout using CSS grid to prevent overlapping (Fix 2) */}
      <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        
        {/* 1. Supplier Name - Span 2 columns, high z-index */}
        <div className="field-group md:col-span-2" style={{ zIndex: 60, position: 'relative' }}>
          <label className="field-label">Supplier Name *</label>
          <SupplierCombobox
            valueId={form.supplier_id}
            onChange={(id, name) => setForm(f => ({ ...f, supplier_id: id, supplier_name: name }))}
            suppliers={suppliers}
            placeholder="Select supplier account…"
            hasError={!!errors.supplier_id}
          />
          {errors.supplier_id && <p className="field-error">{errors.supplier_id}</p>}
        </div>

        {/* 2. Purchase Date */}
        <div className="field-group">
          <label className="field-label">Purchase Date *</label>
          <div className="input-wrapper">
            <Calendar size={16} className="input-icon" />
            <input
              type="date"
              className={cls('field-input', errors.purchase_date && 'error')}
              value={form.purchase_date}
              onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))}
              disabled={isPending}
              required
            />
          </div>
          {errors.purchase_date && <p className="field-error">{errors.purchase_date}</p>}
        </div>

        {/* 3. Invoice No (Read Only) */}
        <div className="field-group">
          <label className="field-label">Invoice Number</label>
          <div className="input-wrapper">
            <Hash size={16} className="input-icon" />
            <input
              className="field-input read-only"
              value={editTarget ? editTarget.invoice_no : 'PUR-xxxx (Auto-generated)'}
              readOnly
              disabled
              style={{ opacity: 0.8 }}
            />
          </div>
        </div>

        {/* 3b. Bilti No / Container # (Optional) */}
        <div className="field-group">
          <label className="field-label">Bilti No / Container # (Optional)</label>
          <div className="input-wrapper">
            <Truck size={16} className="input-icon" />
            <input
              className="field-input"
              placeholder="e.g. BL-9842 / Container-A"
              value={form.bilti_no}
              onChange={e => setForm(f => ({ ...f, bilti_no: e.target.value }))}
              disabled={isPending}
            />
          </div>
        </div>

        {/* 4. Item Name - Searchable Product Combobox */}
        <div className="field-group md:col-span-2" style={{ zIndex: 60, position: 'relative' }}>
          <label className="field-label">Item Name *</label>
          <ProductCombobox
            value={form.item_name}
            onChange={(val, unit) => {
              setForm(f => {
                const next = { ...f, item_name: val };
                if (unit) {
                  next.accounting_unit = unit;
                }
                return next;
              });
            }}
            products={products}
            placeholder="Select or type product name…"
            hasError={!!errors.item_name}
          />
          {errors.item_name && <p className="field-error">{errors.item_name}</p>}
        </div>

        {/* 5. Accounting Unit */}
        <div className="field-group" style={{ zIndex: 50, position: 'relative' }}>
          <label className="field-label">Accounting Unit *</label>
          <Combobox
            value={form.accounting_unit}
            onChange={v => setForm(f => ({ ...f, accounting_unit: v }))}
            options={PRELOADED_UNITS}
            placeholder="Search or type unit…"
            hasError={!!errors.accounting_unit}
          />
          {errors.accounting_unit && <p className="field-error">{errors.accounting_unit}</p>}
        </div>

        {/* 6. Power (Watt) - Shown ONLY for Watt-based units using Framer Motion */}
        <div className="field-group">
          <AnimatePresence initial={false}>
            {isWattBased && (
              <motion.div
                key="power-watt-field"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                style={{ overflow: 'hidden' }}
              >
                <label className="field-label">Power (Watt) *</label>
                <div className="input-wrapper">
                  <Zap size={16} className="input-icon" />
                  <input
                    type="number"
                    step="any"
                    className={cls('field-input', errors.power_watt && 'error')}
                    placeholder="e.g. 585"
                    value={form.power_watt}
                    onChange={e => setForm(f => ({ ...f, power_watt: e.target.value }))}
                    disabled={isPending}
                    required={isWattBased}
                  />
                </div>
                {errors.power_watt && <p className="field-error" style={{ marginTop: '4px' }}>{errors.power_watt}</p>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 7. Quantity */}
        <div className="field-group">
          <label className="field-label">Quantity *</label>
          <div className="input-wrapper">
            <Layers size={16} className="input-icon" />
            <input
              type="number"
              step="any"
              className={cls('field-input', errors.quantity && 'error')}
              placeholder="1.00"
              value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
              disabled={isPending}
              required
            />
          </div>
          {errors.quantity && <p className="field-error">{errors.quantity}</p>}
        </div>

        {/* 8. Rate */}
        <div className="field-group">
          <label className="field-label">Rate (PKR) *</label>
          <div className="input-wrapper">
            <Tag size={16} className="input-icon" />
            <input
              type="number"
              step="any"
              className={cls('field-input', errors.rate && 'error')}
              placeholder="0.00"
              value={form.rate}
              onChange={e => setForm(f => ({ ...f, rate: e.target.value }))}
              disabled={isPending}
              required
            />
          </div>
          {errors.rate && <p className="field-error">{errors.rate}</p>}
        </div>

        {/* 9. Amount (Auto Calculated) - Span 2 columns */}
        <div className="field-group md:col-span-2">
          <label className="field-label">Amount (PKR) — Auto Calculated</label>
          <div className="input-wrapper">
            <CreditCard size={16} className="input-icon" />
            <input
              className="field-input read-only"
              value={formatPKR(liveAmount)}
              readOnly
              disabled
              style={{ opacity: 0.8 }}
            />
          </div>
        </div>

        {/* 10. Remarks - Span 2 columns */}
        <div className="field-group md:col-span-2">
          <label className="field-label">Remarks</label>
          <div className="input-wrapper">
            <FileText size={16} className="input-icon textarea-icon" />
            <textarea
              className="field-input field-textarea"
              placeholder="Add comments or supplier reference notes…"
              value={form.remarks}
              onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
              disabled={isPending}
            />
          </div>
        </div>

      </div>

      <div className="form-actions" style={{ marginTop: '24px' }}>
        <button type="button" className="btn-secondary" onClick={onClose} disabled={isPending}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? <Loader2 size={16} className="spin" /> : editTarget ? <Check size={16} /> : <Plus size={16} />}
          {isPending ? 'Saving…' : editTarget ? 'Update Purchase' : 'Create Purchase'}
        </button>
      </div>
    </form>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ purchases }: { purchases: Purchase[] }) {
  const totalSpent = purchases.reduce((sum, p) => sum + p.amount, 0);
  const totalCount = purchases.length;
  const avgRate = totalCount > 0 ? purchases.reduce((sum, p) => sum + p.rate, 0) / totalCount : 0;
  
  // Find highest spent item
  let maxSpendItem = '—';
  if (totalCount > 0) {
    const sorted = [...purchases].sort((a, b) => b.amount - a.amount);
    maxSpendItem = sorted[0].item_name;
  }

  return (
    <div className="stats-bar">
      <div className="stat-card">
        <div className="stat-icon" style={{ background: '#10b98120', color: '#10b981' }}><ShoppingCart size={18} /></div>
        <div>
          <p className="stat-count">{totalCount}</p>
          <p className="stat-label">Total Entries</p>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon" style={{ background: '#06b6d420', color: '#06b6d4' }}><CreditCard size={18} /></div>
        <div>
          <p className="stat-count" style={{ fontSize: '1.05rem', whiteSpace: 'nowrap' }}>PKR {formatPKR(totalSpent)}</p>
          <p className="stat-label">Total Outlay</p>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon" style={{ background: '#f59e0b20', color: '#f59e0b' }}><TrendingUp size={18} /></div>
        <div>
          <p className="stat-count" style={{ fontSize: '1.05rem', whiteSpace: 'nowrap' }}>PKR {formatPKR(avgRate)}</p>
          <p className="stat-label">Average Unit Rate</p>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon" style={{ background: '#ec489920', color: '#ec4899' }}><Package size={18} /></div>
        <div>
          <p className="stat-count" style={{ fontSize: '0.85rem', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={maxSpendItem}>
            {maxSpendItem}
          </p>
          <p className="stat-label">Highest Expense</p>
        </div>
      </div>
    </div>
  );
}

// ─── Purchase Table ───────────────────────────────────────────────────────────

function PurchaseTable({
  purchases, onDelete, onEdit, isPending, onSupplierClick, onAddPayment, onPaymentHistory
}: {
  purchases: Purchase[];
  onDelete: (id: string, name: string) => void;
  onEdit: (p: Purchase) => void;
  isPending: boolean;
  onSupplierClick: (id: string, name: string) => void;
  onAddPayment: (p: Purchase) => void;
  onPaymentHistory: (p: Purchase) => void;
}) {
  const [search, setSearch]       = useState('');
  const [viewMode, setViewMode]   = useState<'table' | 'grid'>('table');
  const [sortKey, setSortKey]     = useState<keyof Purchase>('created_at');
  const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('desc');

  const toggleSort = (key: keyof Purchase) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const filtered = purchases
    .filter(p => {
      const q = search.toLowerCase();
      return !q || p.item_name.toLowerCase().includes(q) || p.accounting_unit.toLowerCase().includes(q) || (p.remarks ?? '').toLowerCase().includes(q) || (p.invoice_no ?? '').toLowerCase().includes(q) || (p.supplier_name ?? '').toLowerCase().includes(q) || (p.purchase_date ?? '').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortKey === 'quantity' || sortKey === 'rate' || sortKey === 'amount' || sortKey === 'power_watt') {
        const av = Number(a[sortKey] ?? 0);
        const bv = Number(b[sortKey] ?? 0);
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const av = String(a[sortKey] ?? '').toLowerCase();
      const bv = String(b[sortKey] ?? '').toLowerCase();
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });

  // Calculate grand sum of current filtered list
  const grandTotalSum = filtered.reduce((sum, p) => sum + p.amount, 0);

  const SortIcon = ({ col }: { col: keyof Purchase }) =>
    sortKey === col
      ? sortDir === 'asc' ? <ChevronUp size={13} className="sort-active" /> : <ChevronDown size={13} className="sort-active" />
      : <ChevronDown size={13} className="sort-inactive" />;

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete purchase entry for "${name}"?`)) {
      onDelete(id, name);
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
              placeholder="Search by date, item, invoice #, supplier…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && <button className="input-icon-right" onClick={() => setSearch('')}><X size={14} /></button>}
          </div>
        </div>

        <div className="toolbar-right">
          <span className="account-count">{filtered.length} entr{filtered.length !== 1 ? 'ies' : 'y'}</span>
          <div className="view-toggle">
            <button className={cls('view-btn', viewMode === 'table' && 'active')} onClick={() => setViewMode('table')} title="Table view"><List size={15} /></button>
            <button className={cls('view-btn', viewMode === 'grid' && 'active')} onClick={() => setViewMode('grid')} title="Grid view"><Grid3X3 size={15} /></button>
          </div>
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><ShoppingCart size={32} /></div>
          <p className="empty-title">No purchases found</p>
          <p className="empty-sub">Create a new purchase entry using the button in the sidebar or adjust search query.</p>
        </div>
      ) : viewMode === 'table' ? (
        <div className="table-scroll" suppressHydrationWarning>
          <table className="data-table" suppressHydrationWarning>
            <thead>
              <tr>
                {([['#', 'id'], ['Date', 'purchase_date'], ['Invoice #', 'invoice_no'], ['Item Name', 'item_name'], ['Supplier', 'supplier_name'], ['Unit', 'accounting_unit'], ['Quantity', 'quantity'], ['Rate (PKR)', 'rate'], ['Amount (PKR)', 'amount'], ['Remaining Due', 'remainingAmount'], ['Status', 'paymentStatus'], ['Remarks', 'remarks']] as [string, keyof Purchase][]).map(([label, key]) => (
                  <th key={key} onClick={() => toggleSort(key)} className="th-sortable" style={['rate', 'amount', 'remainingAmount'].includes(key) ? { textAlign: 'right' } : {}}>
                    <span>{label}</span><SortIcon col={key} />
                  </th>
                ))}
                <th className="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((pur, i) => (
                <tr key={pur.id} className="data-row">
                  <td className="td-num">{i + 1}</td>
                  <td data-label="Date" style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>{formatDatePK(pur.purchase_date)}</td>
                  <td data-label="Invoice #" style={{ fontWeight: 700, color: 'var(--c-text-muted)', whiteSpace: 'nowrap' }}>{pur.invoice_no}</td>
                  <td className="td-title" data-label="Item Name" style={{ fontWeight: 600, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {pur.item_name}
                    {pur.power_watt && ['watt', 'kw'].includes(pur.accounting_unit.toLowerCase()) && (
                      <span className="badge-power" style={{
                        marginLeft: '8px', padding: '2px 6px',
                        background: 'var(--c-bg-success)', color: 'var(--c-success)',
                        borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
                        border: '1px solid rgba(16, 185, 129, 0.2)'
                      }}>
                        {pur.power_watt}W
                      </span>
                    )}
                    {pur.bilti_no && (
                      <span style={{
                        marginLeft: '6px', padding: '2px 6px',
                        background: 'var(--c-bg-alt)', color: 'var(--c-text-muted)',
                        borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
                        border: '1px solid var(--c-border)', display: 'inline-flex', alignItems: 'center', gap: '3px'
                      }}>
                        <Truck size={10} />
                        {pur.bilti_no}
                      </span>
                    )}
                  </td>
                  <td data-label="Supplier" style={{ fontWeight: 500, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {pur.supplier_id ? (
                      <button 
                        type="button" 
                        onClick={() => onSupplierClick(pur.supplier_id as string, (pur.supplier_name || 'Unknown') as string)}
                        style={{ color: 'var(--c-primary)', textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none', padding: 0, font: 'inherit' }}
                      >
                        {pur.supplier_name}
                      </button>
                    ) : (pur.supplier_name ?? '—')}
                  </td>
                  <td data-label="Unit">
                    <span className="area-tag" style={{ color: 'var(--c-text)' }}>{pur.accounting_unit}</span>
                  </td>
                  <td data-label="Quantity" style={{ fontWeight: 500 }}>{pur.quantity}</td>
                  <td data-label="Rate (PKR)">
                    {formatPKR(pur.rate)}
                    {pur.power_watt && ['watt', 'kw'].includes(pur.accounting_unit.toLowerCase()) && <span style={{ color: 'var(--c-text-subtle)', fontSize: '0.75rem', fontWeight: 400 }}> /W</span>}
                  </td>
                  <td data-label="Amount (PKR)" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--c-primary)' }}>{formatPKR(pur.amount)}</td>
                  <td data-label="Remaining Due" style={{ textAlign: 'right', fontWeight: 700, color: (pur.remainingAmount || 0) <= 0 ? 'var(--c-success)' : 'var(--c-danger)' }}>
                    {(pur.remainingAmount || 0) <= 0 ? 'Cleared' : formatPKR(pur.remainingAmount || pur.amount)}
                  </td>
                  <td data-label="Status">
                    <span style={{
                      padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                      background: pur.paymentStatus === 'paid' ? 'rgba(16,185,129,0.15)' : pur.paymentStatus === 'partial' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                      color: pur.paymentStatus === 'paid' ? '#10b981' : pur.paymentStatus === 'partial' ? '#f59e0b' : '#ef4444'
                    }}>
                      {pur.paymentStatus || 'unpaid'}
                    </span>
                  </td>
                  <td className="td-contact" data-label="Remarks" style={{ display: 'table-cell', maxWidth: '200px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={pur.remarks ?? ''}>
                    {pur.remarks ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <FileText size={12} className="input-icon-static" />
                        {pur.remarks}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--c-text-subtle)', fontStyle: 'italic' }}>No remarks</span>
                    )}
                  </td>
                  <td>
                    <div className="row-actions">
                      <Link href={`/purchases/${pur.id}/invoice`} className="action-btn edit" title="Generate Invoice">
                        <FileText size={14} />
                      </Link>
                      <button className="action-btn edit" onClick={() => onEdit(pur)} disabled={isPending} title="Edit"><Edit3 size={14} /></button>
                      <button className="action-btn delete" onClick={() => handleDelete(pur.id, pur.item_name)} disabled={isPending} title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Total Row in Table Footer (Fix 2 align) */}
            <tfoot>
              <tr style={{ background: 'var(--c-bg-alt)', borderTop: '2px solid var(--c-border)', fontWeight: 800 }}>
                <td colSpan={8} style={{ textAlign: 'right', padding: '16px 20px', fontSize: '1rem', color: 'var(--c-text-muted)' }}>
                  Grand Total Outlay:
                </td>
                <td data-label="Total Outlay" style={{ textAlign: 'right', padding: '16px 20px', fontSize: '1.05rem', color: 'var(--c-primary)' }}>
                  PKR {formatPKR(grandTotalSum)}
                </td>
                <td data-label="Outstanding" style={{ textAlign: 'right', padding: '16px 20px', fontSize: '0.9rem', fontWeight: 700, color: 'var(--c-danger)' }}>
                  PKR {formatPKR(filtered.reduce((s, p) => s + (p.remainingAmount || 0), 0))}
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div>
          <div className="card-grid">
            {filtered.map(pur => (
              <div key={pur.id} className="account-card animate-fade-in">
                <div className="card-accent" style={{ background: 'var(--c-primary)' }} />
                <div className="card-body">
                  <div className="card-top">
                    <div className="card-icon-wrap" style={{ background: 'var(--c-primary-light)', color: 'var(--c-primary-dark)' }}><ShoppingCart size={20} /></div>
                    <div className="card-actions">
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 7px', background: 'var(--c-bg-alt)', border: '1px solid var(--c-border)', borderRadius: '4px', color: 'var(--c-text-muted)', marginRight: '6px' }}>
                        {pur.invoice_no}
                      </span>
                      <Link href={`/purchases/${pur.id}/invoice`} className="action-btn edit" title="Generate Invoice" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginRight: '4px' }}>
                        <FileText size={13} />
                      </Link>
                      <button className="action-btn edit" onClick={() => onEdit(pur)} disabled={isPending}><Edit3 size={13} /></button>
                      <button className="action-btn delete" onClick={() => handleDelete(pur.id, pur.item_name)} disabled={isPending}><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <p className="card-type">Unit: {pur.accounting_unit}</p>
                  <h4 className="card-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={pur.item_name}>
                    {pur.item_name}
                    {pur.power_watt && ['watt', 'kw'].includes(pur.accounting_unit.toLowerCase()) && (
                      <span style={{
                        marginLeft: '8px', padding: '2px 6px',
                        background: 'var(--c-bg-success)', color: 'var(--c-success)',
                        borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700,
                      }}>
                        {pur.power_watt}W
                      </span>
                    )}
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', margin: '14px 0', padding: '10px 0', borderTop: '1px solid var(--c-border)', borderBottom: '1px solid var(--c-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--c-text-muted)' }}>Date:</span>
                      <span style={{ fontWeight: 600 }}>{formatDatePK(pur.purchase_date)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '8px' }}>
                      <span style={{ color: 'var(--c-text-muted)' }}>Unit:</span>
                      <span style={{ fontWeight: 600 }}>{pur.accounting_unit}</span>
                    </div>
                    {pur.power_watt && ['watt', 'kw'].includes(pur.accounting_unit.toLowerCase()) && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '8px' }}>
                        <span style={{ color: 'var(--c-text-muted)' }}>Power:</span>
                        <span style={{ fontWeight: 600 }}>{pur.power_watt} Watts</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--c-text-muted)' }}>Supplier:</span>
                      <span style={{ fontWeight: 600, color: 'var(--c-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }} title={pur.supplier_name ?? ''}>
                        {pur.supplier_name ?? '—'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--c-text-muted)' }}>Quantity:</span>
                      <span style={{ fontWeight: 600 }}>{pur.quantity}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '8px' }}>
                      <span style={{ color: 'var(--c-text-muted)' }}>Rate:</span>
                      <span>PKR {formatPKR(pur.rate)}{pur.power_watt && ['watt', 'kw'].includes(pur.accounting_unit.toLowerCase()) && ' /W'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginTop: '4px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--c-text)' }}>Subtotal:</span>
                      <span style={{ fontWeight: 800, color: 'var(--c-primary)' }}>PKR {formatPKR(pur.amount)}</span>
                    </div>
                  </div>

                  <div className="card-meta">
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <FileText size={12} style={{ color: 'var(--c-text-subtle)' }} />
                      {pur.remarks ? pur.remarks : <span style={{ fontStyle: 'italic', color: 'var(--c-text-subtle)' }}>No remarks</span>}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Grand Total Bar for Grid View */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', background: 'var(--c-bg-card)', border: '1px solid var(--c-border)', borderRadius: 'var(--radius-md)', padding: '18px 24px', marginTop: '20px', boxShadow: 'var(--shadow-sm)' }}>
            <span style={{ fontWeight: 700, color: 'var(--c-text-muted)', marginRight: '16px', fontSize: '1rem' }}>Grand Total Outlay:</span>
            <span style={{ fontWeight: 800, color: 'var(--c-primary)', fontSize: '1.2rem' }}>PKR {formatPKR(grandTotalSum)}</span>
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
          const active = item.id === 'purchases';
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

function Header({ toggleDark, dark, purchaseCount, isPending, onAddOpen, settings }: {
  toggleDark: () => void;
  dark: boolean;
  
  purchaseCount: number;
  isPending: boolean;
  onAddOpen: () => void;
  settings: any;
}) {
  const mounted = useMounted();
  const now = mounted
    ? new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <header className="app-header" suppressHydrationWarning>
      <div className="header-left" suppressHydrationWarning>
        <h1 className="header-title">Purchase Management</h1>
        <p className="header-date" suppressHydrationWarning>{now}</p>
      </div>
      <div className="header-right" suppressHydrationWarning>
        {/* "+ Add Purchase" button in Header */}
        <button type="button" className="btn-primary" style={{ padding: '8px 16px', minHeight: '38px' }} onClick={onAddOpen}>
          <Plus size={15} />
          <span>Add Purchase</span>
        </button>

        <div className="stat-pill">
          {isPending ? <Loader2 size={13} className="spin" /> : <ShoppingCart size={13} />}
          <span>{purchaseCount} Purchases</span>
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

// ─── Main PurchasesModule Component ──────────────────────────────────────────

export default function PurchasesModule({
  initialPurchases,
  initialSuppliers,
  initialProducts = [],
  bankAccounts = [],
  settings
}: {
  initialPurchases: Purchase[];
  initialSuppliers: Account[];
  initialProducts?: Product[];
  bankAccounts?: Account[];
  settings: BusinessSettings;
}) {
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [ledgerModalOpen, setLedgerModalOpen] = useState(false);
  const [ledgerSupplier, setLedgerSupplier] = useState<{id: string, name: string} | null>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  const mounted                       = useMounted();
  const [dark, setDark]               = useState(false);
  
  

  const handleLogin = (u: any) => { 
     
    sessionStorage.setItem('erp_user', JSON.stringify(u));
    if (typeof addToast === 'function') addToast(`Welcome back, ${u.name}!`); 
  };
  
  

  const [purchases, setPurchases]     = useState<Purchase[]>(initialPurchases);
  const [suppliers, setSuppliers]     = useState<Account[]>(initialSuppliers);
  const [products, setProducts]       = useState<Product[]>(initialProducts);
  const [editTarget, setEditTarget]   = useState<Purchase | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isPending, startTransition]  = useTransition();
  const { toasts, addToast, removeToast } = useToast();

  // Bypasses OS preferences to enforce Light Mode by default.
  // Flipped to Dark Mode only if 'theme' in localStorage is explicitly 'dark'.
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

  const handleEditInit = (p: Purchase) => {
    setEditTarget(p);
    setIsSheetOpen(true);
  };

  // ── Create & Update Handler
  const handleSave = async (payload: PurchaseInsert) => {
    if (editTarget) {
      // Update Mutation
      startTransition(async () => {
        const result = await updatePurchase({
          id:              editTarget.id,
          item_name:       payload.item_name,
          accounting_unit: payload.accounting_unit,
          quantity:        payload.quantity,
          rate:            payload.rate,
          power_watt:      payload.power_watt,
          supplier_id:     payload.supplier_id,
          purchase_date:   payload.purchase_date,
          remarks:         payload.remarks,
        });

        if (result.success) {
          setPurchases(p => p.map(x => x.id === result.data.id ? result.data : x));
          addToast(`Purchase invoice "${result.data.invoice_no}" updated!`);
          setIsSheetOpen(false);
          setEditTarget(null);
        } else {
          addToast(result.error, 'error');
        }
      });
    } else {
      // Create Mutation
      startTransition(async () => {
        const result = await createPurchase(payload);
        if (result.success) {
          setPurchases(p => [result.data, ...p]);
          addToast(`Purchase invoice "${result.data.invoice_no}" successfully created!`);
          setIsSheetOpen(false);
        } else {
          addToast(result.error, 'error');
        }
      });
    }
  };

  // ── Delete Handler
  const handleDelete = (id: string) => {
    const original = [...purchases];
    const target = purchases.find(x => x.id === id);
    setPurchases(p => p.filter(x => x.id !== id)); // Optimistic delete
    
    startTransition(async () => {
      const result = await deletePurchase(id);
      if (result.success) {
        addToast('Purchase entry successfully deleted.', 'error');
      } else {
        setPurchases(original); // Rollback
        addToast(result.error, 'error');
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
          purchaseCount={purchases.length}
          isPending={isPending}
          onAddOpen={() => { setEditTarget(null); setIsSheetOpen(true); }}
          settings={settings}
        />
        
        <main className="app-content" suppressHydrationWarning>
          <StatsBar purchases={purchases} />
          
          <PurchaseTable
            purchases={purchases}
            onDelete={handleDelete}
            onEdit={handleEditInit}
            isPending={isPending}
            onSupplierClick={(id, name) => { setLedgerSupplier({ id, name }); setLedgerModalOpen(true); }}
            onAddPayment={() => {}}
            onPaymentHistory={() => {}}
          />
        </main>
      </div>

      <Sheet
        isOpen={isSheetOpen}
        onClose={() => { setIsSheetOpen(false); setEditTarget(null); }}
        title={editTarget ? 'Edit Purchase Details' : 'Add New Purchase Entry'}
      >
        <PurchaseForm
          onSave={handleSave}
          editTarget={editTarget}
          isPending={isPending}
          onClose={() => { setIsSheetOpen(false); setEditTarget(null); }}
          suppliers={suppliers}
          products={products}
        />
      </Sheet>

      <ToastStack toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

