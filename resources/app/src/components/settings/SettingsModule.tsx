'use client';

// ─── SettingsModule ───────────────────────────────────────────────────────────
// Client Component: handles business parameters, theme appearance, and logo uploads.
// Reuses the headless Combobox, glassmorphic styles, and unified sidebar layout.

import {
  useState, useRef, useEffect, useCallback, useTransition,
} from 'react';
import Link from 'next/link';
import {
  Sun, Moon, Zap, User, Lock, Eye, EyeOff, Plus, Search, Building2, Phone, MapPin, Tag,
  ChevronDown, X, Check, AlertCircle, Trash2, Edit3, Users, CreditCard, Briefcase, Package,
  Home, TrendingUp, Shield, SlidersHorizontal, Grid3X3, List, Filter, ChevronUp, Bell,
  Settings, BarChart3, Loader2, LogOut, LogIn, Upload, Download, Mail, Receipt, Info, Sparkles, ChevronRight,
  ShoppingCart, Banknote, LineChart, MessageCircle, Smartphone, Wifi, WifiOff, QrCode,
  RefreshCw, Unplug, Cloud, Database, FolderTree, ArrowDownCircle
} from 'lucide-react';

import { updateSettings, uploadLogo, getDatabasePathInfo, switchDatabasePath, type DatabaseLocationInfo } from '@/app/settings/actions';
import { getBackupConfig, getGoogleAuthUrl, disconnectGoogleDrive, backupToCloud, restoreFromCloud } from '@/app/settings/backup-actions';
import { checkForAppUpdates, downloadAndRunUpdate, type UpdateInfo } from '@/app/settings/update-actions';
import type { BusinessSettings } from '@/types/database';

const CURRENT_APP_VERSION = '2.0.6';

