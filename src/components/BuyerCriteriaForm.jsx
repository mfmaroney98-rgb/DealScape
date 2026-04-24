import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  X,
  Loader2
} from 'lucide-react';





export default function BuyerCriteriaForm({ userId, orgId, onComplete }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedContinents, setExpandedContinents] = useState(new Set());
  const [expandedCountries, setExpandedCountries] = useState(new Set());
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

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

    if (isEditing) {
      setLoading(true);
      // isCorporate could be passed down, but for now we assume orgId filter
      buyerService.getCriteriaById(id, orgId)
        .then(data => {
          if (data) {
            setFormData(prev => ({
              ...prev,
              ...data,
              financial_criteria: Array.isArray(data.financial_criteria) ? data.financial_criteria : prev.financial_criteria,
              locations: Array.isArray(data.locations) ? data.locations : [],
              keywords: Array.isArray(data.keywords) ? data.keywords : [],
              naics_codes: Array.isArray(data.naics_codes) ? data.naics_codes : []
            }));
          }
        })
        .catch(err => {
          console.error('Failed to load criteria:', err);
          setError('Failed to load investment criteria data.');
        })
        .finally(() => setLoading(false));
    }
  }, [isEditing, id]);

  const [formData, setFormData] = useState({
    user_id: userId,
    organization_id: orgId,
    investment_criteria_name: '',
    financial_criteria: [
      { id: Date.now(), metric: 'Revenue', min: '', max: '' },
      { id: Date.now() + 1, metric: 'EBITDA Margin', min: '', max: '' }
    ],
    locations: [],
    keywords: [],
    naics_codes: [],
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

  // Format a number with commas (e.g. 40000000 -> "40,000,000") while preserving decimals
  const formatWithCommas = (value) => {
    if (!value && value !== 0 && value !== '0') return '';
    const strVal = value.toString();
    const parts = strVal.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join('.');
  };

  // Display value for currency fields: "$1,234,567" or "" if empty
  const displayCurrency = (value) => {
    if (!value && value !== 0 && value !== '0') return '';
    return '$' + formatWithCommas(value);
  };

  // Display value for number fields with commas but no $
  const displayNumber = (value) => {
    if (!value && value !== 0 && value !== '0') return '';
    return formatWithCommas(value);
  };

  // Display value for percentage fields: "25%" or "" if empty
  const displayPercentage = (value) => {
    if (!value && value !== 0 && value !== '0') return '';
    return formatWithCommas(value) + '%';
  };

  // Handle currency input: strip non-digits, store raw string
  const handleCurrencyChange = (name, rawValue) => {
    const digits = rawValue.replace(/[^0-9.-]/g, '');
    setFormData(prev => ({
      ...prev,
      [name]: digits
    }));
  };

  const handleFinancialCriteriaChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...(prev.financial_criteria || [])];
      if (!updated[index]) return prev;
      
      if (field === 'min' || field === 'max') {
        const lowerMetric = (updated[index].metric || '').toLowerCase();
        const isPct = lowerMetric.includes('margin') || lowerMetric.includes('growth') || lowerMetric.includes('%') || lowerMetric.includes('cagr');
        
        let rawValue = value;
        const oldVal = updated[index][field];
        const oldFormatted = isPct ? displayPercentage(oldVal) : displayCurrency(oldVal);
        
        // If it's a percentage and they deleted the '%' sign at the end
        if (isPct && oldFormatted.endsWith('%') && value === oldFormatted.slice(0, -1)) {
          rawValue = value.slice(0, -1);
        }

        let digits = rawValue.replace(/[^0-9.-]/g, '');
        
        // Prevent multiple decimals
        const decimalParts = digits.split('.');
        if (decimalParts.length > 2) {
          digits = decimalParts[0] + '.' + decimalParts.slice(1).join('');
        }

        updated[index] = { ...updated[index], [field]: digits };
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

  const makeStateKey = (countryCode, stateName) => `${countryCode}:${stateName}`;

  const handleStateToggle = (countryCode, stateName) => {
    const key = makeStateKey(countryCode, stateName);
    setFormData(prev => ({
      ...prev,
      locations: prev.locations.includes(key)
        ? prev.locations.filter(s => s !== key)
        : [...prev.locations, key]
    }));
  };

  const handleCountryToggle = (country) => {
    const keys = country.states.map(s => makeStateKey(country.code, s));
    setFormData(prev => {
      const allSelected = keys.every(k => prev.locations.includes(k));
      let newLocations = [...prev.locations];
      if (allSelected) {
        newLocations = newLocations.filter(k => !keys.includes(k));
      } else {
        keys.forEach(k => { if (!newLocations.includes(k)) newLocations.push(k); });
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
    const allKeys = continent.countries.flatMap(c => c.states.map(s => makeStateKey(c.code, s)));
    setFormData(prev => {
      const allSelected = allKeys.length > 0 && allKeys.every(k => prev.locations.includes(k));
      let newLocations = [...prev.locations];
      if (allSelected) {
        newLocations = newLocations.filter(k => !allKeys.includes(k));
      } else {
        allKeys.forEach(k => { if (!newLocations.includes(k)) newLocations.push(k); });
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
      // Map the dynamic financial_criteria array to flat columns for high-performance searching
      const metricMapping = {
        'Revenue': 'search_revenue',
        'Revenue Growth (YoY)': 'search_revenue_growth_yoy',
        'Revenue CAGR': 'search_revenue_cagr',
        'Gross Profit': 'search_gross_profit',
        'Gross Profit Margin': 'search_gross_margin',
        'EBITDA': 'search_ebitda',
        'EBITDA Growth (YoY)': 'search_ebitda_growth_yoy',
        'EBITDA Margin': 'search_ebitda_margin',
        'EBIT': 'search_ebit',
        'EBIT Margin': 'search_ebit_margin',
        'Net Income': 'search_net_income',
        'Net Margin': 'search_net_margin'
      };

      const flattenedData = { ...formData };
      
      // Initialize all searchable columns to null first
      Object.values(metricMapping).forEach(col => {
        flattenedData[`${col}_min`] = null;
        flattenedData[`${col}_max`] = null;
      });

      // Populate columns from the dynamic list
      if (Array.isArray(formData.financial_criteria)) {
        formData.financial_criteria.forEach(fc => {
          const colBase = metricMapping[fc.metric];
          if (colBase) {
            const isPct = (fc.metric || '').toLowerCase().includes('margin') || 
                          (fc.metric || '').toLowerCase().includes('growth') || 
                          (fc.metric || '').toLowerCase().includes('%') || 
                          (fc.metric || '').toLowerCase().includes('cagr');
                          
            let parsedMin = fc.min === '' || fc.min == null ? null : Number(fc.min);
            let parsedMax = fc.max === '' || fc.max == null ? null : Number(fc.max);
            
            if (isPct) {
              if (parsedMin !== null) parsedMin = parsedMin / 100;
              if (parsedMax !== null) parsedMax = parsedMax / 100;
            }
            
            flattenedData[`${colBase}_min`] = parsedMin;
            flattenedData[`${colBase}_max`] = parsedMax;
          }
        });
      }

      await buyerService.saveCriteria(flattenedData);
      
      if (onComplete) {
        await onComplete();
      }

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
        {/* Section 0: Criteria Identity */}
        <div className="glass p-8 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="geo-row" style={{ marginBottom: '1.5rem', cursor: 'default' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Target style={{ color: '#818cf8' }} size={20} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Criteria Identity</h2>
          </div>

          <div className="field-group" style={{ marginBottom: 0 }}>
            <label className="form-label mb-2 block">Investment Criteria Name</label>
            <input
              type="text"
              name="investment_criteria_name"
              className="form-input"
              placeholder="e.g. Mid-Market Software (US/Canada)"
              value={formData.investment_criteria_name || ''}
              onChange={handleChange}
              required
            />
            <p className="text-xs text-slate-500 mt-2">
              Give this specific set of filters a descriptive name for your dashboard.
            </p>
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
                    const lowerMetric = (criteria.metric || '').toLowerCase();
                    const isPct = lowerMetric.includes('margin') || lowerMetric.includes('growth') || lowerMetric.includes('%') || lowerMetric.includes('cagr');
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
                const allContinentKeys = continent.countries.flatMap(c => c.states.map(s => makeStateKey(c.code, s)));
                const allContSelected = allContinentKeys.length > 0 && allContinentKeys.every(k => formData.locations.includes(k));
                const someContSelected = allContinentKeys.some(k => formData.locations.includes(k)) && !allContSelected;
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
                          const ctryKeys = country.states.map(s => makeStateKey(country.code, s));
                          const allCtrySelected = ctryKeys.length > 0 && ctryKeys.every(k => formData.locations.includes(k));
                          const someCtrySelected = ctryKeys.some(k => formData.locations.includes(k)) && !allCtrySelected;
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
                                    const stateKey = makeStateKey(country.code, stateName);
                                    const isStateSelected = formData.locations.includes(stateKey);
                                    return (
                                      <div key={stateKey} className={`geo-branch ${isLastState ? 'geo-branch-last' : ''}`}>
                                        <div className="geo-row">
                                          <div
                                            className={`geo-check-sm ${isStateSelected ? 'checked' : ''}`}
                                            onClick={() => handleStateToggle(country.code, stateName)}
                                          >
                                            {isStateSelected && <CheckCircle2 size={10} />}
                                          </div>
                                          <span
                                            className={`geo-label-state ${isStateSelected ? 'selected' : ''}`}
                                            onClick={() => handleStateToggle(country.code, stateName)}
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
              <label className="form-label">Keywords</label>
              <TagInput 
                tags={formData.keywords}
                onChange={(newTags) => setFormData(prev => ({ ...prev, keywords: newTags }))}
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
              {['Total Sale', 'Acquisition of Majority Stake', 'Acquisition of Minority Stake', 'Equity Raise', 'Debt Raise', 'Divestiture', 'Recapitalization', 'Restructuring'].map(type => (
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
        <div className="flex justify-center items-center gap-6 py-10">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary px-12 py-4 text-lg font-bold border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white transition-all h-auto"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary-emerald flex items-center gap-3 px-16 py-4 text-lg font-bold shadow-2xl shadow-emerald-500/20 group h-auto"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                {isEditing ? 'Update Investment Criteria' : 'Save Investment Criteria'}
                <ChevronRight className="group-hover:translate-x-1 transition-transform" size={24} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
