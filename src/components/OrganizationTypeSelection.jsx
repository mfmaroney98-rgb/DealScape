import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { organizationService } from '../services/organizationService';
import { profileService } from '../services/profileService';
import { Target, Briefcase, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function OrganizationTypeSelection({ userId, orgId, onComplete }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Favor the ID passed in props (from App state), but fallback to location state (from Onboarding step)
  const effectiveOrgId = orgId || location.state?.orgId;

  // If we're waiting for the profile to refresh in App state AND no state was passed
  if (!effectiveOrgId || !userId) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6">
        <Loader2 className="animate-spin text-slate-400" size={32} />
        <p className="text-sm text-slate-500 mt-4 italic font-medium">Loading session details...</p>
      </div>
    );
  }

  const handleSelect = async (type) => {
    setSelectedType(type);
    setLoading(true);
    setError(null);

    try {
      // 1. Update Organization Type
      await organizationService.updateOrganization(effectiveOrgId, { type });

      // 2. Sync User Role (Role Inheritance)
      const userRole = type === 'buyer' ? 'buyer' : 'seller';
      await profileService.setRole(userId, userRole);

      // 3. Refresh App State
      if (onComplete) {
        await onComplete();
      }

      // 4. Navigate to appropriate dashboard
      navigate(type === 'buyer' ? '/dashboard/buyer' : '/dashboard/seller');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 animate-fade-in">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black mb-4 tracking-tight">Organization Type</h1>
          <p className="text-slate-400 max-w-lg mx-auto">
            Choose the primary focus for your organization. This will determine the tools and dashboards available to your entire team.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Buyside Card */}
          <button
            onClick={() => handleSelect('buyer')}
            disabled={loading}
            className={`group relative text-left glass p-8 rounded-[2.5rem] border transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] ${
              selectedType === 'buyer' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-800 hover:border-emerald-500/50'
            }`}
          >
            <div className="absolute top-6 right-8">
              {selectedType === 'buyer' ? (
                <CheckCircle2 className="text-emerald-500" size={32} />
              ) : (
                <div className="w-8 h-8 rounded-full border-2 border-slate-800 group-hover:border-emerald-500/30 transition-colors" />
              )}
            </div>

            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl mb-8 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
              <Target className="text-emerald-400" size={32} />
            </div>

            <h2 className="text-2xl font-bold mb-3 text-white">Buyside</h2>
            <p className="text-slate-400 leading-relaxed mb-8">
              Private Equity, Family Offices, and Strategic Buyers looking for investment opportunities and managing search criteria.
            </p>

            <div className="flex items-center gap-2 text-emerald-400 font-bold group-hover:gap-3 transition-all mt-auto">
              Select Buyside <ArrowRight size={18} />
            </div>
          </button>

          {/* Sellside Card */}
          <button
            onClick={() => handleSelect('seller')}
            disabled={loading}
            className={`group relative text-left glass p-8 rounded-[2.5rem] border transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] ${
              selectedType === 'seller' ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-800 hover:border-indigo-500/50'
            }`}
          >
            <div className="absolute top-6 right-8">
              {selectedType === 'seller' ? (
                <CheckCircle2 className="text-indigo-500" size={32} />
              ) : (
                <div className="w-8 h-8 rounded-full border-2 border-slate-800 group-hover:border-indigo-500/30 transition-colors" />
              )}
            </div>

            <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl mb-8 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
              <Briefcase className="text-indigo-400" size={32} />
            </div>

            <h2 className="text-2xl font-bold mb-3 text-white">Sellside</h2>
            <p className="text-slate-400 leading-relaxed mb-8">
              Investment Banks and M&A Advisors managing client listings, marketing materials, and buyer outreach.
            </p>

            <div className="flex items-center gap-2 text-indigo-400 font-bold group-hover:gap-3 transition-all mt-auto">
              Select Sellside <ArrowRight size={18} />
            </div>
          </button>
        </div>

        {error && (
          <div className="mt-8 flex items-start gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm max-w-md mx-auto">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {loading && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-slate-400" size={32} />
            <p className="text-sm text-slate-500 font-medium">Setting up your {selectedType === 'buyer' ? 'Buyside' : 'Sellside'} workspace...</p>
          </div>
        )}
      </div>
    </div>
  );
}
