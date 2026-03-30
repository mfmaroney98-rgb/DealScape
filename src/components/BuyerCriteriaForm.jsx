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
        <div className="glass p-8 rounded-3xl border border-slate-800 shadow-xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <DollarSign size={80} />
          </div>
          
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="text-emerald-400" size={20} />
            </div>
            <h2 className="text-xl font-bold">Financial Performance Range</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="form-label">Revenue Target</label>
              <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">$</span>
                  <input type="number" name="min_revenue" className="form-input pl-7" placeholder="Min" value={formData.min_revenue} onChange={handleChange} />
                </div>
                <div className="text-slate-600">-</div>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">$</span>
                  <input type="number" name="max_revenue" className="form-input pl-7" placeholder="Max" value={formData.max_revenue} onChange={handleChange} />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="form-label">EBITDA Target</label>
              <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">$</span>
                  <input type="number" name="min_ebitda" className="form-input pl-7" placeholder="Min" value={formData.min_ebitda} onChange={handleChange} />
                </div>
                <div className="text-slate-600">-</div>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">$</span>
                  <input type="number" name="max_ebitda" className="form-input pl-7" placeholder="Max" value={formData.max_ebitda} onChange={handleChange} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Geographical Focus */}
        <div className="glass p-8 rounded-3xl border border-slate-800 shadow-xl relative">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Globe className="text-blue-400" size={20} />
            </div>
            <h2 className="text-xl font-bold">Geographical Focus</h2>
          </div>

          <div className="font-medium text-slate-300 relative pl-2 pb-4">
            {/* Root Node: USA */}
            <div className="flex items-center gap-3 py-2 cursor-pointer hover:bg-slate-800/30 rounded-lg px-2">
              <div 
                className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                  allUSAStates.every(s => formData.locations.includes(s)) ? 'bg-blue-500 border-blue-500 text-white' : 
                  allUSAStates.some(s => formData.locations.includes(s)) ? 'bg-blue-500/50 border-blue-500 text-white' : 'border-slate-500'
                }`}
                onClick={(e) => { e.stopPropagation(); handleUSAToggle(); }}
              >
                {allUSAStates.some(s => formData.locations.includes(s)) && <CheckCircle2 size={14} />}
              </div>
              <Globe size={18} className="text-blue-400" onClick={() => handleUSAToggle()} />
              <span className="font-bold flex-1" onClick={() => handleUSAToggle()}>United States of America</span>
              <button 
                type="button" 
                onClick={(e) => { e.stopPropagation(); setIsUSAExpanded(!isUSAExpanded); }}
                className="p-1 rounded hover:bg-slate-700/50 text-slate-400"
              >
                {isUSAExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>

            {isUSAExpanded && (
               <div className="ml-4 mt-1 tree-line pt-2 relative">
                 {CENSUS_REGIONS.map((region, rIdx) => {
                   const isLastRegion = rIdx === CENSUS_REGIONS.length - 1;
                   const regionStates = region.divisions.flatMap(d => d.states);
                   const allSelected = regionStates.every(s => formData.locations.includes(s));
                   const someSelected = regionStates.some(s => formData.locations.includes(s)) && !allSelected;
                   const isExpanded = expandedRegions.has(region.name);

                   return (
                     <div key={region.name} className={`tree-node ${isLastRegion ? 'tree-node-last' : ''} mb-1`}>
                       <div className="pl-6">
                         <div className={`flex items-center gap-3 py-1.5 cursor-pointer hover:bg-slate-800/30 rounded-lg px-2 ${allSelected ? 'text-blue-300' : ''}`}>
                           <div 
                             className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                               allSelected ? 'bg-blue-500 border-blue-500 text-white' : 
                               someSelected ? 'bg-blue-500/50 border-blue-500 text-white' : 'bg-slate-800 border-slate-500'
                             }`}
                           onClick={() => handleRegionToggle(region)}
                         >
                           {(allSelected || someSelected) && <CheckCircle2 size={12} />}
                         </div>
                         <span 
                           className="font-semibold flex-1"
                           onClick={() => handleRegionToggle(region)}
                         >
                           {region.name}
                         </span>
                         <button 
                           type="button" 
                           onClick={(e) => toggleRegionExpand(e, region.name)}
                           className="p-1 rounded hover:bg-slate-700/50 text-slate-400"
                         >
                             {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                           </button>
                         </div>

                         {isExpanded && (
                           <div className="ml-2 mt-1 tree-line relative pt-1">
                            {region.divisions.map((division, dIdx) => {
                               const isLastDev = dIdx === region.divisions.length - 1;
                               const divisionStates = division.states;
                               const dAllSelected = divisionStates.every(s => formData.locations.includes(s));
                               const dSomeSelected = divisionStates.some(s => formData.locations.includes(s)) && !dAllSelected;
                               const isDivExpanded = expandedDivisions.has(division.name);

                               return (
                                 <div key={division.name} className={`tree-node ${isLastDev ? 'tree-node-last' : ''} mb-1`}>
                                   <div className="pl-6">
                                     <div className={`flex items-center gap-3 py-1 cursor-pointer hover:bg-slate-800/30 rounded-lg px-2 ${dAllSelected ? 'text-blue-200' : ''}`}>
                                       <div 
                                         className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                           dAllSelected ? 'bg-blue-500 border-blue-500 text-white' : 
                                           dSomeSelected ? 'bg-blue-500/50 border-blue-500 text-white' : 'bg-slate-800 border-slate-500'
                                         }`}
                                      onClick={() => handleDivisionToggle(division)}
                                    >
                                      {(dAllSelected || dSomeSelected) && <CheckCircle2 size={12} />}
                                    </div>
                                    <span 
                                      className="font-medium text-sm flex-1"
                                      onClick={() => handleDivisionToggle(division)}
                                    >
                                      {division.name}
                                    </span>
                                    <button 
                                      type="button" 
                                      onClick={(e) => toggleDivisionExpand(e, division.name)}
                                      className="p-1 rounded hover:bg-slate-700/50 text-slate-400"
                                    >
                                       {isDivExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                     </button>
                                   </div>

                                   {isDivExpanded && (
                                     <div className="ml-2 mt-1 tree-line relative pt-1 pb-1">
                                      {division.states.map((stateName, sIdx) => {
                                         const isLastState = sIdx === division.states.length - 1;
                                         const isStateSelected = formData.locations.includes(stateName);

                                         return (
                                           <div key={stateName} className={`tree-node ${isLastState ? 'tree-node-last' : ''}`}>
                                             <div className="pl-6">
                                               <div className="flex items-center gap-2 py-0.5 cursor-pointer hover:bg-slate-800/30 rounded-lg px-2">
                                                  <div 
                                                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                                                      isStateSelected ? 'bg-blue-500 border-blue-500 text-white' : 'bg-slate-800 border-slate-600'
                                                    }`}
                                                  onClick={() => handleStateToggle(stateName)}
                                                >
                                                  {isStateSelected && <CheckCircle2 size={10} />}
                                                </div>
                                                <span 
                                                  className={`text-sm ${isStateSelected ? 'text-blue-300' : 'text-slate-400 hover:text-slate-300'}`}
                                                  onClick={() => handleStateToggle(stateName)}
                                                >
                                                  {stateName}
                                                </span>
                                               </div>
                                             </div>
                                           </div>
                                         );
                                      })}
                                    </div>
                                   )}
                                 </div>
                               </div>
                             );
                           })}
                         </div>
                       )}
                     </div>
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

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="form-label">Company Size (Employees)</label>
                <div className="flex gap-4 items-center">
                  <div className="relative flex-1">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input type="number" name="min_employees" className="form-input pl-9" placeholder="Min" value={formData.min_employees} onChange={handleChange} />
                  </div>
                  <div className="text-slate-600">-</div>
                  <div className="relative flex-1">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input type="number" name="max_employees" className="form-input pl-9" placeholder="Max" value={formData.max_employees} onChange={handleChange} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="form-label">Strategic Preferences</label>
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
                      <span className="text-sm text-slate-400 group-hover:text-white transition-colors">{pref.label} Preferred</span>
                    </label>
                  ))}
                </div>
              </div>
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
