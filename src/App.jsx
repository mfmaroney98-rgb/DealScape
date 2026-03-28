import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate, Link } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { profileService } from './services/profileService';
import { sellerService } from './services/sellerService';
import SellerProfileForm from './components/SellerProfileForm';
import { 
  TrendingUp, 
  Mail, 
  Lock, 
  LogOut,
  Loader2,
  AlertCircle,
  ArrowRight,
  PlusCircle
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

const Dashboard = ({ onSignOut, hasProfile, role }) => (
  <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-fade-in">
    <h1 className="text-6xl font-black mb-6 tracking-tight">Hello</h1>
    
    {!hasProfile && role === 'seller' && (
      <div className="mb-12 glass p-8 rounded-2xl border border-indigo-500/30 max-w-sm mx-auto animate-fade-in">
        <PlusCircle className="text-indigo-400 mx-auto mb-4" size={48} />
        <h3 className="text-xl font-bold mb-2">Complete Your Listing</h3>
        <p className="text-slate-400 text-sm mb-6">You haven't listed your business yet. Start finding buyers today.</p>
        <Link to="/onboarding/seller" className="btn-primary flex items-center justify-center gap-2">
          Create Profile <ArrowRight size={18} />
        </Link>
      </div>
    )}

    <button onClick={onSignOut} className="btn-secondary flex items-center gap-2 px-8">
      <LogOut size={18} />
      Sign Out
    </button>
  </div>
);

/* --- Main App --- */

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [hasListing, setHasListing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety net: don't hang on loading if everything goes wrong
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        
        if (session) {
          const userProfile = await profileService.getProfile(session.user.id);
          setProfile(userProfile);
          
          if (userProfile?.role === 'seller') {
            const listing = await sellerService.getListing(session.user.id);
            setHasListing(!!listing);
          }
        }
      } catch (err) {
        console.error('Init failed:', err);
      } finally {
        setLoading(false);
        clearTimeout(timeout);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        const userProfile = await profileService.getProfile(session.user.id);
        setProfile(userProfile);
      } else {
        setProfile(null);
        setHasListing(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={session ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/signup" element={session ? <Navigate to="/dashboard" /> : <Signup />} />
        <Route 
          path="/onboarding/seller" 
          element={session ? <SellerProfileForm userId={session.user.id} /> : <Navigate to="/" />} 
        />
        <Route 
          path="/dashboard" 
          element={
            session ? (
              <Dashboard 
                hasProfile={hasListing}
                role={profile?.role || 'seller'}
                onSignOut={() => supabase.auth.signOut()} 
              />
            ) : (
              <Navigate to="/" />
            )
          } 
        />
        {/* Redirect unknown routes */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
