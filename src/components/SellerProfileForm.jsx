import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sellerService } from '../services/sellerService';
import TagInput from './TagInput';
import { fetchGeographyTree } from '../services/geographyService';
import {
  Building2,
  TrendingUp,
  MapPin,
  Users,
  PieChart,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Tag,
  Briefcase,
  UploadCloud,
  FileText,
  AlertCircle,
  Globe
} from 'lucide-react';



export default function SellerProfileForm({ userId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [autoFilledFields, setAutoFilledFields] = useState(new Set());
  const [autoFilledTags, setAutoFilledTags] = useState([]);
  const [expandedContinents, setExpandedContinents] = useState(new Set());
  const [expandedCountries, setExpandedCountries] = useState(new Set());
  const [focusedField, setFocusedField] = useState(null); // { year, field }
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

  const [formData, setFormData] = useState({
    user_id: userId,
    title: '',
    project_name: '',
    locations: [],
    year_founded: '',
    employees_count: '',
    industry_codes: [],
    company_type: '',
    company_ownership: '',
    is_founder_owned: false,
    is_female_owned: false,
    is_minority_owned: false,
    is_family_owned: false,
    is_operator_owned: false,
    pref_transaction_type: [],
    financial_history: {
      '2023': { revenue: '', gross_profit: '', ebitda: '', ebit: '', net_income: '' },
      '2024': { revenue: '', gross_profit: '', ebitda: '', ebit: '', net_income: '' },
      '2025': { revenue: '', gross_profit: '', ebitda: '', ebit: '', net_income: '' },
      'LTM': { date: '', revenue: '', gross_profit: '', ebitda: '', ebit: '', net_income: '' }
    }
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (autoFilledFields.has(name)) {
      setAutoFilledFields(prev => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Format a number with commas (e.g. 40000000 -> "40,000,000")
  const formatWithCommas = (value) => {
    if (!value && value !== 0) return '';
    if (value === '-') return '-';
    return Number(value).toLocaleString('en-US');
  };

  // Display value for currency fields: "$1,234,567" or "" if empty
  const displayCurrency = (value) => {
    if (!value && value !== 0) return '';
    return '$' + formatWithCommas(value);
  };

  // Handle currency input: strip non-digits, store raw number
  const handleFinancialChange = (year, field, rawValue) => {
    let isNegative = false;
    if (['gross_profit', 'ebitda', 'ebit', 'net_income'].includes(field) && rawValue.startsWith('-')) {
      isNegative = true;
    }

    const digits = rawValue.replace(/[^0-9]/g, '');
    let numValue = '';

    if (digits === '') {
       numValue = isNegative ? '-' : '';
    } else {
       numValue = Number(isNegative ? '-' + digits : digits);
    }

    setFormData(prev => ({
      ...prev,
      financial_history: {
        ...prev.financial_history,
        [year]: {
          ...prev.financial_history[year],
          [field]: numValue
        }
      }
    }));
  };

  const handleFinancialDateChange = (dateValue) => {
    setFormData(prev => ({
      ...prev,
      financial_history: {
        ...prev.financial_history,
        LTM: {
          ...prev.financial_history.LTM,
          date: dateValue
        }
      }
    }));
  };

  // Preferred transaction types as checklist
  const handlePrefTransactionToggle = (type) => {
    setFormData(prev => {
      const current = prev.pref_transaction_type || [];
      const exists = current.includes(type);
      const updated = exists ? current.filter(t => t !== type) : [...current, type];
      return { ...prev, pref_transaction_type: updated };
    });
  };

  const allUSAStates = geoTree.find(c => c.code === 'US')?.states ?? [];

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

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    // Mock parsing delay of 2 seconds
    setTimeout(() => {
      const mockData = {
        employees_count: '145',
        company_type: 'LLC',
        industry_codes: ['Manufacturing', 'Industrial', 'B2B']
      };

      setFormData(prev => ({
        ...prev,
        ...mockData,
        financial_history: {
          ...prev.financial_history,
          'LTM': {
            ...prev.financial_history['LTM'],
            revenue: 24500000,
            ebitda: 4200000,
          }
        }
      }));

      setAutoFilledFields(new Set([...Object.keys(mockData), 'financial_history']));
      setAutoFilledTags(mockData.industry_codes);
      setIsParsing(false);
    }, 2000);

    // Reset the input so the same file could be uploaded again if needed
    e.target.value = null;
  };

  const getInputClass = (name, baseClass = 'form-input') => {
    return `${baseClass} ${autoFilledFields.has(name) ? 'form-input-highlight' : ''} transition-colors`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await sellerService.saveListing(formData);
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
          <Briefcase className="text-indigo-400" size={32} />
        </div>
        <h1 className="text-4xl font-black mb-4 tracking-tight">Create Your Listing</h1>
        <p className="text-slate-400 max-w-lg mx-auto mb-8">
          Provide the key details of your business to attract the right investors. All company names are kept private until mutual interest is confirmed.
        </p>

        {/* Document Parsing Upload Area */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: '24px', position: 'relative', zIndex: 10, marginBottom: '2rem' }} className="max-w-4xl mx-auto text-left">
          {isParsing && (
            <div className="absolute inset-[-1rem] bg-slate-900/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center rounded-2xl">
              <Loader2 className="text-indigo-500 mb-4 animate-spin" size={32} />
              <p className="text-indigo-200 font-medium">Extracting data via secure backend...</p>
            </div>
          )}

          {/* Teaser Upload */}
          <div style={{ flex: 1 }} className="flex flex-col items-start gap-2">
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileUpload}
              className="text-sm text-slate-300 cursor-pointer"
              title="Upload Teaser"
            />
            <div className="mt-2">
              <UploadCloud className="text-slate-200" size={24} />
            </div>
            <p className="font-semibold text-white">Upload Teaser</p>
            <p className="text-sm text-slate-400">Upload a PDF or Word document. We will securely extract the key metrics.</p>
          </div>

          {/* CIM Upload */}
          <div style={{ flex: 1 }} className="flex flex-col items-start gap-2">
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileUpload}
              className="text-sm text-slate-300 cursor-pointer"
              title="Upload CIM"
            />
            <div className="mt-2 text-slate-200">
              <FileText size={24} />
            </div>
            <p className="font-semibold text-white">Upload CIM</p>
            <p className="text-sm text-slate-400">Upload a PDF or Word document. We will securely extract the key metrics.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Identity & Location */}
        <div className="glass p-8 rounded-3xl border border-slate-800 shadow-xl relative">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <Building2 className="text-indigo-400" size={20} />
            </div>
            <h2 className="text-xl font-bold">Business Identity</h2>
          </div>

          <div className="space-y-6">
            <div style={{ display: 'flex', flexDirection: 'row', gap: '24px' }}>
              <div className="glass border border-slate-700/50 rounded-2xl p-5 relative overflow-hidden" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500/0 via-indigo-500/50 to-indigo-500/0" />
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Building2 className="text-indigo-400" size={16} />
                  </div>
                  <div className="flex-1">
                    <label className="form-label mb-1">Company Name or Project Name</label>
                    <input
                      type="text"
                      name="project_name"
                      className="form-input"
                      placeholder="e.g. Acme Manufacturing LLC"
                      value={formData.project_name}
                      onChange={handleChange}
                    />
                    <div className="flex items-center gap-1.5 mt-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400 flex-shrink-0"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      <p className="text-xs text-indigo-300/70">This information is for internal reference only and will <strong>not</strong> be visible to buyers.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label className="form-label">Listing Title (Anonymized)</label>
                <input
                  type="text"
                  name="title"
                  className="form-input"
                  placeholder="e.g. Leading Material Handling..."
                  value={formData.title}
                  onChange={handleChange}
                  required
                />
                <p className="text-xs text-slate-500 mt-2">Use a descriptive title that doesn't reveal your company name.</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'row', gap: '24px' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label flex justify-between">
                  Employee Count
                  {autoFilledFields.has('employees_count') && <AlertCircle size={14} className="text-highlight" title="Auto-populated from document" />}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    name="employees_count"
                    className={getInputClass('employees_count', 'form-input pl-11')}
                    value={formData.employees_count}
                    onChange={handleChange}
                    placeholder="e.g. 50"
                  />
                  <Users className={`absolute left-4 top-1/2 -translate-y-1/2 ${autoFilledFields.has('employees_count') ? 'text-highlight' : 'text-slate-500'}`} size={18} />
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <label className="form-label flex justify-between">
                  Year Founded
                  {autoFilledFields.has('year_founded') && <AlertCircle size={14} className="text-highlight" title="Auto-populated from document" />}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    maxLength="4"
                    name="year_founded"
                    className={getInputClass('year_founded', 'form-input pl-11')}
                    value={formData.year_founded}
                    onChange={handleChange}
                    placeholder="YYYY"
                  />
                  <Building2 className={`absolute left-4 top-1/2 -translate-y-1/2 ${autoFilledFields.has('year_founded') ? 'text-highlight' : 'text-slate-500'}`} size={18} />
                </div>
              </div>
            </div>

            {/* Business Location & Ownership Structure */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
              <div>
              <label className="form-label" style={{ marginBottom: '0.75rem', display: 'block' }}>Business Location</label>
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
                          <button type="button" onClick={(e) => toggleContinentExpand(e, continent.name)} className="geo-toggle">
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
                                    <span className="geo-label-semi" onClick={() => handleCountryToggle(country)}>{country.name}</span>
                                    <button type="button" onClick={(e) => toggleCountryExpand(e, country.code)} className="geo-toggle">
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
                                              <div className={`geo-check-sm ${isStateSelected ? 'checked' : ''}`} onClick={() => handleStateToggle(country.code, stateName)}>
                                                {isStateSelected && <CheckCircle2 size={10} />}
                                              </div>
                                              <span className={`geo-label-state ${isStateSelected ? 'selected' : ''}`} onClick={() => handleStateToggle(country.code, stateName)}>{stateName}</span>
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

            <div>
              <label className="form-label" style={{ marginBottom: '0.75rem', display: 'block' }}>Ownership Structure</label>
              <select name="company_ownership" className="form-input" style={{ width: '100%', appearance: 'auto' }} value={formData.company_ownership} onChange={handleChange}>
                <option value="">Select Ownership</option>
                <option value="Private Company">Private Company</option>
                <option value="Investment Firm Portfolio Company">Investment Firm Portfolio Company</option>
                <option value="Public Company">Public Company</option>
                <option value="Corporate Subsidiary">Corporate Subsidiary</option>
              </select>
            </div>
          </div>
          </div>
        </div>

        {/* Section 2: Business Details */}
        <div className="glass p-8 rounded-3xl border border-slate-800 shadow-xl relative">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Tag className="text-amber-400" size={20} />
            </div>
            <h2 className="text-xl font-bold">Classification & Ownership</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="form-label flex justify-between">
                Industries / Keywords
                {autoFilledFields.has('industry_codes') && <AlertCircle size={14} className="text-highlight" title="Auto-populated from document" />}
              </label>
              <TagInput
                tags={formData.industry_codes}
                onChange={(newTags) => {
                  if (autoFilledFields.has('industry_codes')) {
                    setAutoFilledFields(prev => {
                      const next = new Set(prev);
                      next.delete('industry_codes');
                      return next;
                    });
                  }
                  setFormData(prev => ({ ...prev, industry_codes: newTags }));
                }}
                placeholder="Software, HealthTech, AI (press Enter to add)"
                isInputHighlighted={autoFilledFields.has('industry_codes')}
                autoFilledTags={autoFilledTags}
              />
            </div>


          </div>
        </div>

        {/* Section 3: Financials */}
        <div className="glass" style={{ padding: '2rem', borderRadius: '1.5rem', border: '1px solid #1e293b', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, padding: '1rem', opacity: 0.1 }}>
            <TrendingUp size={80} />
          </div>

          <div className="geo-row" style={{ marginBottom: '1.5rem', cursor: 'default' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp style={{ color: '#34d399' }} size={20} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Financial Performance</h2>
          </div>

          <div className="overflow-x-auto mt-8">
            <table className="w-full" style={{ tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: '24px 0' }}>
              <thead>
                <tr>
                  <th className="p-2 font-normal text-slate-500 text-left" style={{ width: '180px' }}></th>
                  <th className="px-8 py-2 font-bold text-slate-300 text-right">2023</th>
                  <th className="px-8 py-2 font-bold text-slate-300 text-right">2024</th>
                  <th className="px-8 py-2 font-bold text-slate-300 text-right">2025</th>
                  <th className="px-8 py-2 font-bold text-slate-300 text-right">
                    <div className="flex flex-col items-end">
                      <span>LTM</span>
                      <input
                        type="text"
                        style={{ textAlign: 'right' }}
                        className="text-blue-500 bg-transparent outline-none w-full placeholder-blue-500/50 italic text-xs mt-1"
                        placeholder="Enter Date"
                        value={formData.financial_history.LTM.date}
                        onChange={(e) => handleFinancialDateChange(e.target.value)}
                      />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {/* --- Revenue --- */}
                <tr>
                  <td className="p-2 pt-4 font-bold text-slate-200">Revenue</td>
                  {['2023', '2024', '2025', 'LTM'].map(year => {
                    const rev = formData.financial_history[year].revenue;
                    return (
                      <td key={year} className="px-4 py-2 pt-4 text-right">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(15,23,42,0.5)', border: '1px solid #1e293b', borderRadius: '0.5rem', padding: '0.375rem 0.75rem', justifyContent: 'flex-end' }}>
                          <span className="text-blue-500 font-medium">$</span>
                          <input
                            type="text"
                            style={{ textAlign: 'right', flexGrow: 1, background: 'transparent', outline: 'none', color: '#ffffff', fontWeight: 'bold', minWidth: 0 }}
                            value={formatWithCommas(rev)}
                            onChange={(e) => handleFinancialChange(year, 'revenue', e.target.value)}
                            onFocus={() => setFocusedField({ year, field: 'revenue' })}
                            onBlur={() => setFocusedField(null)}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td style={{ padding: '0.25rem 0.25rem 1.5rem 1rem', fontSize: '0.75rem', fontStyle: 'italic', color: '#64748b' }}>YoY Growth</td>
                  {['2023', '2024', '2025', 'LTM'].map(year => {
                    let yoy = '';
                    const isFocused = focusedField && (
                      (focusedField.year === year && focusedField.field === 'revenue') ||
                      (year === '2024' && focusedField.year === '2023' && focusedField.field === 'revenue') ||
                      (year === '2025' && focusedField.year === '2024' && focusedField.field === 'revenue')
                    );

                    if (!isFocused) {
                      if (year === '2024' && formData.financial_history['2023'].revenue) {
                        yoy = Math.round(((formData.financial_history['2024'].revenue - formData.financial_history['2023'].revenue) / formData.financial_history['2023'].revenue) * 100);
                      } else if (year === '2025' && formData.financial_history['2024'].revenue) {
                        yoy = Math.round(((formData.financial_history['2025'].revenue - formData.financial_history['2024'].revenue) / formData.financial_history['2024'].revenue) * 100);
                      }
                    }
                    return (
                      <td key={year} style={{ paddingBottom: '1.5rem', paddingTop: '0.25rem', paddingLeft: '0.75rem', paddingRight: '0.75rem', textAlign: 'right', color: '#94a3b8', fontSize: '0.875rem', fontStyle: 'italic' }}>
                        {yoy !== '' ? `${yoy}%` : ''}
                      </td>
                    );
                  })}
                </tr>

                {/* --- Gross Profit --- */}
                <tr>
                  <td className="p-2 pt-6 font-bold text-slate-200">Gross Profit</td>
                  {['2023', '2024', '2025', 'LTM'].map(year => {
                    const val = formData.financial_history[year].gross_profit;
                    return (
                      <td key={year} className="px-4 py-2 pt-6 text-right">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(15,23,42,0.5)', border: '1px solid #1e293b', borderRadius: '0.5rem', padding: '0.375rem 0.75rem', justifyContent: 'flex-end' }}>
                          <span className="text-blue-500 font-medium">$</span>
                          <input
                            type="text"
                            style={{ textAlign: 'right', flexGrow: 1, background: 'transparent', outline: 'none', color: '#ffffff', fontWeight: 'bold', minWidth: 0 }}
                            value={formatWithCommas(val)}
                            onChange={(e) => handleFinancialChange(year, 'gross_profit', e.target.value)}
                            onFocus={() => setFocusedField({ year, field: 'gross_profit' })}
                            onBlur={() => setFocusedField(null)}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td style={{ padding: '0.25rem 0.25rem 1.5rem 1rem', fontSize: '0.75rem', fontStyle: 'italic', color: '#64748b' }}>Gross Profit Margin</td>
                  {['2023', '2024', '2025', 'LTM'].map(year => {
                    const val = formData.financial_history[year].gross_profit;
                    const rev = formData.financial_history[year].revenue;
                    const isFocused = focusedField && focusedField.year === year && (focusedField.field === 'gross_profit' || focusedField.field === 'revenue');
                    const margin = (!isFocused && val && rev) ? Math.round((val / rev) * 100) : '';
                    return (
                      <td key={year} style={{ paddingBottom: '1.5rem', paddingTop: '0.25rem', paddingLeft: '0.75rem', paddingRight: '0.75rem', textAlign: 'right', color: '#94a3b8', fontSize: '0.875rem', fontStyle: 'italic' }}>
                        {margin !== '' ? `${margin}%` : ''}
                      </td>
                    );
                  })}
                </tr>

                {/* --- EBITDA --- */}
                <tr>
                  <td className="p-2 pt-6 font-bold text-slate-200">EBITDA</td>
                  {['2023', '2024', '2025', 'LTM'].map(year => {
                    const val = formData.financial_history[year].ebitda;
                    return (
                      <td key={year} className="px-4 py-2 pt-6 text-right">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(15,23,42,0.5)', border: '1px solid #1e293b', borderRadius: '0.5rem', padding: '0.375rem 0.75rem', justifyContent: 'flex-end' }}>
                          <span className="text-blue-500 font-medium">$</span>
                          <input
                            type="text"
                            style={{ textAlign: 'right', flexGrow: 1, background: 'transparent', outline: 'none', color: '#ffffff', fontWeight: 'bold', minWidth: 0 }}
                            value={formatWithCommas(val)}
                            onChange={(e) => handleFinancialChange(year, 'ebitda', e.target.value)}
                            onFocus={() => setFocusedField({ year, field: 'ebitda' })}
                            onBlur={() => setFocusedField(null)}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td style={{ padding: '0.25rem 0.25rem 1.5rem 1rem', fontSize: '0.75rem', fontStyle: 'italic', color: '#64748b' }}>EBITDA Margin</td>
                  {['2023', '2024', '2025', 'LTM'].map(year => {
                    const val = formData.financial_history[year].ebitda;
                    const rev = formData.financial_history[year].revenue;
                    const isFocused = focusedField && focusedField.year === year && (focusedField.field === 'ebitda' || focusedField.field === 'revenue');
                    const margin = (!isFocused && val && rev) ? Math.round((val / rev) * 100) : '';
                    return (
                      <td key={year} style={{ paddingBottom: '1.5rem', paddingTop: '0.25rem', paddingLeft: '0.75rem', paddingRight: '0.75rem', textAlign: 'right', color: '#94a3b8', fontSize: '0.875rem', fontStyle: 'italic' }}>
                        {margin !== '' ? `${margin}%` : ''}
                      </td>
                    );
                  })}
                </tr>

                {/* --- EBIT --- */}
                <tr>
                  <td className="p-2 pt-6 font-bold text-slate-200">EBIT</td>
                  {['2023', '2024', '2025', 'LTM'].map(year => {
                    const val = formData.financial_history[year].ebit;
                    return (
                      <td key={year} className="px-4 py-2 pt-6 text-right">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(15,23,42,0.5)', border: '1px solid #1e293b', borderRadius: '0.5rem', padding: '0.375rem 0.75rem', justifyContent: 'flex-end' }}>
                          <span className="text-blue-500 font-medium">$</span>
                          <input
                            type="text"
                            style={{ textAlign: 'right', flexGrow: 1, background: 'transparent', outline: 'none', color: '#ffffff', fontWeight: 'bold', minWidth: 0 }}
                            value={formatWithCommas(val)}
                            onChange={(e) => handleFinancialChange(year, 'ebit', e.target.value)}
                            onFocus={() => setFocusedField({ year, field: 'ebit' })}
                            onBlur={() => setFocusedField(null)}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td style={{ padding: '0.25rem 0.25rem 1.5rem 1rem', fontSize: '0.75rem', fontStyle: 'italic', color: '#64748b' }}>EBIT Margin</td>
                  {['2023', '2024', '2025', 'LTM'].map(year => {
                    const val = formData.financial_history[year].ebit;
                    const rev = formData.financial_history[year].revenue;
                    const isFocused = focusedField && focusedField.year === year && (focusedField.field === 'ebit' || focusedField.field === 'revenue');
                    const margin = (!isFocused && val && rev) ? Math.round((val / rev) * 100) : '';
                    return (
                      <td key={year} style={{ paddingBottom: '1.5rem', paddingTop: '0.25rem', paddingLeft: '0.75rem', paddingRight: '0.75rem', textAlign: 'right', color: '#94a3b8', fontSize: '0.875rem', fontStyle: 'italic' }}>
                        {margin !== '' ? `${margin}%` : ''}
                      </td>
                    );
                  })}
                </tr>

                {/* --- Net Income --- */}
                <tr>
                  <td className="p-2 pt-6 font-bold text-slate-200">Net Income</td>
                  {['2023', '2024', '2025', 'LTM'].map(year => {
                    const val = formData.financial_history[year].net_income;
                    return (
                      <td key={year} className="px-4 py-2 pt-6 text-right">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(15,23,42,0.5)', border: '1px solid #1e293b', borderRadius: '0.5rem', padding: '0.375rem 0.75rem', justifyContent: 'flex-end' }}>
                          <span className="text-blue-500 font-medium">$</span>
                          <input
                            type="text"
                            style={{ textAlign: 'right', flexGrow: 1, background: 'transparent', outline: 'none', color: '#ffffff', fontWeight: 'bold', minWidth: 0 }}
                            value={formatWithCommas(val)}
                            onChange={(e) => handleFinancialChange(year, 'net_income', e.target.value)}
                            onFocus={() => setFocusedField({ year, field: 'net_income' })}
                            onBlur={() => setFocusedField(null)}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td style={{ padding: '0.25rem 0.25rem 1.5rem 1rem', fontSize: '0.75rem', fontStyle: 'italic', color: '#64748b' }}>Net Income Margin</td>
                  {['2023', '2024', '2025', 'LTM'].map(year => {
                    const val = formData.financial_history[year].net_income;
                    const rev = formData.financial_history[year].revenue;
                    const isFocused = focusedField && focusedField.year === year && (focusedField.field === 'net_income' || focusedField.field === 'revenue');
                    const margin = (!isFocused && val && rev) ? Math.round((val / rev) * 100) : '';
                    return (
                      <td key={year} style={{ padding: '0.25rem 2rem 1.5rem 2rem', textAlign: 'right', color: '#94a3b8', fontSize: '0.875rem', fontStyle: 'italic' }}>
                        {margin !== '' ? `${margin}%` : ''}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: Metadata & Strategic */}
        <div className="glass p-8 rounded-3xl border border-slate-800 shadow-xl relative">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <PieChart className="text-purple-400" size={20} />
            </div>
            <h2 className="text-xl font-bold">Strategic Considerations</h2>
          </div>

          <div className="space-y-8">
            <div>
              <label className="form-label">Preferred Transaction Types</label>
              <div className="grid grid-cols-1 gap-2">
                {['Total Sale', 'Sale of Majority Stake', 'Sale of Minority Stake', 'Equity Raise', 'Debt Raise', 'Divestiture', 'Recapitalization'].map(type => (
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

            <div className="space-y-4">
              <label className="form-label">Other Preferences</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { key: 'is_founder_owned', label: 'Founder-Owned' },
                  { key: 'is_female_owned', label: 'Female-Owned' },
                  { key: 'is_minority_owned', label: 'Minority-Owned' },
                  { key: 'is_family_owned', label: 'Family-Owned' },
                  { key: 'is_operator_owned', label: 'Operator-Owned' }
                ].map(flag => (
                  <label key={flag.key} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      name={flag.key}
                      className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
                      checked={formData[flag.key]}
                      onChange={handleChange}
                    />
                    <span className="text-sm text-slate-400 group-hover:text-white transition-colors">{flag.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <CheckCircle2 size={16} className="rotate-45" />
            {error}
          </div>
        )}

        <div className="flex justify-center py-10">
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
                Create Listing
                <ChevronRight className="group-hover:translate-x-1 transition-transform" size={24} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function Loader2({ size, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`animate-spin ${className}`}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
