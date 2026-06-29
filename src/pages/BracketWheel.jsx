import React, { useState, useMemo } from 'react';
import { KO, NAMES, GROUPS } from '../data/constants';
import { useData } from '../context/DataContext';

// --- Reused logic ---
function sameGroup(t1, t2) {
  return Object.values(GROUPS).some(g => g.includes(t1) && g.includes(t2));
}

const THIRD_PLACE_ASSIGNMENT = {
  '3ABCDF': 'D', '3CDFGH': 'F', '3CEFHI': 'E', '3EHIJK': 'K',
  '3AEHIJ': 'I', '3BEFIJ': 'B', '3EFGIJ': 'J', '3DEIJL': 'L',
};

function resolveThirdPlace(label, standings) {
  const g = THIRD_PLACE_ASSIGNMENT[label];
  if (g && standings[g] && standings[g].length >= 3) {
    const t = standings[g][2];
    return { name: NAMES[t.code] || t.code, code: t.code };
  }
  return { name: label, code: null };
}

function resolveTeam(label, koResults, standings) {
  if (!label) return { name: 'TBD', code: null };
  const mr = label.match(/^([WL])(\d+)$/);
  if (mr) {
    const r = koResults[parseInt(mr[2])];
    if (r && r.winner) {
      const c = mr[1] === 'W' ? r.winner : (r.homeTeam === r.winner ? r.awayTeam : r.homeTeam);
      return { name: NAMES[c] || c, code: c };
    }
    return { name: label, code: null };
  }
  if (label.match(/^3[A-L]{2,}/)) return resolveThirdPlace(label, standings);
  const gm = label.match(/^([12])([A-L])$/);
  if (gm) {
    const pos = parseInt(gm[1]) - 1, group = gm[2];
    if (standings[group] && standings[group][pos]) {
      const t = standings[group][pos];
      return { name: NAMES[t.code] || t.code, code: t.code };
    }
    return { name: label, code: null };
  }
  return { name: label, code: null };
}

function buildKoResults(allFixtures, standings) {
  const koResults = {};
  const allKoMatches = [
    ...KO.left_r32, ...KO.right_r32, ...KO.left_r16, ...KO.right_r16,
    ...KO.left_qf, ...KO.right_qf, ...KO.left_sf, ...KO.right_sf, KO.final, KO.third,
  ];
  const koFixtures = allFixtures.filter(f => {
    if (f.status !== 'FT' && f.status !== 'HT' && !f.status.includes("'")) return false;
    return !sameGroup(f.home, f.away);
  });
  const claimed = new Set();
  for (const match of allKoMatches) {
    const fixture = koFixtures.find(f => f.matchNumber === match.id && !claimed.has(f));
    if (fixture) {
      claimed.add(fixture);
      let winner = null;
      if (fixture.status === 'FT') winner = fixture.hs > fixture.as ? fixture.home : fixture.as > fixture.hs ? fixture.away : fixture.home;
      koResults[match.id] = { hs: fixture.hs, as: fixture.as, winner, homeTeam: fixture.home, awayTeam: fixture.away, status: fixture.status };
    }
  }
  for (let pass = 0; pass < 5; pass++) {
    for (const match of allKoMatches) {
      if (koResults[match.id]) continue;
      const hm = resolveTeam(match.home, koResults, standings);
      const aw = resolveTeam(match.away, koResults, standings);
      let fixture = null;
      if (hm.code && aw.code) fixture = koFixtures.find(f => !claimed.has(f) && ((f.home === hm.code && f.away === aw.code) || (f.home === aw.code && f.away === hm.code)));
      if (!fixture && hm.code && !aw.code) fixture = koFixtures.find(f => !claimed.has(f) && (f.home === hm.code || f.away === hm.code));
      else if (!fixture && aw.code && !hm.code) fixture = koFixtures.find(f => !claimed.has(f) && (f.home === aw.code || f.away === aw.code));
      if (fixture) {
        claimed.add(fixture);
        let winner = null;
        if (fixture.status === 'FT') winner = fixture.hs > fixture.as ? fixture.home : fixture.as > fixture.hs ? fixture.away : fixture.home;
        koResults[match.id] = { hs: fixture.hs, as: fixture.as, winner, homeTeam: fixture.home, awayTeam: fixture.away, status: fixture.status };
      }
    }
  }
  return koResults;
}

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
  return iso ? `https://flagcdn.com/w160/${iso}.png` : null;
}

// --- Wheel rendering with SVG ---
// The bracket is a circle. R32 = outermost ring (16 matches = 32 slots), 
// R16 = next ring (8 matches = 16 slots), QF = 4 matches, SF = 2, Final = center.
// Each "match" occupies an arc. The winner advances inward.

