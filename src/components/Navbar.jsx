import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  LogOut,
  User,
  LayoutDashboard,
  Building2
} from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

export default function Navbar({ organizationName }) {
  const navigate = useNavigate();

  const handleSignOut = () => {
    supabase.auth.signOut();
  };

  return (
    <nav className="fixed top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-border px-6 h-20 flex items-center">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        <Link
          to="/dashboard"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-10 h-10 bg-gradient-to-tr from-accent to-accent-secondary rounded-xl flex items-center justify-center shadow-accent">
            <TrendingUp className="text-white" size={22} />
          </div>
          <span className="text-2xl font-display tracking-tight text-foreground">DealScape</span>
        </Link>

        <div className="flex items-center gap-6">
          {organizationName && (
            <Badge pulse={false} className="hidden sm:inline-flex border-accent/10 bg-accent/5">
              <Building2 className="mr-1" size={12} />
              {organizationName}
            </Badge>
          )}

          <div className="flex items-center gap-2">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm" className="hidden md:flex gap-2">
                <LayoutDashboard size={16} />
                Dashboard
              </Button>
            </Link>

            <div className="h-4 w-px bg-border mx-2 hidden md:block" />

            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-red-600 hover:bg-red-50 gap-2"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
