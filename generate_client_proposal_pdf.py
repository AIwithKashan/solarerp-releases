import os
from playwright.sync_api import sync_playwright

OUTPUT_PDF_PATH = r"C:\Users\Kashan Khan\Desktop\SolarERP_Enterprise_Client_Brochure.pdf"

HTML_CONTENT = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>SolarERP Enterprise System - Executive Business Proposal</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
  
  @page {
    size: A4;
    margin: 16mm 14mm 18mm 14mm;
    @bottom-right {
      content: "Page " counter(page);
      font-family: 'Inter', sans-serif;
      font-size: 8pt;
      font-weight: 600;
      color: #94a3b8;
    }
    @bottom-left {
      content: "SolarERP Enterprise Suite • AIwithKashan";
      font-family: 'Inter', sans-serif;
      font-size: 8pt;
      font-weight: 500;
      color: #94a3b8;
    }
  }

  body {
    font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
    color: #1e293b;
    line-height: 1.6;
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
    padding: 40px 30px;
    box-sizing: border-box;
    page-break-after: always;
    background: linear-gradient(145deg, #ffffff 0%, #f0fdf4 50%, #f8fafc 100%);
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    border-top: 6px solid #10b981;
  }

  .brand-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #0f172a;
    color: #10b981;
    padding: 6px 16px;
    border-radius: 30px;
    font-size: 10pt;
    font-weight: 800;
    letter-spacing: 0.8px;
    text-transform: uppercase;
  }

  .cover-header {
    margin-top: 40px;
  }

  .cover-title {
    font-size: 32pt;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.15;
    margin: 18px 0 12px 0;
    letter-spacing: -0.8px;
  }

  .cover-title span {
    color: #059669;
  }

  .cover-subtitle {
    font-size: 13.5pt;
    color: #047857;
    font-weight: 700;
    margin-bottom: 20px;
  }

  .cover-desc {
    font-size: 11pt;
    color: #475569;
    max-width: 620px;
    line-height: 1.65;
  }

  .highlight-card {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 12px;
    padding: 20px 24px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
    margin-top: 30px;
  }

  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    font-size: 9.5pt;
  }

  .meta-item strong {
    color: #64748b;
    display: block;
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    margin-bottom: 3px;
  }

  .meta-item span {
    color: #0f172a;
    font-weight: 700;
  }

  /* Section Styling */
  h1 {
    font-size: 16pt;
    font-weight: 800;
    color: #0f172a;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 8px;
    margin-top: 24px;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  h1 .icon-tag {
    background: #10b981;
    color: #ffffff;
    width: 26px;
    height: 26px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    font-size: 10.5pt;
    font-weight: 800;
  }

  h2 {
    font-size: 12pt;
    font-weight: 700;
    color: #0f172a;
    margin-top: 18px;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  p {
    margin: 0 0 10px 0;
    color: #334155;
    font-size: 9.5pt;
  }

  /* Feature Grid & Cards */
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin-bottom: 14px;
  }

  .card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 14px 16px;
    transition: all 0.2s ease;
  }

  .card-emerald {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
  }

  .card-blue {
    background: #f0f9ff;
    border: 1px solid #bae6fd;
  }

  .card-amber {
    background: #fffbeb;
    border: 1px solid #fde68a;
  }

  .card h3 {
    margin: 0 0 6px 0;
    font-size: 10.5pt;
    font-weight: 700;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .card p {
    font-size: 9pt;
    color: #475569;
    margin: 0;
    line-height: 1.5;
  }

  ul {
    margin: 6px 0 10px 18px;
    padding: 0;
  }

  li {
    margin-bottom: 5px;
    color: #334155;
    font-size: 9pt;
  }

  li strong {
    color: #0f172a;
  }

  /* Workflow Visual Box */
  .workflow-container {
    background: #0f172a;
    border-radius: 10px;
    padding: 16px 20px;
    margin: 16px 0;
    color: #ffffff;
  }

  .workflow-title {
    font-size: 10pt;
    font-weight: 700;
    color: #10b981;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 12px;
    text-align: center;
  }

  .workflow-steps {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .workflow-step {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 8px;
    padding: 10px;
    flex: 1;
    text-align: center;
  }

  .workflow-step .step-no {
    display: inline-block;
    background: #10b981;
    color: #0f172a;
    font-size: 7.5pt;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 4px;
    margin-bottom: 4px;
  }

  .workflow-step .step-title {
    font-size: 8.5pt;
    font-weight: 700;
    color: #f8fafc;
    display: block;
  }

  .workflow-step .step-desc {
    font-size: 7.5pt;
    color: #94a3b8;
    margin-top: 2px;
  }

  .workflow-arrow {
    color: #10b981;
    font-size: 14pt;
    font-weight: 900;
  }

  /* Clean Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0 16px 0;
    font-size: 9pt;
  }

  th {
    background: #f1f5f9;
    color: #0f172a;
    font-weight: 700;
    text-align: left;
    padding: 9px 12px;
    border-top: 1px solid #cbd5e1;
    border-bottom: 2px solid #cbd5e1;
  }

  td {
    padding: 8px 12px;
    border-bottom: 1px solid #e2e8f0;
    color: #334155;
    vertical-align: top;
  }

  tr:nth-child(even) td {
    background: #f8fafc;
  }

  .badge-tag {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 7.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .badge-green { background: #dcfce7; color: #15803d; }
  .badge-blue { background: #e0f2fe; color: #0369a1; }
  .badge-purple { background: #f3e8ff; color: #7e22ce; }
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover">
  <div>
    <div class="brand-pill">AIwithKashan Solutions</div>
    
    <div class="cover-header">
      <div class="cover-title">SOLAR<span>ERP</span><br>Enterprise Edition</div>
      <div class="cover-subtitle">All-in-One Commercial Management & Manufacturing Platform</div>
      <div class="cover-desc">
        A complete, unified software ecosystem engineered specifically for modern solar distributors, battery manufacturing labs, warranty repair centers, and import supply chain businesses.
      </div>
    </div>
  </div>

  <div class="highlight-card">
    <div class="meta-grid">
      <div class="meta-item">
        <strong>Software Architecture</strong>
        <span>Unified Multi-Department Cloud ERP</span>
      </div>
      <div class="meta-item">
        <strong>Prepared For</strong>
        <span>Executive Management & Stakeholders</span>
      </div>
      <div class="meta-item">
        <strong>Solution Architect</strong>
        <span>Kashan Khan (AIwithKashan)</span>
      </div>
      <div class="meta-item">
        <strong>Direct Contact</strong>
        <span>+92 334 1911680 • kashanyousaf45000@gmail.com</span>
      </div>
    </div>
  </div>
</div>

<!-- PAGE 1: THE SINGLE-PLATFORM VISION -->
<h1><span class="icon-tag">1</span> The Unified Business Platform</h1>

<p>
Modern solar and energy companies struggle with disjointed operations: separate spreadsheets for warranty claims, WhatsApp groups for parcel dispatches, manual paperwork in the battery lab, and disconnected accounting ledgers.
</p>

<p>
<strong>SolarERP Enterprise</strong> completely eliminates this fragmentation by bringing every single department into <strong>one unified, interconnected software</strong>.
</p>

<div class="grid-2">
  <div class="card card-emerald">
    <h3>✨ One-Time Data Entry</h3>
    <p>
      Customers, Dealers, and Installers are registered <strong>once</strong>. When a customer returns a product for warranty, Logistics, Technicians, and Accounts automatically access the exact same profile without re-typing any information.
    </p>
  </div>
  <div class="card card-blue">
    <h3>🔄 Automated Task Handoff</h3>
    <p>
      When Logistics receives a damaged unit, the system automatically creates a task in the Technician's queue. Once repaired, it immediately alerts Dispatch and updates Accounts in real-time.
    </p>
  </div>
</div>

<h2>Real-Time Interlinked Departmental Flow</h2>
<div class="workflow-container">
  <div class="workflow-title">End-to-End Operational Lifecycle</div>
  <div class="workflow-steps">
    <div class="workflow-step">
      <span class="step-no">STEP 1</span>
      <span class="step-title">Logistics Inward</span>
      <span class="step-desc">Parcel Receipt Logged</span>
    </div>
    <div class="workflow-arrow">➔</div>
    <div class="workflow-step">
      <span class="step-no">STEP 2</span>
      <span class="step-title">Lab Queue</span>
      <span class="step-desc">Auto-Assigned to Tech</span>
    </div>
    <div class="workflow-arrow">➔</div>
    <div class="workflow-step">
      <span class="step-no">STEP 3</span>
      <span class="step-title">Repair & Testing</span>
      <span class="step-desc">Parts & Cells Grading</span>
    </div>
    <div class="workflow-arrow">➔</div>
    <div class="workflow-step">
      <span class="step-no">STEP 4</span>
      <span class="step-title">Accounts Ledger</span>
      <span class="step-desc">Auto-Costing / Warranty</span>
    </div>
    <div class="workflow-arrow">➔</div>
    <div class="workflow-step">
      <span class="step-no">STEP 5</span>
      <span class="step-title">Dispatch</span>
      <span class="step-desc">Delivery Verification</span>
    </div>
  </div>
</div>

<hr style="border:0; border-top: 1px solid #e2e8f0; margin: 20px 0;">

<!-- PAGE 2: CORE BUSINESS MODULES -->
<h1><span class="icon-tag">2</span> Core Enterprise Modules Explained</h1>

<h2>1. Logistics & Dispatch Management</h2>
<ul>
  <li><strong>Inward Courier Receiving:</strong> Easily record incoming parcels from TCS, Leopards, or local cargo with tracking numbers, sender details, and photos of physical condition.</li>
  <li><strong>Digital Gate Passes:</strong> Generate verifiable digital gate passes for inward receiving and outward dispatch.</li>
  <li><strong>Automatic Technician Alerts:</strong> The moment a parcel is checked in, the lab technician gets notified to inspect the unit.</li>
</ul>

<h2>2. After-Sales & Warranty (RMA) Ticketing</h2>
<ul>
  <li><strong>Instant Warranty Lookup:</strong> Scan a serial number or barcode to immediately verify if an inverter, panel, or battery is under valid warranty.</li>
  <li><strong>Dealer & Installer Attribution:</strong> Clear records of which dealer sold the equipment and which installer commissioned it, preventing false claims.</li>
  <li><strong>Customer Status Portal:</strong> Provide dealers and customers with a live tracking link so they can see their repair progress without calling your office repeatedly.</li>
</ul>

<div class="page-break"></div>

<!-- PAGE 3: MANUFACTURING & IMPORTS -->
<h1><span class="icon-tag">3</span> Battery Manufacturing & Import Supply Chain</h1>

<h2>3. Battery Lab & Assembly Line (Bill of Materials)</h2>
<p>
For businesses assembling Lithium/Tubular batteries, SolarERP manages the entire production cycle from raw cells to finished packaged units:
</p>

<div class="grid-2">
  <div class="card card-purple">
    <h3>🔋 Automatic Inventory Deduction</h3>
    <p>Define standard recipes (e.g. 16 Cells + 1 Smart BMS + 1 Casing = 1 Finished 48V Battery). Starting a batch automatically deducts raw parts from inventory.</p>
  </div>
  <div class="card card-emerald">
    <h3>📊 Cell Testing & Quality Logs</h3>
    <p>Record capacity testing (Ah), internal resistance (IR), and voltage balancing tests per battery pack for strict quality assurance.</p>
  </div>
</div>

<h2>4. Import, Container & Landed Cost Manager</h2>
<ul>
  <li><strong>Container Tracking:</strong> Monitor incoming shipments with Bill of Lading (BL), shipping line, port arrival dates, and customs clearance status.</li>
  <li><strong>True Landed Cost Per Watt:</strong> Automatically add ocean freight, port duties, demurrage, and clearance agent fees to the purchase price to calculate the <em>exact real cost</em> per watt or per panel.</li>
  <li><strong>Yearly Supply Forecasting:</strong> Smart charts that predict inventory demand across summer and winter seasons.</li>
</ul>

<hr style="border:0; border-top: 1px solid #e2e8f0; margin: 20px 0;">

<!-- PAGE 4: ACCOUNTS & DATA SECURITY -->
<h1><span class="icon-tag">4</span> Financials, Accounts & Bank-Grade Security</h1>

<h2>5. Parallel Financial Accounting Engine</h2>
<ul>
  <li><strong>Automated Double-Entry Bookkeeping:</strong> Sales, purchases, supplier payments, and repair costs automatically update financial ledgers with zero manual journal entries required.</li>
  <li><strong>Customer & Dealer Udhaar Tracking:</strong> Clear running balances showing exact credit limits, pending collections, and aging reports.</li>
  <li><strong>1-Click Professional Reports:</strong> Generate Profit & Loss, Daily Cash Book, Stock Valuation, and Customer Ledgers as clean, branded PDF downloads.</li>
</ul>

<h2>6. Enterprise Cloud Hosting & Data Security</h2>
<p>
Your business data is the most valuable asset of your company. SolarERP uses enterprise-grade security protocols:
</p>

<table>
  <thead>
    <tr>
      <th>Security Feature</th>
      <th>How It Protects Your Business</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>256-Bit SSL Encryption</strong></td>
      <td>All data transmitted between your offices and servers is completely encrypted, protecting you from hacking and data theft.</td>
    </tr>
    <tr>
      <td><strong>Automated Daily Cloud Backups</strong></td>
      <td>Automated daily backups ensure your business records are safe, even if an office computer crashes or gets stolen.</td>
    </tr>
    <tr>
      <td><strong>Role-Based Access Control</strong></td>
      <td>Staff members only see what they need (e.g., technicians cannot view company bank accounts, and sales staff cannot alter purchase bills).</td>
    </tr>
    <tr>
      <td><strong>Multi-User Simultaneous Access</strong></td>
      <td>Dozens of staff members across multiple branches can use the software at the exact same second without lag or file locks.</td>
    </tr>
  </tbody>
</table>

<div class="page-break"></div>

<!-- PAGE 5: IMPLEMENTATION & NEXT STEPS -->
<h1><span class="icon-tag">5</span> Implementation Plan & Commercial Value</h1>

<h2>Turnkey Delivery Roadmap</h2>
<p>
We follow a disciplined, transparent 6-phase deployment roadmap to ensure your software is deployed smoothly without disrupting daily shop operations:
</p>

<table>
  <thead>
    <tr>
      <th style="width: 15%;">Phase</th>
      <th style="width: 55%;">Operational Milestone</th>
      <th style="width: 30%;">Deliverable</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Phase 1</strong></td>
      <td>Secure Cloud Database & Master User Roles setup.</td>
      <td>Secure Cloud Environment</td>
    </tr>
    <tr>
      <td><strong>Phase 2</strong></td>
      <td>Unified Customer, Dealer, Installer & Product Catalog setup.</td>
      <td>Single-Entry Master Registry</td>
    </tr>
    <tr>
      <td><strong>Phase 3</strong></td>
      <td>Logistics Receiving & After-Sales (RMA) Ticketing System.</td>
      <td>Working Task Workflow</td>
    </tr>
    <tr>
      <td><strong>Phase 4</strong></td>
      <td>Battery Lab Manufacturing (BOM) & Quality Testing module.</td>
      <td>Battery Assembly Engine</td>
    </tr>
    <tr>
      <td><strong>Phase 5</strong></td>
      <td>Import Container Manager, Landed Costing & Financial Ledgers.</td>
      <td>Complete Financials & Reports</td>
    </tr>
    <tr>
      <td><strong>Phase 6</strong></td>
      <td>Staff User Training, Live Data Migration & Production Launch.</td>
      <td>Final Go-Live & Handover</td>
    </tr>
  </tbody>
</table>

<div class="card card-emerald" style="margin-top: 24px; padding: 20px;">
  <h3 style="color: #065f46; font-size: 11pt;">Ready to Transform Your Business Operations?</h3>
  <p style="color: #047857; font-size: 9.5pt; margin-top: 4px;">
    SolarERP Enterprise provides the speed, accuracy, and peace of mind needed to scale your solar and battery enterprise effortlessly. Let's schedule a brief kickoff call to finalize your workflow specifications.
  </p>
  <div style="margin-top: 14px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #a7f3d0; padding-top: 12px;">
    <div>
      <strong style="color: #0f172a; display: block; font-size: 9.5pt;">Kashan Khan • Lead Solution Architect</strong>
      <span style="color: #059669; font-size: 8.5pt; font-weight: 600;">AIwithKashan Enterprise Solutions</span>
    </div>
    <div style="text-align: right;">
      <strong style="color: #0f172a; display: block; font-size: 9.5pt;">WhatsApp / Direct: +92 334 1911680</strong>
      <span style="color: #64748b; font-size: 8.5pt;">kashanyousaf45000@gmail.com</span>
    </div>
  </div>
</div>

</body>
</html>
"""

def generate_pdf():
    print("Generating Professional Light-Theme Client Brochure PDF...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_content(HTML_CONTENT, wait_until="networkidle")
        page.pdf(
            path=OUTPUT_PDF_PATH,
            format="A4",
            print_background=True,
            margin={"top": "12mm", "bottom": "14mm", "left": "12mm", "right": "12mm"}
        )
        browser.close()
    print(f"Brochure PDF Generated Successfully at: {OUTPUT_PDF_PATH}")

if __name__ == "__main__":
    generate_pdf()
