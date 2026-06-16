import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';
import AuthModal from './AuthModal';
import { LogIn, LogOut, RefreshCw, Moon, Sun } from 'lucide-react';

export default function Navbar() {
  const { user } = useAuth();
  const { statusText, lastUpdate, fetchAllData } = useData();
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
      <h1>World Cup 2026 Predictor</h1>
      <p className="subtitle">Full Knockout Stage & Group Standings &middot; Live Updates</p>
      
      <div className="status-bar">
        <span className={statusText.includes('Connected') ? 'live' : 'error'}>{statusText}</span>
        {lastUpdate && <span style={{marginLeft: 8}}>Updated {lastUpdate.toLocaleTimeString()}</span>}
        <button className="refresh-btn" onClick={fetchAllData} title="Refresh data">
          <RefreshCw size={14} style={{marginRight:4, verticalAlign:'middle'}}/> Refresh
        </button>
        <button className="theme-toggle" onClick={toggleTheme} title="Toggle Theme">
          {theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}
        </button>
        {user ? (
          <button className="refresh-btn" onClick={handleLogout}>
            <LogOut size={14} style={{marginRight:4, verticalAlign:'middle'}}/> Logout ({(user.email || '').split('@')[0] || 'User'})
          </button>
        ) : (
          <button className="refresh-btn" onClick={() => setShowAuth(true)}>
            <LogIn size={14} style={{marginRight:4, verticalAlign:'middle'}}/> Login / Sign Up
          </button>
        )}
      </div>

      <div className="tabs">
        <NavLink to="/" className={({isActive}) => `tab ${isActive ? 'active' : ''}`}>Groups</NavLink>
        <NavLink to="/bracket" className={({isActive}) => `tab ${isActive ? 'active' : ''}`}>Live Bracket</NavLink>
        <NavLink to="/matches" className={({isActive}) => `tab ${isActive ? 'active' : ''}`}>All Matches</NavLink>
        <NavLink to="/my-bracket" className={({isActive}) => `tab ${isActive ? 'active' : ''}`}>My Bracket</NavLink>
        <NavLink to="/leaderboard" className={({isActive}) => `tab ${isActive ? 'active' : ''}`}>Leaderboard</NavLink>
        <NavLink to="/venues" className={({isActive}) => `tab ${isActive ? 'active' : ''}`}>Venues</NavLink>
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </header>
  );
}