function polarToCart(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function ScorePopup({ result, onClose }) {
  if (!result) return null;
  const homeName = NAMES[result.homeTeam] || result.homeTeam;
  const awayName = NAMES[result.awayTeam] || result.awayTeam;
  return (
    <div className="bw-overlay" onClick={onClose}>
      <div className="bw-popup" onClick={e => e.stopPropagation()}>
        <button className="bw-popup-close" onClick={onClose}>✕</button>
        <div className="bw-popup-match">
          <div className="bw-popup-team">
            {getFlagUrl(result.homeTeam) && <img src={getFlagUrl(result.homeTeam)} alt="" className="bw-popup-flag" />}
            <span>{homeName}</span>
          </div>
          <div className="bw-popup-score">{result.hs} – {result.as}</div>
          <div className="bw-popup-team">
            {getFlagUrl(result.awayTeam) && <img src={getFlagUrl(result.awayTeam)} alt="" className="bw-popup-flag" />}
            <span>{awayName}</span>
          </div>
        </div>
        <div className="bw-popup-status">{result.status === 'FT' ? 'Full Time' : result.status}</div>
      </div>
    </div>
  );
}

// Arc segment component
function ArcSegment({ cx, cy, innerR, outerR, startAngle, endAngle, team, isWinner, result, onClickResult }) {
  // Draw a filled arc (annular sector)
  const gap = 0.4; // degree gap between segments
  const sa = startAngle + gap;
  const ea = endAngle - gap;
  
  const p1 = polarToCart(cx, cy, outerR, sa);
  const p2 = polarToCart(cx, cy, outerR, ea);
  const p3 = polarToCart(cx, cy, innerR, ea);
  const p4 = polarToCart(cx, cy, innerR, sa);
  
  const arcSweep = ea - sa > 180 ? 1 : 0;
  
  const d = [
    `M ${p1.x} ${p1.y}`,
    `A ${outerR} ${outerR} 0 ${arcSweep} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${innerR} ${innerR} 0 ${arcSweep} 0 ${p4.x} ${p4.y}`,
    'Z'
  ].join(' ');

  const midAngle = (sa + ea) / 2;
  const textR = (innerR + outerR) / 2;
  const textPos = polarToCart(cx, cy, textR, midAngle);
  
  // Flag image position
  const flagSize = Math.min(outerR - innerR - 4, (ea - sa) * innerR * Math.PI / 180 - 4, 24);
  const imgR = textR;
  const imgPos = polarToCart(cx, cy, imgR, midAngle);

  const fill = isWinner ? '#2a6b2a' : team.code ? '#1a2744' : '#111827';
  const stroke = isWinner ? '#4ade80' : team.code ? '#334155' : '#1f2937';

  return (
    <g
      className={`bw-arc ${result ? 'bw-arc-clickable' : ''}`}
      onClick={result ? () => onClickResult(result) : undefined}
    >
      <path d={d} fill={fill} stroke={stroke} strokeWidth="1" />
      {team.code && getFlagUrl(team.code) ? (
        <image
          href={getFlagUrl(team.code)}
          x={imgPos.x - flagSize * 0.7}
          y={imgPos.y - flagSize * 0.4}
          width={flagSize * 1.4}
          height={flagSize * 0.8}
          clipPath="inset(0 round 2px)"
          style={{ pointerEvents: 'none' }}
        />
      ) : (
        <text
          x={textPos.x}
          y={textPos.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#9ca3af"
          fontSize="7"
          style={{ pointerEvents: 'none' }}
        >
          {team.name?.length > 6 ? team.name.slice(0, 5) + '…' : team.name}
        </text>
      )}
    </g>
  );
}

export default function BracketWheel() {
  const { standings, allFixtures } = useData();
  const koResults = useMemo(() => buildKoResults(allFixtures, standings), [allFixtures, standings]);
  const [popup, setPopup] = useState(null);

  // Ordered matches per round (top half = left, bottom half = right) going clockwise
  // We interleave left and right so the bracket forms a symmetric wheel
  const r32Matches = [...KO.left_r32, ...KO.right_r32]; // 16 matches = 32 teams
  const r16Matches = [...KO.left_r16, ...KO.right_r16]; // 8 matches = 16 teams
  const qfMatches = [...KO.left_qf, ...KO.right_qf];   // 4 matches = 8 teams
  const sfMatches = [...KO.left_sf, ...KO.right_sf];     // 2 matches = 4 teams
  const finalMatches = [KO.final];                        // 1 match = 2 teams

  const resolveMatch = (m) => {
    const hm = resolveTeam(m.home, koResults, standings);
    const aw = resolveTeam(m.away, koResults, standings);
    const r = koResults[m.id];
    if (r) {
      if (r.homeTeam) { hm.code = r.homeTeam; hm.name = NAMES[r.homeTeam] || r.homeTeam; }
      if (r.awayTeam) { aw.code = r.awayTeam; aw.name = NAMES[r.awayTeam] || r.awayTeam; }
    }
    return { id: m.id, home: hm, away: aw, result: r };
  };

  const cx = 400, cy = 400;
  const rings = [
    { matches: r32Matches, outerR: 380, innerR: 310 },
    { matches: r16Matches, outerR: 305, innerR: 245 },
    { matches: qfMatches, outerR: 240, innerR: 185 },
    { matches: sfMatches, outerR: 180, innerR: 130 },
    { matches: finalMatches, outerR: 125, innerR: 70 },
  ];

  const champ = koResults[104]?.winner;

  return (
    <div className="bw-container">
      <h1 className="bw-title">🏆 FIFA World Cup 2026 – Wheel Bracket</h1>
      {champ && (
        <div className="bw-champion">
          {getFlagUrl(champ) && <img src={getFlagUrl(champ)} className="bw-champ-flag" alt="" />}
          <span>{NAMES[champ]} – WORLD CHAMPIONS!</span>
        </div>
      )}
      <div className="bw-wheel-wrap">
        <svg viewBox="0 0 800 800" className="bw-svg">
          {rings.map((ring, ri) => {
            const totalSlots = ring.matches.length * 2; // 2 teams per match
            const slotAngle = 360 / totalSlots;
            return ring.matches.map((m, mi) => {
              const resolved = resolveMatch(m);
              const baseAngle = (mi * 2) * slotAngle;
              return (
                <React.Fragment key={m.id}>
                  <ArcSegment
                    cx={cx} cy={cy}
                    innerR={ring.innerR} outerR={ring.outerR}
                    startAngle={baseAngle}
                    endAngle={baseAngle + slotAngle}
                    team={resolved.home}
                    isWinner={resolved.result?.winner === resolved.home.code}
                    result={resolved.result}
                    onClickResult={setPopup}
                  />
                  <ArcSegment
                    cx={cx} cy={cy}
                    innerR={ring.innerR} outerR={ring.outerR}
                    startAngle={baseAngle + slotAngle}
                    endAngle={baseAngle + slotAngle * 2}
                    team={resolved.away}
                    isWinner={resolved.result?.winner === resolved.away.code}
                    result={resolved.result}
                    onClickResult={setPopup}
                  />
                </React.Fragment>
              );
            });
          })}
          {/* Center - champion or trophy */}
          <circle cx={cx} cy={cy} r={65} fill="#0f172a" stroke="#334155" strokeWidth="2" />
          {champ && getFlagUrl(champ) ? (
            <image href={getFlagUrl(champ)} x={cx - 30} y={cy - 20} width="60" height="40" clipPath="inset(0 round 4px)" />
          ) : (
            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="28">🏆</text>
          )}
          {champ && (
            <text x={cx} y={cy + 35} textAnchor="middle" fill="#fbbf24" fontSize="9" fontWeight="bold">
              {NAMES[champ]}
            </text>
          )}
          {/* Ring labels */}
          {[
            { r: 345, label: 'ROUND OF 32' },
            { r: 275, label: 'ROUND OF 16' },
            { r: 212, label: 'QUARTERFINALS' },
            { r: 155, label: 'SEMIFINALS' },
            { r: 97, label: 'FINAL' },
          ].map(({ r, label }) => {
            const pos = polarToCart(cx, cy, r, 270); // top
            return (
              <text key={label} x={pos.x} y={pos.y - 3} textAnchor="middle" fill="#475569" fontSize="6" fontWeight="600" letterSpacing="1">
                {label}
              </text>
            );
          })}
        </svg>
      </div>
      {popup && <ScorePopup result={popup} onClose={() => setPopup(null)} />}

      <style>{`
        .bw-container { padding: 1rem; display: flex; flex-direction: column; align-items: center; }
        .bw-title { text-align: center; margin-bottom: 0.5rem; font-size: 1.5rem; }
        .bw-champion { text-align: center; font-size: 1.1rem; font-weight: bold; color: #fbbf24; margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
        .bw-champ-flag { width: 40px; border-radius: 4px; }
        .bw-wheel-wrap { width: 100%; max-width: 800px; aspect-ratio: 1; }
        .bw-svg { width: 100%; height: 100%; }
        .bw-arc-clickable { cursor: pointer; }
        .bw-arc-clickable:hover path { filter: brightness(1.3); }
        .bw-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .bw-popup { background: #1e1e2e; border: 1px solid #444; border-radius: 12px; padding: 1.5rem 2rem; min-width: 300px; position: relative; }
        .bw-popup-close { position: absolute; top: 0.5rem; right: 0.75rem; background: none; border: none; color: #aaa; font-size: 1.2rem; cursor: pointer; }
        .bw-popup-match { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
        .bw-popup-team { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; }
        .bw-popup-flag { width: 64px; border-radius: 4px; }
        .bw-popup-score { font-size: 2rem; font-weight: bold; }
        .bw-popup-status { text-align: center; margin-top: 0.75rem; color: #888; font-size: 0.85rem; }
      `}</style>
    </div>
  );
}
