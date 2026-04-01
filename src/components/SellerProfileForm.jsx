import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sellerService } from '../services/sellerService';
import TagInput from './TagInput';
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

export default function SellerProfileForm({ userId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [autoFilledFields, setAutoFilledFields] = useState(new Set());
  const [autoFilledTags, setAutoFilledTags] = useState([]);
  const [expandedRegions, setExpandedRegions] = useState(new Set());
  const [expandedDivisions, setExpandedDivisions] = useState(new Set());
  const [isUSAExpanded, setIsUSAExpanded] = useState(false);
  const [focusedField, setFocusedField] = useState(null); // { year, field }
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    user_id: userId,
    title: '',
    project_name: '',
    locations: [],
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
    financials: {
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
    return Number(value).toLocaleString('en-US');
  };

  // Display value for currency fields: "$1,234,567" or "" if empty
  const displayCurrency = (value) => {
    if (!value && value !== 0) return '';
    return '$' + formatWithCommas(value);
  };

  // Handle currency input: strip non-digits, store raw number
  const handleFinancialChange = (year, field, rawValue) => {
    const digits = rawValue.replace(/[^0-9]/g, '');
    const numValue = digits === '' ? '' : Number(digits);
    setFormData(prev => ({
      ...prev,
      financials: {
        ...prev.financials,
        [year]: {
          ...prev.financials[year],
          [field]: numValue
        }
      }
    }));
  };

  const handleFinancialDateChange = (dateValue) => {
    setFormData(prev => ({
      ...prev,
      financials: {
        ...prev.financials,
        LTM: {
          ...prev.financials.LTM,
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

  const allUSAStates = CENSUS_REGIONS.flatMap(r => r.divisions.flatMap(d => d.states));

  const handleStateToggle = (stateName) => {
    setFormData(prev => ({
      ...prev,
      locations: prev.locations.includes(stateName)
        ? prev.locations.filter(s => s !== stateName)
        : [...prev.locations, stateName]
    }));
  };

  const handleUSAToggle = () => {
    setFormData(prev => {
      const allSelected = allUSAStates.every(s => prev.locations.includes(s));
      let newLocations = [...prev.locations];
      if (allSelected) {
        newLocations = newLocations.filter(s => !allUSAStates.includes(s));
      } else {
        allUSAStates.forEach(s => { if (!newLocations.includes(s)) newLocations.push(s); });
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
        states.forEach(s => { if (!newLocations.includes(s)) newLocations.push(s); });
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
        allStates.forEach(s => { if (!newLocations.includes(s)) newLocations.push(s); });
      }
      return { ...prev, locations: newLocations };
    });
  };

  const toggleRegionExpand = (e, regionName) => {
    e.stopPropagation();
    setExpandedRegions(prev => {
      const next = new Set(prev);
      if (next.has(regionName)) next.delete(regionName); else next.add(regionName);
      return next;
    });
  };

  const toggleDivisionExpand = (e, divisionName) => {
    e.stopPropagation();
    setExpandedDivisions(prev => {
      const next = new Set(prev);
      if (next.has(divisionName)) next.delete(divisionName); else next.add(divisionName);
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
        financials: {
          ...prev.financials,
          'LTM': {
            ...prev.financials['LTM'],
            revenue: 24500000,
            ebitda: 4200000,
          }
        }
      }));

      setAutoFilledFields(new Set([...Object.keys(mockData), 'financials']));
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
        <div className="max-w-xl mx-auto glass p-6 rounded-2xl border border-dashed border-slate-700 hover:border-indigo-500 transition-colors relative overflow-hidden group">
          {isParsing && (
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
              <Loader2 size={32} className="text-indigo-500 mb-4" />
              <p className="text-indigo-200 font-medium">Extracting data via secure backend...</p>
            </div>
          )}
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileUpload}
            className="absolute inset-0 opacity-0 cursor-pointer z-20"
            title="Upload Teaser or CIM"
          />
          <div className="flex flex-col items-center gap-3 relative z-10 pointer-events-none">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
              <UploadCloud className="text-slate-400 group-hover:text-indigo-400 transition-colors" size={24} />
            </div>
            <div>
              <p className="font-bold text-lg">Auto-fill from Teaser or CIM</p>
              <p className="text-sm text-slate-400">Upload a PDF or Word document. We will securely extract the key metrics.</p>
            </div>
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
            <div>
              <label className="form-label">Listing Title (Anonymized)</label>
              <input
                type="text"
                name="title"
                className="form-input"
                placeholder="e.g. Leading Material Handling Equipment Manufacturer"
                value={formData.title}
                onChange={handleChange}
                required
              />
              <p className="text-xs text-slate-500 mt-2">Use a descriptive title that doesn't reveal your company name.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="form-label flex justify-between">
                  Employees
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
                  />
                  <Users className={`absolute left-4 top-1/2 -translate-y-1/2 ${autoFilledFields.has('employees_count') ? 'text-highlight' : 'text-slate-500'}`} size={18} />
                </div>
              </div>
            </div>

            {/* Geography Tree */}
            <div>
              <label className="form-label" style={{ marginBottom: '0.75rem', display: 'block' }}>Business Location</label>
              <div className="geo-tree">
                <div className="geo-row">
                  <div
                    className={`geo-check ${allUSAStates.every(s => formData.locations.includes(s)) ? 'checked' :
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
                  <button type="button" onClick={(e) => { e.stopPropagation(); setIsUSAExpanded(!isUSAExpanded); }} className="geo-toggle">
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
                            <div className={`geo-check-sm ${allSelected ? 'checked' : someSelected ? 'partial' : ''}`} onClick={() => handleRegionToggle(region)}>
                              {allSelected ? <CheckCircle2 size={12} /> : someSelected ? <span style={{ width: 6, height: 6, background: '#e2e8f0', borderRadius: 1, display: 'block' }} /> : null}
                            </div>
                            <span className="geo-label-semi" onClick={() => handleRegionToggle(region)}>{region.name}</span>
                            <button type="button" onClick={(e) => toggleRegionExpand(e, region.name)} className="geo-toggle">
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          </div>
                          {isExpanded && (
                            <div className="geo-children">
                              {region.divisions.map((division, dIdx) => {
                                const isLastDev = dIdx === region.divisions.length - 1;
                                const dAllSelected = division.states.every(s => formData.locations.includes(s));
                                const dSomeSelected = division.states.some(s => formData.locations.includes(s)) && !dAllSelected;
                                const isDivExpanded = expandedDivisions.has(division.name);
                                return (
                                  <div key={division.name} className={`geo-branch ${isLastDev ? 'geo-branch-last' : ''}`}>
                                    <div className="geo-row">
                                      <div className={`geo-check-sm ${dAllSelected ? 'checked' : dSomeSelected ? 'partial' : ''}`} onClick={() => handleDivisionToggle(division)}>
                                        {dAllSelected ? <CheckCircle2 size={12} /> : dSomeSelected ? <span style={{ width: 6, height: 6, background: '#e2e8f0', borderRadius: 1, display: 'block' }} /> : null}
                                      </div>
                                      <span className="geo-label" onClick={() => handleDivisionToggle(division)}>{division.name}</span>
                                      <button type="button" onClick={(e) => toggleDivisionExpand(e, division.name)} className="geo-toggle">
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
                                                <div className={`geo-check-sm ${isStateSelected ? 'checked' : ''}`} onClick={() => handleStateToggle(stateName)}>
                                                  {isStateSelected && <CheckCircle2 size={10} />}
                                                </div>
                                                <span className={`geo-label-state ${isStateSelected ? 'selected' : ''}`} onClick={() => handleStateToggle(stateName)}>{stateName}</span>
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

            {/* Preferred Transaction Types */}
            <div className="space-y-4">
              <label className="form-label">Preferred Transaction Types</label>
              <div className="grid grid-cols-1 gap-2">
                {['Total Sale', 'Sale of Majority Stake', 'Minority Equity Raise', 'Debt Raise', 'Carve-out'].map(type => (
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

            <div>
              <label className="form-label">Ownership Structure</label>
              <select name="company_ownership" className="form-input" value={formData.company_ownership} onChange={handleChange}>
                <option value="">Select Ownership</option>
                <option value="Private Company">Private Company</option>
                <option value="Investment Firm Portfolio Company">Investment Firm Portfolio Company</option>
                <option value="Public Company">Public Company</option>
                <option value="Corporate Subsidiary">Corporate Subsidiary</option>
              </select>
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
                        value={formData.financials.LTM.date}
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
                    const rev = formData.financials[year].revenue;
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
                      if (year === '2024' && formData.financials['2023'].revenue) {
                        yoy = Math.round(((formData.financials['2024'].revenue - formData.financials['2023'].revenue) / formData.financials['2023'].revenue) * 100);
                      } else if (year === '2025' && formData.financials['2024'].revenue) {
                        yoy = Math.round(((formData.financials['2025'].revenue - formData.financials['2024'].revenue) / formData.financials['2024'].revenue) * 100);
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
                    const val = formData.financials[year].gross_profit;
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
                    const val = formData.financials[year].gross_profit;
                    const rev = formData.financials[year].revenue;
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
                    const val = formData.financials[year].ebitda;
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
                    const val = formData.financials[year].ebitda;
                    const rev = formData.financials[year].revenue;
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
                    const val = formData.financials[year].ebit;
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
                    const val = formData.financials[year].ebit;
                    const rev = formData.financials[year].revenue;
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
                    const val = formData.financials[year].net_income;
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
                    const val = formData.financials[year].net_income;
                    const rev = formData.financials[year].revenue;
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
                {['Total Sale', 'Sale of Majority Stake', 'Minority Equity Raise', 'Debt Raise', 'Carve-out'].map(type => (
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
