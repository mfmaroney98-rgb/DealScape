import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate, Link, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { profileService } from './services/profileService';
import { sellerListingService } from './services/sellerListingService';
import { buyerService } from './services/buyerService';
import SellerProfileForm from './components/SellerProfileForm';
import BuyerCriteriaForm from './components/BuyerCriteriaForm';
import SellerListings from './components/SellerListings';
import SellerListingOverview from './components/SellerListingOverview';
import BuyerCriteriaList from './components/BuyerCriteriaList';
import BuyerProfileForm from './components/BuyerProfileForm';
import SellerProfilePage from './components/SellerProfilePage';
import OrganizationOnboarding from './components/OrganizationOnboarding';
import OrganizationTypeSelection from './components/OrganizationTypeSelection';
import Navbar from './components/Navbar';
import {
  TrendingUp,
  Mail,
  Lock,
  LogOut,
  Loader2,
  AlertCircle,
  ArrowRight,
  PlusCircle,
  CheckCircle2,
  Users
} from 'lucide-react';

/* --- Components --- */

const AuthLayout = ({ children, title, subtitle }) => (
  <div className="min-h-screen flex flex-col items-center justify-center p-6">
    <div className="w-full max-w-md animate-fade-in">
      <Link to="/" className="flex items-center justify-center gap-2 mb-12 hover:opacity-80 transition-opacity">
        <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-xl flex items-center justify-center">
          <TrendingUp className="text-white" size={24} />
        </div>
        <span className="text-2xl font-bold tracking-tight font-['Outfit']">DealScape</span>
      </Link>

      {import.meta.env.VITE_SUPABASE_ANON_KEY?.includes('placeholder') && (
        <div className="mb-8 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs text-center">
          <AlertCircle size={14} className="inline mr-1" />
          Anon Key missing in .env
        </div>
      )}

      <div className="glass p-8 rounded-2xl border border-slate-800 shadow-2xl">
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        <p className="text-slate-400 text-sm mb-8">{subtitle}</p>
        {children}
      </div>
    </div>
  </div>
);

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <AuthLayout title="Sign In" subtitle="Enter your credentials to access your workspace.">
      <form onSubmit={handleSignIn} className="space-y-6">
        <div>
          <label className="form-label">Email Address</label>
          <div className="relative">
            <input
              type="email"
              className="form-input pl-11"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          </div>
        </div>
        <div>
          <label className="form-label">Password</label>
          <div className="relative">
            <input
              type="password"
              className="form-input pl-11"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          </div>
        </div>
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center h-12">
          {loading ? <Loader2 className="animate-spin" size={20} /> : 'Sign In'}
        </button>
      </form>
      <p className="text-center text-sm text-slate-400 mt-8">
        Don't have an account? <Link to="/signup" className="text-indigo-400 font-semibold hover:underline">Sign Up</Link>
      </p>
    </AuthLayout>
  );
};

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout title="Verify Identity" subtitle="We've sent a magic link to your email.">
        <div className="text-center py-4">
          <p className="text-slate-300 mb-8">Please check {email} to confirm your registration.</p>
          <Link to="/" className="btn-secondary inline-flex items-center gap-2">Return to Login</Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Create Account" subtitle="Join the DealScape ecosystem today.">
      <form onSubmit={handleSignUp} className="space-y-6">
        <div>
          <label className="form-label">Email Address</label>
          <div className="relative">
            <input
              type="email"
              className="form-input pl-11"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          </div>
        </div>
        <div>
          <label className="form-label">Password</label>
          <div className="relative">
            <input
              type="password"
              className="form-input pl-11"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          </div>
        </div>
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center h-12">
          {loading ? <Loader2 className="animate-spin" size={20} /> : 'Register'}
        </button>
      </form>
      <p className="text-center text-sm text-slate-400 mt-8">
        Already have an account? <Link to="/" className="text-indigo-400 font-semibold hover:underline">Sign In</Link>
      </p>
    </AuthLayout>
  );
};

