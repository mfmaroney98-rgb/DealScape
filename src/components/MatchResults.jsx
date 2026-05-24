import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { matchingService } from '../services/matchingService';
import { buyerService } from '../services/buyerService';
import {
  ArrowLeft,
  Loader2,
  Target,
  TrendingUp,
  MapPin,
  Tag,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Building2,
  DollarSign,
  Globe,
  Shield,
  Zap,
  BarChart3,
  Award,
  Users
} from 'lucide-react';

const TIER_CONFIG = {
  Strong: {
    color: 'emerald',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-600',
    borderClass: 'border-emerald-500/30',
    badgeBg: 'bg-emerald-500',
    label: 'Strong Match',
    icon: Award
  },
  Moderate: {
    color: 'amber',
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-600',
    borderClass: 'border-amber-500/30',
    badgeBg: 'bg-amber-500',
    label: 'Moderate Match',
    icon: Zap
  },
  Weak: {
    color: 'slate',
    bgClass: 'bg-slate-200/50',
    textClass: 'text-slate-500',
    borderClass: 'border-slate-300/50',
    badgeBg: 'bg-slate-400',
    label: 'Weak Match',
    icon: BarChart3
  }
};

const ScoreBar = ({ label, score, icon: Icon, color = 'accent' }) => {
  const colorMap = {
    accent: { bar: 'bg-accent', text: 'text-accent' },
    emerald: { bar: 'bg-emerald-500', text: 'text-emerald-600' },
    amber: { bar: 'bg-amber-500', text: 'text-amber-600' },
    blue: { bar: 'bg-blue-500', text: 'text-blue-600' },
    violet: { bar: 'bg-violet-500', text: 'text-violet-600' }
  };
  const c = colorMap[color] || colorMap.accent;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          {Icon && <Icon size={12} className={c.text} />}
          {label}
        </span>
        <span className={`text-xs font-bold ${c.text}`}>{Math.round(score)}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${c.bar}`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
    </div>
  );
};

const formatCurrency = (val) => {
  if (!val && val !== 0) return '--';
  if (Math.abs(val) >= 1e9) return '$' + (val / 1e9).toFixed(1) + 'B';
  if (Math.abs(val) >= 1e6) return '$' + (val / 1e6).toFixed(1) + 'M';
  if (Math.abs(val) >= 1e3) return '$' + (val / 1e3).toFixed(0) + 'K';
  return '$' + Number(val).toLocaleString('en-US');
};

const formatPercentage = (val) => {
  if (!val && val !== 0) return '--';
  return (val * 100).toFixed(1) + '%';
};

export default function MatchResults({ orgId }) {
  const { id: criteriaId } = useParams();
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [criteria, setCriteria] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedCards, setExpandedCards] = useState(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [matchData, criteriaData] = await Promise.all([
          matchingService.getMatchesForCriteria(criteriaId),
          buyerService.getCriteriaById(criteriaId, orgId)
        ]);
        setMatches(matchData);
        setCriteria(criteriaData);
      } catch (err) {
        console.error('Failed to load matches:', err);
        setError(err.message || 'Failed to load matches.');
      } finally {
        setLoading(false);
      }
    };

    if (criteriaId) fetchData();
  }, [criteriaId, orgId]);

  const toggleExpand = (id) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const strongCount = matches.filter(m => m.match_tier === 'Strong').length;
  const moderateCount = matches.filter(m => m.match_tier === 'Moderate').length;
  const weakCount = matches.filter(m => m.match_tier === 'Weak').length;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-accent" size={40} />
        <p className="text-muted-foreground font-medium">Running matching engine...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 animate-fade-in relative">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-emerald-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-6xl mx-auto py-12">
        {/* Navigation */}
        <Link
          to="/dashboard/buyer/criteria"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft size={16} /> Back to Criteria
        </Link>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-accent/10 rounded-xl mb-4">
              <Sparkles className="text-accent" size={24} />
            </div>
            <h1 className="text-4xl font-black tracking-tight mb-2">Match Results</h1>
            <p className="text-muted-foreground">
              {criteria?.investment_criteria_name
                ? `Matches for "${criteria.investment_criteria_name}"`
                : 'Showing all matching listings'}
            </p>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          <div className="glass p-5 rounded-2xl">
            <p className="text-xs text-muted-foreground font-medium mb-1">Total Matches</p>
            <p className="text-3xl font-black text-foreground">{matches.length}</p>
          </div>
          <div className="glass p-5 rounded-2xl border-emerald-500/20">
            <p className="text-xs text-emerald-600 font-medium mb-1 flex items-center gap-1">
              <Award size={12} /> Strong
            </p>
            <p className="text-3xl font-black text-emerald-600">{strongCount}</p>
          </div>
          <div className="glass p-5 rounded-2xl border-amber-500/20">
            <p className="text-xs text-amber-600 font-medium mb-1 flex items-center gap-1">
              <Zap size={12} /> Moderate
            </p>
            <p className="text-3xl font-black text-amber-600">{moderateCount}</p>
          </div>
          <div className="glass p-5 rounded-2xl">
            <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1">
              <BarChart3 size={12} /> Weak
            </p>
            <p className="text-3xl font-black text-slate-400">{weakCount}</p>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="p-4 mb-8 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
            {error}
          </div>
        )}

        {/* Empty state */}
        {matches.length === 0 && !error ? (
          <div className="glass p-16 rounded-3xl text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-100 rounded-2xl mb-6 flex items-center justify-center">
              <Target className="text-slate-400" size={40} />
            </div>
            <h3 className="text-xl font-bold mb-2 text-foreground">No matches found</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              No active seller listings match your criteria. Try broadening your financial ranges or adding more industry keywords.
            </p>
            <Link to={`/onboarding/buyer/edit/${criteriaId}`} className="btn-primary">
              Edit Criteria
            </Link>
          </div>
        ) : (
          /* Match Cards */
          <div className="flex flex-col gap-5">
            {matches.map((match, index) => {
              const tier = TIER_CONFIG[match.match_tier] || TIER_CONFIG.Weak;
              const TierIcon = tier.icon;
              const isExpanded = expandedCards.has(match.listing_id);

              return (
                <div
                  key={match.listing_id}
                  className={`glass rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg ${
                    match.match_tier === 'Strong' ? 'border-emerald-500/20 hover:border-emerald-500/40' :
                    match.match_tier === 'Moderate' ? 'border-amber-500/10 hover:border-amber-500/30' :
                    ''
                  }`}
                >
                  {/* Main Row */}
                  <div
                    className="p-6 flex items-center gap-5 cursor-pointer group"
                    onClick={() => toggleExpand(match.listing_id)}
                  >
                    {/* Rank */}
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-muted-foreground">{index + 1}</span>
                    </div>

                    {/* Score Circle */}
                    <div className={`w-14 h-14 rounded-2xl ${tier.bgClass} flex flex-col items-center justify-center shrink-0`}>
                      <span className={`text-lg font-black ${tier.textClass}`}>
                        {Math.round(match.total_score)}
                      </span>
                    </div>

                    {/* Listing Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1">
                        <h3 className="font-bold text-foreground truncate">
                          {match.seller_anon_name || 'Untitled Listing'}
                        </h3>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full text-white ${tier.badgeBg}`}>
                          {tier.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {match.search_revenue && (
                          <span className="flex items-center gap-1">
                            <DollarSign size={11} />
                            Rev: {formatCurrency(match.search_revenue)}
                          </span>
                        )}
                        {match.search_ebitda && (
                          <span className="flex items-center gap-1">
                            <TrendingUp size={11} />
                            EBITDA: {formatCurrency(match.search_ebitda)}
                          </span>
                        )}
                        {match.search_ebitda_margin && (
                          <span className="flex items-center gap-1">
                            Margin: {formatPercentage(match.search_ebitda_margin)}
                          </span>
                        )}
                        {match.locations?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <MapPin size={11} />
                            {match.locations.slice(0, 2).map(l => l.split(':').pop()).join(', ')}
                            {match.locations.length > 2 && ` +${match.locations.length - 2}`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expand Toggle */}
                    <button className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-slate-100">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="px-6 pb-6 pt-0 border-t border-border/50 animate-fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-5">
                        {/* Score Breakdown */}
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <BarChart3 size={14} className="text-accent" />
                            Score Breakdown
                          </h4>
                          <div className="space-y-3 p-4 bg-slate-50/80 rounded-xl">
                            <ScoreBar
                              label="Financial Fit"
                              score={match.financial_score || 0}
                              icon={DollarSign}
                              color="emerald"
                            />
                            <ScoreBar
                              label="Geography"
                              score={match.geography_score || 0}
                              icon={Globe}
                              color="blue"
                            />
                            {match.industry_score !== null && match.industry_score !== undefined && (
                              <ScoreBar
                                label="Industry Score"
                                score={match.industry_score}
                                icon={Building2}
                                color="emerald"
                              />
                            )}
                            <ScoreBar
                              label="Semantic Score"
                              score={match.semantic_score || 0}
                              icon={Sparkles}
                              color="violet"
                            />
                            {match.bonus_score > 0 && (
                              <div className="space-y-1">
                                <ScoreBar
                                  label="Bonus"
                                  score={match.bonus_score}
                                  icon={Shield}
                                  color="amber"
                                />
                                {match.bonus_reasons?.length > 0 && (
                                  <div className="flex flex-wrap gap-1 ml-6">
                                    {match.bonus_reasons.map((reason, ri) => (
                                      <span key={ri} className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold uppercase tracking-wider">
                                        {reason}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="pt-2 border-t border-slate-200/60">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-foreground">Total Score</span>
                                <span className={`text-sm font-black ${tier.textClass}`}>
                                  {Math.round(match.total_score)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Financials Detail */}
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <TrendingUp size={14} className="text-emerald-500" />
                            Financial Snapshot
                          </h4>
                          <div className="space-y-2">
                            {[
                              { label: 'Revenue', value: match.search_revenue, fmt: formatCurrency },
                              { label: 'EBITDA', value: match.search_ebitda, fmt: formatCurrency },
                              { label: 'EBITDA Margin', value: match.search_ebitda_margin, fmt: formatPercentage },
                              { label: 'Revenue Growth', value: match.search_revenue_growth_yoy, fmt: formatPercentage }
                            ].map(metric => (
                              <div key={metric.label} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/80">
                                <span className="text-xs text-muted-foreground">{metric.label}</span>
                                <span className="text-xs font-semibold text-foreground">
                                  {metric.value != null ? metric.fmt(metric.value) : '--'}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Ownership Flags */}
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {match.is_founder_owned && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">Founder-Owned</span>
                            )}
                            {match.is_family_owned && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">Family-Owned</span>
                            )}
                            {match.is_female_owned && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">Female-Owned</span>
                            )}
                            {match.is_minority_owned && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">Minority-Owned</span>
                            )}
                            {match.is_operator_owned && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">Operator-Owned</span>
                            )}
                          </div>
                        </div>

                        {/* Keywords / Strategic */}
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Tag size={14} className="text-amber-500" />
                            Strategic Profile
                          </h4>
                          <div className="p-4 bg-slate-50/80 rounded-xl">
                            {(() => {
                              // 1. Clean the flat keywords string (Postgres array-to-text format: {"key1","key2"})
                              const rawKeywords = match.keywords || '';
                              const cleanKeywords = rawKeywords.replace(/[{}"[\]]/g, '');
                              const kwList = cleanKeywords
                                ? cleanKeywords.split(',').map(k => k.trim()).filter(Boolean)
                                : [];

                              // 2. Fallback: pull from categorized_keywords JSONB if flat keywords is empty or looks like noise
                              const displayKeywords = kwList.length > 0
                                ? kwList
                               : (match.categorized_keywords
                                  ? Object.entries(match.categorized_keywords)
                                      .filter(([cat]) => cat !== 'reason_for_sale')
                                      .map(([_, tags]) => tags)
                                      .flat()
                                      .filter(Boolean)
                                  : []);
                              
                              return displayKeywords.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {displayKeywords.slice(0, 12).map((kw, i) => (
                                    <span
                                      key={i}
                                      className="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-foreground font-medium"
                                    >
                                      {kw}
                                    </span>
                                  ))}
                                  {displayKeywords.length > 12 && (
                                    <span className="text-[10px] text-muted-foreground self-center">
                                      +{displayKeywords.length - 12} more
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">No keywords available</p>
                              );
                            })()}
                          </div>

                          {/* Transaction Types */}
                          {match.pref_transaction_type?.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Transaction Type</p>
                              <div className="flex flex-wrap gap-1.5">
                                {match.pref_transaction_type.map((tt, i) => (
                                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-muted-foreground border border-slate-200">
                                    {tt}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Reason for Sale & Transition */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            {match.categorized_keywords?.reason_for_sale?.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reason for Sale</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {match.categorized_keywords.reason_for_sale.map((reason, i) => (
                                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                                      {reason}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {match.owner_transition && (
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Owner Transition</p>
                                <div className="flex items-center gap-2 text-[10px] font-medium text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full w-fit">
                                  <Users size={12} className="text-slate-400" />
                                  {match.owner_transition}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
