import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sellerListingService } from '../services/sellerListingService';
import { supabase } from '../lib/supabase';
import { Briefcase, TrendingUp, DollarSign, PlusCircle, ArrowLeft, Loader2, Search, FileText, Archive, CheckCircle2 } from 'lucide-react';

export default function SellerListings({ orgId, isCorporate }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('Active'); // 'Active', 'Draft', 'Archived'
  const navigate = useNavigate();

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate('/');
          return;
        }

        const data = await sellerListingService.getListings(orgId, isCorporate);
        setListings(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, [navigate, orgId, isCorporate]);

  const filteredListings = useMemo(() => {
    if (activeTab === 'Active') {
      return listings.filter(l => l.status === 'Active' || l.status === 'Under Offer');
    } else if (activeTab === 'Draft') {
      return listings.filter(l => l.status === 'Draft');
    } else if (activeTab === 'Closed') {
      return listings.filter(l => l.status === 'Closed');
    } else {
      return listings.filter(l => l.status === 'Withdrawn');
    }
  }, [listings, activeTab]);

  const formatCurrency = (val) => {
    if (!val && val !== 0) return '--';
    return '$' + Number(val).toLocaleString('en-US');
  };

  const getLatestFinancial = (history, field) => {
    if (!history) return '--';
    if (history['LTM'] && history['LTM'][field]) return formatCurrency(history['LTM'][field]);
    if (history['FY0'] && history['FY0'][field]) return formatCurrency(history['FY0'][field]);
    if (history['FY-1'] && history['FY-1'][field]) return formatCurrency(history['FY-1'][field]);
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
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 animate-fade-in relative">
      <div className="absolute top-0 left-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-6xl mx-auto py-12">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-500/10 rounded-xl mb-4">
              <Briefcase className="text-indigo-400" size={24} />
            </div>
            <h1 className="text-4xl font-black tracking-tight mb-2">My Listings</h1>
            <p className="text-slate-400">View and manage all your created seller listings.</p>
          </div>
          <Link to="/onboarding/seller" className="btn-primary flex items-center gap-2 px-6 py-3 shrink-0">
            <PlusCircle size={18} /> New Listing
          </Link>
        </div>

        {/* Status Tabs */}
        <div className="flex flex-wrap gap-4 mb-8 p-1 bg-slate-900/50 rounded-2xl border border-slate-800 w-fit">
          {[
            { id: 'Active', icon: TrendingUp, label: 'Active & Offers' },
            { id: 'Draft', icon: FileText, label: 'Drafts' },
            { id: 'Closed', icon: CheckCircle2, label: 'Closed' },
            { id: 'Withdrawn', icon: Archive, label: 'Withdrawn' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                activeTab === tab.id 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.id ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500'
              }`}>
                {tab.id === 'Active' ? listings.filter(l => l.status === 'Active' || l.status === 'Under Offer').length :
                 tab.id === 'Draft' ? listings.filter(l => l.status === 'Draft').length :
                 tab.id === 'Closed' ? listings.filter(l => l.status === 'Closed').length :
                 listings.filter(l => l.status === 'Withdrawn').length}
              </span>
            </button>
          ))}
        </div>

        {error && (
          <div className="p-4 mb-8 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {filteredListings.length === 0 ? (
          <div className="glass p-12 rounded-3xl border border-slate-800 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-800/50 rounded-2xl mb-6 flex items-center justify-center">
              <Search className="text-slate-500" size={40} />
            </div>
            <h3 className="text-xl font-bold mb-2">No {activeTab.toLowerCase()} listings found</h3>
            <p className="text-slate-400 mb-6">You don't have any listings in this category.</p>
            {activeTab === 'Active' && (
              <Link to="/onboarding/seller" className="btn-primary flex items-center gap-2 py-3 px-8">
                Get Started <ArrowLeft className="rotate-180" size={18} />
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {filteredListings.map((listing) => (
              <div key={listing.id} className="glass p-8 rounded-3xl border border-slate-800 hover:border-indigo-500/50 transition-all duration-300 relative group">
                {listing.status !== 'Active' && (
                  <div className="absolute top-8 right-8 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs font-bold uppercase tracking-wider">
                    {listing.status}
                  </div>
                )}
                
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
                    <Link 
                      to={listing.status === 'Draft' ? `/onboarding/seller/edit/${listing.id}` : `/dashboard/seller/listings/${listing.id}`}
                      className="text-indigo-400 hover:text-indigo-300 hover:underline transition-all"
                    >
                      {listing.seller_anon_name || 'Untitled Listing'}
                    </Link>
                  </h3>
                </div>
                
                {/* Headings row */}
                <div style={{ display: 'flex', flexDirection: 'row', width: '100%', marginBottom: '0.5rem' }}>
                  <div style={{ flex: 1, textAlign: 'center', fontSize: '0.875rem', fontWeight: 500, color: '#e2e8f0' }}>Legal Entity</div>
                  <div style={{ flex: 1, textAlign: 'center', fontSize: '0.875rem', fontWeight: 500, color: '#e2e8f0' }}>Keywords</div>
                  <div style={{ flex: 1, textAlign: 'center', fontSize: '0.875rem', fontWeight: 500, color: '#e2e8f0' }}>Revenue</div>
                  <div style={{ flex: 1, textAlign: 'center', fontSize: '0.875rem', fontWeight: 500, color: '#e2e8f0' }}>EBITDA</div>
                </div>

                {/* Values row */}
                <div style={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
                  <div style={{ flex: 1, textAlign: 'center', color: '#818cf8', fontWeight: 500, fontSize: '1.05rem' }}>
                    {listing.legal_entity || listing.seller_name || '--'}
                  </div>
                  <div style={{ flex: 1, textAlign: 'center', color: '#818cf8', fontWeight: 500, fontSize: '0.95rem', whiteSpace: 'pre-line', lineHeight: '1.4' }}>
                    {getDisplayKeywords(listing.keywords)}
                  </div>
                  <div style={{ flex: 1, textAlign: 'center', color: '#818cf8', fontWeight: 500, fontSize: '1.05rem' }}>
                    {getLatestFinancial(listing.financial_history, 'revenue')}
                  </div>
                  <div style={{ flex: 1, textAlign: 'center', color: '#818cf8', fontWeight: 500, fontSize: '1.05rem' }}>
                    {getLatestFinancial(listing.financial_history, 'ebitda')}
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
