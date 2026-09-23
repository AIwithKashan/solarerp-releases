'use client';

// ─── ProductsModule ───────────────────────────────────────────────────────────
// Client Component: handles all Product Management UI.
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
  Settings, BarChart3, Loader2, LogOut, LogIn, Cpu, Battery, Layers, Wrench, FileText, ChevronRight,
  ShoppingCart, Banknote
, LineChart} from 'lucide-react';

import { createProduct, updateProduct, deleteProduct } from '@/app/products/actions';
import type { Product, ProductCategory, AccountingUnit, ProductInsert, BusinessSettings } from '@/types/database';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_MAP: Record<ProductCategory, { label: string; icon: React.ElementType; color: string }> = {
  'Solars':             { label: 'Solars',             icon: Sun,               color: '#10b981' },
  'Inverters':          { label: 'Inverters',          icon: Zap,               color: '#06b6d4' },
  'Cables':             { label: 'Cables',             icon: Cpu,               color: '#3b82f6' },
  'Batteries':          { label: 'Batteries',          icon: Battery,           color: '#f59e0b' },
  'Accessories':        { label: 'Accessories',        icon: Wrench,            color: '#ec4899' },
  'Breakers':           { label: 'Breakers',           icon: Shield,            color: '#ef4444' },
  'Mounting Structure': { label: 'Mounting Structure', icon: Layers,            color: '#84cc16' },
  'VFD':                { label: 'VFD',                icon: SlidersHorizontal, color: '#f97316' },
  'Pump/Motors':        { label: 'Pump/Motors',        icon: Zap,               color: '#6366f1' },
  'Filters':            { label: 'Filters',            icon: Filter,            color: '#a855f7' },
  'Misc':               { label: 'Misc',               icon: Tag,               color: '#6b7280' },
};

const ACCOUNTING_UNITS: AccountingUnit[] = [
  'Number', 'Liter', 'Kg', 'KW', 'Yard', 'Meter', 'Foot', 'Roll', 'Box',
  'Set', 'Pair', 'Watt', 'Ampere', 'Volt', 'Area'
];

const CATEGORIES: ProductCategory[] = [
  'Solars', 'Inverters', 'Cables', 'Batteries', 'Accessories', 'Breakers',
  'Mounting Structure', 'VFD', 'Pump/Motors', 'Filters', 'Misc'
];


const cls = (...args: (string | boolean | undefined | null)[]) =>
  args.filter(Boolean).join(' ');

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

// ─── Combobox Component ───────────────────────────────────────────────────────
// Searchable/filterables units and categories

