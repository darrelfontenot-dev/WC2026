import React, { useMemo, useState } from 'react';
import { KO, FLAGS, NAMES, GROUPS, flagUrl } from '../data/constants';
import { useData } from '../context/DataContext';

/* ── circular wheel geometry ──────────────────────────────── */
const CX = 500;
const CY = 500;
const TEAM_R = 458;                  // outer ring (team badges)
const RING_R = [372, 292, 212, 128]; // R32, R16, QF, SF junction nodes
const BADGE_R = 26;
const NODE_R = 18;                   // smaller badge for advancing teams at junctions
const STEP = 360 / 32;               // 11.25° between adjacent teams

const toRad = (deg) => (deg * Math.PI) / 180;
const polar = (deg, r) => ({ x: CX + r * Math.cos(toRad(deg)), y: CY + r * Math.sin(toRad(deg)) });

// Check if two teams are in the same group (i.e. it's a group-stage match)
function sameGroup(t1, t2) {
  return Object.values(GROUPS).some(g => g.includes(t1) && g.includes(t2));
}

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

// Collect all third-place slot labels from the bracket
// FIFA 2026 third-place assignment table.
// Once groups are complete, FIFA assigns each qualifying 3rd-place team to a specific
// bracket slot based on a predetermined table. This mapping is fixed for 2026.
const THIRD_PLACE_ASSIGNMENT = {
  '3ABCDF': 'D',  // Paraguay
  '3CDFGH': 'F',  // Sweden
  '3CEFHI': 'E',  // Ecuador
  '3EHIJK': 'K',  // Congo DR
  '3AEHIJ': 'I',  // Senegal
  '3BEFIJ': 'B',  // Bosnia-Herzegovina
  '3EFGIJ': 'J',  // Algeria
  '3DEIJL': 'L',  // Ghana
};

// Map third-place qualifier slots (e.g. "3ABCDF") to actual teams
function resolveThirdPlace(label, standings) {
  const assignedGroup = THIRD_PLACE_ASSIGNMENT[label];
  if (assignedGroup && standings[assignedGroup] && standings[assignedGroup].length >= 3) {
    const team = standings[assignedGroup][2]; // 3rd place (0-indexed)
    return { name: `${FLAGS[team.code] || ''} ${NAMES[team.code] || team.code}`, code: team.code };
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
    if (groupStandings && groupStandings[pos]) {
      const team = groupStandings[pos];
      return { name: `${FLAGS[team.code] || ''} ${NAMES[team.code] || team.code}`, code: team.code };
    }
    return { name: label, code: null };
  }
  return { name: label, code: null };
};

// Parse month+day from KO match info string (e.g. "Jun 29 3:30pm · Foxborough")
function parseMatchDate(info) {
  const m = info.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d+)/);
  if (!m) return null;
  const months = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
  return { month: months[m[1]], day: parseInt(m[2]) };
}

// Check if a fixture date matches a KO match date
function fixtureMatchesDate(fixture, matchDate) {
  if (!matchDate || !fixture.date) return false;
  const fd = new Date(fixture.date);
  // ESPN dates are UTC; match dates are local (CDT = UTC-5/6), allow same day or +1 day
  return (fd.getUTCMonth() === matchDate.month && fd.getUTCDate() === matchDate.day) ||
         (fd.getUTCMonth() === matchDate.month && fd.getUTCDate() === matchDate.day + 1) ||
         (fd.getUTCMonth() === matchDate.month && fd.getUTCDate() === matchDate.day - 1);
}

// Get all teams that qualified from group stage (top 2 + best thirds)
function getKnownKoTeams(standings) {
  const teams = new Set();
  Object.values(standings).forEach(group => {
    if (group && group.length >= 2) {
      teams.add(group[0].code); // 1st
      teams.add(group[1].code); // 2nd
    }
  });
  const thirds = getBestThirdPlaceTeams(standings);
  thirds.forEach(t => teams.add(t.code));
  return teams;
}

