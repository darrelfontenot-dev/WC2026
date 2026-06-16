import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useData } from '../context/DataContext';

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

  // Compute points for each user based on real world data
  const getScore = (bracket) => {
    let pts = 0;
    const bd = bracket.bracket_data || {};
    const gp = bd.groupPicks || {};
    const ko = bd.knockoutPicks || {};

    // Group stage scoring: 2 pts per correct top-2 team, 1 pt per correct 3rd/4th
    if (Object.keys(standings).length > 0) {
      Object.keys(gp).forEach(g => {
        const real = (standings[g] || []).map(t => t.code);
        const picks = gp[g] || [];
        if (real.length >= 4 && real.every(t => (standings[g] || []).find(x => x.code === t && x.mp >= 3))) {
          // Only score if group is finished
          if (picks[0] === real[0]) pts += 3; // Exact 1st
          else if (real.slice(0, 2).includes(picks[0])) pts += 1; // In top 2
          if (picks[1] === real[1]) pts += 3;
          else if (real.slice(0, 2).includes(picks[1])) pts += 1;
        }
      });
    }

    // Knockout scoring: compare picks with actual results from fixtures
    // Matches with status FT/AET/PEN have real winners
    const koFixtures = allFixtures.filter(f => f.round && !f.round.includes('Group'));
    koFixtures.forEach(f => {
      if (!['FT', 'AET', 'PEN'].includes(f.status)) return;
      const winner = f.hs > f.as ? f.home : f.as > f.hs ? f.away : null;
      if (!winner) return;
      // Try to match by finding the KO match this corresponds to
      Object.keys(ko).forEach(matchId => {
        if (ko[matchId] === winner) pts += 2;
      });
    });

    // Tie-breaker: final score difference
    const fh = bracket.final_score_home ?? 0;
    const fa = bracket.final_score_away ?? 0;
    // Find actual final score from fixtures
    const finalMatch = allFixtures.find(f => f.round && f.round.includes('Final') && ['FT','AET','PEN'].includes(f.status));
    let diff = 999;
    if (finalMatch) {
      diff = Math.abs((fh - fa) - (finalMatch.hs - finalMatch.as));
    }
    return { pts, diff };
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
