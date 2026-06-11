import React from 'react';
import { KO, FLAGS, NAMES } from '../data/constants';

// We'll pass empty koResults for the Live Bracket since knockout data isn't fetched from API yet.
const resolveTeam = (label, koResults) => {
  if (!label) return { name: 'TBD', code: null };
  const mr = label.match(/^([WL])(\d+)$/);
  if (mr) {
    const type = mr[1], mid = parseInt(mr[2]);
    const r = koResults[mid];
    if (r && r.winner) {
      const c = type === 'W' ? r.winner : (r.homeTeam === r.winner ? r.awayTeam : r.homeTeam);
      return { name: `${FLAGS[c] || ''} ${c}`, code: c };
    }
    return { name: label, code: null };
  }
  // For group placeholders like 1A, 2B
  return { name: label, code: null };
};

const MatchBlock = ({ match, koResults }) => {
  const hm = resolveTeam(match.home, koResults);
  const aw = resolveTeam(match.away, koResults);
  const r = koResults[match.id];
  const has = r && r.hs !== null && r.hs !== undefined;
  
  let hc = 'team', ac = 'team';
  if (r?.winner) {
    if (r.winner === hm.code) hc += ' winner';
    if (r.winner === aw.code) ac += ' winner';
  }

  return (
    <div className="ko-match">
      <div className="match-info">{match.info}</div>
      <div className={hc}><span className="team-name">{hm.name}</span><span className="score">{has ? r.hs : ''}</span></div>
      <div className={ac}><span className="team-name">{aw.name}</span><span className="score">{has ? r.as : ''}</span></div>
    </div>
  );
};

export default function Knockout() {
  const koResults = {}; // This would be populated from API if tournament was live
  const champ = null;

  return (
    <div className="panel active">
      <div className="bracket-wrap">
        <div className="knockout">
          <div className="round">
            <div className="round-header">Round of 32</div>
            {KO.left_r32.map(m => <MatchBlock key={m.id} match={m} koResults={koResults} />)}
          </div>
          <div className="round">
            <div className="round-header">Round of 16</div>
            {KO.left_r16.map(m => <MatchBlock key={m.id} match={m} koResults={koResults} />)}
          </div>
          <div className="round">
            <div className="round-header">Quarterfinals</div>
            {KO.left_qf.map(m => <MatchBlock key={m.id} match={m} koResults={koResults} />)}
          </div>
          <div className="round">
            <div className="round-header">Semifinals</div>
            {KO.left_sf.map(m => <MatchBlock key={m.id} match={m} koResults={koResults} />)}
          </div>
          
          <div className="final-area">
            {champ && <div className="champion-banner">{FLAGS[champ] || ''} {NAMES[champ] || champ} – WORLD CHAMPIONS!</div>}
            <div className="trophy">🏆</div>
            <div className="final-label">FINAL</div>
            <MatchBlock match={KO.final} koResults={koResults} />
            <div className="third-label">3RD PLACE</div>
            <MatchBlock match={KO.third} koResults={koResults} />
          </div>

          <div className="round">
            <div className="round-header">Semifinals</div>
            {KO.right_sf.map(m => <MatchBlock key={m.id} match={m} koResults={koResults} />)}
          </div>
          <div className="round">
            <div className="round-header">Quarterfinals</div>
            {KO.right_qf.map(m => <MatchBlock key={m.id} match={m} koResults={koResults} />)}
          </div>
          <div className="round">
            <div className="round-header">Round of 16</div>
            {KO.right_r16.map(m => <MatchBlock key={m.id} match={m} koResults={koResults} />)}
          </div>
          <div className="round">
            <div className="round-header">Round of 32</div>
            {KO.right_r32.map(m => <MatchBlock key={m.id} match={m} koResults={koResults} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
