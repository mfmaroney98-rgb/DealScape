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
   * Extracts text from a PDF file, falling back to GPT-6 Luna vision OCR for scanned PDFs.
   */
  async extractTextFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    // Pass verbosity: 0 to suppress noisy console warnings
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, verbosity: 0 }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }

    const avgCharsPerPage = fullText.trim().length / Math.max(1, pdf.numPages);
    if (avgCharsPerPage >= 40) {
      return fullText;
    }

    console.info(`[PDF] Low text density (${avgCharsPerPage.toFixed(1)} chars/page); running vision OCR fallback on ${pdf.numPages} pages.`);
    return this._extractTextFromScannedPDF(pdf);
  },

  /**
   * Renders scanned PDF pages to images and transcribes them via GPT-6 Luna vision.
   */
  async _extractTextFromScannedPDF(pdf) {
    if (typeof document === 'undefined') {
      throw new Error('Scanned PDF vision fallback requires a browser DOM canvas.');
    }

    const batchSize = 10;
    const maxPages = Math.min(pdf.numPages, 80);
    const pageBatches = [];

    for (let start = 1; start <= maxPages; start += batchSize) {
      const end = Math.min(start + batchSize - 1, maxPages);
      const images = [];

      for (let pageNum = start; pageNum <= end; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext('2d');

        await page.render({ canvasContext: ctx, viewport }).promise;
        images.push(canvas.toDataURL('image/jpeg', 0.8));

        canvas.width = 0;
        canvas.height = 0;
      }

      pageBatches.push({ start, end, images });
    }

    const results = [];
    const concurrency = 3;
    for (let i = 0; i < pageBatches.length; i += concurrency) {
      const chunk = pageBatches.slice(i, i + concurrency);
      const chunkTexts = await Promise.all(
        chunk.map(async ({ start, end, images }) => {
          const response = await openai.chat.completions.create({
            model: 'gpt-6-luna',
            reasoning_effort: 'none',
            temperature: 0,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `Transcribe all text, headings, footnotes, and financial tables from these PDF pages (pages ${start}-${end}) in reading order. Preserve exact numbers, unit scales (e.g., "$ in thousands", "$ in millions"), table column headers/years, and dates.`
                  },
                  ...images.map(url => ({
                    type: 'image_url',
                    image_url: { url, detail: 'high' }
                  }))
                ]
              }
            ]
          });
          return response.choices[0].message.content || '';
        })
      );
      results.push(...chunkTexts);
    }

    return results.join('\n\n');
  },

  /**
   * Parses the text from a Teaser/CIM and returns structured listing data.
   */
  async parseListingDocument(text) {
    const maxChars = 200000;
    const documentText = text.length <= maxChars
      ? text
      : `${text.slice(0, 120000)}\n\n[... middle section truncated due to length ...]\n\n${text.slice(-80000)}`;

    const prompt = `
You are an expert M&A analyst. Extract the following business details from the provided Teaser/CIM text.
Return the result as a strict JSON object matching exactly this schema:

{
  "seller_name": "string or null (the actual name of the company, e.g. 'Acme Manufacturing LLC')",
  "seller_anon_name": "string (ALWAYS provide a very short, 3-7 word anonymous descriptive title in Title Case that captures what the company does without using a 'Project X' code name or any real company names/trademarks, e.g., 'Medical Device Equipment Manufacturer' or 'Cloud Dental Scheduling SaaS Provider'. Never return null.)",
  "summary": "string or null (A concise, 2-4 sentence anonymous executive summary written for potential M&A buyers. Highlight the core business model, key value proposition, and primary target market while strictly omitting any real company names or identifying trademarks. E.g., 'A leading developer of cloud-based scheduling software for dental clinics, serving over 500 active practices across the US with a highly predictable, recurring subscription revenue model.')",
  "employees_count": number or null,
  "year_founded": number (YYYY) or null,
  "legal_entity": "string or null (Allowed values: 'Sole Proprietorship', 'LLC', 'S-Corp', 'C-Corp', 'General Partnership', 'LP', 'LLP', 'PLLC', 'PC', 'Trust', 'Nonprofit', 'Other')",
  "naics_codes": ["string (up to three 4-digit 2022 NAICS codes matching the business, e.g. '5415')"],
  "locations": ["string (Format: 'CC:StateName', e.g., 'US:New York' or 'CA:Ontario', representing only the single primary headquarters location of the company. CC must be the 2-letter country code in uppercase, and StateName must be the official full name of the state or province in title case. If the document specifies a city like 'Chicago', you must map it to the state 'US:Illinois')"],
  "keywords": {
    "industry": ["string (1-3 phrases)"],
    "business_model": ["string (1-2 phrases)"],
    "revenue_model": ["string (1-2 phrases)"],
    "customer_type": ["string (1-2 phrases)"],
    "operational_model": ["string (1-2 phrases)"],
    "differentiation": ["string (1-2 phrases)"],
    "end_market": ["string (1-2 phrases)"],
    "reason_for_sale": ["string (1-2 phrases)"]
  },
  "pref_transaction_type": ["Total Sale", "Acquisition of Majority Stake", "Management Buyout", "Merger", "Divestiture", "Asset Sale", "Acquisition of Minority Stake", "Minority Equity Raise", "SAFE / Convertible Note", "Angel / Pre-Seed Round", "Seed Round", "Series A", "Series B", "Series C & Beyond", "Debt Raise", "Mezzanine Financing", "Bridge Loan", "Recapitalization", "Restructuring", "Distressed Sale", "Joint Venture / Strategic Alliance"] or empty array,
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
4. FY0 is the most recent COMPLETED actual fiscal year relative to the document's publication date. FY-1 is the year before FY0, and FY-2 is two years before FY0 (all three must have distinct, consecutive years; never repeat the same year). LTM is ONLY for an explicitly stated "LTM" or "TTM" (Last/Trailing Twelve Months) figure—otherwise set LTM to null. Pay strict attention to "A" (Actual) vs. "E"/"P" (Estimated/Projected) labels and the document date (e.g., if a CIM is dated August 2016 and shows 2015A and 2016E/P–2021P, FY0 is 2015, NOT 2016). NEVER populate projected/estimated ("E" or "P", such as "2021P") numbers into FY-2, FY-1, FY0, or LTM.
5. For legal_entity, ONLY use one of the allowed strings: 'Sole Proprietorship', 'LLC', 'S-Corp', 'C-Corp', 'General Partnership', 'LP', 'LLP', 'PLLC', 'PC', 'Trust', 'Nonprofit', 'Other'. IMPORTANT: You MUST prioritize the CIM for this field. If the exact entity type is not explicitly mentioned in the CIM, set it to null (even if it appears in the Teaser). IMPORTANT: 'Inc.' or 'Corp.' is NOT a legal entity for this purpose, especially for Canadian, international, or publicly traded companies (e.g., TSX, TSX-V, NASDAQ, NYSE); do NOT guess 'C-Corp' or 'S-Corp' from 'Inc.' alone—set to null unless 'C-Corp' or 'S-Corp' is explicitly stated.
6. Extract only the JSON, no markdown formatting or extra text.
7. If the document contains both a Teaser and a CIM, and there is conflicting or similar data (e.g., slightly different financial numbers or descriptions), ALWAYS prioritize and extract the data from the CIM. The CIM is the ultimate source of truth.
8. Under "naics_codes", use strictly the official 2022 NAICS classification to determine up to three 4-digit codes that best represent this company. NEVER use deprecated 2017 codes (e.g., use '5132' for Software Publishers, NOT '5112'; use '4581' for Clothing Retail, NOT '4481'; use '4491' for Furniture Retail, NOT '4421'; use '5161' for Broadcasting, NOT '5151'). Only return valid numeric 4-digit strings.
9. For locations, extract ONLY the single primary headquarters location (do NOT include additional operating locations or facilities). Format each location strictly as "CC:StateName" (e.g., "US:California" for California, USA, or "CA:Ontario" for Ontario, Canada). You MUST resolve city names to their respective states (e.g., if the company is headquartered in "Houston, Texas", output "US:Texas"). If the headquarters location cannot be found, return an empty array.
10. For pref_transaction_type, you MUST ONLY output values from this exact list: ["Total Sale", "Acquisition of Majority Stake", "Management Buyout", "Merger", "Divestiture", "Asset Sale", "Acquisition of Minority Stake", "Minority Equity Raise", "SAFE / Convertible Note", "Angel / Pre-Seed Round", "Seed Round", "Series A", "Series B", "Series C & Beyond", "Debt Raise", "Mezzanine Financing", "Bridge Loan", "Recapitalization", "Restructuring", "Distressed Sale", "Joint Venture / Strategic Alliance"].
    Mapping guidelines:
    - Prefer specific rounds: If the text mentions a "Series A", output "Series A" (do NOT select generic "Minority Equity Raise").
    - Total Sale vs. Majority Stake: Only select "Total Sale" if 100% of the company/assets are explicitly being sold or a full exit is stated. If the owner is selling a majority portion but retaining equity, select "Acquisition of Majority Stake".
    - Strategic Partner / Ambiguous Transaction: If the document only mentions "seeking a partner" or a "potential strategic transaction" without specifying a buyout or equity sale, select "Joint Venture / Strategic Alliance" or return an empty array [].
    - Divestiture vs. Asset Sale: Select "Divestiture" for business unit spin-offs/carve-outs. Select "Asset Sale" for IP, equipment, or facility sales.
11. Ownership flags (is_founder_owned, is_female_owned, is_minority_owned, is_family_owned, is_operator_owned): Check whether the company is publicly traded (e.g., mentions an IPO, stock ticker, TSX, TSX-V, NYSE, NASDAQ). If it is a publicly traded company, set is_founder_owned and is_operator_owned to false unless majority founder/operator control is explicitly stated. Never guess ownership demographics; only set true when supported by the text.



KEYWORD RULES:
Extract 10-16 sharp, discriminating phrases (1-4 words each) that capture the following signals. Do not infer or embellish. If a category is missing, return an empty array for that key.
INCLUDE:
- Business model descriptor (1-2): e.g. "B2B SaaS", "managed services provider", "staffing firm".
- Industry or vertical (1-3): Prefer narrow over broad. e.g. "dental practice management".
- Revenue model (1-2): e.g. "recurring revenue", "subscription", "project-based".
- Customer type (1-2): e.g. "enterprise", "SMB", "government", "franchise operators".
- Delivery/Operational model (1-2): Include go-to-market/channel & deployment signals, e.g. "asset-light", "remote-first", "OEM channel partnerships", "cloud and on-premise".
- Differentiation (1-2): e.g. "proprietary software", "sole-source contracts", "patented process", "offline-capable".
- End market served (1-3): Capture ALL primary end markets mentioned, e.g. "K-12 education", "enterprise meeting rooms", "hospitals and health systems".
- Reason for sale (1-2): e.g. "owner retirement", "growth capital needed", "strategic partnership sought".

EXCLUDE (Do NOT extract these):
- Generic business praise ("growth opportunity", "profitable company", "loyal customer base")
- Forward-looking growth claims ("significant upside", "untapped market", "expansion potential")
- Vague competitive language ("market leader", "industry-leading", "best-in-class")
- Technology stack specifics ("built on AWS", "Python backend")
- Any phrase that would apply to most businesses being sold.

Document Text:
${documentText}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-6-luna",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      reasoning_effort: "low",
    });

    return JSON.parse(response.choices[0].message.content);
  },

  /**
   * Parses the text from a buyer investment criteria document and returns structured criteria data.
   */
  async parseBuyerCriteriaDocument(text) {
    const prompt = `
You are an expert M&A analyst. Extract the following investment criteria details from the provided buyer criteria/mandate text.
Return the result as a strict JSON object matching exactly this schema:

{
  "investment_criteria_name": "string or null (a descriptive name for this mandate, e.g. 'Project Apollo - Mid Market Software')",
  "naics_codes": ["string (up to three 2022 NAICS codes representing target industries. If the mandate is extremely broad, you may return 2-digit or 3-digit parent codes, e.g., '54' or '541'. Otherwise, return specific 4-digit codes, e.g., '5415')"],
  "financial_criteria": [
    { "metric": "string", "min": "string or null", "max": "string or null" }
  ],
  "keywords": {
    "industry": ["e.g. HealthTech, Industrials, FinTech"],
    "business_model": ["e.g. B2B SaaS, Managed Services, Asset-light"],
    "revenue_model": ["e.g. Subscription, Recurring, Transactional"],
    "customer_type": ["e.g. Fortune 500, SMB, B2G"],
    "operational_model": ["e.g. Remote-first, Field-based, 24/7 Operations"],
    "differentiation": ["e.g. Proprietary IP, High Switch Costs, Sole-source"],
    "end_market": ["e.g. Independent Clinics, Government Agencies, Pharma"],
    "reason_for_sale": ["e.g. Owner retirement, Growth capital needed, Spin-off"]
  },
  "pref_transaction_type": ["Total Sale", "Acquisition of Majority Stake", "Management Buyout", "Merger", "Divestiture", "Asset Sale", "Acquisition of Minority Stake", "Minority Equity Raise", "SAFE / Convertible Note", "Angel / Pre-Seed Round", "Seed Round", "Series A", "Series B", "Series C & Beyond", "Debt Raise", "Mezzanine Financing", "Bridge Loan", "Recapitalization", "Restructuring", "Distressed Sale", "Joint Venture / Strategic Alliance"] or empty array,
  "require_founder_owned": boolean,
  "require_female_owned": boolean,
  "require_minority_owned": boolean,
  "require_family_owned": boolean,
  "require_operator_owned": boolean
}

Important Rules:
1. For financial_criteria, metrics should be from this list: 'Revenue', 'Revenue Growth (YoY)', 'Revenue CAGR', 'Gross Profit', 'Gross Profit Margin', 'EBITDA', 'EBITDA Growth (YoY)', 'EBITDA Margin', 'EBIT', 'EBIT Margin', 'Net Income', 'Net Margin', 'Enterprise Value', 'Equity Value'.
2. Extract ALL absolute financial ranges (Min and Max). IMPORTANT: Pay close attention to unit scales (e.g. "in thousands", "K", "M", "B", "Millions"). You MUST expand all financials into their full, un-abbreviated integer values. For example, if the document says "$5.2M" or "5,200 (in thousands)", you must output the integer 5200000. Never output "5.2" for 5 million.
3. If a value is provided as a percentage (e.g. "20% EBITDA Margin"), extract it as the raw number (e.g. "20").
4. If a value is genuinely not present, set min/max to null.
5. Extract 10-16 sharp, discriminating phrases for the keywords categories. For the "industry" keywords specifically, you MUST extract EVERY single listed sector, sub-sector, sub-industry, niche, or specific sub-bullet point mentioned in the document. For example, if a main category like "Value-added Distribution" has sub-bullets like "Assembly, kitting, or configuration" and "Consumable and branded products", you MUST extract the parent category AND all of the sub-bullet points as separate entries in the industry array. Do not omit, summarize, or compress these focus areas.
6. Extract only the JSON, no markdown formatting or extra text.
7. Under "naics_codes", use strictly the official 2022 NAICS classification to determine up to three codes that best represent this buyer criteria (including all extracted sub-industries and sub-bullets). If the criteria is extremely broad (e.g. "any technology/software business" or "any manufacturing company"), return the broad 2-digit sector or 3-digit subsector code (e.g., '54', '513', or '31-33'). Otherwise, return specific 4-digit codes (e.g., '5132', '5415'). NEVER use deprecated 2017 codes (e.g., use '5132' for Software, NOT '5112'; use '513' for Publishing, NOT '511'; use '516' for Broadcasting, NOT '515'; use '449' for Furniture/Electronics Retail, NOT '442'/'443'; use '458' for Apparel Retail, NOT '448'). Only return standard 2-to-4 digit numerical strings, never plain text words or names.
8. For pref_transaction_type, you MUST ONLY output values from this exact list: ["Total Sale", "Acquisition of Majority Stake", "Management Buyout", "Merger", "Divestiture", "Asset Sale", "Acquisition of Minority Stake", "Minority Equity Raise", "SAFE / Convertible Note", "Angel / Pre-Seed Round", "Seed Round", "Series A", "Series B", "Series C & Beyond", "Debt Raise", "Mezzanine Financing", "Bridge Loan", "Recapitalization", "Restructuring", "Distressed Sale", "Joint Venture / Strategic Alliance"].
   Mapping guidelines:
   - Prefer specific rounds: If the text mentions a "Series A", output "Series A" (do NOT select generic "Minority Equity Raise").
   - Total Sale vs. Majority Stake: If 100% of the company/assets are being sold, select "Total Sale". If the owner is selling a majority portion but retaining equity, select "Acquisition of Majority Stake".
   - Divestiture vs. Asset Sale: Select "Divestiture" for business unit spin-offs/carve-outs. Select "Asset Sale" for IP, equipment, or facility sales.

Document Text:
${text.slice(0, 30000)}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-6-luna",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      reasoning_effort: "low",
    });

    return JSON.parse(response.choices[0].message.content);
  },

  /**
   * Generates embeddings for semantic search matching.
   */
  async generateEmbedding(text) {
    if (!text || text.trim().length === 0) return null;
    const response = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: text,
      encoding_format: "float",
      dimensions: 1536
    });

    return response.data[0].embedding;
  },

  /**
   * Generates multiple segmented embeddings for granular matching.
   */
  async generateSegmentedEmbeddings(keywords) {
    if (!keywords) return { industryVec: null, modelVec: null, targetVec: null };

    const industryText = (keywords.industry || []).join(', ');
    const modelText = [...(keywords.business_model || []), ...(keywords.revenue_model || [])].join(', ');
    const targetText = [...(keywords.customer_type || []), ...(keywords.end_market || [])].join(', ');

    const [industryVec, modelVec, targetVec] = await Promise.all([
      this.generateEmbedding(industryText),
      this.generateEmbedding(modelText),
      this.generateEmbedding(targetText)
    ]);

    return { industryVec, modelVec, targetVec };
  },

  /**
   * Stage 2: Score candidates against buyer criteria using GPT-6 Luna.
   * Checks cache first, only sends uncached candidates to the LLM.
   *
   * @param {Object} buyerCriteria - The buyer criteria record (from buyer_criteria table)
   * @param {Array} candidates - Stage 1 candidates (from get_stage1_candidates RPC)
   * @param {string} criteriaId - The buyer criteria UUID (for cache keying)
   * @returns {Array<{listing_id: string, ai_score: number, ai_reasoning: string}>}
   */
  async scoreMatchesWithAI(buyerCriteria, candidates, criteriaId) {
    const { cacheService } = await import('./cacheService.js');
    const { fetchNaicsMap, getNaicsName, resolveTo2022NaicsCode } = await import('./naicsService.js');

    if (!candidates || candidates.length === 0) return [];

    const listingIds = candidates.map(c => c.listing_id);

    // 1. Check cache for existing scores
    const cachedScores = await cacheService.getCachedScores(criteriaId, listingIds);
    const uncachedCandidates = candidates.filter(c => !cachedScores.has(c.listing_id));

    console.log(`[Stage 2] Cache hit: ${cachedScores.size} of ${candidates.length} candidates`);

    // 2. If all are cached, return immediately
    if (uncachedCandidates.length === 0) {
      return candidates.map(c => ({
        listing_id: c.listing_id,
        ...cachedScores.get(c.listing_id)
      }));
    }

    // Load NAICS map for human-readable code labels
    let naicsMap = null;
    try {
      naicsMap = await fetchNaicsMap();
    } catch (e) {
      console.warn('[Stage 2] Failed to fetch naicsMap for prompt context:', e);
    }

    // 3. Build the batch prompt for uncached candidates
    const buyerContext = this._buildBuyerContext(buyerCriteria, naicsMap);
    const candidateEntries = uncachedCandidates.map((c, idx) =>
      this._buildCandidateEntry(c, idx + 1, naicsMap)
    ).join('\n\n');

    const prompt = `You are a private equity & M&A investment analyst. Score each seller listing against the buyer's investment criteria on qualitative fit (0-100).

BUYER INVESTMENT THESIS & CRITERIA:
${buyerContext}

SELLER LISTINGS TO SCORE:
${candidateEntries}

CRITICAL M&A SCORING RULES:
1. Investment Mandate & Disjunctive ("OR") Logic:
   - The buyer's mandate ("Investment Mandate / Strategy Name" and "Target Industries") outlines a broad acquisition platform targeting MULTIPLE independent verticals (e.g. Facility Services OR IT MSPs OR Corporate Compliance & Accounting / Advisory).
   - In private equity, an acquisition target only operates in ONE of these verticals at a time.
   - You MUST score each listing based EXCLUSIVELY on how well it fits the specific vertical it operates in.
   - STRICT RULE: NEVER penalize a candidate, dock points, or mention that it "lacks ties" to other unrelated verticals listed in the mandate (such as facility services, HVAC, landscaping, or IT). If a candidate fits Corporate Compliance & Accounting / B2B Professional Services / Advisory with recurring retainers, it satisfies the mandate completely. Treat its alignment with that vertical as a full 85-95+ match.

2. Qualitative Alignment Only:
   - Financial scale and geographic location are already scored separately by quantitative algorithms. Focus solely on strategic, business model, operational, and customer alignment within the relevant vertical.

3. Scoring Calibration:
   - 85 - 100 (Strong Match): Direct strategic alignment with the overarching mandate or strong vertical fit within one of the buyer's targeted sub-sectors.
   - 60 - 84 (Moderate Match): Partial fit, adjacent sector, or complementary business model.
   - 0 - 59 (Weak Match): Unrelated industry, conflicting model, or minimal overlap.

4. Provide a crisp 1-2 sentence explanation articulating the strategic fit within its vertical. Do not mention absent verticals.

Return ONLY a JSON object in this exact format:
{ "scores": [{ "id": "listing_uuid", "score": 0-100, "reason": "1-2 sentence explanation" }] }`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-6-luna',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        reasoning_effort: 'low',
      });

      const result = JSON.parse(response.choices[0].message.content);
      const freshScores = (result.scores || []).map(s => ({
        listing_id: s.id,
        ai_score: Math.min(100, Math.max(0, Number(s.score) || 0)),
        ai_reasoning: s.reason || ''
      }));

      // 4. Write fresh scores to cache
      await cacheService.writeCachedScores(criteriaId, freshScores);

      console.log(`[Stage 2] AI scored ${freshScores.length} uncached candidates`);

      // 5. Merge cached + fresh scores
      const freshMap = new Map(freshScores.map(s => [s.listing_id, s]));
      return candidates.map(c => {
        const cached = cachedScores.get(c.listing_id);
        const fresh = freshMap.get(c.listing_id);
        return {
          listing_id: c.listing_id,
          ai_score: cached?.ai_score ?? fresh?.ai_score ?? 0,
          ai_reasoning: cached?.ai_reasoning ?? fresh?.ai_reasoning ?? ''
        };
      });
    } catch (err) {
      console.error('[Stage 2] AI scoring failed:', err);
      // Fallback: return cached scores where available, zeros elsewhere
      return candidates.map(c => {
        const cached = cachedScores.get(c.listing_id);
        return {
          listing_id: c.listing_id,
          ai_score: cached?.ai_score ?? 0,
          ai_reasoning: cached?.ai_reasoning ?? 'AI analysis unavailable.'
        };
      });
    }
  },

  /**
   * Builds the buyer criteria context string for the AI prompt.
   * @private
   */
  _buildBuyerContext(criteria, naicsMap) {
    const kw = criteria.categorized_keywords || {};
    const lines = [];

    if (criteria.investment_criteria_name) {
      lines.push(`- Investment Mandate / Strategy Name: ${criteria.investment_criteria_name}`);
    }
    if (kw.industry?.length) lines.push(`- Target Industries / Sub-Sectors: ${kw.industry.join(', ')}`);
    if (kw.business_model?.length) lines.push(`- Business Models: ${kw.business_model.join(', ')}`);
    if (kw.revenue_model?.length) lines.push(`- Revenue Models: ${kw.revenue_model.join(', ')}`);
    if (kw.customer_type?.length) lines.push(`- Customer Types: ${kw.customer_type.join(', ')}`);
    if (kw.end_market?.length) lines.push(`- End Markets: ${kw.end_market.join(', ')}`);
    if (kw.operational_model?.length) lines.push(`- Operational Preferences: ${kw.operational_model.join(', ')}`);
    if (kw.differentiation?.length) lines.push(`- Differentiation Sought: ${kw.differentiation.join(', ')}`);
    if (criteria.naics_codes?.length) {
      const formattedNaics = criteria.naics_codes.slice(0, 10).map(c => {
        const resolvedCode = resolveTo2022NaicsCode(c);
        const name = naicsMap ? getNaicsName(c, naicsMap) : null;
        return name ? `${resolvedCode} (${name})` : resolvedCode;
      }).join(', ');
      lines.push(`- Target NAICS: ${formattedNaics}`);
    }

    return lines.length > 0 ? lines.join('\n') : '- No specific qualitative criteria provided';
  },

  /**
   * Builds a single candidate entry string for the AI prompt.
   * @private
   */
  _buildCandidateEntry(candidate, index, naicsMap) {
    const kw = candidate.categorized_keywords || {};
    const lines = [`[Listing ${index}]`, `  ID: ${candidate.listing_id}`];

    if (candidate.seller_anon_name) lines.push(`  Headline / Anonymous Title: ${candidate.seller_anon_name}`);
    if (candidate.summary) lines.push(`  Summary: ${candidate.summary}`);
    if (kw.industry?.length) lines.push(`  Industries: ${kw.industry.join(', ')}`);
    if (kw.business_model?.length) lines.push(`  Business Models: ${kw.business_model.join(', ')}`);
    if (kw.revenue_model?.length) lines.push(`  Revenue Models: ${kw.revenue_model.join(', ')}`);
    if (kw.customer_type?.length) lines.push(`  Customer Types: ${kw.customer_type.join(', ')}`);
    if (kw.end_market?.length) lines.push(`  End Markets: ${kw.end_market.join(', ')}`);
    if (kw.operational_model?.length) lines.push(`  Operational Model: ${kw.operational_model.join(', ')}`);
    if (kw.differentiation?.length) lines.push(`  Differentiation: ${kw.differentiation.join(', ')}`);
    if (candidate.keywords) lines.push(`  Keywords: ${candidate.keywords}`);
    if (candidate.naics_codes?.length) {
      const formattedNaics = candidate.naics_codes.slice(0, 8).map(c => {
        const resolvedCode = resolveTo2022NaicsCode(c);
        const name = naicsMap ? getNaicsName(c, naicsMap) : null;
        return name ? `${resolvedCode} (${name})` : resolvedCode;
      }).join(', ');
      lines.push(`  NAICS: ${formattedNaics}`);
    }

    const ownershipFlags = [];
    if (candidate.is_founder_owned) ownershipFlags.push('Founder-owned');
    if (candidate.is_family_owned) ownershipFlags.push('Family-owned');
    if (candidate.is_female_owned) ownershipFlags.push('Female-owned');
    if (candidate.is_minority_owned) ownershipFlags.push('Minority-owned');
    if (candidate.is_operator_owned) ownershipFlags.push('Operator-led');
    if (ownershipFlags.length) lines.push(`  Ownership: ${ownershipFlags.join(', ')}`);

    return lines.join('\n');
  }
};
