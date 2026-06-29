import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';
import AuthModal from './AuthModal';
import { LogIn, LogOut, Moon, Sun } from 'lucide-react';

export default function Navbar() {
  const { user } = useAuth();
  const { statusText, lastUpdate } = useData();
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
      <div className="top-row">
        <h1>World Cup 2026</h1>
        <div className="top-actions">
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
      </div>

      <div className="status-bar">
        <span className={statusText.includes('Connected') ? 'live' : 'error'}>{statusText}</span>
        {lastUpdate && <span style={{marginLeft: 8}}>Updated {lastUpdate.toLocaleTimeString()}</span>}
      </div>

      <div className="tabs">
        <NavLink to="/matches" className={({isActive}) => `tab ${isActive ? 'active' : ''}`}>All Matches</NavLink>
        <NavLink to="/" end className={({isActive}) => `tab ${isActive ? 'active' : ''}`}>Groups</NavLink>
        <NavLink to="/bracket-visual" className={({isActive}) => `tab ${isActive ? 'active' : ''}`}>Bracket</NavLink>
        <NavLink to="/bracket" className={({isActive}) => `tab ${isActive ? 'active' : ''}`}>Wheel Bracket</NavLink>
        <NavLink to="/my-bracket" className={({isActive}) => `tab ${isActive ? 'active' : ''}`}>My Bracket</NavLink>
        <NavLink to="/leaderboard" className={({isActive}) => `tab ${isActive ? 'active' : ''}`}>Leaderboard</NavLink>
        <NavLink to="/venues" className={({isActive}) => `tab ${isActive ? 'active' : ''}`}>Venue</NavLink>
        <NavLink to="/golden-boot" className={({isActive}) => `tab ${isActive ? 'active' : ''}`}>Golden Boot</NavLink>
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </header>
  );
}
