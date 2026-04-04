import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buyerService } from '../services/buyerService';
import TagInput from './TagInput';
import { 
  Target, 
  Map, 
  TrendingUp, 
  CheckCircle2, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Users,
  Search,
  Globe
} from 'lucide-react';

const NAICS_SECTORS = [
  { code: '11', name: 'Agriculture, Forestry, Fishing and Hunting', subsectors: [
    { code: '111', name: 'Crop Production' },
    { code: '112', name: 'Animal Production and Aquaculture' },
    { code: '113', name: 'Forestry and Logging' },
    { code: '114', name: 'Fishing, Hunting and Trapping' },
    { code: '115', name: 'Support Activities for Agriculture and Forestry' }
  ]},
  { code: '21', name: 'Mining, Quarrying, and Oil and Gas Extraction', subsectors: [
    { code: '211', name: 'Oil and Gas Extraction' },
    { code: '212', name: 'Mining (except Oil and Gas)' },
    { code: '213', name: 'Support Activities for Mining' }
  ]},
  { code: '22', name: 'Utilities', subsectors: [
    { code: '221', name: 'Utilities' }
  ]},
  { code: '23', name: 'Construction', subsectors: [
    { code: '236', name: 'Construction of Buildings' },
    { code: '237', name: 'Heavy and Civil Engineering Construction' },
    { code: '238', name: 'Specialty Trade Contractors' }
  ]},
  { code: '31-33', name: 'Manufacturing', subsectors: [
    { code: '311', name: 'Food Manufacturing' },
    { code: '312', name: 'Beverage and Tobacco Product Manufacturing' },
    { code: '313', name: 'Textile Mills' },
    { code: '314', name: 'Textile Product Mills' },
    { code: '315', name: 'Apparel Manufacturing' },
    { code: '316', name: 'Leather and Allied Product Manufacturing' },
    { code: '321', name: 'Wood Product Manufacturing' },
    { code: '322', name: 'Paper Manufacturing' },
    { code: '323', name: 'Printing and Related Support Activities' },
    { code: '324', name: 'Petroleum and Coal Products Manufacturing' },
    { code: '325', name: 'Chemical Manufacturing' },
    { code: '326', name: 'Plastics and Rubber Products Manufacturing' },
    { code: '327', name: 'Nonmetallic Mineral Product Manufacturing' },
    { code: '331', name: 'Primary Metal Manufacturing' },
    { code: '332', name: 'Fabricated Metal Product Manufacturing' },
    { code: '333', name: 'Machinery Manufacturing' },
    { code: '334', name: 'Computer and Electronic Product Manufacturing' },
    { code: '335', name: 'Electrical Equipment and Appliance Manufacturing' },
    { code: '336', name: 'Transportation Equipment Manufacturing' },
    { code: '337', name: 'Furniture and Related Product Manufacturing' },
    { code: '339', name: 'Miscellaneous Manufacturing' }
  ]},
  { code: '42', name: 'Wholesale Trade', subsectors: [
    { code: '423', name: 'Merchant Wholesalers, Durable Goods' },
    { code: '424', name: 'Merchant Wholesalers, Nondurable Goods' },
    { code: '425', name: 'Electronic Markets and Agents and Brokers' }
  ]},
  { code: '44-45', name: 'Retail Trade', subsectors: [
    { code: '441', name: 'Motor Vehicle and Parts Dealers' },
    { code: '442', name: 'Furniture and Home Furnishings Stores' },
    { code: '443', name: 'Electronics and Appliance Stores' },
    { code: '444', name: 'Building Material and Garden Equipment Dealers' },
    { code: '445', name: 'Food and Beverage Retailers' },
    { code: '449', name: 'Furniture, Home Furnishings, Electronics, and Appliance Retailers' },
    { code: '455', name: 'General Merchandise Retailers' },
    { code: '456', name: 'Health and Personal Care Retailers' },
    { code: '457', name: 'Gasoline Stations and Fuel Dealers' },
    { code: '458', name: 'Clothing, Clothing Accessories, Shoe, and Jewelry Retailers' },
    { code: '459', name: 'Sporting Goods, Hobby, Musical Instrument, Book, and Misc. Retailers' }
  ]},
  { code: '48-49', name: 'Transportation and Warehousing', subsectors: [
    { code: '481', name: 'Air Transportation' },
    { code: '482', name: 'Rail Transportation' },
    { code: '483', name: 'Water Transportation' },
    { code: '484', name: 'Truck Transportation' },
    { code: '485', name: 'Transit and Ground Passenger Transportation' },
    { code: '486', name: 'Pipeline Transportation' },
    { code: '487', name: 'Scenic and Sightseeing Transportation' },
    { code: '488', name: 'Support Activities for Transportation' },
    { code: '491', name: 'Postal Service' },
    { code: '492', name: 'Couriers and Messengers' },
    { code: '493', name: 'Warehousing and Storage' }
  ]},
  { code: '51', name: 'Information', subsectors: [
    { code: '511', name: 'Publishing Industries' },
    { code: '512', name: 'Motion Picture and Sound Recording Industries' },
    { code: '515', name: 'Broadcasting (except Internet)' },
    { code: '516', name: 'Internet Publishing and Beyond' },
    { code: '517', name: 'Telecommunications' },
    { code: '518', name: 'Computing Infrastructure Providers, Data Processing, and Related Services' },
    { code: '519', name: 'Web Search Portals, Libraries, Archives, and Other Information Services' }
  ]},
  { code: '52', name: 'Finance and Insurance', subsectors: [
    { code: '521', name: 'Monetary Authorities — Central Bank' },
    { code: '522', name: 'Credit Intermediation and Related Activities' },
    { code: '523', name: 'Securities, Commodity Contracts, and Other Financial Investments' },
    { code: '524', name: 'Insurance Carriers and Related Activities' },
    { code: '525', name: 'Funds, Trusts, and Other Financial Vehicles' }
  ]},
  { code: '53', name: 'Real Estate and Rental and Leasing', subsectors: [
    { code: '531', name: 'Real Estate' },
    { code: '532', name: 'Rental and Leasing Services' },
    { code: '533', name: 'Lessors of Nonfinancial Intangible Assets' }
  ]},
  { code: '54', name: 'Professional, Scientific, and Technical Services', subsectors: [
    { code: '541', name: 'Professional, Scientific, and Technical Services' }
  ]},
  { code: '55', name: 'Management of Companies and Enterprises', subsectors: [
    { code: '551', name: 'Management of Companies and Enterprises' }
  ]},
  { code: '56', name: 'Administrative and Support and Waste Management Services', subsectors: [
    { code: '561', name: 'Administrative and Support Services' },
    { code: '562', name: 'Waste Management and Remediation Services' }
  ]},
  { code: '61', name: 'Educational Services', subsectors: [
    { code: '611', name: 'Educational Services' }
  ]},
  { code: '62', name: 'Health Care and Social Assistance', subsectors: [
    { code: '621', name: 'Ambulatory Health Care Services' },
    { code: '622', name: 'Hospitals' },
    { code: '623', name: 'Nursing and Residential Care Facilities' },
    { code: '624', name: 'Social Assistance' }
  ]},
  { code: '71', name: 'Arts, Entertainment, and Recreation', subsectors: [
    { code: '711', name: 'Performing Arts, Spectator Sports, and Related Industries' },
    { code: '712', name: 'Museums, Historical Sites, and Similar Institutions' },
    { code: '713', name: 'Amusement, Gambling, and Recreation Industries' }
  ]},
  { code: '72', name: 'Accommodation and Food Services', subsectors: [
    { code: '721', name: 'Accommodation' },
    { code: '722', name: 'Food Services and Drinking Places' }
  ]},
  { code: '81', name: 'Other Services (except Public Administration)', subsectors: [
    { code: '811', name: 'Repair and Maintenance' },
    { code: '812', name: 'Personal and Laundry Services' },
    { code: '813', name: 'Religious, Grantmaking, Civic, Professional, and Similar Organizations' },
    { code: '814', name: 'Private Households' }
  ]},
  { code: '92', name: 'Public Administration', subsectors: [
    { code: '921', name: 'Executive, Legislative, and Other General Government Support' },
    { code: '922', name: 'Justice, Public Order, and Safety Activities' },
    { code: '923', name: 'Administration of Human Resource Programs' },
    { code: '924', name: 'Administration of Environmental Quality Programs' },
    { code: '925', name: 'Administration of Housing Programs, Urban Planning, and Community Development' },
    { code: '926', name: 'Administration of Economic Programs' },
    { code: '927', name: 'Space Research and Technology' },
    { code: '928', name: 'National Security and International Affairs' }
  ]}
];

