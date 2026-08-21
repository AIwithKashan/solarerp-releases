import os
from playwright.sync_api import sync_playwright

OUTPUT_PDF_PATH = r"C:\Users\Kashan Khan\Desktop\SolarERP_Enterprise_Complete_Blueprint.pdf"

HTML_CONTENT = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>SolarERP Enterprise System Architecture & Blueprint</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap');
  
  @page {
    size: A4;
    margin: 18mm 15mm 20mm 15mm;
    @bottom-right {
      content: counter(page);
      font-family: 'Inter', sans-serif;
      font-size: 8pt;
      color: #64748b;
    }
  }

  body {
    font-family: 'Inter', sans-serif;
    color: #1e293b;
    line-height: 1.55;
    font-size: 9.5pt;
    background: #ffffff;
    margin: 0;
    padding: 0;
  }

  .page-break {
    page-break-before: always;
  }

  /* Cover Page */
  .cover {
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 40px 20px 20px 20px;
    box-sizing: border-box;
    page-break-after: always;
    border-left: 6px solid #10b981;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  }

  .brand-badge {
    display: inline-block;
    background: #0f172a;
    color: #10b981;
    padding: 6px 14px;
    border-radius: 6px;
    font-size: 11pt;
    font-weight: 800;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .cover-title {
    font-size: 28pt;
    font-weight: 900;
    color: #0f172a;
    line-height: 1.15;
    margin: 20px 0 10px 0;
    letter-spacing: -0.5px;
  }

  .cover-subtitle {
    font-size: 13pt;
    color: #059669;
    font-weight: 700;
    margin-bottom: 20px;
  }

  .cover-desc {
    font-size: 10.5pt;
    color: #475569;
    max-width: 600px;
    line-height: 1.6;
  }

  .meta-box {
    background: #ffffff;
    padding: 16px 20px;
    border-radius: 10px;
    border: 1px solid #cbd5e1;
    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
    margin-top: 30px;
  }

  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    font-size: 9pt;
  }

  .meta-item strong {
    color: #0f172a;
    display: block;
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  /* Section Styling */
  h1 {
    font-size: 16pt;
    font-weight: 800;
    color: #0f172a;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 6px;
    margin-top: 24px;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  h1 .num {
    background: #10b981;
    color: #fff;
    width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    font-size: 10pt;
    font-weight: 800;
  }

  h2 {
    font-size: 11.5pt;
    font-weight: 700;
    color: #1e293b;
    margin-top: 16px;
    margin-bottom: 6px;
    border-left: 3px solid #10b981;
    padding-left: 8px;
  }

  h3 {
    font-size: 10pt;
    font-weight: 700;
    color: #334155;
    margin-top: 12px;
    margin-bottom: 4px;
  }

  p {
    margin: 0 0 8px 0;
    color: #334155;
  }

  ul, ol {
    margin: 4px 0 10px 18px;
    padding: 0;
  }

  li {
    margin-bottom: 4px;
    color: #334155;
  }

  /* Card Containers */
  .card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 12px;
  }

  .card-highlight {
    background: #ecfdf5;
    border: 1px solid #a7f3d0;
  }

  .badge {
    display: inline-block;
    padding: 2px 7px;
    border-radius: 4px;
    font-size: 7.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .badge-green { background: #d1fae5; color: #065f46; }
  .badge-blue { background: #dbeafe; color: #1e40af; }
  .badge-orange { background: #ffedd5; color: #9a3412; }
  .badge-purple { background: #f3e8ff; color: #6b21a8; }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0 16px 0;
    font-size: 8.5pt;
  }

  th {
    background: #0f172a;
    color: #ffffff;
    font-weight: 700;
    text-align: left;
    padding: 7px 10px;
    border: 1px solid #0f172a;
  }

  td {
    padding: 6px 10px;
    border: 1px solid #cbd5e1;
    color: #334155;
  }

  tr:nth-child(even) {
    background: #f8fafc;
  }

  /* Flowchart diagram box */
  .flow-box {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #0f172a;
    color: #fff;
    padding: 12px;
    border-radius: 8px;
    margin: 12px 0;
    font-size: 8pt;
  }

  .flow-step {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 6px;
    padding: 8px 10px;
    text-align: center;
    flex: 1;
    margin: 0 4px;
  }

  .flow-step strong {
    display: block;
    color: #10b981;
    font-size: 8.5pt;
  }

  .flow-arrow {
    color: #10b981;
    font-weight: 900;
    font-size: 12pt;
  }
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover">
  <div>
    <div class="brand-badge">AIwithKashan Enterprise Solutions</div>
    <div class="cover-title">SOLAR & ENERGY ERP<br>ENTERPRISE ARCHITECTURE</div>
    <div class="cover-subtitle">Complete Specification, Workflow Blueprint & Vibe-Coding Implementation Guide</div>
    <div class="cover-desc">
      A comprehensive, unified enterprise blueprint tailored for large-scale Solar Distributors, Assembly Plants, and Energy Solution Providers. Covers multi-department task automation, centralized single-entry data architecture, battery manufacturing lab pipelines, RMA warranty tracking, import forecasting, and encrypted cloud infrastructure.
    </div>
  </div>

  <div class="meta-box">
    <div class="meta-grid">
      <div class="meta-item">
        <strong>Software Architecture</strong>
        Unified Relational Enterprise ERP (Next.js + Prisma + Cloud PostgreSQL)
      </div>
      <div class="meta-item">
        <strong>Project Lead & Solution Architect</strong>
        Kashan Khan (AIwithKashan)
      </div>
      <div class="meta-item">
        <strong>Direct Contact & WhatsApp</strong>
        +92 334 1911680 | kashanyousaf45000@gmail.com
      </div>
      <div class="meta-item">
        <strong>Target Industry Scope</strong>
        Solar Commercial, Battery Assembly, Logistics & Import Supply Chain
      </div>
    </div>
  </div>
</div>

<!-- PAGE 1: EXECUTIVE ARCHITECTURE & CORE PRINCIPLES -->
<h1><span class="num">1</span> Executive Vision & Unified Data Foundation</h1>

<div class="card card-highlight">
  <p style="margin:0; font-weight: 600; color: #065f46;">
    <strong>The Core Problem Solved:</strong> Fragmented operations across multiple isolated systems (Excel, separate WhatsApp groups, disconnected registers) cause lost warranty claims, delayed repairs, inventory shrinkage, and untracked customer Udhaar.
  </p>
</div>

<h2>1.1 Single Source of Truth (Zero Duplicate Entry)</h2>
<p>
The system enforces a <strong>Unified Entity Master</strong>. When a Customer, Dealer, Installer, or Vendor is registered in the system (typically during initial onboarding or sales), that entity receives a global Unique Identifier (UUID).
</p>
<ul>
  <li><strong>Universal Customer & Dealer Record:</strong> Sales, Logistics, Technician Labs, and Accounts reference the exact same profile without re-entering names or contacts.</li>
  <li><strong>Hierarchical Attribution:</strong> Every warranty claim or service ticket links the <strong>End-User</strong>, the <strong>Authorized Dealer</strong> who sold it, and the <strong>Certified Installer</strong> who commissioned the system.</li>
  <li><strong>Instant Global Search:</strong> Any department can search by Serial Number, Phone Number, Invoice #, or Gate Pass to view the complete history.</li>
</ul>

<h2>1.2 Automated Departmental Task Handoff Flow</h2>
<div class="flow-box">
  <div class="flow-step">
    <strong>1. Logistics</strong>
    Parcel Receipt & Gate Pass Logged
  </div>
  <div class="flow-arrow">➔</div>
  <div class="flow-step">
    <strong>2. Technician / Lab</strong>
    Auto-Assigned Queue & Unit Inspection
  </div>
  <div class="flow-arrow">➔</div>
  <div class="flow-step">
    <strong>3. Lab Approval</strong>
    BOM Component Swap / Cell Grade
  </div>
  <div class="flow-arrow">➔</div>
  <div class="flow-step">
    <strong>4. Accounts</strong>
    Auto Ledger & Warranty / Bill Costing
  </div>
  <div class="flow-arrow">➔</div>
  <div class="flow-step">
    <strong>5. Dispatch</strong>
    Delivery Verification & Close Ticket
  </div>
</div>

<hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">

<!-- PAGE 2: DETAILED MODULE BREAKDOWN (MODULES 1 TO 3) -->
<h1><span class="num">2</span> Core Enterprise Modules Specification</h1>

<h2>Module 1: Logistics & Inward/Outward Dispatch</h2>
<div class="card">
  <span class="badge badge-blue">Logistics Operations</span>
  <h3>Key Capabilities & Data Points:</h3>
  <ul>
    <li><strong>Inward Parcel Receiving:</strong> Logs incoming faulty inverters, batteries, or return stock from couriers (TCS, Leopards, Cargo) with Courier Tracking # and physical condition notes.</li>
    <li><strong>Digital Gate Pass Generator:</strong> Inward/Outward passes with verifiable barcode/QR tokens.</li>
    <li><strong>Automated Forwarding:</strong> Marking a parcel as "Checked-In" automatically creates a prioritized ticket in the Technician Lab Queue.</li>
    <li><strong>Dispatch Management:</strong> Tracks repaired units dispatched back to dealers with customer SMS/WhatsApp notification triggers.</li>
  </ul>
</div>

<h2>Module 2: After-Sales, Warranty & RMA Ticketing Engine</h2>
<div class="card">
  <span class="badge badge-orange">RMA & Warranty</span>
  <h3>Key Capabilities & Data Points:</h3>
  <ul>
    <li><strong>Serial Number & Warranty Lookup:</strong> Instant check if an inverter/panel is within warranty based on original import/sale date.</li>
    <li><strong>Warranty Status Categories:</strong> <code>In-Warranty (Free Repair)</code>, <code>Out-of-Warranty (Paid)</code>, <code>Physical Damage (Void)</code>, <code>Replaced with New</code>.</li>
    <li><strong>Dealer & Installer Mapping:</strong> Identifies which dealer sold the item and which installer deployed it to eliminate dispute over warranty coverage.</li>
    <li><strong>Live Status Tracking Portal:</strong> Web link where customers and dealers can track ticket status in real-time.</li>
  </ul>
</div>

<h2>Module 3: Battery Lab & Assembly / Manufacturing (BOM)</h2>
<div class="card">
  <span class="badge badge-purple">Manufacturing & Assembly</span>
  <h3>Key Capabilities & Data Points:</h3>
  <ul>
    <li><strong>Bill of Materials (BOM) Engine:</strong> Define recipes for battery pack creation (e.g., 1x 48V 100Ah Lithium Battery = 16x LiFePO4 Cells + 1x Smart BMS 100A + 1x Metal Enclosure + 15x Busbars + 2x Terminals).</li>
    <li><strong>Automated Stock Deduction:</strong> When a production batch is started, raw materials are automatically reserved and deducted from raw inventory.</li>
    <li><strong>Finished Product Packaging:</strong> Completed battery packs receive generated Serial Barcodes and are added to finished goods inventory with calculated landed cost.</li>
    <li><strong>Cell Testing & Grading Log:</strong> Capacity test logs (Ah), internal resistance (IR), and voltage balancing records stored per battery pack.</li>
  </ul>
</div>

<div class="page-break"></div>

<!-- PAGE 3: DETAILED MODULE BREAKDOWN (MODULES 4 TO 6) -->
<h1><span class="num">3</span> Supply Chain, Financials & Security</h1>

<h2>Module 4: Import, Container & Supply Chain Forecasting</h2>
<div class="card">
  <span class="badge badge-green">Imports & Logistics</span>
  <h3>Key Capabilities & Data Points:</h3>
  <ul>
    <li><strong>Container & Shipment Tracking:</strong> Tracks Bill of Lading (BL #), Vessel Name, Port ETA (Karachi Port / QICT), and Customs Clearing Agent.</li>
    <li><strong>Landed Cost Per Watt / Unit Calculator:</strong> Automatically amortizes Freight charges, Customs duties, Port Demurrage, and Clearing fees across individual item costs (calculating true per-panel / per-inverter cost).</li>
    <li><strong>Yearly Outcome & Seasonal Forecasting:</strong> Visual charts predicting winter/summer demand cycles and container lead times.</li>
  </ul>
</div>

<h2>Module 5: Real-Time Multi-Warehouse & Wattage Inventory</h2>
<div class="card">
  <span class="badge badge-blue">Stock Management</span>
  <h3>Key Capabilities & Data Points:</h3>
  <ul>
    <li><strong>Wattage & Unit Level Tracking:</strong> Dynamic pricing per Watt or per Unit (Nos, KW, Meters, Sets).</li>
    <li><strong>Multi-Location Inventory:</strong> Head Office, Factory Lab, Central Warehouse, and Regional Retail Outlets with internal transfer vouchers.</li>
    <li><strong>Low Stock & Over-Stock Alerts:</strong> Automated dashboard warnings when critical panel models or BMS units reach minimum buffer.</li>
  </ul>
</div>

<h2>Module 6: Parallel Financial Accounting Engine</h2>
<div class="card">
  <span class="badge badge-orange">Finance & Accounts</span>
  <h3>Key Capabilities & Data Points:</h3>
  <ul>
    <li><strong>Automated Double-Entry Ledger:</strong> Automatic Debit/Credit postings triggered by Sales, Purchases, RMA Repair Costing, and Freight Payments.</li>
    <li><strong>Warranty Cost Accounting:</strong> Costs of warranty replacements are automatically posted to "Warranty Expense Account" without corrupting general sales margin.</li>
    <li><strong>Complete Financial Statements:</strong> Real-time Profit & Loss (P&L), Daily Cash Book, Balance Sheet, and Customer Aging Ledger with instant PDF export.</li>
  </ul>
</div>

<h2>Module 7: Enterprise Cloud Hosting & Data Security</h2>
<table>
  <thead>
    <tr>
      <th>Security Parameter</th>
      <th>Specification & Implementation</th>
      <th>Business Guarantee</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Database Engine</strong></td>
      <td>Dedicated PostgreSQL on Cloud (Supabase / AWS RDS)</td>
      <td>High-speed multi-user concurrency without file locks.</td>
    </tr>
    <tr>
      <td><strong>Data Encryption</strong></td>
      <td>256-Bit SSL/TLS in-transit & AES-256 at-rest</td>
      <td>100% Protected against eavesdropping and data packet sniffing.</td>
    </tr>
    <tr>
      <td><strong>Automated Backups</strong></td>
      <td>Daily automated snapshot + Point-In-Time-Recovery (PITR)</td>
      <td>Zero data loss guarantee even during hardware/OS failures.</td>
    </tr>
    <tr>
      <td><strong>Role-Based Access (RBAC)</strong></td>
      <td>Granular permissions per user role (Admin, Accounts, Lab, Logistics)</td>
      <td>Logistics cannot view profit margins; Techs cannot alter bank balances.</td>
    </tr>
  </tbody>
</table>

<div class="page-break"></div>

<!-- PAGE 4: VIBE-CODING IMPLEMENTATION ROADMAP -->
<h1><span class="num">4</span> Vibe-Coding Implementation Roadmap & Delivery Plan</h1>

<p>A structured 6-phase engineering plan ensuring rapid, bug-free delivery using modern Next.js 16 + Prisma ORM + Tailwind architecture:</p>

<table>
  <thead>
    <tr>
      <th style="width: 15%;">Phase</th>
      <th style="width: 35%;">Deliverables & Engineering Scope</th>
      <th style="width: 35%;">Key Milestone Output</th>
      <th style="width: 15%;">Timeline</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Phase 1</strong></td>
      <td><strong>Cloud DB Schema & Auth Setup</strong><br>PostgreSQL migration, Prisma multi-tenant relational schema, Role-Based Access Control.</td>
      <td>Working multi-user login (Admin, Logistics, Lab, Accounts).</td>
      <td>Week 1</td>
    </tr>
    <tr>
      <td><strong>Phase 2</strong></td>
      <td><strong>Central Master Entity & Inventory</strong><br>Unified Customer/Dealer/Installer registry, multi-warehouse stock catalog with Wattage logic.</td>
      <td>Single-entry data registry live across all departments.</td>
      <td>Week 2</td>
    </tr>
    <tr>
      <td><strong>Phase 3</strong></td>
      <td><strong>Logistics & After-Sales RMA Ticketing</strong><br>Parcel receiving form, Ticket state machine, Technician queue, warranty barcode verification.</td>
      <td>Automated task handoff from Logistics to Lab working seamlessly.</td>
      <td>Week 3</td>
    </tr>
    <tr>
      <td><strong>Phase 4</strong></td>
      <td><strong>Battery Lab Assembly & BOM Engine</strong><br>BOM configuration, raw cell grading log, automated stock deduction upon pack completion.</td>
      <td>Battery manufacturing batch tracking & finished serial output.</td>
      <td>Week 4</td>
    </tr>
    <tr>
      <td><strong>Phase 5</strong></td>
      <td><strong>Imports & Financial Accounting Integration</strong><br>Container landed cost engine, warranty expense ledger, auto-invoicing, and PDF reports hub.</td>
      <td>Complete financial & import tracking linked with inventory.</td>
      <td>Week 5</td>
    </tr>
    <tr>
      <td><strong>Phase 6</strong></td>
      <td><strong>End-to-End QA, Cloud Deployment & Training</strong><br>Stress testing, security hardening, cloud hosting deployment, staff user training.</td>
      <td>Final production go-live & client sign-off.</td>
      <td>Week 6</td>
    </tr>
  </tbody>
</table>

<div class="card card-highlight" style="margin-top: 24px;">
  <h3 style="margin-top:0; color: #065f46;">Summary for Commercial Quotation</h3>
  <p style="margin: 0; font-size: 9pt; color: #047857;">
    This enterprise-grade blueprint satisfies 100% of the customer's operational requirements with modular scalability for future branch additions. All intellectual property, source code, and cloud databases will remain under the client's sole ownership.
  </p>
</div>

</body>
</html>
"""

def generate_pdf():
    print("Generating Professional Enterprise ERP Blueprint PDF...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_content(HTML_CONTENT, wait_until="networkidle")
        page.pdf(
            path=OUTPUT_PDF_PATH,
            format="A4",
            print_background=True,
            margin={"top": "12mm", "bottom": "15mm", "left": "12mm", "right": "12mm"}
        )
        browser.close()
    print(f"PDF Successfully Generated: {OUTPUT_PDF_PATH}")

if __name__ == "__main__":
    generate_pdf()
