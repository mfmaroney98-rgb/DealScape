export type UserRole = 'buyer' | 'seller' | 'admin' | 'corporate';

export type TransactionType =
  | 'Total Sale'
  | 'Acquisition of Majority Stake'
  | 'Debt Raise'
  | 'Minority Equity Raise'
  | 'Mezzanine Financing'
  | 'Divestiture / Carve-out';

export interface UserProfile {
  id: string; // UUID from auth.users
  name?: string;
  role?: UserRole;
  organization_id?: string;
  organization_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SellerListing {
  id: string;
  user_id: string;
  organization_id?: string;
  
  // Anonymized Display
  seller_anon_name: string;
  seller_name?: string;

  // Location
  locations: string[];

  // Stats
  year_founded?: string;
  employees_count?: number;
  keywords: string[];
  legal_entity?: string;
  ownership_structure?: string;

  // Metadata
  is_founder_owned: boolean;
  is_female_owned: boolean;
  is_minority_owned: boolean;
  is_family_owned: boolean;
  is_operator_owned: boolean;

  // Transaction
  pref_transaction_type?: TransactionType[];

  // Key Financials
  revenue?: number;
  ebitda?: number;
  gross_profit?: number;
  net_income?: number;
  growth_rate_pct?: number;

  // Historical data
  financial_history: Array<{
    year: number;
    revenue: number;
    ebitda: number;
    // ... other metrics
  }>;

  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  organization_name: string;
  type: 'buyer' | 'seller';
  website_url?: string;
  organization_summary?: string;
  buyer_type?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BuyerCriteria {
  id: string;
  user_id: string;
  organization_id?: string;

  // Identity
  investment_criteria_name?: string;

  // Preferred Ranges
  financial_criteria?: Array<{
    id: number;
    metric: string;
    min: string | number;
    max: string | number;
  }>;

  // Preferred Attributes
  locations: string[];
  keywords: string[];
  naics_codes: string[];
  pref_transaction_type: TransactionType[];

  // Requirements
  require_founder_owned?: boolean;
  require_female_owned?: boolean;
  require_minority_owned?: boolean;
  require_family_owned?: boolean;
  require_operator_owned?: boolean;

  created_at: string;
  updated_at: string;
}
