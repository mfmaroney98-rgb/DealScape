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
  Users,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './components/ui/Button';
import { Card } from './components/ui/Card';
import { Badge } from './components/ui/Badge';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

/* --- Components --- */

const AuthLayout = ({ children, title, subtitle }) => (
  <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background relative overflow-hidden">
    {/* Decorative background elements */}
    <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 blur-[120px] rounded-full" />
    <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent-secondary/5 blur-[120px] rounded-full" />
    
    <div className="w-full max-w-md relative z-10">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center text-center mb-10"
      >
        <Link to="/" className="flex items-center gap-3 mb-6 hover:opacity-80 transition-opacity">
          <div className="w-12 h-12 bg-gradient-to-tr from-accent to-accent-secondary rounded-2xl flex items-center justify-center shadow-accent">
            <TrendingUp className="text-white" size={26} />
          </div>
          <span className="text-3xl font-display tracking-tight text-foreground">DealScape</span>
        </Link>
        <Badge className="mb-4">Secure Access</Badge>
        <h1 className="text-4xl font-display mb-3">{title}</h1>
        <p className="text-muted-foreground max-w-[320px] mx-auto">{subtitle}</p>
      </motion.div>

      <Card className="p-8 shadow-2xl shadow-accent/5 border-border/50">
        {children}
      </Card>
      
      <p className="text-center text-sm text-muted-foreground mt-8">
        By continuing, you agree to our <a href="#" className="text-accent hover:underline">Terms of Service</a> and <a href="#" className="text-accent hover:underline">Privacy Policy</a>.
      </p>
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
    <AuthLayout title="Welcome Back" subtitle="Sign in to your DealScape account to manage your deals.">
      <form onSubmit={handleSignIn} className="space-y-5">
        <div className="space-y-2">
          <label className="form-label flex items-center gap-2">
            <Mail size={16} className="text-muted-foreground" />
            Email Address
          </label>
          <div className="relative group">
            <input
              type="email"
              className="form-input group-hover:border-accent/30 transition-colors"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="form-label flex items-center gap-2 mb-0">
              <Lock size={16} className="text-muted-foreground" />
              Password
            </label>
            <a href="#" className="text-xs text-accent hover:underline">Forgot password?</a>
          </div>
          <div className="relative group">
            <input
              type="password"
              className="form-input group-hover:border-accent/30 transition-colors"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>
        
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-start gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/10 text-red-600 text-sm"
          >
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        <Button type="submit" isLoading={loading} className="w-full h-14 text-lg mt-2">
          Sign In
        </Button>
      </form>
      <div className="mt-8 pt-6 border-t border-border flex flex-col items-center gap-4">
        <p className="text-sm text-muted-foreground">
          Don't have an account? <Link to="/signup" className="text-accent font-semibold hover:underline">Create Account</Link>
        </p>
      </div>
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
        <div className="text-center py-6 flex flex-col items-center">
          <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mb-6 text-accent">
            <Mail size={40} />
          </div>
          <p className="text-muted-foreground mb-10 leading-relaxed">
            Please check your inbox at <span className="text-foreground font-semibold">{email}</span> to confirm your registration.
          </p>
          <Link to="/">
            <Button variant="secondary" className="w-full">
              Return to Sign In
            </Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Create Account" subtitle="Join the DealScape ecosystem and start your journey today.">
      <form onSubmit={handleSignUp} className="space-y-5">
        <div className="space-y-2">
          <label className="form-label flex items-center gap-2">
            <Mail size={16} className="text-muted-foreground" />
            Email Address
          </label>
          <div className="relative group">
            <input
              type="email"
              className="form-input group-hover:border-accent/30 transition-colors"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="form-label flex items-center gap-2">
            <Lock size={16} className="text-muted-foreground" />
            Password
          </label>
          <div className="relative group">
            <input
              type="password"
              className="form-input group-hover:border-accent/30 transition-colors"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2 py-2">
          <input type="checkbox" id="terms" required className="rounded border-border text-accent focus:ring-accent" />
          <label htmlFor="terms" className="text-xs text-muted-foreground">
            I agree to receive transactional emails and updates.
          </label>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-start gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/10 text-red-600 text-sm"
          >
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        <Button type="submit" isLoading={loading} className="w-full h-14 text-lg mt-2">
          Create Account
        </Button>
      </form>
      <div className="mt-8 pt-6 border-t border-border flex flex-col items-center gap-4">
        <p className="text-sm text-muted-foreground">
          Already have an account? <Link to="/" className="text-accent font-semibold hover:underline">Sign In</Link>
        </p>
      </div>
    </AuthLayout>
  );
};

