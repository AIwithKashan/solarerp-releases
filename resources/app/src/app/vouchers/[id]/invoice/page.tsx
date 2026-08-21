// Server Component for printing Vouchers and Journal Vouchers.

import { notFound } from 'next/navigation';
import { getVoucherById } from '@/app/vouchers/actions';
import { getJournalVoucherById } from '@/app/vouchers/journal-actions';
import { getSettings } from '@/app/settings/actions';
import { Phone, MapPin, Hash, Building2 } from 'lucide-react';
import type { BusinessSettings } from '@/types/database';
import PrintButtons from './PrintButtons';

function formatPKR(val: number): string {
  return val.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function VoucherInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Fetch settings
  const settingsResult = await getSettings();
  const settings: BusinessSettings = settingsResult.success ? settingsResult.data : {
    id: '',
    business_name: 'AIwithKashan',
    logo_url: null,
    owner_name: 'Ahmad Khan',
    phone: '091-5270101',
    address: 'Main Peshawar Road, Serai Naurang, KP',
    region: 'Serai Naurang',
    email: 'info@marwatechenergy.com',
    ntn_or_tax_id: 'NTN-8729101-4',
    currency: 'PKR',
    receipt_footer_note: 'Thank you for choosing AIwithKashan! Powering a green tomorrow.',
    books_start_date: null,
    updated_at: ''
  };

  // Add the import for BusinessSettings if not present. Wait, it's already in database types, but is it imported?
  // Let's verify imports in vouchers/[id]/invoice/page.tsx first. Wait, let's view imports.

  // Try to fetch as normal Voucher first
  let voucherData: any = null;
  let isJournal = false;

  const normalVoucherRes = await getVoucherById(id);
  if (normalVoucherRes.success && normalVoucherRes.data) {
    voucherData = normalVoucherRes.data;
  } else {
    // Try to fetch as Journal Voucher
    const jvRes = await getJournalVoucherById(id);
    if (jvRes.success && jvRes.data) {
      voucherData = jvRes.data;
      isJournal = true;
    }
  }

  if (!voucherData) {
    notFound();
  }

  return (
    <div className="invoice-page-wrapper animate-fade-in" style={{ padding: '24px', maxWidth: '850px', margin: '0 auto' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: #ffffff !important; color: #000000 !important; font-size: 11pt !important; }
          .invoice-page-wrapper { padding: 0 !important; margin: 0 !important; max-width: 100% !important; }
          .print-card { border: none !important; box-shadow: none !important; padding: 0 !important; }
          .no-print { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}} />

      <PrintButtons />

      <div className="print-card" style={{ background: '#fff', borderRadius: '12px', padding: '40px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', color: '#0f172a', fontFamily: 'Inter, sans-serif' }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #f1f5f9', paddingBottom: '24px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="Logo" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
            ) : (
              <div style={{ width: '80px', height: '80px', background: '#0f172a', color: '#fff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={40} />
              </div>
            )}
            <div>
              <h1 style={{ margin: '0 0 8px 0', fontSize: '2rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>{settings.business_name}</h1>
              {settings.phone && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#475569', marginBottom: '4px' }}><Phone size={14}/> {settings.phone}</div>}
              {settings.address && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#475569' }}><MapPin size={14}/> {settings.address}</div>}
            </div>
          </div>
          
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '2.5rem', fontWeight: 900, color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {isJournal ? 'JOURNAL VOUCHER' : voucherData.voucher_type.toUpperCase()}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', fontSize: '1rem', color: '#334155', fontWeight: 600 }}>
              <Hash size={16} color="#94a3b8" /> {voucherData.voucher_no}
            </div>
            <div style={{ fontSize: '0.95rem', color: '#475569', marginTop: '8px' }}>
              Date: <span style={{ fontWeight: 600, color: '#0f172a' }}>{new Date(voucherData.voucher_date).toLocaleDateString('en-PK')}</span>
            </div>
          </div>
        </div>

        {/* DETAILS SECTION */}
        {!isJournal ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '40px' }}>
              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px 0' }}>Main Account (Cash/Bank)</p>
                <p style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>{voucherData.main_account_name}</p>
              </div>
              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px 0' }}>Party Account</p>
                <p style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>{voucherData.party_account_name}</p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', color: '#fff', padding: '24px', borderRadius: '12px', marginBottom: '40px' }}>
              <div>
                <p style={{ fontSize: '1rem', color: '#94a3b8', margin: '0 0 4px 0' }}>Transfer Amount</p>
                <p style={{ fontSize: '0.9rem', color: '#cbd5e1', margin: 0 }}>{voucherData.direction === 'receipt' ? 'Received Into Main Account' : 'Paid From Main Account'}</p>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800 }}>
                PKR {formatPKR(voucherData.amount)}
              </div>
            </div>
          </>
        ) : (
          <div style={{ marginBottom: '40px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '12px 8px', textAlign: 'left', color: '#475569' }}>Account</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', color: '#475569' }}>Remarks</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right', color: '#475569' }}>Debit</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right', color: '#475569' }}>Credit</th>
                </tr>
              </thead>
              <tbody>
                {voucherData.lines.map((line: any) => (
                  <tr key={line.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 8px', fontWeight: 600 }}>{line.account_name}</td>
                    <td style={{ padding: '12px 8px', color: '#64748b' }}>{line.remarks || '-'}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>{line.debit > 0 ? formatPKR(line.debit) : ''}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>{line.credit > 0 ? formatPKR(line.credit) : ''}</td>
                  </tr>
                ))}
                <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                  <td colSpan={2} style={{ padding: '16px 8px', textAlign: 'right' }}>TOTAL</td>
                  <td style={{ padding: '16px 8px', textAlign: 'right', borderTop: '2px solid #0f172a' }}>{formatPKR(voucherData.lines.reduce((s:number, l:any)=>s+l.debit, 0))}</td>
                  <td style={{ padding: '16px 8px', textAlign: 'right', borderTop: '2px solid #0f172a' }}>{formatPKR(voucherData.lines.reduce((s:number, l:any)=>s+l.credit, 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* NARRATION */}
        {voucherData.remarks && (
          <div style={{ marginBottom: '60px' }}>
            <h4 style={{ fontSize: '1rem', color: '#475569', marginBottom: '8px' }}>Narration / Remarks</h4>
            <p style={{ margin: 0, padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#334155' }}>
              {voucherData.remarks}
            </p>
          </div>
        )}

        {/* SIGNATURES */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginTop: '80px' }}>
          <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '12px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
            Prepared By
          </div>
          <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '12px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
            Authorized Signature
          </div>
        </div>

      </div>
    </div>
  );
}