// Build koResults by iteratively resolving KO matches against live fixture data
function buildKoResults(allFixtures, standings) {
  const koResults = {};
  const allKoMatches = [
    ...KO.left_r32, ...KO.right_r32,
    ...KO.left_r16, ...KO.right_r16,
    ...KO.left_qf, ...KO.right_qf,
    ...KO.left_sf, ...KO.right_sf,
    KO.final, KO.third,
  ];

  // Finished/live fixtures (not group matches)
  const koFixtures = allFixtures.filter(f => {
    if (f.status !== 'FT' && f.status !== 'HT' && !f.status.includes("'")) return false;
    if (sameGroup(f.home, f.away)) return false;
    return true;
  });

  // Track which fixtures have been claimed
  const claimed = new Set();

  // PASS 0: Direct match by ESPN match number (most reliable)
  for (const match of allKoMatches) {
    const fixture = koFixtures.find(f => f.matchNumber === match.id && !claimed.has(f));
    if (fixture) {
      claimed.add(fixture);
      const hs = fixture.hs;
      const as = fixture.as;
      let winner = null;
      if (fixture.status === 'FT') {
        winner = hs > as ? fixture.home : as > hs ? fixture.away : null;
        if (!winner) winner = fixture.home; // tiebreaker shouldn't happen in KO
      }
      koResults[match.id] = {
        hs, as, winner,
        homeTeam: fixture.home, awayTeam: fixture.away,
        status: fixture.status,
      };
    }
  }

  // PASS 1-5: Resolve by team codes (no date required - each team plays only once per round)
  for (let pass = 0; pass < 5; pass++) {
    for (const match of allKoMatches) {
      if (koResults[match.id]) continue;
      const hm = resolveTeam(match.home, koResults, standings);
      const aw = resolveTeam(match.away, koResults, standings);

      let fixture = null;

      // Try both teams matching
      if (hm.code && aw.code) {
        fixture = koFixtures.find(f => !claimed.has(f) &&
          ((f.home === hm.code && f.away === aw.code) ||
           (f.home === aw.code && f.away === hm.code))
        );
      }

      // Fall back: match if ONE of the resolved teams appears in a fixture
      // Only use when the other label couldn't resolve (3rd place unknown)
      if (!fixture && hm.code && !aw.code) {
        fixture = koFixtures.find(f => !claimed.has(f) &&
          (f.home === hm.code || f.away === hm.code)
        );
      } else if (!fixture && aw.code && !hm.code) {
        fixture = koFixtures.find(f => !claimed.has(f) &&
          (f.home === aw.code || f.away === aw.code)
        );
      }

      if (fixture) {
        claimed.add(fixture);
        // Always use actual fixture teams - our bracket slot assumptions may be wrong
        const homeCode = fixture.home;
        const awayCode = fixture.away;
        const hs = fixture.hs;
        const as = fixture.as;
        let winner = null;
        if (fixture.status === 'FT') {
          winner = hs > as ? homeCode : as > hs ? awayCode : null;
          if (!winner) winner = homeCode; // pens - ESPN includes pen score
        }
        koResults[match.id] = {
          hs, as, winner,
          homeTeam: homeCode, awayTeam: awayCode,
          status: fixture.status,
        };
      }
    }
  }
  return koResults;
}