const PAKISTAN_AREAS = [
  'Serai Naurang', 'Bannu', 'Lakki Marwat', 'Karak', 'Kohat',
  'Peshawar', 'D.I. Khan', 'Mardan', 'Swat', 'Islamabad',
  'Rawalpindi', 'Lahore', 'Karachi', 'Quetta',
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
          const active = item.id === 'settings';
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

function Header({ toggleDark, dark, isPending, settings }: {
  toggleDark: () => void;
  dark: boolean;
  
  isPending: boolean;
  settings: BusinessSettings;
}) {
  const mounted = useMounted();
  const now = mounted
    ? new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <header className="app-header">
      <div className="header-left">
        <h1 className="header-title">System Settings</h1>
        <p className="header-date" suppressHydrationWarning>{now}</p>
      </div>
      <div className="header-right">
        <div className="stat-pill">
          {isPending ? <Loader2 size={13} className="spin" /> : <Settings size={13} />}
          <span>Identity Config</span>
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


// ─── Main SettingsModule ──────────────────────────────────────────────────────

type TabId = 'profile' | 'appearance' | 'database' | 'about' | 'backup';


export default function SettingsModule({ initialSettings }: { initialSettings: BusinessSettings }) {
  
  const mounted                       = useMounted();
  const [dark, setDark]               = useState(false);
  
  

  const handleLogin = (u: any) => { 
     
    sessionStorage.setItem('erp_user', JSON.stringify(u));
    if (typeof addToast === 'function') addToast(`Welcome back, ${u.name}!`); 
  };
  
  

  const [activeTab, setActiveTab]     = useState<TabId>('profile');
  const [settings, setSettings]       = useState<BusinessSettings>(initialSettings);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isPending, startTransition]  = useTransition();
  const { toasts, addToast, removeToast } = useToast();

  // Cloud Backup Settings State
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [connected, setConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  // Database Path Management State
  const [dbInfo, setDbInfo] = useState<DatabaseLocationInfo | null>(null);
  const [newDbDir, setNewDbDir] = useState('');
  const [copyDbData, setCopyDbData] = useState(true);
  const [dbSwitching, setDbSwitching] = useState(false);

  // In-App Update State
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [updateChecking, setUpdateChecking] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function loadCloudConfig() {
      const res = await getBackupConfig();
      if (res.success && res.data) {
        setClientId(res.data.clientId || '');
        setClientSecret(res.data.clientSecret || '');
        setConnected(!!res.data.connected);
        setGoogleEmail(res.data.email || '');
      }
    }
    async function loadDbInfo() {
      const res = await getDatabasePathInfo();
      if (res.success && res.data) {
        setDbInfo(res.data);
        setNewDbDir(res.data.activeDbDir);
      }
    }
    loadCloudConfig();
    loadDbInfo();
  }, []);

  const handleSwitchDbPath = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDbDir.trim()) {
      addToast('Please provide a valid directory path.', 'error');
      return;
    }
    if (!confirm(`Are you sure you want to switch database storage to "${newDbDir.trim()}"?`)) {
      return;
    }
    setDbSwitching(true);
    const res = await switchDatabasePath(newDbDir.trim(), copyDbData);
    setDbSwitching(false);
    if (res.success) {
      addToast(res.data || 'Database location updated successfully!');
      const refresh = await getDatabasePathInfo();
      if (refresh.success && refresh.data) setDbInfo(refresh.data);
    } else {
      addToast(res.error || 'Failed to switch database location.', 'error');
    }
  };

  const handleCheckUpdates = async () => {
    setUpdateChecking(true);
    const res = await checkForAppUpdates();
    setUpdateChecking(false);
    if (res.success && res.data) {
      setUpdateInfo(res.data);
      if (res.data.hasUpdate) {
        addToast(`New Update v${res.data.latestVersion} available!`);
      } else {
        addToast(`You are on the latest version (v${CURRENT_APP_VERSION})`);
      }
    } else {
      addToast((res as any).error || 'Unable to check for updates.', 'error');
    }
  };

  const [downloadProgress, setDownloadProgress] = useState<{ percent: number; loadedMB: string; totalMB: string; status: string } | null>(null);

  const handleApplyUpdate = async () => {
    if (!updateInfo?.downloadUrl) {
      addToast('No update package URL found. Please check internet connection.', 'error');
      return;
    }
    if (!confirm(`Download and install SolarERP v${updateInfo.latestVersion}? The app will restart to apply the update.`)) {
      return;
    }
    setUpdating(true);
    setDownloadProgress({ percent: 0, loadedMB: '0.0', totalMB: '...', status: 'Connecting to Cloud CDN...' });

    try {
      const response = await fetch('/api/update/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ downloadUrl: updateInfo.downloadUrl })
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to initiate update download.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.error) {
              throw new Error(data.error);
            }
            setDownloadProgress({
              percent: data.percent,
              loadedMB: data.loadedMB || '',
              totalMB: data.totalMB || '',
              status: data.status === 'applying' ? 'Launching update installer...' : `Downloading update (${data.loadedMB || 0} MB / ${data.totalMB || 0} MB)...`
            });
            if (data.done) {
              addToast('Update downloaded! SolarERP is restarting to apply...', 'success');
            }
          }
        }
      }
    } catch (err: any) {
      setUpdating(false);
      setDownloadProgress(null);
      addToast(err.message || 'Failed to download update.', 'error');
    }
  };

  const [showAdvancedOAuth, setShowAdvancedOAuth] = useState(false);

  const handleConnectGoogleDrive = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setBackupLoading(true);
    const res = await getGoogleAuthUrl(clientId.trim(), clientSecret.trim());
    setBackupLoading(false);
    if (res.success) {
      addToast('Opening Google sign-in window...');
      window.open(res.data, '_blank');

      // Poll config to check connection completion
      const interval = setInterval(async () => {
        const check = await getBackupConfig();
        if (check.success && check.data && check.data.connected) {
          setConnected(true);
          setGoogleEmail(check.data.email || '');
          addToast('Google Drive connected successfully!');
          clearInterval(interval);
        }
      }, 2000);
      setTimeout(() => clearInterval(interval), 120000); // Stop polling after 2 mins
    } else {
      addToast(res.error || 'Failed to generate connection link.', 'error');
    }
  };

  const handleDisconnectGoogleDrive = async () => {
    if (!confirm('Are you sure you want to disconnect Google Drive? Your credentials will be cleared.')) {
      return;
    }
    setBackupLoading(true);
    const res = await disconnectGoogleDrive();
    setBackupLoading(false);
    if (res.success) {
      setConnected(false);
      setGoogleEmail('');
      setClientId('');
      setClientSecret('');
      addToast('Disconnected from Google Drive.');
    } else {
      addToast(res.error || 'Failed to disconnect.', 'error');
    }
  };

  const handleBackupToCloud = async () => {
    setBackupLoading(true);
    const res = await backupToCloud();
    setBackupLoading(false);
    if (res.success) {
      addToast('Database backed up to Google Drive successfully!');
    } else {
      addToast(res.error || 'Google Drive backup failed.', 'error');
    }
  };

  const handleRestoreFromCloud = async () => {
    if (!confirm('WARNING: Restoring will overwrite all current local data with the backed-up database from Google Drive! This action cannot be undone. Are you sure you want to proceed?')) {
      return;
    }
    setRestoreLoading(true);
    const res = await restoreFromCloud();
    setRestoreLoading(false);
    if (res.success) {
      addToast('Database restored successfully! Overwritten data is active.');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      addToast(res.error || 'Failed to restore database from Google Drive.', 'error');
    }
  };

  // Form Fields State
  const [businessName, setBusinessName]           = useState(settings.business_name);
  const [ownerName, setOwnerName]                 = useState(settings.owner_name ?? '');
  const [phone, setPhone]                         = useState(settings.phone ?? '');
  const [email, setEmail]                         = useState(settings.email ?? '');
  const [address, setAddress]                     = useState(settings.address ?? '');
  const [region, setRegion]                       = useState(settings.region ?? '');
  const [ntnOrTaxId, setNtnOrTaxId]               = useState(settings.ntn_or_tax_id ?? '');
  const [currency, setCurrency]                   = useState(settings.currency);
  const [receiptFooterNote, setReceiptFooterNote] = useState(settings.receipt_footer_note ?? '');
  const [logoUploading, setLogoUploading]         = useState(false);

  // Sync state if initialSettings changes
  useEffect(() => {
    setSettings(initialSettings);
    setBusinessName(initialSettings.business_name);
    setOwnerName(initialSettings.owner_name ?? '');
    setPhone(initialSettings.phone ?? '');
    setEmail(initialSettings.email ?? '');
    setAddress(initialSettings.address ?? '');
    setRegion(initialSettings.region ?? '');
    setNtnOrTaxId(initialSettings.ntn_or_tax_id ?? '');
    setCurrency(initialSettings.currency);
    setReceiptFooterNote(initialSettings.receipt_footer_note ?? '');
  }, [initialSettings]);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      setDark(true);
    } else {
      setDark(false);
    }
  }, []);

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

  // Profile Save
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      addToast('Business Name is required.', 'error');
      return;
    }

    startTransition(async () => {
      const result = await updateSettings({
        id: settings.id,
        business_name: businessName.trim(),
        owner_name: ownerName.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        region: region.trim() || null,
        ntn_or_tax_id: ntnOrTaxId.trim() || null,
        currency: currency.trim() || 'PKR',
        receipt_footer_note: receiptFooterNote.trim() || null,
      });

      if (result.success) {
        setSettings(result.data);
        addToast('Business settings updated successfully!');
      } else {
        addToast(result.error, 'error');
      }
    });
  };

  // Logo Upload
  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('settingsId', settings.id);

    const result = await uploadLogo(formData);
    setLogoUploading(false);

    if (result.success) {
      setSettings(prev => ({ ...prev, logo_url: result.data }));
      addToast('Business logo updated successfully!');
    } else {
      addToast(result.error, 'error');
    }
  };

  if (!mounted) {
    return <div style={{ visibility: 'hidden', minHeight: '100vh' }} suppressHydrationWarning />;
  }

  

  return (
    <div className="app-shell">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(c => !c)} settings={settings} />
      <div className="app-main">
        <Header toggleDark={toggleTheme} dark={dark} isPending={isPending} settings={settings} />
        <main className="app-content animate-fade-in">
          {/* Custom Glassmorphic Tabs Component */}
          <div className="account-table-wrap" style={{ padding: '0px' }}>
            <div className="table-toolbar" style={{ borderBottom: '1px solid var(--c-border)', background: 'var(--c-bg-input)' }}>
              <div className="filter-chips" style={{ marginBottom: 0 }}>
                <button
                  onClick={() => setActiveTab('profile')}
                  className={cls('filter-chip', activeTab === 'profile' && 'active')}
                  style={{ borderRadius: '8px' }}>
                  <Building2 size={14} />
                  <span>Business Profile</span>
                </button>
                <button
                  onClick={() => setActiveTab('appearance')}
                  className={cls('filter-chip', activeTab === 'appearance' && 'active')}
                  style={{ borderRadius: '8px' }}>
                  {dark ? <Moon size={14} /> : <Sun size={14} />}
                  <span>Appearance</span>
                </button>
                
                <button
                  onClick={() => setActiveTab('database')}
                  className={cls('filter-chip', activeTab === 'database' && 'active')}
                  style={{ borderRadius: '8px' }}>
                  <Database size={14} />
                  <span>Database & Storage</span>
                </button>
                <button
                  onClick={() => setActiveTab('backup')}
                  className={cls('filter-chip', activeTab === 'backup' && 'active')}
                  style={{ borderRadius: '8px' }}>
                  <RefreshCw size={14} />
                  <span>Cloud Backup & Sync</span>
                </button>
                <button
                  onClick={() => setActiveTab('about')}
                  className={cls('filter-chip', activeTab === 'about' && 'active')}
                  style={{ borderRadius: '8px' }}>
                  <Info size={14} />
                  <span>About & Updates</span>
                </button>
              </div>
            </div>

            <div style={{ padding: '28px' }}>
              {/* TAB A: Business Profile */}
              {activeTab === 'profile' && (
                <form onSubmit={handleSaveProfile} className="account-form" style={{ background: 'transparent', border: 'none', padding: 0, boxShadow: 'none' }}>
                  {/* Logo Upload Section */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                    <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                      <div style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        border: '2px solid var(--c-primary)',
                        background: 'var(--c-bg-input)',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 'var(--shadow-md)',
                        position: 'relative'
                      }}>
                        {settings.logo_url ? (
                          <img src={settings.logo_url} alt="Business Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Zap size={36} style={{ color: 'var(--c-primary)' }} />
                        )}
                        {logoUploading && (
                          <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0,0,0,0.6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff'
                          }}>
                            <Loader2 size={24} className="spin" />
                          </div>
                        )}
                      </div>
                      <label style={{
                        position: 'absolute',
                        bottom: '-6px',
                        right: '-6px',
                        background: 'var(--c-primary)',
                        color: '#fff',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: 'var(--shadow-sm)',
                        transition: 'var(--transition)'
                      }} className="hover:scale-105" title="Upload Logo">
                        <Upload size={14} />
                        <input type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} disabled={logoUploading} />
                      </label>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--c-text)' }}>Business Logo</h4>
                      <p style={{ fontSize: '0.72rem', color: 'var(--c-text-subtle)', marginTop: '2px' }}>PNG, JPG, SVG, or WEBP (Max 2MB)</p>
                    </div>
                  </div>

                  {/* Opening Balances Entry */}
                  <div style={{ padding: '16px 20px', background: 'var(--c-bg-card)', borderRadius: 12, border: '1px solid var(--c-primary)', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-sm)' }}>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--c-primary)' }}>Opening Balances & Onboarding</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--c-text-subtle)', margin: '4px 0 0 0' }}>Configure initial Cash, Bank, Receivables, Payables, and Stock.</p>
                    </div>
                    <Link href="/opening-balances" className="btn-primary" style={{ textDecoration: 'none' }}>
                      Configure
                    </Link>
                  </div>

                  {/* Profile inputs */}
                  <div className="form-grid">
                    <div className="field-group">
                      <label className="field-label">Business Name <span className="required">*</span></label>
                      <div className="input-wrapper">
                        <Building2 size={16} className="input-icon" />
                        <input className="field-input" placeholder="e.g. AIwithKashan" value={businessName} onChange={e => setBusinessName(e.target.value)} required />
                      </div>
                    </div>

                    <div className="field-group">
                      <label className="field-label">Owner Name</label>
                      <div className="input-wrapper">
                        <User size={16} className="input-icon" />
                        <input className="field-input" placeholder="e.g. Ahmad Khan" value={ownerName} onChange={e => setOwnerName(e.target.value)} />
                      </div>
                    </div>

                    <div className="field-group">
                      <label className="field-label">Phone Number</label>
                      <div className="input-wrapper">
                        <Phone size={16} className="input-icon" />
                        <input className="field-input" placeholder="e.g. 091-5270101" value={phone} onChange={e => setPhone(e.target.value)} />
                      </div>
                    </div>

                    <div className="field-group">
                      <label className="field-label">Email Address</label>
                      <div className="input-wrapper">
                        <Mail size={16} className="input-icon" />
                        <input className="field-input" placeholder="e.g. info@business.com" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                      </div>
                    </div>

                    <div className="field-group" style={{ gridColumn: 'span 2' }}>
                      <label className="field-label">Street Address</label>
                      <div className="input-wrapper">
                        <Home size={16} className="input-icon" />
                        <input className="field-input" placeholder="e.g. Main Peshawar Road, Serai Naurang, KP" value={address} onChange={e => setAddress(e.target.value)} />
                      </div>
                    </div>

                    <div className="field-group">
                      <label className="field-label">Tax / NTN Registration Number</label>
                      <div className="input-wrapper">
                        <Shield size={16} className="input-icon" />
                        <input className="field-input" placeholder="e.g. NTN-8729101-4" value={ntnOrTaxId} onChange={e => setNtnOrTaxId(e.target.value)} />
                      </div>
                    </div>

                    <div className="field-group">
                      <label className="field-label">Area / Region</label>
                      <Combobox value={region} onChange={setRegion} options={PAKISTAN_AREAS} placeholder="Search or type area…" />
                    </div>

                    <div className="field-group">
                      <label className="field-label">Default Currency Symbol</label>
                      <div className="input-wrapper">
                        <CreditCard size={16} className="input-icon" />
                        <input className="field-input" placeholder="e.g. PKR" value={currency} onChange={e => setCurrency(e.target.value)} />
                      </div>
                    </div>

                    <div className="field-group" style={{ gridColumn: 'span 2' }}>
                      <label className="field-label">Receipt Footer Note</label>
                      <div className="input-wrapper">
                        <textarea className="field-input field-textarea" style={{ paddingLeft: '14px' }} placeholder="e.g. Thank you for your business!" value={receiptFooterNote} onChange={e => setReceiptFooterNote(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div className="form-actions" style={{ marginTop: '24px' }}>
                    <button type="submit" className="btn-primary" disabled={isPending}>
                      {isPending ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                      <span>Save Changes</span>
                    </button>
                  </div>
                </form>
              )}

              {/* TAB B: Theme/Appearance */}
              {activeTab === 'appearance' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '400px' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--c-text)' }}>System Theme</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--c-text-subtle)', marginTop: '4px' }}>Select your preferred default screen workspace style.</p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => { if (dark) toggleTheme(); }}
                      className={cls('btn-secondary', !dark && 'active')}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '24px',
                        gap: '8px',
                        border: !dark ? '2px solid var(--c-primary)' : '1px solid var(--c-border)',
                        background: !dark ? 'var(--c-primary-light)' : 'var(--c-bg-card)',
                        color: !dark ? 'var(--c-primary-dark)' : 'var(--c-text-muted)',
                        borderRadius: '12px'
                      }}>
                      <Sun size={24} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Light Workspace</span>
                    </button>
                    <button
                      onClick={() => { if (!dark) toggleTheme(); }}
                      className={cls('btn-secondary', dark && 'active')}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '24px',
                        gap: '8px',
                        border: dark ? '2px solid var(--c-primary)' : '1px solid var(--c-border)',
                        background: dark ? 'var(--c-primary-light)' : 'var(--c-bg-card)',
                        color: dark ? 'var(--c-primary-dark)' : 'var(--c-text-muted)',
                        borderRadius: '12px'
                      }}>
                      <Moon size={24} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Dark Workspace</span>
                    </button>
                  </div>
                </div>
              )}


              {/* TAB C: Database & Storage Management */}
              {activeTab === 'database' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '650px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--c-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Database size={20} style={{ color: 'var(--c-primary)' }} />
                      Database & Storage Location
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--c-text-subtle)', marginTop: '4px' }}>
                      View and manage where your local shop database (<code>dev.db</code>) and local backups are stored on your computer.
                    </p>
                  </div>

                  {/* Active DB Info Card */}
                  <div style={{ padding: '18px', borderRadius: '12px', border: '1px solid var(--c-border)', background: 'var(--c-bg-card)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--c-text-muted)' }}>Active Database Path:</span>
                      <span style={{ fontSize: '0.78rem', padding: '2px 8px', borderRadius: '6px', background: 'var(--c-primary-light)', color: 'var(--c-primary-dark)', fontWeight: 700 }}>
                        {dbInfo?.fileSizeBytes ? `${(dbInfo.fileSizeBytes / 1024).toFixed(1)} KB` : 'Active SQLite'}
                      </span>
                    </div>
                    <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--c-bg-input)', border: '1px solid var(--c-border)', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--c-primary-dark)', wordBreak: 'break-all' }}>
                      {dbInfo?.activeDbPath || 'Loading database path...'}
                    </div>
                  </div>

                  {/* Switch Path Form */}
                  <form onSubmit={handleSwitchDbPath} style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--c-border)', background: 'var(--c-bg-card)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--c-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FolderTree size={16} />
                        Change Database Directory
                      </h4>
                      <p style={{ fontSize: '0.78rem', color: 'var(--c-text-muted)', margin: '4px 0 0 0' }}>
                        Enter a new folder path on your computer (e.g. <code>D:\SolarERP_Data</code> or <code>E:\MyBackups\SolarERP_Data</code>).
                      </p>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', display: 'block' }}>Target Folder Path</label>
                      <input
                        type="text"
                        value={newDbDir}
                        onChange={(e) => setNewDbDir(e.target.value)}
                        placeholder="e.g. D:\SolarERP_Data"
                        required
                        className="form-input"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--c-border)', background: 'var(--c-bg-input)', color: 'var(--c-text)', fontSize: '0.85rem' }}
                      />
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--c-text)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={copyDbData}
                        onChange={(e) => setCopyDbData(e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--c-primary)' }}
                      />
                      <span>Copy current database, license, and backup files to the new location automatically</span>
                    </label>

                    <div>
                      <button
                        type="submit"
                        disabled={dbSwitching}
                        className="btn btn-primary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '8px', background: 'var(--c-primary)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                      >
                        {dbSwitching ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
                        Switch Database Directory
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB D: About & Software Updates */}
              {activeTab === 'about' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '650px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid var(--c-border)',
                    background: 'var(--c-bg-input)'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff'
                    }}>
                      <Sparkles size={24} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--c-text)' }}>AIwithKashan Suite</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--c-text-subtle)' }}>Solar & Renewable Energy Business Management ERP</p>
                    </div>
                  </div>

                  {/* Software Update Card */}
                  <div style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--c-border)', background: 'var(--c-bg-card)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ArrowDownCircle size={20} style={{ color: 'var(--c-primary)' }} />
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--c-text)' }}>Software Updates</h4>
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--c-primary)' }}>
                        Current Version: v{CURRENT_APP_VERSION}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.8rem', color: 'var(--c-text-muted)', margin: 0 }}>
                      Check for the latest updates, bug fixes, and new features directly from the server.
                    </p>

                    <div>
                      <button
                        type="button"
                        onClick={handleCheckUpdates}
                        disabled={updateChecking || updating}
                        className="btn btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}
                      >
                        {updateChecking ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                        Check for Updates
                      </button>
                    </div>

                    {updateInfo && (
                      <div style={{ marginTop: '6px', padding: '14px', borderRadius: '10px', background: updateInfo.hasUpdate ? 'rgba(16, 185, 129, 0.08)' : 'var(--c-bg-input)', border: `1px solid ${updateInfo.hasUpdate ? '#10b981' : 'var(--c-border)'}` }}>
                        {updateInfo.hasUpdate ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#10b981' }}>
                                🎉 New Version v{updateInfo.latestVersion} Available!
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--c-text-muted)' }}>Released: {updateInfo.releaseDate}</span>
                            </div>

                            <div style={{ fontSize: '0.8rem', color: 'var(--c-text)' }}>
                              <strong>What&apos;s New:</strong>
                              <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                                {updateInfo.changelog.map((item, idx) => (
                                  <li key={idx} style={{ marginBottom: '2px' }}>{item}</li>
                                ))}
                              </ul>
                            </div>

                            <div style={{ marginTop: '6px' }}>
                              <button
                                type="button"
                                onClick={handleApplyUpdate}
                                disabled={updating}
                                className="btn btn-primary"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '8px', background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
                              >
                                {updating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                {updating ? 'Downloading Update...' : 'Download & Apply Update (1-Click)'}
                              </button>

                              {downloadProgress && (
                                <div style={{ marginTop: '12px', padding: '12px 14px', background: 'var(--c-bg-input)', borderRadius: '8px', border: '1px solid var(--c-border)' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.82rem' }}>
                                    <span style={{ fontWeight: 600, color: 'var(--c-text)' }}>{downloadProgress.status}</span>
                                    <span style={{ fontWeight: 800, color: '#10b981', fontSize: '0.9rem' }}>{downloadProgress.percent}%</span>
                                  </div>
                                  <div style={{ width: '100%', height: '8px', background: 'var(--c-border)', borderRadius: '999px', overflow: 'hidden' }}>
                                    <div
                                      style={{
                                        width: `${downloadProgress.percent}%`,
                                        height: '100%',
                                        background: 'linear-gradient(90deg, #10b981, #059669)',
                                        borderRadius: '999px',
                                        transition: 'width 0.2s ease-in-out'
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--c-text)' }}>
                            <Check size={16} style={{ color: '#10b981' }} />
                            <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Your software is completely up to date! (v{CURRENT_APP_VERSION})</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--c-border)' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--c-text-muted)' }}>Software Version</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>v{CURRENT_APP_VERSION} (Production Standalone)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--c-border)' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--c-text-muted)' }}>Created By</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Kashan Khan</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--c-border)' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--c-text-muted)' }}>Facebook</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--c-primary)' }}>@aiwithkashan</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--c-border)' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--c-text-muted)' }}>WhatsApp Contact</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#10b981' }}>03341911680</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--c-border)' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--c-text-muted)' }}>Database Connection Status</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--c-primary)' }}>Connected to Local SQLite Database</span>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--c-text-subtle)', lineHeight: 1.4 }}>
                    AIwithKashan is tailored to solar, inverter, cabling, and green energy shops in Pakistan. 
                    Enables robust accounting, product cataloging, and automated billing workflows.
                  </p>
                </div>
              )}

              {/* TAB E: Google Drive Cloud Backup & Restore */}
              {activeTab === 'backup' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '600px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--c-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <RefreshCw size={18} className={backupLoading || restoreLoading ? 'animate-spin' : ''} />
                      Google Drive Cloud Sync
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--c-text-subtle)', marginTop: '4px' }}>
                      Securely synchronize your business database using your personal Google Drive account.
                    </p>
                  </div>

                  {connected ? (
                    <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.05)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--c-text)' }}>Connected Account:</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#10b981' }}>{googleEmail}</span>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--c-text-muted)', margin: 0 }}>
                        Your configuration is set up. You can now perform backup or restore operations directly.
                      </p>
                      <div>
                        <button
                          type="button"
                          onClick={handleDisconnectGoogleDrive}
                          className="btn"
                          style={{ padding: '8px 14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgb(239, 68, 68)', color: 'rgb(239, 68, 68)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                        >
                          Disconnect Account
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--c-border)', background: 'var(--c-bg-card)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Cloud size={22} style={{ color: 'var(--c-primary)' }} />
                        </div>
                        <div>
                          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--c-text)' }}>Automatic Google Drive Authentication</h4>
                          <p style={{ fontSize: '0.78rem', color: 'var(--c-text-muted)', margin: 0 }}>Click below to authorize SolarERP to back up your database to your Google Drive account.</p>
                        </div>
                      </div>

                      <div>
                        <button
                          type="button"
                          onClick={() => handleConnectGoogleDrive()}
                          disabled={backupLoading}
                          className="btn btn-primary"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '12px 22px', borderRadius: '10px', background: '#4285F4', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', boxShadow: '0 2px 8px rgba(66,133,244,0.3)' }}
                        >
                          {backupLoading ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24">
                              <path fill="#fff" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C6.726,2,2,6.726,2,12.545S6.726,23.09,12.545,23.09c6.456,0,10.741-4.542,10.741-10.923c0-0.732-0.076-1.442-0.207-2.128H12.545z" />
                            </svg>
                          )}
                          Sign in with Google Drive
                        </button>
                      </div>

                      <div style={{ marginTop: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setShowAdvancedOAuth(!showAdvancedOAuth)}
                          style={{ background: 'none', border: 'none', color: 'var(--c-text-muted)', fontSize: '0.78rem', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
                        >
                          {showAdvancedOAuth ? 'Hide Custom Google Credentials' : 'Advanced: Use Custom Google Developer Credentials'}
                        </button>

                        {showAdvancedOAuth && (
                          <form onSubmit={handleConnectGoogleDrive} style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px', padding: '14px', borderRadius: '8px', background: 'var(--c-bg-input)', border: '1px solid var(--c-border)' }}>
                            <div className="form-group">
                              <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Custom Google OAuth Client ID</label>
                              <input
                                type="text"
                                value={clientId}
                                onChange={(e) => setClientId(e.target.value)}
                                placeholder="Optional custom client-id"
                                className="form-input"
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--c-border)', background: 'var(--c-bg-card)', color: 'var(--c-text)', fontSize: '0.8rem' }}
                              />
                            </div>

                            <div className="form-group">
                              <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Custom Google OAuth Client Secret</label>
                              <input
                                type="password"
                                value={clientSecret}
                                onChange={(e) => setClientSecret(e.target.value)}
                                placeholder="Optional custom client-secret"
                                className="form-input"
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--c-border)', background: 'var(--c-bg-card)', color: 'var(--c-text)', fontSize: '0.8rem' }}
                              />
                            </div>

                            <button
                              type="submit"
                              disabled={backupLoading}
                              className="btn btn-secondary"
                              style={{ width: 'fit-content', padding: '6px 12px', fontSize: '0.78rem' }}
                            >
                              Save Custom Credentials & Connect
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  )}

                  <div style={{ borderTop: '1px solid var(--c-border)', paddingTop: '20px', marginTop: '10px' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--c-text)', marginBottom: '12px' }}>Database Operations</h4>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                      <button
                        type="button"
                        onClick={handleBackupToCloud}
                        disabled={backupLoading || restoreLoading || !connected}
                        className="btn"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '8px', background: 'var(--c-primary)', color: '#fff', border: 'none', cursor: 'pointer', opacity: !connected ? 0.5 : 1 }}
                      >
                        {backupLoading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                        Upload Database to Cloud
                      </button>

                      <button
                        type="button"
                        onClick={handleRestoreFromCloud}
                        disabled={backupLoading || restoreLoading || !connected}
                        className="btn"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgb(239, 68, 68)', color: 'rgb(239, 68, 68)', cursor: 'pointer', opacity: !connected ? 0.5 : 1 }}
                      >
                        {restoreLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                        Restore Database from Cloud
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
      <ToastStack toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