const CENSUS_REGIONS = [
  {
    name: 'Northeast',
    divisions: [
      { name: 'New England', states: ['Connecticut', 'Maine', 'Massachusetts', 'New Hampshire', 'Rhode Island', 'Vermont'] },
      { name: 'Middle Atlantic', states: ['New Jersey', 'New York', 'Pennsylvania'] }
    ]
  },
  {
    name: 'Midwest',
    divisions: [
      { name: 'East North Central', states: ['Illinois', 'Indiana', 'Michigan', 'Ohio', 'Wisconsin'] },
      { name: 'West North Central', states: ['Iowa', 'Kansas', 'Minnesota', 'Missouri', 'Nebraska', 'North Dakota', 'South Dakota'] }
    ]
  },
  {
    name: 'South',
    divisions: [
      { name: 'South Atlantic', states: ['Delaware', 'Florida', 'Georgia', 'Maryland', 'North Carolina', 'South Carolina', 'Virginia', 'District of Columbia', 'West Virginia'] },
      { name: 'East South Central', states: ['Alabama', 'Kentucky', 'Mississippi', 'Tennessee'] },
      { name: 'West South Central', states: ['Arkansas', 'Louisiana', 'Oklahoma', 'Texas'] }
    ]
  },
  {
    name: 'West',
    divisions: [
      { name: 'Mountain', states: ['Arizona', 'Colorado', 'Idaho', 'Montana', 'Nevada', 'New Mexico', 'Utah', 'Wyoming'] },
      { name: 'Pacific', states: ['Alaska', 'California', 'Hawaii', 'Oregon', 'Washington'] }
    ]
  }
];

