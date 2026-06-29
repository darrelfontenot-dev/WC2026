import React, { useMemo } from 'react';
import { GROUPS, FLAGS, NAMES, KO } from '../data/constants';
import { scoreBracket, KO_MATCHES } from '../lib/scoring';
import { Trophy } from 'lucide-react';

const ROUND_ORDER = ['R32', 'R16', 'QF', 'SF', 'Final', '3rd Place'];
const ROUND_LABEL = { R32: 'Round of 32', R16: 'Round of 16', QF: 'Quarterfinals', SF: 'Semifinals', Final: 'Final', '3rd Place': '3rd Place' };

// Match definitions keyed by id (for resolving W/L participant labels).
const MATCH_BY_ID = {};
KO_MATCHES.forEach((m) => { MATCH_BY_ID[m.id] = m; });

const teamLabel = (code) => (code ? `${FLAGS[code] || ''} ${NAMES[code] || code}` : null);

export default function BracketView({ username, bracketData, finalScoreHome, finalScoreAway, standings, allFixtures }) {
  const groupPicks = bracketData?.groupPicks || GROUPS;
  const bestThirds = bracketData?.bestThirds || [];
  const knockoutPicks = bracketData?.knockoutPicks || {};

  const score = useMemo(() => scoreBracket(
    { bracket_data: { groupPicks, bestThirds, knockoutPicks }, final_score_home: finalScoreHome || 0, final_score_away: finalScoreAway || 0 },
    standings || {},
    allFixtures || [],
  ), [groupPicks, bestThirds, knockoutPicks, finalScoreHome, finalScoreAway, standings, allFixtures]);

  // Resolve each 3rd-place placeholder to the team this bracket assigned to it.
  const resolvedThirds = useMemo(() => {
    const teamToGroup = {};
    Object.keys(groupPicks).forEach((g) => { teamToGroup[groupPicks[g][2]] = g; });
    const slots = [
      { key: '3CEFHI', allowed: 'CEFHI' }, { key: '3EFGIJ', allowed: 'EFGIJ' },
      { key: '3BEFIJ', allowed: 'BEFIJ' }, { key: '3ABCDF', allowed: 'ABCDF' },
      { key: '3AEHIJ', allowed: 'AEHIJ' }, { key: '3CDFGH', allowed: 'CDFGH' },
      { key: '3DEIJL', allowed: 'DEIJL' }, { key: '3EHIJK', allowed: 'EHIJK' },
    ];
    const teams = [...bestThirds];
    const result = new Array(slots.length).fill(null);
    const used = new Array(teams.length).fill(false);
    const solve = (i) => {
      if (i === slots.length) return true;
      for (let t = 0; t < teams.length; t++) {
        if (used[t]) continue;
        const grp = teamToGroup[teams[t]];
        if (!grp || !slots[i].allowed.includes(grp)) continue;
        used[t] = true; result[i] = teams[t];
        if (solve(i + 1)) return true;
        used[t] = false; result[i] = null;
      }
      return false;
    };
    solve(0);
    const out = {};
    slots.forEach((s, idx) => { if (result[idx]) out[s.key] = result[idx]; });
    return out;
  }, [groupPicks, bestThirds]);

  // Resolve a bracket-slot label (group pos, W#, L#, 3rd placeholder) to a team code.
  const winnerOf = (id) => knockoutPicks[id] || null;
  const resolveSlot = (label) => {
    if (!label) return null;
    const w = label.match(/^W(\d+)$/);
    if (w) return winnerOf(parseInt(w[1]));
    const l = label.match(/^L(\d+)$/);
    if (l) {
      const id = parseInt(l[1]);
      const m = MATCH_BY_ID[id];
      const win = winnerOf(id);
      if (!m || !win) return null;
      const home = resolveSlot(m.home), away = resolveSlot(m.away);
      return home === win ? away : away === win ? home : null;
    }
    const gp = label.match(/^(\d)([A-L])$/);
    if (gp) return (groupPicks[gp[2]] || [])[parseInt(gp[1]) - 1] || null;
    if (label.startsWith('3')) return resolvedThirds[label] || null;
    return null;
  };

  const koByRound = useMemo(() => {
    const map = {};
    ROUND_ORDER.forEach((r) => { map[r] = []; });
    KO_MATCHES.forEach((m) => { (map[m.round] = map[m.round] || []).push(m); });
    return map;
  }, []);

  const koItemById = useMemo(() => {
    const map = {};
    score.knockout.items.forEach((it) => { map[it.id] = it; });
    return map;
  }, [score]);

  return (
    <div className="bracket-view">
      <div className="bv-head">
        <h2>{username}'s Bracket</h2>
        <div className="score-summary" style={{ margin: '12px 0 0' }}>
          <div className="ss-total"><Trophy size={22} /><span className="ss-num">{score.total}</span><span className="ss-lbl">pts</span></div>
          <div className="ss-break">
            <div><strong>{score.groupPoints}</strong> from group picks</div>
            <div><strong>{score.knockout.points}</strong> from knockout · {score.knockout.correct}/{score.knockout.decided} correct</div>
            {score.final.decided && <div>Final tie-breaker diff: <strong>{score.diff}</strong></div>}
          </div>
        </div>
      </div>

      <h3 className="bv-section">Group Stage</h3>
      <div className="groups-container" style={{ padding: 0 }}>
        {Object.keys(groupPicks).map((g) => (
          <div key={g} className="group" style={{ padding: 12 }}>
            <div className="group-header" style={{ marginBottom: 10, borderRadius: 4 }}>GROUP {g}</div>
            {groupPicks[g].map((t, i) => {
              const gItem = score.groups[g]?.finished && i < 2 ? score.groups[g].items.find((it) => it.pos === i) : null;
              return (
                <div key={t} className={`predictor-team rank-${i + 1}`}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className={`rank-badge pos-${i + 1}`}>{i + 1}</div>
                    <span style={{ fontWeight: 600 }}>{FLAGS[t]} {NAMES[t] || t}</span>
                  </div>
                  {gItem && (gItem.status === 'wrong'
                    ? <span className="pick-badge wrong">✗</span>
                    : <span className={`pick-badge ${gItem.status === 'exact' ? 'correct' : 'partial'}`}>+{gItem.points}</span>)}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <h3 className="bv-section">Knockout Stage</h3>
      {ROUND_ORDER.map((round) => (
        <div key={round} className="bv-round-block">
          <div className="bv-round-title">{ROUND_LABEL[round]}</div>
          <div className="bv-ko-grid">
            {koByRound[round].map((m) => {
              const home = resolveSlot(m.home);
              const away = resolveSlot(m.away);
              const picked = winnerOf(m.id);
              const ki = koItemById[m.id];
              const decided = !!(ki && ki.decided);
              const actualWinner = ki ? ki.actualWinner : null;
              const cellClass = (code) => {
                let cls = 'bv-team';
                if (picked === code && code) cls += ' picked';
                if (decided && picked === code && code) cls += actualWinner === code ? ' correct' : ' wrong';
                return cls;
              };
              return (
                <div key={m.id} className={`bv-ko-match ${decided ? 'decided' : ''}`}>
                  <div className={cellClass(home)}>{teamLabel(home) || m.home}</div>
                  <div className={cellClass(away)}>{teamLabel(away) || m.away}</div>
                  {decided && (
                    <div className={`bv-ko-result ${ki.correct ? 'correct' : 'wrong'}`}>
                      {ki.correct ? `✓ +${ki.points}` : `✗ ${actualWinner ? `${FLAGS[actualWinner] || ''} ${actualWinner}` : ''}`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {(finalScoreHome != null || finalScoreAway != null) && (
        <div className="bv-final-score">
          Predicted final score: <strong>{resolveSlot(KO.final.home) || 'TBD'} {finalScoreHome ?? 0} – {finalScoreAway ?? 0} {resolveSlot(KO.final.away) || 'TBD'}</strong>
        </div>
      )}
    </div>
  );
}