const DashboardActionCard = ({ title, subtitle, icon: Icon, to, active, buttonText, activeText, activeTo, secondaryAction, secondaryTo, onSecondaryClick }) => (
  <Card 
    featured={!active} 
    className="p-10 flex flex-col items-center text-center group"
  >
    <div className={twMerge(
      "w-20 h-20 rounded-2xl mb-8 flex items-center justify-center transition-transform duration-500 group-hover:scale-110",
      active 
        ? "bg-emerald-500/10 text-emerald-500" 
        : "bg-gradient-to-tr from-accent to-accent-secondary text-white shadow-accent"
    )}>
      {active ? <CheckCircle2 size={36} /> : <Icon size={36} />}
    </div>
    
    <h3 className="text-2xl font-semibold mb-4 text-foreground">
      {active ? (activeText || 'Active') : title}
    </h3>
    
    <p className="text-muted-foreground text-sm mb-10 leading-relaxed max-w-[260px]">
      {active ? `Your ${title.toLowerCase()} is active and being matched.` : subtitle}
    </p>

    <div className="w-full mt-auto space-y-4">
      {active ? (
        <>
          {activeTo ? (
            <Link to={activeTo} className="block w-full">
              <Button variant="secondary" className="w-full h-14">
                {buttonText || 'View Details'}
              </Button>
            </Link>
          ) : (
            <Button variant="secondary" className="w-full h-14">
              {buttonText || 'View Details'}
            </Button>
          )}
          {secondaryAction && secondaryTo && (
            <Link to={secondaryTo} onClick={onSecondaryClick} className="block w-full">
              <Button variant="primary" className="w-full h-14">
                {secondaryAction}
              </Button>
            </Link>
          )}
        </>
      ) : (
        <Link to={to} className="block w-full">
          <Button variant="primary" className="w-full h-14 group/btn">
            Get Started 
            <ArrowRight size={20} className="ml-2 transition-transform group-hover/btn:translate-x-1" />
          </Button>
        </Link>
      )}
    </div>
  </Card>
);

const MessagesCard = () => (
  <Card className="p-10 flex flex-col items-center text-center opacity-70">
    <div className="w-20 h-20 bg-muted rounded-2xl mb-8 flex items-center justify-center text-muted-foreground">
      <Mail size={36} />
    </div>
    <h3 className="text-2xl font-semibold mb-4 text-foreground">Messages</h3>
    <p className="text-muted-foreground text-sm mb-10 leading-relaxed max-w-[260px]">
      Communicate securely with other members of the ecosystem.
    </p>
    <Button variant="secondary" className="w-full h-14 cursor-not-allowed opacity-50">
      Coming Soon
    </Button>
  </Card>
);

const SellerDashboard = ({ hasListing, profile }) => (
  <div className="min-h-screen pt-32 pb-20 px-6 bg-background relative overflow-hidden">
    {/* Background texture and glows */}
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-40">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent/5 blur-[150px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent-secondary/5 blur-[150px] rounded-full" />
    </div>

    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
      className="max-w-7xl mx-auto flex flex-col items-center text-center"
    >
      <Badge className="mb-6">Workspace</Badge>
      <h1 className="text-5xl md:text-7xl mb-12 leading-tight">
        Seller <span className="gradient-text">Dashboard</span>
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl mx-auto">
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
    </motion.div>
  </div>
);

