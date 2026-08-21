import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Fonts
JAMEEL_FONT_PATH = "C:\\Windows\\Fonts\\Jameel Noori Nastaleeq.ttf"
ARIAL_FONT_PATH = "C:\\Windows\\Fonts\\arial.ttf"
ARIAL_BOLD_PATH = "C:\\Windows\\Fonts\\arialbd.ttf"

if os.path.exists(JAMEEL_FONT_PATH):
    pdfmetrics.registerFont(TTFont('JameelNastaleeq', JAMEEL_FONT_PATH))
if os.path.exists(ARIAL_FONT_PATH):
    pdfmetrics.registerFont(TTFont('Arial', ARIAL_FONT_PATH))
if os.path.exists(ARIAL_BOLD_PATH):
    pdfmetrics.registerFont(TTFont('Arial-Bold', ARIAL_BOLD_PATH))

import arabic_reshaper
from bidi.algorithm import get_display

def reshape_urdu(text):
    if not text:
        return ""
    reshaped = arabic_reshaper.reshape(text)
    return get_display(reshaped)

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        if self._pageNumber > 1:
            self.setStrokeColor(colors.HexColor('#cbd5e1'))
            self.setLineWidth(0.8)
            self.line(40, 755, 572, 755)
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(colors.HexColor('#059669'))
            self.drawString(40, 762, "SolarERP Enterprise - Zero-Training Operational Manual")
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor('#64748b'))
            self.drawRightString(572, 762, "Developer: AIwithKashan (0334-1911680)")

            self.line(40, 45, 572, 45)
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor('#64748b'))
            self.drawString(40, 32, "SolarERP Enterprise Edition — Confidential & Proprietary")
            self.drawRightString(572, 32, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()


class UrduNumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(UrduNumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(UrduNumberedCanvas, self).showPage()
        super(UrduNumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        if self._pageNumber > 1:
            self.setStrokeColor(colors.HexColor('#cbd5e1'))
            self.setLineWidth(0.8)
            self.line(40, 755, 572, 755)
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(colors.HexColor('#059669'))
            self.drawString(40, 762, "SolarERP Enterprise — مکمل یوزر مینوئل")
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor('#64748b'))
            self.drawRightString(572, 762, "AIwithKashan | ہیلپ لائن: 0334-1911680")

            self.line(40, 45, 572, 45)
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor('#64748b'))
            self.drawString(40, 32, "سولر ای آر پی انٹرپرائز ایڈیشن — جملہ حقوق محفوظ ہیں")
            self.drawRightString(572, 32, f"صفحہ {self._pageNumber} از {page_count}")
        self.restoreState()


def create_callout(text, title="IMPORTANT NOTICE", border_color='#10b981', bg_color='#f0fdf4'):
    styles = getSampleStyleSheet()
    p_title = Paragraph(f"<b>{title}</b>", ParagraphStyle('CTitle', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9.5, textColor=colors.HexColor(border_color)))
    p_body = Paragraph(text, ParagraphStyle('CBody', parent=styles['Normal'], fontName='Helvetica', fontSize=8.5, leading=12.5, textColor=colors.HexColor('#1e293b')))
    tbl = Table([[p_title], [p_body]], colWidths=[532])
    tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor(bg_color)),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor(border_color)),
        ('PADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,0), 2),
    ]))
    return tbl

def create_step_box(step_num, title, instructions, example=None):
    styles = getSampleStyleSheet()
    header_html = f"<b><font color='#059669'>STEP {step_num}:</font> {title}</b>"
    p_hdr = Paragraph(header_html, ParagraphStyle('SHdr', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10.5, leading=13.5, textColor=colors.HexColor('#0f172a')))
    
    body_text = f"{instructions}"
    if example:
        body_text += f"<br/><br/><b><font color='#0284c7'>Real Solar Shop Scenario:</font></b><br/>{example}"
    
    p_body = Paragraph(body_text, ParagraphStyle('SBody', parent=styles['Normal'], fontName='Helvetica', fontSize=8.5, leading=12.5, textColor=colors.HexColor('#334155')))
    
    tbl = Table([[p_hdr], [p_body]], colWidths=[532])
    tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#ffffff')),
        ('BOX', (0,0), (-1,-1), 0.8, colors.HexColor('#cbd5e1')),
        ('LINEBELOW', (0,0), (-1,0), 0.6, colors.HexColor('#e2e8f0')),
        ('PADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,0), 6),
        ('BOTTOMPADDING', (0,0), (-1,0), 4),
    ]))
    return tbl


