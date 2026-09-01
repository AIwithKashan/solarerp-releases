'use client';

// ─── AccountsModule ───────────────────────────────────────────────────────────
// Client Component: all interactive account management UI.
// Receives `initialAccounts` from the Server Component (page.tsx) so the first
// paint is server-rendered with real data — no loading spinner on load.
// Mutations go through Server Actions via useTransition for non-blocking UI.

import {
  useState, useRef, useEffect, useCallback, useTransition,
} from 'react';
import Link from 'next/link';
import {
  Sun, Moon, LogIn, LogOut, Zap, User, Lock, Eye, EyeOff,
  Plus, Search, Building2, Phone, MapPin, Tag, ChevronDown,
  X, Check, AlertCircle, Trash2, Edit3, Users, CreditCard,
  Briefcase, Package, Home, TrendingUp, Shield,
  SlidersHorizontal, Grid3X3, List, Filter, ChevronUp, ChevronRight,
  Bell, Settings, BarChart3, Loader2, ShoppingCart, Banknote
, LineChart} from 'lucide-react';

import { createAccount, updateAccount, deleteAccount } from '@/app/accounts/actions';
import type { Account, AccountType, AccountInsert, BusinessSettings } from '@/types/database';

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCOUNT_TYPES: {
  value: AccountType;
  label: string;
  icon: React.ElementType;
  color: string;
}[] = [
  { value: 'Cash Account',                   label: 'Cash Account',                   icon: CreditCard, color: '#10b981' },
  { value: 'Bank Account',                   label: 'Bank Account',                   icon: Building2,  color: '#3b82f6' },
  { value: 'Suppliers',                      label: 'Suppliers',                      icon: Package,    color: '#f59e0b' },
  { value: 'Customers',                      label: 'Customers',                      icon: Users,      color: '#8b5cf6' },
  { value: 'Staff',                          label: 'Staff',                          icon: Briefcase,  color: '#ec4899' },
  { value: 'Expense Account',                label: 'Expense Account',                icon: TrendingUp, color: '#ef4444' },
  { value: 'Investors',                      label: 'Investors',                      icon: Zap,        color: '#06b6d4' },
  { value: 'Inventory',                      label: 'Inventory',                      icon: Package,    color: '#84cc16' },
  { value: 'Assets Account',                 label: 'Assets Account',                 icon: Shield,     color: '#f97316' },
  { value: 'Movable & Non Movable Property', label: 'Movable & Non Movable Property', icon: Home,       color: '#6366f1' },
];

const PAKISTAN_AREAS = [
  'Serai Naurang', 'Bannu', 'Lakki Marwat', 'Karak', 'Kohat',
  'Peshawar', 'D.I. Khan', 'Mardan', 'Swat', 'Islamabad',
  'Rawalpindi', 'Lahore', 'Karachi', 'Quetta',
];


// Dynamic title label/placeholder by account type
const TITLE_LABEL_MAP: Record<string, { label: string; placeholder: string }> = {
  'Customers': { label: 'Customer Name',  placeholder: 'e.g. Ahmad Builders & Co.' },
  'Suppliers': { label: 'Supplier Name',  placeholder: 'e.g. SunPower Pakistan Ltd.' },
  'Staff':     { label: 'Staff Name',     placeholder: 'e.g. Muhammad Usman' },
};
const DEFAULT_TITLE_META = { label: 'Account Title', placeholder: 'e.g. HBL Main Branch' };
const getTitleMeta = (type: string) => TITLE_LABEL_MAP[type] ?? DEFAULT_TITLE_META;

const cls = (...args: (string | boolean | undefined | null)[]) =>
  args.filter(Boolean).join(' ');

// ─── Toast Hook ───────────────────────────────────────────────────────────────

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

// ─── useMounted ───────────────────────────────────────────────────────────────
// Returns true only after the first client-side render is committed.
// Use this to defer any browser-only logic (matchMedia, Date locale, etc.)
// that would cause a server/client HTML mismatch.
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return mounted;
}

// ─── Toast UI ─────────────────────────────────────────────────────────────────

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

// ─── Combobox ─────────────────────────────────────────────────────────────────
// Smart combobox: filter list, arrow-key nav, Enter to confirm, custom value CTA

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

  // Display all options when input represents the current selection or is empty,
  // otherwise filter list by what the user types to search.
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
              <span className="combobox-custom-icon"><MapPin size={13} /></span>
              <span>Use&nbsp;<strong>&ldquo;{query.trim()}&rdquo;</strong></span>
              <span className="combobox-custom-hint">↵ Enter</span>
            </li>
          )}
          {filtered.length === 0 && !isCustom && (
            <li className="combobox-empty">No locations matched</li>
          )}
        </ul>
      )}
    </div>
  );
}

