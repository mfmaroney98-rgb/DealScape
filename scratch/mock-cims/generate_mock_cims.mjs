import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import OpenAI from 'file:///C:/DealScape/node_modules/openai/index.mjs';
import * as pdfjsLib from 'file:///C:/DealScape/node_modules/pdfjs-dist/legacy/build/pdf.mjs';

const envContent = fs.readFileSync('C:/DealScape/.env', 'utf8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
}

const openai = new OpenAI({ apiKey: env.VITE_OPENAI_API_KEY });
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_DIR = 'C:\\DealScape\\scratch\\mock-cims';
const HTML_DIR = path.join(BASE_DIR, 'html');
const PDF_DIR = path.join(BASE_DIR, 'pdfs');

fs.mkdirSync(HTML_DIR, { recursive: true });
fs.mkdirSync(PDF_DIR, { recursive: true });

// 5 Ground-Truth Deal Profiles covering all 5 layout archetypes & DealScape buyer criteria
const DEALS = [
  {
    id: 'deal1_ib_deck',
    archetype: 'IB Slide Deck (Landscape 16:9)',
    target_buyer: 'Zenda Capital Management - Early Stage Technology',
    ground_truth: {
      seller_name: 'Apex ColdChain Analytics Inc.',
      year_founded: 2019,
      employees_count: 58,
      legal_entity: 'C-Corp',
      locations: ['US:Texas'],
      naics_codes: ['5132', '5415'],
      pref_transaction_type: ['Acquisition of Majority Stake', 'Minority Equity Raise'],
      is_founder_owned: true,
      financial_history: {
        'FY-2': { date: '2023-12-31', revenue: 7800000, gross_profit: 5850000, ebitda: 920000, capex: 180000 },
        'FY-1': { date: '2024-12-31', revenue: 10900000, gross_profit: 8390000, ebitda: 1740000, capex: 220000 },
        'FY0':  { date: '2025-12-31', revenue: 14200000, gross_profit: 11076000, ebitda: 2840000, capex: 280000 },
      }
    }
  },
  {
    id: 'deal2_broker_memo',
    archetype: 'LMM Business Broker Memo (2-Column Portrait)',
    target_buyer: 'DealScape Demo - Lower Middle Market Business Services',
    ground_truth: {
      seller_name: 'Heartland Commercial HVAC & Facilities Services LLC',
      year_founded: 2004,
      employees_count: 74,
      legal_entity: 'S-Corp',
      locations: ['US:Ohio'],
      naics_codes: ['5612', '2382'],
      pref_transaction_type: ['Total Sale'],
      is_founder_owned: true,
      financial_history: {
        'FY-2': { date: '2023-12-31', revenue: 7900000, gross_profit: 3318000, ebitda: 1420000, capex: 190000 },
        'FY-1': { date: '2024-12-31', revenue: 8800000, gross_profit: 3784000, ebitda: 1650000, capex: 210000 },
        'FY0':  { date: '2025-12-31', revenue: 9600000, gross_profit: 4128000, ebitda: 1850000, capex: 230000 },
      }
    }
  },
  {
    id: 'deal3_blind_teaser',
    archetype: '1-2 Page Blind Teaser (Margin-Only Financials)',
    target_buyer: 'Healthcare Services / B2B Managed Services Buyer',
    ground_truth: {
      seller_name: null,
      year_founded: 2013,
      employees_count: 112,
      legal_entity: null,
      locations: ['US:Tennessee'],
      naics_codes: ['6219', '5419'],
      pref_transaction_type: ['Total Sale', 'Acquisition of Majority Stake'],
      is_founder_owned: true,
      financial_history: {
        'FY-1': { date: '2024-12-31', revenue: 15200000, gross_profit: 9120000, ebitda: 3344000, capex: null },
        'FY0':  { date: '2025-12-31', revenue: 18500000, gross_profit: 11470000, ebitda: 4440000, capex: null },
      }
    }
  },
  {
    id: 'deal4_cpg_saas_style',
    archetype: 'Boutique Growth Memo (Omnichannel CPG Metrics)',
    target_buyer: 'DealScape Demo - Middle Market Consumer',
    ground_truth: {
      seller_name: 'Verdant Pet Nutrition Co.',
      year_founded: 2016,
      employees_count: 46,
      legal_entity: 'LLC',
      locations: ['US:Colorado'],
      naics_codes: ['3111', '4599'],
      pref_transaction_type: ['Recapitalization', 'Acquisition of Majority Stake'],
      is_founder_owned: true,
      financial_history: {
        'FY-2': { date: '2023-12-31', revenue: 21500000, gross_profit: 11610000, ebitda: 3225000, capex: 310000 },
        'FY-1': { date: '2024-12-31', revenue: 29800000, gross_profit: 16390000, ebitda: 5066000, capex: 420000 },
        'FY0':  { date: '2025-12-31', revenue: 38400000, gross_profit: 21504000, ebitda: 6912000, capex: 480000 },
      }
    }
  },
  {
    id: 'deal5_industrial_multisite',
    archetype: 'Industrial Multi-Site CIM (HQ vs Plants)',
    target_buyer: 'General Industrial / Aerospace Manufacturing',
    ground_truth: {
      seller_name: 'Great Lakes Precision Tooling Corp.',
      year_founded: 1998,
      employees_count: 215,
      legal_entity: 'C-Corp',
      locations: ['US:Wisconsin'],
      naics_codes: ['3327', '3364'],
      pref_transaction_type: ['Total Sale', 'Management Buyout'],
      is_family_owned: true,
      financial_history: {
        'FY-2': { date: '2023-12-31', revenue: 44100000, gross_profit: 14112000, ebitda: 7497000, capex: 2100000 },
        'FY-1': { date: '2024-12-31', revenue: 48500000, gross_profit: 15520000, ebitda: 8245000, capex: 2350000 },
        'FY0':  { date: '2025-12-31', revenue: 52000000, gross_profit: 17160000, ebitda: 9100000, capex: 2600000 },
      }
    }
  }
];

