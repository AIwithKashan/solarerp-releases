'use client';

// Client Component: Print/Export toolbar for purchase invoices.
// Hidden when printing using print-hidden utility.

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Printer, ArrowLeft, MessageCircle, X, Send, Phone, User, Users,
  AlertCircle, Copy, CheckCircle2
} from 'lucide-react';
export default function PrintButtons() {
  const [copying, setCopying] = useState(false);
  const [toastMsg, setToastMsg] = useState<{title: string, desc: string, type: 'success' | 'error'} | null>(null);

  const showToast = (title: string, desc: string, type: 'success' | 'error') => {
    setToastMsg({ title, desc, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleCopyImage = async () => {
    setCopying(true);
    try {
      const el = document.querySelector('.print-card') as HTMLElement;
      if (!el) return;
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(el, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            showToast("Copied to Clipboard", "High-Quality Invoice Image copied successfully. You can now paste it anywhere.", "success");
          } catch (err) {
            console.error("Clipboard write failed:", err);
            showToast("Copy Failed", "Failed to copy to clipboard. Your browser might not support this feature.", "error");
          }
        }
        setCopying(false);
      }, 'image/png');
    } catch (err) {
      console.error(err);
      setCopying(false);
    }
  };

  return (
    <>
      {toastMsg && (
        <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 9999, background: toastMsg.type === 'success' ? '#059669' : '#e11d48', color: '#fff', padding: '16px 24px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'flex-start', gap: '12px', animation: 'slideInRight 0.3s ease-out' }}>
          {toastMsg.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
          <div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 700 }}>{toastMsg.title}</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9 }}>{toastMsg.desc}</p>
          </div>
          <button onClick={() => setToastMsg(null)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px', marginLeft: '8px', opacity: 0.7 }}><X size={16} /></button>
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}} />
      <div className="print-toolbar print-hidden" style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', padding: '16px 24px', background: 'var(--c-bg-card)', borderBottom: '1px solid var(--c-border)', marginBottom: '24px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--c-border)' }}>
        <Link href="/purchases" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', fontSize: '0.9rem' }}>
          <ArrowLeft size={16} />
          <span>Back to purchases</span>
        </Link>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleCopyImage}
            disabled={copying}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--c-border)',
              background: 'var(--c-bg-alt)', color: 'var(--c-text)', cursor: copying ? 'wait' : 'pointer',
              fontSize: '0.9rem', fontWeight: 600, transition: 'var(--transition)',
              opacity: copying ? 0.7 : 1,
            }}
          >
            <Copy size={16} />
            <span>{copying ? 'Copying...' : 'Copy Image'}</span>
          </button>
          <button onClick={() => window.print()} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minHeight: '38px', fontSize: '0.9rem' }}>
            <Printer size={16} />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>
    </>
  );
}
