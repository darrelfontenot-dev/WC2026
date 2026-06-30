import React, { useState, useMemo } from 'react';
import { KO, NAMES, GROUPS } from '../data/constants';
import { useData } from '../context/DataContext';
import { koWinner } from '../lib/scoring';

// Reuse buildKoResults and resolveTeam logic from Knockout.jsx
function sameGroup(t1, t2) {
  return Object.values(GROUPS).some(g => g.includes(t1) && g.includes(t2));
}

function getBestThirdPlaceTeams(standings) {
  const thirds = [];
  Object.keys(standings).forEach(g => {
    const group = standings[g];
    if (group && group.length >= 3) thirds.push({ ...group[2], group: g });
  });
  thirds.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  return thirds.slice(0, 8);
}

const THIRD_PLACE_ASSIGNMENT = {
  '3ABCDF': 'D', '3CDFGH': 'F', '3CEFHI': 'E', '3EHIJK': 'K',
  '3AEHIJ': 'I', '3BEFIJ': 'B', '3EFGIJ': 'J', '3DEIJL': 'L',
};

function resolveThirdPlace(label, standings) {
  const assignedGroup = THIRD_PLACE_ASSIGNMENT[label];
  if (assignedGroup && standings[assignedGroup] && standings[assignedGroup].length >= 3) {
    const team = standings[assignedGroup][2];
    return { name: NAMES[team.code] || team.code, code: team.code };
  }
  return { name: label, code: null };
}

function resolveTeam(label, koResults, standings) {
  if (!label) return { name: 'TBD', code: null };
  const mr = label.match(/^([WL])(\d+)$/);
  if (mr) {
    const type = mr[1], mid = parseInt(mr[2]);
    const r = koResults[mid];
    if (r && r.winner) {
      const c = type === 'W' ? r.winner : (r.homeTeam === r.winner ? r.awayTeam : r.homeTeam);
      return { name: NAMES[c] || c, code: c };
    }
    return { name: label, code: null };
  }
  if (label.match(/^3[A-L]{2,}/)) return resolveThirdPlace(label, standings);
  const gm = label.match(/^([12])([A-L])$/);
  if (gm) {
    const pos = parseInt(gm[1]) - 1;
    const group = gm[2];
    const groupStandings = standings[group];
    if (groupStandings && groupStandings[pos]) {
      const team = groupStandings[pos];
      return { name: NAMES[team.code] || team.code, code: team.code };
    }
    return { name: label, code: null };
  }
  return { name: label, code: null };
}

function buildKoResults(allFixtures, standings) {
  const koResults = {};
  const allKoMatches = [
    ...KO.left_r32, ...KO.right_r32,
    ...KO.left_r16, ...KO.right_r16,
    ...KO.left_qf, ...KO.right_qf,
    ...KO.left_sf, ...KO.right_sf,
    KO.final, KO.third,
  ];
  const koFixtures = allFixtures.filter(f => {
    if (f.status !== 'FT' && f.status !== 'HT' && !f.status.includes("'")) return false;
    if (sameGroup(f.home, f.away)) return false;
    return true;
  });
  const claimed = new Set();
  for (const match of allKoMatches) {
    const fixture = koFixtures.find(f => f.matchNumber === match.id && !claimed.has(f));
    if (fixture) {
      claimed.add(fixture);
      const winner = koWinner(fixture);
      koResults[match.id] = { hs: fixture.hs, as: fixture.as, winner, homeTeam: fixture.home, awayTeam: fixture.away, status: fixture.status };
    }
  }
  for (let pass = 0; pass < 5; pass++) {
    for (const match of allKoMatches) {
      if (koResults[match.id]) continue;
      const hm = resolveTeam(match.home, koResults, standings);
      const aw = resolveTeam(match.away, koResults, standings);
      let fixture = null;
      if (hm.code && aw.code) {
        fixture = koFixtures.find(f => !claimed.has(f) && ((f.home === hm.code && f.away === aw.code) || (f.home === aw.code && f.away === hm.code)));
      }
      if (!fixture && hm.code && !aw.code) fixture = koFixtures.find(f => !claimed.has(f) && (f.home === hm.code || f.away === hm.code));
      else if (!fixture && aw.code && !hm.code) fixture = koFixtures.find(f => !claimed.has(f) && (f.home === aw.code || f.away === aw.code));
      if (fixture) {
        claimed.add(fixture);
        const winner = koWinner(fixture);
        koResults[match.id] = { hs: fixture.hs, as: fixture.as, winner, homeTeam: fixture.home, awayTeam: fixture.away, status: fixture.status };
      }
    }
  }
  return koResults;
}

