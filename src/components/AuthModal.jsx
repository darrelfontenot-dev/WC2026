import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AuthModal({ onClose }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        if (!username) throw new Error('Username is required for sign up.');
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username }
          }
        });
        if (signUpError) throw signUpError;
        alert('Sign up successful! You can now log in.');
        setIsSignUp(false);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (signInError) throw signInError;
        onClose();
      }
    } catch (err) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>{isSignUp ? 'Create an Account' : 'Welcome Back'}</h2>
        
        {error && <div style={{color: 'var(--red)', marginBottom: 12, fontSize: '0.85rem', textAlign: 'center'}}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <div className="form-group">
              <label>Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} required />
            </div>
          )}
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Log In')}
          </button>
        </form>

        <div className="auth-switch">
          {isSignUp ? (
            <>Already have an account? <span onClick={() => setIsSignUp(false)}>Log in</span></>
          ) : (
            <>Don't have an account? <span onClick={() => setIsSignUp(true)}>Sign up</span></>
          )}
        </div>
      </div>
    </div>
  );
}
