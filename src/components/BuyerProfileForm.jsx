import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { organizationService } from '../services/organizationService';
import { buyerService } from '../services/buyerService';
import { 
  Building2, 
  Globe, 
  FileText, 
  Users, 
  ArrowLeft, 
  Save, 
  Loader2,
  AlertCircle,
  TrendingUp,
  Calendar,
  DollarSign,
  Plus,
  Trash2
} from 'lucide-react';

export default function BuyerProfileForm({ orgId, onComplete }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    organization_name: '',
    website_url: '',
    organization_summary: '',
    type: '',
    aum: '',
    year_founded: '',
    funds: []
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // 1. Fetch current organization data
        const org = await organizationService.getOrganization(orgId);
        
        // 2. Map existing data
        const updatedData = {
          organization_name: org.organization_name || '',
          website_url: org.website_url || '',
          organization_summary: org.organization_summary || '',
          type: org.type || '',
          aum: org.aum != null ? String(org.aum) : '',
          year_founded: org.year_founded != null ? String(org.year_founded) : '',
          funds: Array.isArray(org.funds) ? org.funds : []
        };

        // 3. Auto-import logic: If profile is empty, try to grab from first existing criteria
        if (!updatedData.website_url && !updatedData.organization_summary && !updatedData.type) {
          const criteriaList = await buyerService.getCriteriaList(orgId);
          if (criteriaList && criteriaList.length > 0) {
            const first = criteriaList[0];
            updatedData.website_url = first.buyer_url || '';
            updatedData.organization_summary = first.overview || '';
            updatedData.type = first.buyer_type || '';
          }
        }

        setFormData(updatedData);
      } catch (err) {
        console.error('Failed to load profile:', err);
        setError('Failed to load organization profile.');
      } finally {
        setLoading(false);
      }
    };

    if (orgId) {
      fetchData();
    }
  }, [orgId]);

  const handleAddFund = () => {
    setFormData(prev => ({
      ...prev,
      funds: [...prev.funds, { name: '', size: '' }]
    }));
  };

  const handleRemoveFund = (index) => {
    setFormData(prev => ({
      ...prev,
      funds: prev.funds.filter((_, i) => i !== index)
    }));
  };

  const handleFundChange = (index, field, value) => {
    setFormData(prev => {
      const updatedFunds = [...prev.funds];
      updatedFunds[index] = { ...updatedFunds[index], [field]: value };
      return { ...prev, funds: updatedFunds };
    });
  };

  const formatWithCommas = (value) => {
    if (!value && value !== 0 && value !== '0') return '';
    const strVal = value.toString();
    const parts = strVal.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join('.');
  };

  const displayCurrency = (value) => {
    if (!value && value !== 0 && value !== '0') return '';
    return '$' + formatWithCommas(value);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await organizationService.updateOrganization(orgId, {
        organization_name: formData.organization_name,
        website_url: formData.website_url,
        organization_summary: formData.organization_summary,
        type: formData.type,
        aum: formData.aum === '' ? null : Number(formData.aum),
        year_founded: formData.year_founded === '' ? null : Number(formData.year_founded),
        funds: formData.funds.map(f => ({
          name: f.name,
          size: f.size === '' ? null : Number(f.size)
        }))
      });
      
      setSuccess(true);
      if (onComplete) {
        await onComplete();
      }
      
      // Navigate back to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard/buyer');
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 animate-fade-in relative">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-3xl mx-auto py-12">
        <Link to="/dashboard/buyer" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        
        <div className="mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-500/10 rounded-xl mb-4">
            <Users className="text-indigo-400" size={24} />
          </div>
          <h1 className="text-4xl font-black tracking-tight mb-2">Buyer Profile</h1>
          <p className="text-slate-400">Update your organization's general profile and investment identity.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="glass p-8 rounded-3xl shadow-2xl space-y-8">
            {/* Organization Identity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="field-group">
                <label className="form-label mb-2 flex items-center gap-2">
                  <Building2 size={16} className="text-slate-500" />
                  Organization Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="organization_name"
                    className="form-input"
                    placeholder="Company Name"
                    value={formData.organization_name}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="field-group">
                <label className="form-label mb-2 flex items-center gap-2">
                  <Globe size={16} className="text-slate-500" />
                  Website URL
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="website_url"
                    className="form-input"
                    placeholder="https://www.example.com"
                    value={formData.website_url}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="field-group">
              <label className="form-label mb-2 flex items-center gap-2">
                <TrendingUp size={16} className="text-slate-500" />
                Buyer Type
              </label>
              <div className="relative">
                <select
                  name="type"
                  className="form-input appearance-auto cursor-pointer"
                  value={formData.type}
                  onChange={handleChange}
                  required
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

            {/* AUM and Year Founded */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="field-group">
                <label className="form-label mb-2 flex items-center gap-2">
                  <DollarSign size={16} className="text-slate-500" />
                  Assets Under Management (AUM)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="aum"
                    className="form-input"
                    placeholder="$0"
                    value={displayCurrency(formData.aum)}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/[^0-9]/g, '');
                      setFormData(prev => ({ ...prev, aum: digits }));
                    }}
                  />
                </div>
              </div>

              <div className="field-group">
                <label className="form-label mb-2 flex items-center gap-2">
                  <Calendar size={16} className="text-slate-500" />
                  Year Founded
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="year_founded"
                    className="form-input"
                    placeholder="e.g. 2010"
                    value={formData.year_founded}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setFormData(prev => ({ ...prev, year_founded: val }));
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Funds Section */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                  <TrendingUp size={16} className="text-indigo-400" />
                  Funds Under Management
                </h3>
                <button
                  type="button"
                  onClick={handleAddFund}
                  className="flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <Plus size={14} /> Add Fund
                </button>
              </div>

              {formData.funds.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No funds added yet. Click "Add Fund" to list your active or historical funds.</p>
              ) : (
                <div className="space-y-3">
                  {formData.funds.map((fund, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 bg-slate-900/40 rounded-2xl border border-slate-800/85 animate-fade-in">
                      <div className="flex-1">
                        <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">Fund Name</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Fund I"
                          value={fund.name || ''}
                          onChange={(e) => handleFundChange(index, 'name', e.target.value)}
                          required
                        />
                      </div>
                      <div className="w-1/3">
                        <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">Fund Size</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="$0"
                          value={displayCurrency(fund.size)}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/[^0-9]/g, '');
                            handleFundChange(index, 'size', digits);
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFund(index)}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-red-400 transition-colors mt-5"
                        title="Remove Fund"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Organization Description */}
            <div className="field-group">
              <label className="form-label mb-2 flex items-center gap-2">
                <FileText size={16} className="text-slate-500" />
                Organization Description
              </label>
              <div className="relative">
                <textarea
                  name="organization_summary"
                  className="form-input min-h-[160px]"
                  placeholder="Tell us about your organization's investment thesis, history, and team..."
                  value={formData.organization_summary}
                  onChange={handleChange}
                  required
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                This overview will be shared with sellers when you express interest in a listing.
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm animate-fade-in">
              <Save size={18} className="shrink-0 mt-0.5" />
              <span>Profile updated successfully! Redirecting...</span>
            </div>
          )}

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex-1 flex items-center justify-center gap-2 h-14 text-lg font-bold shadow-xl shadow-indigo-500/20"
            >
              {saving ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                <>
                  <Save size={20} /> Save Profile Changes
                </>
              )}
            </button>
            <Link to="/dashboard/buyer" className="btn-secondary px-8 h-14 flex items-center justify-center font-bold">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
