// Server Component — fetches business settings and compiles a premium
// printable invoice receipt slip scoped by the invoice ID.

import { getSettings } from '@/app/settings/actions';
import type { BusinessSettings } from '@/types/database';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Printer, ArrowLeft, Zap, Shield, Award, Calendar, Hash, DollarSign } from 'lucide-react';

interface ReceiptPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: 'Digital Receipt — AIwithKashan',
  description: 'Tax Invoice & Payment Receipt slip.',
};

export default async function ReceiptPage({ params }: ReceiptPageProps) {
  const resolvedParams = await params;
  const invoiceId = resolvedParams.id;
  const result = await getSettings();
  const settings: BusinessSettings = result.success ? result.data : {
    id: '',
    business_name: 'AIwithKashan',
    logo_url: null,
    owner_name: 'Ahmad Khan',
    phone: '091-5270101',
    email: 'info@marwatechenergy.com',
    address: 'Main Peshawar Road, Serai Naurang, KP',
    region: 'Serai Naurang',
    ntn_or_tax_id: 'NTN-8729101-4',
    currency: 'PKR',
    receipt_footer_note: 'Thank you for choosing AIwithKashan! Powering a green tomorrow.',
    books_start_date: null,
    updated_at: ''
  };

  const currencySymbol = settings.currency || 'PKR';

  // Seed some dummy items for the receipt demonstration
  const receiptItems = [
    { name: 'Jinko 580W Tiger Neo N-Type Solar Panel', qty: 10, price: 18500 },
    { name: 'Huawei SUN2000-10KTL three-phase inverter', qty: 1, price: 295000 },
    { name: 'Fast Cables 4mm Single Core Wiring (100m Roll)', qty: 2, price: 14200 },
    { name: 'Phoenix 12V 150Ah Lead Acid Tubular Battery', qty: 4, price: 42000 },
  ];

  const subtotal = receiptItems.reduce((acc, item) => acc + (item.qty * item.price), 0);
  const tax = subtotal * 0.18; // 18% standard GST tax
  const grandTotal = subtotal + tax;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--c-bg)',
      color: 'var(--c-text)',
      padding: '40px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '24px'
    }} className="print:bg-white print:text-black print:p-0 print:m-0">
      
      {/* Navigation Toolbar (Hidden during print) */}
      <div style={{
        width: '100%',
        maxWidth: '800px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 20px',
        background: 'var(--c-bg-card)',
        border: '1px solid var(--c-border)',
        borderRadius: '12px',
        boxShadow: 'var(--shadow-sm)'
      }} className="print:hidden">
        <Link href="/settings" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          color: 'var(--c-text-muted)',
          textDecoration: 'none',
          fontSize: '0.85rem',
          fontWeight: 600
        }}>
          <ArrowLeft size={16} />
          <span>Back to Settings</span>
        </Link>
        <button
          onClick={() => window.print()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--c-primary)',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)'
          }}>
          <Printer size={15} />
          <span>Print Receipt</span>
        </button>
      </div>

      {/* Main Printable Digital Receipt Card */}
      <div style={{
        width: '100%',
        maxWidth: '800px',
        background: 'var(--c-bg-card)',
        border: '1px solid var(--c-border)',
        borderRadius: '16px',
        padding: '48px',
        boxShadow: 'var(--shadow-lg)',
        position: 'relative'
      }} className="print:border-none print:shadow-none print:p-0 print:bg-white print:text-black">
        
        {/* Receipt Header (Brand & Contact Info) */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '2px solid var(--c-border)',
          paddingBottom: '24px',
          marginBottom: '32px'
        }} className="print:border-gray-300">
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {settings.logo_url ? (
                <img src={settings.logo_url} alt="Logo" style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover' }} />
              ) : (
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff'
                }}><Zap size={24} /></div>
              )}
              <h1 style={{ fontSize: '1.4rem', fontWeight: 850, color: 'var(--c-text)', letterSpacing: '-0.5px' }} className="print:text-black">
                {settings.business_name}
              </h1>
            </div>
            {settings.owner_name && (
              <p style={{ fontSize: '0.8rem', color: 'var(--c-text-muted)' }} className="print:text-gray-600">
                Owner: <strong>{settings.owner_name}</strong>
              </p>
            )}
            {settings.ntn_or_tax_id && (
              <p style={{ fontSize: '0.8rem', color: 'var(--c-text-muted)' }} className="print:text-gray-600">
                NTN / Tax ID: <strong>{settings.ntn_or_tax_id}</strong>
              </p>
            )}
          </div>

          <div style={{ textAlign: 'right', fontSize: '0.82rem', color: 'var(--c-text-muted)' }} className="print:text-gray-600">
            {settings.address && <p style={{ fontWeight: 500 }}>{settings.address}</p>}
            {settings.phone && <p style={{ marginTop: '2px' }}>Phone: {settings.phone}</p>}
            {settings.email && <p style={{ marginTop: '2px' }}>Email: {settings.email}</p>}
          </div>
        </div>

        {/* Invoice Metadata */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '24px',
          marginBottom: '32px',
          background: 'var(--c-bg-input)',
          padding: '16px 24px',
          borderRadius: '12px'
        }} className="print:bg-gray-100 print:text-black">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--c-text-subtle)' }} className="print:text-gray-500">
              Billing Invoice
            </span>
            <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>
              Invoice ID: <span style={{ fontFamily: 'monospace' }}>#{invoiceId}</span>
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--c-text-muted)' }} className="print:text-gray-600">
              Tax Category: Sales Tax Standard
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'right' }} className="print:text-right">
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--c-text-subtle)' }} className="print:text-gray-500">
              Date Generated
            </span>
            <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>
              {new Date().toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--c-text-muted)' }} className="print:text-gray-600">
              Status: Paid / Settled
            </span>
          </div>
        </div>

        {/* Billed To */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--c-text-subtle)', marginBottom: '8px' }} className="print:text-gray-500">
            Billed To
          </h3>
          <p style={{ fontSize: '0.95rem', fontWeight: 700 }}>AIwithKashan Client Profile</p>
          <p style={{ fontSize: '0.82rem', color: 'var(--c-text-muted)', marginTop: '2px' }} className="print:text-gray-600">
            Region: {settings.region || 'Serai Naurang, KP'}
          </p>
        </div>

        {/* Items Table */}
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginBottom: '32px',
          fontSize: '0.875rem'
        }} className="print:text-black">
          <thead>
            <tr style={{ borderBottom: '2px solid var(--c-border)' }} className="print:border-gray-300">
              <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 700 }}>Description</th>
              <th style={{ textAlign: 'center', padding: '12px 8px', fontWeight: 700, width: '80px' }}>Qty</th>
              <th style={{ textAlign: 'right', padding: '12px 8px', fontWeight: 700, width: '120px' }}>Unit Price</th>
              <th style={{ textAlign: 'right', padding: '12px 8px', fontWeight: 700, width: '120px' }}>Total Amount</th>
            </tr>
          </thead>
          <tbody>
            {receiptItems.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--c-border)' }} className="print:border-gray-200">
                <td style={{ padding: '14px 8px', fontWeight: 500 }}>{item.name}</td>
                <td style={{ padding: '14px 8px', textAlign: 'center' }}>{item.qty}</td>
                <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                  {currencySymbol} {item.price.toLocaleString()}
                </td>
                <td style={{ padding: '14px 8px', textAlign: 'right', fontWeight: 600 }}>
                  {currencySymbol} {(item.qty * item.price).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary Calculations */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: '40px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '320px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            fontSize: '0.85rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px dashed var(--c-border)' }} className="print:border-gray-300">
              <span style={{ color: 'var(--c-text-muted)' }} className="print:text-gray-600">Subtotal</span>
              <span style={{ fontWeight: 600 }}>{currencySymbol} {subtotal.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px dashed var(--c-border)' }} className="print:border-gray-300">
              <span style={{ color: 'var(--c-text-muted)' }} className="print:text-gray-600">GST (18% Sales Tax)</span>
              <span style={{ fontWeight: 600 }}>{currencySymbol} {tax.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 800, color: 'var(--c-primary)' }} className="print:text-black">
              <span>Grand Total</span>
              <span>{currencySymbol} {grandTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        {settings.receipt_footer_note && (
          <div style={{
            borderTop: '2px solid var(--c-border)',
            paddingTop: '24px',
            textAlign: 'center',
            fontSize: '0.8rem',
            color: 'var(--c-text-muted)',
            fontStyle: 'italic'
          }} className="print:border-gray-300 print:text-gray-600">
            <p>{settings.receipt_footer_note}</p>
            <p style={{ marginTop: '6px', fontSize: '0.72rem', color: 'var(--c-text-subtle)' }} className="print:text-gray-400">
              Generated automatically via AIwithKashan Systems.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