// Country code to ISO 3166-1 alpha-2 for flag CDN
const CODE_TO_ISO = {
  MEX:'mx',RSA:'za',KOR:'kr',CZE:'cz',CAN:'ca',SUI:'ch',QAT:'qa',BIH:'ba',
  BRA:'br',MAR:'ma',SCO:'gb-sct',HAI:'ht',USA:'us',PAR:'py',AUS:'au',TUR:'tr',
  GER:'de',CUW:'cw',CIV:'ci',ECU:'ec',NED:'nl',JPN:'jp',TUN:'tn',SWE:'se',
  BEL:'be',EGY:'eg',IRN:'ir',NZL:'nz',ESP:'es',URU:'uy',KSA:'sa',CPV:'cv',
  FRA:'fr',SEN:'sn',NOR:'no',IRQ:'iq',ARG:'ar',AUT:'at',ALG:'dz',JOR:'jo',
  POR:'pt',COL:'co',UZB:'uz',COD:'cd',ENG:'gb-eng',CRO:'hr',GHA:'gh',PAN:'pa'
};

function getFlagUrl(code) {
  const iso = CODE_TO_ISO[code];
  if (!iso) return null;
  return `https://flagcdn.com/w160/${iso}.png`;
}

function TeamSlot({ code, name, isWinner, result, onClick }) {
  const flagUrl = code ? getFlagUrl(code) : null;
  return (
    <div
      className={`bv-team ${isWinner ? 'bv-winner' : ''} ${code ? 'bv-clickable' : ''}`}
      onClick={code && result ? onClick : undefined}
      title={code && result ? 'Click to see score' : ''}
    >
      {flagUrl ? (
        <img src={flagUrl} alt={name} className="bv-flag" loading="lazy" />
      ) : (
        <div className="bv-flag bv-flag-placeholder" />
      )}
      <span className="bv-team-name">{name || 'TBD'}</span>
    </div>
  );
}

function ScorePopup({ result, onClose }) {
  if (!result) return null;
  const homeName = NAMES[result.homeTeam] || result.homeTeam;
  const awayName = NAMES[result.awayTeam] || result.awayTeam;
  return (
    <div className="bv-overlay" onClick={onClose}>
      <div className="bv-popup" onClick={e => e.stopPropagation()}>
        <button className="bv-popup-close" onClick={onClose}>✕</button>
        <div className="bv-popup-match">
          <div className="bv-popup-team">
            {getFlagUrl(result.homeTeam) && <img src={getFlagUrl(result.homeTeam)} alt="" className="bv-popup-flag" />}
            <span>{homeName}</span>
          </div>
          <div className="bv-popup-score">{result.hs} – {result.as}</div>
          <div className="bv-popup-team">
            {getFlagUrl(result.awayTeam) && <img src={getFlagUrl(result.awayTeam)} alt="" className="bv-popup-flag" />}
            <span>{awayName}</span>
          </div>
        </div>
        <div className="bv-popup-status">{result.status === 'FT' ? 'Full Time' : result.status}</div>
      </div>
    </div>
  );
}

// Build bracket data: for each slot, determine which match produced the team
function getMatchForTeam(code, matchId, koResults) {
  const r = koResults[matchId];
  if (r && (r.homeTeam === code || r.awayTeam === code)) return r;
  return null;
}

