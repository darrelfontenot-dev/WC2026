import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';
import { GROUPS, FLAGS, NAMES, KO } from '../data/constants';
import { scoreBracket } from '../lib/scoring';
import MyWheelBracket from '../components/MyWheelBracket';
import { ArrowUp, ArrowDown, Lock, Save, Check, Trophy } from 'lucide-react';

const CODE_MIGRATIONS = { SLO:'SUI', BHR:'BIH', PHI:'IRN', DEN:'SEN', CMR:'CRO', OMA:'GHA' };

export default function MyBracket() {
  const { user } = useAuth();
  const { standings, allFixtures } = useData();
  const [stage, setStage] = useState(1);
  const [groupPicks, setGroupPicks] = useState(GROUPS);
  const [bestThirds, setThirds] = useState([]);
  const [knockoutPicks, setKnockoutPicks] = useState({});
  const [finalScore, setFinalScore] = useState({ home: '', away: '' });
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Migrate old team codes to corrected ones
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
          if (data.submitted) setSubmitted(true);
        }
      });
    }
  }, [user]);

  const moveTeam = (group, index, direction) => {
    if (submitted) return;
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
    if (submitted) return;
    if (bestThirds.includes(teamCode)) {
      setThirds(bestThirds.filter(t => t !== teamCode));
    } else if (bestThirds.length < 8) {
      setThirds([...bestThirds, teamCode]);
    }
  };

  // Helper to map 3rd place placeholders to actual teams using backtracking
  // to ensure a valid assignment (each team assigned to a slot whose allowed
  // groups include that team's group).
  const resolvedThirds = useMemo(() => {
    const assignments = {};
    
    // Create a mapping of team code to its original group
    const teamToGroup = {};
    Object.keys(groupPicks).forEach(g => {
      teamToGroup[groupPicks[g][2]] = g;
    });

    // Placeholders with their allowed group letters (from FIFA rules)
    // Order matches the FIFA combination table positions:
    // pos1→Match79(1A), pos2→Match85(1B), pos3→Match81(1D), pos4→Match74(1E),
    // pos5→Match82(1G), pos6→Match77(1I), pos7→Match87(1K), pos8→Match80(1L)
    const slots = [
      { key: '3CEFHI', allowed: 'CEFHI' },  // Match 79: 1A vs 3rd
      { key: '3EFGIJ', allowed: 'EFGIJ' },  // Match 85: 1B vs 3rd
      { key: '3BEFIJ', allowed: 'BEFIJ' },  // Match 81: 1D vs 3rd
      { key: '3ABCDF', allowed: 'ABCDF' },  // Match 74: 1E vs 3rd
      { key: '3AEHIJ', allowed: 'AEHIJ' },  // Match 82: 1G vs 3rd
      { key: '3CDFGH', allowed: 'CDFGH' },  // Match 77: 1I vs 3rd
      { key: '3DEIJL', allowed: 'DEIJL' },  // Match 87: 1K vs 3rd
      { key: '3EHIJK', allowed: 'EHIJK' },  // Match 80: 1L vs 3rd
    ];

    // Backtracking solver to find valid assignment
    const teams = [...bestThirds];
    const result = new Array(slots.length).fill(null);
    const used = new Array(teams.length).fill(false);

    function solve(slotIdx) {
      if (slotIdx === slots.length) return true;
      const { allowed } = slots[slotIdx];
      for (let i = 0; i < teams.length; i++) {
        if (used[i]) continue;
        const group = teamToGroup[teams[i]];
        if (!group || !allowed.includes(group)) continue;
        used[i] = true;
        result[slotIdx] = teams[i];
        if (solve(slotIdx + 1)) return true;
        used[i] = false;
        result[slotIdx] = null;
      }
      return false;
    }

    solve(0);

    slots.forEach((slot, idx) => {
      if (result[idx]) assignments[slot.key] = result[idx];
    });

    return assignments;
  }, [bestThirds, groupPicks]);

  // Live scoring of the user's current picks against real-world results.
  const score = useMemo(() => scoreBracket(
    {
      bracket_data: { groupPicks, bestThirds, knockoutPicks },
      final_score_home: parseInt(finalScore.home) || 0,
      final_score_away: parseInt(finalScore.away) || 0,
    },
    standings || {},
    allFixtures || [],
  ), [groupPicks, bestThirds, knockoutPicks, finalScore, standings, allFixtures]);

  const hasResults = score.knockout.decided > 0 || Object.values(score.groups).some(g => g.finished);

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
    const ki = score.knockout.items.find(i => i.id === m.id);
    const decided = !!(ki && ki.decided);
    const actualWinner = ki ? ki.actualWinner : null;

    const cellClass = (code) => {
      let cls = 'team knockout-pick';
      const picked = winner === code && code;
      if (picked) cls += ' winner';
      if (decided && picked) cls += actualWinner === code ? ' pick-correct' : ' pick-wrong';
      return cls;
    };

    return (
      <div key={m.id} className={`ko-match ${decided ? 'decided' : ''}`}>
        <div className="match-info">
          <span>{m.info}</span>
          {decided && (ki.correct
            ? <span className="ko-badge correct">✓ +{ki.points}</span>
            : <span className="ko-badge wrong">✗ {actualWinner ? `${FLAGS[actualWinner]||''} ${actualWinner}` : 'TBD'}</span>)}
        </div>
        <div
          className={cellClass(hCode)}
          onClick={() => !submitted && hCode && aCode && handlePick(m.id, hCode, aCode)}
        >
          <span className="team-name">{hCode ? `${FLAGS[hCode]||''} ${NAMES[hCode]||hCode}` : m.home}</span>
          {decided && actualWinner === hCode && hCode && <Check size={14} className="ko-actual" />}
        </div>
        <div
          className={cellClass(aCode)}
          onClick={() => !submitted && hCode && aCode && handlePick(m.id, aCode, hCode)}
        >
          <span className="team-name">{aCode ? `${FLAGS[aCode]||''} ${NAMES[aCode]||aCode}` : m.away}</span>
          {decided && actualWinner === aCode && aCode && <Check size={14} className="ko-actual" />}
        </div>
      </div>
    );
  };

  const handleSave = async () => {
    if (!user) return alert('Please login to save your bracket.');
    if (submitted) return;
    setSaving(true);
    try {
      const cleanKo = {};
      Object.keys(knockoutPicks).forEach(k => { if (!k.includes('_loser')) cleanKo[k] = knockoutPicks[k]; });
      const bracket_data = { groupPicks, bestThirds, knockoutPicks: cleanKo };
      const { error } = await supabase.from('brackets').upsert({
        user_id: user.id,
        bracket_data,
        final_score_home: parseInt(finalScore.home) || 0,
        final_score_away: parseInt(finalScore.away) || 0,
        submitted: false,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
      
      if (error) throw error;
      setSavedMessage('Bracket saved! You can still make changes.');
      setTimeout(() => setSavedMessage(''), 3000);
    } catch (err) {
      alert('Error saving bracket: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || submitted) return;
    if (!isBracketComplete) return alert('Please complete all steps including the final score before submitting.');
    const confirmed = window.confirm('Are you sure you want to submit your bracket? Once submitted, you will not be able to make changes.');
    if (!confirmed) return;
    setSaving(true);
    try {
      const cleanKo = {};
      Object.keys(knockoutPicks).forEach(k => { if (!k.includes('_loser')) cleanKo[k] = knockoutPicks[k]; });
      const bracket_data = { groupPicks, bestThirds, knockoutPicks: cleanKo };
      const { error } = await supabase.from('brackets').upsert({
        user_id: user.id,
        bracket_data,
        final_score_home: parseInt(finalScore.home) || 0,
        final_score_away: parseInt(finalScore.away) || 0,
        submitted: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
      
      if (error) throw error;
      setSubmitted(true);
      setSavedMessage('Bracket submitted successfully!');
      setTimeout(() => setSavedMessage(''), 3000);
    } catch (err) {
      alert('Error submitting bracket: ' + err.message);
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
  const totalKnockoutMatches = [...KO.left_r32, ...KO.left_r16, ...KO.left_qf, ...KO.left_sf, ...KO.right_r32, ...KO.right_r16, ...KO.right_qf, ...KO.right_sf, KO.final, KO.third].length;
  const isKnockoutDone = Object.keys(knockoutPicks).filter(k => !k.includes('_loser')).length >= totalKnockoutMatches;
  const isFinalScoreDone = finalScore.home !== '' && finalScore.home !== null && finalScore.away !== '' && finalScore.away !== null;
  const isBracketComplete = isStage1Done && isStage2Done && isKnockoutDone && isFinalScoreDone;

  return (
    <div className="panel active" style={{padding: '0 20px 40px'}}>
      <div className="wizard-stage-nav">
        <button className={`wizard-btn ${stage===1?'active':''}`} onClick={()=>setStage(1)}>1. Groups</button>
        <button className={`wizard-btn ${stage===2?'active':''} ${!isStage1Done?'locked':''}`} onClick={()=>isStage1Done && setStage(2)}>2. Best 3rds</button>
        <button className={`wizard-btn ${stage===3?'active':''} ${!isStage2Done?'locked':''}`} onClick={()=>isStage2Done && setStage(3)}>3. Knockout</button>
        <button className={`wizard-btn ${stage===4?'active':''} ${!isStage2Done?'locked':''}`} onClick={()=>isStage2Done && setStage(4)}>4. Final Score</button>
        <button className={`wizard-btn ${stage===5?'active':''} ${!isStage2Done?'locked':''}`} onClick={()=>isStage2Done && setStage(5)}>5. Qualifiers</button>
        
        <button className="wizard-btn" onClick={handleSave} disabled={submitted || saving} style={{marginLeft:'auto', background: submitted ? '#888' : 'var(--navy)', color:'white', borderColor: submitted ? '#888' : 'var(--navy)', cursor: submitted ? 'not-allowed' : 'pointer'}}>
          {submitted ? <><Lock size={14}/> Locked</> : saving ? 'Saving...' : <><Save size={14}/> Save</>}
        </button>
        {isBracketComplete && !submitted && (
          <button className="wizard-btn" onClick={handleSubmit} disabled={saving} style={{background:'var(--green)', color:'white', borderColor:'var(--green)'}}>
            <Check size={14}/> Submit Bracket
          </button>
        )}
      </div>
      
      {submitted && <div style={{textAlign:'center', color:'var(--green)', fontWeight:'bold', marginBottom:16, padding:12, background:'rgba(0,128,0,0.1)', borderRadius:8}}>✅ Your bracket has been submitted and locked.</div>}
      
      {savedMessage && <div style={{textAlign:'center', color:'var(--green)', fontWeight:'bold', marginBottom:16}}>{savedMessage}</div>}

      {hasResults && (
        <div className="score-summary">
          <div className="ss-total">
            <Trophy size={22} />
            <span className="ss-num">{score.total}</span>
            <span className="ss-lbl">pts</span>
          </div>
          <div className="ss-break">
            <div><strong>{score.groupPoints}</strong> from group picks</div>
            <div><strong>{score.knockout.points}</strong> from knockout · {score.knockout.correct}/{score.knockout.decided} correct</div>
            {score.final.decided && <div>Final tie-breaker diff: <strong>{score.diff}</strong></div>}
          </div>
          <div className="ss-note">Updates live as results come in. Green = correct pick, red = missed.</div>
        </div>
      )}

      {stage === 1 && (
        <div>
          <h2 style={{textAlign:'center', marginBottom:20}}>Rank the Groups</h2>
          <p style={{textAlign:'center', color:'#888', marginBottom:24}}>Use the arrows to rank the teams 1st through 4th.</p>
          <div className="groups-container">
            {Object.keys(groupPicks).map(g => (
              <div key={g} className="group" style={{padding:12}}>
                <div className="group-header" style={{marginBottom:12, borderRadius:4}}>GROUP {g}</div>
                {groupPicks[g].map((t, i) => {
                  const gItem = score.groups[g]?.finished && i < 2
                    ? score.groups[g].items.find(it => it.pos === i)
                    : null;
                  return (
                  <div key={t} className={`predictor-team rank-${i+1}`}>
                    <div style={{display:'flex', alignItems:'center', gap:12}}>
                      <div className={`rank-badge pos-${i+1}`}>{i+1}</div>
                      <span style={{fontWeight:600}}>{FLAGS[t]} {NAMES[t]||t}</span>
                    </div>
                    <div style={{display:'flex', alignItems:'center', gap:8}}>
                      {gItem && (
                        gItem.status === 'wrong'
                          ? <span className="pick-badge wrong">✗</span>
                          : <span className={`pick-badge ${gItem.status === 'exact' ? 'correct' : 'partial'}`}>+{gItem.points}</span>
                      )}
                      {!submitted && (
                        <div style={{display:'flex', flexDirection:'column', gap:4}}>
                          <button onClick={()=>moveTeam(g, i, -1)} disabled={i===0} style={{border:'none', background:'transparent', cursor:i===0?'default':'pointer', color:i===0?'#ccc':'var(--navy)'}}><ArrowUp size={16}/></button>
                          <button onClick={()=>moveTeam(g, i, 1)} disabled={i===3} style={{border:'none', background:'transparent', cursor:i===3?'default':'pointer', color:i===3?'#ccc':'var(--navy)'}}><ArrowDown size={16}/></button>
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })}
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

      {stage === 5 && (
        <div>
          <h2 style={{textAlign:'center', marginBottom:8}}>My Knockout Qualifiers</h2>
          <p style={{textAlign:'center', color:'#888', marginBottom:24}}>The 32 teams that reached the knockout round. A <strong style={{color:'var(--green)'}}>green ✓</strong> means you picked them to qualify; a <strong style={{color:'var(--red)'}}>red ✗</strong> means you didn't.</p>
          <MyWheelBracket
            groupPicks={groupPicks}
            bestThirds={bestThirds}
            standings={standings}
          />
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
