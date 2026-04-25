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
  "seller_anon_name": "string or null (e.g., 'Project Apollo' or 'Project Falcon')",
  "employees_count": number or null,
  "year_founded": number (YYYY) or null,
  "legal_entity": "string or null (e.g., 'LLC', 'S-Corp', 'C-Corp', 'Sole Proprietorship', 'Partnership')",
  "keywords": array of 8-15 relevant industry/business keywords,
  "summary": "A 1-2 paragraph executive summary of the business.",
  "pref_transaction_type": ["Total Sale", "Acquisition of Majority Stake", "Acquisition of Minority Stake", "Equity Raise", "Debt Raise", "Divestiture", "Recapitalization", "Restructuring"] or empty array,
  "is_founder_owned": boolean,
  "is_female_owned": boolean,
  "is_minority_owned": boolean,
  "is_family_owned": boolean,
  "is_operator_owned": boolean,
  "financial_history": {
    "FY-2": { "date": "YYYY-MM-DD", "revenue": number, "gross_profit": number, "ebitda": number, "ebit": number, "net_income": number },
    "FY-1": { "date": "YYYY-MM-DD", "revenue": number, "gross_profit": number, "ebitda": number, "ebit": number, "net_income": number },
    "FY0": { "date": "YYYY-MM-DD", "revenue": number, "gross_profit": number, "ebitda": number, "ebit": number, "net_income": number },
    "LTM": { "date": "YYYY-MM-DD", "revenue": number, "gross_profit": number, "ebitda": number, "ebit": number, "net_income": number }
  }
}

Important Rules:
1. Extract ALL absolute financial metrics (Revenue, Gross Profit, EBITDA, EBIT, Net Income).
2. If the document provides margins (e.g., "20% EBITDA Margin") instead of absolute values, calculate the absolute value (e.g., Revenue * 0.20) and put that in the JSON. The system relies on absolute numbers to generate the search filters.
3. If a value is genuinely not present and cannot be calculated, set it to null.
4. FY0 is the most recent completed fiscal year. FY-1 is the year before that. LTM is the Last Twelve Months (if provided).
5. For legal_entity, extract the corporate structure type (e.g., LLC, S-Corp, C-Corp), NOT the name of the company.
6. Extract only the JSON, no markdown formatting or extra text.

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
