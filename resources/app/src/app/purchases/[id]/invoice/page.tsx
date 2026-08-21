// Server Component for fetching invoice data on the server in parallel.
// Renders a clean, high-contrast, print-optimized A4 purchase invoice.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPurchaseById } from '@/app/purchases/actions';
import { getSettings } from '@/app/settings/actions';
import type { Purchase, BusinessSettings } from '@/types/database';
import { Printer, ArrowLeft, Hash, Calendar, Building2, Phone, MapPin, Tag, Layers, CreditCard, FileText } from 'lucide-react';

// Tiny inline Client Component for the printing actions toolbar (print:hidden)
import PrintButtons from './PrintButtons';

function formatPKR(val: number): string {
  return val.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Parallel data fetching on the server
  const [purchaseResult, settingsResult] = await Promise.all([
    getPurchaseById(id),
    getSettings()
  ]);

  if (!purchaseResult.success) {
    notFound();
  }

  const purchase: Purchase = purchaseResult.data;
  const settings: BusinessSettings = settingsResult.success ? settingsResult.data : {
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

  // Fetch optional supplier contact details if supplier_id is linked
  let supplierContact = null;
  let supplierAddress = null;
  
  if (purchase.supplier_id) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from('accounts')
        .select('contact_number, region')
        .eq('id', purchase.supplier_id)
        .single();
      if (data) {
        supplierContact = data.contact_number;
        supplierAddress = data.region;
      }
    } catch (e) {
      console.error('Failed to fetch supplier details for invoice', e);
    }
  }

  // Format purchase date
  const purchaseDate = new Date(purchase.purchase_date).toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="invoice-page-wrapper animate-fade-in" style={{ padding: '24px', maxWidth: '850px', margin: '0 auto' }}>
      {/* Print styles override */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 11pt !important;
          }
          .invoice-page-wrapper {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          .print-card {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          .print-header-bg {
            background: transparent !important;
            border-bottom: 2px solid #000000 !important;
            padding-bottom: 12px !important;
          }
          .print-badge {
            border: 1px solid #000000 !important;
            color: #000000 !important;
            background: transparent !important;
          }
          .print-table th {
            background: #f3f4f6 !important;
            color: #000000 !important;
            border-bottom: 2px solid #e5e7eb !important;
          }
          .print-table td {
            border-bottom: 1px solid #e5e7eb !important;
            color: #000000 !important;
          }
        }
      `}} />

      {/* Toolbar controls (hidden on print) */}
      <PrintButtons />

      {/* Main Invoice Card (matches glassmorphism, collapses to high-contrast print) */}
      <div className="account-table-wrap print-card" style={{ padding: '40px', background: 'var(--c-bg-card)', border: '1px solid var(--c-border)', borderRadius: '12px', boxShadow: 'var(--shadow-md)' }}>
        
        {/* Invoice Header Block */}
        <div className="print-header-bg" style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', borderBottom: '1px solid var(--c-border)', paddingBottom: '24px', marginBottom: '32px', flexWrap: 'wrap' }}>
          
          {/* Left Block: Business Identity Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Conditional logo rendering to avoid empty spaces */}
            {settings.logo_url && (
              <img 
                src={settings.logo_url} 
                alt="Business Logo" 
                style={{ width: '60px', height: '60px', borderRadius: '10px', objectFit: 'cover', marginBottom: '8px' }} 
              />
            )}
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--c-text)', margin: 0 }}>
              {settings.business_name}
            </h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--c-text-muted)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {settings.address && <span>{settings.address}</span>}
              {settings.region && <span>{settings.region}</span>}
              {(settings.phone || settings.email) && (
                <span>
                  {settings.phone && `Phone: ${settings.phone}`}
                  {settings.phone && settings.email && ' | '}
                  {settings.email && `Email: ${settings.email}`}
                </span>
              )}
              {settings.owner_name && <span>Owner: {settings.owner_name}</span>}
              {settings.ntn_or_tax_id && <span style={{ fontWeight: 600 }}>NTN: {settings.ntn_or_tax_id}</span>}
            </div>
          </div>

          {/* Right Block: Invoice Meta Info */}
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '180px' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--c-primary)', margin: 0, letterSpacing: '-0.5px' }}>
              PURCHASE INVOICE
            </h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.9rem', color: 'var(--c-text)' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <span style={{ color: 'var(--c-text-muted)' }}>Invoice No:</span>
                <strong style={{ color: 'var(--c-primary-dark)' }}>{purchase.invoice_no}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <span style={{ color: 'var(--c-text-muted)' }}>Date:</span>
                <span>{purchaseDate}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <span style={{ color: 'var(--c-text-muted)' }}>Status:</span>
                <span style={{ 
                  fontWeight: 700, 
                  textTransform: 'uppercase', 
                  color: purchase.paymentStatus === 'paid' ? '#10b981' : purchase.paymentStatus === 'partial' ? '#f59e0b' : '#ef4444' 
                }}>
                  {purchase.paymentStatus || 'UNPAID'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Info Rows (Supplier details) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          <div style={{ background: 'var(--c-bg-alt)', padding: '16px 20px', borderRadius: '8px', border: '1px solid var(--c-border)' }}>
            <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--c-text-muted)', margin: '0 0 8px 0', fontWeight: 700 }}>
              Supplier Account
            </h3>
            <p style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--c-text)', margin: '0 0 4px 0' }}>
              {purchase.supplier_name}
            </p>
            <div style={{ fontSize: '0.85rem', color: 'var(--c-text-muted)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {supplierContact && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={12} /> {supplierContact}
                </span>
              )}
              {supplierAddress && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={12} /> {supplierAddress}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Invoice Items Table */}
        <div className="table-scroll" style={{ marginBottom: '24px' }}>
          <table className="data-table print-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '60px' }}>#</th>
                <th>Item Description</th>
                <th style={{ width: '120px' }}>Unit</th>
                <th style={{ width: '100px', textAlign: 'right' }}>Qty</th>
                <th style={{ width: '140px', textAlign: 'right' }}>Rate ({settings.currency})</th>
                <th style={{ width: '160px', textAlign: 'right' }}>Amount ({settings.currency})</th>
              </tr>
            </thead>
            <tbody>
              <tr className="data-row">
                <td className="td-num">1</td>
                <td style={{ fontWeight: 600 }}>
                  {purchase.item_name}
                  {purchase.power_watt && (
                    <span className="power-badge print-badge" style={{ marginLeft: '8px', fontSize: '0.7rem', padding: '1px 5px', background: 'var(--c-primary-light)', color: 'var(--c-primary-dark)', borderRadius: '4px', fontWeight: 600 }}>
                      {purchase.power_watt}W
                    </span>
                  )}
                </td>
                <td>
                  <span className="area-tag" style={{ color: 'var(--c-text)' }}>{purchase.accounting_unit}</span>
                </td>
                <td style={{ textAlign: 'right', fontWeight: 500 }}>{purchase.quantity}</td>
                <td style={{ textAlign: 'right' }}>
                  {formatPKR(purchase.rate)}
                  {purchase.power_watt && ['watt', 'kw'].includes(purchase.accounting_unit.toLowerCase()) && <span style={{ fontSize: '0.75rem', color: 'var(--c-text-subtle)' }}> /W</span>}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--c-primary)' }}>
                  {formatPKR(purchase.amount)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--c-border)', paddingTop: '20px', marginBottom: '40px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 180px', gap: '8px', fontSize: '0.95rem' }}>
            <div style={{ color: 'var(--c-text-muted)', fontWeight: 600 }}>Subtotal:</div>
            <div style={{ textAlign: 'right', color: 'var(--c-text)' }}>{formatPKR(purchase.amount)}</div>
            
            <div style={{ color: 'var(--c-text-muted)', fontWeight: 600, borderBottom: '1px solid var(--c-border)', paddingBottom: '8px' }}>Tax / Duty:</div>
            <div style={{ textAlign: 'right', color: 'var(--c-text)', borderBottom: '1px solid var(--c-border)', paddingBottom: '8px' }}>{formatPKR(0)}</div>
            
            <div style={{ color: 'var(--c-primary)', fontWeight: 800, fontSize: '1.2rem', paddingTop: '8px' }}>Grand Total:</div>
            <div style={{ textAlign: 'right', color: 'var(--c-primary)', fontWeight: 900, fontSize: '1.2rem', paddingTop: '8px' }}>
              {settings.currency} {formatPKR(purchase.amount)}
            </div>

            <div style={{ color: 'var(--c-text-muted)', fontWeight: 600, paddingTop: '12px' }}>Amount Paid:</div>
            <div style={{ textAlign: 'right', color: 'var(--c-success)', fontWeight: 700, paddingTop: '12px' }}>
              {settings.currency} {formatPKR(purchase.paidAmount || 0)}
            </div>
            
            <div style={{ color: 'var(--c-text-muted)', fontWeight: 600, paddingTop: '12px', borderTop: '2px solid var(--c-border)' }}>Remaining Due:</div>
            <div style={{ textAlign: 'right', color: 'var(--c-danger)', fontWeight: 900, fontSize: '1.2rem', paddingTop: '12px', borderTop: '2px solid var(--c-border)' }}>
              {settings.currency} {formatPKR(purchase.remainingAmount || (purchase.amount - (purchase.paidAmount || 0)))}
            </div>
          </div>
        </div>

        {/* Remarks Section */}
        {purchase.remarks && (
          <div style={{ borderTop: '1px solid var(--c-border)', paddingTop: '20px', marginBottom: '32px' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--c-text-muted)', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Remarks / Comments
            </h4>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--c-text)', lineHeight: 1.5 }}>
              {purchase.remarks}
            </p>
          </div>
        )}

        {/* Invoice Footer note */}
        {settings.receipt_footer_note && (
          <div style={{ borderTop: '1px solid var(--c-border)', paddingTop: '20px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--c-text-subtle)', fontStyle: 'italic' }}>
            {settings.receipt_footer_note}
          </div>
        )}

      </div>
    </div>
  );
}