// ─── TypeSelect ───────────────────────────────────────────────────────────────

function TypeSelect({ value, onChange }: { value: AccountType | ''; onChange: (v: AccountType) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = ACCOUNT_TYPES.find(t => t.value === value);

  return (
    <div ref={ref} className="combobox-root">
      <button type="button" className={cls('select-trigger', !selected && 'placeholder')} onClick={() => setOpen(o => !o)}>
        <div className="select-trigger-inner">
          <Tag size={16} className="input-icon-static" />
          {selected
            ? <span className="select-label">{selected.label}</span>
            : <span className="select-placeholder">Select account type</span>}
        </div>
        <ChevronDown size={14} className={cls('chevron-icon', open && 'rotated')} />
      </button>
      {open && (
        <ul className="combobox-dropdown" role="listbox">
          {ACCOUNT_TYPES.map(opt => {
            const Icon = opt.icon;
            return (
              <li key={opt.value}
                className={cls('combobox-item', value === opt.value && 'selected')}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                role="option" aria-selected={value === opt.value}>
                <span className="select-item-inner">
                  <span className="select-dot" style={{ background: opt.color }} />
                  <Icon size={14} style={{ color: opt.color }} />
                  <span>{opt.label}</span>
                </span>
                {value === opt.value && <Check size={13} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── Account Form ─────────────────────────────────────────────────────────────

interface FormState {
  type: AccountType | '';
  title: string;
  area: string;
  contact: string;
}

// Separate type for validation error messages (plain strings)
interface FormErrors {
  type?: string;
  title?: string;
  area?: string;
  contact?: string;
  duplicate?: string;
}

const EMPTY_FORM: FormState = { type: '', title: '', area: '', contact: '' };

function AccountForm({
  onAdd, editTarget, onEditDone, isPending, accounts
}: {
  onAdd: (data: AccountInsert) => Promise<{ success: boolean; error?: string }>;
  editTarget: Account | null;
  onEditDone: (updated?: Account) => Promise<{ success: boolean; error?: string }>;
  isPending: boolean;
  accounts: Account[];
}) {
  const [form, setForm]     = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (editTarget) {
      setForm({
        type:    editTarget.account_type,
        title:   editTarget.account_title,
        area:    editTarget.region,
        contact: editTarget.contact_number ?? '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [editTarget]);

  const validate = (): FormErrors => {
    const e: FormErrors = {};
    if (!form.type)           e.type    = 'Account type is required';
    if (!form.title.trim())   e.title   = 'Account title is required';
    if (!form.area.trim())    e.area    = 'Area / region is required';
    if (form.contact.trim() && !/^[\d\s\-+()]{7,}$/.test(form.contact)) {
      e.contact = 'Enter a valid phone number';
    }
    return e;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const payload: AccountInsert = {
      account_type:   form.type as AccountType,
      account_title:  form.title.trim(),
      region:         form.area.trim(),
      contact_number: form.contact.trim() || null,
    };

    if (editTarget) {
      const res = await onEditDone({ ...editTarget, ...payload });
      if (res && !res.success) {
        setErrors(p => ({ ...p, duplicate: res.error }));
      }
    } else {
      const res = await onAdd(payload);
      if (res && res.success) {
        setForm(EMPTY_FORM);
        setErrors({});
      } else if (res) {
        setErrors(p => ({ ...p, duplicate: res.error }));
      }
    }
  };

  const set = <K extends keyof FormState>(key: K) => (val: FormState[K]) => {
    setForm(p => ({ ...p, [key]: val }));
    setErrors(p => ({ ...p, [key]: '', duplicate: undefined }));
  };

  // Live duplicate check against local accounts list state
  const showLiveWarning = form.type && form.title.trim() && form.contact.trim() && (() => {
    return accounts.some(a => 
      a.id !== editTarget?.id &&
      a.account_type === form.type &&
      a.account_title.trim().toLowerCase() === form.title.trim().toLowerCase() &&
      (a.contact_number ?? '').trim() === form.contact.trim()
    );
  })();

  const titleMeta = getTitleMeta(form.type);

  return (
    <form onSubmit={submit} className="account-form" noValidate>
      <div className="form-header">
        <div className="form-header-icon">
          {editTarget ? <Edit3 size={18} /> : <Plus size={18} />}
        </div>
        <div>
          <h3 className="form-title">{editTarget ? 'Edit Account' : 'Create New Account'}</h3>
          <p className="form-subtitle">
            {editTarget ? 'Update account details below' : 'Fill in the details to register a new account'}
          </p>
        </div>
        {editTarget && (
          <button type="button" className="btn-ghost-sm" onClick={() => onEditDone()}>
            <X size={16} />
          </button>
        )}
      </div>

      <div className="form-grid">
        {/* Account Type */}
        <div className="field-group">
          <label className="field-label">Account Type <span className="required">*</span></label>
          <TypeSelect value={form.type} onChange={set('type') as (v: AccountType) => void} />
          {errors.type && <p className="field-error"><AlertCircle size={12} />{errors.type}</p>}
        </div>

        {/* Account Title — dynamic label */}
        <div className="field-group">
          <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span key={form.type} className="title-label-animate">{titleMeta.label}</span>
            <span className="required">*</span>
            {form.type && (() => {
              const atype = ACCOUNT_TYPES.find(t => t.value === form.type);
              const Icon = atype?.icon;
              return (
                <span className="label-type-pill" style={{ '--pill-color': atype?.color } as React.CSSProperties}>
                  {Icon && <Icon size={10} />}
                  {atype?.label}
                </span>
              );
            })()}
          </label>
          <div className="input-wrapper">
            <Building2 size={16} className="input-icon" />
            <input
              className={cls('field-input', errors.title && 'error')}
              placeholder={titleMeta.placeholder}
              value={form.title}
              onChange={e => set('title')(e.target.value)}
            />
          </div>
          {errors.title && <p className="field-error"><AlertCircle size={12} />{errors.title}</p>}
        </div>

        {/* Area / Region */}
        <div className="field-group">
          <label className="field-label">Area / Region <span className="required">*</span></label>
          <Combobox
            value={form.area}
            onChange={set('area')}
            options={PAKISTAN_AREAS}
            placeholder="Search or type any area…"
            hasError={!!errors.area}
          />
          {errors.area && <p className="field-error"><AlertCircle size={12} />{errors.area}</p>}
        </div>

        {/* Contact Number */}
        <div className="field-group">
          <label className="field-label">Contact Number</label>
          <div className="input-wrapper">
            <Phone size={16} className="input-icon" />
            <input
              className={cls('field-input', errors.contact && 'error')}
              placeholder="e.g. 0312-3456789"
              value={form.contact}
              onChange={e => set('contact')(e.target.value)}
              type="tel"
            />
          </div>
          {errors.contact && <p className="field-error"><AlertCircle size={12} />{errors.contact}</p>}
        </div>
      </div>

      {showLiveWarning && (
        <div className="error-banner" style={{ marginBottom: '16px', background: 'color-mix(in srgb, var(--c-primary) 10%, transparent)', border: '1px solid var(--c-primary)', color: 'var(--c-primary-dark)' }}>
          <AlertCircle size={14} />
          <span>Warning: An account with this name and contact already exists under this type.</span>
        </div>
      )}

      {errors.duplicate && (
        <div className="error-banner" style={{ marginBottom: '16px' }}>
          <AlertCircle size={14} />
          <span>{errors.duplicate}</span>
        </div>
      )}

      <div className="form-actions">
        {editTarget && (
          <button type="button" className="btn-secondary" onClick={() => onEditDone()}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? <Loader2 size={16} className="spin" /> : editTarget ? <Check size={16} /> : <Plus size={16} />}
          {isPending ? 'Saving…' : editTarget ? 'Update Account' : 'Create Account'}
        </button>
      </div>
    </form>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ accounts }: { accounts: Account[] }) {
  const counts = ACCOUNT_TYPES.map(t => ({
    ...t,
    count: accounts.filter(a => a.account_type === t.value).length,
  })).filter(c => c.count > 0).slice(0, 6);

  return (
    <div className="stats-bar">
      {counts.map(t => {
        const Icon = t.icon;
        return (
          <div key={t.value} className="stat-card">
            <div className="stat-icon" style={{ background: `${t.color}20`, color: t.color }}><Icon size={18} /></div>
            <div><p className="stat-count">{t.count}</p><p className="stat-label">{t.label}</p></div>
          </div>
        );
      })}
      <div className="stat-card stat-total">
        <div className="stat-icon" style={{ background: '#10b98120', color: '#10b981' }}><Users size={18} /></div>
        <div><p className="stat-count">{accounts.length}</p><p className="stat-label">Total Accounts</p></div>
      </div>
    </div>
  );
}

// ─── Account Table ────────────────────────────────────────────────────────────

function AccountTable({
  accounts, onDelete, onEdit, isPending,
}: {
  accounts: Account[];
  onDelete: (id: string) => void;
  onEdit: (acc: Account) => void;
  isPending: boolean;
}) {
  const [search, setSearch]       = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [viewMode, setViewMode]   = useState<'table' | 'grid'>('table');
  const [sortKey, setSortKey]     = useState<keyof Account>('created_at');
  const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('desc');

  const toggleSort = (key: keyof Account) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const filtered = accounts
    .filter(a => {
      const q = search.toLowerCase();
      return (
        (!typeFilter || a.account_type === typeFilter) &&
        (!q || a.account_title.toLowerCase().includes(q) || a.region.toLowerCase().includes(q) ||
         (a.contact_number ?? '').includes(q))
      );
    })
    .sort((a, b) => {
      let av: string | null = String(a[sortKey] ?? '');
      let bv: string | null = String(b[sortKey] ?? '');
      av = av.toLowerCase(); bv = bv.toLowerCase();
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });

  const SortIcon = ({ col }: { col: keyof Account }) =>
    sortKey === col
      ? sortDir === 'asc' ? <ChevronUp size={13} className="sort-active" /> : <ChevronDown size={13} className="sort-active" />
      : <ChevronDown size={13} className="sort-inactive" />;

  return (
    <div className="account-table-wrap">
      {/* Toolbar */}
      <div className="table-toolbar">
        <div className="toolbar-left">
          <div className="input-wrapper search-wrapper">
            <Search size={15} className="input-icon" />
            <input
              className="field-input search-input"
              placeholder="Search accounts…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && <button className="input-icon-right" onClick={() => setSearch('')}><X size={14} /></button>}
          </div>
          <div className="input-wrapper" style={{ width: 200 }}>
            <Filter size={14} className="input-icon" />
            <select
              className="field-input select-native"
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}>
              <option value="">All Types</option>
              {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
        <div className="toolbar-right">
          <span className="account-count">{filtered.length} account{filtered.length !== 1 ? 's' : ''}</span>
          <div className="view-toggle">
            <button className={cls('view-btn', viewMode === 'table' && 'active')} onClick={() => setViewMode('table')} title="Table view"><List size={15} /></button>
            <button className={cls('view-btn', viewMode === 'grid' && 'active')} onClick={() => setViewMode('grid')} title="Grid view"><Grid3X3 size={15} /></button>
          </div>
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Package size={32} /></div>
          <p className="empty-title">No accounts found</p>
          <p className="empty-sub">Try adjusting your search or create a new account above.</p>
        </div>
      ) : viewMode === 'table' ? (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                {([['#', 'id'], ['Type', 'account_type'], ['Title', 'account_title'], ['Area / Region', 'region'], ['Contact', 'contact_number']] as [string, keyof Account][]).map(([label, key]) => (
                  <th key={key} onClick={() => toggleSort(key)} className="th-sortable">
                    <span>{label}</span><SortIcon col={key} />
                  </th>
                ))}
                <th className="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((acc, i) => {
                const atype = ACCOUNT_TYPES.find(t => t.value === acc.account_type);
                const Icon = atype?.icon ?? Tag;
                return (
                  <tr key={acc.id} className="data-row">
                    <td className="td-num">{i + 1}</td>
                    <td data-label="Type">
                      <span className="type-badge" style={{ '--badge-color': atype?.color ?? '#6b7280' } as React.CSSProperties}>
                        <Icon size={12} />{atype?.label ?? acc.account_type}
                      </span>
                    </td>
                    <td className="td-title" data-label="Title">{acc.account_title}</td>
                    <td data-label="Area / Region"><span className="area-tag"><MapPin size={12} />{acc.region}</span></td>
                    <td className="td-contact" data-label="Contact"><Phone size={12} />{acc.contact_number ?? '—'}</td>
                    <td>
                      <div className="row-actions">
                        <button className="action-btn edit" onClick={() => onEdit(acc)} disabled={isPending} title="Edit"><Edit3 size={14} /></button>
                        <button className="action-btn delete" onClick={() => onDelete(acc.id)} disabled={isPending} title="Delete"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card-grid">
          {filtered.map(acc => {
            const atype = ACCOUNT_TYPES.find(t => t.value === acc.account_type);
            const Icon = atype?.icon ?? Tag;
            return (
              <div key={acc.id} className="account-card">
                <div className="card-accent" style={{ background: atype?.color ?? '#6b7280' }} />
                <div className="card-body">
                  <div className="card-top">
                    <div className="card-icon-wrap" style={{ background: `${atype?.color}22`, color: atype?.color }}><Icon size={20} /></div>
                    <div className="card-actions">
                      <button className="action-btn edit" onClick={() => onEdit(acc)} disabled={isPending}><Edit3 size={13} /></button>
                      <button className="action-btn delete" onClick={() => onDelete(acc.id)} disabled={isPending}><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <p className="card-type">{atype?.label}</p>
                  <h4 className="card-title">{acc.account_title}</h4>
                  <div className="card-meta">
                    <span><MapPin size={12} />{acc.region}</span>
                    <span><Phone size={12} />{acc.contact_number ?? '—'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

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
          const active = item.id === 'accounts';
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

function Header({ toggleDark, dark, accountCount, isPending, settings }: {
  toggleDark: () => void;
  dark: boolean;
  
  accountCount: number;
  isPending: boolean;
  settings: BusinessSettings;
}) {
  const mounted = useMounted();
  // Only format the date on the client — Node.js and Chromium may render
  // different locale strings for 'en-PK', causing a hydration mismatch.
  const now = mounted
    ? new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  return (
    <header className="app-header">
      <div className="header-left">
        <h1 className="header-title">Account Management</h1>
        <p className="header-date" suppressHydrationWarning>{now}</p>
      </div>
      <div className="header-right">
        <div className="stat-pill">
          {isPending ? <Loader2 size={13} className="spin" /> : <Users size={13} />}
          <span>{accountCount} Accounts</span>
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

// ─── Main AccountsModule ──────────────────────────────────────────────────────

export default function AccountsModule({ initialAccounts, settings }: { initialAccounts: Account[]; settings: BusinessSettings }) {
  
  const mounted                         = useMounted();
  const [dark, setDark]               = useState(false);
  
  

  const handleLogin = (u: any) => { 
     
    sessionStorage.setItem('erp_user', JSON.stringify(u));
    if (typeof addToast === 'function') addToast(`Welcome back, ${u.name}!`); 
  };
  
  

  const [accounts, setAccounts]       = useState<Account[]>(initialAccounts);
  const [editTarget, setEditTarget]   = useState<Account | null>(null);
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

  // Render a transparent shell while React is hydrating so there is zero
  // mismatch between the server HTML and the first client render.
  if (!mounted) {
    return <div style={{ visibility: 'hidden', minHeight: '100vh' }} suppressHydrationWarning />;
  }

  // ── Auth
  // ── Create
  const handleAdd = async (payload: AccountInsert): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      startTransition(async () => {
        const result = await createAccount(payload);
        if (result.success) {
          setAccounts(p => [result.data, ...p]);
          addToast(`Account "${result.data.account_title}" created!`);
          resolve({ success: true });
        } else {
          addToast(result.error, 'error');
          resolve({ success: false, error: result.error });
        }
      });
    });
  };

  // ── Update
  const handleEditDone = async (updated?: Account): Promise<{ success: boolean; error?: string }> => {
    if (!updated) { setEditTarget(null); return { success: true }; }
    return new Promise((resolve) => {
      startTransition(async () => {
        const result = await updateAccount({
          id:             updated.id,
          account_type:   updated.account_type,
          account_title:  updated.account_title,
          region:         updated.region,
          contact_number: updated.contact_number,
        });
        if (result.success) {
          setAccounts(p => p.map(a => a.id === result.data.id ? result.data : a));
          addToast(`Account "${result.data.account_title}" updated!`);
          setEditTarget(null);
          resolve({ success: true });
        } else {
          addToast(result.error, 'error');
          resolve({ success: false, error: result.error });
        }
      });
    });
  };

  // ── Delete
  const handleDelete = (id: string) => {
    const acc = accounts.find(a => a.id === id);
    // Optimistic: remove immediately, re-add on error
    setAccounts(p => p.filter(a => a.id !== id));
    startTransition(async () => {
      const result = await deleteAccount(id);
      if (result.success) {
        addToast(`Account "${acc?.account_title}" deleted.`, 'error');
      } else {
        setAccounts(p => (acc ? [...p, acc] : p)); // rollback
        addToast(result.error, 'error');
      }
    });
  };

  

  return (
    <div className="app-shell">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(c => !c)} settings={settings} />
      <div className="app-main">
        <Header toggleDark={toggleTheme} dark={dark} accountCount={accounts.length} isPending={isPending} settings={settings} />
        <main className="app-content">
          <StatsBar accounts={accounts} />
          <AccountForm
            onAdd={handleAdd}
            editTarget={editTarget}
            onEditDone={handleEditDone}
            isPending={isPending}
            accounts={accounts}
          />
          <AccountTable
            accounts={accounts}
            onDelete={handleDelete}
            onEdit={setEditTarget}
            isPending={isPending}
          />
        </main>
      </div>
      <ToastStack toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
