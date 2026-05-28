import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { buyerService } from '../services/buyerService';
import { matchingService } from '../services/matchingService';
import { organizationService } from '../services/organizationService';
import { sellerListingService } from '../services/sellerListingService';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import {
  TrendingUp,
  LogOut,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Search,
  Filter,
  Flag,
  Paperclip,
  MessageSquare,
  AlertTriangle,
  MoreHorizontal,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Bookmark,
  DollarSign,
  MapPin,
  Building,
  Calendar,
  Users,
  Briefcase,
  Layers,
  Inbox,
  Settings,
  Bell,
  Download,
  CheckCircle,
  ExternalLink,
  Target,
  BarChart2,
  Lock,
  ArrowRight
} from 'lucide-react';

const COLORS = [
  'bg-teal-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-amber-500',
  'bg-green-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-rose-500'
];

export default function BuyerSaaSDashboard({ profile }) {
  const navigate = useNavigate();
  const orgId = profile?.organization_id;
  const isCorporate = profile?.role === 'corporate';

  // State Management
  const [criteriaList, setCriteriaList] = useState([]);
  const [selectedCriteriaIds, setSelectedCriteriaIds] = useState(new Set());
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const notificationTimeoutRef = useRef(null);
  const [activeCriteriaKebabId, setActiveCriteriaKebabId] = useState(null);

  // Layout states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('Requests');
  const [activeSubTab, setActiveSubTab] = useState('Overview');
  const [activeSmartFilter, setActiveSmartFilter] = useState('All Matches'); // 'All Matches', 'Strong', 'Moderate', 'Weak', 'Shortlisted'

  // Dropdown states
  const [activeDropdown, setActiveDropdown] = useState(null); // 'status' | 'priority' | 'revenue' | 'ebitda' | 'filters'

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRevenue, setFilterRevenue] = useState(0); // 0 = Any
  const [filterEbitda, setFilterEbitda] = useState(0); // 0 = Any
  const [filterIndustry, setFilterIndustry] = useState('All');
  const [filterRegion, setFilterRegion] = useState('All');

  // Selected row/drawer state
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('details');
  const [activeLogicCriteriaId, setActiveLogicCriteriaId] = useState('');

  useEffect(() => {
    if (selectedMatch) {
      setActiveLogicCriteriaId(selectedMatch.criteria_id || '');
    }
  }, [selectedMatch]);

  // Custom local state for interaction mocks
  const [pinnedDeals, setPinnedDeals] = useState(new Set());
  const [starredDeals, setStarredDeals] = useState(new Set());
  const [dealStatuses, setDealStatuses] = useState({}); // listingId -> status
  const [requestedCIMs, setRequestedCIMs] = useState(new Set()); // listingId

  // Refs for closing dropdowns
  const dropdownRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
        setActiveCriteriaKebabId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initial Data Fetching
  useEffect(() => {
    const initWorkspace = async () => {
      try {
        setLoading(true);
        // Fetch all criteria sets for this buyer
        const criteriaData = await buyerService.getCriteriaList(orgId, isCorporate);
        setCriteriaList(criteriaData || []);

        if (criteriaData && criteriaData.length > 0) {
          // Default to all criteria sets selected
          setSelectedCriteriaIds(new Set(criteriaData.map(c => c.id)));
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Workspace Loading Error:', err);
        setError('Failed to initialize workspace data.');
        setLoading(false);
      }
    };

    if (orgId) initWorkspace();
  }, [orgId, isCorporate]);

  // Load matches when active criteria sets change
  useEffect(() => {
    const fetchMatches = async () => {
      if (selectedCriteriaIds.size === 0) {
        setMatches([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        
        // Fetch matches for all selected criteria sets in parallel
        const matchPromises = Array.from(selectedCriteriaIds).map(id =>
          matchingService.getMatchesForCriteria(id)
        );
        const results = await Promise.all(matchPromises);
        
        // Merge results, removing duplicate listings and keeping highest score
        const mergedMap = new Map();
        results.forEach((matchList, listIdx) => {
          const criteriaId = Array.from(selectedCriteriaIds)[listIdx];
          const criteriaObj = criteriaList.find(c => c.id === criteriaId);
          const criteriaName = criteriaObj?.investment_criteria_name || 'Criteria Set';

          matchList.forEach(m => {
            const matchInfo = {
              criteriaId,
              criteriaName,
              matchTier: m.match_tier,
              totalScore: m.total_score,
              financialScore: m.financial_score || 0,
              geographyScore: m.geography_score || 0,
              industryScore: m.industry_score,
              semanticScore: m.semantic_score || 0,
              bonusScore: m.bonus_score || 0,
              bonusReasons: m.bonus_reasons || []
            };

            const existing = mergedMap.get(m.listing_id);
            let matchedCriteriaList = [];
            if (existing) {
              const filterExisting = existing.matchedCriteriaList.filter(item => item.criteriaName !== criteriaName);
              matchedCriteriaList = [...filterExisting, matchInfo];
            } else {
              matchedCriteriaList = [matchInfo];
            }

            if (!existing || m.total_score > existing.total_score) {
              mergedMap.set(m.listing_id, {
                ...m,
                matchedCriteriaList
              });
            } else {
              existing.matchedCriteriaList = matchedCriteriaList;
            }
          });
        });

        const mergedList = Array.from(mergedMap.values());
        mergedList.sort((a, b) => b.total_score - a.total_score);
        setMatches(mergedList);

        // Prepopulate default mock statuses
        const statuses = {};
        mergedList.forEach((m, idx) => {
          if (idx === 0) statuses[m.listing_id] = 'Due Diligence';
          else if (idx === 1) statuses[m.listing_id] = 'NDA Signed';
          else if (idx === 2) statuses[m.listing_id] = 'Active Fit';
          else statuses[m.listing_id] = 'New';
        });
        setDealStatuses(prev => ({ ...statuses, ...prev }));
      } catch (err) {
        console.error('Matches Loading Error:', err);
        setError('Failed to load matching listings.');
      } finally {
        setLoading(false);
      }
    };

    if (criteriaList.length > 0) {
      fetchMatches();
    }
  }, [selectedCriteriaIds, criteriaList]);

  // Actions
  const triggerNotification = (message) => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    setNotification(message);
    notificationTimeoutRef.current = setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  const togglePin = (id) => {
    setPinnedDeals(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleStar = (id) => {
    setStarredDeals(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        triggerNotification("Listing Removed from Watchlist");
      } else {
        next.add(id);
        triggerNotification("Listing added to Watchlist.");
      }
      return next;
    });
  };

  const handleStatusChange = (listingId, status) => {
    setDealStatuses(prev => ({ ...prev, [listingId]: status }));
  };

  const requestCIM = (listingId) => {
    setRequestedCIMs(prev => {
      const next = new Set(prev);
      next.add(listingId);
      return next;
    });
  };

  // Log out action
  const handleSignOut = () => {
    supabase.auth.signOut();
  };

  // Helper formatting functions
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

  // Parsing helper for array keywords
  const parseKeywords = (keywords) => {
    if (!keywords) return [];
    if (Array.isArray(keywords)) return keywords;
    return keywords.replace(/[{}"[\]]/g, '').split(',').map(k => k.trim()).filter(Boolean);
  };

  // Filter & Search Logic
  const getFilteredMatches = () => {
    return matches.filter(match => {
      // 1. Search Query (Anon Name or Strategic Profile)
      const anonName = match.seller_anon_name?.toLowerCase() || '';
      const summary = match.summary?.toLowerCase() || '';
      const keywords = parseKeywords(match.keywords).join(' ').toLowerCase();
      const matchesSearch =
        anonName.includes(searchQuery.toLowerCase()) ||
        summary.includes(searchQuery.toLowerCase()) ||
        keywords.includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // 2. Revenue filter
      if (filterRevenue > 0 && match.search_revenue < filterRevenue) return false;

      // 3. EBITDA filter
      if (filterEbitda > 0 && match.search_ebitda < filterEbitda) return false;

      // 4. Match Tier (Smart Filter inside Inner Sidebar)
      if (activeSmartFilter === 'Strong' && match.match_tier !== 'Strong') return false;
      if (activeSmartFilter === 'Moderate' && match.match_tier !== 'Moderate') return false;
      if (activeSmartFilter === 'Weak' && match.match_tier !== 'Weak') return false;
      if (activeSmartFilter === 'Watchlist' && !starredDeals.has(match.listing_id)) return false;

      // 5. Industry filter
      if (filterIndustry !== 'All') {
        const kws = parseKeywords(match.keywords).map(k => k.toLowerCase());
        const hasInd = kws.some(k => k.includes(filterIndustry.toLowerCase()));
        if (!hasInd) return false;
      }

      // 6. Region filter
      if (filterRegion !== 'All') {
        const locs = match.locations?.map(l => l.toLowerCase()) || [];
        const hasLoc = locs.some(l => l.includes(filterRegion.toLowerCase()));
        if (!hasLoc) return false;
      }

      return true;
    });
  };

  const filteredMatches = getFilteredMatches();

  // Group Matches by Tier for headers
  const strongMatches = filteredMatches.filter(m => m.match_tier === 'Strong');
  const moderateMatches = filteredMatches.filter(m => m.match_tier === 'Moderate');
  const weakMatches = filteredMatches.filter(m => m.match_tier === 'Weak');

  const activeMatchesCount = matches.length;
  const strongMatchesCount = matches.filter(m => m.match_tier === 'Strong').length;
  const moderateMatchesCount = matches.filter(m => m.match_tier === 'Moderate').length;
  const weakMatchesCount = matches.filter(m => m.match_tier === 'Weak').length;
  const shortlistedCount = starredDeals.size;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-slate-900 font-sans">
      {/* -------------------- 1. LEFT-MOST DARK SIDEBAR (DealRoom Mock) -------------------- */}
      <div
        className={clsx(
          "flex flex-col bg-[#0b1329] text-slate-300 transition-all duration-300 z-30 select-none border-r border-[#152347]",
          isSidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* DealRoom Title / Logo */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-[#152347]">
          {!isSidebarCollapsed && (
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                <TrendingUp className="text-white" size={16} />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">DealScape</span>
            </Link>
          )}
          {isSidebarCollapsed && (
            <div className="w-8 h-8 mx-auto bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-white" size={16} />
            </div>
          )}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Organization Info */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-[#152347] bg-[#070d1e]">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-200 shrink-0">
              {profile?.organization?.organization_name?.slice(0, 1) || 'B'}
            </div>
            {!isSidebarCollapsed && (
              <span className="text-xs font-semibold text-slate-300 truncate">
                {profile?.organization?.organization_name || 'Buyer Org'}
              </span>
            )}
          </div>
          {!isSidebarCollapsed && <ChevronDown size={12} className="text-slate-400" />}
        </div>

        {/* Main Nav Items */}
        <div className="flex-1 overflow-y-auto py-4 space-y-1">
          {[
            { label: 'Pipeline', icon: Layers, path: '/dashboard' },
            { label: 'Workspace', icon: Briefcase, active: true },
            { label: 'Buyer Profile', icon: Users, path: '/dashboard/buyer/profile' },
            { label: 'Manage Criteria', icon: Target, path: '/dashboard/buyer/criteria' },
            { label: 'Settings', icon: Settings },
            { label: 'Notifications', icon: Bell, badge: 3 }
          ].map((item, idx) => (
            <div key={idx}>
              {item.path ? (
                <Link
                  to={item.path}
                  className={clsx(
                    "flex items-center gap-3 px-4 py-2 text-sm font-medium transition-all hover:bg-slate-800 hover:text-white",
                    item.active ? "bg-slate-800 text-white font-bold border-l-4 border-blue-500" : "text-slate-400"
                  )}
                >
                  <item.icon size={18} className={clsx(item.active ? "text-blue-400" : "text-slate-400")} />
                  {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                  {!isSidebarCollapsed && item.badge && (
                    <span className="ml-auto bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ) : (
                <div
                  className={clsx(
                    "flex items-center gap-3 px-4 py-2 text-sm font-medium transition-all cursor-pointer hover:bg-slate-800 hover:text-white",
                    item.active ? "bg-slate-800 text-white font-bold border-l-4 border-blue-500" : "text-slate-400"
                  )}
                >
                  <item.icon size={18} className={clsx(item.active ? "text-blue-400" : "text-slate-400")} />
                  {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                  {!isSidebarCollapsed && item.badge && (
                    <span className="ml-auto bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}


        </div>

        {/* User Account / Log Out */}
        <div className="p-4 border-t border-[#152347] bg-[#070d1e] flex flex-col gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
              {profile?.full_name?.slice(0, 2).toUpperCase() || 'US'}
            </div>
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate leading-tight">
                  {profile?.full_name || 'User Profile'}
                </p>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">Buyer Administrator</p>
              </div>
            )}
          </div>
          {!isSidebarCollapsed && (
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs bg-slate-800 hover:bg-red-900/40 hover:text-red-400 border border-slate-700 rounded-lg transition-all"
            >
              <LogOut size={13} />
              Sign Out
            </button>
          )}
        </div>
      </div>

      {/* -------------------- 2. INNER WHITE SIDEBAR (Worklists Mock) -------------------- */}
      <div className="w-60 bg-[#f8fafc] border-r border-slate-200 flex flex-col h-full shrink-0 select-none">


        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {/* Smart Folders */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 mb-2">
              Pipeline Smart Folders
            </span>

            {[
              { label: 'All Matches', count: activeMatchesCount, bullet: 'bg-blue-500' },
              { label: 'Strong Fit', count: strongMatchesCount, bullet: 'bg-emerald-500' },
              { label: 'Moderate Fit', count: moderateMatchesCount, bullet: 'bg-amber-500' },
              { label: 'Weak Fit', count: weakMatchesCount, bullet: 'bg-slate-400' },
              { label: 'Watchlist', count: shortlistedCount, icon: Bookmark, iconColor: 'text-blue-500' }
            ].map((sf) => {
              const isSelected = activeSmartFilter === sf.label;
              return (
                <button
                  key={sf.label}
                  onClick={() => setActiveSmartFilter(sf.label)}
                  className={clsx(
                    "w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all",
                    isSelected
                      ? "bg-slate-200 text-slate-900 shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    {sf.bullet && <div className={clsx("w-2 h-2 rounded-full", sf.bullet)} />}
                    {sf.icon && <sf.icon size={13} className={sf.iconColor} />}
                    <span className="truncate">{sf.label}</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-200/50 px-1.5 py-0.5 rounded-full shrink-0">
                    {sf.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Criteria Sets Checklist */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Active Criteria Sets
              </span>
              <Link
                to="/onboarding/buyer"
                className="text-slate-400 hover:text-blue-600 transition-colors flex items-center justify-center p-0.5 rounded hover:bg-slate-200/50"
                title="New Criteria Set"
              >
                <Plus size={13} className="stroke-[3]" />
              </Link>
            </div>
            {criteriaList.map((crit, idx) => {
              const colorClass = COLORS[idx % COLORS.length];
              const isChecked = selectedCriteriaIds.has(crit.id);
              return (
                <div
                  key={crit.id}
                  onClick={() => {
                    setSelectedCriteriaIds(prev => {
                      const next = new Set(prev);
                      if (next.has(crit.id)) {
                        next.delete(crit.id);
                      } else {
                        next.add(crit.id);
                      }
                      return next;
                    });
                  }}
                  className={clsx(
                    "w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all hover:bg-slate-100 cursor-pointer",
                    isChecked ? "bg-slate-200 text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-800"
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      readOnly
                      className="rounded border-slate-355 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 shrink-0 cursor-pointer bg-white"
                    />
                    <div className={clsx("w-2 h-2 rounded shrink-0 shadow-sm", colorClass)} />
                    <span className="truncate select-none">{crit.investment_criteria_name || 'Untitled Set'}</span>
                  </div>

                  <div className="relative shrink-0 flex items-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setActiveCriteriaKebabId(activeCriteriaKebabId === crit.id ? null : crit.id)}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors flex items-center justify-center"
                      title="Options"
                    >
                      <MoreHorizontal size={13} />
                    </button>
                    
                    {activeCriteriaKebabId === crit.id && (
                      <div 
                        ref={dropdownRef}
                        className="absolute right-0 mt-1 w-32 bg-white border border-slate-200 shadow-xl rounded-lg py-1 z-40 animate-fade-in"
                      >
                        <button
                          onClick={() => {
                            navigate(`/onboarding/buyer/edit/${crit.id}`);
                            setActiveCriteriaKebabId(null);
                          }}
                          className="w-full px-3 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          Edit Criteria
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {criteriaList.length === 0 && (
              <div className="px-2 py-1 text-xs text-slate-400 italic">No criteria created</div>
            )}
          </div>
        </div>
      </div>

      {/* -------------------- MAIN WORKSPACE AREA -------------------- */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-white relative">
        {/* -------------------- 3. TOP TAB BAR & SUB BAR (Mocking DealRoom Top Headers) -------------------- */}
        <div className="border-b border-slate-200 bg-white select-none shrink-0 z-20 shadow-sm">
          {/* Main Top Header */}
          <div className="flex items-center justify-between px-6 h-16 border-b border-slate-100">
            {/* Left: Active Criteria Set Title */}
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center shadow-inner">
                <Target size={14} className="font-bold" />
              </div>
              <h2 className="text-md font-bold text-slate-800">
                {selectedCriteriaIds.size === 0
                  ? 'No Criteria Selected'
                  : selectedCriteriaIds.size === 1
                    ? (criteriaList.find(c => selectedCriteriaIds.has(c.id))?.investment_criteria_name || 'Criteria Set')
                    : `Combined Workspace (${selectedCriteriaIds.size} Criteria Sets)`}
              </h2>
            </div>

            {/* Center: DealRoom-style requests tab bar */}
            <div className="hidden lg:flex items-center gap-8 h-full">
              {[
                { label: 'Requests', active: activeTab === 'Requests' },
                { label: 'Findings', active: activeTab === 'Findings' },
                { label: 'Data Room', active: activeTab === 'Data Room' },
                { label: 'Permissions', active: activeTab === 'Permissions' },
                { label: 'Synergies', active: activeTab === 'Synergies' },
                { label: 'Settings', active: activeTab === 'Settings' }
              ].map((tab) => (
                <button
                  key={tab.label}
                  onClick={() => setActiveTab(tab.label)}
                  className={clsx(
                    "h-16 relative text-xs font-semibold px-2 border-b-2 transition-all duration-200",
                    tab.active ? "border-blue-500 text-blue-600 font-bold" : "border-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Right details */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                <Lock size={10} className="text-emerald-500" />
                SECURE END-TO-END M&A
              </span>
            </div>
          </div>

          {/* Sub-tabs header (Overview & Timeline) */}
          <div className="flex items-center gap-6 px-6 h-10 border-b border-slate-100 bg-[#fbfcfd]">
            {['Overview', 'Timeline'].map((st) => (
              <button
                key={st}
                onClick={() => setActiveSubTab(st)}
                className={clsx(
                  "h-10 text-xs font-semibold relative px-1 border-b-2 transition-all",
                  activeSubTab === st ? "border-blue-500 text-blue-600 font-bold" : "border-transparent text-slate-400 hover:text-slate-600"
                )}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* -------------------- 4. SEARCH & FILTER TOOLBAR (DealRoom Mock) -------------------- */}
        <div className="p-3 border-b border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3 select-none shrink-0 z-10">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative w-64 shadow-sm rounded-lg overflow-hidden border border-slate-200 bg-white focus-within:border-blue-500 transition-colors">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent pl-9 pr-3 py-2 text-xs outline-none text-slate-800 placeholder-slate-400"
              />
            </div>

            {/* Dropdown filters (clicking opens custom flyouts) */}
            <div className="flex items-center gap-1.5 relative" ref={dropdownRef}>
              {/* Revenue range */}
              <div className="relative">
                <button
                  onClick={() => setActiveDropdown(activeDropdown === 'revenue' ? null : 'revenue')}
                  className={clsx(
                    "flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-all shadow-sm",
                    filterRevenue > 0 ? "border-blue-500 bg-blue-50/30 text-blue-600 font-bold" : "text-slate-600"
                  )}
                >
                  <span>Rev: {filterRevenue > 0 ? `${formatCurrency(filterRevenue)}+` : 'Min Revenue'}</span>
                  <ChevronDown size={10} className="text-slate-400" />
                </button>
                {activeDropdown === 'revenue' && (
                  <div className="absolute left-0 mt-1 w-44 bg-white border border-slate-200 shadow-xl rounded-lg py-1.5 z-40 animate-fade-in">
                    {[0, 1000000, 5000000, 10000000, 25000000].map((val) => (
                      <button
                        key={val}
                        onClick={() => {
                          setFilterRevenue(val);
                          setActiveDropdown(null);
                        }}
                        className="w-full px-4 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                      >
                        {val === 0 ? 'Any Revenue' : `${formatCurrency(val)}+`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* EBITDA range */}
              <div className="relative">
                <button
                  onClick={() => setActiveDropdown(activeDropdown === 'ebitda' ? null : 'ebitda')}
                  className={clsx(
                    "flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-all shadow-sm",
                    filterEbitda > 0 ? "border-blue-500 bg-blue-50/30 text-blue-600 font-bold" : "text-slate-600"
                  )}
                >
                  <span>EBITDA: {filterEbitda > 0 ? `${formatCurrency(filterEbitda)}+` : 'Min EBITDA'}</span>
                  <ChevronDown size={10} className="text-slate-400" />
                </button>
                {activeDropdown === 'ebitda' && (
                  <div className="absolute left-0 mt-1 w-44 bg-white border border-slate-200 shadow-xl rounded-lg py-1.5 z-40 animate-fade-in">
                    {[0, 250000, 500000, 1000000, 5000000].map((val) => (
                      <button
                        key={val}
                        onClick={() => {
                          setFilterEbitda(val);
                          setActiveDropdown(null);
                        }}
                        className="w-full px-4 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                      >
                        {val === 0 ? 'Any EBITDA' : `${formatCurrency(val)}+`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Reset filter */}
              {(searchQuery || filterRevenue > 0 || filterEbitda > 0 || filterIndustry !== 'All' || filterRegion !== 'All' || activeSmartFilter !== 'All Matches') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterRevenue(0);
                    setFilterEbitda(0);
                    setFilterIndustry('All');
                    setFilterRegion('All');
                    setActiveSmartFilter('All Matches');
                  }}
                  className="px-2.5 py-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 font-bold rounded-lg transition-colors border border-transparent hover:border-red-200"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* New request styled CTA Button in blue */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/onboarding/buyer')}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 border border-blue-700 rounded-lg shadow-sm shadow-blue-500/10 transition-all leading-none"
            >
              <Plus size={14} /> New Criteria Set
            </button>
          </div>
        </div>

        {/* -------------------- 5. DENSE ROW TABLE GRID VIEW (Grouped Section Headers) -------------------- */}
        <div className="flex-1 overflow-auto bg-white">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-400 select-none">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                className="w-8 h-8 border-2 border-slate-300 border-t-blue-500 rounded-full"
              />
              <span className="text-xs font-semibold">Running matching engine for workspace...</span>
            </div>
          ) : filteredMatches.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center select-none max-w-lg mx-auto">
              <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 mb-4 shadow-sm">
                <Search size={22} />
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-1">No matches found in active workspace</h4>
              <p className="text-xs text-slate-500 mb-6">
                Try widening your filtering parameters, changing the focus folders on the left sidebar, or editing your core Criteria specifications.
              </p>
              <button
                onClick={() => {
                  const firstId = Array.from(selectedCriteriaIds)[0];
                  if (firstId) navigate(`/onboarding/buyer/edit/${firstId}`);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-900 rounded-lg transition-colors shadow-sm"
              >
                Edit Active Criteria
              </button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse select-none">
              <thead className="bg-[#fafbfd] border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                <tr className="text-[10px] font-bold text-slate-400 tracking-wider h-9">
                  <th className="w-10 text-center pl-2">
                    <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" readOnly />
                  </th>
                  <th className="w-10 text-center">ID</th>
                  <th className="pl-4 min-w-[200px]">TARGET NAME & SUMMARY</th>
                  <th className="w-20 text-center">SCORE</th>
                  <th className="w-24 text-right">REVENUE</th>
                  <th className="w-24 text-right">EBITDA</th>
                  <th className="w-20 text-right">MARGIN</th>
                  <th className="w-28 pl-4">LOCATIONS</th>
                  <th className="w-32 pl-4">ASSIGNEES</th>
                  <th className="w-28 pl-4">STATUS</th>
                  <th className="w-12 text-center"></th>
                </tr>
              </thead>
              <tbody>
                {/* 1. STRONG MATCHES HEADER BLOCK */}
                {strongMatches.length > 0 && (
                  <>
                    <tr className="bg-slate-100 border-y border-slate-200/80 text-[10px] font-bold text-slate-500 h-8">
                      <td colSpan={11} className="pl-4">
                        ★ STRONG MATCHES ({strongMatches.length}) — Highly aligned semantic & financial fit
                      </td>
                    </tr>
                    {strongMatches.map((match, idx) => (
                      <MatchRow
                        key={match.listing_id}
                        match={match}
                        index={idx + 1}
                        starred={starredDeals.has(match.listing_id)}
                        pinned={pinnedDeals.has(match.listing_id)}
                        status={dealStatuses[match.listing_id] || 'New'}
                        onStar={toggleStar}
                        onPin={togglePin}
                        onRowClick={(m) => {
                          setSelectedMatch(m);
                          setIsDrawerOpen(true);
                        }}
                      />
                    ))}
                  </>
                )}

                {/* 2. MODERATE MATCHES HEADER BLOCK */}
                {moderateMatches.length > 0 && (
                  <>
                    <tr className="bg-slate-100 border-y border-slate-200/80 text-[10px] font-bold text-slate-500 h-8">
                      <td colSpan={11} className="pl-4">
                        ⚡ MODERATE MATCHES ({moderateMatches.length}) — High overlap with core parameters
                      </td>
                    </tr>
                    {moderateMatches.map((match, idx) => (
                      <MatchRow
                        key={match.listing_id}
                        match={match}
                        index={strongMatches.length + idx + 1}
                        starred={starredDeals.has(match.listing_id)}
                        pinned={pinnedDeals.has(match.listing_id)}
                        status={dealStatuses[match.listing_id] || 'New'}
                        onStar={toggleStar}
                        onPin={togglePin}
                        onRowClick={(m) => {
                          setSelectedMatch(m);
                          setIsDrawerOpen(true);
                        }}
                      />
                    ))}
                  </>
                )}

                {/* 3. WEAK MATCHES HEADER BLOCK */}
                {weakMatches.length > 0 && (
                  <>
                    <tr className="bg-slate-100 border-y border-slate-200/80 text-[10px] font-bold text-slate-500 h-8">
                      <td colSpan={11} className="pl-4">
                        ☕ WEAK MATCHES ({weakMatches.length}) — Secondary fitting and lower scores
                      </td>
                    </tr>
                    {weakMatches.map((match, idx) => (
                      <MatchRow
                        key={match.listing_id}
                        match={match}
                        index={strongMatches.length + moderateMatches.length + idx + 1}
                        starred={starredDeals.has(match.listing_id)}
                        pinned={pinnedDeals.has(match.listing_id)}
                        status={dealStatuses[match.listing_id] || 'New'}
                        onStar={toggleStar}
                        onPin={togglePin}
                        onRowClick={(m) => {
                          setSelectedMatch(m);
                          setIsDrawerOpen(true);
                        }}
                      />
                    ))}
                  </>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* -------------------- 6. SLIDE-OUT DETAILS DRAWER (DealRoom Mock Request Panel) -------------------- */}
      <AnimatePresence>
        {isDrawerOpen && selectedMatch && (
          <>
            {/* Overlay backdrop */}
            <div
              className="absolute inset-0 bg-slate-900/10 backdrop-blur-xs z-30 transition-all duration-300"
              onClick={() => setIsDrawerOpen(false)}
            />
            {/* Sliding Drawer container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="absolute right-0 top-0 h-full w-[540px] bg-white border-l border-slate-200 shadow-2xl z-40 flex flex-col select-none"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-1 rounded hover:bg-slate-200 text-slate-500 transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-200 px-2 py-0.5 rounded">
                    Match Details
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleStar(selectedMatch.listing_id)}
                    className="p-1 rounded hover:bg-slate-200 transition-all"
                  >
                    <Bookmark
                      size={14}
                      className={starredDeals.has(selectedMatch.listing_id) ? "text-blue-500 fill-blue-500" : "text-slate-400"}
                    />
                  </button>
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-1 rounded hover:bg-slate-200 text-slate-500 font-bold"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Listing Overview Title & Header Detail */}
              <div className="p-6 border-b border-slate-100 bg-white">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-800 tracking-tight leading-snug">
                      {selectedMatch.seller_anon_name || 'Untitled Listing Target'}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Founded: {selectedMatch.year_founded || '--'} • Employees: {selectedMatch.employees_count || '--'} • Entity: {selectedMatch.legal_entity || 'Private'}
                    </p>
                    {selectedMatch.matchedCriteriaList && selectedMatch.matchedCriteriaList.length > 0 && (() => {
                      const strongs = selectedMatch.matchedCriteriaList
                        .filter(item => item.matchTier === 'Strong')
                        .sort((a, b) => b.totalScore - a.totalScore);
                      const mediums = selectedMatch.matchedCriteriaList
                        .filter(item => item.matchTier === 'Moderate')
                        .sort((a, b) => b.totalScore - a.totalScore);
                      
                      return (
                        <div className="space-y-1.5 mt-2.5 select-none">
                          {strongs.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 items-center">
                              <span className="text-[9px] text-emerald-600 font-black tracking-wider uppercase mr-1">★ Strong Fits:</span>
                              {strongs.map((item, i) => (
                                <span key={i} className="text-[9px] font-black px-2 py-0.5 bg-[#e6f4ea] border border-[#0f9d58]/10 text-[#0f9d58] rounded shadow-xs">
                                  {Math.round(item.totalScore)} {item.criteriaName}
                                </span>
                              ))}
                            </div>
                          )}
                          {mediums.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 items-center">
                              <span className="text-[9px] text-amber-600 font-black tracking-wider uppercase mr-1">⚡ Medium Fits:</span>
                              {mediums.map((item, i) => (
                                <span key={i} className="text-[9px] font-black px-2 py-0.5 bg-[#fffbeb] border border-[#fef3c7] text-[#d97706] rounded shadow-xs">
                                  {Math.round(item.totalScore)} {item.criteriaName}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="flex flex-col items-center justify-center shrink-0">
                    <span className="text-[20px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-xl border border-blue-100 shadow-sm leading-none">
                      {Math.round(selectedMatch.total_score)}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Fit Score</span>
                  </div>
                </div>

                {/* Deal State Control Dropdown */}
                <div className="flex items-center gap-3 py-3 border-t border-slate-100 mt-4">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Deal Stage:</span>
                  <div className="relative">
                    <select
                      value={dealStatuses[selectedMatch.listing_id] || 'New'}
                      onChange={(e) => handleStatusChange(selectedMatch.listing_id, e.target.value)}
                      className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-sm"
                    >
                      {['New', 'Active Fit', 'NDA Requested', 'NDA Signed', 'Due Diligence', 'Passed'].map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Drawer Tabs */}
              <div className="flex border-b border-slate-200 bg-slate-50 px-4">
                {[
                  { id: 'details', label: 'Overview' },
                  { id: 'scores', label: 'Matching Logic' },
                  { id: 'docs', label: 'Data Room & CIM' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setDrawerTab(t.id)}
                    className={clsx(
                      "px-4 py-2.5 text-xs font-bold border-b-2 transition-all duration-200",
                      drawerTab === t.id ? "border-blue-500 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Drawer Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-white space-y-6">
                {drawerTab === 'details' && (
                  <>
                    {/* Summary */}
                    <div className="space-y-2">
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Executive Teaser</h4>
                      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200/50">
                        {selectedMatch.summary || 'No teaser description available.'}
                      </p>
                    </div>

                    {/* Financial snapshot grid */}
                    <div className="space-y-3">
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Financial Snapshot</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'Revenue', value: formatCurrency(selectedMatch.search_revenue) },
                          { label: 'EBITDA', value: formatCurrency(selectedMatch.search_ebitda) },
                          { label: 'EBITDA Margin', value: formatPercentage(selectedMatch.search_ebitda_margin) },
                          { label: 'YoY Growth', value: formatPercentage(selectedMatch.search_revenue_growth_yoy) }
                        ].map((m) => (
                          <div key={m.label} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                            <span className="text-xs text-slate-500">{m.label}</span>
                            <span className="text-xs font-bold text-slate-800">{m.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Strategic Tags */}
                    <div className="space-y-3">
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Strategic Profile Keywords</h4>
                      <div className="flex flex-wrap gap-1.5 p-4 bg-[#fbfcfd] border border-slate-150 rounded-xl">
                        {parseKeywords(selectedMatch.keywords).map((kw, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 border border-slate-200 text-slate-600 uppercase tracking-wider shadow-sm"
                          >
                            {kw}
                          </span>
                        ))}
                        {parseKeywords(selectedMatch.keywords).length === 0 && (
                          <span className="text-xs text-slate-400 italic">No keywords generated</span>
                        )}
                      </div>
                    </div>

                    {/* Ownership & structure details */}
                    <div className="space-y-3">
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ownership Structure</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedMatch.is_founder_owned && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-600 rounded-full">Founder Owned</span>
                        )}
                        {selectedMatch.is_female_owned && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-600 rounded-full">Female Owned</span>
                        )}
                        {selectedMatch.is_minority_owned && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-600 rounded-full">Minority Owned</span>
                        )}
                        {selectedMatch.is_family_owned && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-600 rounded-full">Family Owned</span>
                        )}
                        {selectedMatch.is_operator_owned && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-600 rounded-full">Operator Led</span>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {drawerTab === 'scores' && (() => {
                  const activeCriteriaMatch = (selectedMatch.matchedCriteriaList || []).find(
                    item => item.criteriaId === activeLogicCriteriaId
                  ) || {
                    totalScore: selectedMatch.total_score,
                    financialScore: selectedMatch.financial_score || 0,
                    geographyScore: selectedMatch.geography_score || 0,
                    industryScore: selectedMatch.industry_score,
                    semanticScore: selectedMatch.semantic_score || 0,
                    bonusScore: selectedMatch.bonus_score || 0,
                    bonusReasons: selectedMatch.bonus_reasons || [],
                    matchTier: selectedMatch.match_tier
                  };

                  return (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Workspace Match Breakdown</h4>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {activeCriteriaMatch.matchTier || selectedMatch.match_tier} Fit
                        </span>
                      </div>

                      {/* Dropdown selector for matched criteria */}
                      {selectedMatch.matchedCriteriaList && selectedMatch.matchedCriteriaList.length > 1 && (
                        <div className="space-y-1.5 p-3.5 bg-slate-50 border border-slate-200/65 rounded-2xl">
                          <label className="text-[9px] font-extrabold text-slate-450 uppercase tracking-wider block leading-none mb-1">
                            Inspect Criteria Fit Details
                          </label>
                          <select
                            value={activeLogicCriteriaId}
                            onChange={(e) => setActiveLogicCriteriaId(e.target.value)}
                            className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-xs"
                          >
                            {[...selectedMatch.matchedCriteriaList]
                              .sort((a, b) => b.totalScore - a.totalScore)
                              .map((item) => (
                                <option key={item.criteriaId} value={item.criteriaId}>
                                  {item.criteriaName} ({Math.round(item.totalScore)} pts - {item.matchTier})
                                </option>
                              ))}
                          </select>
                        </div>
                      )}

                      <div className="space-y-4 p-4 bg-slate-50/80 rounded-2xl border border-slate-200/50">
                        {[
                          { label: 'Industry overlap Score', score: activeCriteriaMatch.industryScore, desc: 'Alignment with standard NAICS descriptors', color: 'bg-[#ff9500]' },
                          { label: 'Semantic/Strategic Fit', score: activeCriteriaMatch.semanticScore, desc: 'AI keyword semantic context mapping', color: 'bg-purple-500' },
                          { label: 'Financial Fit Score', score: activeCriteriaMatch.financialScore, desc: 'EBITDA, Revenue matching thresholds', color: 'bg-emerald-500' },
                          { label: 'Geography Fit Score', score: activeCriteriaMatch.geographyScore, desc: 'Match of regional boundaries', color: 'bg-blue-500' }
                        ].map((item) => (
                          <div key={item.label} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-xs font-bold text-slate-700 block">{item.label}</span>
                                <span className="text-[10px] text-slate-400 mt-0.5 block leading-none">{item.desc}</span>
                              </div>
                              <span className="text-xs font-black text-slate-800 bg-white px-2 py-0.5 rounded shadow-sm border border-slate-200">
                                {Math.round(item.score || 0)}%
                              </span>
                            </div>
                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                              <div
                                className={clsx("h-full rounded-full transition-all duration-500", item.color)}
                                style={{ width: `${Math.min(100, Math.max(0, item.score || 0))}%` }}
                              />
                            </div>
                          </div>
                        ))}

                        <div className="mt-4 pt-3.5 border-t border-slate-200/60 flex items-center justify-between select-none">
                          <span className="text-xs font-extrabold text-slate-700">Total Score for this Criteria</span>
                          <span className="text-xs font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 shadow-sm leading-none">
                            {Math.round(activeCriteriaMatch.totalScore || 0)} pts
                          </span>
                        </div>
                      </div>

                      {activeCriteriaMatch.bonusScore > 0 && (
                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                          <span className="text-xs font-bold text-amber-800 block flex items-center gap-1.5">
                            <Sparkles size={14} className="text-amber-500 fill-amber-500" />
                            Bonus Score Multipliers (+{activeCriteriaMatch.bonusScore} pts)
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {activeCriteriaMatch.bonusReasons?.map((reason, ri) => (
                              <span key={ri} className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-100 border border-amber-200 text-amber-700 rounded uppercase tracking-wider leading-none">
                                {reason}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {drawerTab === 'docs' && (
                  <div className="space-y-6">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Documents Secure Room</h4>

                    <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50 space-y-4">
                      {/* Teaser Document */}
                      <div className="flex items-center justify-between p-3 bg-white border border-slate-150 rounded-xl shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 border border-slate-200 shrink-0">
                            <Paperclip size={16} />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">Executive Teaser.pdf</span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">380 KB • Public Attachment</span>
                          </div>
                        </div>
                        {selectedMatch.teaser_url ? (
                          <button
                            onClick={async () => {
                              try {
                                const signedUrl = await sellerListingService.getSignedUrl(selectedMatch.teaser_url);
                                window.open(signedUrl, '_blank');
                              } catch (err) {
                                alert('Error fetching teaser document.');
                              }
                            }}
                            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition-colors shadow-sm"
                            title="Download Teaser"
                          >
                            <Download size={14} />
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No Document</span>
                        )}
                      </div>

                      {/* CIM Document */}
                      <div className="flex items-center justify-between p-3 bg-white border border-slate-150 rounded-xl shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center text-blue-500 border border-blue-100 shrink-0">
                            <Lock size={16} />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">Confidential Information Memorandum (CIM).pdf</span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">4.8 MB • Restricted Secure Access</span>
                          </div>
                        </div>
                        {requestedCIMs.has(selectedMatch.listing_id) ? (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100 flex items-center gap-1">
                            <motion.span
                              animate={{ scale: [1, 1.15, 1] }}
                              transition={{ repeat: Infinity, duration: 1.2 }}
                              className="w-1.5 h-1.5 rounded-full bg-amber-500"
                            />
                            REQUEST PENDING
                          </span>
                        ) : (
                          <button
                            onClick={() => requestCIM(selectedMatch.listing_id)}
                            className="px-3 py-1.5 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-500/10 transition-colors"
                          >
                            REQUEST ACCESS
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-2">
                      <span className="text-xs font-bold text-blue-800 block flex items-center gap-1.5">
                        <Lock size={13} className="text-blue-500" />
                        Confidentiality Guarantee
                      </span>
                      <p className="text-[11px] text-blue-700/80 leading-relaxed">
                        CIM access requires an active, system-approved NDA signed between both organizations. Once requested, the seller organization will be automatically notified to complete verification.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Drawer Footer CTA Actions */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center gap-3">
                <Link
                  to={`/dashboard/buyer/criteria/${selectedMatch?.criteria_id || Array.from(selectedCriteriaIds)[0]}/matches/${selectedMatch.listing_id}`}
                  state={{ match: selectedMatch }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 border border-blue-700 rounded-xl shadow-sm transition-all"
                >
                  <ExternalLink size={14} /> Open Full View
                </Link>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="py-2.5 px-4 text-xs font-bold text-slate-700 hover:bg-slate-200 border border-slate-300 rounded-xl bg-white transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed top-6 right-6 z-50 bg-[#0b1329] text-white px-5 py-3 rounded-xl border border-[#152347] shadow-2xl flex items-center gap-2.5 max-w-sm select-none"
          >
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
            <span className="text-xs font-bold font-sans tracking-tight">{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// -------------------- DENSE COMPACT TABLE ROW COMPONENT --------------------
function MatchRow({ match, index, starred, pinned, status, onStar, onPin, onRowClick }) {
  const formatCurrency = (val) => {
    if (!val && val !== 0) return '--';
    if (Math.abs(val) >= 1e9) return '$' + (val / 1e9).toFixed(1) + 'B';
    if (Math.abs(val) >= 1e6) return '$' + (val / 1e6).toFixed(1) + 'M';
    if (Math.abs(val) >= 1e3) return '$' + (val / 1e3).toFixed(0) + 'K';
    return '$' + Number(val).toLocaleString('en-US');
  };

  const formatPercentage = (val) => {
    if (!val && val !== 0) return '--';
    return (val * 100).toFixed(0) + '%';
  };

  // Status DOT styles matching the DealRoom mockup
  const getStatusBullet = (st) => {
    switch (st) {
      case 'Due Diligence':
        return { bg: 'bg-blue-500', text: 'text-blue-600', label: 'Due Diligence' };
      case 'NDA Signed':
        return { bg: 'bg-purple-500', text: 'text-purple-600', label: 'NDA Signed' };
      case 'NDA Requested':
        return { bg: 'bg-amber-500', text: 'text-amber-600', label: 'NDA Requested' };
      case 'Active Fit':
        return { bg: 'bg-emerald-500', text: 'text-emerald-600', label: 'Active Fit' };
      case 'Passed':
        return { bg: 'bg-red-500', text: 'text-red-600', label: 'Passed' };
      default:
        return { bg: 'bg-slate-400', text: 'text-slate-500', label: 'New Fit' };
    }
  };

  const sb = getStatusBullet(status);

  // Overlapping avatar stacks with different matching backgrounds
  const assignees = [
    { name: 'John Doe', bg: 'bg-teal-500', init: 'JD' },
    { name: 'Alice Smith', bg: 'bg-purple-500', init: 'AS' },
    { name: 'Kev Stone', bg: 'bg-amber-500', init: 'KS' },
    { name: 'Dave Fields', bg: 'bg-blue-500', init: 'DF' }
  ];

  // Pick unique subset based on index to mock different deals
  const pickAssignees = () => {
    if (index % 3 === 0) return assignees.slice(0, 3);
    if (index % 2 === 0) return assignees.slice(1, 4);
    return assignees.slice(0, 2);
  };

  const currentAssignees = pickAssignees();

  // Score Pill generator matching screenshot and list colors
  const getScorePill = (score) => {
    let bgClass = 'bg-[#f1f5f9] text-[#64748b] border border-[#e2e8f0]';
    if (score >= 85) {
      bgClass = 'bg-[#e6f4ea] text-[#0f9d58] border border-[#0f9d58]/10'; // emerald/green
    } else if (score >= 70) {
      bgClass = 'bg-[#fffbeb] text-[#d97706] border border-[#fef3c7]'; // amber
    }
    return (
      <span className={clsx(
        "inline-flex items-center justify-center px-3.5 py-1.5 rounded-full text-xs font-black tracking-tight leading-none shadow-sm select-none border",
        bgClass
      )}>
        {Math.round(score)}
      </span>
    );
  };

  const locationLabel = match.locations?.length > 0
    ? match.locations[0].split(':').pop()
    : 'Global';

  return (
    <tr
      className="border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer h-10 transition-colors"
      onClick={() => onRowClick(match)}
    >
      {/* Checkbox column */}
      <td className="w-10 text-center pl-2" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          readOnly
        />
      </td>

      {/* ID column */}
      <td className="w-10 text-center text-xs font-semibold text-slate-400">
        {index}
      </td>

      {/* Title & info description column */}
      <td className="pl-4 min-w-[200px]">
        <div className="flex items-center gap-2">
          {/* Star deal */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStar(match.listing_id);
            }}
            className="text-slate-400 hover:text-blue-500 transition-colors flex items-center justify-center"
            title="Save to Watchlist"
          >
            <Bookmark size={15} className={starred ? "text-blue-500 fill-blue-500" : "text-slate-400"} />
          </button>
          <span className="text-xs font-bold text-slate-800 truncate block max-w-[280px]">
            {match.seller_anon_name || 'Untitled Project Target'}
          </span>
        </div>
      </td>

      {/* Score column */}
      <td className="w-20 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-center">
          {getScorePill(match.total_score)}
        </div>
      </td>

      {/* Financials - Revenue */}
      <td className="w-24 text-right text-xs font-bold text-slate-800">
        {formatCurrency(match.search_revenue)}
      </td>

      {/* Financials - EBITDA */}
      <td className="w-24 text-right text-xs font-bold text-slate-800">
        {formatCurrency(match.search_ebitda)}
      </td>

      {/* Financials - EBITDA Margin */}
      <td className="w-20 text-right text-xs font-bold text-slate-500">
        {formatPercentage(match.search_ebitda_margin)}
      </td>

      {/* Geography Locations */}
      <td className="w-28 pl-4">
        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded shadow-inner">
          <MapPin size={9} className="inline mr-1 text-blue-500 shrink-0" />
          {locationLabel}
        </span>
      </td>

      {/* Overlapping Avatar Stacks */}
      <td className="w-32 pl-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center -space-x-1.5 overflow-hidden">
          {currentAssignees.map((as, ai) => (
            <div
              key={ai}
              className={clsx(
                "w-5 h-5 rounded-full border border-white text-[9px] font-black text-white flex items-center justify-center shadow-sm shrink-0",
                as.bg
              )}
              title={as.name}
            >
              {as.init}
            </div>
          ))}
          {match.locations?.length > 1 && (
            <span className="text-[9px] text-slate-400 font-bold ml-2">+{match.locations.length - 1}</span>
          )}
        </div>
      </td>

      {/* Status Dot with Text */}
      <td className="w-28 pl-4">
        <div className="flex items-center gap-1.5">
          <div className={clsx("w-2 h-2 rounded-full shadow-sm shrink-0", sb.bg)} />
          <span className={clsx("text-[10px] font-bold truncate", sb.text)}>{sb.label}</span>
        </div>
      </td>

      {/* Reply details or warnings */}
      <td className="w-12 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-center gap-2 text-slate-300">
          <button className="hover:text-slate-600 transition-colors">
            <Paperclip size={12} />
          </button>
          <button className="hover:text-slate-600 transition-colors relative">
            <MessageSquare size={12} />
            <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-blue-500 rounded-full" />
          </button>
        </div>
      </td>
    </tr>
  );
}
