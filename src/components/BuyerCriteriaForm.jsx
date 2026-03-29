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
  DollarSign,
  Users,
  Search,
  Globe
} from 'lucide-react';

const REGIONS = [
  'Midwest',
  'Northeast',
  'Southeast',
  'Southwest',
  'West'
];

export default function BuyerCriteriaForm({ userId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
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

  const handleRegionToggle = (region) => {
    setFormData(prev => ({
      ...prev,
      locations: prev.locations.includes(region)
        ? prev.locations.filter(r => r !== region)
        : [...prev.locations, region]
    }));
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

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {REGIONS.map(region => (
              <label 
                key={region}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all cursor-pointer ${
                  formData.locations.includes(region) 
                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-300' 
                    : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:border-slate-700'
                }`}
              >
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={formData.locations.includes(region)}
                  onChange={() => handleRegionToggle(region)}
                />
                <Map size={24} className="mb-2" />
                <span className="text-xs font-bold uppercase">{region}</span>
              </label>
            ))}
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