function renderHTML(deal) {
  switch (deal.id) {
    case 'deal1_ib_deck':
      return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        @page { size: 11in 6.2in; margin: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; color: #1e293b; }
        .slide { width: 11in; height: 6.2in; padding: 0.45in 0.6in; box-sizing: border-box; page-break-after: always; position: relative; background: #fff; }
        .cover { background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%); color: #fff; display: flex; flex-direction: column; justify-content: center; }
        .cover h1 { font-size: 36px; margin: 0 0 12px; }
        .cover p { font-size: 16px; color: #cbd5e1; margin: 4px 0; }
        .hdr { border-bottom: 3px solid #0284c7; padding-bottom: 8px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: baseline; }
        .hdr h2 { margin: 0; font-size: 22px; color: #0f172a; }
        .tag { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; }
        .grid { display: flex; gap: 20px; }
        .card { flex: 1; background: #f8fafc; border-left: 4px solid #0284c7; padding: 14px; border-radius: 4px; }
        .kpi-row { display: flex; gap: 16px; margin-bottom: 18px; }
        .kpi { flex: 1; background: #0f172a; color: #fff; padding: 14px; border-radius: 6px; text-align: center; }
        .kpi .val { font-size: 24px; font-weight: 700; color: #38bdf8; }
        .kpi .lbl { font-size: 11px; color: #cbd5e1; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 10px; }
        th, td { border-bottom: 1px solid #cbd5e1; padding: 9px 10px; text-align: right; }
        th:first-child, td:first-child { text-align: left; font-weight: 600; }
        th { background: #e2e8f0; color: #0f172a; }
        .ftr { position: absolute; bottom: 0.25in; left: 0.6in; right: 0.6in; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; }
      </style></head><body>
      <div class="slide cover">
        <div class="tag" style="color:#38bdf8;">CONFIDENTIAL INFORMATION MEMORANDUM | FEBRUARY 2026</div>
        <h1>Apex ColdChain Analytics Inc.</h1>
        <p>Real-Time IoT &amp; Predictive Supply Chain SaaS for Pharmaceutical &amp; Food Logistics</p>
        <p style="margin-top:28px;font-size:13px;">Headquarters: Austin, Texas | Founded 2019 | Delaware C-Corp</p>
      </div>
      <div class="slide">
        <div class="hdr"><h2>Executive Summary &amp; Investment Highlights</h2><span class="tag">Confidential</span></div>
        <div class="kpi-row">
          <div class="kpi"><div class="val">$14.2M</div><div class="lbl">FY2025A Revenue (30% YoY)</div></div>
          <div class="kpi"><div class="val">$2.84M</div><div class="lbl">FY2025A EBITDA (20% Margin)</div></div>
          <div class="kpi"><div class="val">78%</div><div class="lbl">Gross Margin</div></div>
          <div class="kpi"><div class="val">58</div><div class="lbl">Full-Time Employees</div></div>
        </div>
        <div class="grid">
          <div class="card">
            <h3>Business Model</h3>
            <ul>
              <li>B2B SaaS platform with multi-year enterprise subscription contracts and 118% Net Revenue Retention.</li>
              <li>Serves pharmaceutical manufacturers, 3PL cold-storage operators, and biologics distributors.</li>
              <li>Asset-light, cloud-native deployment integrating with existing telematics hardware.</li>
            </ul>
          </div>
          <div class="card">
            <h3>Transaction Overview</h3>
            <ul>
              <li>Founded by two supply-chain engineers in 2019; 100% founder-owned.</li>
              <li>Seeking either an <strong>Acquisition of Majority Stake</strong> or a <strong>Minority Equity Raise</strong> to fund European expansion and AI route-optimization R&amp;D.</li>
            </ul>
          </div>
        </div>
        <div class="ftr"><span>Apex ColdChain Analytics Inc.</span><span>Slide 2</span></div>
      </div>
      <div class="slide">
        <div class="hdr"><h2>Historical Financial Performance ($ in thousands)</h2><span class="tag">Audited / Management</span></div>
        <table>
          <thead><tr><th>Metric ($ in 000s)</th><th>FY2023A</th><th>FY2024A</th><th>FY2025A</th><th>FY2026P (Projected)</th></tr></thead>
          <tbody>
            <tr><td>Total Revenue</td><td>$7,800</td><td>$10,900</td><td>$14,200</td><td>$19,500</td></tr>
            <tr><td>Gross Profit</td><td>$5,850</td><td>$8,390</td><td>$11,076</td><td>$15,405</td></tr>
            <tr><td>Adjusted EBITDA</td><td>$920</td><td>$1,740</td><td>$2,840</td><td>$4,290</td></tr>
            <tr><td>Capital Expenditures (CapEx)</td><td>$180</td><td>$220</td><td>$280</td><td>$350</td></tr>
          </tbody>
        </table>
        <p style="font-size:12px;color:#475569;margin-top:14px;">Note: FY2025A represents the most recently completed fiscal year ended December 31, 2025. FY2026P reflects management projections.</p>
        <div class="ftr"><span>Apex ColdChain Analytics Inc.</span><span>Slide 3</span></div>
      </div></body></html>`;

    case 'deal2_broker_memo':
      return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        @page { size: letter portrait; margin: 0.6in; }
        body { font-family: Georgia, 'Times New Roman', serif; color: #222; line-height: 1.45; font-size: 11pt; }
        .banner { border-bottom: 2px solid #1b4332; padding-bottom: 10px; margin-bottom: 18px; }
        .banner h1 { margin: 0; font-size: 20pt; color: #1b4332; }
        .cols { display: flex; gap: 22px; }
        .sidebar { width: 34%; background: #f4f7f5; border: 1px solid #cbd5e1; padding: 14px; font-family: Arial, sans-serif; font-size: 9.5pt; }
        .sidebar h3 { margin-top: 0; color: #1b4332; border-bottom: 1px solid #94a3b8; padding-bottom: 4px; }
        .sidebar .row { margin-bottom: 8px; }
        .sidebar .k { font-weight: bold; display: block; color: #475569; font-size: 8.5pt; text-transform: uppercase; }
        .main { width: 66%; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; font-family: Arial, sans-serif; font-size: 9.5pt; }
        th, td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: right; }
        th:first-child, td:first-child { text-align: left; }
        th { background: #1b4332; color: #fff; }
      </style></head><body>
      <div class="banner">
        <div style="font-family:Arial;font-size:9pt;color:#64748b;letter-spacing:1px;">CONFIDENTIAL BUSINESS PROFILE — FEBRUARY 2026</div>
        <h1>Heartland Commercial HVAC &amp; Facilities Services LLC</h1>
      </div>
      <div class="cols">
        <div class="sidebar">
          <h3>Quick Facts</h3>
          <div class="row"><span class="k">Headquarters</span>Columbus, Ohio</div>
          <div class="row"><span class="k">Year Established</span>2004</div>
          <div class="row"><span class="k">Legal Entity</span>Ohio S-Corp</div>
          <div class="row"><span class="k">Employees</span>74 Full-Time Technicians &amp; Staff</div>
          <div class="row"><span class="k">FY2025 Revenue</span>$9,600,000</div>
          <div class="row"><span class="k">FY2025 Adjusted EBITDA</span>$1,850,000</div>
          <div class="row"><span class="k">Transaction Type</span>Total Sale (100% Asset/Equity Exit)</div>
          <div class="row"><span class="k">Reason for Sale</span>Founder Retirement</div>
        </div>
        <div class="main">
          <h2 style="margin-top:0;color:#1b4332;">Company Overview</h2>
          <p>Founded in 2004, Heartland Commercial HVAC &amp; Facilities Services is a premier provider of commercial mechanical maintenance, preventative HVAC servicing, and building automation support across Central Ohio.</p>
          <p>Approximately 68% of revenue is derived from recurring multi-year preventative maintenance contracts with regional hospital networks, school districts, and Class-A office parks. The business is 100% founder-owned and operated, and the owner is seeking a full exit due to retirement.</p>
          <h3>Financial Summary &amp; Add-Backs</h3>
          <table>
            <thead><tr><th>Fiscal Year Ended Dec 31</th><th>2023A</th><th>2024A</th><th>2025A</th></tr></thead>
            <tbody>
              <tr><td>Revenue</td><td>$7,900,000</td><td>$8,800,000</td><td>$9,600,000</td></tr>
              <tr><td>Gross Profit</td><td>$3,318,000</td><td>$3,784,000</td><td>$4,128,000</td></tr>
              <tr><td>Adjusted EBITDA</td><td>$1,420,000</td><td>$1,650,000</td><td>$1,850,000</td></tr>
              <tr><td>CapEx</td><td>$190,000</td><td>$210,000</td><td>$230,000</td></tr>
            </tbody>
          </table>
        </div>
      </div></body></html>`;

    case 'deal3_blind_teaser':
      return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        @page { size: letter portrait; margin: 0.65in; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111827; font-size: 10.5pt; line-height: 1.45; }
        .top { background: #1e293b; color: #fff; padding: 18px 22px; border-radius: 4px; margin-bottom: 18px; }
        .top h1 { margin: 0; font-size: 18pt; }
        .top p { margin: 4px 0 0; color: #94a3b8; font-size: 10pt; }
        .box { border: 1px solid #d1d5db; padding: 14px; border-radius: 4px; margin-bottom: 16px; background: #f9fafb; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border-bottom: 1px solid #e5e7eb; padding: 8px; text-align: right; }
        th:first-child, td:first-child { text-align: left; }
      </style></head><body>
      <div class="top">
        <h1>BLIND TEASER: Healthcare Revenue Cycle Managed Services Provider</h1>
        <p>Confidential Investment Opportunity | Dated February 2026 | Strictly Private</p>
      </div>
      <p><strong>Overview:</strong> Headquartered in Nashville, Tennessee, the Company (founded in 2013) is a specialized B2B managed services provider delivering outsourced medical billing, coding compliance, and revenue cycle management to regional hospitals and multi-site healthcare systems. With 112 employees, the Company operates on multi-year service contracts with high switching costs.</p>
      <div class="box">
        <strong>Transaction Mandate:</strong> The founder-owners are exploring a <strong>Total Sale</strong> or <strong>Acquisition of Majority Stake</strong> to partner with a strategic or private equity acquirer.
      </div>
      <h3>Financial Highlights</h3>
      <table>
        <thead><tr><th>Metric</th><th>FY2024A (Ended 12/31/24)</th><th>FY2025A (Ended 12/31/25)</th></tr></thead>
        <tbody>
          <tr><td>Annual Revenue</td><td>$15.2M</td><td>$18.5M</td></tr>
          <tr><td>Gross Profit Margin</td><td>60.0%</td><td>62.0%</td></tr>
          <tr><td>Adjusted EBITDA Margin</td><td>22.0%</td><td>24.0%</td></tr>
        </tbody>
      </table>
      </body></html>`;

    case 'deal4_cpg_saas_style':
      return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        @page { size: letter portrait; margin: 0.6in; }
        body { font-family: 'Segoe UI', sans-serif; color: #1f2937; font-size: 10.5pt; line-height: 1.45; }
        .hdr { border-left: 6px solid #7c3aed; padding-left: 14px; margin-bottom: 20px; }
        .hdr h1 { margin: 0; font-size: 21pt; color: #4c1d95; }
        .metrics { display: flex; gap: 12px; margin-bottom: 18px; }
        .m { flex: 1; background: #f5f3ff; border: 1px solid #ddd6fe; padding: 12px; border-radius: 6px; text-align: center; }
        .m b { display: block; font-size: 15pt; color: #5b21b6; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: right; }
        th:first-child, td:first-child { text-align: left; }
        th { background: #4c1d95; color: #fff; }
      </style></head><body>
      <div class="hdr">
        <h1>Verdant Pet Nutrition Co.</h1>
        <div>Confidential Information Memorandum | Denver, Colorado | February 2026</div>
      </div>
      <div class="metrics">
        <div class="m"><b>$38.4M</b>FY25A Revenue</div>
        <div class="m"><b>$6.91M</b>FY25A EBITDA</div>
        <div class="m"><b>56.0%</b>Gross Margin</div>
        <div class="m"><b>46</b>Employees</div>
      </div>
      <p><strong>Company Profile:</strong> Founded in 2016 and organized as a Colorado LLC, Verdant Pet Nutrition Co. is a fast-growing omnichannel CPG brand producing clean-label, veterinary-formulated pet supplements and functional nutrition. Products are sold via DTC e-commerce subscriptions (42% of sales) and wholesale distribution across Whole Foods, Target, and specialty pet retailers (58% of sales) utilizing asset-light co-manufacturing and 3PL fulfillment.</p>
      <p><strong>Transaction Structure:</strong> The founder-owned leadership team is seeking a <strong>Recapitalization</strong> or <strong>Acquisition of Majority Stake</strong> to accelerate national grocery and club-store expansion.</p>
      <h3>Historical Financials ($ in millions, except where noted)</h3>
      <table>
        <thead><tr><th>Fiscal Year (Ended Dec 31)</th><th>FY2023A</th><th>FY2024A</th><th>FY2025A</th></tr></thead>
        <tbody>
          <tr><td>Net Revenue ($M)</td><td>$21.50M</td><td>$29.80M</td><td>$38.40M</td></tr>
          <tr><td>Gross Profit ($M)</td><td>$11.61M</td><td>$16.39M</td><td>$21.504M</td></tr>
          <tr><td>Adjusted EBITDA ($M)</td><td>$3.225M</td><td>$5.066M</td><td>$6.912M</td></tr>
          <tr><td>CapEx ($M)</td><td>$0.31M</td><td>$0.42M</td><td>$0.48M</td></tr>
        </tbody>
      </table></body></html>`;

    case 'deal5_industrial_multisite':
      return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        @page { size: letter portrait; margin: 0.6in; }
        body { font-family: Calibri, Arial, sans-serif; color: #1e293b; font-size: 10.5pt; line-height: 1.45; }
        .top { border-top: 5px solid #b45309; border-bottom: 1px solid #cbd5e1; padding: 12px 0; margin-bottom: 16px; }
        .top h1 { margin: 0; font-size: 20pt; color: #78350f; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10pt; }
        th, td { border: 1px solid #cbd5e1; padding: 7px 9px; text-align: right; }
        th:first-child, td:first-child { text-align: left; }
        th { background: #fef3c7; color: #78350f; }
      </style></head><body>
      <div class="top">
        <h1>Great Lakes Precision Tooling Corp.</h1>
        <div>Confidential Information Memorandum | Aerospace &amp; Defense CNC Manufacturing | February 2026</div>
      </div>
      <p><strong>Executive Summary:</strong> Established in 1998 as a Wisconsin C-Corp, Great Lakes Precision Tooling Corp. is a family-owned precision CNC machining and mission-critical aerospace component manufacturer employing 215 skilled machinists and engineers. The second-generation family owners are pursuing a <strong>Total Sale</strong> or <strong>Management Buyout</strong>.</p>
      <h3>Facility Footprint</h3>
      <table>
        <thead><tr><th>Facility</th><th>Location</th><th>Square Footage</th><th>Primary Function</th></tr></thead>
        <tbody>
          <tr><td>Corporate Headquarters &amp; Main Plant</td><td>Milwaukee, Wisconsin</td><td>85,000 sq ft</td><td>HQ, Engineering, 5-Axis CNC</td></tr>
          <tr><td>Michigan Machining Division</td><td>Grand Rapids, Michigan</td><td>42,000 sq ft</td><td>Defense Sub-Assemblies</td></tr>
          <tr><td>Indiana Distribution &amp; Finishing</td><td>Fort Wayne, Indiana</td><td>28,000 sq ft</td><td>Heat Treat &amp; Logistics</td></tr>
        </tbody>
      </table>
      <h3>Historical Financial Summary (Years Ended December 31)</h3>
      <table>
        <thead><tr><th>Metric</th><th>FY2023A</th><th>FY2024A</th><th>FY2025A</th></tr></thead>
        <tbody>
          <tr><td>Revenue</td><td>$44,100,000</td><td>$48,500,000</td><td>$52,000,000</td></tr>
          <tr><td>Gross Profit</td><td>$14,112,000</td><td>$15,520,000</td><td>$17,160,000</td></tr>
          <tr><td>EBITDA</td><td>$7,497,000</td><td>$8,245,000</td><td>$9,100,000</td></tr>
          <tr><td>Capital Expenditures (CapEx)</td><td>$2,100,000</td><td>$2,350,000</td><td>$2,600,000</td></tr>
        </tbody>
      </table></body></html>`;
  }
}

async function extractPdfText(pdfPath) {
  const buf = fs.readFileSync(pdfPath);
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf), verbosity: 0 }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    fullText += tc.items.map(it => it.str).join(' ') + '\n';
  }
  return fullText;
}

async function runExtraction(text) {
  const aiSrc = fs.readFileSync('C:/DealScape/src/services/aiService.js', 'utf8');
  const match = aiSrc.match(/async parseListingDocument\(text\) \{([\s\S]*?)const response = await openai/);
  const fn = new Function('text', match[1] + '\nreturn prompt;');
  const prompt = fn(text);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });
  return JSON.parse(response.choices[0].message.content);
}

async function main() {
  const results = [];
  for (const deal of DEALS) {
    const htmlPath = path.join(HTML_DIR, `${deal.id}.html`);
    const pdfPath = path.join(PDF_DIR, `${deal.id}.pdf`);
    fs.writeFileSync(htmlPath, renderHTML(deal), 'utf8');

    // Render HTML -> PDF via headless Edge
    execFileSync(EDGE_PATH, [
      '--headless',
      '--disable-gpu',
      '--no-pdf-header-footer',
      `--print-to-pdf=${pdfPath}`,
      `file:///${htmlPath.replace(/\\/g, '/')}`
    ], { stdio: 'ignore' });

    const text = await extractPdfText(pdfPath);
    const extracted = await runExtraction(text);

    const gt = deal.ground_truth;
    const fy0RevOk = extracted.financial_history?.FY0?.revenue === gt.financial_history.FY0.revenue;
    const fy0EbitdaOk = extracted.financial_history?.FY0?.ebitda === gt.financial_history.FY0.ebitda;
    const locOk = JSON.stringify(extracted.locations) === JSON.stringify(gt.locations);
    const entityOk = extracted.legal_entity === gt.legal_entity;

    console.log(`\n=== ${deal.id} (${deal.archetype}) ===`);
    console.log(`  PDF: ${pdfPath} (${text.length} chars)`);
    console.log(`  seller_name: ${extracted.seller_name} (expected: ${gt.seller_name}) | anon: "${extracted.seller_anon_name}"`);
    console.log(`  locations: ${JSON.stringify(extracted.locations)} (expected: ${JSON.stringify(gt.locations)}) -> ${locOk ? 'PASS' : 'MISS'}`);
    console.log(`  legal_entity: ${extracted.legal_entity} (expected: ${gt.legal_entity}) -> ${entityOk ? 'PASS' : 'MISS'}`);
    console.log(`  FY0 revenue: ${extracted.financial_history?.FY0?.revenue} (expected: ${gt.financial_history.FY0.revenue}) -> ${fy0RevOk ? 'PASS' : 'MISS'}`);
    console.log(`  FY0 ebitda:  ${extracted.financial_history?.FY0?.ebitda} (expected: ${gt.financial_history.FY0.ebitda}) -> ${fy0EbitdaOk ? 'PASS' : 'MISS'}`);
    console.log(`  naics: ${JSON.stringify(extracted.naics_codes)} | tx_type: ${JSON.stringify(extracted.pref_transaction_type)}`);

    results.push({ id: deal.id, archetype: deal.archetype, target_buyer: deal.target_buyer, ground_truth: gt, extracted });
  }

  fs.writeFileSync(path.join(BASE_DIR, 'eval_results.json'), JSON.stringify(results, null, 2), 'utf8');
  console.log('\nSaved full evaluation results to:', path.join(BASE_DIR, 'eval_results.json'));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
