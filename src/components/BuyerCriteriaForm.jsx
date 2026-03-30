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
  const [isUSAExpanded, setIsUSAExpanded] = useState(true);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    user_id: userId,
    min_revenue: '',
    max_revenue: '',
    min_ebitda: '',
    max_ebitda: '',
    min_employees: '',
    max_employees: '',
    locations: [],
    industries: [],
    transaction_types: [],
    pref_transaction_type: [],
    require_founder_owned: false,
    require_female_owned: false,
    require_minority_owned: false,
    require_family_owned: false
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

          <div className="space-y-8">
            <div>
              <label className="form-label">Industries & Keywords</label>
              <TagInput 
                tags={formData.industries}
                onChange={(newTags) => setFormData(prev => ({ ...prev, industries: newTags }))}
                placeholder="e.g. SaaS, Manufacturing, Medical... (press Enter to add)"
              />
            </div>
          </div>

          {/* Preferred Transaction Types */}
          <div className="space-y-4" style={{ marginTop: '2rem' }}>
            <label className="form-label">Preferred Transaction Types</label>
            <div className="grid grid-cols-1 gap-2">
              {['Total Sale', 'Acquisition of Majority Stake', 'Minority Equity Raise', 'Debt Raise', 'Carve-out'].map(type => (
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
                { key: 'require_family_owned', label: 'Family-Owned' }
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
