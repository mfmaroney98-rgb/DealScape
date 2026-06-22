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
    // Pass verbosity: 0 to suppress noisy console warnings
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, verbosity: 0 }).promise;
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
8. Under "naics_codes", use your native knowledge of the 2022 NAICS classification to determine up to three 4-digit codes that best represent this company.
9. For locations, extract ONLY the single primary headquarters location (do NOT include additional operating locations or facilities). Format each location strictly as "CC:StateName" (e.g., "US:California" for California, USA, or "CA:Ontario" for Ontario, Canada). You MUST resolve city names to their respective states (e.g., if the company is headquartered in "Houston, Texas", output "US:Texas"). If the headquarters location cannot be found, return an empty array.



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
  "pref_transaction_type": ["Total Sale", "Acquisition of Majority Stake", "Acquisition of Minority Stake", "Equity Raise", "Debt Raise", "Divestiture", "Recapitalization", "Restructuring"] or empty array,
  "require_founder_owned": boolean,
  "require_female_owned": boolean,
  "require_minority_owned": boolean,
  "require_family_owned": boolean,
  "require_operator_owned": boolean
}

Important Rules:
1. For financial_criteria, metrics should be from this list: 'Revenue', 'Revenue Growth (YoY)', 'Revenue CAGR', 'Gross Profit', 'Gross Profit Margin', 'EBITDA', 'EBITDA Growth (YoY)', 'EBITDA Margin', 'EBIT', 'EBIT Margin', 'Net Income', 'Net Margin'.
2. Extract ALL absolute financial ranges (Min and Max). IMPORTANT: Pay close attention to unit scales (e.g. "in thousands", "K", "M", "B", "Millions"). You MUST expand all financials into their full, un-abbreviated integer values. For example, if the document says "$5.2M" or "5,200 (in thousands)", you must output the integer 5200000. Never output "5.2" for 5 million.
3. If a value is provided as a percentage (e.g. "20% EBITDA Margin"), extract it as the raw number (e.g. "20").
4. If a value is genuinely not present, set min/max to null.
5. Extract 10-16 sharp, discriminating phrases for the keywords categories.
6. Extract only the JSON, no markdown formatting or extra text.
7. Under "naics_codes", use your native knowledge of the 2022 NAICS classification to determine up to three codes that best represent this buyer criteria. If the criteria is extremely broad (e.g. "any technology/software business" or "any manufacturing company"), return the broad 2-digit sector or 3-digit subsector code (e.g., '54' or '541'). Otherwise, return specific 4-digit codes (e.g., '5415').

