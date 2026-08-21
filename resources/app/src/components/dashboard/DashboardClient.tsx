'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { 
  TrendingUp, Users, Truck, Landmark, Plus, ArrowRight,
  ShoppingCart, PackageSearch, Receipt, AlertTriangle, CheckCircle2
, Sun, Moon, LogOut, Zap, SlidersHorizontal, ChevronRight, Grid3X3, List, Settings, BarChart3 , Banknote, LineChart, Package} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';


const cls = (...args: (string | boolean | undefined | null)[]) => args.filter(Boolean).join(' ');


const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: Grid3X3, href: '/' },
  { id: 'accounts',  label: 'Accounts',  icon: Users, href: '/accounts' },
  { id: 'products',  label: 'Products',  icon: Package, href: '/products' },
  { id: 'purchases', label: 'Purchases', icon: ShoppingCart, href: '/purchases' },
  { id: 'sales',     label: 'Sales',     icon: TrendingUp, href: '/sales' },
  { id: 'vouchers',  label: 'Vouchers',  icon: Banknote, href: '/vouchers' },
  { id: 'settings',  label: 'Settings',  icon: Settings, href: '/settings' },
  { id: 'reports',   label: 'Reports',   icon: LineChart, href: '/reports' },
];

function Sidebar({ collapsed, onToggle, settings }: {
  
  
  collapsed: boolean;
  onToggle: () => void;
  settings?: any;
}) {
  return (
    <aside className={cls('sidebar', collapsed && 'collapsed')}>
      <div className="sidebar-brand" onClick={collapsed ? onToggle : undefined} style={{ cursor: collapsed ? 'pointer' : 'default' }}>
        {settings?.logo_url ? (
          <img src={settings.logo_url} alt="Logo" style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }} />
        ) : (
          <div className="sidebar-brand-icon"><Zap size={20} /></div>
        )}
        {!collapsed && <span className="sidebar-brand-text">{settings?.business_name || 'AIwithKashan'}</span>}
        <button className="sidebar-collapse-btn" onClick={(e) => { if (collapsed) e.stopPropagation(); onToggle(); }} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {collapsed ? <ChevronRight size={15} /> : <SlidersHorizontal size={15} />}
        </button>
      </div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const active = item.id === 'dashboard';
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

