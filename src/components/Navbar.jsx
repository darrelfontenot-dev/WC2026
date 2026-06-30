import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';
import AuthModal from './AuthModal';
import {
  LogIn, LogOut, Moon, Sun,
  CalendarDays, LayoutGrid, Network, CircleDot,
  ClipboardList, Trophy, MapPin, Footprints,
} from 'lucide-react';

const TABS = [
  { to: '/matches', label: 'All Matches', icon: CalendarDays },
  { to: '/', label: 'Groups', icon: LayoutGrid, end: true },
  { to: '/bracket-visual', label: 'Bracket', icon: Network },
  { to: '/bracket', label: 'Wheel Bracket', icon: CircleDot },
  { to: '/my-bracket', label: 'My Bracket', icon: ClipboardList },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/venues', label: 'Venue', icon: MapPin },
  { to: '/golden-boot', label: 'Golden Boot', icon: Footprints },
];

export default function Navbar() {
  const { user } = useAuth();
  const { statusText, lastUpdate } = useData();
  const connected = statusText.includes('Connected');
  const [showAuth, setShowAuth] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('wc2026_theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('wc2026_theme', newTheme);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header>
      <div className="top-bar">
        <div className="top-actions">
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}
          </button>
          {user ? (
            <button className="auth-btn" onClick={handleLogout} aria-label="Log out">
              <LogOut size={14}/> <span>Logout ({(user.email || '').split('@')[0] || 'User'})</span>
            </button>
          ) : (
            <button className="auth-btn" onClick={() => setShowAuth(true)} aria-label="Log in or sign up">
              <LogIn size={14}/> <span>Login / Sign Up</span>
            </button>
          )}
        </div>
      </div>
      <h1>World Cup 2026</h1>

      <div className="status-bar">
        <span className="status-pill" role="status" aria-live="polite">
          <span className={`status-dot ${connected ? 'live' : 'error'}`} aria-hidden="true" />
          {statusText}
          {lastUpdate && <><span className="status-sep" aria-hidden="true">·</span><span className="status-time">Updated {lastUpdate.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span></>}
        </span>
      </div>

      <nav className="tabs" aria-label="Sections">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({isActive}) => `tab ${isActive ? 'active' : ''}`}
          >
            <Icon size={16} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </header>
  );
}
