import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  TrendingUp,
  LogOut,
  User,
  LayoutDashboard
} from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();

  const handleSignOut = () => {
    supabase.auth.signOut();
  };

  return (
    <nav className="sticky top-0 z-50 w-full glass border-b border-slate-800/50 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <TrendingUp className="text-white" size={18} />
          </div>
          <span className="text-xl font-bold tracking-tight font-['Outfit']">DealScape</span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-slate-800/50"
          >
            <LayoutDashboard size={16} />
            Dashboard
          </Link>

          <div className="h-4 w-px bg-slate-800 hidden md:block" />

          <button
            onClick={handleSignOut}
            className="group flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-red-400 transition-all px-4 py-2 rounded-lg hover:bg-red-500/5"
          >
            <LogOut size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
