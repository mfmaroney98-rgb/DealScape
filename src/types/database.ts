export type UserRole = 'buyer' | 'seller' | 'admin';

export type TransactionType = 
  | 'Total Sale' 
  | 'Acquisition of Majority Stake' 
  | 'Debt Raise' 
  | 'Minority Equity Raise' 
  | 'Mezzanine Financing' 
  | 'Divestiture / Carve-out';

export interface Profile {
  id: string; // UUID from auth.users
  name: string;
  role: UserRole;
  company_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Seller {
  id: string;
  user_id: string;
  title: string;
  project_name?: string;
  
  // Location
  location_city?: string;
  location_state?: string;
  location_country: string;
  
  // Stats
  employees_count?: number;
  industry_codes: string[];
  company_type?: string;
  company_ownership?: string;
  
  // Metadata
  is_founder_owned: boolean;
  is_female_owned: boolean;
  is_minority_owned: boolean;
  is_family_owned: boolean;
  
  // Transaction
  pref_transaction_type?: TransactionType;
  
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

export interface BuyerCriteria {
  id: string;
  user_id: string;
  
  // Preferred Ranges
  min_revenue?: number;
  max_revenue?: number;
  min_ebitda?: number;
  max_ebitda?: number;
  min_employees?: number;
  max_employees?: number;
  
  // Preferred Attributes
  locations: string[];
  industries: string[];
  transaction_types: TransactionType[];
  
  // Requirements
  require_founder_owned?: boolean;
  require_female_owned?: boolean;
  require_minority_owned?: boolean;
  require_family_owned?: boolean;
  
  created_at: string;
  updated_at: string;
}