function Header({ toggleDark, dark, settings }: { toggleDark: () => void; dark: boolean; settings?: any }) {
  const businessName = settings?.business_name || 'AIwithKashan';
  
  return (
    <header className="app-header">
      <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <h1 
            style={{ 
              margin: 0, 
              fontSize: '1.5rem', 
              fontWeight: 800,
              letterSpacing: '-0.5px',
              backgroundImage: dark 
                ? 'linear-gradient(90deg, #10b981 0%, #34d399 50%, #10b981 100%)' 
                : 'linear-gradient(90deg, #047857 0%, #10b981 50%, #047857 100%)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'shine 3s linear infinite'
            }}
          >
            {businessName}
          </h1>
          <motion.p 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 0.3, duration: 0.5 }}
            style={{ 
              margin: 0, 
              fontSize: '0.85rem', 
              color: 'var(--c-text-muted)', 
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}
          >
            Executive Dashboard
          </motion.p>
        </motion.div>
      </div>
      <div className="header-right">
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


export default function DashboardClient({

  metrics,
  lowStock,
  recentActivity,
  salesTrend,
  settings
}: {
  metrics: { monthlyRevenue: number, totalReceivables: number, totalPayables: number, liquidCash: number };
  lowStock: any[];
  recentActivity: any[];
  salesTrend: any[];
  settings?: any;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  

  const [dark, setDark] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  
  useEffect(() => {
    try {
      const theme = localStorage.getItem('theme');
      if (theme === 'dark') setDark(true);
    } catch(e){}
  }, []);

  const toggleTheme = () => {
    const newVal = !dark;
    setDark(newVal);
    try {
      localStorage.setItem('theme', newVal ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', newVal ? 'dark' : 'light');
    } catch(e){}
  };


  useEffect(() => {
    setMounted(true);
  }, []);

  const formatCurrency = (val: number) => {
    return 'PKR ' + (val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const diff = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (diff < 60) return `Just now`;
    if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  if (!mounted) return null;

  return (
    <div className={cls('app-shell', dark && 'dark-theme')}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} settings={settings} />
        <div className="app-main">
          <Header dark={dark} toggleDark={toggleTheme} settings={settings} />
          <main className="app-content">
          <div className="animate-fade-in" style={{ animationDuration: '0.4s', paddingBottom: '2rem' }}>
      {/* SECTION B: Quick Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="form-title" style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Command Center</h1>
          <p className="form-subtitle">Welcome back! Here's what's happening today.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={() => router.push('/sales')} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> New Sale
          </button>
          <button onClick={() => router.push('/purchases')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--c-bg-overlay)' }}>
            <Plus size={18} /> New Purchase
          </button>
          <button onClick={() => router.push('/vouchers')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--c-bg-overlay)' }}>
            <Receipt size={18} /> Payment / Voucher
          </button>
        </div>
      </div>

      {/* SECTION A: Top Metric Cards */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          marginBottom: '32px'
        }}
      >
        <Link href="/sales" style={{ textDecoration: 'none', display: 'block' }}>
          <motion.div variants={itemVariants} className="stat-card" style={{ flex: 'none', width: '100%', cursor: 'pointer' }}>
            <div className="stat-icon" style={{ background: 'var(--c-primary-light)', color: 'var(--c-primary)' }}>
              <TrendingUp size={22} />
            </div>
            <div>
              <div className="stat-label">Monthly Revenue</div>
              <div className="stat-count" style={{ color: 'var(--c-primary)' }}>{formatCurrency(metrics.monthlyRevenue)}</div>
            </div>
          </motion.div>
        </Link>

        <Link href="/accounts" style={{ textDecoration: 'none', display: 'block' }}>
          <motion.div variants={itemVariants} className="stat-card" style={{ flex: 'none', width: '100%', cursor: 'pointer' }}>
            <div className="stat-icon" style={{ background: 'var(--c-warning-light)', color: 'var(--c-warning)' }}>
              <Users size={22} />
            </div>
            <div>
              <div className="stat-label">Total Udhaar (Receivables)</div>
              <div className="stat-count" style={{ color: 'var(--c-warning)' }}>{formatCurrency(metrics.totalReceivables)}</div>
            </div>
          </motion.div>
        </Link>

        <Link href="/accounts" style={{ textDecoration: 'none', display: 'block' }}>
          <motion.div variants={itemVariants} className="stat-card" style={{ flex: 'none', width: '100%', cursor: 'pointer' }}>
            <div className="stat-icon" style={{ background: 'var(--c-danger-light)', color: 'var(--c-danger)' }}>
              <Truck size={22} />
            </div>
            <div>
              <div className="stat-label">Total Payables</div>
              <div className="stat-count" style={{ color: 'var(--c-danger)' }}>{formatCurrency(metrics.totalPayables)}</div>
            </div>
          </motion.div>
        </Link>

        <Link href="/reports" style={{ textDecoration: 'none', display: 'block' }}>
          <motion.div variants={itemVariants} className="stat-card" style={{ flex: 'none', width: '100%', cursor: 'pointer' }}>
            <div className="stat-icon" style={{ background: 'color-mix(in srgb, #0ea5e9 15%, transparent)', color: '#0ea5e9' }}>
              <Landmark size={22} />
            </div>
            <div>
              <div className="stat-label">Cash & Bank Balance</div>
              <div className="stat-count" style={{ color: '#0ea5e9' }}>{formatCurrency(metrics.liquidCash)}</div>
            </div>
          </motion.div>
        </Link>
      </motion.div>

      {/* SECTION C: Sales Trend Chart */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="form-section"
        style={{ marginBottom: '32px', padding: '24px' }}
      >
        <h3 className="section-title" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={20} style={{ color: 'var(--c-primary)' }} />
          Sales Trend (Last 14 Days)
        </h3>
        <div style={{ width: '100%', height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={salesTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--c-primary)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--c-primary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--c-border)" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--c-text-muted)', fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--c-text-muted)', fontSize: 12 }} tickFormatter={(val) => `PKR ${(val/1000).toFixed(0)}k`} />
              <Tooltip 
                contentStyle={{ background: 'var(--c-bg-overlay)', border: '1px solid var(--c-border)', borderRadius: '8px', boxShadow: 'var(--shadow-md)' }}
                itemStyle={{ color: 'var(--c-text)', fontWeight: 500 }}
                formatter={(value: any) => [formatCurrency(Number(value) || 0), 'Revenue']}
                labelStyle={{ color: 'var(--c-text-muted)', marginBottom: '4px' }}
              />
              <Area type="monotone" dataKey="revenue" stroke="var(--c-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* SECTION D: Split View - Recent Activity & Low Stock */}
      <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
        
        {/* Recent Activity */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="form-section" 
          style={{ padding: '20px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Receipt size={20} style={{ color: 'var(--c-primary)' }} />
              Recent Activity
            </h3>
            <button className="btn-ghost-sm" onClick={() => router.push('/reports/daily-book')}>
              View All <ArrowRight size={16} />
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {recentActivity.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--c-text-muted)', background: 'var(--c-bg-alt)', borderRadius: '8px' }}>
                No recent activity found.
              </div>
            ) : (
              recentActivity.map((act, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', background: 'var(--c-bg-alt)', borderRadius: '12px', border: '1px solid var(--c-border)' }}>
                  <div style={{ 
                    width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    background: act.source_type.includes('SALE') ? 'color-mix(in srgb, #0ea5e9 15%, transparent)' : act.source_type.includes('PURCHASE') ? 'var(--c-warning-light)' : 'var(--c-primary-light)',
                    color: act.source_type.includes('SALE') ? '#0ea5e9' : act.source_type.includes('PURCHASE') ? 'var(--c-warning)' : 'var(--c-primary)'
                  }}>
                    {act.source_type.includes('SALE') ? <TrendingUp size={20} /> : act.source_type.includes('PURCHASE') ? <ShoppingCart size={20} /> : <Landmark size={20} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--c-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {act.account_name || 'Cash/Bank Entry'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--c-text-muted)', display: 'flex', gap: '8px' }}>
                      <span>{act.ref_no || act.source_type}</span>
                      <span>•</span>
                      <span>{formatRelativeTime(act.txn_date)}</span>
                    </div>
                  </div>
                  <div style={{ fontWeight: 600, color: act.credit > 0 ? 'var(--c-danger)' : 'var(--c-primary)', whiteSpace: 'nowrap' }}>
                    {act.credit > 0 ? '-' : '+'}{formatCurrency(act.debit || act.credit)}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Low Stock Alerts */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="form-section" 
          style={{ padding: '20px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={20} style={{ color: 'var(--c-danger)' }} />
              Low Stock Alerts
            </h3>
            <button className="btn-ghost-sm" onClick={() => router.push('/reports/stock')}>
              Full Report <ArrowRight size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {lowStock.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--c-text-muted)', background: 'var(--c-bg-alt)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <CheckCircle2 size={32} style={{ color: 'var(--c-primary)' }} />
                All items are sufficiently stocked!
              </div>
            ) : (
              lowStock.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: item.current_stock <= 0 ? 'var(--c-danger-light)' : 'var(--c-warning-light)', borderRadius: '12px', border: `1px solid ${item.current_stock <= 0 ? 'var(--c-danger)' : 'var(--c-warning)'}40` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div style={{ color: item.current_stock <= 0 ? 'var(--c-danger)' : 'var(--c-warning)' }}>
                      <PackageSearch size={24} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'var(--c-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.item_name}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: item.current_stock <= 0 ? 'var(--c-danger)' : 'var(--c-warning)', opacity: 0.9 }}>
                        {item.current_stock <= 0 ? 'Out of Stock' : 'Low Stock Warning'}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: item.current_stock <= 0 ? 'var(--c-danger)' : 'var(--c-warning)', lineHeight: 1 }}>
                      {item.current_stock}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--c-text-muted)' }}>{item.accounting_unit}</div>
                  </div>
                </div>
              ))
            )}
            {lowStock.length > 0 && (
              <button 
                onClick={() => router.push('/purchases')} 
                className="btn-primary" 
                style={{ width: '100%', marginTop: '8px', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
              >
                <Plus size={18} /> Create Purchase Order
              </button>
            )}
          </div>
        </motion.div>

      </div>
    </div>
        </main>
      </div>
    </div>
  );
}
