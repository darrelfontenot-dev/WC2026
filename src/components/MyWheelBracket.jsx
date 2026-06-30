import React, { useMemo } from 'react';
import { GROUPS, FLAGS, NAMES } from '../data/constants';
import { isGroupFinished } from '../lib/scoring';
import { Check, X } from 'lucide-react';

// Pick the 8 best third-place teams from current standings (FIFA 48-team format).
function bestThirdPlace(standings) {
  const thirds = [];
  Object.keys(standings).forEach((g) => {
    const row = standings[g];
    if (row && row.length >= 3) thirds.push({ ...row[2], group: g });
  });
  thirds.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  return thirds.slice(0, 8);
}

/**
 * Shows the 32 teams that reached the knockout round and whether the user
 * picked each of them to qualify (anywhere in their bracket) — not tied to a
 * specific match slot. Green check = picked, red ✗ = not picked.
 */
export default function MyWheelBracket({ groupPicks = {}, bestThirds = [], standings = {} }) {
  const allGroupsFinished = useMemo(
    () => Object.keys(GROUPS).every((g) => isGroupFinished(standings, g)),
    [standings],
  );

  // Teams the user predicted to qualify: their top-2 of every group + their
  // selected best-third-place teams.
  const pickedSet = useMemo(() => {
    const s = new Set();
    Object.keys(GROUPS).forEach((g) => {
      const picks = groupPicks[g] || GROUPS[g];
      if (picks[0]) s.add(picks[0]);
      if (picks[1]) s.add(picks[1]);
    });
    (bestThirds || []).forEach((c) => s.add(c));
    return s;
  }, [groupPicks, bestThirds]);

  // Actual qualifiers from live standings.
  const { groupQualifiers, thirdQualifiers, ready } = useMemo(() => {
    const gq = [];
    Object.keys(GROUPS).forEach((g) => {
      const row = standings[g] || [];
      if (row[0]) gq.push({ ...row[0], group: g, pos: 1 });
      if (row[1]) gq.push({ ...row[1], group: g, pos: 2 });
    });
    const tq = bestThirdPlace(standings).map((t) => ({ ...t, pos: 3 }));
    return { groupQualifiers: gq, thirdQualifiers: tq, ready: gq.length > 0 };
  }, [standings]);

  const allQualifiers = [...groupQualifiers, ...thirdQualifiers];
  const correctCount = allQualifiers.filter((t) => pickedSet.has(t.code)).length;

  // Teams the user picked who did NOT make the knockout round.
  const qualifiedCodes = new Set(allQualifiers.map((t) => t.code));
  const missedPicks = [...pickedSet].filter((c) => !qualifiedCodes.has(c));

  if (!ready) {
    return (
      <div className="empty-state">
        <div className="empty-icon"><Check size={40} /></div>
        <h3 className="empty-title">Qualifiers not available yet</h3>
        <p className="empty-msg">Once group standings load, the 32 knockout teams will appear here with your picks marked.</p>
      </div>
    );
  }

  const TeamCard = ({ team }) => {
    const picked = pickedSet.has(team.code);
    return (
      <div className={`qual-card ${picked ? 'picked' : 'missed'}`}>
        <span className="qual-flag">{FLAGS[team.code] || ''}</span>
        <span className="qual-name">{NAMES[team.code] || team.code}</span>
        <span className={`qual-mark ${picked ? 'yes' : 'no'}`} aria-label={picked ? 'You picked this team' : 'You did not pick this team'}>
          {picked ? <Check size={16} /> : <X size={16} />}
        </span>
      </div>
    );
  };

  return (
    <div className="qual-wrap">
      <div className="qual-summary">
        You correctly picked <strong>{correctCount}</strong> of <strong>{allQualifiers.length}</strong> knockout qualifiers.
        {!allGroupsFinished && <span className="qual-provisional"> · Provisional (groups still in progress)</span>}
      </div>

      <h3 className="qual-section">Group Winners &amp; Runners-up</h3>
      <div className="qual-groups">
        {Object.keys(GROUPS).map((g) => {
          const teams = groupQualifiers.filter((t) => t.group === g);
          if (teams.length === 0) return null;
          return (
            <div key={g} className="qual-group">
              <div className="qual-group-label">Group {g}</div>
              {teams.map((t) => <TeamCard key={t.code} team={t} />)}
            </div>
          );
        })}
      </div>

      {thirdQualifiers.length > 0 && (
        <>
          <h3 className="qual-section">Best Third-Place Teams</h3>
          <div className="qual-grid">
            {thirdQualifiers.map((t) => <TeamCard key={t.code} team={t} />)}
          </div>
        </>
      )}

      {missedPicks.length > 0 && (
        <>
          <h3 className="qual-section">Teams You Picked That Didn’t Qualify</h3>
          <div className="qual-grid">
            {missedPicks.map((code) => (
              <div key={code} className="qual-card faded">
                <span className="qual-flag">{FLAGS[code] || ''}</span>
                <span className="qual-name">{NAMES[code] || code}</span>
                <span className="qual-mark no"><X size={16} /></span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="wheel-legend">
        <span><i className="wl-dot correct" /> You picked them</span>
        <span><i className="wl-dot wrong" /> You didn’t pick them</span>
      </div>
    </div>
  );
}