export default function Knockout() {
  const { standings, allFixtures } = useData();
  const koResults = buildKoResults(allFixtures, standings);
  const champ = koResults[104]?.winner || null;
  const [tip, setTip] = useState(null); // { name, x, y }

  // Static wheel geometry. Bracket data is already in DFS leaf order: left half then right half.
  const geo = useMemo(() => {
    const r32m = [...KO.left_r32, ...KO.right_r32]; // 16 matches → 32 team slots
    const r16m = [...KO.left_r16, ...KO.right_r16]; // 8
    const qfm = [...KO.left_qf, ...KO.right_qf];    // 4
    const sfm = [...KO.left_sf, ...KO.right_sf];    // 2

    const slots = [];
    r32m.forEach((m) => {
      slots.push({ label: m.home, matchId: m.id });
      slots.push({ label: m.away, matchId: m.id });
    });
    const teamPts = slots.map((s, i) => {
      const ang = -90 + STEP * i;
      return { ang, ...s, ...polar(ang, TEAM_R) };
    });

    // Build a ring of result nodes, tagging each with the match id it represents.
    const mkRing = (childAngles, radius, matchArr) => {
      const nodes = [];
      for (let i = 0; i < childAngles.length; i += 2) {
        const ang = (childAngles[i] + childAngles[i + 1]) / 2;
        nodes.push({ ang, matchId: matchArr[i / 2].id, ...polar(ang, radius) });
      }
      return nodes;
    };
    const r32 = mkRing(teamPts.map((p) => p.ang), RING_R[0], r32m); // 16 (R16 participants)
    const r16 = mkRing(r32.map((n) => n.ang), RING_R[1], r16m);     // 8  (QF participants)
    const qf = mkRing(r16.map((n) => n.ang), RING_R[2], qfm);       // 4  (SF participants)
    const sf = mkRing(qf.map((n) => n.ang), RING_R[3], sfm);        // 2  (finalists)

    return { teamPts, r32, r16, qf, sf, finalId: KO.final.id };
  }, []);

  // Resolve who currently occupies each position, given live results.
  const winnerOf = (id) => koResults[id]?.winner || null;
  const occTeam = geo.teamPts.map((p) => resolveTeam(p.label, koResults, standings).code);
  const occR32 = geo.r32.map((n) => winnerOf(n.matchId));
  const occR16 = geo.r16.map((n) => winnerOf(n.matchId));
  const occQf = geo.qf.map((n) => winnerOf(n.matchId));
  const occSf = geo.sf.map((n) => winnerOf(n.matchId));
  const championCode = winnerOf(geo.finalId) || champ;

  // Connector lines. A line is "on" (gold) when the child's occupant advanced to the parent.
  const lines = [];
  const addLine = (a, b, child, parent) => lines.push({ a, b, on: !!(child && child === parent) });
  geo.teamPts.forEach((p, i) => addLine(p, geo.r32[Math.floor(i / 2)], occTeam[i], occR32[Math.floor(i / 2)]));
  geo.r32.forEach((n, j) => addLine(n, geo.r16[Math.floor(j / 2)], occR32[j], occR16[Math.floor(j / 2)]));
  geo.r16.forEach((n, k) => addLine(n, geo.qf[Math.floor(k / 2)], occR16[k], occQf[Math.floor(k / 2)]));
  geo.qf.forEach((n, m) => addLine(n, geo.sf[Math.floor(m / 2)], occQf[m], occSf[Math.floor(m / 2)]));
  geo.sf.forEach((n, s) => addLine(n, { x: CX, y: CY }, occSf[s], championCode));

  // Badges to render: outer teams + advancing teams sitting on junction nodes.
  const badges = [];
  geo.teamPts.forEach((p, i) => {
    const code = occTeam[i];
    const w = winnerOf(p.matchId);
    badges.push({
      x: p.x, y: p.y, r: BADGE_R, code, label: p.label, showLabel: true,
      isWinner: !!(w && code && w === code),
      isOut: !!(w && code && w !== code),
      name: code ? (NAMES[code] || code) : p.label,
    });
  });
  const pushNodes = (nodes, occ, parentOcc) => nodes.forEach((n, idx) => {
    const code = occ[idx];
    if (!code) { badges.push({ x: n.x, y: n.y, dot: true }); return; }
    const adv = parentOcc[Math.floor(idx / 2)];
    badges.push({
      x: n.x, y: n.y, r: NODE_R, code, label: code,
      isWinner: !!(adv && adv === code), isOut: false,
      name: NAMES[code] || code,
    });
  });
  pushNodes(geo.r32, occR32, occR16);
  pushNodes(geo.r16, occR16, occQf);
  pushNodes(geo.qf, occQf, occSf);
  pushNodes(geo.sf, occSf, [championCode, championCode]);

  return (
    <div className="panel active">
      <div className="wheel-wrap">
        {championCode && (
          <div className="champion-banner wheel-champion">{FLAGS[championCode] || ''} {NAMES[championCode] || championCode} – WORLD CHAMPIONS!</div>
        )}
        <div className="wheel-stage">
        {tip && (
          <div className="wheel-tip" style={{ left: `${(tip.x / 1000) * 100}%`, top: `${(tip.y / 1000) * 100}%` }}>
            {tip.name}
          </div>
        )}
        <svg viewBox="0 0 1000 1000" className="wheel-svg" role="img" aria-label="World Cup 2026 knockout wheel bracket">
          <defs>
            <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#caa24a" stopOpacity="0.55" />
              <stop offset="35%" stopColor="#8a6f2a" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#caa24a" stopOpacity="0" />
            </radialGradient>
            {/* One clip path per badge at its absolute position (avoids a Chromium
                first-paint bug when reusing a single userSpaceOnUse clip). */}
            {badges.map((b, i) => (b.code && flagUrl(b.code) ? (
              <clipPath key={i} id={`badgeClip${i}`}>
                <circle cx={b.x} cy={b.y} r={b.r} />
              </clipPath>
            ) : null))}
          </defs>

          {/* central glow */}
          <circle cx={CX} cy={CY} r={320} fill="url(#centerGlow)" />

          {/* connector lines (gold = team advanced through this match) */}
          {lines.map((l, i) => (
            <line key={i} x1={l.a.x} y1={l.a.y} x2={l.b.x} y2={l.b.y}
              stroke={l.on ? '#caa24a' : '#565b66'} strokeWidth={l.on ? 3 : 1.6} strokeLinecap="round" />
          ))}

          {/* badges: outer teams + advancing teams at junctions */}
          {badges.map((b, i) => {
            if (b.dot) return <circle key={i} cx={b.x} cy={b.y} r={3.6} fill="#7c8290" />;
            const url = flagUrl(b.code);
            return (
              <g key={i} opacity={b.isOut ? 0.4 : 1}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setTip({ name: b.name, x: b.x, y: b.y })}
                onMouseLeave={() => setTip(null)}>
                <title>{b.name}</title>
                {b.isWinner && <circle cx={b.x} cy={b.y} r={b.r + 3.5} fill="none" stroke="#27ae60" strokeWidth="3" />}
                <circle cx={b.x} cy={b.y} r={b.r + 1.5} fill="#ffffff" />
                {url ? (
                  <image href={url} x={b.x - b.r} y={b.y - b.r} width={b.r * 2} height={b.r * 2}
                    clipPath={`url(#badgeClip${i})`} preserveAspectRatio="xMidYMid slice" />
                ) : (
                  <>
                    <circle cx={b.x} cy={b.y} r={b.r} fill="#262b36" stroke="#3a4150" strokeWidth="2" />
                    <text x={b.x} y={b.y + 1} textAnchor="middle" dominantBaseline="central"
                      fontSize="9" fontWeight="700" fill="#aeb4c0">{b.label}</text>
                  </>
                )}
                <circle cx={b.x} cy={b.y} r={b.r} fill="none" stroke={b.code ? '#e2e4e8' : '#3a4150'} strokeWidth="2" />
                {b.showLabel && (
                  <text x={b.x} y={b.y + b.r + 11} textAnchor="middle"
                    fontSize="9" fontWeight="600" fill="#cfd3db">{b.code || b.label}</text>
                )}
              </g>
            );
          })}

          {/* center trophy */}
          <text x={CX} y={CY} textAnchor="middle" dominantBaseline="central" fontSize="66">🏆</text>
        </svg>
        </div>
        <p className="wheel-caption">Round of 32 → Final · slots fill in as group &amp; knockout results come in</p>
      </div>
    </div>
  );
}
