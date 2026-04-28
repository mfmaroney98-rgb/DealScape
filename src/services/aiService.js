import OpenAI from 'openai';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // For prototyping only. Move to Edge Function for production.
});

export const aiService = {
  /**
   * Extracts text from a PDF file.
   */
  async extractTextFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }

    return fullText;
  },

  /**
   * Parses the text from a Teaser/CIM and returns structured listing data.
   */
  async parseListingDocument(text) {
    const prompt = `
You are an expert M&A analyst. Extract the following business details from the provided Teaser/CIM text.
Return the result as a strict JSON object matching exactly this schema:

{
  "seller_name": "string or null (the actual name of the company, e.g. 'Acme Manufacturing LLC')",
  "seller_anon_name": "string or null (e.g., 'Project Apollo' or 'Project Falcon')",
  "employees_count": number or null,
  "year_founded": number (YYYY) or null,
  "legal_entity": "string or null (Allowed values: 'Sole Proprietorship', 'LLC', 'S-Corp', 'C-Corp', 'General Partnership', 'LP', 'LLP', 'PLLC', 'PC', 'Trust', 'Nonprofit', 'Other')",
  "keywords": {
    "business_model": ["string (1-2 phrases)"],
    "industry": ["string (1-3 phrases)"],
    "revenue_model": ["string (1-2 phrases)"],
    "customer_type": ["string (1-2 phrases)"],
    "operational_model": ["string (1-2 phrases)"],
    "differentiation": ["string (1-2 phrases)"],
    "end_market": ["string (1-2 phrases)"],
    "reason_for_sale": ["string (1-2 phrases)"]
  },
  "pref_transaction_type": ["Total Sale", "Acquisition of Majority Stake", "Acquisition of Minority Stake", "Equity Raise", "Debt Raise", "Divestiture", "Recapitalization", "Restructuring"] or empty array,
  "is_founder_owned": boolean,
  "is_female_owned": boolean,
  "is_minority_owned": boolean,
  "is_family_owned": boolean,
  "is_operator_owned": boolean,
  "financial_history": {
    "FY-2": { "date": "YYYY-MM-DD", "revenue": number, "gross_profit": number, "ebitda": number, "ebit": number, "net_income": number, "capex": number },
    "FY-1": { "date": "YYYY-MM-DD", "revenue": number, "gross_profit": number, "ebitda": number, "ebit": number, "net_income": number, "capex": number },
    "FY0": { "date": "YYYY-MM-DD", "revenue": number, "gross_profit": number, "ebitda": number, "ebit": number, "net_income": number, "capex": number },
    "LTM": { "date": "YYYY-MM-DD", "revenue": number, "gross_profit": number, "ebitda": number, "ebit": number, "net_income": number, "capex": number }
  }
}

Important Rules:
1. Extract ALL absolute financial metrics (Revenue, Gross Profit, EBITDA, EBIT, Net Income, and CapEx). IMPORTANT: Pay close attention to unit scales (e.g. "in thousands", "K", "M", "B", "Millions"). You MUST expand all financials into their full, un-abbreviated integer values. For example, if the document says "$5.2M" or "5,200 (in thousands)", you must output the integer 5200000. Never output "5.2" for 5 million.
2. If the document provides margins (e.g., "20% EBITDA Margin") instead of absolute values, calculate the absolute value (e.g., Revenue * 0.20) and put that in the JSON. The system relies on absolute numbers to generate the search filters.
3. If a value is genuinely not present and cannot be calculated, set it to null.
4. FY0 is the most recent completed fiscal year. FY-1 is the year before that. LTM is the Last Twelve Months (if provided).
5. For legal_entity, ONLY use one of the allowed strings: 'Sole Proprietorship', 'LLC', 'S-Corp', 'C-Corp', 'General Partnership', 'LP', 'LLP', 'PLLC', 'PC', 'Trust', 'Nonprofit', 'Other'. IMPORTANT: You MUST prioritize the CIM for this field. If the exact entity type is not explicitly mentioned in the CIM, set it to null (even if it appears in the Teaser). IMPORTANT: 'Inc.' is NOT a legal entity for this purpose; if you see 'Inc.', you must determine if it is a C-Corp or S-Corp from the CIM text, or set to null if unclear.
6. Extract only the JSON, no markdown formatting or extra text.
7. If the document contains both a Teaser and a CIM, and there is conflicting or similar data (e.g., slightly different financial numbers or descriptions), ALWAYS prioritize and extract the data from the CIM. The CIM is the ultimate source of truth.

KEYWORD RULES:
Extract 10-16 sharp, discriminating phrases (1-4 words each) that capture the following signals. Do not infer or embellish. If a category is missing, return an empty array for that key.
INCLUDE:
- Business model descriptor (1-2): e.g. "B2B SaaS", "managed services provider", "staffing firm".
- Industry or vertical (1-3): Prefer narrow over broad. e.g. "dental practice management".
- Revenue model (1-2): e.g. "recurring revenue", "subscription", "project-based".
- Customer type (1-2): e.g. "enterprise", "SMB", "government", "franchise operators".
- Delivery/Operational model (1-2): e.g. "asset-light", "remote-first", "field service operations".
- Differentiation (1-2): e.g. "proprietary software", "sole-source contracts", "patented process".
- End market served (1-2): e.g. "hospitals and health systems", "mid-market CFOs".
- Reason for sale (1-2): e.g. "owner retirement", "growth capital needed", "strategic partnership sought".

EXCLUDE (Do NOT extract these):
- Generic business praise ("growth opportunity", "profitable company", "loyal customer base")
- Forward-looking growth claims ("significant upside", "untapped market", "expansion potential")
- Vague competitive language ("market leader", "industry-leading", "best-in-class")
- Technology stack specifics ("built on AWS", "Python backend")
- Any phrase that would apply to most businesses being sold.

Document Text:
${text.slice(0, 30000)} // Ensure we don't blow past token limits for huge PDFs
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    return JSON.parse(response.choices[0].message.content);
  },

  /**
   * Generates embeddings for semantic search matching.
   */
  async generateEmbedding(text) {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: text,
      encoding_format: "float",
      dimensions: 1536 // Max allowed by pgvector ivfflat is 2000
    });

    return response.data[0].embedding;
  }
};
