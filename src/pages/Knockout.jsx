import React from 'react';
import { KO, FLAGS, NAMES } from '../data/constants';
import { useData } from '../context/DataContext';

// Determine which 4 best third-place teams advance based on standings
function getBestThirdPlaceTeams(standings) {
  const thirds = [];
  Object.keys(standings).forEach(g => {
    const group = standings[g];
    if (group && group.length >= 3) {
      thirds.push({ ...group[2], group: g });
    }
  });
  // Sort by pts desc, then gd desc, then gf desc
  thirds.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  return thirds.slice(0, 8); // top 8 third-place teams advance in 48-team format
}

// Map third-place qualifier slots (e.g. "3ABCDF") to actual teams
function resolveThirdPlace(label, standings) {
  const bestThirds = getBestThirdPlaceTeams(standings);
  const allowedGroups = label.replace('3', '').split('');
  const match = bestThirds.find(t => allowedGroups.includes(t.group));
  if (match) {
    return { name: `${FLAGS[match.code] || ''} ${NAMES[match.code] || match.code}`, code: match.code };
  }
  return { name: label, code: null };
}

const resolveTeam = (label, koResults, standings) => {
  if (!label) return { name: 'TBD', code: null };
  // Knockout match winner/loser reference (e.g. W74, L101)
  const mr = label.match(/^([WL])(\d+)$/);
  if (mr) {
    const type = mr[1], mid = parseInt(mr[2]);
    const r = koResults[mid];
    if (r && r.winner) {
      const c = type === 'W' ? r.winner : (r.homeTeam === r.winner ? r.awayTeam : r.homeTeam);
      return { name: `${FLAGS[c] || ''} ${NAMES[c] || c}`, code: c };
    }
    return { name: label, code: null };
  }
  // Third-place placeholder (e.g. 3ABCDF)
  if (label.match(/^3[A-L]{2,}/)) {
    return resolveThirdPlace(label, standings);
  }
  // Group position placeholder (e.g. 1A = 1st in Group A, 2B = 2nd in Group B)
  const gm = label.match(/^([12])([A-L])$/);
  if (gm) {
    const pos = parseInt(gm[1]) - 1; // 0-indexed
    const group = gm[2];
    const groupStandings = standings[group];
    if (groupStandings && groupStandings[pos] && groupStandings[pos].mp >= 3) {
      const team = groupStandings[pos];
      return { name: `${FLAGS[team.code] || ''} ${NAMES[team.code] || team.code}`, code: team.code };
    }
    return { name: label, code: null };
  }
  return { name: label, code: null };
};

const MatchBlock = ({ match, koResults, standings }) => {
  const hm = resolveTeam(match.home, koResults, standings);
  const aw = resolveTeam(match.away, koResults, standings);
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
  const { standings } = useData();
  const koResults = {}; // Populated from API once knockout matches are played
  const champ = null;

  return (
    <div className="panel active">
      <div className="bracket-wrap">
        <div className="knockout">
          <div className="round">
            <div className="round-header">Round of 32</div>
            {KO.left_r32.map(m => <MatchBlock key={m.id} match={m} koResults={koResults} standings={standings} />)}
          </div>
          <div className="round">
            <div className="round-header">Round of 16</div>
            {KO.left_r16.map(m => <MatchBlock key={m.id} match={m} koResults={koResults} standings={standings} />)}
          </div>
          <div className="round">
            <div className="round-header">Quarterfinals</div>
            {KO.left_qf.map(m => <MatchBlock key={m.id} match={m} koResults={koResults} standings={standings} />)}
          </div>
          <div className="round">
            <div className="round-header">Semifinals</div>
            {KO.left_sf.map(m => <MatchBlock key={m.id} match={m} koResults={koResults} standings={standings} />)}
          </div>
          
          <div className="final-area">
            {champ && <div className="champion-banner">{FLAGS[champ] || ''} {NAMES[champ] || champ} – WORLD CHAMPIONS!</div>}
            <div className="trophy">🏆</div>
            <div className="final-label">FINAL</div>
            <MatchBlock match={KO.final} koResults={koResults} standings={standings} />
            <div className="third-label">3RD PLACE</div>
            <MatchBlock match={KO.third} koResults={koResults} standings={standings} />
          </div>

          <div className="round">
            <div className="round-header">Semifinals</div>
            {KO.right_sf.map(m => <MatchBlock key={m.id} match={m} koResults={koResults} standings={standings} />)}
          </div>
          <div className="round">
            <div className="round-header">Quarterfinals</div>
            {KO.right_qf.map(m => <MatchBlock key={m.id} match={m} koResults={koResults} standings={standings} />)}
          </div>
          <div className="round">
            <div className="round-header">Round of 16</div>
            {KO.right_r16.map(m => <MatchBlock key={m.id} match={m} koResults={koResults} standings={standings} />)}
          </div>
          <div className="round">
            <div className="round-header">Round of 32</div>
            {KO.right_r32.map(m => <MatchBlock key={m.id} match={m} koResults={koResults} standings={standings} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
