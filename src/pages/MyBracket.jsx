import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { GROUPS, FLAGS, NAMES, KO } from '../data/constants';
import { ArrowUp, ArrowDown, Lock, Save, Check } from 'lucide-react';

export default function MyBracket() {
  const { user } = useAuth();
  const [stage, setStage] = useState(1);
  const [groupPicks, setGroupPicks] = useState(GROUPS);
  const [bestThirds, setThirds] = useState([]);
  const [knockoutPicks, setKnockoutPicks] = useState({});
  const [finalScore, setFinalScore] = useState({ home: '', away: '' });
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  // Migrate old team codes to corrected ones
  const CODE_MIGRATIONS = { SLO:'SUI', BHR:'BIH', PHI:'IRN', DEN:'SEN', CMR:'CRO', OMA:'GHA' };
  const migrateCode = (code) => CODE_MIGRATIONS[code] || code;
  const migrateGroupPicks = (picks) => {
    const migrated = {};
    Object.keys(GROUPS).forEach(g => {
      migrated[g] = picks[g] ? picks[g].map(migrateCode) : GROUPS[g];
    });
    return migrated;
  };

  // Load existing bracket
  useEffect(() => {
    if (user) {
      supabase.from('brackets').select('*').eq('user_id', user.id).single().then(({ data }) => {
        if (data && data.bracket_data) {
          setGroupPicks(migrateGroupPicks(data.bracket_data.groupPicks || GROUPS));
          setThirds((data.bracket_data.bestThirds || []).map(migrateCode));
          const ko = data.bracket_data.knockoutPicks || {};
          const migratedKo = {};
          Object.keys(ko).forEach(k => { migratedKo[k] = migrateCode(ko[k]); });
          setKnockoutPicks(migratedKo);
          setFinalScore({ home: data.final_score_home ?? '', away: data.final_score_away ?? '' });
        }
      });
    }
  }, [user]);

  const moveTeam = (group, index, direction) => {
    const newPicks = { ...groupPicks };
    const arr = [...newPicks[group]];
    if (direction === -1 && index > 0) {
      [arr[index-1], arr[index]] = [arr[index], arr[index-1]];
    } else if (direction === 1 && index < arr.length - 1) {
      [arr[index+1], arr[index]] = [arr[index], arr[index+1]];
    }
    newPicks[group] = arr;
    setGroupPicks(newPicks);
  };

  const toggleThird = (teamCode) => {
    if (bestThirds.includes(teamCode)) {
      setThirds(bestThirds.filter(t => t !== teamCode));
    } else if (bestThirds.length < 8) {
      setThirds([...bestThirds, teamCode]);
    }
  };

  // Helper to map 3rd place placeholders to actual teams
  const resolvedThirds = useMemo(() => {
    const assignments = {};
    const available = [...bestThirds];
    
    // Create a mapping of team code to its original group
    const teamToGroup = {};
    Object.keys(groupPicks).forEach(g => {
      teamToGroup[groupPicks[g][2]] = g;
    });

    const placeholders = ['3ABCDF', '3CDFGH', '3BEFIJ', '3AEHIJ', '3CEFHI', '3EHIJK', '3EFGIJ', '3DEIJL'];
    placeholders.forEach(ph => {
      // Find a team in available whose group letter is in the placeholder string
      const matchIdx = available.findIndex(t => ph.includes(teamToGroup[t]));
      if (matchIdx !== -1) {
        assignments[ph] = available[matchIdx];
        available.splice(matchIdx, 1);
      } else if (available.length > 0) {
        // Fallback: just assign the first available
        assignments[ph] = available.shift();
      }
    });
    return assignments;
  }, [bestThirds, groupPicks]);

  const resolveTeam = (label) => {
    if (!label) return null;
    const mr = label.match(/^([WL])(\d+)$/);
    if (mr) {
      const type = mr[1], mid = parseInt(mr[2]);
      const r = knockoutPicks[mid];
      if (r) {
        // Find the matchup to know who was home/away
        // This is complex, so we just store the winner directly in knockoutPicks
        if (type === 'W') return r;
        // Loser logic requires knowing BOTH teams that played.
        // We will simplify: store { winner, loser } in knockoutPicks
      }
      return null;
    }
    const gp = label.match(/^(\d)([A-L])$/);
    if (gp) {
      const pos = parseInt(gp[1]), g = gp[2];
      return groupPicks[g][pos-1];
    }
    if (label.startsWith('3')) {
      return resolvedThirds[label];
    }
    return null;
  };

  const handlePick = (matchId, winnerCode, loserCode) => {
    setKnockoutPicks(prev => {
      const next = { ...prev };
      next[matchId] = winnerCode;
      // We also store loser for the 3rd place match resolution
      next[`${matchId}_loser`] = loserCode;
      
      // Auto-clear future dependent picks if this pick changed
      // (Simplified: user can just re-click)
      return next;
    });
  };

  const getMatchTeams = (m) => {
    let hCode = resolveTeam(m.home);
    let aCode = resolveTeam(m.away);
    
    // For W/L labels, we need a special resolution for loser
    if (m.home.startsWith('L')) {
      const mid = parseInt(m.home.replace('L',''));
      hCode = knockoutPicks[`${mid}_loser`] || null;
    }
    if (m.away.startsWith('L')) {
      const mid = parseInt(m.away.replace('L',''));
      aCode = knockoutPicks[`${mid}_loser`] || null;
    }

    return { hCode, aCode };
  };

  const renderKnockoutMatch = (m) => {
    const { hCode, aCode } = getMatchTeams(m);
    const winner = knockoutPicks[m.id];

    return (
      <div key={m.id} className="ko-match">
        <div className="match-info">{m.info}</div>
        <div 
          className={`team knockout-pick ${winner === hCode && hCode ? 'winner' : ''}`}
          onClick={() => hCode && aCode && handlePick(m.id, hCode, aCode)}
        >
          <span className="team-name">{hCode ? `${FLAGS[hCode]||''} ${NAMES[hCode]||hCode}` : m.home}</span>
        </div>
        <div 
          className={`team knockout-pick ${winner === aCode && aCode ? 'winner' : ''}`}
          onClick={() => hCode && aCode && handlePick(m.id, aCode, hCode)}
        >
          <span className="team-name">{aCode ? `${FLAGS[aCode]||''} ${NAMES[aCode]||aCode}` : m.away}</span>
        </div>
      </div>
    );
  };

  const handleSave = async () => {
    if (!user) return alert('Please login to save your bracket.');
    setSaving(true);
    try {
      const bracket_data = { groupPicks, bestThirds, knockoutPicks };
      const { error } = await supabase.from('brackets').upsert({
        user_id: user.id,
        bracket_data,
        final_score_home: parseInt(finalScore.home) || 0,
        final_score_away: parseInt(finalScore.away) || 0,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
      
      if (error) throw error;
      setSavedMessage('Bracket saved successfully!');
      setTimeout(() => setSavedMessage(''), 3000);
    } catch (err) {
      alert('Error saving bracket: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="panel active" style={{textAlign:'center', padding:40}}>
        <Lock size={48} style={{color:'#ccc', marginBottom:16}} />
        <h2>Login Required</h2>
        <p style={{color:'#888', marginTop:8}}>Please log in to build and save your bracket.</p>
      </div>
    );
  }

  const isStage1Done = true;
  const isStage2Done = bestThirds.length === 8;

  return (
    <div className="panel active" style={{padding: '0 20px 40px'}}>
      <div className="wizard-stage-nav">
        <button className={`wizard-btn ${stage===1?'active':''}`} onClick={()=>setStage(1)}>1. Groups</button>
        <button className={`wizard-btn ${stage===2?'active':''} ${!isStage1Done?'locked':''}`} onClick={()=>isStage1Done && setStage(2)}>2. Best 3rds</button>
        <button className={`wizard-btn ${stage===3?'active':''} ${!isStage2Done?'locked':''}`} onClick={()=>isStage2Done && setStage(3)}>3. Knockout</button>
        <button className={`wizard-btn ${stage===4?'active':''} ${!isStage2Done?'locked':''}`} onClick={()=>isStage2Done && setStage(4)}>4. Final Score</button>
        
        <button className="wizard-btn" onClick={handleSave} style={{marginLeft:'auto', background:'var(--green)', color:'white', borderColor:'var(--green)'}}>
          {saving ? 'Saving...' : <><Save size={14}/> Save Bracket</>}
        </button>
      </div>
      
      {savedMessage && <div style={{textAlign:'center', color:'var(--green)', fontWeight:'bold', marginBottom:16}}>{savedMessage}</div>}

      {stage === 1 && (
        <div>
          <h2 style={{textAlign:'center', marginBottom:20}}>Rank the Groups</h2>
          <p style={{textAlign:'center', color:'#888', marginBottom:24}}>Use the arrows to rank the teams 1st through 4th.</p>
          <div className="groups-container">
            {Object.keys(groupPicks).map(g => (
              <div key={g} className="group" style={{padding:12}}>
                <div className="group-header" style={{marginBottom:12, borderRadius:4}}>GROUP {g}</div>
                {groupPicks[g].map((t, i) => (
                  <div key={t} className={`predictor-team rank-${i+1}`}>
                    <div style={{display:'flex', alignItems:'center', gap:12}}>
                      <div className={`rank-badge pos-${i+1}`}>{i+1}</div>
                      <span style={{fontWeight:600}}>{FLAGS[t]} {NAMES[t]||t}</span>
                    </div>
                    <div style={{display:'flex', flexDirection:'column', gap:4}}>
                      <button onClick={()=>moveTeam(g, i, -1)} disabled={i===0} style={{border:'none', background:'transparent', cursor:i===0?'default':'pointer', color:i===0?'#ccc':'var(--navy)'}}><ArrowUp size={16}/></button>
                      <button onClick={()=>moveTeam(g, i, 1)} disabled={i===3} style={{border:'none', background:'transparent', cursor:i===3?'default':'pointer', color:i===3?'#ccc':'var(--navy)'}}><ArrowDown size={16}/></button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {stage === 2 && (
        <div>
          <h2 style={{textAlign:'center', marginBottom:20}}>Select 8 Best 3rd Place Teams</h2>
          <p style={{textAlign:'center', color:'#888', marginBottom:24}}>You have selected {bestThirds.length} of 8.</p>
          <div className="third-place-grid">
            {Object.keys(groupPicks).map(g => {
              const t = groupPicks[g][2]; // The 3rd place team
              const isSelected = bestThirds.includes(t);
              return (
                <div key={t} className={`third-place-card ${isSelected ? 'selected' : ''}`} onClick={() => toggleThird(t)}>
                  <div style={{fontWeight:600}}>{FLAGS[t]} {NAMES[t]||t} <span style={{fontSize:'0.7rem', color:'#888'}}>(Grp {g})</span></div>
                  {isSelected && <Check color="var(--green)" size={20}/>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {stage === 3 && (
        <div>
          <h2 style={{textAlign:'center', marginBottom:20}}>Knockout Stage</h2>
          <p style={{textAlign:'center', color:'#888', marginBottom:24}}>Click the team you predict to win each matchup.</p>
          <div className="bracket-wrap">
            <div className="knockout">
              <div className="round">
                <div className="round-header">Round of 32</div>
                {KO.left_r32.map(renderKnockoutMatch)}
              </div>
              <div className="round">
                <div className="round-header">Round of 16</div>
                {KO.left_r16.map(renderKnockoutMatch)}
              </div>
              <div className="round">
                <div className="round-header">Quarterfinals</div>
                {KO.left_qf.map(renderKnockoutMatch)}
              </div>
              <div className="round">
                <div className="round-header">Semifinals</div>
                {KO.left_sf.map(renderKnockoutMatch)}
              </div>
              <div className="final-area">
                <div className="trophy">🏆</div>
                <div className="final-label">FINAL</div>
                {renderKnockoutMatch(KO.final)}
                <div className="third-label">3RD PLACE</div>
                {renderKnockoutMatch(KO.third)}
              </div>
              <div className="round">
                <div className="round-header">Semifinals</div>
                {KO.right_sf.map(renderKnockoutMatch)}
              </div>
              <div className="round">
                <div className="round-header">Quarterfinals</div>
                {KO.right_qf.map(renderKnockoutMatch)}
              </div>
              <div className="round">
                <div className="round-header">Round of 16</div>
                {KO.right_r16.map(renderKnockoutMatch)}
              </div>
              <div className="round">
                <div className="round-header">Round of 32</div>
                {KO.right_r32.map(renderKnockoutMatch)}
              </div>
            </div>
          </div>
        </div>
      )}

      {stage === 4 && (
        <div style={{maxWidth:600, margin:'0 auto', textAlign:'center'}}>
          <h2 style={{marginBottom:20}}>Final Match Tie-Breaker</h2>
          <p style={{color:'#888', marginBottom:24}}>Predict the exact score of the Final Match. This will be used as a tie-breaker if you tie on points with another user.</p>
          
          <div style={{display:'flex', justifyContent:'center', alignItems:'center', gap:20, background:'var(--card)', padding:30, borderRadius:12, boxShadow:'var(--shadow)'}}>
            <div>
              <div style={{fontWeight:'bold', fontSize:'1.2rem', marginBottom:8}}>
                {knockoutPicks[101] ? `${FLAGS[knockoutPicks[101]]} ${knockoutPicks[101]}` : 'TBD Home'}
              </div>
              <input type="number" min="0" max="20" style={{width:80, fontSize:'2rem', textAlign:'center', padding:'8px'}} value={finalScore.home} onChange={e => setFinalScore({...finalScore, home: e.target.value})} />
            </div>
            <div style={{fontSize:'1.5rem', fontWeight:'bold', color:'#888'}}>-</div>
            <div>
              <div style={{fontWeight:'bold', fontSize:'1.2rem', marginBottom:8}}>
                {knockoutPicks[102] ? `${FLAGS[knockoutPicks[102]]} ${knockoutPicks[102]}` : 'TBD Away'}
              </div>
              <input type="number" min="0" max="20" style={{width:80, fontSize:'2rem', textAlign:'center', padding:'8px'}} value={finalScore.away} onChange={e => setFinalScore({...finalScore, away: e.target.value})} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
