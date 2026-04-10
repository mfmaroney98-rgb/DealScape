import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { buyerService } from '../services/buyerService';
import TagInput from './TagInput';
import { fetchNaicsSectors } from '../services/naicsService';
import { fetchGeographyTree } from '../services/geographyService';
import { fetchFinancialMetrics } from '../services/financialMetricsService';
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
  Globe,
  Plus,
  X
} from 'lucide-react';





export default function BuyerCriteriaForm({ userId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedContinents, setExpandedContinents] = useState(new Set());
  const [expandedCountries, setExpandedCountries] = useState(new Set());
  const navigate = useNavigate();

  // Geography data loaded from Supabase
  const [geoTree, setGeoTree] = useState([]);
  const [geoLoading, setGeoLoading] = useState(true);
  const [geoError, setGeoError] = useState(null);

  useEffect(() => {
    fetchGeographyTree()
      .then(data => setGeoTree(data))
      .catch(err => setGeoError(err.message || 'Failed to load geography data'))
      .finally(() => setGeoLoading(false));
  }, []);

  const [expandedNaicsSectors, setExpandedNaicsSectors] = useState(new Set());

  // NAICS data loaded from Supabase
  const [naicsSectors, setNaicsSectors] = useState([]);
  const [naicsLoading, setNaicsLoading] = useState(true);
  const [naicsError, setNaicsError] = useState(null);

  useEffect(() => {
    fetchNaicsSectors()
      .then(data => setNaicsSectors(data))
      .catch(err => setNaicsError(err.message || 'Failed to load NAICS codes'))
      .finally(() => setNaicsLoading(false));
  }, []);

  // Financial metrics loaded from Supabase
  const [financialMetrics, setFinancialMetrics] = useState([]);

  useEffect(() => {
    fetchFinancialMetrics()
      .then(data => setFinancialMetrics(data))
      .catch(() => {
        setFinancialMetrics(['Revenue', 'Gross Profit', 'EBITDA', 'EBITDA Margin', 'Net Income']);
      });
  }, []);

  const [formData, setFormData] = useState({
    user_id: userId,
    company_name: '',
    website: '',
    overview: '',
    buyer_type: '',
    financial_criteria: [
      { id: Date.now(), metric: 'Revenue', min: '', max: '' },
      { id: Date.now() + 1, metric: 'EBITDA Margin', min: '', max: '' }
    ],
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

  // Display value for percentage fields: "25%" or "" if empty
  const displayPercentage = (value) => {
    if (!value && value !== 0) return '';
    return formatWithCommas(value) + '%';
  };

  // Handle currency input: strip non-digits, store raw number
  const handleCurrencyChange = (name, rawValue) => {
    const digits = rawValue.replace(/[^0-9]/g, '');
    setFormData(prev => ({
      ...prev,
      [name]: digits === '' ? '' : Number(digits)
    }));
  };

  const handleFinancialCriteriaChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...(prev.financial_criteria || [])];
      if (!updated[index]) return prev;
      
      if (field === 'min' || field === 'max') {
        const digits = value.replace(/[^0-9.-]/g, '');
        updated[index] = { ...updated[index], [field]: digits === '' ? '' : Number(digits) };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return { ...prev, financial_criteria: updated };
    });
  };

  const addFinancialCriteria = () => {
    setFormData(prev => ({
      ...prev,
      financial_criteria: [
        ...(prev.financial_criteria || []),
        { id: Date.now(), metric: 'Revenue', min: '', max: '' }
      ]
    }));
  };

  const removeFinancialCriteria = (index) => {
    setFormData(prev => ({
      ...prev,
      financial_criteria: (prev.financial_criteria || []).filter((_, i) => i !== index)
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
        const sector = naicsSectors.find(s => s.code === sectorCode);
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

  const handleCountryToggle = (country) => {
    setFormData(prev => {
      const allSelected = country.states.every(s => prev.locations.includes(s));
      let newLocations = [...prev.locations];
      if (allSelected) {
        newLocations = newLocations.filter(s => !country.states.includes(s));
      } else {
        country.states.forEach(s => {
          if (!newLocations.includes(s)) newLocations.push(s);
        });
      }
      return { ...prev, locations: newLocations };
    });
  };

  const toggleCountryExpand = (e, countryCode) => {
    e.stopPropagation();
    setExpandedCountries(prev => {
      const next = new Set(prev);
      if (next.has(countryCode)) next.delete(countryCode);
      else next.add(countryCode);
      return next;
    });
  };

  const handleContinentToggle = (continent) => {
    const allStates = continent.countries.flatMap(c => c.states);
    setFormData(prev => {
      const allSelected = allStates.every(s => prev.locations.includes(s));
      let newLocations = [...prev.locations];
      if (allSelected) {
        newLocations = newLocations.filter(s => !allStates.includes(s));
      } else {
        allStates.forEach(s => { if (!newLocations.includes(s)) newLocations.push(s); });
      }
      return { ...prev, locations: newLocations };
    });
  };

  const toggleContinentExpand = (e, continentName) => {
    e.stopPropagation();
    setExpandedContinents(prev => {
      const next = new Set(prev);
      if (next.has(continentName)) next.delete(continentName);
      else next.add(continentName);
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start', marginBottom: '1.5rem' }}>
            <div className="field-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ marginBottom: '0.75rem', display: 'block' }}>Company Name</label>
              <input
                type="text"
                name="company_name"
                className="form-input"
                placeholder="e.g. Acme Investments"
                value={formData.company_name || ''}
                onChange={handleChange}
              />
            </div>
            
            <div className="field-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ marginBottom: '0.75rem', display: 'block' }}>Website</label>
              <input
                type="text"
                name="website"
                className="form-input"
                placeholder="e.g. www.example.com"
                value={formData.website || ''}
                onChange={handleChange}
              />
            </div>
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
                <option value="PE Firm">PE Firm</option>
                <option value="Independent Sponsor / Fundless Sponsor">Independent Sponsor / Fundless Sponsor</option>
                <option value="Search Fund">Search Fund</option>
                <option value="Growth Equity Firm">Growth Equity Firm</option>
                <option value="Venture Capital Firm">Venture Capital Firm</option>
                <option value="Strategic Acquirer (Public)">Strategic Acquirer (Public)</option>
                <option value="Strategic Acquirer (Private / PE Owned)">Strategic Acquirer (Private / PE Owned)</option>
                <option value="Family Office">Family Office</option>
                <option value="High Net Worth Individual">High Net Worth Individual</option>
                <option value="Entrepreneur via Acquisition (ETA)">Entrepreneur via Acquisition (ETA)</option>
                <option value="Mezzanine Fund">Mezzanine Fund</option>
                <option value="BDC">BDC</option>
                <option value="Direct Lending Fund">Direct Lending Fund</option>
                <option value="Distressed Debt Fund">Distressed Debt Fund</option>
                <option value="Holding Company">Holding Company</option>
                <option value="Sovereign Wealth Fund">Sovereign Wealth Fund</option>
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

          <div className="flex flex-col gap-4 mb-4">
            {(formData.financial_criteria || []).map((criteria, index) => (
              <div key={criteria.id} className="field-group bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <select
                    className="form-input"
                    style={{ width: '50%', appearance: 'auto', cursor: 'pointer', padding: '0.6rem 0.75rem' }}
                    value={criteria.metric}
                    onChange={(e) => handleFinancialCriteriaChange(index, 'metric', e.target.value)}
                  >
                    {financialMetrics.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  
                  <button
                    type="button"
                    className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                    onClick={() => removeFinancialCriteria(index)}
                    title="Remove criteria"
                  >
                    <X size={18} />
                  </button>
                </div>
                
                <div className="range-row">
                  {(() => {
                    const isPct = criteria.metric.includes('Margin') || criteria.metric.includes('Growth') || criteria.metric.includes('%');
                    return (
                      <>
                        <input 
                          type="text" 
                          className="form-input flex-1" 
                          placeholder={isPct ? "% Min" : "$ Min"} 
                          value={isPct ? displayPercentage(criteria.min) : displayCurrency(criteria.min)} 
                          onChange={(e) => handleFinancialCriteriaChange(index, 'min', e.target.value)} 
                        />
                        <span className="range-separator px-1">To</span>
                        <input 
                          type="text" 
                          className="form-input flex-1" 
                          placeholder={isPct ? "% Max" : "$ Max"} 
                          value={isPct ? displayPercentage(criteria.max) : displayCurrency(criteria.max)} 
                          onChange={(e) => handleFinancialCriteriaChange(index, 'max', e.target.value)} 
                        />
                      </>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
            
          <button
             type="button"
             className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors mt-2 text-sm font-semibold w-fit px-2"
             onClick={addFinancialCriteria}
          >
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <Plus size={18} />
            </div>
            Add another criteria
          </button>
        </div>

        {/* Section 2: Geographical Focus */}
        <div className="glass" style={{ padding: '2rem', borderRadius: '1.5rem', border: '1px solid #1e293b', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', position: 'relative' }}>
          <div className="geo-row" style={{ marginBottom: '2rem', cursor: 'default' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Globe className="geo-globe" size={20} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Geographical Focus</h2>
          </div>

          <div className="geo-tree" style={{ maxHeight: '360px', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {geoLoading ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                Loading geography data...
              </div>
            ) : geoError ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#f87171', fontSize: '0.875rem' }}>
                {geoError}
              </div>
            ) : (
              geoTree.map((continent, coIdx) => {
                const isLastContinent = coIdx === geoTree.length - 1;
                const allContinentStates = continent.countries.flatMap(c => c.states);
                const allContSelected = allContinentStates.every(s => formData.locations.includes(s));
                const someContSelected = allContinentStates.some(s => formData.locations.includes(s)) && !allContSelected;
                const isContExpanded = expandedContinents.has(continent.name);

                return (
                  <div key={continent.name} className={`geo-branch ${isLastContinent ? 'geo-branch-last' : ''}`}>
                    <div className="geo-row">
                      <div
                        className={`geo-check ${allContSelected ? 'checked' : someContSelected ? 'partial' : ''}`}
                        onClick={(e) => { e.stopPropagation(); handleContinentToggle(continent); }}
                      >
                        {allContSelected
                          ? <CheckCircle2 size={14} />
                          : someContSelected
                            ? <span style={{ width: 8, height: 8, background: '#e2e8f0', borderRadius: 1, display: 'block' }} />
                            : null
                        }
                      </div>
                      <span className="geo-label-bold" onClick={() => handleContinentToggle(continent)}>
                        {continent.name}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => toggleContinentExpand(e, continent.name)}
                        className="geo-toggle"
                      >
                        {isContExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>

                    {isContExpanded && (
                      <div className="geo-children">
                        {continent.countries.map((country, cIdx) => {
                          const isLastCountry = cIdx === continent.countries.length - 1;
                          const allCtrySelected = country.states.every(s => formData.locations.includes(s));
                          const someCtrySelected = country.states.some(s => formData.locations.includes(s)) && !allCtrySelected;
                          const isCtryExpanded = expandedCountries.has(country.code);

                          return (
                            <div key={country.code} className={`geo-branch ${isLastCountry ? 'geo-branch-last' : ''}`}>
                              <div className="geo-row">
                                <div
                                  className={`geo-check-sm ${allCtrySelected ? 'checked' : someCtrySelected ? 'partial' : ''}`}
                                  onClick={() => handleCountryToggle(country)}
                                >
                                  {allCtrySelected
                                    ? <CheckCircle2 size={12} />
                                    : someCtrySelected
                                      ? <span style={{ width: 6, height: 6, background: '#e2e8f0', borderRadius: 1, display: 'block' }} />
                                      : null
                                  }
                                </div>
                                <span className="geo-label-semi" onClick={() => handleCountryToggle(country)}>
                                  {country.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => toggleCountryExpand(e, country.code)}
                                  className="geo-toggle"
                                >
                                  {isCtryExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                              </div>

                              {isCtryExpanded && (
                                <div className="geo-children">
                                  {country.states.map((stateName, sIdx) => {
                                    const isLastState = sIdx === country.states.length - 1;
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
              })
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
                {naicsLoading ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                    Loading NAICS codes...
                  </div>
                ) : naicsError ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: '#f87171', fontSize: '0.875rem' }}>
                    {naicsError}
                  </div>
                ) : (
                  naicsSectors.map((sector, sIdx) => {
                    const isLastSector = sIdx === naicsSectors.length - 1;
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
                  })
                )}
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
