'use client';

/* ═══════════════════════════════════════════════════════════════
   MobileShell — app-native bottom tab bar + "More" bottom sheet.

   Mounted once globally from src/app/layout.tsx so navigation is
   available on phones in *every* license state. (It previously lived
   inside LicenseGuard, which meant activated/lifetime installs
   rendered no mobile navigation at all.)

   Purely presentational: it holds no business state and touches no
   server actions. Hidden at >= 769px via CSS.
   ═══════════════════════════════════════════════════════════════ */

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Grid3X3, Users, ShoppingCart, TrendingUp, Package,
  Banknote, Settings, LineChart, Menu, X,
} from 'lucide-react';

const TABS = [
  { label: 'Home', icon: Grid3X3, href: '/' },
  { label: 'Sales', icon: TrendingUp, href: '/sales' },
  { label: 'Buy', icon: ShoppingCart, href: '/purchases' },
  { label: 'Parties', icon: Users, href: '/accounts' },
] as const;

const MORE_ITEMS = [
  { label: 'Products', icon: Package, href: '/products', hint: 'Stock & catalogue' },
  { label: 'Vouchers', icon: Banknote, href: '/vouchers', hint: 'Receipts & payments' },
  { label: 'Reports', icon: LineChart, href: '/reports', hint: 'Ledgers & analysis' },
  { label: 'Settings', icon: Settings, href: '/settings', hint: 'Business identity' },
] as const;

/* Routes that must stay chrome-free (printable documents). */
function isDocumentRoute(pathname: string): boolean {
  return /\/invoice\/?$/.test(pathname) || pathname.startsWith('/receipts');
}

export default function MobileShell() {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  // Close the sheet whenever the route changes.
  useEffect(() => { setMoreOpen(false); }, [pathname]);

  // Lock background scroll while the sheet is up, and support Escape.
  useEffect(() => {
    if (!moreOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMoreOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [moreOpen]);

  if (isDocumentRoute(pathname)) return null;

  const moreActive = MORE_ITEMS.some(i => pathname.startsWith(i.href));

  const go = (href: string) => {
    setMoreOpen(false);
    router.push(href);
  };

  return (
    <>
      <nav className="mobile-bottom-nav" aria-label="Primary">
        {TABS.map(({ label, icon: Icon, href }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <button
              key={href}
              type="button"
              onClick={() => go(href)}
              className={`nav-tab${active ? ' active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <span className="nav-tab-icon"><Icon size={21} strokeWidth={active ? 2.4 : 1.9} /></span>
              <span className="nav-tab-label">{label}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setMoreOpen(v => !v)}
          className={`nav-tab${moreOpen || moreActive ? ' active' : ''}`}
          aria-expanded={moreOpen}
          aria-label="More modules"
        >
          <span className="nav-tab-icon">
            {moreOpen ? <X size={21} strokeWidth={2.4} /> : <Menu size={21} strokeWidth={moreActive ? 2.4 : 1.9} />}
          </span>
          <span className="nav-tab-label">More</span>
        </button>
      </nav>

      <div
        className={`ms-sheet-scrim${moreOpen ? ' open' : ''}`}
        onClick={() => setMoreOpen(false)}
        aria-hidden="true"
      />

      <div
        className={`ms-sheet${moreOpen ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="More modules"
      >
        <button
          type="button"
          className="ms-sheet-grip"
          onClick={() => setMoreOpen(false)}
          aria-label="Close"
        />
        <p className="ms-sheet-title">All Modules</p>
        <div className="ms-sheet-grid">
          {MORE_ITEMS.map(({ label, icon: Icon, href, hint }) => {
            const active = pathname.startsWith(href);
            return (
              <button
                key={href}
                type="button"
                onClick={() => go(href)}
                className={`ms-sheet-item${active ? ' active' : ''}`}
              >
                <span className="ms-sheet-item-icon"><Icon size={20} /></span>
                <span className="ms-sheet-item-label">{label}</span>
                <span className="ms-sheet-item-hint">{hint}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
