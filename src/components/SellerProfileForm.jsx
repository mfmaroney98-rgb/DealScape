import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sellerService } from '../services/sellerService';
import { 
  Building2, 
  TrendingUp, 
  MapPin, 
  Users, 
  PieChart, 
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  DollarSign,
  Tag
} from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Identity', icon: Building2 },
  { id: 2, title: 'Details', icon: Tag },
  { id: 3, title: 'Financials', icon: TrendingUp },
  { id: 4, title: 'Strategic', icon: PieChart }
];

export default function SellerProfileForm({ userId }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    user_id: userId,
    title: '',
    project_name: '',
    location_city: '',
    location_state: '',
    location_country: 'USA',
    employees_count: '',
    industry_codes: [],
    company_type: '',
    company_ownership: '',
    is_founder_owned: false,
    is_female_owned: false,
    is_minority_owned: false,
    is_family_owned: false,
    pref_transaction_type: 'Total Sale',
    revenue: '',
    ebitda: '',
    gross_profit: '',
    net_income: '',
    growth_rate_pct: ''
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
  const handleBack = () => setCurrentStep(prev => Math.max(prev - 1, 1));

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

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6 animate-fade-in">
            <div>
              <label className="form-label">Listing Title (Anonymized)</label>
              <input 
                type="text" 
                name="title" 
                className="form-input" 
                placeholder="e.g. Leading Material Handling OEM"
                value={formData.title}
                onChange={handleChange}
                required 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">City</label>
                <input 
                  type="text" 
                  name="location_city" 
                  className="form-input" 
                  value={formData.location_city}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="form-label">State/Region</label>
                <input 
                  type="text" 
                  name="location_state" 
                  className="form-input" 
                  value={formData.location_state}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div>
              <label className="form-label">Number of Employees</label>
              <div className="relative">
                <input 
                  type="number" 
                  name="employees_count" 
                  className="form-input pl-11" 
                  value={formData.employees_count}
                  onChange={handleChange}
                />
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6 animate-fade-in">
            <div>
              <label className="form-label">Industries / Keywords</label>
              <input 
                type="text" 
                name="industry_codes" 
                className="form-input" 
                placeholder="Software, HealthTech, AI (comma separated)"
                value={formData.industry_codes.join(', ')}
                onChange={(e) => setFormData(prev => ({ ...prev, industry_codes: e.target.value.split(',').map(s => s.trim()) }))}
              />
            </div>
            <div>
              <label className="form-label">Company Type</label>
              <select name="company_type" className="form-input" value={formData.company_type} onChange={handleChange}>
                <option value="">Select Type</option>
                <option value="LLC">LLC</option>
                <option value="S-Corp">S-Corp</option>
                <option value="C-Corp">C-Corp</option>
                <option value="Partnership">Partnership</option>
              </select>
            </div>
            <div>
              <label className="form-label">Ownership Structure</label>
              <select name="company_ownership" className="form-input" value={formData.company_ownership} onChange={handleChange}>
                <option value="">Select Ownership</option>
                <option value="Private Individual">Private Individual</option>
                <option value="Private Equity">Private Equity Owned</option>
                <option value="Corporate Subsidiary">Corporate Subsidiary</option>
                <option value="Family Office">Family Office</option>
              </select>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Revenue (Latest Year)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    name="revenue" 
                    className="form-input pl-11" 
                    value={formData.revenue}
                    onChange={handleChange}
                  />
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                </div>
              </div>
              <div>
                <label className="form-label">EBITDA</label>
                <div className="relative">
                  <input 
                    type="number" 
                    name="ebitda" 
                    className="form-input pl-11" 
                    value={formData.ebitda}
                    onChange={handleChange}
                  />
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Gross Profit</label>
                <input 
                  type="number" 
                  name="gross_profit" 
                  className="form-input" 
                  value={formData.gross_profit}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="form-label">YoY Growth %</label>
                <input 
                  type="number" 
                  name="growth_rate_pct" 
                  className="form-input" 
                  value={formData.growth_rate_pct}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-8 animate-fade-in">
            <div>
              <label className="form-label">Preferred Transaction Type</label>
              <select name="pref_transaction_type" className="form-input" value={formData.pref_transaction_type} onChange={handleChange}>
                <option value="Total Sale">Total Sale</option>
                <option value="Acquisition of Majority Stake">Majority Stake</option>
                <option value="Minority Equity Raise">Minority Equity</option>
                <option value="Debt Raise">Debt Raise</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" name="is_founder_owned" className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500" checked={formData.is_founder_owned} onChange={handleChange} />
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Founder Owned</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" name="is_female_owned" className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500" checked={formData.is_female_owned} onChange={handleChange} />
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Female Owned</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" name="is_minority_owned" className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500" checked={formData.is_minority_owned} onChange={handleChange} />
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Minority Owned</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" name="is_family_owned" className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500" checked={formData.is_family_owned} onChange={handleChange} />
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Family Owned</span>
              </label>
            </div>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-6 animate-fade-in">
      {/* Stepper Header */}
      <div className="flex justify-between mb-12 relative">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-800 -translate-y-1/2 z-0"></div>
        {STEPS.map((step) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          
          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                isActive ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 scale-110' : 
                isCompleted ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-slate-500 border border-slate-800'
              }`}>
                {isCompleted ? <CheckCircle2 size={24} /> : <Icon size={24} />}
              </div>
              <span className={`text-xs font-bold mt-3 uppercase tracking-wider ${
                isActive ? 'text-indigo-400' : 'text-slate-500'
              }`}>{step.title}</span>
            </div>
          );
        })}
      </div>

      {/* Form Card */}
      <div className="glass p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 opacity-10">
          <TrendingUp size={120} className="text-slate-500" />
        </div>
        
        <form onSubmit={handleSubmit} className="relative z-10">
          <div className="mb-8">
            <h2 className="text-3xl font-black mb-2 tracking-tight">Step {currentStep}</h2>
            <p className="text-slate-400">Complete your profile to find the perfect buyer match.</p>
          </div>

          <div className="min-h-[300px]">
            {renderStep()}
          </div>

          {error && (
            <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
              <CheckCircle2 size={16} className="rotate-45" />
              {error}
            </div>
          )}

          <div className="mt-12 flex justify-between gap-4">
            <button 
              type="button" 
              onClick={handleBack}
              disabled={currentStep === 1 || loading}
              className={`btn-secondary flex items-center gap-2 ${currentStep === 1 ? 'opacity-0 pointer-events-none' : ''}`}
            >
              <ChevronLeft size={18} />
              Back
            </button>
            
            {currentStep < STEPS.length ? (
              <button 
                type="button" 
                onClick={handleNext} 
                className="btn-primary flex items-center gap-2 px-8"
              >
                Next Step
                <ChevronRight size={18} />
              </button>
            ) : (
              <button 
                type="submit" 
                disabled={loading}
                className="btn-primary flex items-center gap-2 px-10"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Complete Profile'}
                <CheckCircle2 size={18} />
              </button>
            )}
          </div>
        </form>
      </div>
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
