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
  DollarSign,
  Tag,
  Briefcase,
  UploadCloud,
  FileText,
  AlertCircle
} from 'lucide-react';

export default function SellerProfileForm({ userId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [autoFilledFields, setAutoFilledFields] = useState(new Set());
  const [autoFilledTags, setAutoFilledTags] = useState([]);
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
  const handleCurrencyChange = (name, rawValue) => {
    if (autoFilledFields.has(name)) {
      setAutoFilledFields(prev => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
    }
    const digits = rawValue.replace(/[^0-9]/g, '');
    setFormData(prev => ({
      ...prev,
      [name]: digits === '' ? '' : Number(digits)
    }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    // Mock parsing delay of 2 seconds
    setTimeout(() => {
      const mockData = {
        employees_count: '145',
        revenue: '24500000',
        ebitda: '4200000',
        company_type: 'LLC',
        industry_codes: ['Manufacturing', 'Industrial', 'B2B']
      };

      setFormData(prev => ({
        ...prev,
        ...mockData
      }));

      setAutoFilledFields(new Set(Object.keys(mockData)));
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

            <div className="grid md:grid-cols-3 gap-6">
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
              <div>
                <label className="form-label flex justify-between">
                  Employees
                  {autoFilledFields.has('employees_count') && <AlertCircle size={14} className="text-highlight" title="Auto-populated from document" />}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="employees_count"
                    className={getInputClass('employees_count', 'form-input pl-11')}
                    value={formData.employees_count}
                    onChange={handleChange}
                  />
                  <Users className={`absolute left-4 top-1/2 -translate-y-1/2 ${autoFilledFields.has('employees_count') ? 'text-highlight' : 'text-slate-500'}`} size={18} />
                </div>
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

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="form-label flex justify-between">
                  Company Type
                  {autoFilledFields.has('company_type') && <AlertCircle size={14} className="text-highlight" title="Auto-populated from document" />}
                </label>
                <select name="company_type" className={getInputClass('company_type')} value={formData.company_type} onChange={handleChange}>
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
                  <option value="Private Company">Private Company</option>
                  <option value="Investment Firm Portfolio Company">Investment Firm Portfolio Company</option>
                  <option value="Public Company">Public Company</option>
                  <option value="Corporate Subsidiary">Corporate Subsidiary</option>
                </select>
              </div>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="form-label" style={{ marginBottom: '0.25rem' }}>Latest Revenue</label>
              <input
                type="text"
                className={`form-input-sm ${autoFilledFields.has('revenue') ? 'form-input-highlight' : ''}`}
                placeholder="$ Revenue"
                value={displayCurrency(formData.revenue)}
                onChange={(e) => handleCurrencyChange('revenue', e.target.value)}
              />
            </div>
            <div>
              <label className="form-label" style={{ marginBottom: '0.25rem' }}>EBITDA</label>
              <input
                type="text"
                className={`form-input-sm ${autoFilledFields.has('ebitda') ? 'form-input-highlight' : ''}`}
                placeholder="$ EBITDA"
                value={displayCurrency(formData.ebitda)}
                onChange={(e) => handleCurrencyChange('ebitda', e.target.value)}
              />
            </div>
            <div>
              <label className="form-label" style={{ marginBottom: '0.25rem' }}>Gross Profit</label>
              <input
                type="text"
                className="form-input-sm"
                placeholder="$ Gross Profit"
                value={displayCurrency(formData.gross_profit)}
                onChange={(e) => handleCurrencyChange('gross_profit', e.target.value)}
              />
            </div>
            <div>
              <label className="form-label" style={{ marginBottom: '0.25rem' }}>Net Income</label>
              <input
                type="text"
                className="form-input-sm"
                placeholder="$ Net Income"
                value={displayCurrency(formData.net_income)}
                onChange={(e) => handleCurrencyChange('net_income', e.target.value)}
              />
            </div>
            <div>
              <label className="form-label" style={{ marginBottom: '0.25rem' }}>YoY Growth %</label>
              <input
                type="number"
                name="growth_rate_pct"
                className="form-input-sm"
                placeholder="e.g. 15"
                value={formData.growth_rate_pct}
                onChange={handleChange}
              />
            </div>
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
              <label className="form-label">Preferred Transaction Type</label>
              <select name="pref_transaction_type" className="form-input" value={formData.pref_transaction_type} onChange={handleChange}>
                <option value="Total Sale">Total Sale</option>
                <option value="Acquisition of Majority Stake">Majority Stake</option>
                <option value="Minority Equity Raise">Minority Equity</option>
                <option value="Debt Raise">Debt Raise</option>
              </select>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { key: 'is_founder_owned', label: 'Founder-Owned' },
                { key: 'is_female_owned', label: 'Female-Owned' },
                { key: 'is_minority_owned', label: 'Minority-Owned' },
                { key: 'is_family_owned', label: 'Family-Owned' }
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