const DashboardActionCard = ({ title, subtitle, icon: Icon, to, active, buttonText, activeText, activeTo, secondaryAction, secondaryTo, onSecondaryClick }) => (
  <div className={`glass p-10 rounded-3xl border ${active ? 'border-slate-800' : 'border-indigo-500/30'} text-center flex flex-col items-center group ${!active ? 'hover:border-indigo-500/50' : ''} transition-all duration-500`}>
    <div className={`w-16 h-16 ${active ? 'bg-emerald-500/10' : 'bg-indigo-500/10'} rounded-2xl mb-6 flex items-center justify-center ${!active ? 'group-hover:scale-110' : ''} transition-transform`}>
      {active ? <CheckCircle2 className="text-emerald-400" size={32} /> : <Icon className="text-indigo-400" size={32} />}
    </div>
    <h3 className="text-2xl font-bold mb-3">{active ? (activeText || 'Active') : title}</h3>
    <p className="text-slate-400 text-sm mb-8 leading-relaxed max-w-[240px]">
      {active ? `Your ${title.toLowerCase()} is active and being matched.` : subtitle}
    </p>
    {active ? (
      <div className="flex flex-col gap-3 w-full">
        {activeTo ? (
          <Link to={activeTo} className="btn-secondary w-full flex items-center justify-center text-sm py-4">
            {buttonText || 'View'}
          </Link>
        ) : (
          <button className="btn-secondary w-full text-sm py-4">{buttonText || 'View'}</button>
        )}
        {secondaryAction && secondaryTo && (
          <Link
            to={secondaryTo}
            onClick={onSecondaryClick}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3 shadow-xl shadow-indigo-500/20 text-sm"
          >
            {secondaryAction}
          </Link>
        )}
      </div>
    ) : (
      <Link
        to={to}
        className="btn-primary w-full flex items-center justify-center gap-2 py-4 shadow-xl shadow-indigo-500/20"
      >
        Get Started <ArrowRight size={18} />
      </Link>
    )}
  </div>
);

const MessagesCard = () => (
  <div className="glass p-10 rounded-3xl border border-slate-800 text-center flex flex-col items-center group">
    <div className="w-16 h-16 bg-slate-800/50 rounded-2xl mb-6 flex items-center justify-center">
      <Mail className="text-slate-400" size={32} />
    </div>
    <h3 className="text-2xl font-bold mb-3">Messages</h3>
    <p className="text-slate-400 text-sm mb-8 leading-relaxed max-w-[240px]">
      Communicate securely with other members of the ecosystem.
    </p>
    <button className="btn-secondary w-full text-sm py-4 opacity-50 cursor-not-allowed">Coming Soon</button>
  </div>
);

const SellerDashboard = ({ hasListing, profile }) => (
  <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-fade-in relative">
    <div className="absolute top-0 left-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
    </div>
    <div className="mb-2 px-4 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider animate-fade-in">
      Workspace
    </div>
    <h1 className="text-4xl md:text-6xl font-black mb-8 tracking-tighter bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent">
      Seller Dashboard
    </h1>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl mx-auto">
      <DashboardActionCard
        title="Seller Listing"
        subtitle="List your business and start finding buyers today."
        icon={PlusCircle}
        to="/onboarding/seller"
        active={hasListing}
        activeText="Listings Active"
        buttonText="View Listings"
        activeTo="/dashboard/seller/listings"
        secondaryAction="Create New Listing"
        secondaryTo="/onboarding/seller"
        onSecondaryClick={() => {
          sessionStorage.removeItem('sellerFormData_new');
          sessionStorage.removeItem('sellerFormFields_new');
          sessionStorage.removeItem('sellerFormTags_new');
        }}
      />
      <DashboardActionCard
        title="Seller Profile"
        subtitle="Manage your organization's website and public summary."
        icon={Users}
        to="/dashboard/seller/profile"
        active={!!profile?.organization?.website_url}
        activeText="Profile Active"
        buttonText="Edit Profile"
        activeTo="/dashboard/seller/profile"
      />
      <MessagesCard />
    </div>
  </div>
);

const BuyerDashboard = ({ hasCriteria, profile }) => (
  <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-fade-in relative">
    <div className="absolute top-0 left-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full" />
    </div>
    <div className="mb-2 px-4 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider animate-fade-in">
      Workspace
    </div>
    <h1 className="text-4xl md:text-6xl font-black mb-8 tracking-tighter bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent">
      Buyer Dashboard
    </h1>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl mx-auto">
      <DashboardActionCard
        title="Buyer Criteria"
        subtitle="Define what you're looking for to receive deals."
        icon={PlusCircle}
        to="/onboarding/buyer"
        active={hasCriteria}
        activeText="Criteria Set"
        buttonText="View Criteria"
        activeTo="/dashboard/buyer/criteria"
        secondaryAction="Create New Criteria"
        secondaryTo="/onboarding/buyer"
        onSecondaryClick={() => {
          sessionStorage.removeItem('buyerFormData_new');
        }}
      />
      <DashboardActionCard
        title="Buyer Profile"
        subtitle="Manage your organization's website, description, and buyer identity."
        icon={Users}
        to="/dashboard/buyer/profile"
        active={!!profile?.organization?.buyer_type}
        activeText="Profile Active"
        buttonText="Edit Profile"
        activeTo="/dashboard/buyer/profile"
      />
      <MessagesCard />
    </div>
  </div>
);

