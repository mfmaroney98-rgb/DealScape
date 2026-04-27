import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { organizationService } from '../services/organizationService';
import { 
  Building2, 
  Globe, 
  FileText, 
  Users, 
  ArrowLeft, 
  Save, 
  Loader2,
  AlertCircle
} from 'lucide-react';

export default function SellerProfilePage({ userId, orgId, onComplete }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    organization_name: '',
    website_url: '',
    organization_summary: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const org = await organizationService.getOrganization(orgId);
        
        setFormData({
          organization_name: org.organization_name || '',
          website_url: org.website_url || '',
          organization_summary: org.organization_summary || ''
        });
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
        organization_summary: formData.organization_summary
      });
      
      setSuccess(true);
      if (onComplete) {
        await onComplete();
      }
      
      setTimeout(() => {
        navigate('/dashboard/seller');
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
        <Link to="/dashboard/seller" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        
        <div className="mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-500/10 rounded-xl mb-4">
            <Users className="text-indigo-400" size={24} />
          </div>
          <h1 className="text-4xl font-black tracking-tight mb-2">Seller Profile</h1>
          <p className="text-slate-400">Update your organization's public identity and summary.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="glass p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-8">
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

            {/* Organization Summary */}
            <div className="field-group">
              <label className="form-label mb-2 flex items-center gap-2">
                <FileText size={16} className="text-slate-500" />
                Organization Summary
              </label>
              <div className="relative">
                <textarea
                  name="organization_summary"
                  className="form-input min-h-[160px]"
                  placeholder="Tell us about your organization, team, and general industry focus..."
                  value={formData.organization_summary}
                  onChange={handleChange}
                  required
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                This summary helps buyers understand the team behind your listings.
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
                  <Save size={20} /> Save Seller Profile
                </>
              )}
            </button>
            <Link to="/dashboard/seller" className="btn-secondary px-8 h-14 flex items-center justify-center font-bold">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