function Combobox({ value, onChange, options, placeholder, hasError, allowCustom = false }: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  hasError?: boolean;
  allowCustom?: boolean;
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

  const isCustom = allowCustom && query.trim() !== '' && !options.some(o => o.toLowerCase() === query.trim().toLowerCase());

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
        <input
          ref={inputRef}
          className={cls('field-input', hasError && 'error')}
          style={{ paddingLeft: '14px' }}
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

// ─── Product Form (Inside Sheet) ─────────────────────────────────────────────

interface FormState {
  item_name: string;
  accounting_unit: string;
  category: string;
  remarks: string;
}

const EMPTY_FORM: FormState = { item_name: '', accounting_unit: '', category: '', remarks: '' };

function ProductForm({
  onSave, editTarget, isPending, onClose
}: {
  onSave: (payload: ProductInsert) => void;
  editTarget: Product | null;
  isPending: boolean;
  onClose: () => void;
}) {
  const [form, setForm]     = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<FormState>>({});

  useEffect(() => {
    if (editTarget) {
      setForm({
        item_name:       editTarget.item_name,
        accounting_unit: editTarget.accounting_unit,
        category:        editTarget.category,
        remarks:         editTarget.remarks ?? '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [editTarget]);

  const validate = (): Partial<FormState> => {
    const e: Partial<FormState> = {};
    if (!form.item_name.trim())    e.item_name       = 'Item name is required';
    if (!form.category)            e.category        = 'Category is required';
    return e;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    onSave({
      item_name:       form.item_name.trim(),
      accounting_unit: form.accounting_unit.trim() || 'N/O',
      category:        form.category as ProductCategory,
      remarks:         form.remarks.trim() || null,
    });
  };

  const set = <K extends keyof FormState>(key: K) => (val: FormState[K]) => {
    setForm(p => ({ ...p, [key]: val }));
    setErrors(p => ({ ...p, [key]: '' }));
  };

  // Determine dynamic placeholder
  const getPlaceholder = (cat: string) => {
    switch (cat) {
      case 'Solars':    return 'e.g. Jinko 580W Mono Panel';
      case 'Inverters': return 'e.g. Huawei SUN2000-10KTL';
      case 'Cables':    return 'e.g. Fast Cables 4mm Red';
      case 'Batteries': return 'e.g. Phoenix 12V 150Ah Tub';
      default:          return 'e.g. Item model / description';
    }
  };

  return (
    <form onSubmit={submit} className="account-form" style={{ background: 'transparent', border: 'none', padding: 0, boxShadow: 'none' }} noValidate>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Item Name */}
        <div className="field-group">
          <label className="field-label">Item Name <span className="required">*</span></label>
          <div className="input-wrapper">
            <input
              className={cls('field-input', errors.item_name && 'error')}
              style={{ paddingLeft: '14px' }}
              placeholder={getPlaceholder(form.category)}
              value={form.item_name}
              onChange={e => set('item_name')(e.target.value)}
            />
          </div>
          {errors.item_name && <p className="field-error"><AlertCircle size={12} />{errors.item_name}</p>}
        </div>

        {/* Category */}
        <div className="field-group">
          <label className="field-label">Category <span className="required">*</span></label>
          <Combobox
            value={form.category}
            onChange={set('category')}
            options={CATEGORIES}
            placeholder="Search or select category…"
            hasError={!!errors.category}
          />
          {errors.category && <p className="field-error"><AlertCircle size={12} />{errors.category}</p>}
        </div>

        {/* Accounting Unit */}
        <div className="field-group">
          <label className="field-label">Accounting Unit</label>
          <Combobox
            value={form.accounting_unit}
            onChange={set('accounting_unit')}
            options={ACCOUNTING_UNITS}
            placeholder="Search, type unit, or leave blank (defaults to N/O)…"
            hasError={!!errors.accounting_unit}
            allowCustom={true}
          />
        </div>

        {/* Remarks */}
        <div className="field-group">
          <label className="field-label">Remarks</label>
          <div className="input-wrapper">
            <textarea
              className={cls('field-input field-textarea')}
              style={{ paddingLeft: '14px' }}
              placeholder="Enter remarks or technical specifications (optional)"
              value={form.remarks}
              onChange={e => set('remarks')(e.target.value)}
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
          {isPending ? 'Saving…' : editTarget ? 'Update Product' : 'Create Product'}
        </button>
      </div>
    </form>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ products }: { products: Product[] }) {
  const counts = CATEGORIES.map(cat => ({
    category: cat,
    count: products.filter(p => p.category === cat).length,
    ...CATEGORY_MAP[cat]
  })).filter(c => c.count > 0).slice(0, 6);

  return (
    <div className="stats-bar">
      {counts.map(t => {
        const Icon = t.icon;
        return (
          <div key={t.category} className="stat-card">
            <div className="stat-icon" style={{ background: `${t.color}20`, color: t.color }}><Icon size={18} /></div>
            <div><p className="stat-count">{t.count}</p><p className="stat-label">{t.label}</p></div>
          </div>
        );
      })}
      <div className="stat-card stat-total">
        <div className="stat-icon" style={{ background: '#10b98120', color: '#10b981' }}><Package size={18} /></div>
        <div><p className="stat-count">{products.length}</p><p className="stat-label">Total Products</p></div>
      </div>
    </div>
  );
}

// ─── Product Table ────────────────────────────────────────────────────────────

function ProductTable({
  products, onDelete, onEdit, isPending,
}: {
  products: Product[];
  onDelete: (id: string) => void;
  onEdit: (p: Product) => void;
  isPending: boolean;
}) {
  const [search, setSearch]       = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [viewMode, setViewMode]   = useState<'table' | 'grid'>('table');
  const [sortKey, setSortKey]     = useState<keyof Product>('created_at');
  const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('desc');

  const toggleSort = (key: keyof Product) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const filtered = products
    .filter(p => {
      const q = search.toLowerCase();
      return (
        (!categoryFilter || p.category === categoryFilter) &&
        (!q || p.item_name.toLowerCase().includes(q) || p.accounting_unit.toLowerCase().includes(q) ||
         (p.remarks ?? '').toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      let av: string = String(a[sortKey] ?? '');
      let bv: string = String(b[sortKey] ?? '');
      av = av.toLowerCase(); bv = bv.toLowerCase();
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });

  const SortIcon = ({ col }: { col: keyof Product }) =>
    sortKey === col
      ? sortDir === 'asc' ? <ChevronUp size={13} className="sort-active" /> : <ChevronDown size={13} className="sort-active" />
      : <ChevronDown size={13} className="sort-inactive" />;

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      onDelete(id);
    }
  };

  return (
    <div className="account-table-wrap animate-fade-in">
      {/* Toolbar */}
      <div className="table-toolbar">
        <div className="toolbar-left">
          <div className="input-wrapper search-wrapper">
            <Search size={15} className="input-icon" />
            <input
              className="field-input search-input"
              placeholder="Search products…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && <button className="input-icon-right" onClick={() => setSearch('')}><X size={14} /></button>}
          </div>

          <div className="input-wrapper" style={{ width: 200 }}>
            <Filter size={14} className="input-icon" />
            <select
              className="field-input select-native"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}>
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="toolbar-right">
          <span className="account-count">{filtered.length} product{filtered.length !== 1 ? 's' : ''}</span>
          <div className="view-toggle">
            <button className={cls('view-btn', viewMode === 'table' && 'active')} onClick={() => setViewMode('table')} title="Table view"><List size={15} /></button>
            <button className={cls('view-btn', viewMode === 'grid' && 'active')} onClick={() => setViewMode('grid')} title="Grid view"><Grid3X3 size={15} /></button>
          </div>
        </div>
      </div>

      {/* Chips Filter */}
      <div style={{ padding: '8px 20px 0 20px' }}>
        <div className="filter-chips">
          <button
            onClick={() => setCategoryFilter('')}
            className={cls('filter-chip', categoryFilter === '' && 'active')}>
            All
          </button>
          {CATEGORIES.map(cat => {
            const active = categoryFilter === cat;
            const meta = CATEGORY_MAP[cat];
            const Icon = meta.icon;
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={cls('filter-chip', active && 'active')}>
                <Icon size={12} />
                <span>{cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Package size={32} /></div>
          <p className="empty-title">No products found</p>
          <p className="empty-sub">Create a new product using the button in the sidebar or adjust your filter.</p>
        </div>
      ) : viewMode === 'table' ? (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                {([['#', 'id'], ['Item Name', 'item_name'], ['Category', 'category'], ['Accounting Unit', 'accounting_unit'], ['Remarks', 'remarks']] as [string, keyof Product][]).map(([label, key]) => (
                  <th key={key} onClick={() => toggleSort(key)} className="th-sortable">
                    <span>{label}</span><SortIcon col={key} />
                  </th>
                ))}
                <th className="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((prod, i) => {
                const meta = CATEGORY_MAP[prod.category];
                const Icon = meta?.icon ?? Tag;
                return (
                  <tr key={prod.id} className="data-row">
                    <td className="td-num">{i + 1}</td>
                    <td className="td-title" data-label="Item Name">{prod.item_name}</td>
                    <td data-label="Category">
                      <span className="type-badge" style={{ '--badge-color': meta?.color ?? '#6b7280' } as React.CSSProperties}>
                        <Icon size={12} />{meta?.label ?? prod.category}
                      </span>
                    </td>
                    <td data-label="Accounting Unit">
                      <span className="area-tag" style={{ color: 'var(--c-text)' }}>{prod.accounting_unit}</span>
                    </td>
                    <td className="td-contact" data-label="Remarks" style={{ display: 'table-cell', maxWidth: '300px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {prod.remarks ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <FileText size={12} className="input-icon-static" />
                          {prod.remarks}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--c-text-subtle)', fontStyle: 'italic' }}>No remarks</span>
                      )}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="action-btn edit" onClick={() => onEdit(prod)} disabled={isPending} title="Edit"><Edit3 size={14} /></button>
                        <button className="action-btn delete" onClick={() => handleDelete(prod.id, prod.item_name)} disabled={isPending} title="Delete"><Trash2 size={14} /></button>
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
          {filtered.map(prod => {
            const meta = CATEGORY_MAP[prod.category];
            const Icon = meta?.icon ?? Tag;
            return (
              <div key={prod.id} className="account-card animate-fade-in">
                <div className="card-accent" style={{ background: meta?.color ?? '#6b7280' }} />
                <div className="card-body">
                  <div className="card-top">
                    <div className="card-icon-wrap" style={{ background: `${meta?.color}22`, color: meta?.color }}><Icon size={20} /></div>
                    <div className="card-actions">
                      <button className="action-btn edit" onClick={() => onEdit(prod)} disabled={isPending}><Edit3 size={13} /></button>
                      <button className="action-btn delete" onClick={() => handleDelete(prod.id, prod.item_name)} disabled={isPending}><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <p className="card-type">{meta?.label}</p>
                  <h4 className="card-title">{prod.item_name}</h4>
                  <div className="card-meta">
                    <span><strong>Unit:</strong> {prod.accounting_unit}</span>
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {prod.remarks ? prod.remarks : <span style={{ fontStyle: 'italic', color: 'var(--c-text-subtle)' }}>No remarks</span>}
                    </span>
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
          const active = item.id === 'products';
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

function Header({ toggleDark, dark, productCount, isPending, onAddOpen, settings }: {
  toggleDark: () => void;
  dark: boolean;
  
  productCount: number;
  isPending: boolean;
  onAddOpen: () => void;
  settings: BusinessSettings;
}) {
  const mounted = useMounted();
  const now = mounted
    ? new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <header className="app-header">
      <div className="header-left">
        <h1 className="header-title">Product Management</h1>
        <p className="header-date" suppressHydrationWarning>{now}</p>
      </div>
      <div className="header-right">
        {/* "+ Add Product" button right in Header */}
        <button type="button" className="btn-primary" style={{ padding: '8px 16px', minHeight: '38px' }} onClick={onAddOpen}>
          <Plus size={15} />
          <span>Add Product</span>
        </button>

        <div className="stat-pill">
          {isPending ? <Loader2 size={13} className="spin" /> : <Package size={13} />}
          <span>{productCount} Products</span>
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

// ─── Main ProductsModule ──────────────────────────────────────────────────────

export default function ProductsModule({ initialProducts, settings }: { initialProducts: Product[]; settings: BusinessSettings }) {
  
  const mounted                       = useMounted();
  const [dark, setDark]               = useState(false);
  
  

  const handleLogin = (u: any) => { 
     
    sessionStorage.setItem('erp_user', JSON.stringify(u));
    if (typeof addToast === 'function') addToast(`Welcome back, ${u.name}!`); 
  };
  
  

  const [products, setProducts]       = useState<Product[]>(initialProducts);
  const [editTarget, setEditTarget]   = useState<Product | null>(null);
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

  const handleSave = (payload: ProductInsert) => {
    startTransition(async () => {
      if (editTarget) {
        // Edit flow
        const result = await updateProduct({ id: editTarget.id, ...payload });
        if (result.success) {
          setProducts(p => p.map(prod => prod.id === result.data.id ? result.data : prod));
          addToast(`Product "${result.data.item_name}" updated!`);
          setIsSheetOpen(false);
          setEditTarget(null);
        } else {
          addToast(result.error, 'error');
        }
      } else {
        // Create flow
        const result = await createProduct(payload);
        if (result.success) {
          setProducts(p => [result.data, ...p]);
          addToast(`Product "${result.data.item_name}" registered!`);
          setIsSheetOpen(false);
        } else {
          addToast(result.error, 'error');
        }
      }
    });
  };

  const handleEditInit = (prod: Product) => {
    setEditTarget(prod);
    setIsSheetOpen(true);
  };

  const handleDelete = (id: string) => {
    const original = [...products];
    setProducts(p => p.filter(prod => prod.id !== id));

    startTransition(async () => {
      const result = await deleteProduct(id);
      if (result.success) {
        addToast('Product successfully deleted.', 'error');
      } else {
        setProducts(original); // Rollback
        addToast(result.error, 'error');
      }
    });
  };

  if (!mounted) {
    return <div style={{ visibility: 'hidden', minHeight: '100vh' }} suppressHydrationWarning />;
  }

  

  return (
    <div className="app-shell">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(c => !c)} settings={settings} />
      <div className="app-main">
        <Header
          toggleDark={toggleTheme}
          dark={dark}
          productCount={products.length}
          isPending={isPending}
          onAddOpen={() => { setEditTarget(null); setIsSheetOpen(true); }}
          settings={settings}
        />
        <main className="app-content">
          <StatsBar products={products} />
          
          <ProductTable
            products={products}
            onDelete={handleDelete}
            onEdit={handleEditInit}
            isPending={isPending}
          />
        </main>
      </div>

      <Sheet
        isOpen={isSheetOpen}
        onClose={() => { setIsSheetOpen(false); setEditTarget(null); }}
        title={editTarget ? 'Edit Product details' : 'Add New Product'}
      >
        <ProductForm
          onSave={handleSave}
          editTarget={editTarget}
          isPending={isPending}
          onClose={() => { setIsSheetOpen(false); setEditTarget(null); }}
        />
      </Sheet>

      <ToastStack toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