const RootDashboardDispatcher = ({ profile }) => {
  const role = profile?.role;
  const organization = profile?.organization;

  if (!profile?.organization_id && (role === 'seller' || role === 'buyer' || !role)) {
    return <Navigate to="/onboarding/organization" replace />;
  }

  if (!organization?.type && (role === 'seller' || role === 'buyer' || !role)) {
    return <Navigate to="/onboarding/type" replace />;
  }

  // Determine role from organization type if not corporate
  const effectiveRole = role === 'corporate' ? 'corporate' : organization?.type;

  if (effectiveRole === 'seller') return <Navigate to="/dashboard/seller" replace />;
  if (effectiveRole === 'buyer') return <Navigate to="/dashboard/buyer" replace />;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-fade-in relative">
      <div className="absolute top-0 left-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="mb-2 px-4 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider animate-fade-in">
        Welcome Back
      </div>
      <h1 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent">
        Select Workspace
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mx-auto mt-8">
        <Link to="/dashboard/seller" className="glass p-10 rounded-3xl border border-indigo-500/30 text-center flex flex-col items-center group hover:border-indigo-500/60 transition-all duration-300">
           <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl mb-6 flex items-center justify-center group-hover:scale-110 transition-transform">
             <PlusCircle className="text-indigo-400" size={32} />
           </div>
           <h3 className="text-2xl font-bold mb-3">Seller Dashboard</h3>
           <p className="text-slate-400 text-sm mb-8 leading-relaxed max-w-[240px]">
             Manage your seller listings, analytics, and receive buyer matches.
           </p>
           <span className="btn-primary w-full flex items-center justify-center gap-2 py-4">Enter Workspace <ArrowRight size={18} /></span>
        </Link>
        <Link to="/dashboard/buyer" className="glass p-10 rounded-3xl border border-emerald-500/30 text-center flex flex-col items-center group hover:border-emerald-500/60 transition-all duration-300">
           <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl mb-6 flex items-center justify-center group-hover:scale-110 transition-transform">
             <PlusCircle className="text-emerald-400" size={32} />
           </div>
           <h3 className="text-2xl font-bold mb-3">Buyer Dashboard</h3>
           <p className="text-slate-400 text-sm mb-8 leading-relaxed max-w-[240px]">
             Define investment criteria and browse curated seller listings.
           </p>
           <span className="btn-primary w-full flex items-center justify-center gap-2 py-4">Enter Workspace <ArrowRight size={18} /></span>
        </Link>
      </div>
    </div>
  );
};