# ==============================================================================
# 1. ENGLISH MANUAL GENERATION
# ==============================================================================
def build_english_manual(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=50,
        bottomMargin=55
    )
    styles = getSampleStyleSheet()
    story = []

    # Title & Header
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#0f172a'),
        alignment=TA_CENTER
    )
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#059669'),
        alignment=TA_CENTER
    )

    story.append(Spacer(1, 10))
    story.append(Paragraph("SolarERP Enterprise Edition", title_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph("Zero-Training Complete Operational Manual for Solar Businesses", subtitle_style))
    story.append(Spacer(1, 12))

    # Meta Table
    meta_data = [
        [
            Paragraph("<b>Target Audience:</b> Solar Shop Owners, Accountants & Sales Staff", ParagraphStyle('M1', fontName='Helvetica', fontSize=8, textColor=colors.HexColor('#475569'))),
            Paragraph("<b>Software Version:</b> v2.0.1 (Production Standalone)", ParagraphStyle('M2', fontName='Helvetica', fontSize=8, textColor=colors.HexColor('#475569'))),
            Paragraph("<b>Support Helpline:</b> 0334-1911680", ParagraphStyle('M3', fontName='Helvetica', fontSize=8, textColor=colors.HexColor('#059669')))
        ]
    ]
    meta_tbl = Table(meta_data, colWidths=[200, 180, 152])
    meta_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#e2e8f0')),
        ('PADDING', (0,0), (-1,-1), 6),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ]))
    story.append(meta_tbl)
    story.append(Spacer(1, 14))

    # SECTION 1: SYSTEM SETUP & OPENING BALANCES
    sec_hdr = ParagraphStyle('SecHdr', fontName='Helvetica-Bold', fontSize=14, leading=18, textColor=colors.HexColor('#0f172a'))
    story.append(Paragraph("1. Initial Shop Setup & Opening Balances (Day 1)", sec_hdr))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#059669'), spaceBefore=4, spaceAfter=8))

    story.append(create_step_box(
        "1.1",
        "Set Opening Cash in Hand & Bank Balances",
        "Go to <b>Accounts</b> &rarr; Click <b>Add New Account</b> (or go to <b>Opening Balances</b> on sidebar).<br/>"
        "1. <b>Cash Account:</b> Enter your current physical drawer cash (e.g., PKR 500,000).<br/>"
        "2. <b>Bank Account:</b> Enter your bank account title (e.g. <i>Meezan Bank Shop Account</i>) and current bank balance (e.g., PKR 1,200,000).",
        "Your shop starts with PKR 500,000 cash in drawer and PKR 1,200,000 in bank. SolarERP records this as opening equity so every rupee is tracked."
    ))
    story.append(Spacer(1, 8))

    story.append(create_step_box(
        "1.2",
        "Enter Previous Customer Khata (Receivables)",
        "Go to <b>Accounts</b> &rarr; Click <b>Add Account</b> &rarr; Select Account Type: <b>Customer</b>.<br/>"
        "Enter Customer Name (e.g., <i>Haji Rehman Solar Tube Well</i>), Phone, and their <b>Previous Udhaar (Opening Balance)</b> (e.g., PKR 350,000).",
        "Haji Rehman previously owes you PKR 350,000. When he makes payments or new purchases, SolarERP maintains a single running ledger."
    ))
    story.append(Spacer(1, 14))

    # SECTION 2: PRODUCTS & INVENTORY
    story.append(Paragraph("2. Adding Products & Solar Inventory", sec_hdr))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#059669'), spaceBefore=4, spaceAfter=8))

    story.append(create_step_box(
        "2.1",
        "Adding Solar Panels with Wattage Calculation",
        "Go to <b>Inventory / Products</b> &rarr; Click <b>+ Add Product</b> button.<br/>"
        "1. Product Name: <i>Longi 585W Hi-MO X6 N-Type</i><br/>"
        "2. Category: <i>Solar Panel</i> | Unit: <i>Watt / Panel</i> | Wattage: <b>585</b><br/>"
        "3. Purchase Rate (per watt): <b>PKR 45.00</b> | Sale Rate (per watt): <b>PKR 47.50</b><br/>"
        "4. Opening Quantity: <b>100 Panels</b> (Total Watts: 58,500W). Click <b>Save Product</b>.",
        "SolarERP automatically calculates the total panel value (100 panels &times; 585W &times; Rs 45 = PKR 2,632,500 stock value)."
    ))
    story.append(Spacer(1, 8))

    story.append(create_step_box(
        "2.2",
        "Adding Inverters, Batteries & DC Cables",
        "1. Inverters: Enter Model (e.g., <i>Inverex Nitrox 10kW On-Grid/Hybrid</i>), Warranty (e.g., 5 Years), Cost: PKR 380,000, Sell: PKR 410,000.<br/>"
        "2. Cables: Enter <i>4mm / 6mm Pakistan Cables DC Wire</i> with Unit as <i>Meter / Coil</i>.<br/>"
        "3. Set Low Stock Warning: Enter <i>5</i> so you get an automatic alert when stock is running low.",
        "The system tracks serial numbers, model warranties, and meters of cable automatically."
    ))
    story.append(Spacer(1, 14))

    # SECTION 3: SALES & POS INVOICING
    story.append(Paragraph("3. Sales Billing & POS Invoicing (Step-by-Step)", sec_hdr))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#059669'), spaceBefore=4, spaceAfter=8))

    story.append(create_step_box(
        "3.1",
        "Creating a Customer Sale Invoice",
        "1. Click <b>Sales</b> on the left sidebar &rarr; Click <b>+ New Sale</b>.<br/>"
        "2. <b>Select Customer:</b> Search customer name (e.g., <i>Malik Tariq</i>) or click <i>+ Quick Add Customer</i>.<br/>"
        "3. <b>Add Items:</b> Select <i>Longi 585W</i> &rarr; Enter Qty: <b>20 Panels</b> (11,700 Watts). Rate: <b>PKR 47.50/W</b> = PKR 555,750.<br/>"
        "4. <b>Add Inverter:</b> Select <i>Knox 6kW Hybrid</i> &rarr; Qty: <b>1</b> &rarr; PKR 195,000.<br/>"
        "5. <b>Total Bill:</b> PKR 750,750.<br/>"
        "6. <b>Payment Mode:</b> Enter Advance Cash paid by customer: e.g., <b>PKR 400,000</b>. Remaining balance <b>PKR 350,750</b> automatically moves to his Khata.<br/>"
        "7. Click <b>Save & Print Invoice</b>.",
        "A 3-inch Thermal receipt or A4 invoice is printed immediately, and a WhatsApp PDF can be shared with 1 click."
    ))
    story.append(Spacer(1, 14))

    # SECTION 4: VOUCHERS ENGINE (CRITICAL)
    story.append(Paragraph("4. Vouchers Engine (Managing All Money Transactions)", sec_hdr))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#059669'), spaceBefore=4, spaceAfter=8))

    story.append(create_callout(
        "Vouchers are the heartbeat of SolarERP. Whenever money moves in or out of your shop without a direct invoice (e.g., customer brings installment, shop rent is paid, tea/fuel expense, or distributor payment), create a Voucher in 5 seconds!",
        title="WHY VOUCHERS MATTER"
    ))
    story.append(Spacer(1, 8))

    story.append(create_step_box(
        "4.1",
        "Cash Receipt Voucher (Customer Installment / Wasooli)",
        "<b>Scenario:</b> Customer <i>Haji Rehman</i> visits your shop and pays PKR 100,000 cash for his remaining balance.<br/>"
        "1. Go to <b>Vouchers</b> &rarr; Click <b>+ New Voucher</b>.<br/>"
        "2. Voucher Type: Select <b>Cash Receipt</b>.<br/>"
        "3. Main Account: <b>Cash Account (Drawer)</b>.<br/>"
        "4. Party Account: Select <b>Haji Rehman</b>.<br/>"
        "5. Amount: Enter <b>100,000</b> &rarr; Remarks: <i>Solar Tube well installment cash</i>.<br/>"
        "6. Click <b>Save Voucher</b>.",
        "Result: Cash in Drawer increases by PKR 100,000 immediately, and Haji Rehman's udhaar decreases by PKR 100,000 on his ledger."
    ))
    story.append(Spacer(1, 8))

    story.append(create_step_box(
        "4.2",
        "Cash Payment Voucher (Shop Expenses & Supplier Cash)",
        "<b>Scenario:</b> You pay PKR 25,000 for shop electricity bill and PKR 5,000 for shop tea/labor.<br/>"
        "1. Go to <b>Vouchers</b> &rarr; Click <b>+ New Voucher</b> &rarr; Select <b>Cash Payment</b>.<br/>"
        "2. Main Account: <b>Cash Account</b>.<br/>"
        "3. Party / Expense Account: Select <b>Electricity Expense</b> (or <b>General Shop Expenses</b>).<br/>"
        "4. Amount: <b>30,000</b> &rarr; Remarks: <i>Monthly electricity bill + staff tea</i> &rarr; Click <b>Save</b>.",
        "Result: Live drawer cash decreases by PKR 30,000. Total expense report records the outflow with zero discrepancy."
    ))
    story.append(Spacer(1, 8))

    story.append(create_step_box(
        "4.3",
        "Bank Receipt & Bank Payment Vouchers",
        "<b>1. Bank Receipt:</b> Customer sends PKR 250,000 via Meezan / HBL mobile banking. Select <i>Bank Receipt</i> &rarr; Main Account: <i>Meezan Bank</i> &rarr; Party: <i>Customer Name</i> &rarr; Amount: 250,000.<br/>"
        "<b>2. Bank Payment:</b> You transfer PKR 800,000 online to <i>Longi Solar Official Distributor</i>. Select <i>Bank Payment</i> &rarr; Main: <i>Meezan Bank</i> &rarr; Party: <i>Longi Distributor Account</i> &rarr; Amount: 800,000.",
        "Your bank balance and supplier payables are balanced in real-time."
    ))
    story.append(Spacer(1, 8))

    story.append(create_step_box(
        "4.4",
        "Journal Voucher (JV / Khata Adjustments)",
        "<b>When to use:</b> When adjusting balance between two accounts without physical cash moving (e.g., Transferring PKR 50,000 from Customer A to Customer B, or adjusting discount).<br/>"
        "1. Select <b>Journal Voucher</b>.<br/>"
        "2. Line 1: Debit receiving account | Line 2: Credit giving account (Debit must equal Credit).",
        "Double-entry bookkeeping integrity is guaranteed."
    ))
    story.append(Spacer(1, 14))

    # SECTION 5: DAYBOOK & REPORTS
    story.append(Paragraph("5. Daybook & Financial Reports (Munafa, Khata & Stock)", sec_hdr))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#059669'), spaceBefore=4, spaceAfter=8))

    story.append(create_step_box(
        "5.1",
        "Daily Daybook & Cash Register Reconciliation",
        "At the end of the day (closing time):<br/>"
        "1. Click <b>Reports</b> &rarr; <b>Daily Book / Cash Report</b>.<br/>"
        "2. See exact summary: <b>Opening Cash + Today's Cash Sales + Customer Receipts - Expenses - Cash Purchases = Closing Physical Cash</b>.<br/>"
        "3. Count drawer cash — it will match the software figure to the exact rupee.",
        "Prevents cash theft, missed entries, or staff calculation errors."
    ))
    story.append(Spacer(1, 8))

    story.append(create_step_box(
        "5.2",
        "Profit & Loss (P&L) Report",
        "Click <b>Reports</b> &rarr; <b>Profit & Loss</b> &rarr; Select Date Range (Today / This Month / This Year).<br/>"
        "1. <b>Gross Profit:</b> Total Sale Value minus Exact Purchase Cost (per-watt margins included).<br/>"
        "2. <b>Operating Expenses:</b> Rent, staff salaries, electricity, generator fuel, transport.<br/>"
        "3. <b>Net Clean Profit:</b> Exact real profit in your pocket.",
        "You always know your exact per-panel profit margin and net business earnings."
    ))
    story.append(Spacer(1, 8))

    story.append(create_step_box(
        "5.3",
        "Customer & Supplier Khata Statements",
        "Click <b>Reports</b> &rarr; <b>Account Statement</b> &rarr; Select Customer or Supplier.<br/>"
        "Shows date-wise invoice bills, payments made, running balance, and printable PDF ledger for WhatsApp sharing.",
        "Clear proof for customers to avoid disputed balances."
    ))
    story.append(Spacer(1, 14))

    # SECTION 6: SETTINGS, BACKUP & UPDATES
    story.append(Paragraph("6. Settings, Cloud Backup & 1-Click Updates", sec_hdr))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#059669'), spaceBefore=4, spaceAfter=8))

    story.append(create_step_box(
        "6.1",
        "1-Click Google Drive Cloud Sync",
        "Go to <b>Settings</b> &rarr; Click <b>Cloud Backup & Sync</b> tab.<br/>"
        "1. Click <b>Sign in with Google Drive</b>.<br/>"
        "2. Click <b>Upload Database to Cloud</b> whenever you want to backup.<br/>"
        "3. Even if your computer hard drive crashes or Windows is reinstalled, click <i>Restore Database from Cloud</i> to retrieve 100% of your business data in 10 seconds.",
        "Zero risk of data loss. Your business data is always safe in your personal Google Drive."
    ))
    story.append(Spacer(1, 8))

    story.append(create_step_box(
        "6.2",
        "In-App 1-Click Updates",
        "Go to <b>Settings</b> &rarr; <b>About & Updates</b>.<br/>"
        "Click <b>Check for Updates</b> &rarr; When a new version is released, click <b>Download & Apply Update (1-Click)</b>.<br/>"
        "The software upgrades automatically without reinstalling or losing any data.",
        "Enjoy lifetime feature upgrades effortlessly."
    ))
    story.append(Spacer(1, 16))

    # Support & Contact Box
    story.append(create_callout(
        "<b>Developer & Technical Support Helpline:</b><br/>"
        "• Engineer / Developer: Kashan Khan (AIwithKashan)<br/>"
        "• Direct Phone & WhatsApp: <b>+92 334 1911680</b><br/>"
        "• Email: kashanyousaf45000@gmail.com<br/>"
        "• Office: Main Peshawar Road, Serai Naurang, KP<br/>"
        "<i>24/7 dedicated support for solar distributors, wholesalers, and retail shop owners.</i>",
        title="SOLAR ERP OFFICIAL SUPPORT & CONTACT",
        border_color='#059669',
        bg_color='#f0fdf4'
    ))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[OK] Generated English Manual: {filename}")


