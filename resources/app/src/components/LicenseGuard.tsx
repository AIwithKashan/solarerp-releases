'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Grid3X3, Users, Package, ShoppingCart, TrendingUp, Banknote,
  Settings, LineChart, QrCode, Smartphone, Wifi, X, ChevronRight, Menu
} from 'lucide-react';

interface LicenseStatus {
  hwid: string;
  isActivated: boolean;
  isLifetime: boolean;
  isExpired: boolean;
  licenseType: string;
  remainingSeconds: number;
}

export default function LicenseGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [remainingSecs, setRemainingSecs] = useState<number>(0);
  const [showModal, setShowModal] = useState(false);
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [activationMsg, setActivationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activating, setActivating] = useState(false);

  // Mobile ERP integration state
  const [showQrModal, setShowQrModal] = useState(false);
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const [networkUrl, setNetworkUrl] = useState('');
  const [networkIp, setNetworkIp] = useState('');

  // Fetch local server IP
  useEffect(() => {
    fetch('/api/network')
      .then(res => res.json())
      .then(data => {
        setNetworkUrl(data.url);
        setNetworkIp(data.ip);
      })
      .catch(err => console.warn('Failed to resolve network IP', err));
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/license');
      if (res.ok) {
        const json = await res.json();
        // API returns { success: true, status: {...} }
        const data: LicenseStatus = json.status || json;
        setStatus(data);
        setRemainingSecs(data.remainingSeconds);
      }
    } catch (e) {
      console.error('Failed to fetch license status', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (remainingSecs <= 0 || status?.isLifetime) return;
    const timer = setInterval(() => {
      setRemainingSecs((prev) => {
        const next = Math.max(0, prev - 1);
        if (next === 0) {
          // Auto-refresh status to trigger lock screen
          setTimeout(() => fetchStatus(), 500);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [remainingSecs, status?.isLifetime]);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKeyInput.trim()) return;
    setActivating(true);
    setActivationMsg(null);
    try {
      const res = await fetch('/api/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: licenseKeyInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setActivationMsg({ type: 'success', text: data.message });
        setLicenseKeyInput('');
        setTimeout(() => {
          setShowModal(false);
          fetchStatus();
        }, 1500);
      } else {
        setActivationMsg({ type: 'error', text: data.message || 'Invalid license key.' });
      }
    } catch (err) {
      setActivationMsg({ type: 'error', text: 'Error connecting to server.' });
    } finally {
      setActivating(false);
    }
  };

  const formatTime = (totalSecs: number) => {
    if (totalSecs <= 0) return '00 Days : 00 Hours : 00 Mins : 00 Secs';
    const days = Math.floor(totalSecs / (24 * 3600));
    const hours = Math.floor((totalSecs % (24 * 3600)) / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    const dStr = days.toString().padStart(2, '0');
    const hStr = hours.toString().padStart(2, '0');
    const mStr = mins.toString().padStart(2, '0');
    const sStr = secs.toString().padStart(2, '0');
    return `${dStr} Days : ${hStr} Hours : ${mStr} Mins : ${sStr} Secs`;
  };

  if (loading) {
    return <>{children}</>;
  }

  // 1. IF LIFETIME KEY IS ACTIVATED: CLEAR TIMER AND LICENSE INPUT ENTIRELY!
  if (status?.isLifetime) {
    return <>{children}</>;
  }

  // 2. IF EXPIRED AND NOT ACTIVATED: SHOW LOCK SCREEN (MUST ACTIVATE)
  if (status?.isExpired && !status.isActivated) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#0f172a',
        color: '#ffffff',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div style={{
          maxWidth: '520px',
          width: '100%',
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f87171', marginBottom: '8px' }}>
            Evaluation Trial Expired
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
            Your evaluation period has ended. Please enter your valid license key to continue using SolarERP.
          </p>

          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px',
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#38bdf8'
          }}>
            Hardware ID: <strong>{status?.hwid}</strong>
          </div>

          {activationMsg && (
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '13px',
              backgroundColor: activationMsg.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              border: activationMsg.type === 'success' ? '1px solid #22c55e' : '1px solid #ef4444',
              color: activationMsg.type === 'success' ? '#4ade80' : '#f87171',
            }}>
              {activationMsg.text}
            </div>
          )}

          <form onSubmit={handleActivate}>
            <input
              type="text"
              placeholder="KEY-30D-XXXX-XXXX-XXXX"
              value={licenseKeyInput}
              onChange={(e) => setLicenseKeyInput(e.target.value)}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#0f172a',
                border: '1px solid #475569',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '14px',
                textAlign: 'center',
                letterSpacing: '1px',
                marginBottom: '16px',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={activating}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
              {activating ? 'Activating...' : 'Activate Full Version'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 3. TRIAL OR TIME-BOUND LICENSE ACTIVE: SHOW TIMER BANNER WITH PASTE KEY BUTTON
  const isTimeBoundActive = status?.isActivated && !status.isLifetime;

  const MOBILE_NAV_ITEMS = [
    { label: 'Dash', icon: Grid3X3, href: '/' },
    { label: 'Sales', icon: TrendingUp, href: '/sales' },
    { label: 'Products', icon: Package, href: '/products' },
    { label: 'Accounts', icon: Users, href: '/accounts' },
    { label: 'More', icon: Menu, href: '#', isMore: true }
  ];

  const MORE_MENU_ITEMS = [
    { label: 'Purchases', icon: ShoppingCart, href: '/purchases' },
    { label: 'Vouchers', icon: Banknote, href: '/vouchers' },
    { label: 'Reports', icon: LineChart, href: '/reports' },
    { label: 'Settings', icon: Settings, href: '/settings' },
  ];

  const cls = (...args: (string | boolean | undefined | null)[]) => args.filter(Boolean).join(' ');

  return (
    <>
      <div style={{
        backgroundColor: isTimeBoundActive ? '#065f46' : '#1e293b',
        color: '#ffffff',
        borderBottom: '1px solid #334155',
        padding: '10px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '13px',
        fontFamily: 'Inter, system-ui, sans-serif',
        zIndex: 9999
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            backgroundColor: isTimeBoundActive ? '#10b981' : '#f59e0b',
            color: '#000000',
            fontWeight: 'bold',
            padding: '3px 10px',
            borderRadius: '12px',
            fontSize: '11px',
            textTransform: 'uppercase'
          }}>
            {isTimeBoundActive ? `${status?.licenseType} License` : 'Trial Mode'}
          </span>

          <span>
            {isTimeBoundActive ? 'Active Subscription Remaining:' : 'Evaluation Time Remaining:'}{' '}
            <strong style={{ fontFamily: 'monospace', fontSize: '14px', color: '#38bdf8' }}>
              {formatTime(remainingSecs)}
            </strong>
          </span>
        </div>

        <button
          onClick={() => setShowModal(true)}
          style={{
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          🔑 {isTimeBoundActive ? 'Upgrade / Change Key' : 'Paste & Activate Key'}
        </button>
      </div>

      {/* ACTIVATION MODAL DURING TRIAL OR TIME-BOUND LICENSE */}
      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(4px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '28px',
            maxWidth: '480px',
            width: '100%',
            color: '#ffffff',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>🔑 Activate SolarERP License</h3>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px' }}>
              Paste your license key below to activate or extend your SolarERP license immediately.
            </p>

            <div style={{
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '16px',
              fontSize: '12px',
              fontFamily: 'monospace',
              color: '#38bdf8'
            }}>
              Your Hardware ID: <strong>{status?.hwid}</strong>
            </div>

            {activationMsg && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '13px',
                backgroundColor: activationMsg.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                border: activationMsg.type === 'success' ? '1px solid #22c55e' : '1px solid #ef4444',
                color: activationMsg.type === 'success' ? '#4ade80' : '#f87171',
              }}>
                {activationMsg.text}
              </div>
            )}

            <form onSubmit={handleActivate}>
              <input
                type="text"
                placeholder="Paste key here (e.g. KEY-30D-XXXX-XXXX-XXXX)"
                value={licenseKeyInput}
                onChange={(e) => setLicenseKeyInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '13px',
                  textAlign: 'center',
                  marginBottom: '16px',
                  outline: 'none'
                }}
              />

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    backgroundColor: '#334155',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={activating}
                  style={{
                    flex: 1,
                    padding: '10px',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {activating ? 'Activating...' : 'Submit Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main ERP App Content Shell */}
      <div style={{ position: 'relative', minHeight: 'calc(100vh - 40px)', paddingBottom: '70px' }}>
        {children}

        {/* 2. Mobile Bottom Navigation (Visible on Mobile via CSS) */}
        <nav className="mobile-bottom-nav">
          {MOBILE_NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = item.href === '/' ? pathname === '/' : pathname === item.href;
            return (
              <button
                key={item.label}
                onClick={item.isMore ? () => setShowMoreSheet(true) : () => router.push(item.href)}
                className={cls('nav-tab', active && 'active')}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <Icon size={active ? 22 : 20} strokeWidth={active ? 2.5 : 2} />
                <span style={{ fontWeight: active ? 700 : 500 }}>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mobile "More" Menu Sheet Drawer */}
      <AnimatePresence>
        {showMoreSheet && (
          <>
            <motion.div
              className="sheet-overlay open"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMoreSheet(false)}
            />
            <motion.div
              className="sheet-content open"
              style={{ paddingBottom: '20px' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div className="sheet-header">
                <h3 className="sheet-title">Explore ERP Modules</h3>
                <button className="btn-ghost-sm" onClick={() => setShowMoreSheet(false)} style={{ margin: 0 }}>
                  <X size={18} />
                </button>
              </div>
              <div className="sheet-body" style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {MORE_MENU_ITEMS.map(item => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <button
                      key={item.label}
                      onClick={() => { router.push(item.href); setShowMoreSheet(false); }}
                      style={{
                        padding: '16px', borderRadius: '12px', border: '1.5px solid var(--c-border)',
                        background: active ? 'var(--c-primary-light)' : 'var(--c-bg-input)',
                        color: active ? 'var(--c-primary-dark)' : 'var(--c-text)',
                        display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left',
                        cursor: 'pointer', transition: 'var(--transition)'
                      }}
                    >
                      <Icon size={20} strokeWidth={2} />
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Mobile Connection QR Modal */}
      <AnimatePresence>
        {showQrModal && (
          <div style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(6px)', zIndex: 99999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
            fontFamily: 'Inter, system-ui, sans-serif'
          }}>
            <motion.div
              style={{
                backgroundColor: 'var(--c-bg-card)', border: '1px solid var(--c-border)',
                borderRadius: '20px', padding: '32px', maxWidth: '420px', width: '100%',
                boxShadow: 'var(--shadow-lg)', textAlign: 'center', color: 'var(--c-text)'
              }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}>
                  <QrCode size={24} style={{ color: 'var(--c-primary)' }} />
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Connect Mobile Device</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--c-text-muted)' }}>Scan ERP QR Code on LAN/Wi-Fi</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowQrModal(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--c-text-subtle)', fontSize: '20px', cursor: 'pointer', padding: 0 }}
                >
                  <X size={18} />
                </button>
              </div>

              {networkUrl ? (
                <>
                  <div style={{
                    padding: '16px', background: 'var(--c-bg-input)', border: '1px solid var(--c-border)',
                    borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px'
                  }}>
                    {/* Render dynamic QR code via reliable free API */}
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(networkUrl)}`}
                      alt="SolarERP network QR code"
                      style={{ width: '200px', height: '200px', borderRadius: '4px' }}
                    />
                  </div>

                  <div style={{
                    backgroundColor: 'var(--c-bg-input)', border: '1px solid var(--c-border)',
                    borderRadius: '10px', padding: '12px 14px', marginBottom: '20px',
                    fontFamily: 'monospace', fontSize: '13px', color: 'var(--c-text)', display: 'flex', alignItems: 'center', gap: '8px'
                  }}>
                    <Wifi size={14} style={{ color: 'var(--c-primary)' }} />
                    WiFi IP: <strong>{networkIp}:3000</strong>
                  </div>

                  <p style={{ fontSize: '0.85rem', textAlign: 'left', background: 'var(--c-primary-light)', padding: '12px', borderRadius: '10px', border: '1px solid var(--c-primary)', color: 'var(--c-primary-dark)', fontWeight: 500 }}>
                    1. &nbsp;Scan QR with phone camera. <br />
                    2. &nbsp;Open the link: {networkIp}:3000 <br />
                    3. &nbsp;Install as App (iPhone Safari: "Share" → "Add to Home Screen").
                  </p>
                </>
              ) : (
                <div style={{ padding: '40px', color: 'var(--c-text-muted)' }}>Resolving local network information...</div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