/* --- Main App --- */

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [hasListing, setHasListing] = useState(false);
  const [hasCriteria, setHasCriteria] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadUserData = useCallback(async (currentSession) => {
    if (!currentSession) return;
    try {
      const userProfile = await profileService.getProfile(currentSession.user.id);
      
      // Normalize organization data (sometimes Supabase returns an array for joins)
      if (userProfile?.organizations) {
        userProfile.organization = Array.isArray(userProfile.organizations) 
          ? userProfile.organizations[0] 
          : userProfile.organizations;
      } else if (userProfile?.organization_id) {
        // If organization_id exists but the object is missing, we might need a fallback or re-fetch
        userProfile.organization = null;
      }

      setProfile(userProfile);

      if (userProfile?.organization_id) {
        const isCorporate = userProfile.role === 'corporate';
        
        if (userProfile.role === 'seller' || isCorporate) {
          const listings = await sellerListingService.getListings(userProfile.organization_id, isCorporate);
          setHasListing(listings && listings.length > 0);
        }

        if (userProfile.role === 'buyer' || isCorporate) {
          const criteriaList = await buyerService.getCriteriaList(userProfile.organization_id, isCorporate);
          setHasCriteria(criteriaList && criteriaList.length > 0);
        }
      }
    } catch (err) {
      console.error('Failed to load user data:', err);
    }
  }, []);

  useEffect(() => {
    // Safety net: don't hang on loading if everything goes wrong
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        if (currentSession) {
          await loadUserData(currentSession);
        }
      } catch (err) {
        console.error('Init failed:', err);
      } finally {
        setLoading(false);
        clearTimeout(timeout);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event, !!session);
      setSession(session);
      if (session) {
        await loadUserData(session);
      } else {
        setProfile(null);
        setHasListing(false);
        setHasCriteria(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [loadUserData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  return (
    <Router>
      <Layout 
        session={session} 
        organizationName={profile?.organization?.organization_name}
      >
        <Routes>
          <Route path="/" element={session ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/signup" element={session ? <Navigate to="/dashboard" /> : <Signup />} />
          <Route
            path="/onboarding/organization"
            element={
              session ? (
                profile?.organization_id ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <OrganizationOnboarding 
                    userId={session.user.id} 
                    userRole={profile?.role} 
                    onComplete={() => loadUserData(session)}
                  />
                )
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/onboarding/type"
            element={
              session ? (
                profile?.organization?.type ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <OrganizationTypeSelection 
                    userId={session.user.id} 
                    orgId={profile?.organization_id} 
                    onComplete={() => loadUserData(session)}
                  />
                )
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/onboarding/seller"
            element={session ? <SellerProfileForm userId={session.user.id} orgId={profile?.organization_id} onComplete={() => loadUserData(session)} /> : <Navigate to="/" />}
          />
          <Route
            path="/onboarding/seller/edit/:listingId"
            element={session ? <SellerProfileForm userId={session.user.id} orgId={profile?.organization_id} onComplete={() => loadUserData(session)} /> : <Navigate to="/" />}
          />
          <Route
            path="/dashboard/seller/profile"
            element={session ? <SellerProfilePage userId={session.user.id} orgId={profile?.organization_id} onComplete={() => loadUserData(session)} /> : <Navigate to="/" />}
          />
          <Route
            path="/onboarding/buyer"
            element={session ? <BuyerCriteriaForm userId={session.user.id} orgId={profile?.organization_id} onComplete={() => loadUserData(session)} /> : <Navigate to="/" />}
          />
          <Route
            path="/onboarding/buyer/edit/:id"
            element={session ? <BuyerCriteriaForm userId={session.user.id} orgId={profile?.organization_id} onComplete={() => loadUserData(session)} /> : <Navigate to="/" />}
          />
          <Route
            path="/dashboard/buyer/profile"
            element={session ? <BuyerProfileForm userId={session.user.id} orgId={profile?.organization_id} onComplete={() => loadUserData(session)} /> : <Navigate to="/" />}
          />
          <Route
            path="/dashboard/buyer/criteria"
            element={
              session ? (
                (profile?.role === 'buyer' || profile?.role === 'corporate') ? (
                  <BuyerCriteriaList orgId={profile?.organization_id} isCorporate={profile?.role === 'corporate'} />
                ) : (
                  <Navigate to="/dashboard/seller" replace />
                )
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/dashboard"
            element={
              session ? (
                <RootDashboardDispatcher profile={profile} />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/dashboard/seller"
            element={
              session ? (
                (profile?.role === 'seller' || profile?.organization?.type === 'seller' || profile?.role === 'corporate') ? (
                  <SellerDashboard hasListing={hasListing} profile={profile} />
                ) : (
                  <Navigate to="/dashboard/buyer" replace />
                )
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/dashboard/seller/listings"
            element={
              session ? (
                (profile?.role === 'seller' || profile?.role === 'corporate') ? (
                  <SellerListings orgId={profile?.organization_id} isCorporate={profile?.role === 'corporate'} />
                ) : (
                  <Navigate to="/dashboard/buyer" replace />
                )
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/dashboard/seller/listings/:id"
            element={
              session ? (
                (profile?.role === 'seller' || profile?.role === 'corporate') ? (
                  <SellerListingOverview orgId={profile?.organization_id} isCorporate={profile?.role === 'corporate'} />
                ) : (
                  <Navigate to="/dashboard/buyer" replace />
                )
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/dashboard/buyer"
            element={
              session ? (
                (profile?.role === 'buyer' || profile?.organization?.type === 'buyer' || profile?.role === 'corporate') ? (
                  <BuyerDashboard hasCriteria={hasCriteria} profile={profile} />
                ) : (
                  <Navigate to="/dashboard/seller" replace />
                )
              ) : (
                <Navigate to="/" />
              )
            }
          />
          {/* Redirect unknown routes */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </Router>
  );
}

const Layout = ({ children, session, organizationName }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const hideNavbarOn = ['/', '/signup'];
  const shouldShowNavbar = session && !hideNavbarOn.includes(location.pathname);

  useEffect(() => {
    // Explicit global redirection if session is lost on a protected route
    if (!session && !hideNavbarOn.includes(location.pathname)) {
      console.log('Session lost, redirecting to login...');
      navigate('/');
    }
  }, [session, location.pathname, navigate]);

  return (
    <div className="flex flex-col min-h-screen">
      {shouldShowNavbar && <Navbar organizationName={organizationName} />}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};

export default App;