Document Text:
${text.slice(0, 30000)}
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
   * Convert keywords into up to three 2022 NAICS codes (broad or specific).
   */
  async generateNaicsFromKeywords(keywords) {
    if (!keywords || !keywords.length) return [];

    const prompt = `
You are an expert M&A analyst and database clerk. Convert the following business/industry keywords into up to three 2022 NAICS codes that best capture the sectors:
${JSON.stringify(keywords)}

Important Rules:
1. If the keywords suggest a broad sector, return a 2-digit or 3-digit code (e.g., '54' or '541').
2. If they suggest a specific industry, return 4-digit codes (e.g., '5415').
3. Return the result as a strict JSON object matching exactly this schema:
{
  "naics_codes": ["string"]
}
4. Extract only the JSON, no markdown formatting or extra text.
`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.1,
      });

      const data = JSON.parse(response.choices[0].message.content);
      return data.naics_codes || [];
    } catch (err) {
      console.error('Failed to parse NAICS codes from keywords:', err);
      return [];
    }
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
   * Stage 2: Score candidates against buyer criteria using GPT-4o-mini.
   * Checks cache first, only sends uncached candidates to the LLM.
   *
   * @param {Object} buyerCriteria - The buyer criteria record (from buyer_criteria table)
   * @param {Array} candidates - Stage 1 candidates (from get_stage1_candidates RPC)
   * @param {string} criteriaId - The buyer criteria UUID (for cache keying)
   * @returns {Array<{listing_id: string, ai_score: number, ai_reasoning: string}>}
   */
  async scoreMatchesWithAI(buyerCriteria, candidates, criteriaId) {
    const { cacheService } = await import('./cacheService.js');

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

    // 3. Build the batch prompt for uncached candidates
    const buyerContext = this._buildBuyerContext(buyerCriteria);
    const candidateEntries = uncachedCandidates.map((c, idx) =>
      this._buildCandidateEntry(c, idx + 1)
    ).join('\n');

    const prompt = `You are an M&A matching analyst. Score each seller listing against the buyer's investment criteria on qualitative fit (0-100).

BUYER CRITERIA:
${buyerContext}

SELLER LISTINGS TO SCORE:
${candidateEntries}

SCORING INSTRUCTIONS:
- Score ONLY on qualitative alignment. Do NOT consider financials or geography (already scored separately).
- Consider: industry overlap, business model fit, customer/end-market alignment, operational compatibility, strategic coherence, and keyword overlap.
- A score of 80-100 means strong qualitative alignment across most dimensions.
- A score of 50-79 means partial alignment with some relevant overlap.
- A score of 0-49 means weak qualitative fit with limited overlap.
- For each listing, provide a concise 1-2 sentence explanation of why it scored the way it did.

Return ONLY a JSON object in this exact format:
{ "scores": [{ "id": "listing_uuid", "score": 0-100, "reason": "1-2 sentence explanation" }] }`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0,
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
  _buildBuyerContext(criteria) {
    const kw = criteria.categorized_keywords || {};
    const lines = [];

    if (kw.industry?.length) lines.push(`- Target Industries: ${kw.industry.join(', ')}`);
    if (kw.business_model?.length) lines.push(`- Business Models: ${kw.business_model.join(', ')}`);
    if (kw.revenue_model?.length) lines.push(`- Revenue Models: ${kw.revenue_model.join(', ')}`);
    if (kw.customer_type?.length) lines.push(`- Customer Types: ${kw.customer_type.join(', ')}`);
    if (kw.end_market?.length) lines.push(`- End Markets: ${kw.end_market.join(', ')}`);
    if (kw.operational_model?.length) lines.push(`- Operational Preferences: ${kw.operational_model.join(', ')}`);
    if (kw.differentiation?.length) lines.push(`- Differentiation Sought: ${kw.differentiation.join(', ')}`);
    if (criteria.naics_codes?.length) lines.push(`- NAICS Codes: ${criteria.naics_codes.join(', ')}`);

    return lines.length > 0 ? lines.join('\n') : '- No specific qualitative criteria provided';
  },

  /**
   * Builds a single candidate entry string for the AI prompt.
   * @private
   */
  _buildCandidateEntry(candidate, index) {
    const kw = candidate.categorized_keywords || {};
    const lines = [`[Listing ${index}]`, `  ID: ${candidate.listing_id}`];

    if (candidate.summary) lines.push(`  Summary: ${candidate.summary}`);
    if (kw.industry?.length) lines.push(`  Industries: ${kw.industry.join(', ')}`);
    if (kw.business_model?.length) lines.push(`  Business Models: ${kw.business_model.join(', ')}`);
    if (kw.revenue_model?.length) lines.push(`  Revenue Models: ${kw.revenue_model.join(', ')}`);
    if (kw.customer_type?.length) lines.push(`  Customer Types: ${kw.customer_type.join(', ')}`);
    if (kw.end_market?.length) lines.push(`  End Markets: ${kw.end_market.join(', ')}`);
    if (kw.operational_model?.length) lines.push(`  Operational Model: ${kw.operational_model.join(', ')}`);
    if (kw.differentiation?.length) lines.push(`  Differentiation: ${kw.differentiation.join(', ')}`);
    if (candidate.naics_codes?.length) lines.push(`  NAICS: ${candidate.naics_codes.join(', ')}`);

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
