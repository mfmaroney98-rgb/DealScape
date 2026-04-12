import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sellerService } from '../services/sellerService';
import { supabase } from '../lib/supabase';
import { Briefcase, TrendingUp, DollarSign, PlusCircle, ArrowLeft, Loader2, Search } from 'lucide-react';

export default function SellerListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate('/');
          return;
        }

        const data = await sellerService.getListings(session.user.id);
        setListings(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, [navigate]);

  const formatCurrency = (val) => {
    if (!val && val !== 0) return '--';
    return '$' + Number(val).toLocaleString('en-US');
  };

  const getLatestFinancial = (history, field) => {
    if (!history) return '--';
    if (history['LTM'] && history['LTM'][field]) return formatCurrency(history['LTM'][field]);
    if (history['2025'] && history['2025'][field]) return formatCurrency(history['2025'][field]);
    if (history['2024'] && history['2024'][field]) return formatCurrency(history['2024'][field]);
    if (history['2023'] && history['2023'][field]) return formatCurrency(history['2023'][field]);
    return '--';
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
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-500/10 rounded-xl mb-4">
              <Briefcase className="text-indigo-400" size={24} />
            </div>
            <h1 className="text-4xl font-black tracking-tight mb-2">My Active Listings</h1>
            <p className="text-slate-400">View and manage all your created seller profiles.</p>
          </div>
          <Link to="/onboarding/seller" className="btn-primary flex items-center gap-2 px-6 py-3 shrink-0">
            <PlusCircle size={18} /> New Listing
          </Link>
        </div>

        {error && (
          <div className="p-4 mb-8 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {listings.length === 0 ? (
          <div className="glass p-12 rounded-3xl border border-slate-800 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-800/50 rounded-2xl mb-6 flex items-center justify-center">
              <Search className="text-slate-500" size={40} />
            </div>
            <h3 className="text-xl font-bold mb-2">No listings found</h3>
            <p className="text-slate-400 mb-6">You haven't created any seller profiles yet.</p>
            <Link to="/onboarding/seller" className="btn-primary flex items-center gap-2 py-3 px-8">
              Get Started <ArrowLeft className="rotate-180" size={18} />
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {listings.map((listing) => (
              <div key={listing.id} className="glass p-8 rounded-3xl border border-slate-800 hover:border-indigo-500/50 transition-all duration-300">
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#818cf8', marginBottom: '1.5rem' }}>
                  {listing.seller_anon_name || '--'}
                </h3>

                {/* Headings row */}
                <div style={{ display: 'flex', flexDirection: 'row', width: '100%', marginBottom: '0.5rem' }}>
                  <div style={{ flex: 1, textAlign: 'center', fontSize: '0.875rem', fontWeight: 500, color: '#e2e8f0' }}>Company Name</div>
                  <div style={{ flex: 1, textAlign: 'center', fontSize: '0.875rem', fontWeight: 500, color: '#e2e8f0' }}>Keywords</div>
                  <div style={{ flex: 1, textAlign: 'center', fontSize: '0.875rem', fontWeight: 500, color: '#e2e8f0' }}>Revenue</div>
                  <div style={{ flex: 1, textAlign: 'center', fontSize: '0.875rem', fontWeight: 500, color: '#e2e8f0' }}>EBITDA</div>
                </div>

                {/* Values row */}
                <div style={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
                  <div style={{ flex: 1, textAlign: 'center', color: '#818cf8', fontWeight: 500, fontSize: '1.05rem' }}>
                    {listing.seller_name || '--'}
                  </div>
                  <div style={{ flex: 1, textAlign: 'center', color: '#818cf8', fontWeight: 500, fontSize: '1.05rem' }}>
                    {(Array.isArray(listing.keywords) && listing.keywords.length > 0)
                      ? listing.keywords.slice(0, 3).join(', ') + (listing.keywords.length > 3 ? '...' : '')
                      : '--'}
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
