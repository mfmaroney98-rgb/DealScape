import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { buyerService } from '../services/buyerService';
import { supabase } from '../lib/supabase';
import { Target, TrendingUp, DollarSign, PlusCircle, ArrowLeft, Loader2, Search, Building2, Tag } from 'lucide-react';

export default function BuyerCriteriaList() {
  const [criteriaList, setCriteriaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCriteria = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate('/');
          return;
        }

        const data = await buyerService.getCriteriaList(session.user.id);
        setCriteriaList(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCriteria();
  }, [navigate]);

  const formatCurrency = (val) => {
    if (!val && val !== 0) return '--';
    return '$' + Number(val).toLocaleString('en-US');
  };

  const formatPercentage = (val) => {
    if (!val && val !== 0) return '--';
    return Number(val).toLocaleString('en-US') + '%';
  };

  const getFinancialRange = (criteria, metricName) => {
    const match = criteria.financial_criteria?.find(c => c.metric === metricName);
    if (!match) return '--';
    
    const isPct = metricName.includes('Margin') || metricName.includes('Growth') || metricName.includes('%');
    const formatter = isPct ? formatPercentage : formatCurrency;
    
    if (match.min && match.max) return `${formatter(match.min)} - ${formatter(match.max)}`;
    if (match.min) return `>${formatter(match.min)}`;
    if (match.max) return `<${formatter(match.max)}`;
    return '--';
  };

  const getDisplayKeywords = (keywords) => {
    if (!keywords) return '--';
    
    let kwArray = [];
    if (Array.isArray(keywords)) {
      kwArray = keywords;
    } else if (typeof keywords === 'string') {
      kwArray = keywords.replace(/[{}"[\]]/g, '').split(',').map(k => k.trim()).filter(Boolean);
    }
    
    if (!kwArray || kwArray.length === 0) return '--';
    
    const displaySize = 3;
    const display = kwArray.slice(0, displaySize).join('\n');
    return kwArray.length > displaySize ? `${display}\n...` : display;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 animate-fade-in relative">
      <div className="absolute top-0 left-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-6xl mx-auto py-12">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-500/10 rounded-xl mb-4">
              <Target className="text-emerald-400" size={24} />
            </div>
            <h1 className="text-4xl font-black tracking-tight mb-2">Investment Criteria</h1>
            <p className="text-slate-400">View and manage all your defined investment criteria sets.</p>
          </div>
          <Link to="/onboarding/buyer" className="btn-primary-emerald flex items-center gap-2 px-6 py-3 shrink-0">
            <PlusCircle size={18} /> New Criteria
          </Link>
        </div>

        {error && (
          <div className="p-4 mb-8 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {criteriaList.length === 0 ? (
          <div className="glass p-12 rounded-3xl border border-slate-800 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-800/50 rounded-2xl mb-6 flex items-center justify-center">
              <Search className="text-slate-500" size={40} />
            </div>
            <h3 className="text-xl font-bold mb-2">No criteria found</h3>
            <p className="text-slate-400 mb-6">You haven't defined any investment criteria yet.</p>
            <Link to="/onboarding/buyer" className="btn-primary-emerald flex items-center gap-2 py-3 px-8">
              Get Started <ArrowLeft className="rotate-180" size={18} />
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {criteriaList.map((criteria) => (
              <div key={criteria.id} className="glass p-8 rounded-3xl border border-slate-800 hover:border-emerald-500/50 transition-all duration-300">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                      <Building2 className="text-emerald-400" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        {criteria.investment_criteria_name || 'Untitled Criteria'}
                      </h3>
                      <p className="text-sm text-slate-400">{criteria.buyer_type || 'Unspecified Type'}</p>
                    </div>
                  </div>
                  <Link 
                    to={`/onboarding/buyer/edit/${criteria.id}`}
                    className="px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold border border-slate-700 transition-all"
                  >
                    Edit Criteria
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Financial Ranges */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                      <TrendingUp size={16} className="text-emerald-400" /> Financial Targets
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 rounded-xl bg-slate-900/50 border border-slate-800/50">
                        <span className="text-xs text-slate-500">Revenue</span>
                        <span className="text-sm font-semibold text-emerald-400">{getFinancialRange(criteria, 'Revenue')}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-xl bg-slate-900/50 border border-slate-800/50">
                        <span className="text-xs text-slate-500">EBITDA</span>
                        <span className="text-sm font-semibold text-emerald-400">{getFinancialRange(criteria, 'EBITDA')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Locations */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                      <Search size={16} className="text-emerald-400" /> Geography
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/50 min-h-[80px]">
                      <p className="text-sm text-slate-300">
                        {criteria.locations?.length > 0 
                          ? `${criteria.locations.length} regions selected`
                          : 'Global / Unspecified'}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {criteria.locations?.slice(0, 3).map((loc, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                            {loc.split(':').pop()}
                          </span>
                        ))}
                        {criteria.locations?.length > 3 && <span className="text-[10px] text-slate-500">+{criteria.locations.length - 3} more</span>}
                      </div>
                    </div>
                  </div>

                  {/* Keywords */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                      <Tag size={16} className="text-emerald-400" /> Industry Keywords
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/50 min-h-[80px]">
                      <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                        {getDisplayKeywords(criteria.keywords)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
