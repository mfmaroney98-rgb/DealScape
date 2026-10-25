import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

// Parse .env manually
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[key] = value.trim();
  }
});

const dbUrl = env.DATABASE_URL;
if (!dbUrl) {
  console.error('Missing DATABASE_URL in .env');
  process.exit(1);
}

const sql = postgres(dbUrl, { ssl: 'require' });

const CORPORATE_ORG_ID = '27b0d4c3-ddd9-415c-9478-d1b5e84b530d';

async function main() {
  try {
    // 1. Find corporate user
    const [corpUser] = await sql`
      SELECT id, name FROM public.user_profiles
      WHERE organization_id = ${CORPORATE_ORG_ID}
      LIMIT 1;
    `;

    if (!corpUser) {
      console.error('No corporate user found for organization_id:', CORPORATE_ORG_ID);
      process.exit(1);
    }

    const userId = corpUser.id;
    console.log(`Found corporate user: ${corpUser.name} (${userId})`);

    const criteriaToInsert = [
      {
        investment_criteria_name: 'Manufacturing & Industrials PE',
        organization_id: CORPORATE_ORG_ID,
        organization_name: 'DealScape Corporate',
        user_id: userId,
        search_enterprise_value_min: 25000000,
        search_enterprise_value_max: 150000000,
        search_equity_value_min: 15000000,
        search_equity_value_max: 75000000,
        financial_criteria: [
          { id: 1, metric: 'Revenue', min: 20000000, max: 120000000 },
          { id: 2, metric: 'EBITDA', min: 4000000, max: 20000000 },
          { id: 3, metric: 'EBITDA Margin %', min: 12, max: 35 }
        ],
        locations: ['United States', 'Canada', 'Midwest', 'Southeast', 'Great Lakes'],
        keywords: [
          'precision machining',
          'advanced manufacturing',
          'industrial automation',
          'engineered components',
          'aerospace & defense supply',
          'contract manufacturing',
          'metal fabrication',
          'plastics & polymers',
          'robotics',
          'testing & inspection'
        ],
        categorized_keywords: {
          'Industry Verticals': ['Precision Machining', 'Engineered Components', 'Industrial Automation', 'Aerospace Components'],
          'Operations': ['High-Mix Low-Volume', 'CNC Machining', 'ISO 9001', 'AS9100 Certified', 'Cleanroom Packaging']
        },
        naics_codes: ['33', '332', '333', '334', '335', '336'], // Manufacturing subsectors
        pref_transaction_type: ['Acquisition of Majority Stake', 'Total Sale', 'Management Buyout', 'Recapitalization'],
        require_founder_owned: false,
        require_family_owned: false,
        require_operator_owned: false,
        archived: false
      },
      {
        investment_criteria_name: 'Software Growth Equity',
        organization_id: CORPORATE_ORG_ID,
        organization_name: 'DealScape Corporate',
        user_id: userId,
        search_enterprise_value_min: 30000000,
        search_enterprise_value_max: 200000000,
        search_equity_value_min: 10000000,
        search_equity_value_max: 50000000,
        financial_criteria: [
          { id: 1, metric: 'Revenue', min: 8000000, max: 40000000 },
          { id: 2, metric: 'Revenue Growth YoY %', min: 25, max: 100 },
          { id: 3, metric: 'Gross Margin %', min: 70, max: 95 }
        ],
        locations: ['United States', 'North America'],
        keywords: [
          'B2B SaaS',
          'vertical market software',
          'cloud infrastructure',
          'fintech',
          'AI / machine learning workflow',
          'cybersecurity',
          'developer tools',
          'high net retention',
          'recurring revenue',
          'mission critical software'
        ],
        categorized_keywords: {
          'Software Models': ['B2B SaaS', 'Vertical Software', 'Enterprise Software', 'API-First Platforms'],
          'Financial Profile': ['ARR > $5M', '110%+ Net Retention', 'Rule of 40', 'Low Churn']
        },
        naics_codes: ['51', '511', '518', '5415'], // Information / Software & Computer Systems Design
        pref_transaction_type: ['Series B', 'Series C & Beyond', 'Acquisition of Minority Stake', 'Minority Equity Raise', 'Recapitalization'],
        require_founder_owned: false,
        require_family_owned: false,
        require_operator_owned: false,
        archived: false
      },
      {
        investment_criteria_name: 'Healthcare PE',
        organization_id: CORPORATE_ORG_ID,
        organization_name: 'DealScape Corporate',
        user_id: userId,
        search_enterprise_value_min: 20000000,
        search_enterprise_value_max: 120000000,
        search_equity_value_min: 10000000,
        search_equity_value_max: 60000000,
        financial_criteria: [
          { id: 1, metric: 'Revenue', min: 15000000, max: 80000000 },
          { id: 2, metric: 'EBITDA', min: 3000000, max: 15000000 },
          { id: 3, metric: 'EBITDA Margin %', min: 15, max: 30 }
        ],
        locations: ['United States', 'Southeast', 'Mid-Atlantic', 'Midwest', 'Southwest'],
        keywords: [
          'healthcare provider',
          'outpatient clinics',
          'behavioral health',
          'medical devices',
          'clinical labs',
          'home health & hospice',
          'practice management',
          'dental support organization',
          'physical therapy',
          'healthcare staffing'
        ],
        categorized_keywords: {
          'Clinical Services': ['Outpatient Clinics', 'DSO / Dental Practice', 'Physical Therapy', 'Behavioral Health'],
          'Healthcare Services': ['Pharma Services', 'Medical Device Manufacturing', 'Healthcare IT']
        },
        naics_codes: ['62', '621', '622', '623', '3391'], // Healthcare and Social Assistance / Medical Equipment
        pref_transaction_type: ['Acquisition of Majority Stake', 'Total Sale', 'Management Buyout', 'Recapitalization'],
        require_founder_owned: false,
        require_family_owned: false,
        require_operator_owned: false,
        archived: false
      },
      {
        investment_criteria_name: 'Lower Middle Market Business Services',
        organization_id: CORPORATE_ORG_ID,
        organization_name: 'DealScape Corporate',
        user_id: userId,
        search_enterprise_value_min: 10000000,
        search_enterprise_value_max: 60000000,
        search_equity_value_min: 5000000,
        search_equity_value_max: 30000000,
        financial_criteria: [
          { id: 1, metric: 'Revenue', min: 8000000, max: 40000000 },
          { id: 2, metric: 'EBITDA', min: 2000000, max: 8000000 },
          { id: 3, metric: 'EBITDA Margin %', min: 15, max: 35 }
        ],
        locations: ['United States'],
        keywords: [
          'commercial services',
          'facility maintenance',
          'IT managed services provider',
          'MSP',
          'consulting & compliance',
          'testing and inspection',
          'route-based services',
          'waste management',
          'security services',
          'commercial landscaping'
        ],
        categorized_keywords: {
          'Business Models': ['Contracted Recurring Revenue', 'Route-Based Density', 'B2B Professional Services'],
          'Subsectors': ['Commercial Facilities', 'HVAC / MEP Services', 'IT Managed Services', 'Environmental & Safety']
        },
        naics_codes: ['54', '541', '56', '561', '562'], // Professional, Scientific & Technical Services / Admin & Support & Waste
        pref_transaction_type: ['Acquisition of Majority Stake', 'Total Sale', 'Management Buyout', 'Recapitalization'],
        require_founder_owned: false,
        require_family_owned: false,
        require_operator_owned: false,
        archived: false
      },
      {
        investment_criteria_name: 'Middle Market Consumer',
        organization_id: CORPORATE_ORG_ID,
        organization_name: 'DealScape Corporate',
        user_id: userId,
        search_enterprise_value_min: 25000000,
        search_enterprise_value_max: 150000000,
        search_equity_value_min: 15000000,
        search_equity_value_max: 75000000,
        financial_criteria: [
          { id: 1, metric: 'Revenue', min: 25000000, max: 120000000 },
          { id: 2, metric: 'EBITDA', min: 5000000, max: 20000000 },
          { id: 3, metric: 'Gross Margin %', min: 40, max: 70 }
        ],
        locations: ['United States', 'North America'],
        keywords: [
          'omnichannel brand',
          'better-for-you food & beverage',
          'health & wellness',
          'pet care & products',
          'household essentials',
          'active lifestyle & outdoor',
          'beauty & personal care',
          'specialty retail',
          'direct to consumer',
          'branded CPG'
        ],
        categorized_keywords: {
          'Consumer Verticals': ['Food & Beverage', 'Health & Wellness', 'Pet Products', 'Beauty & Personal Care', 'Outdoor Goods'],
          'Channels': ['Omnichannel', 'Amazon & E-Commerce', 'Club / Grocery Distribution']
        },
        naics_codes: ['311', '312', '44', '45', '454'], // Food/Beverage Mfg, Retail Trade
        pref_transaction_type: ['Acquisition of Majority Stake', 'Total Sale', 'Management Buyout', 'Recapitalization'],
        require_founder_owned: false,
        require_family_owned: false,
        require_operator_owned: false,
        archived: false
      }
    ];

    console.log(`Inserting ${criteriaToInsert.length} criteria for DealScape Corporate...`);

    for (const c of criteriaToInsert) {
      const [inserted] = await sql`
        INSERT INTO public.buyer_criteria (
          investment_criteria_name,
          organization_id,
          organization_name,
          user_id,
          search_enterprise_value_min,
          search_enterprise_value_max,
          search_equity_value_min,
          search_equity_value_max,
          financial_criteria,
          locations,
          keywords,
          categorized_keywords,
          naics_codes,
          pref_transaction_type,
          require_founder_owned,
          require_family_owned,
          require_operator_owned,
          archived,
          created_at,
          updated_at
        ) VALUES (
          ${c.investment_criteria_name},
          ${c.organization_id},
          ${c.organization_name},
          ${c.user_id},
          ${c.search_enterprise_value_min},
          ${c.search_enterprise_value_max},
          ${c.search_equity_value_min},
          ${c.search_equity_value_max},
          ${sql.json(c.financial_criteria)},
          ${sql.array(c.locations)},
          ${sql.array(c.keywords)},
          ${sql.json(c.categorized_keywords)},
          ${sql.array(c.naics_codes)},
          ${sql.array(c.pref_transaction_type)},
          ${c.require_founder_owned},
          ${c.require_family_owned},
          ${c.require_operator_owned},
          ${c.archived},
          NOW(),
          NOW()
        )
        RETURNING id, investment_criteria_name;
      `;
      console.log(`✓ Inserted "${inserted.investment_criteria_name}" (ID: ${inserted.id})`);
    }

    console.log('\nAll 5 DealScape Corporate investment criteria successfully inserted!');
  } catch (err) {
    console.error('Error inserting criteria:', err);
  } finally {
    await sql.end();
  }
}

main();
