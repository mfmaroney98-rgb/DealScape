import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

// Parse .env manually
const envContent = fs.readFileSync('.env', 'utf8');
const match = envContent.match(/DATABASE_URL=(.*)/);
const sql = postgres(match[1].trim().replace(/^['"]|['"]$/g, ''), { ssl: 'require' });

const CORPORATE_ORG_ID = '27b0d4c3-ddd9-415c-9478-d1b5e84b530d';

const updatedCriteria = [
  {
    name: 'Manufacturing & Industrials PE',
    categorized_keywords: {
      industry: [
        'Advanced Manufacturing',
        'Precision Machining',
        'Industrial Automation',
        'Engineered Components',
        'Aerospace & Defense Supply',
        'Contract Manufacturing',
        'Metal Fabrication',
        'Plastics & Polymers',
        'Robotics & Motion Control',
        'Testing & Inspection Services'
      ],
      business_model: [
        'Contract Manufacturing',
        'High-Mix Low-Volume',
        'Build-to-Print',
        'OEM Supplier',
        'Component Manufacturer'
      ],
      revenue_model: [
        'Purchase Orders',
        'Long-term Supply Agreements',
        'Repeat Customer Orders'
      ],
      customer_type: [
        'Tier 1 Aerospace',
        'Defense Contractors',
        'Industrial OEMs',
        'Medical Device OEMs',
        'Automotive & Transportation'
      ],
      operational_model: [
        'CNC Machining Facilities',
        'Cleanroom Assembly',
        'AS9100 Certified',
        'ISO 9001 Certified'
      ],
      differentiation: [
        'Tight Tolerance Capabilities',
        'Proprietary Tooling & Fixturing',
        'High Switching Costs',
        'Sole-Source Supplier Status'
      ],
      end_market: [
        'Commercial Aerospace',
        'Defense & Space',
        'Medical Technologies',
        'Industrial Equipment',
        'Energy & Power'
      ],
      reason_for_sale: [
        'Owner Retirement',
        'Growth Capital',
        'Management Succession'
      ]
    }
  },
  {
    name: 'Software Growth Equity',
    categorized_keywords: {
      industry: [
        'B2B SaaS',
        'Vertical Market Software',
        'Cloud Infrastructure',
        'FinTech Software',
        'AI & Workflow Automation',
        'Cybersecurity Solutions',
        'Developer Platforms & APIs',
        'Supply Chain & Logistics Software'
      ],
      business_model: [
        'B2B SaaS',
        'Software as a Service',
        'API-First Platform',
        'Enterprise Software'
      ],
      revenue_model: [
        'Subscription',
        'Annual Recurring Revenue (ARR)',
        'Usage-Based Pricing',
        'Multi-Year Contracts'
      ],
      customer_type: [
        'Mid-Market Enterprises',
        'Fortune 500 Enterprises',
        'SMBs',
        'Technology Companies'
      ],
      operational_model: [
        'Cloud-Native (AWS/Azure)',
        'Remote-First Organization',
        'Product-Led Growth (PLG)',
        'Inside Sales Motion'
      ],
      differentiation: [
        'Proprietary IP & Algorithms',
        'Net Retention > 110%',
        'High Switching Costs',
        'Mission-Critical Workflow Integration',
        'Rule of 40'
      ],
      end_market: [
        'Financial Services',
        'Healthcare & Life Sciences',
        'Logistics & Supply Chain',
        'Information Technology',
        'Corporate Enterprises'
      ],
      reason_for_sale: [
        'Growth Capital',
        'Secondary Liquidity for Founders',
        'Scale-up Acceleration'
      ]
    }
  },
  {
    name: 'Healthcare PE',
    categorized_keywords: {
      industry: [
        'Healthcare Services',
        'Outpatient Clinics',
        'Behavioral Health',
        'Dental Support Organizations (DSO)',
        'Physical Therapy Clinics',
        'Home Health & Hospice',
        'Medical Device Manufacturing',
        'Pharma Support Services',
        'Clinical Laboratories'
      ],
      business_model: [
        'Clinical Practice Management',
        'Outpatient Care Delivery',
        'Healthcare IT & RCM',
        'Contract Research Organization (CRO)'
      ],
      revenue_model: [
        'Fee-for-Service',
        'Commercial Insurance Reimbursement',
        'Medicare / Medicaid',
        'Recurring Patient Visits'
      ],
      customer_type: [
        'Patients & Consumers',
        'Hospital Systems',
        'Physician Practices',
        'Commercial Health Plans'
      ],
      operational_model: [
        'Multi-Site Clinic Network',
        'Centralized Practice Management',
        'HIPAA Compliant Operations',
        'Accredited Clinical Facilities'
      ],
      differentiation: [
        'Provider Retention & Recruitment',
        'In-Network Commercial Contracts',
        'High Clinical Quality Scores',
        'Proprietary EMR & Scheduling Integration'
      ],
      end_market: [
        'Ambulatory & Outpatient Care',
        'Mental & Behavioral Health',
        'Specialty Dentistry',
        'Post-Acute & Geriatric Care'
      ],
      reason_for_sale: [
        'Recapitalization',
        'Physician Practice Growth Capital',
        'Retirement of Founding Clinicians'
      ]
    }
  },
  {
    name: 'Lower Middle Market Business Services',
    categorized_keywords: {
      industry: [
        'Commercial Facility Services',
        'IT Managed Services Providers (MSP)',
        'Testing, Inspection & Certification (TIC)',
        'Commercial HVAC & MEP Services',
        'Environmental & Waste Management',
        'Commercial Landscaping',
        'B2B Security Services',
        'Corporate Compliance & Accounting Services'
      ],
      business_model: [
        'Route-Based Field Services',
        'Managed Services Provider (MSP)',
        'B2B Professional Services',
        'Contract Maintenance & Service'
      ],
      revenue_model: [
        'Contracted Recurring Revenue',
        'Master Service Agreements (MSAs)',
        'Monthly Retainers',
        'Preventative Maintenance Contracts'
      ],
      customer_type: [
        'Commercial Property Managers',
        'Industrial & Distribution Facilities',
        'Corporate Offices',
        'Municipalities & Local Government',
        'Healthcare Facilities'
      ],
      operational_model: [
        'Route-Dense Service Fleet',
        'Field Service Dispatch Technology',
        'Local Service Depots',
        'Skilled Technician Workforce'
      ],
      differentiation: [
        'High Route Density',
        'Multi-Year Commercial Contracts',
        'High Customer Retention (>90%)',
        'Mission-Critical Compliance Expertise'
      ],
      end_market: [
        'Commercial Real Estate',
        'Warehousing & Logistics',
        'Corporate Headquarters',
        'Industrial Plants & Facilities'
      ],
      reason_for_sale: [
        'Founder Retirement',
        'Transition from Family Ownership',
        'Strategic Growth Partnership'
      ]
    }
  },
  {
    name: 'Middle Market Consumer',
    categorized_keywords: {
      industry: [
        'Food & Beverage CPG',
        'Health & Wellness Products',
        'Pet Care & Nutrition',
        'Beauty & Personal Care',
        'Active Lifestyle & Outdoor Gear',
        'Household Essentials',
        'Specialty Consumer Goods'
      ],
      business_model: [
        'Branded CPG',
        'Omnichannel Brand',
        'Direct-to-Consumer (DTC)',
        'Wholesale & Retail Brand'
      ],
      revenue_model: [
        'Wholesale Product Sales',
        'DTC E-Commerce Subscriptions',
        'Retail Re-orders & Velocity'
      ],
      customer_type: [
        'Mass Retailers (Target, Walmart)',
        'Grocery Chains (Whole Foods, Kroger)',
        'Club Stores (Costco, Sam\'s Club)',
        'Direct Consumers & Subscribers'
      ],
      operational_model: [
        'Asset-Light Co-Manufacturing',
        '3PL Fulfillment & Distribution',
        'Omnichannel E-Commerce & Amazon Storefront',
        'Digital Performance Marketing'
      ],
      differentiation: [
        'Clean-Label & Better-for-You Ingredients',
        'Strong Brand Equity & Community',
        'High Retail Velocity & Repeat Purchase Rate',
        'Proprietary Product Formulations'
      ],
      end_market: [
        'Everyday Consumer Goods',
        'Pet Wellness',
        'Natural & Organic Foods',
        'Outdoor & Recreational Goods'
      ],
      reason_for_sale: [
        'Founder Recapitalization',
        'Expansion Capital for Retail Distribution',
        'Strategic Acquirer Partnership'
      ]
    }
  }
];

async function updateKeywords() {
  console.log('Aligning keywords and categorized_keywords for DealScape Corporate...');

  for (const item of updatedCriteria) {
    // Collect all keyword categories into flat array of distinct keywords
    const allKeywordsSet = new Set();
    Object.values(item.categorized_keywords).forEach(catArray => {
      if (Array.isArray(catArray)) {
        catArray.forEach(kw => {
          if (kw && typeof kw === 'string') allKeywordsSet.add(kw.trim());
        });
      }
    });

    const flatKeywords = Array.from(allKeywordsSet);

    const result = await sql`
      UPDATE public.buyer_criteria
      SET 
        keywords = ${flatKeywords}::text[],
        categorized_keywords = ${item.categorized_keywords}::jsonb,
        updated_at = NOW()
      WHERE organization_id = ${CORPORATE_ORG_ID}
        AND investment_criteria_name = ${item.name}
      RETURNING id, investment_criteria_name, array_length(keywords, 1) as kw_count;
    `;

    if (result.length > 0) {
      console.log(`✓ Updated "${result[0].investment_criteria_name}" with ${result[0].kw_count} total keywords across all official categories.`);
    } else {
      console.warn(`! No criteria found with name "${item.name}"`);
    }
  }

  await sql.end();
  console.log('\nAll DealScape Corporate criteria keywords successfully updated and aligned!');
}

updateKeywords();
