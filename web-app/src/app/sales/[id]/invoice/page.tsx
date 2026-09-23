// Server Component for fetching sales invoice data on the server in parallel.
// Renders a clean, high-contrast, print-optimized A4 sales invoice.

import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSaleById } from '@/app/sales/actions';
import { getSettings } from '@/app/settings/actions';
import type { SaleWithRelations, BusinessSettings } from '@/types/database';
import { Phone, MapPin, Hash, Printer, ArrowLeft, CreditCard, FileText } from 'lucide-react';

import PrintButtons from './PrintButtons';

function formatPKR(val: number): string {
  return val.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDatePK(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

export default async function SalesInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Parallel server-side data fetching
  const [saleResult, settingsResult] = await Promise.all([
    getSaleById(id),
    getSettings()
  ]);

  if (!saleResult.success || !saleResult.data) {
    console.error('InvoicePage 404 trigger:', saleResult);
    notFound();
  }

  const sale: SaleWithRelations = saleResult.data;
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

  // Resolve customer contact details
  let customerContact = sale.customer_phone;
  let customerAddress = sale.customer_area;

  if (sale.customer_id && (!customerContact || !customerAddress)) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from('accounts')
        .select('contact_number, region')
        .eq('id', sale.customer_id)
        .single();
      if (data) {
        if (!customerContact) customerContact = data.contact_number;
        if (!customerAddress) customerAddress = data.region;
      }
    } catch (e) {
      console.error('Failed to fetch customer contact details', e);
    }
  }

  const saleDate = new Date(sale.sale_date).toLocaleDateString('en-PK', {
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

      {/* Action buttons toolbar (hidden during printing) */}
      <PrintButtons />

      {/* Main A4 Sales Invoice Card */}
      <div className="account-table-wrap print-card" style={{ padding: '40px', background: 'var(--c-bg-card)', border: '1px solid var(--c-border)', borderRadius: '12px', boxShadow: 'var(--shadow-md)' }}>
        
        {/* Invoice Header */}
        <div className="print-header-bg" style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', borderBottom: '1px solid var(--c-border)', paddingBottom: '24px', marginBottom: '32px', flexWrap: 'wrap' }}>
          
          {/* Left Block: Company branding */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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

          {/* Right Block: Order details */}
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '180px' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--c-primary)', margin: 0, letterSpacing: '-0.5px' }}>
              SALES INVOICE
            </h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.9rem', color: 'var(--c-text)' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <span style={{ color: 'var(--c-text-muted)' }}>Invoice No:</span>
                <strong style={{ color: 'var(--c-primary-dark)' }}>{sale.invoice_no}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <span style={{ color: 'var(--c-text-muted)' }}>Sale Date:</span>
                <span>{saleDate}</span>
              </div>
              {sale.reference && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <span style={{ color: 'var(--c-text-muted)' }}>Reference:</span>
                  <span style={{ fontWeight: 600 }}>{sale.reference}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          <div style={{ background: 'var(--c-bg-alt)', padding: '16px 20px', borderRadius: '8px', border: '1px solid var(--c-border)' }}>
            <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--c-text-muted)', margin: '0 0 8px 0', fontWeight: 700 }}>
              Billed To Customer
            </h3>
            <p style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--c-text)', margin: '0 0 4px 0' }}>
              {sale.customer_name}
            </p>
            <div style={{ fontSize: '0.85rem', color: 'var(--c-text-muted)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {customerContact && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={12} /> {customerContact}
                </span>
              )}
              {customerAddress && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={12} /> {customerAddress}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Standard Sale items Table */}
        {sale.sale_items && sale.sale_items.length > 0 && (
          <div className="table-scroll" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--c-text)', fontWeight: 700, marginBottom: '10px' }}>Inventory Items</h3>
            <table className="data-table print-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>#</th>
                  <th>Item Description</th>
                  <th style={{ width: '100px' }}>Unit</th>
                  <th style={{ width: '90px', textAlign: 'right' }}>Qty</th>
                  <th style={{ width: '130px', textAlign: 'right' }}>Rate ({settings.currency})</th>
                  <th style={{ width: '150px', textAlign: 'right' }}>Amount ({settings.currency})</th>
                </tr>
              </thead>
              <tbody>
                {sale.sale_items.map((it, idx) => (
                  <tr key={it.id} className="data-row">
                    <td className="td-num">{idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>
                      {it.item_name}
                      {it.power_watt && (
                        <span className="power-badge print-badge" style={{ marginLeft: '8px', fontSize: '0.7rem', padding: '1px 5px', background: 'var(--c-primary-light)', color: 'var(--c-primary-dark)', borderRadius: '4px', fontWeight: 600 }}>
                          {it.power_watt}W
                        </span>
                      )}
                    </td>
                    <td>{it.accounting_unit}</td>
                    <td style={{ textAlign: 'right', fontWeight: 500 }}>{it.quantity}</td>
                    <td style={{ textAlign: 'right' }}>
                      {formatPKR(it.rate)}
                      {it.power_watt && ['watt', 'kw'].includes(it.accounting_unit.toLowerCase()) && <span style={{ fontSize: '0.75rem', color: 'var(--c-text-subtle)' }}> /W</span>}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--c-primary)' }}>
                      {formatPKR(it.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Other Credit items Table (Sold but bypass stock checks) */}
        {sale.sale_other_credits && sale.sale_other_credits.length > 0 && (
          <div className="table-scroll" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--c-text)', fontWeight: 700, marginBottom: '10px' }}>Custom Credit Items</h3>
            <table className="data-table print-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>#</th>
                  <th>Item Description</th>
                  <th style={{ width: '90px', textAlign: 'right' }}>Qty</th>
                  <th style={{ width: '130px', textAlign: 'right' }}>Rate ({settings.currency})</th>
                  <th style={{ width: '150px', textAlign: 'right' }}>Amount ({settings.currency})</th>
                  <th>Remarks / Status</th>
                </tr>
              </thead>
              <tbody>
                {sale.sale_other_credits.map((c, idx) => (
                  <tr key={c.id} className="data-row">
                    <td className="td-num">{idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>
                      {c.item_name}
                      <span className="power-badge" style={{ marginLeft: '8px', fontSize: '0.65rem', background: '#fef2f2', color: '#ef4444', padding: '1px 5px', borderRadius: '4px' }}>
                        Credit Entry
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 500 }}>{c.quantity}</td>
                    <td style={{ textAlign: 'right' }}>{formatPKR(c.rate)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--c-primary)' }}>
                      {formatPKR(c.amount)}
                    </td>
                    <td style={{ color: 'var(--c-text-muted)', fontSize: '0.85rem' }}>{c.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary Details & Balance Breakdown */}
        <div className="inv-summary" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '20px', borderTop: '1px solid var(--c-border)', paddingTop: '20px', marginBottom: '32px' }}>
          
          {/* Payment Receipts Logged */}
          <div style={{ flex: '1 1 300px' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--c-text-muted)', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
              Payment History
            </h4>
            {((sale.sale_payments && sale.sale_payments.length > 0) || (sale.voucher_allocations && sale.voucher_allocations.length > 0)) ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {sale.sale_payments?.map(p => (
                  <div key={p.id} style={{ fontSize: '0.85rem', color: 'var(--c-text)', display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--c-border)', paddingBottom: '4px' }}>
                    <span>{p.payment_account_name} ({formatDatePK(p.pay_date)}):</span>
                    <strong style={{ color: 'var(--c-primary)' }}>PKR {formatPKR(p.amount)}</strong>
                  </div>
                ))}
                {sale.voucher_allocations?.map((alloc: any) => (
                  <div key={alloc.id} style={{ fontSize: '0.85rem', color: 'var(--c-text)', display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--c-border)', paddingBottom: '4px' }}>
                    <span>Voucher ({alloc.voucher?.voucher_no || 'Receipt'}):</span>
                    <strong style={{ color: 'var(--c-primary)' }}>PKR {formatPKR(alloc.allocatedAmount)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--c-text-subtle)', fontStyle: 'italic' }}>
                No payment payments recorded. Billed entirely on credit.
              </p>
            )}
          </div>

          {/* Ledger calculations */}
          <div className="inv-ledger" style={{ display: 'grid', gridTemplateColumns: '140px 160px', gap: '8px', fontSize: '0.95rem', minWidth: '300px' }}>
            <div style={{ color: 'var(--c-text-muted)', fontWeight: 600 }}>Items Subtotal:</div>
            <div style={{ textAlign: 'right', color: 'var(--c-text)' }}>PKR {formatPKR(sale.subtotal)}</div>
            
            {sale.sale_other_credits && sale.sale_other_credits.length > 0 && (
              <>
                <div style={{ color: 'var(--c-text-muted)', fontWeight: 600 }}>Custom Charges:</div>
                <div style={{ textAlign: 'right', color: 'var(--c-text)' }}>
                  PKR {formatPKR(sale.sale_other_credits.reduce((sum, c) => sum + (Number(c.amount) || 0), 0))}
                </div>
              </>
            )}
            
            <div style={{ color: 'var(--c-text-muted)', fontWeight: 600 }}>Discount ({sale.discount_percent}%):</div>
            <div style={{ textAlign: 'right', color: '#ef4444' }}>- PKR {formatPKR(sale.discount_amount)}</div>
            
            <div style={{ color: 'var(--c-text-muted)', fontWeight: 600, borderTop: '1px solid var(--c-border)', paddingTop: '8px' }}>Net Total:</div>
            <div style={{ textAlign: 'right', color: 'var(--c-text)', fontWeight: 700, borderTop: '1px solid var(--c-border)', paddingTop: '8px' }}>PKR {formatPKR(sale.net_total)}</div>
            
            <div style={{ color: 'var(--c-primary)', fontWeight: 600 }}>Received:</div>
            <div style={{ textAlign: 'right', color: 'var(--c-primary)', fontWeight: 700 }}>PKR {formatPKR(sale.total_received)}</div>
            
            <div style={{ color: sale.remaining_balance === 0 ? 'var(--c-primary)' : '#ef4444', fontWeight: 800, fontSize: '1.1rem', borderTop: '1px double var(--c-border)', paddingTop: '8px' }}>
              Balance Due:
            </div>
            <div style={{ textAlign: 'right', color: sale.remaining_balance === 0 ? 'var(--c-primary)' : '#ef4444', fontWeight: 900, fontSize: '1.1rem', borderTop: '1px double var(--c-border)', paddingTop: '8px' }}>
              PKR {formatPKR(sale.remaining_balance)}
            </div>
          </div>

        </div>

        {/* Remarks Section */}
        {sale.remarks && (
          <div style={{ borderTop: '1px solid var(--c-border)', paddingTop: '20px', marginBottom: '32px' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--c-text-muted)', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Sale Remarks / Reference
            </h4>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--c-text)', lineHeight: 1.5 }}>
              {sale.remarks}
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