# ==============================================================================
# 2. ROMAN URDU MANUAL GENERATION
# ==============================================================================
def build_roman_urdu_manual(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=50,
        bottomMargin=55
    )
    styles = getSampleStyleSheet()
    story = []

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#0f172a'),
        alignment=TA_CENTER
    )
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#059669'),
        alignment=TA_CENTER
    )

    story.append(Spacer(1, 10))
    story.append(Paragraph("SolarERP Enterprise Edition", title_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph("Solar Businesses K Liye Mukammal Aasan User Manual (Roman Urdu)", subtitle_style))
    story.append(Spacer(1, 12))

    meta_data = [
        [
            Paragraph("<b>Target Users:</b> Solar Shop Malik, Munshi, Sales Staff", ParagraphStyle('M1', fontName='Helvetica', fontSize=8, textColor=colors.HexColor('#475569'))),
            Paragraph("<b>Software Version:</b> v2.0.1 (Production Standalone)", ParagraphStyle('M2', fontName='Helvetica', fontSize=8, textColor=colors.HexColor('#475569'))),
            Paragraph("<b>Helpline / Rabta:</b> 0334-1911680", ParagraphStyle('M3', fontName='Helvetica', fontSize=8, textColor=colors.HexColor('#059669')))
        ]
    ]
    meta_tbl = Table(meta_data, colWidths=[200, 180, 152])
    meta_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#e2e8f0')),
        ('PADDING', (0,0), (-1,-1), 6),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ]))
    story.append(meta_tbl)
    story.append(Spacer(1, 14))

    sec_hdr = ParagraphStyle('SecHdr', fontName='Helvetica-Bold', fontSize=14, leading=18, textColor=colors.HexColor('#0f172a'))

    # SECTION 1: OPENING BALANCES
    story.append(Paragraph("1. Dukaan Shuru Kerna & Pehle Din Ka Hisab (Opening Balances)", sec_hdr))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#059669'), spaceBefore=4, spaceAfter=8))

    story.append(create_step_box(
        "1.1",
        "Dukaan Ki Cash Aur Bank Balance Daalna",
        "Left menu me <b>Accounts</b> per click karein &rarr; <b>Add New Account</b> (ya <b>Opening Balances</b> per jayein).<br/>"
        "1. <b>Cash Account:</b> Dukaan k galle me mojood pehle se cash likhein (maslan: <b>500,000 Rs</b>).<br/>"
        "2. <b>Bank Account:</b> Bank ka naam likhein (maslan: <i>Meezan Bank Shop Account</i>) aur balance likhein (maslan: <b>1,200,000 Rs</b>).",
        "Aap ki dukaan ka hisab 5 lakh cash aur 12 lakh bank balance k sath shuru ho gia. Ab jo b kharch ya bikri hogi, oos ka hisab 1 1 rupay ka track hoga."
    ))
    story.append(Spacer(1, 8))

    story.append(create_step_box(
        "1.2",
        "Purane Grahkon (Customers) Ka Pichla Udhaar Daalna",
        "<b>Accounts</b> per jayein &rarr; <b>Add Account</b> &rarr; Account Type: <b>Customer</b> select karein.<br/>"
        "Customer ka naam likhein (maslan: <i>Haji Rehman Tube Well</i>), phone number, aur <b>Opening Balance</b> me pichla udhaar likhein (maslan: <b>350,000 Rs</b>).",
        "Haji Rehman k khattay me 3.5 lakh udhaar save ho gia. Agli dafa wo jab b paisay dega ya naya samaan lega, hisab khud ba khud adjust hoga."
    ))
    story.append(Spacer(1, 14))

    # SECTION 2: PRODUCTS & STOCK
    story.append(Paragraph("2. Solar Samaan (Panels, Inverters, Battery) Add Kerna", sec_hdr))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#059669'), spaceBefore=4, spaceAfter=8))

    story.append(create_step_box(
        "2.1",
        "Solar Panels Add Kerna (Per-Watt Hisab K Sath)",
        "Left menu me <b>Products</b> per click karein &rarr; <b>+ Add Product</b> dabayein.<br/>"
        "1. Product Name: <i>Longi 585W Hi-MO X6</i><br/>"
        "2. Category: <i>Solar Panel</i> | Unit: <i>Watt / Panel</i> | Wattage: <b>585</b><br/>"
        "3. Khareed Rate (Per Watt): <b>45.00 Rs</b> | Sale Rate (Per Watt): <b>47.50 Rs</b><br/>"
        "4. Dukaan me mojood stock: <b>100 Panels</b> (Total Watts: 58,500W). Click <b>Save Product</b>.",
        "Software khud ba khud calculate ker lega k 100 panels ki khareed qeemat 26,32,500 Rs hai aur stock me 100 panels show karega."
    ))
    story.append(Spacer(1, 8))

    story.append(create_step_box(
        "2.2",
        "Inverters, Batteries aur DC Taarein (Cables) Add Kerna",
        "1. Inverter: Model likhein (maslan: <i>Inverex Nitrox 10kW On-Grid/Hybrid</i>), Warranty: 5 Saal, Khareed: 380,000 Rs, Sale: 410,000 Rs.<br/>"
        "2. DC Wire: <i>Pakistan Cables 4mm / 6mm</i> select karein aur Unit me <i>Meter / Coil</i> select karein.<br/>"
        "3. Low Stock Alert me <i>5</i> likhein ta k stock khatam hone se pehle software aap ko alert de.",
        "Inverters k serial number aur warranty ka mukammal record software me mefooz rahega."
    ))
    story.append(Spacer(1, 14))

    # SECTION 3: SALES INVOICING
    story.append(Paragraph("3. Customer Ko Samaan Bechna & Bill (Invoice) Banana", sec_hdr))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#059669'), spaceBefore=4, spaceAfter=8))

    story.append(create_step_box(
        "3.1",
        "Naya Sale Bill Banana (Aasan Steps)",
        "1. Left menu me <b>Sales</b> per click karein &rarr; <b>+ New Sale</b> dabayein.<br/>"
        "2. <b>Customer Select Karein:</b> Customer ka naam search karein (maslan: <i>Malik Tariq</i>) ya <i>+ Quick Add</i> se naya customer banayein.<br/>"
        "3. <b>Samaan Select Karein:</b> <i>Longi 585W</i> select karein &rarr; Quantity me <b>20 Panels</b> (11,700 Watts) likhein. Rate: <b>47.50 Rs/W</b> = Total 555,750 Rs.<br/>"
        "4. <b>Inverter Select Karein:</b> <i>Knox 6kW</i> &rarr; Qty: <b>1</b> = 195,000 Rs.<br/>"
        "5. <b>Kul Bill:</b> 750,750 Rs bana.<br/>"
        "6. <b>Wasooli (Cash Paid):</b> Customer ne moqay per <b>400,000 Rs</b> cash dia. Baqi <b>350,750 Rs</b> khud ba khud oos k khatay (udhaar) me chala jayega.<br/>"
        "7. <b>Save & Print</b> dabayein.",
        "Thermal receipt ya A4 bill print ho jayega aur WhatsApp per PDF bill bejhne ka option b mil jayega."
    ))
    story.append(Spacer(1, 14))

    # SECTION 4: VOUCHERS (LAIN DAIN)
    story.append(Paragraph("4. Vouchers Section (Paison Ka Lain Dain & Kharchay)", sec_hdr))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#059669'), spaceBefore=4, spaceAfter=8))

    story.append(create_callout(
        "Jab b dukaan me baghair bill k paisay ayein ya jayein (maslan grahak purani qist dene aye, dukaan ka kiraya/bijli bill dena ho, ya company ko online payment kerni ho), to foran 5 second me VOUCHER banayein!",
        title="VOUCHER KYUN ZAROORI HAI?"
    ))
    story.append(Spacer(1, 8))

    story.append(create_step_box(
        "4.1",
        "Cash Receipt Voucher (Grahak Se Udhaar/Qist Wasool Kerna)",
        "<b>Misal:</b> Grahak <i>Haji Rehman</i> dukaan per aya aur us ne pichle udhaar k <b>100,000 Rs</b> cash jama karwaye.<br/>"
        "1. <b>Vouchers</b> me jayein &rarr; <b>+ New Voucher</b> per click karein.<br/>"
        "2. Voucher Type: <b>Cash Receipt</b> select karein.<br/>"
        "3. Main Account: <b>Cash Account (Galla)</b>.<br/>"
        "4. Party Account: <b>Haji Rehman</b> select karein.<br/>"
        "5. Amount: <b>100,000</b> likhein &rarr; Remarks: <i>Solar tube well qist wasool</i>.<br/>"
        "6. <b>Save Voucher</b> dabayein.",
        "Nateeja: Dukaan k galle me 1 lakh cash barh gaya, aur Haji Rehman k khatay se 1 lakh udhaar kam ho gaya."
    ))
    story.append(Spacer(1, 8))

    story.append(create_step_box(
        "4.2",
        "Cash Payment Voucher (Dukaan K Kharchay & Chai/Kiraya)",
        "<b>Misal:</b> Dukaan ka Bijli Bill 25,000 Rs aur Mazdoori/Chai 5,000 Rs cash galle se ada kia.<br/>"
        "1. <b>Vouchers</b> &rarr; <b>+ New Voucher</b> &rarr; Type: <b>Cash Payment</b> select karein.<br/>"
        "2. Main Account: <b>Cash Account</b>.<br/>"
        "3. Party Account: <b>Electricity Expense</b> (ya General Expense) select karein.<br/>"
        "4. Amount: <b>30,000</b> likhein &rarr; <b>Save</b> dabayein.",
        "Nateeja: Galle se 30,000 Rs live balance kam ho gaya aur kharchay me darj ho gaya."
    ))
    story.append(Spacer(1, 8))

    story.append(create_step_box(
        "4.3",
        "Bank Receipt Aur Bank Payment Vouchers",
        "<b>1. Bank Receipt:</b> Grahak ne aap k Meezan Bank me 250,000 Rs online transfer kie. Type: <i>Bank Receipt</i> &rarr; Main: <i>Meezan Bank</i> &rarr; Party: <i>Customer Name</i> &rarr; Amount: 250,000.<br/>"
        "<b>2. Bank Payment:</b> Aap ne Solar Distributor ko 800,000 Rs online bejay. Type: <i>Bank Payment</i> &rarr; Main: <i>Meezan Bank</i> &rarr; Party: <i>Distributor Ka Naam</i> &rarr; Amount: 800,000.",
        "Bank balance aur distributor ka hisab live update ho gaya."
    ))
    story.append(Spacer(1, 8))

    story.append(create_step_box(
        "4.4",
        "Journal Voucher (JV / Do Khaton Ka Aapas Me Tabadla)",
        "<b>Kabb istemal karein:</b> Jab baghair cash k do khaton me raqam adjust kerni ho.<br/>"
        "1. <b>Journal Voucher</b> select karein.<br/>"
        "2. Line 1: Wasool kerne wala account (Debit) | Line 2: Dene wala account (Credit).",
        "Hisab me 1 paisay ka b farq nahi aye ga."
    ))
    story.append(Spacer(1, 14))

    # SECTION 5: DAYBOOK & REPORTS
    story.append(Paragraph("5. Rozana Ka Hisab (Daybook) Aur Munafa Reports", sec_hdr))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#059669'), spaceBefore=4, spaceAfter=8))

    story.append(create_step_box(
        "5.1",
        "Daybook & Rozana Galle Ki Bandi (Closing)",
        "Rozana raat ko dukaan band kertay waqt:<br/>"
        "1. <b>Reports</b> &rarr; <b>Daily Book / Cash Report</b> kholain.<br/>"
        "2. Software aap ko batayega: <b>Subah Ka Cash + Aaj Ki Sale Wasooli + Grahkon Se Aaye Cash - Kharchay = Raat Ka Mojooda Cash</b>.<br/>"
        "3. Apnay galle k note ginein — software k hisab se 100% barabar nikleingay.",
        "Chori, bhool chook aur hisab me ghalti ka khatma."
    ))
    story.append(Spacer(1, 8))

    story.append(create_step_box(
        "5.2",
        "Profit & Loss (Saaf Munafa Ki Report)",
        "<b>Reports</b> &rarr; <b>Profit & Loss</b> per jayein.<br/>"
        "1. <b>Gross Profit:</b> Kul Bikri minus Khareed Qeemat (per watt margin shamil).<br/>"
        "2. <b>Dukaan K Kharchay:</b> Kiraya, tankhwah, bijli, diesel, chai pani.<br/>"
        "3. <b>Net Clean Profit:</b> Aap ki jaib me anay wala haqeeqi saaf munafa.",
        "Aap ko har panel aur har inverter per milne wala exact munafa maloom hoga."
    ))
    story.append(Spacer(1, 8))

    story.append(create_step_box(
        "5.3",
        "Customer & Supplier Khata Statement",
        "<b>Reports</b> &rarr; <b>Account Statement</b> me jayein aur kisi b customer ya distributor ka naam select karein.<br/>"
        "Tareekh waar mukammal ledger bill samnay aayega jissay aap WhatsApp per PDF bejh saktay hain.",
        "Grahak k sath khattay per koi behes ya ikhtilaf nahi hoga."
    ))
    story.append(Spacer(1, 14))

    # SECTION 6: BACKUP & UPDATES
    story.append(Paragraph("6. Google Drive Backup & 1-Click Update", sec_hdr))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#059669'), spaceBefore=4, spaceAfter=8))

    story.append(create_step_box(
        "6.1",
        "Google Drive Cloud Backup (Data Hamesha Mehfooz)",
        "<b>Settings</b> &rarr; <b>Cloud Backup & Sync</b> me jayein.<br/>"
        "1. <b>Sign in with Google Drive</b> per click karein.<br/>"
        "2. <b>Upload Database to Cloud</b> dabayein.<br/>"
        "3. Agar computer kharab ho jaye ya Windows udd jaye, to naye computer me software install ker k sirf <i>Restore Database from Cloud</i> dabayein, aap ka 10 saal ka hisab 10 second me wapas aa jayega.",
        "Data kabhi zaya nahi hoga."
    ))
    story.append(Spacer(1, 8))

    story.append(create_step_box(
        "6.2",
        "In-App 1-Click Update (Nayi Features)",
        "<b>Settings</b> &rarr; <b>About & Updates</b> me jayein.<br/>"
        "<b>Check for Updates</b> dabayein &rarr; Naya update anay per <b>Download & Apply Update</b> dabayein.<br/>"
        "Software khud ba khud update ho jayega baghair data zaya kiye.",
        "Aap ka software hamesha latest version per rahega."
    ))
    story.append(Spacer(1, 16))

    # Support Box
    story.append(create_callout(
        "<b>Software Developer & Technical Support Helpline:</b><br/>"
        "• Engineer / Developer: Kashan Khan (AIwithKashan)<br/>"
        "• Phone & WhatsApp: <b>0334-1911680</b><br/>"
        "• Email: kashanyousaf45000@gmail.com<br/>"
        "• Address: Main Peshawar Road, Serai Naurang, KP<br/>"
        "<i>Solar shops aur distributors k liye 24/7 technical support dastiyab hai.</i>",
        title="SOLAR ERP OFFICIAL SUPPORT & RABTA",
        border_color='#059669',
        bg_color='#f0fdf4'
    ))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[OK] Generated Roman Urdu Manual: {filename}")