const BuyerDashboard = ({ hasCriteria, profile }) => (
  <div className="min-h-screen pt-32 pb-20 px-6 bg-background relative overflow-hidden">
    {/* Background texture and glows */}
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-40">
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent/5 blur-[150px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent-secondary/5 blur-[150px] rounded-full" />
    </div>

    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
      className="max-w-7xl mx-auto flex flex-col items-center text-center"
    >
      <Badge className="mb-6">Workspace</Badge>
      <h1 className="text-5xl md:text-7xl mb-12 leading-tight">
        Buyer <span className="gradient-text">Dashboard</span>
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl mx-auto">
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
    </motion.div>
  </div>
);

const RootDashboardDispatcher = ({ profile }) => {
  const role = profile?.role;
  const organization = profile?.organization;

  if (profile === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-accent" size={40} />
      </div>
    );
  }

  if (!profile?.organization_id && (role === 'seller' || role === 'buyer' || !role)) {
    return <Navigate to="/onboarding/organization" replace />;
  }

  if (!organization?.type && (role === 'seller' || role === 'buyer' || !role)) {
    return <Navigate to="/onboarding/type" replace />;
  }

  const effectiveRole = role === 'corporate' ? 'corporate' : organization?.type;

  if (effectiveRole === 'seller') return <Navigate to="/dashboard/seller" replace />;
  if (effectiveRole === 'buyer') return <Navigate to="/dashboard/buyer" replace />;

  return (
    <div className="min-h-screen pt-32 pb-20 px-6 bg-background relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent/5 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent-secondary/5 blur-[150px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="max-w-7xl mx-auto flex flex-col items-center text-center"
      >
        <Badge className="mb-6">Welcome Back</Badge>
        <h1 className="text-5xl md:text-7xl mb-12 leading-tight">
          Select <span className="gradient-text">Workspace</span>
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mx-auto mt-8">
          <Link to="/dashboard/seller" className="block">
            <Card className="p-10 h-full flex flex-col items-center group">
              <div className="w-20 h-20 bg-accent/10 rounded-2xl mb-8 flex items-center justify-center group-hover:scale-110 transition-transform text-accent">
                <PlusCircle size={40} />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Seller Dashboard</h3>
              <p className="text-muted-foreground text-sm mb-10 leading-relaxed max-w-[260px]">
                Manage your seller listings, analytics, and receive buyer matches.
              </p>
              <Button className="w-full h-14 group/btn">
                Enter Workspace
                <ArrowRight size={20} className="ml-2 transition-transform group-hover/btn:translate-x-1" />
              </Button>
            </Card>
          </Link>
          
          <Link to="/dashboard/buyer" className="block">
            <Card className="p-10 h-full flex flex-col items-center group border-emerald-500/10 hover:border-emerald-500/30">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-2xl mb-8 flex items-center justify-center group-hover:scale-110 transition-transform text-emerald-600">
                <PlusCircle size={40} />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Buyer Dashboard</h3>
              <p className="text-muted-foreground text-sm mb-10 leading-relaxed max-w-[260px]">
                Define investment criteria and browse curated seller listings.
              </p>
              <Button className="w-full h-14 group/btn bg-gradient-to-r from-emerald-600 to-teal-500 shadow-emerald-500/20">
                Enter Workspace
                <ArrowRight size={20} className="ml-2 transition-transform group-hover/btn:translate-x-1" />
              </Button>
            </Card>
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

/* --- Main App --- */

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(undefined); // undefined = loading, null = not found
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
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        // Get initial session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (mounted) {
          setSession(currentSession);
          if (currentSession) {
            await loadUserData(currentSession);
          } else {
            setProfile(null); // No session, so no profile
          }
        }
      } catch (err) {
        console.error('Init failed:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
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
      mounted = false;
      subscription.unsubscribe();
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
                profile === undefined ? (
                  <div className="min-h-screen flex items-center justify-center">
                    <Loader2 className="animate-spin text-indigo-500" size={32} />
                  </div>
                ) : profile?.organization_id ? (
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
                profile === undefined ? (
                  <div className="min-h-screen flex items-center justify-center">
                    <Loader2 className="animate-spin text-indigo-500" size={32} />
                  </div>
                ) : profile?.organization?.type ? (
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
