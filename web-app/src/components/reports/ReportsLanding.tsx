'use client';

import { useRouter } from 'next/navigation';
import { 
  BookOpen, 
  Wallet, 
  Network, 
  ShoppingCart, 
  TrendingUp, 
  PackageSearch, 
  LineChart, 
  Receipt,
  ArrowLeft
} from 'lucide-react';

const REPORTS = [
  {
    id: 'daily-book',
    title: 'Daily Book',
    description: 'Unified ledger showing opening balance, all daily transactions, and closing balance.',
    icon: BookOpen,
    href: '/reports/daily-book',
    color: '#10b981', // Emerald
  },
  {
    id: 'daily-cash',
    title: 'Daily Cash',
    description: 'Cash-only ledger showing daily cash inflows, outflows, and ending cash in hand.',
    icon: Wallet,
    href: '/reports/daily-cash',
    color: '#0ea5e9', // Sky
  },
  {
    id: 'chart-of-accounts',
    title: 'Chart of Accounts',
    description: 'Live snapshot of all ledger accounts and their current running balances.',
    icon: Network,
    href: '/reports/chart-of-accounts',
    color: '#8b5cf6', // Violet
  },
  {
    id: 'purchase',
    title: 'Purchases',
    description: 'Detailed purchase history, supplier invoices, and inventory acquisitions.',
    icon: ShoppingCart,
    href: '/reports/purchase',
    color: '#f59e0b', // Amber
  },
  {
    id: 'sale',
    title: 'Sales',
    description: 'Comprehensive sales report including discounts, net totals, and customer receipts.',
    icon: TrendingUp,
    href: '/reports/sale',
    color: '#ec4899', // Pink
  },
  {
    id: 'stock',
    title: 'Stock in Store',
    description: 'Current inventory valuation and stock levels across all product categories.',
    icon: PackageSearch,
    href: '/reports/stock',
    color: '#14b8a6', // Teal
  },
  {
    id: 'profit',
    title: 'Profit & Loss',
    description: 'Calculates Gross Profit (Sales - COGS) and Net Profit (Gross - Expenses).',
    icon: LineChart,
    href: '/reports/profit-loss',
    color: '#22c55e', // Green
  },
  {
    id: 'account-statement',
    title: 'Account Statement',
    description: 'Detailed transaction history and running ledger balance for any account.',
    icon: BookOpen,
    href: '/reports/account-statement',
    color: '#3b82f6', // Blue
  },
  {
    id: 'expenses',
    title: 'Expenses Breakdown',
    description: 'Detailed view of all operational and miscellaneous business expenses.',
    icon: Receipt,
    href: '/reports/expenses',
    color: '#ef4444', // Red
  }
];

export default function ReportsLanding() {
  const router = useRouter();

  return (
    <div className="animate-fade-in" style={{ animationDuration: '0.4s' }}>
      <div className="form-header" style={{ alignItems: 'center' }}>
        <button 
          onClick={() => router.push('/accounts')}
          className="btn-ghost-sm" 
          style={{ margin: '0 12px 0 0', width: '36px', height: '36px' }}
          title="Back to Main App"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="form-header-icon" style={{ background: 'var(--c-primary-light)', color: 'var(--c-primary)' }}>
          <LineChart size={24} strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="form-title" style={{ fontSize: '1.5rem', marginBottom: '4px' }}>Reports Dashboard</h1>
          <p className="form-subtitle">Select a report below to view financial, sales, and inventory analytics.</p>
        </div>
      </div>

      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {REPORTS.map((report) => (
          <div 
            key={report.id} 
            className="account-card" 
            style={{ cursor: 'pointer' }}
            onClick={() => router.push(report.href)}
          >
            <div className="card-accent" style={{ background: report.color }} />
            <div className="card-body">
              <div className="card-top">
                <div 
                  className="card-icon-wrap" 
                  style={{ 
                    background: `color-mix(in srgb, ${report.color} 15%, transparent)`, 
                    color: report.color 
                  }}
                >
                  <report.icon size={22} strokeWidth={2.5} />
                </div>
              </div>
              <h3 className="card-title" style={{ fontSize: '1.1rem', marginBottom: '8px' }}>
                {report.title}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--c-text-muted)', lineHeight: '1.4' }}>
                {report.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
