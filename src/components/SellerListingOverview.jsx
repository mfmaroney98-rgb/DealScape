import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { sellerListingService } from '../services/sellerListingService';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Loader2, Edit3, EyeOff, XCircle, Trash2, Users, FileText, CheckCircle2 } from 'lucide-react';

export default function SellerListingOverview({ orgId, isCorporate }) {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, buyers, preview

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate('/');
          return;
        }

        const data = await sellerListingService.getListingById(id, orgId, isCorporate);
        setListing(data);
      } catch (err) {
        console.error("Error fetching listing:", err);
        setError(err.message || 'Failed to load listing details.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchListing();
    }
  }, [id, navigate]);

  const formatCurrency = (val) => {
    if (!val && val !== 0) return '--';
    return '$' + Number(val).toLocaleString('en-US');
  };

  const getLatestFinancial = (history, field) => {
    if (!history) return '--';
    if (history['LTM'] && history['LTM'][field] !== null) return formatCurrency(history['LTM'][field]);
    if (history['2025'] && history['2025'][field] !== null) return formatCurrency(history['2025'][field]);
    if (history['2024'] && history['2024'][field] !== null) return formatCurrency(history['2024'][field]);
    if (history['2023'] && history['2023'][field] !== null) return formatCurrency(history['2023'][field]);
    return '--';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen p-6 animate-fade-in">
        <div className="max-w-6xl mx-auto py-12">
          <Link to="/dashboard/seller/listings" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8">
            <ArrowLeft size={16} /> Back to Listings
          </Link>
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error || 'Listing not found.'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 animate-fade-in relative">
      <div className="absolute top-0 left-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto py-12">
        <div className="flex items-center justify-between mb-8">
          <Link to="/dashboard/seller/listings" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={16} /> Back to Listings
          </Link>
          <h1 className="text-3xl font-bold text-white">{listing.seller_anon_name || "Unnamed Listing"}</h1>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8 border-b border-slate-700/50 pb-4 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
              activeTab === 'overview' 
                ? 'bg-indigo-500 text-white' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Listing Overview
          </button>
          <button 
            onClick={() => setActiveTab('buyers')}
            className={`px-6 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
              activeTab === 'buyers' 
                ? 'bg-indigo-500 text-white' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Buyers
          </button>
          <button 
            onClick={() => setActiveTab('preview')}
            className={`px-6 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
              activeTab === 'preview' 
                ? 'bg-indigo-500 text-white' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            View Like a Buyer
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              {/* Company Information */}
              <div className="glass p-6 rounded-2xl border border-slate-800">
                <h3 className="text-xl font-bold mb-4 text-white">Company Information</h3>
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-slate-400 block mb-1">Company Name</span>
                    <span className="text-slate-200 font-medium">{listing.seller_name || '--'}</span>
                  </div>
                  {listing.year_founded && (
                    <div>
                      <span className="text-sm text-slate-400 block mb-1">Year Founded</span>
                      <span className="text-slate-200 font-medium">{listing.year_founded}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-sm text-slate-400 block mb-1">Keywords / Industry</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {(Array.isArray(listing.keywords) && listing.keywords.length > 0) ? (
                        listing.keywords.map(kw => (
                          <span key={kw} className="px-2 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs rounded-md">
                            {kw}
                          </span>
                        ))
                      ) : <span className="text-slate-500 text-sm italic">Not specified</span>}
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-700/50">
                    <h4 className="text-sm font-semibold text-slate-300 mb-3">Latest Financials</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs text-slate-400 block">Revenue</span>
                        <span className="text-sm text-white font-medium">{getLatestFinancial(listing.financial_history, 'revenue')}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 block">EBITDA</span>
                        <span className="text-sm text-white font-medium">{getLatestFinancial(listing.financial_history, 'ebitda')}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 block">Gross Profit</span>
                        <span className="text-sm text-white font-medium">{getLatestFinancial(listing.financial_history, 'gross_profit')}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 block">Net Income</span>
                        <span className="text-sm text-white font-medium">{getLatestFinancial(listing.financial_history, 'net_income')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Buyer Information (Mock) */}
              <div className="glass p-6 rounded-2xl border border-slate-800">
                <h3 className="text-xl font-bold mb-4 text-white">Buyer Information</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400"># Ideal Matches</span>
                    <span className="text-lg font-bold text-emerald-400">0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400"># NDAs Requested</span>
                    <span className="text-lg font-bold text-indigo-400">0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400"># NDAs Requested but Not Sent</span>
                    <span className="text-lg font-bold text-orange-400">0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400"># NDAs Sent</span>
                    <span className="text-lg font-bold text-blue-400">0</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Column */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              {/* Files */}
              <div className="glass p-6 rounded-2xl border border-slate-800">
                <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
                  <FileText className="text-indigo-400" size={20} /> Files
                </h3>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Teaser</h4>
                    <p className="text-sm text-slate-500 italic bg-slate-800/30 p-3 rounded-lg border border-slate-700/50">
                      Teaser has not been uploaded
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">CIM</h4>
                    <p className="text-sm text-slate-500 italic bg-slate-800/30 p-3 rounded-lg border border-slate-700/50">
                      CIM has not been uploaded
                    </p>
                  </div>
                </div>
              </div>

              <div className="glass p-6 rounded-2xl border border-slate-800">
                <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
                  <CheckCircle2 className="text-emerald-400" size={20} /> Listing Status
                </h3>
                <div className="space-y-5">
                  <div>
                    <span className="text-sm text-slate-400 block mb-1">Current Status</span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
                      In Process
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-slate-400 block mb-1">Date Uploaded to Dealer</span>
                    <span className="text-slate-200 font-medium">
                      {new Date(listing.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-slate-400 block mb-1">Date Closed</span>
                    <span className="text-slate-500 italic">--</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              {/* Actions */}
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => navigate(`/onboarding/seller/edit/${listing.id}`)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 shadow-lg shadow-indigo-500/5 border border-indigo-500/30 text-indigo-400 font-semibold transition-all">
                  <Edit3 size={18} /> Edit Listing
                </button>
                <button className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 font-semibold transition-all">
                  <EyeOff size={18} /> Hide / Pause Client
                </button>
                <button className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-semibold transition-all">
                  <CheckCircle2 size={18} /> Close Deal
                </button>
                <button className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-semibold transition-all">
                  <Trash2 size={18} /> Permanently Remove Listing
                </button>
              </div>

              {/* Deal Team */}
              <div className="glass p-6 rounded-2xl border border-slate-800 mt-2">
                <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
                  <Users className="text-indigo-400" size={20} /> Deal Team
                </h3>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-indigo-300 mb-2">Sell-Side Advisor</h4>
                    <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                      <span className="block text-slate-200 font-medium mb-1">Primary Contact *</span>
                      <span className="block text-sm text-slate-400 break-all">user@example.com</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-indigo-300 mb-2">Other Team Members</h4>
                    <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center py-6 text-center">
                      <span className="text-sm text-slate-500 italic block mb-2">No other team members assigned</span>
                      <button className="text-xs text-indigo-400 hover:underline">
                        + Add Member
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-4">* Includes emails for notifications</p>
              </div>
            </div>

          </div>
        )}

        {/* Placeholders for other tabs */}
        {activeTab === 'buyers' && (
          <div className="glass p-12 rounded-2xl border border-slate-800 text-center flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl mb-4 flex items-center justify-center">
              <Users className="text-indigo-400" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Buyer Matches</h2>
            <p className="text-slate-400 max-w-md mx-auto">
              This section will display all relevant buyers based on the score between their investment criteria and this seller listing.
            </p>
            <span className="mt-8 px-4 py-1.5 rounded-full bg-slate-800 text-slate-300 text-sm font-medium border border-slate-700">Coming Soon</span>
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="glass p-12 rounded-2xl border border-slate-800 text-center flex flex-col items-center justify-center min-h-[400px]">
             <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl mb-4 flex items-center justify-center">
              <FileText className="text-emerald-400" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Buyer Preview Mode</h2>
            <p className="text-slate-400 max-w-md mx-auto">
              This section will allow you to preview this listing exactly as it appears to buyers on the platform.
            </p>
            <span className="mt-8 px-4 py-1.5 rounded-full bg-slate-800 text-slate-300 text-sm font-medium border border-slate-700">Coming Soon</span>
          </div>
        )}
      </div>
    </div>
  );
}