# ==============================================================================
# 3. URDU NASTALEEQ MANUAL GENERATION
# ==============================================================================
def build_urdu_manual(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=50,
        bottomMargin=55
    )
    styles = getSampleStyleSheet()
    story = []

    urdu_font = 'JameelNastaleeq' if os.path.exists(JAMEEL_FONT_PATH) else 'Arial'

    title_style = ParagraphStyle(
        'UTitle',
        parent=styles['Normal'],
        fontName=urdu_font,
        fontSize=26,
        leading=34,
        textColor=colors.HexColor('#0f172a'),
        alignment=TA_CENTER
    )
    subtitle_style = ParagraphStyle(
        'USubTitle',
        parent=styles['Normal'],
        fontName=urdu_font,
        fontSize=14,
        leading=20,
        textColor=colors.HexColor('#059669'),
        alignment=TA_CENTER
    )

    story.append(Spacer(1, 10))
    story.append(Paragraph(reshape_urdu("سولر ای آر پی انٹرپرائز ایڈیشن (SolarERP)"), title_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph(reshape_urdu("سولر کے کاروبار اور دکان کے لیے مکمل رہنمائی اور یوزر مینوئل"), subtitle_style))
    story.append(Spacer(1, 12))

    meta_data = [
        [
            Paragraph(reshape_urdu("ہیلپ لائن: 0334-1911680"), ParagraphStyle('UM1', fontName=urdu_font, fontSize=11, leading=15, textColor=colors.HexColor('#059669'), alignment=TA_CENTER)),
            Paragraph(reshape_urdu("ورژن: 2.0.1 (پروڈکشن سٹینڈ الون)"), ParagraphStyle('UM2', fontName=urdu_font, fontSize=11, leading=15, textColor=colors.HexColor('#475569'), alignment=TA_CENTER)),
            Paragraph(reshape_urdu("مستفیدین: سولر شاپ مالکان، منشی اور اکاؤنٹنٹ"), ParagraphStyle('UM3', fontName=urdu_font, fontSize=11, leading=15, textColor=colors.HexColor('#475569'), alignment=TA_CENTER)),
        ]
    ]
    meta_tbl = Table(meta_data, colWidths=[170, 180, 182])
    meta_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#e2e8f0')),
        ('PADDING', (0,0), (-1,-1), 6),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ]))
    story.append(meta_tbl)
    story.append(Spacer(1, 14))

    sec_hdr_u = ParagraphStyle('SecHdrU', fontName=urdu_font, fontSize=16, leading=22, textColor=colors.HexColor('#0f172a'), alignment=TA_RIGHT)
    body_u = ParagraphStyle('BodyU', fontName=urdu_font, fontSize=11, leading=17, textColor=colors.HexColor('#334155'), alignment=TA_RIGHT)
    ex_u = ParagraphStyle('ExU', fontName=urdu_font, fontSize=10.5, leading=16, textColor=colors.HexColor('#0284c7'), alignment=TA_RIGHT)

    def urdu_box(step_title, text, example=None):
        p_hdr = Paragraph(reshape_urdu(step_title), ParagraphStyle('UHdr', fontName=urdu_font, fontSize=13, leading=18, textColor=colors.HexColor('#059669'), alignment=TA_RIGHT))
        content = [p_hdr, Spacer(1, 4), Paragraph(reshape_urdu(text), body_u)]
        if example:
            content.append(Spacer(1, 4))
            content.append(Paragraph(reshape_urdu("حقیقی کاروباری مثال: ") + reshape_urdu(example), ex_u))
        tbl = Table([[content]], colWidths=[532])
        tbl.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#ffffff')),
            ('BOX', (0,0), (-1,-1), 0.8, colors.HexColor('#cbd5e1')),
            ('PADDING', (0,0), (-1,-1), 8),
        ]))
        return tbl

    # SECTION 1
    story.append(Paragraph(reshape_urdu("۱۔ دکان کا آغاز اور ابتدائی بقایاجات (Opening Balances)"), sec_hdr_u))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#059669'), spaceBefore=4, spaceAfter=8))

    story.append(urdu_box(
        "پہلا مرحلہ: دکان کا کیش گلہ اور بینک بیلنس درج کرنا",
        "مینیو میں Accounts پر کلک کریں اور Add New Account دبائیں۔ نقد گلہ میں موجود رقم (مثلاً 500,000 روپے) اور بینک اکاؤنٹ کا نام و بیلنس (مثلاً میزان بینک 1,200,000 روپے) درج کریں۔",
        "آپ کا کاروبار 5 لاکھ کیش اور 12 لاکھ بینک سے شروع ہوا، اب ہر لین دین خودکار ٹریک ہوگا۔"
    ))
    story.append(Spacer(1, 8))

    story.append(urdu_box(
        "دوسرا مرحلہ: پرانے گاہکوں کا پچھلا ادھار کھاتہ درج کرنا",
        "Accounts میں جا کر Customer بنائیں، گاہک کا نام اور اس کا پچھلا ادھار Opening Balance میں درج کریں (مثلاً حاجی رحمان: 350,000 روپے)۔",
        "گاہک کے کھاتے میں 3.5 لاکھ واجب الادا رقم محفوظ ہو گئی۔ جب بھی رقم آئے گی کھاتہ اپ ڈیٹ ہوگا۔"
    ))
    story.append(Spacer(1, 14))

    # SECTION 2
    story.append(Paragraph(reshape_urdu("۲۔ سولر پینلز، انورٹرز اور سامان کا اندراج (Inventory)"), sec_hdr_u))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#059669'), spaceBefore=4, spaceAfter=8))

    story.append(urdu_box(
        "سولر پینل کا اندراج (فی واٹ ریٹ کے حساب سے)",
        "Products مینیو میں جا کر + Add Product پر کلک کریں۔ نام: Longi 585W، کیٹیگری: Solar Panel، واٹ: 585، خرید ریٹ فی واٹ: 45 روپے، فروخت ریٹ فی واٹ: 47.50 روپے، اور دکان میں موجود تعداد: 100 پینل درج کر کے محفوظ کریں۔",
        "سافٹ ویئر خود بخود حساب کر لے گا کہ 100 پینلز کی کل مالیت 26,32,500 روپے ہے۔"
    ))
    story.append(Spacer(1, 8))

    story.append(urdu_box(
        "انورٹرز، بیٹریاں اور تاروں کا اندراج",
        "انورٹر کا ماڈل (مثلاً Inverex Nitrox 10kW)، وارنٹی، خرید و فروخت قیمت درج کریں۔ ڈی سی تاروں کے لیے میٹر اور کوائل کا یونٹ منتخب کریں۔ کم اسٹاک کا الارم 5 پر سیٹ کریں۔",
        "اسٹاک ختم ہونے سے پہلے سافٹ ویئر خود الرٹ جاری کرے گا۔"
    ))
    story.append(Spacer(1, 14))

    # SECTION 3
    story.append(Paragraph(reshape_urdu("۳۔ گاہک کو سامان فروخت کرنا اور بل (Invoice) بنانا"), sec_hdr_u))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#059669'), spaceBefore=4, spaceAfter=8))

    story.append(urdu_box(
        "فروخت کا بل بنانے کا آسان طریقہ",
        "1. Sales مینیو میں جا کر + New Sale پر کلک کریں۔ 2. گاہک منتخب کریں۔ 3. پینل اور انورٹر منتخب کر کے تعداد لکھیں۔ 4. کل بل خود بن جائے گا۔ 5. گاہک کی طرف سے دی گئی نقد رقم (مثلاً 4 لاکھ) درج کریں۔ بقیہ رقم خود بخود اس کے ادھار کھاتے میں درج ہو جائے گی۔ 6. Save & Print دبائیں۔",
        "فوری تھرمل پرچی یا A4 بل پرنٹ ہوگا اور واٹس ایپ پر پی ڈی ایف بل بھیجنے کی سہولت بھی ملے گی۔"
    ))
    story.append(Spacer(1, 14))

    # SECTION 4
    story.append(Paragraph(reshape_urdu("۴۔ واؤچرز سسٹم (رقم کی وصولی، دکان کے اخراجات اور ادائیگیاں)"), sec_hdr_u))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#059669'), spaceBefore=4, spaceAfter=8))

    story.append(urdu_box(
        "کیش وصولی واؤچر (Cash Receipt Voucher)",
        "جب بھی کوئی گاہک پرانی قسط یا ادھار دینے آئے تو Vouchers میں جا کر Cash Receipt منتخب کریں۔ گاہک کا نام اور وصول شدہ رقم (مثلاً 100,000 روپے) درج کر کے محفوظ کریں۔",
        "دکان کے گلے میں 1 لاکھ کیش بڑھ جائے گا اور گاہک کے کھاتے سے 1 لاکھ ادھار کم ہو جائے گا۔"
    ))
    story.append(Spacer(1, 8))

    story.append(urdu_box(
        "کیش ادائیگی واؤچر (دکان کے اخراجات / Cash Payment)",
        "دکان کا بجلی بل، کرایہ، چائے پانی یا مزدوروں کی اجرت کے لیے Vouchers میں Cash Payment منتخب کریں، رقم درج کر کے محفوظ کریں۔",
        "گلے کے نقد کیش میں سے رقم فوری منہا ہو کر اخراجات کے گوشوارے میں درج ہو جائے گی۔"
    ))
    story.append(Spacer(1, 8))

    story.append(urdu_box(
        "بینک وصولی اور بینک ادائیگی واؤچرز (Bank Vouchers)",
        "جب گاہک آن لائن بینک میں رقم بھیجے تو Bank Receipt منتخب کریں۔ جب آپ سولر کمپنی کو بینک سے پیمنٹ کریں تو Bank Payment منتخب کریں۔",
        "بینک کا کھاتہ اور کمپنی کی بقایا رقم حقیقی وقت میں بیلنس ہو جائے گی۔"
    ))
    story.append(Spacer(1, 14))

    # SECTION 5
    story.append(Paragraph(reshape_urdu("۵۔ روزنامچہ (Daybook) اور نفع و نقصان کی رپورٹ"), sec_hdr_u))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#059669'), spaceBefore=4, spaceAfter=8))

    story.append(urdu_box(
        "روزانہ گلے کی بندش اور کیش کا حساب (Daily Book)",
        "شام کو دکان بند کرتے وقت Reports میں جا کر Daily Book دیکھیں۔ صبح کا کیش + دن بھر کی وصولی - اخراجات = گلے کا موجودہ نقد کیش۔ گلے کے نوٹ گنیں، سافٹ ویئر سے سو فیصد برابر ہوں گے۔",
        "حساب میں کسی قسم کے گھپلے یا غلطی کا سو فیصد خاتمہ۔"
    ))
    story.append(Spacer(1, 8))

    story.append(urdu_box(
        "خالص نفع و نقصان کی رپورٹ (Profit & Loss)",
        "Reports میں Profit & Loss رپورٹ دیکھیں: کل آمدن منفی خریداری لاگت منفی دکان کے اخراجات = آپ کی جیب کا حقیقی صاف منافع۔",
        "ہر سولر پینل اور انورٹر پر حاصل ہونے والا حقیقی نفع واضح نظر آئے گا۔"
    ))
    story.append(Spacer(1, 14))

    # SECTION 6
    story.append(Paragraph(reshape_urdu("۶۔ گوگل ڈرائیو کلاؤڈ بیک اپ اور اپ ڈیٹ سسٹم"), sec_hdr_u))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#059669'), spaceBefore=4, spaceAfter=8))

    story.append(urdu_box(
        "گوگل ڈرائیو بیک اپ (ڈیٹا ہمیشہ محفوظ)",
        "Settings میں جا کر Cloud Backup پر کلک کریں اور Sign in with Google Drive کر کے Upload Database دبائیں۔ اگر کمپیوٹر چوری یا ونڈوز خراب ہو جائے تو نئے کمپیوٹر میں ایک کلک پر دس سال کا ڈیٹا واپس آ جائے گا۔",
        "کاروباری ریکارڈ ضائع ہونے کا صفر فیصد خطرہ۔"
    ))
    story.append(Spacer(1, 16))

    # Support Box
    support_u = Paragraph(reshape_urdu("سافٹ ویئر انجینئر / ٹیکنیکل سپورٹ ہیلپ لائن:") + "<br/>" +
                          reshape_urdu("• کاشان خان (AIwithKashan)") + "<br/>" +
                          reshape_urdu("• فون و واٹس ایپ: ") + "<b>0334-1911680</b><br/>" +
                          reshape_urdu("• ایڈریس: مین پشاور روڈ، سرائے نورنگ، خیبر پختونخوا") + "<br/>" +
                          reshape_urdu("سولر ڈیلرز اور دکانداروں کے لیے 24 گھنٹے مکمل رہنمائی اور سپورٹ دستیاب ہے۔"),
                          body_u)
    s_tbl = Table([[Paragraph(reshape_urdu("رابطہ اور ٹیکنیکل سپورٹ"), ParagraphStyle('STitle', fontName=urdu_font, fontSize=13, leading=18, textColor=colors.HexColor('#059669'), alignment=TA_RIGHT))], [support_u]], colWidths=[532])
    s_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f0fdf4')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#059669')),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(s_tbl)

    doc.build(story, canvasmaker=UrduNumberedCanvas)
    print(f"[OK] Generated Urdu Manual: {filename}")


if __name__ == '__main__':
    desktop = "C:\\Users\\Kashan Khan\\Desktop"
    eng_pdf = os.path.join(desktop, "SolarERP_User_Manual_English.pdf")
    roman_pdf = os.path.join(desktop, "SolarERP_User_Manual_Roman_Urdu.pdf")
    urdu_pdf = os.path.join(desktop, "SolarERP_User_Manual_Urdu.pdf")

    build_english_manual(eng_pdf)
    build_roman_urdu_manual(roman_pdf)
    build_urdu_manual(urdu_pdf)
    print("ALL 3 USER MANUALS GENERATED SUCCESSFULLY ON DESKTOP!")