export default function BuyerCriteriaForm({ userId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedRegions, setExpandedRegions] = useState(new Set());
  const [expandedDivisions, setExpandedDivisions] = useState(new Set());
  const [isUSAExpanded, setIsUSAExpanded] = useState(false);
  const navigate = useNavigate();

  const [expandedNaicsSectors, setExpandedNaicsSectors] = useState(new Set());

  const [formData, setFormData] = useState({
    user_id: userId,
    overview: '',
    buyer_type: '',
    min_revenue: '',
    max_revenue: '',
    min_ebitda: '',
    max_ebitda: '',
    min_employees: '',
    max_employees: '',
    locations: [],
    industries: [],
    naics_codes: [],
    transaction_types: [],
    pref_transaction_type: [],
    require_founder_owned: false,
    require_female_owned: false,
    require_minority_owned: false,
    require_family_owned: false,
    require_operator_owned: false
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Format a number with commas (e.g. 40000000 -> "40,000,000")
  const formatWithCommas = (value) => {
    if (!value && value !== 0) return '';
    return Number(value).toLocaleString('en-US');
  };

  // Display value for currency fields: "$1,234,567" or "" if empty
  const displayCurrency = (value) => {
    if (!value && value !== 0) return '';
    return '$' + formatWithCommas(value);
  };

  // Display value for number fields with commas but no $
  const displayNumber = (value) => {
    if (!value && value !== 0) return '';
    return formatWithCommas(value);
  };

  // Handle currency input: strip non-digits, store raw number
  const handleCurrencyChange = (name, rawValue) => {
    const digits = rawValue.replace(/[^0-9]/g, '');
    setFormData(prev => ({
      ...prev,
      [name]: digits === '' ? '' : Number(digits)
    }));
  };

  // NAICS code toggle handlers
  const toggleNaicsSectorExpand = (e, sectorCode) => {
    e.stopPropagation();
    setExpandedNaicsSectors(prev => {
      const next = new Set(prev);
      if (next.has(sectorCode)) next.delete(sectorCode);
      else next.add(sectorCode);
      return next;
    });
  };

  const handleNaicsSectorToggle = (sector) => {
    const allCodes = [sector.code, ...sector.subsectors.map(s => s.code)];
    setFormData(prev => {
      const allSelected = allCodes.every(c => prev.naics_codes.includes(c));
      let updated = [...prev.naics_codes];
      if (allSelected) {
        updated = updated.filter(c => !allCodes.includes(c));
      } else {
        allCodes.forEach(c => { if (!updated.includes(c)) updated.push(c); });
      }
      return { ...prev, naics_codes: updated };
    });
  };

  const handleNaicsSubsectorToggle = (sectorCode, subsectorCode) => {
    setFormData(prev => {
      let updated = [...prev.naics_codes];
      if (updated.includes(subsectorCode)) {
        updated = updated.filter(c => c !== subsectorCode);
        // Deselect parent sector code if it was selected
        updated = updated.filter(c => c !== sectorCode);
      } else {
        if (!updated.includes(subsectorCode)) updated.push(subsectorCode);
        // Check if all subsectors selected → also select parent
        const sector = NAICS_SECTORS.find(s => s.code === sectorCode);
        if (sector && sector.subsectors.every(s => updated.includes(s.code))) {
          if (!updated.includes(sectorCode)) updated.push(sectorCode);
        }
      }
      return { ...prev, naics_codes: updated };
    });
  };

  // Preferred transaction types toggle for buyer
  const handlePrefTransactionToggle = (type) => {
    setFormData(prev => {
      const current = prev.pref_transaction_type || [];
      const exists = current.includes(type);
      const updated = exists ? current.filter(t => t !== type) : [...current, type];
      return { ...prev, pref_transaction_type: updated };
    });
  };

  // Handle plain number input (employees): strip non-digits
  const handleNumberChange = (name, rawValue) => {
    const digits = rawValue.replace(/[^0-9]/g, '');
    setFormData(prev => ({
      ...prev,
      [name]: digits === '' ? '' : Number(digits)
    }));
  };

  const handleStateToggle = (stateName) => {
    setFormData(prev => ({
      ...prev,
      locations: prev.locations.includes(stateName)
        ? prev.locations.filter(s => s !== stateName)
        : [...prev.locations, stateName]
    }));
  };

  const allUSAStates = CENSUS_REGIONS.flatMap(r => r.divisions.flatMap(d => d.states));
  
  const handleUSAToggle = () => {
    setFormData(prev => {
      const allSelected = allUSAStates.every(s => prev.locations.includes(s));
      let newLocations = [...prev.locations];
      if (allSelected) {
        newLocations = newLocations.filter(s => !allUSAStates.includes(s));
      } else {
        allUSAStates.forEach(s => {
          if (!newLocations.includes(s)) newLocations.push(s);
        });
      }
      return { ...prev, locations: newLocations };
    });
  };

  const handleDivisionToggle = (division) => {
    const states = division.states;
    setFormData(prev => {
      const allSelected = states.every(s => prev.locations.includes(s));
      let newLocations = [...prev.locations];
      
      if (allSelected) {
        newLocations = newLocations.filter(s => !states.includes(s));
      } else {
        states.forEach(s => {
          if (!newLocations.includes(s)) newLocations.push(s);
        });
      }
      return { ...prev, locations: newLocations };
    });
  };

  const handleRegionToggle = (region) => {
    const allStates = region.divisions.flatMap(d => d.states);
    setFormData(prev => {
      const allSelected = allStates.every(s => prev.locations.includes(s));
      let newLocations = [...prev.locations];
      
      if (allSelected) {
        newLocations = newLocations.filter(s => !allStates.includes(s));
      } else {
        allStates.forEach(s => {
          if (!newLocations.includes(s)) newLocations.push(s);
        });
      }
      return { ...prev, locations: newLocations };
    });
  };

  const toggleRegionExpand = (e, regionName) => {
    e.stopPropagation();
    setExpandedRegions(prev => {
      const next = new Set(prev);
      if (next.has(regionName)) next.delete(regionName);
      else next.add(regionName);
      return next;
    });
  };

  const toggleDivisionExpand = (e, divisionName) => {
    e.stopPropagation();
    setExpandedDivisions(prev => {
      const next = new Set(prev);
      if (next.has(divisionName)) next.delete(divisionName);
      else next.add(divisionName);
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await buyerService.saveCriteria(formData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-6 animate-fade-in">
      <div className="mb-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-500/10 rounded-2xl mb-4">
          <Target className="text-indigo-400" size={32} />
        </div>
        <h1 className="text-4xl font-black mb-4 tracking-tight">Investment Criteria</h1>
        <p className="text-slate-400 max-w-lg mx-auto">
          Define your target profile. These settings will help us match you with the best available seller listings.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 0: About the Buyer */}
        <div className="glass" style={{ padding: '2rem', borderRadius: '1.5rem', border: '1px solid #1e293b', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, padding: '1rem', opacity: 0.1 }}>
            <Users size={80} />
          </div>
          
          <div className="geo-row" style={{ marginBottom: '2rem', cursor: 'default' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users style={{ color: '#818cf8' }} size={20} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>About the Buyer</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
            <div className="field-group">
              <label className="form-label" style={{ marginBottom: '0.75rem', display: 'block' }}>Brief Overview / Summary</label>
              <textarea
                name="overview"
                className="form-input"
                style={{ width: '100%', minHeight: '120px', resize: 'vertical' }}
                placeholder="Tell us about yourself..."
                value={formData.overview}
                onChange={handleChange}
              />
            </div>

            <div className="field-group">
              <label className="form-label" style={{ marginBottom: '0.75rem', display: 'block' }}>Buyer Type</label>
              <select
                name="buyer_type"
                className="form-input"
                style={{ width: '100%', cursor: 'pointer', appearance: 'auto' }}
                value={formData.buyer_type || ''}
                onChange={handleChange}
              >
                <option value="" disabled>Select buyer type...</option>
                <option value="Strategic">Strategic</option>
                <option value="Private Equity">Private Equity</option>
                <option value="Family Office">Family Office</option>
                <option value="Individual">Individual</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 1: Financial Range */}
        <div className="glass" style={{ padding: '2rem', borderRadius: '1.5rem', border: '1px solid #1e293b', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, padding: '1rem', opacity: 0.1 }}>
            <DollarSign size={80} />
          </div>
          
          <div className="geo-row" style={{ marginBottom: '2rem', cursor: 'default' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp style={{ color: '#34d399' }} size={20} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Financial Performance Range</h2>
          </div>

          <div className="fields-grid">
            <div className="field-group">
              <label className="form-label">Revenue Target</label>
              <div className="range-row">
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="$ Min" 
                  value={displayCurrency(formData.min_revenue)} 
                  onChange={(e) => handleCurrencyChange('min_revenue', e.target.value)} 
                />
                <span className="range-separator">To</span>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="$ Max" 
                  value={displayCurrency(formData.max_revenue)} 
                  onChange={(e) => handleCurrencyChange('max_revenue', e.target.value)} 
                />
              </div>
            </div>

            <div className="field-group">
              <label className="form-label">EBITDA Target</label>
              <div className="range-row">
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="$ Min" 
                  value={displayCurrency(formData.min_ebitda)} 
                  onChange={(e) => handleCurrencyChange('min_ebitda', e.target.value)} 
                />
                <span className="range-separator">To</span>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="$ Max" 
                  value={displayCurrency(formData.max_ebitda)} 
                  onChange={(e) => handleCurrencyChange('max_ebitda', e.target.value)} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Geographical Focus */}
        <div className="glass" style={{ padding: '2rem', borderRadius: '1.5rem', border: '1px solid #1e293b', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', position: 'relative' }}>
          <div className="geo-row" style={{ marginBottom: '2rem', cursor: 'default' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Globe className="geo-globe" size={20} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Geographical Focus</h2>
          </div>

          <div className="geo-tree">
            {/* Root Node: USA */}
            <div className="geo-row">
              <div 
                className={`geo-check ${
                  allUSAStates.every(s => formData.locations.includes(s)) ? 'checked' : 
                  allUSAStates.some(s => formData.locations.includes(s)) ? 'partial' : ''
                }`}
                onClick={(e) => { e.stopPropagation(); handleUSAToggle(); }}
              >
                {allUSAStates.every(s => formData.locations.includes(s)) 
                  ? <CheckCircle2 size={14} />
                  : allUSAStates.some(s => formData.locations.includes(s))
                    ? <span style={{ width: 8, height: 8, background: '#e2e8f0', borderRadius: 1, display: 'block' }} />
                    : null
                }
              </div>
              <Globe size={18} className="geo-globe" />
              <span className="geo-label-bold" onClick={() => handleUSAToggle()}>United States of America</span>
              <button 
                type="button" 
                onClick={(e) => { e.stopPropagation(); setIsUSAExpanded(!isUSAExpanded); }}
                className="geo-toggle"
              >
                {isUSAExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>

            {isUSAExpanded && (
              <div className="geo-children">
                {CENSUS_REGIONS.map((region, rIdx) => {
                  const isLastRegion = rIdx === CENSUS_REGIONS.length - 1;
                  const regionStates = region.divisions.flatMap(d => d.states);
                  const allSelected = regionStates.every(s => formData.locations.includes(s));
                  const someSelected = regionStates.some(s => formData.locations.includes(s)) && !allSelected;
                  const isExpanded = expandedRegions.has(region.name);

                  return (
                    <div key={region.name} className={`geo-branch ${isLastRegion ? 'geo-branch-last' : ''}`}>
                      <div className="geo-row">
                        <div 
                          className={`geo-check-sm ${allSelected ? 'checked' : someSelected ? 'partial' : ''}`}
                          onClick={() => handleRegionToggle(region)}
                        >
                          {allSelected 
                            ? <CheckCircle2 size={12} />
                            : someSelected
                              ? <span style={{ width: 6, height: 6, background: '#e2e8f0', borderRadius: 1, display: 'block' }} />
                              : null
                          }
                        </div>
                        <span className="geo-label-semi" onClick={() => handleRegionToggle(region)}>
                          {region.name}
                        </span>
                        <button 
                          type="button" 
                          onClick={(e) => toggleRegionExpand(e, region.name)}
                          className="geo-toggle"
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="geo-children">
                          {region.divisions.map((division, dIdx) => {
                            const isLastDev = dIdx === region.divisions.length - 1;
                            const divisionStates = division.states;
                            const dAllSelected = divisionStates.every(s => formData.locations.includes(s));
                            const dSomeSelected = divisionStates.some(s => formData.locations.includes(s)) && !dAllSelected;
                            const isDivExpanded = expandedDivisions.has(division.name);

                            return (
                              <div key={division.name} className={`geo-branch ${isLastDev ? 'geo-branch-last' : ''}`}>
                                <div className="geo-row">
                                  <div 
                                    className={`geo-check-sm ${dAllSelected ? 'checked' : dSomeSelected ? 'partial' : ''}`}
                                    onClick={() => handleDivisionToggle(division)}
                                  >
                                    {dAllSelected 
                                      ? <CheckCircle2 size={12} />
                                      : dSomeSelected
                                        ? <span style={{ width: 6, height: 6, background: '#e2e8f0', borderRadius: 1, display: 'block' }} />
                                        : null
                                    }
                                  </div>
                                  <span className="geo-label" onClick={() => handleDivisionToggle(division)}>
                                    {division.name}
                                  </span>
                                  <button 
                                    type="button" 
                                    onClick={(e) => toggleDivisionExpand(e, division.name)}
                                    className="geo-toggle"
                                  >
                                    {isDivExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                  </button>
                                </div>

                                {isDivExpanded && (
                                  <div className="geo-children">
                                    {division.states.map((stateName, sIdx) => {
                                      const isLastState = sIdx === division.states.length - 1;
                                      const isStateSelected = formData.locations.includes(stateName);

                                      return (
                                        <div key={stateName} className={`geo-branch ${isLastState ? 'geo-branch-last' : ''}`}>
                                          <div className="geo-row">
                                            <div 
                                              className={`geo-check-sm ${isStateSelected ? 'checked' : ''}`}
                                              onClick={() => handleStateToggle(stateName)}
                                            >
                                              {isStateSelected && <CheckCircle2 size={10} />}
                                            </div>
                                            <span 
                                              className={`geo-label-state ${isStateSelected ? 'selected' : ''}`}
                                              onClick={() => handleStateToggle(stateName)}
                                            >
                                              {stateName}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Industry & Metadata */}
        <div className="glass p-8 rounded-3xl border border-slate-800 shadow-xl relative">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Search className="text-amber-400" size={20} />
            </div>
            <h2 className="text-xl font-bold">Sectors & Attributes</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
            {/* Left: Keyword Tags */}
            <div>
              <label className="form-label">Industries & Keywords</label>
              <TagInput 
                tags={formData.industries}
                onChange={(newTags) => setFormData(prev => ({ ...prev, industries: newTags }))}
                placeholder="e.g. SaaS, Manufacturing, Medical... (press Enter to add)"
              />
            </div>

            {/* Right: NAICS Code Tree */}
            <div>
              <label className="form-label" style={{ marginBottom: '0.75rem', display: 'block' }}>
                NAICS Industry Codes
                {formData.naics_codes.length > 0 && (
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', background: 'rgba(99,102,241,0.15)', color: '#818cf8', borderRadius: 999, padding: '2px 8px', fontWeight: 600 }}>
                    {formData.naics_codes.length} selected
                  </span>
                )}
              </label>
              <div className="geo-tree" style={{ maxHeight: '320px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                {NAICS_SECTORS.map((sector, sIdx) => {
                  const isLastSector = sIdx === NAICS_SECTORS.length - 1;
                  const allSubCodes = sector.subsectors.map(s => s.code);
                  const allSelected = [sector.code, ...allSubCodes].every(c => formData.naics_codes.includes(c));
                  const someSelected = allSubCodes.some(c => formData.naics_codes.includes(c)) && !allSelected;
                  const isExpanded = expandedNaicsSectors.has(sector.code);

                  return (
                    <div key={sector.code} className={`geo-branch ${isLastSector ? 'geo-branch-last' : ''}`}>
                      <div className="geo-row">
                        <div
                          className={`geo-check-sm ${allSelected ? 'checked' : someSelected ? 'partial' : ''}`}
                          onClick={() => handleNaicsSectorToggle(sector)}
                        >
                          {allSelected
                            ? <CheckCircle2 size={12} />
                            : someSelected
                              ? <span style={{ width: 6, height: 6, background: '#e2e8f0', borderRadius: 1, display: 'block' }} />
                              : null
                          }
                        </div>
                        <span
                          className="geo-label-semi"
                          style={{ fontSize: '0.875rem' }}
                          onClick={() => handleNaicsSectorToggle(sector)}
                        >
                          <span style={{ color: '#6366f1', fontFamily: 'monospace', marginRight: '0.3rem' }}>{sector.code}</span>
                          {sector.name}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => toggleNaicsSectorExpand(e, sector.code)}
                          className="geo-toggle"
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="geo-children">
                          {sector.subsectors.map((sub, ssIdx) => {
                            const isLastSub = ssIdx === sector.subsectors.length - 1;
                            const isSubSelected = formData.naics_codes.includes(sub.code);
                            return (
                              <div key={sub.code} className={`geo-branch ${isLastSub ? 'geo-branch-last' : ''}`}>
                                <div className="geo-row">
                                  <div
                                    className={`geo-check-sm ${isSubSelected ? 'checked' : ''}`}
                                    onClick={() => handleNaicsSubsectorToggle(sector.code, sub.code)}
                                  >
                                    {isSubSelected && <CheckCircle2 size={10} />}
                                  </div>
                                  <span
                                    className={`geo-label-state ${isSubSelected ? 'selected' : ''}`}
                                    style={{ fontSize: '0.875rem' }}
                                    onClick={() => handleNaicsSubsectorToggle(sector.code, sub.code)}
                                  >
                                    <span style={{ color: '#6366f1', fontFamily: 'monospace', marginRight: '0.3rem' }}>{sub.code}</span>
                                    {sub.name}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Preferred Transaction Types */}
          <div className="space-y-4" style={{ marginTop: '2rem' }}>
            <label className="form-label">Preferred Transaction Types</label>
            <div className="grid grid-cols-1 gap-2">
              {['Total Sale', 'Acquisition of Majority Stake', 'Acquisition of Minority Stake', 'Equity Raise', 'Debt Raise', 'Divestiture', 'Recapitalization'].map(type => (
                <label key={type} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="pref_transaction_type"
                    className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
                    checked={formData.pref_transaction_type?.includes(type)}
                    onChange={() => handlePrefTransactionToggle(type)}
                  />
                  <span className="text-sm text-slate-400 group-hover:text-white transition-colors">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Other Preferences */}
          <div className="space-y-4" style={{ marginTop: '2rem' }}>
            <label className="form-label">Other Preferences</label>
            <div className="grid grid-cols-1 gap-3">
              {[
                { key: 'require_founder_owned', label: 'Founder-Owned' },
                { key: 'require_female_owned', label: 'Female-Owned' },
                { key: 'require_minority_owned', label: 'Minority-Owned' },
                { key: 'require_family_owned', label: 'Family-Owned' },
                { key: 'require_operator_owned', label: 'Operator-Owned' }
              ].map(pref => (
                <label key={pref.key} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    name={pref.key}
                    className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
                    checked={formData[pref.key]}
                    onChange={handleChange}
                  />
                  <span className="text-sm text-slate-400 group-hover:text-white transition-colors">{pref.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <CheckCircle2 size={16} className="rotate-45" />
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center py-6">
          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary flex items-center gap-3 px-16 py-4 text-lg font-bold shadow-2xl shadow-indigo-500/20 group h-auto"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <>
                Save Investment Criteria
                <ChevronRight className="group-hover:translate-x-1 transition-transform" size={24} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
