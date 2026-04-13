import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { organizationService } from '../services/organizationService';
import { Building2, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export default function OrganizationOnboarding({ userId, userRole }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await organizationService.createOrganization(name, userRole, userId);
      // Redirect based on role
      if (userRole === 'seller') navigate('/dashboard/seller');
      else if (userRole === 'buyer') navigate('/dashboard/buyer');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 animate-fade-in">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl mb-6 flex items-center justify-center mx-auto">
            <Building2 className="text-indigo-400" size={40} />
          </div>
          <h1 className="text-4xl font-black mb-4 tracking-tight">Your Organization</h1>
          <p className="text-slate-400">
            Investment criteria and listings are owned at the organization level. This ensures continuity for your team.
          </p>
        </div>

        <div className="glass p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="form-label mb-2 block">Organization Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Acme Capital, LLC"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
              <p className="text-xs text-slate-500 mt-2">
                This name will be used as the legal owner for your entries.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !name}
              className="btn-primary w-full flex items-center justify-center gap-2 h-14 text-lg font-bold shadow-xl shadow-indigo-500/20"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                <>
                  Create Organization <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