export default function BracketVisual() {
  const { standings, allFixtures } = useData();
  const koResults = useMemo(() => buildKoResults(allFixtures, standings), [allFixtures, standings]);
  const [popup, setPopup] = useState(null);

  // Build resolved bracket structure
  const resolve = (matches) => matches.map(m => {
    const hm = resolveTeam(m.home, koResults, standings);
    const aw = resolveTeam(m.away, koResults, standings);
    const r = koResults[m.id];
    if (r) {
      if (r.homeTeam) hm.code = r.homeTeam;
      if (r.awayTeam) aw.code = r.awayTeam;
      if (r.homeTeam) hm.name = NAMES[r.homeTeam] || r.homeTeam;
      if (r.awayTeam) aw.name = NAMES[r.awayTeam] || r.awayTeam;
    }
    return { id: m.id, home: hm, away: aw, result: r, info: m.info };
  });

  const leftR32 = resolve(KO.left_r32);
  const leftR16 = resolve(KO.left_r16);
  const leftQF = resolve(KO.left_qf);
  const leftSF = resolve(KO.left_sf);
  const rightR32 = resolve(KO.right_r32);
  const rightR16 = resolve(KO.right_r16);
  const rightQF = resolve(KO.right_qf);
  const rightSF = resolve(KO.right_sf);
  const finalMatch = resolve([KO.final])[0];
  const thirdMatch = resolve([KO.third])[0];

  // For advancing teams: find the match result that got them there
  function findResultForTeam(code, matchId) {
    if (!code) return null;
    return koResults[matchId] || null;
  }

  // Render a column of matches (each match = 2 team slots)
  const renderRound = (matches, roundLabel) => (
    <div className="bv-round">
      <div className="bv-round-label">{roundLabel}</div>
      {matches.map(m => (
        <div key={m.id} className="bv-matchup">
          <TeamSlot
            code={m.home.code}
            name={m.home.name}
            isWinner={m.result?.winner === m.home.code}
            result={m.result}
            onClick={() => setPopup(m.result)}
          />
          <TeamSlot
            code={m.away.code}
            name={m.away.name}
            isWinner={m.result?.winner === m.away.code}
            result={m.result}
            onClick={() => setPopup(m.result)}
          />
        </div>
      ))}
    </div>
  );

  const champ = koResults[104]?.winner;

  return (
    <div className="bv-container">
      <h1 className="bv-title">🏆 FIFA World Cup 2026 Bracket</h1>
      {champ && (
        <div className="bv-champion">
          {getFlagUrl(champ) && <img src={getFlagUrl(champ)} className="bv-champ-flag" alt="" />}
          <span>{NAMES[champ]} – WORLD CHAMPIONS!</span>
        </div>
      )}
      <div className="bv-bracket">
        {renderRound(leftR32, 'R32')}
        {renderRound(leftR16, 'R16')}
        {renderRound(leftQF, 'QF')}
        {renderRound(leftSF, 'SF')}
        <div className="bv-round bv-final-round">
          <div className="bv-round-label">Final</div>
          <div className="bv-matchup bv-final-matchup">
            <TeamSlot
              code={finalMatch.home.code}
              name={finalMatch.home.name}
              isWinner={koResults[104]?.winner === finalMatch.home.code}
              result={finalMatch.result}
              onClick={() => setPopup(finalMatch.result)}
            />
            <div className="bv-trophy">🏆</div>
            <TeamSlot
              code={finalMatch.away.code}
              name={finalMatch.away.name}
              isWinner={koResults[104]?.winner === finalMatch.away.code}
              result={finalMatch.result}
              onClick={() => setPopup(finalMatch.result)}
            />
          </div>
          <div className="bv-round-label bv-third-label">3rd Place</div>
          <div className="bv-matchup">
            <TeamSlot
              code={thirdMatch.home.code}
              name={thirdMatch.home.name}
              isWinner={koResults[103]?.winner === thirdMatch.home.code}
              result={thirdMatch.result}
              onClick={() => setPopup(thirdMatch.result)}
            />
            <TeamSlot
              code={thirdMatch.away.code}
              name={thirdMatch.away.name}
              isWinner={koResults[103]?.winner === thirdMatch.away.code}
              result={thirdMatch.result}
              onClick={() => setPopup(thirdMatch.result)}
            />
          </div>
        </div>
        {renderRound(rightSF, 'SF')}
        {renderRound(rightQF, 'QF')}
        {renderRound(rightR16, 'R16')}
        {renderRound(rightR32, 'R32')}
      </div>
      {popup && <ScorePopup result={popup} onClose={() => setPopup(null)} />}

      <style>{`
        .bv-container { padding: 1rem; overflow-x: auto; }
        .bv-title { text-align: center; margin-bottom: 0.5rem; font-size: 1.5rem; }
        .bv-champion { text-align: center; font-size: 1.2rem; font-weight: bold; color: gold; margin-bottom: 1rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
        .bv-champ-flag { width: 48px; height: auto; border-radius: 4px; }
        .bv-bracket { display: flex; align-items: center; gap: 0; min-width: 1400px; justify-content: center; }
        .bv-round { display: flex; flex-direction: column; justify-content: space-around; min-height: 600px; padding: 0 0.25rem; }
        .bv-round-label { text-align: center; font-weight: 700; font-size: 0.75rem; text-transform: uppercase; color: #888; margin-bottom: 0.5rem; letter-spacing: 1px; }
        .bv-matchup { display: flex; flex-direction: column; margin: 0.35rem 0; border: 1px solid #333; border-radius: 6px; overflow: hidden; background: #1a1a2e; }
        .bv-team { display: flex; align-items: center; gap: 0.4rem; padding: 0.3rem 0.5rem; border-bottom: 1px solid #222; min-width: 130px; transition: background 0.15s; }
        .bv-team:last-child { border-bottom: none; }
        .bv-clickable { cursor: pointer; }
        .bv-clickable:hover { background: #2a2a4e; }
        .bv-winner { background: #1b3d1b; }
        .bv-winner:hover { background: #2a5a2a; }
        .bv-flag { width: 28px; height: 20px; object-fit: cover; border-radius: 3px; flex-shrink: 0; }
        .bv-flag-placeholder { background: #333; width: 28px; height: 20px; border-radius: 3px; }
        .bv-team-name { font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .bv-final-round { align-items: center; }
        .bv-final-matchup { min-width: 160px; }
        .bv-trophy { text-align: center; font-size: 2rem; margin: 0.25rem 0; }
        .bv-third-label { margin-top: 1rem; color: #a77; }
        .bv-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .bv-popup { background: #1e1e2e; border: 1px solid #444; border-radius: 12px; padding: 1.5rem 2rem; min-width: 300px; position: relative; }
        .bv-popup-close { position: absolute; top: 0.5rem; right: 0.75rem; background: none; border: none; color: #aaa; font-size: 1.2rem; cursor: pointer; }
        .bv-popup-match { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
        .bv-popup-team { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; }
        .bv-popup-flag { width: 64px; height: auto; border-radius: 4px; }
        .bv-popup-score { font-size: 2rem; font-weight: bold; }
        .bv-popup-status { text-align: center; margin-top: 0.75rem; color: #888; font-size: 0.85rem; }
        @media (prefers-color-scheme: light) {
          .bv-matchup { background: #f1f5f9; border-color: #cbd5e1; }
          .bv-team { border-bottom-color: #e2e8f0; }
          .bv-clickable:hover { background: #e2e8f0; }
          .bv-winner { background: #d1fae5; }
          .bv-winner:hover { background: #bbf7d0; }
          .bv-flag-placeholder { background: #cbd5e1; }
          .bv-team-name { color: #1e293b; }
          .bv-round-label { color: #64748b; }
          .bv-overlay { background: rgba(0,0,0,0.4); }
          .bv-popup { background: #ffffff; border-color: #e2e8f0; color: #1e293b; }
          .bv-popup-close { color: #64748b; }
          .bv-popup-status { color: #64748b; }
          .bv-champion { color: #b45309; }
          .bv-third-label { color: #9f1239; }
        }
        [data-theme="light"] .bv-matchup { background: #f1f5f9; border-color: #cbd5e1; }
        [data-theme="light"] .bv-team { border-bottom-color: #e2e8f0; }
        [data-theme="light"] .bv-clickable:hover { background: #e2e8f0; }
        [data-theme="light"] .bv-winner { background: #d1fae5; }
        [data-theme="light"] .bv-winner:hover { background: #bbf7d0; }
        [data-theme="light"] .bv-flag-placeholder { background: #cbd5e1; }
        [data-theme="light"] .bv-team-name { color: #1e293b; }
        [data-theme="light"] .bv-round-label { color: #64748b; }
        [data-theme="light"] .bv-popup { background: #ffffff; border-color: #e2e8f0; color: #1e293b; }
        [data-theme="light"] .bv-popup-close { color: #64748b; }
        [data-theme="light"] .bv-popup-status { color: #64748b; }
        [data-theme="light"] .bv-champion { color: #b45309; }
        [data-theme="light"] .bv-third-label { color: #9f1239; }
      `}</style>
    </div>
  );
}
