import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { buyerService } from '../services/buyerService';
import { supabase } from '../lib/supabase';
import { Target, TrendingUp, DollarSign, PlusCircle, ArrowLeft, Loader2, Search, Building2, Tag, Sparkles } from 'lucide-react';
import { organizationService } from '../services/organizationService';

export default function BuyerCriteriaList({ orgId, isCorporate }) {
  const [criteriaList, setCriteriaList] = useState([]);
  const [organization, setOrganization] = useState(null);
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

        const [criteriaData, orgData] = await Promise.all([
          buyerService.getCriteriaList(orgId, isCorporate),
          !isCorporate && orgId ? organizationService.getOrganization(orgId) : Promise.resolve(null)
        ]);

        setCriteriaList(criteriaData || []);
        setOrganization(orgData);
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

  const getCleanGeography = (locations) => {
    if (!locations || locations.length === 0) return { title: 'Global / Unspecified', pills: [] };

    const NAMES = {
      'US': 'United States',
      'CA': 'Canada',
      'North America': 'North America',
      'Europe': 'Europe',
      'Asia': 'Asia',
      'South America': 'South America',
      'Oceania': 'Oceania',
      'Africa': 'Africa'
    };

    const keys = locations.filter(Boolean);
    const continents = ['North America', 'Europe', 'Asia', 'South America', 'Oceania', 'Africa'].filter(c => keys.includes(c));
    const countries = ['US', 'CA'].filter(c => keys.includes(c));
    const usStates = keys.filter(k => k.startsWith('US:')).map(k => k.split(':').pop());
    const caProvinces = keys.filter(k => k.startsWith('CA:')).map(k => k.split(':').pop());

    if (keys.includes('North America')) {
      return { title: 'North America', pills: ['North America'] };
    }

    if (keys.includes('US') || usStates.length >= 50) {
      if (keys.includes('CA') || caProvinces.length >= 10) {
        return { title: 'North America (US & Canada)', pills: ['United States', 'Canada'] };
      }
      return { title: 'United States (National)', pills: ['United States'] };
    }

    if (keys.includes('CA') || caProvinces.length >= 10) {
      return { title: 'Canada (National)', pills: ['Canada'] };
    }

    const pills = [];
    if (usStates.length > 0) {
      usStates.forEach(st => pills.push(st));
    }
    if (caProvinces.length > 0) {
      caProvinces.forEach(pr => pills.push(pr));
    }

    countries.forEach(ctry => {
      const name = NAMES[ctry] || ctry;
      if (!pills.includes(name)) pills.push(name);
    });

    continents.forEach(cont => {
      const name = NAMES[cont] || cont;
      if (!pills.includes(name)) pills.push(name);
    });

    if (pills.length === 0) {
      const fallbackPills = keys.map(k => NAMES[k] || k.split(':').pop());
      return { 
        title: `${fallbackPills.length} Region${fallbackPills.length > 1 ? 's' : ''}`, 
        pills: fallbackPills 
      };
    }

    return {
      title: `${pills.length} State${pills.length > 1 ? 's' : ''} Selected`,
      pills: pills
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-background animate-fade-in relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-40 -z-10 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent/5 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent-secondary/5 blur-[150px] rounded-full" />
      </div>

      <div className="max-w-6xl mx-auto py-12">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 font-semibold">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-accent/10 rounded-xl mb-4 text-accent">
              <Target size={24} />
            </div>
            <h1 className="text-5xl font-display tracking-tight mb-2">
              Investment <span className="gradient-text">Criteria</span>
            </h1>
            <p className="text-muted-foreground">View and manage all your defined investment criteria sets.</p>
          </div>
          <Link to="/onboarding/buyer" className="btn-primary shrink-0">
            <PlusCircle size={18} /> New Criteria Set
          </Link>
        </div>

        {error && (
          <div className="p-4 mb-8 rounded-xl bg-red-500/5 border border-red-500/10 text-red-600 text-sm">
            {error}
          </div>
        )}

        {criteriaList.length === 0 ? (
          <div className="glass p-16 rounded-3xl text-center flex flex-col items-center border-border/50">
            <div className="w-20 h-20 bg-accent/10 rounded-2xl mb-8 flex items-center justify-center text-accent">
              <Search size={40} />
            </div>
            <h3 className="text-3xl font-display mb-3">No criteria found</h3>
            <p className="text-muted-foreground text-sm mb-8 leading-relaxed max-w-[280px]">
              You haven't defined any investment criteria sets yet. Create one to start matching.
            </p>
            <Link to="/onboarding/buyer" className="btn-primary py-4 px-8">
              Get Started <ArrowLeft className="rotate-180" size={18} />
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {criteriaList.map((criteria) => {
              const keywordsList = getDisplayKeywords(criteria.keywords) !== '--' 
                ? (Array.isArray(criteria.keywords) 
                  ? criteria.keywords 
                  : typeof criteria.keywords === 'string'
                    ? criteria.keywords.replace(/[{}"[\]]/g, '').split(',').map(k => k.trim()).filter(Boolean)
                    : [])
                : [];

              return (
                <div key={criteria.id} className="glass p-8 rounded-3xl border-border/50 hover:border-accent/30 hover:shadow-2xl hover:shadow-accent/5 transition-all duration-300 flex flex-col gap-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                        <Building2 size={24} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-foreground">
                          {criteria.investment_criteria_name || 'Untitled Criteria'}
                        </h3>
                        <p className="text-sm text-muted-foreground font-medium mt-0.5">
                          {criteria.division ? `${criteria.division} • ` : ''}
                          {organization?.type || criteria.buyer_type || 'Unspecified Type'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Link 
                        to={`/dashboard/buyer?criteriaId=${criteria.id}`}
                        className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white text-sm font-semibold transition-all flex items-center gap-2 shadow-sm shadow-accent/20 active:scale-[0.98]"
                      >
                        <Sparkles size={14} /> View Matches
                      </Link>
                      <Link 
                        to={`/onboarding/buyer/edit/${criteria.id}`}
                        className="btn-secondary px-5 py-2.5 h-auto text-sm"
                      >
                        Edit Criteria
                      </Link>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Financial Targets */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm font-semibold">
                        <TrendingUp size={16} className="text-accent" /> Financial Targets
                      </div>
                      <div className="space-y-2.5">
                        {(() => {
                          const activeFinancials = criteria.financial_criteria?.filter(fc => 
                            (fc.min !== '' && fc.min !== null && fc.min !== undefined) || 
                            (fc.max !== '' && fc.max !== null && fc.max !== undefined)
                          ) || [];
                          
                          if (activeFinancials.length === 0) {
                            return (
                              <div className="p-4 rounded-2xl bg-muted/40 border border-border/30 text-center shadow-xs">
                                <p className="text-xs font-semibold text-muted-foreground">No financial restrictions</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">Fits any business size</p>
                              </div>
                            );
                          }
                          
                          return activeFinancials.map((fc, idx) => (
                            <div key={fc.id || idx} className="flex justify-between items-center p-4 rounded-2xl bg-muted/80 border border-border/40 shadow-xs">
                              <span className="text-xs font-medium text-muted-foreground">{fc.metric}</span>
                              <span className="text-sm font-bold text-foreground">{getFinancialRange(criteria, fc.metric)}</span>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    {/* Locations */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm font-semibold">
                        <Search size={16} className="text-accent" /> Geography Focus
                      </div>
                      <div className="p-4 rounded-2xl bg-muted/80 border border-border/40 min-h-[114px] flex flex-col justify-center shadow-xs">
                        {(() => {
                          const geo = getCleanGeography(criteria.locations);
                          return (
                            <>
                              <p className="text-sm font-semibold text-foreground">
                                {geo.title}
                              </p>
                              {geo.pills.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-3">
                                  {geo.pills.slice(0, 3).map((pillName, i) => (
                                    <span key={i} className="text-[10px] px-2.5 py-1 rounded-full bg-white text-muted-foreground border border-border font-semibold shadow-xs">
                                      {pillName}
                                    </span>
                                  ))}
                                  {geo.pills.length > 3 && (
                                    <span className="text-[10px] text-muted-foreground font-semibold ml-1 self-center">
                                      +{geo.pills.length - 3} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Keywords */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm font-semibold">
                        <Tag size={16} className="text-accent" /> Industry Keywords
                      </div>
                      <div className="p-4 rounded-2xl bg-muted/80 border border-border/40 min-h-[114px] flex flex-col justify-center shadow-xs">
                        {keywordsList.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {keywordsList.slice(0, 4).map((kw, i) => (
                              <span key={i} className="text-[10px] px-2.5 py-1 rounded-full bg-white text-accent border border-accent/10 font-bold shadow-xs">
                                {kw}
                              </span>
                            ))}
                            {keywordsList.length > 4 && (
                              <span className="text-[10px] text-muted-foreground font-semibold ml-1 self-center">
                                +{keywordsList.length - 4} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">No keywords specified</p>
                        )}
                      </div>
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
}
