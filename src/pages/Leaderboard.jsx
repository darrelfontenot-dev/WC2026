import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useData } from '../context/DataContext';
import { scoreBracket } from '../lib/scoring';

export default function Leaderboard() {
  const { standings, allFixtures } = useData();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      // In a real app with RLS, we'd have an RPC or a view to compute this,
      // but for this MVP, we fetch brackets and profiles (if public)
      try {
        const { data: bracketsData, error } = await supabase.from('brackets').select('*').eq('submitted', true);
        if (error) console.error('Leaderboard query error:', error);
        if (bracketsData && bracketsData.length > 0) {
          // Fetch usernames separately to avoid join issues
          const userIds = bracketsData.map(b => b.user_id);
          const { data: profilesData } = await supabase.from('profiles').select('id, username').in('id', userIds);
          const profileMap = {};
          (profilesData || []).forEach(p => { profileMap[p.id] = p.username; });
          setUsers(bracketsData.map(b => ({ ...b, username: profileMap[b.user_id] || 'Unknown User' })));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, []);

  // Compute points for each user with the shared scoring engine (matches My Bracket).
  const getScore = (bracket) => {
    const s = scoreBracket(bracket, standings, allFixtures);
    return { pts: s.total, diff: s.diff };
  };

  const rankedUsers = users.map(u => ({
    ...u,
    score: getScore(u)
  })).sort((a,b) => {
    if (b.score.pts !== a.score.pts) return b.score.pts - a.score.pts;
    return a.score.diff - b.score.diff; // lower diff is better
  });

  return (
    <div className="panel active" style={{maxWidth: 800, margin: '0 auto', padding: '0 20px 40px'}}>
      <h2 style={{textAlign:'center', marginBottom:24}}>Global Leaderboard</h2>
      {loading ? (
        <div style={{textAlign:'center'}}>Loading rankings...</div>
      ) : (
        <div style={{background:'var(--card)', borderRadius:8, border:'1px solid var(--border)', overflow:'hidden'}}>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'var(--bg)'}}>
                <th style={{padding:12, textAlign:'left'}}>Rank</th>
                <th style={{padding:12, textAlign:'left'}}>User</th>
                <th style={{padding:12, textAlign:'center'}}>Points</th>
                <th style={{padding:12, textAlign:'center'}}>Tie-Breaker Diff</th>
              </tr>
            </thead>
            <tbody>
              {rankedUsers.length === 0 && (
                <tr><td colSpan="4" style={{padding:20, textAlign:'center', color:'#888'}}>No brackets submitted yet.</td></tr>
              )}
              {rankedUsers.map((u, i) => (
                <tr key={u.id} style={{borderTop:'1px solid var(--border)'}}>
                  <td style={{padding:12, fontWeight:'bold', width:60}}>#{i+1}</td>
                  <td style={{padding:12}}>{u.username || 'Unknown User'}</td>
                  <td style={{padding:12, textAlign:'center', fontWeight:'bold', color:'var(--navy)'}}>{u.score.pts}</td>
                  <td style={{padding:12, textAlign:'center', color:'#888'}}>{u.score.diff}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
