import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';
import AuthModal from './AuthModal';
import { LogIn, LogOut, Settings, RefreshCw, Moon, Sun } from 'lucide-react';

export default function Navbar() {
  const { user } = useAuth();
  const { statusText, lastUpdate, fetchAllData, apiKey, setApiKey } = useData();
  const [showAuth, setShowAuth] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('wc2026_theme') || 'light');
  const [keyInput, setKeyInput] = useState(apiKey);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('wc2026_theme', newTheme);
  };

  const handleSaveKey = () => {
    const val = keyInput.trim();
    setApiKey(val);
    localStorage.setItem('wc2026_apikey', val);
    setShowConfig(false);
    fetchAllData();
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
        <button className="theme-toggle" onClick={() => setShowConfig(!showConfig)} title="API Config">
          <Settings size={18}/>
        </button>
        
        {user ? (
          <button className="refresh-btn" onClick={handleLogout}>
            <LogOut size={14} style={{marginRight:4, verticalAlign:'middle'}}/> Logout ({user.email.split('@')[0]})
          </button>
        ) : (
          <button className="refresh-btn" onClick={() => setShowAuth(true)}>
            <LogIn size={14} style={{marginRight:4, verticalAlign:'middle'}}/> Login / Sign Up
          </button>
        )}
      </div>

      {showConfig && (
        <div className="config-bar" style={{display: 'block'}}>
          Using <b>api-football.com</b> for live data:
          <input 
            value={keyInput} 
            onChange={(e) => setKeyInput(e.target.value)} 
            placeholder="Paste your free API-Football key here" 
            style={{marginLeft: 8, marginRight: 8}}
          />
          <button className="refresh-btn" onClick={handleSaveKey}>Save & Fetch</button>
          <span style={{marginLeft:8}}>Get a free key at <a href="https://www.api-football.com/" target="_blank" rel="noreferrer">api-football.com</a></span>
        </div>
      )}

      <div className="tabs">
        <NavLink to="/" className={({isActive}) => `tab ${isActive ? 'active' : ''}`}>Groups</NavLink>
        <NavLink to="/bracket" className={({isActive}) => `tab ${isActive ? 'active' : ''}`}>Live Bracket</NavLink>
        <NavLink to="/matches" className={({isActive}) => `tab ${isActive ? 'active' : ''}`}>All Matches</NavLink>
        <NavLink to="/my-bracket" className={({isActive}) => `tab ${isActive ? 'active' : ''}`}>My Bracket</NavLink>
        <NavLink to="/leaderboard" className={({isActive}) => `tab ${isActive ? 'active' : ''}`}>Leaderboard</NavLink>
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </header>
  );
}
