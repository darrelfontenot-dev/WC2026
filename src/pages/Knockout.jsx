import React, { useMemo, useState } from 'react';
import { KO, FLAGS, NAMES, GROUPS, flagUrl } from '../data/constants';
import { useData } from '../context/DataContext';

/* ── circular wheel geometry ──────────────────────────────── */
const CX = 500;
const CY = 500;
const TEAM_R = 458;                  // outer ring (team badges)
const RING_R = [372, 292, 212, 128]; // R32, R16, QF, SF junction nodes
const BADGE_R = 26;
const STEP = 360 / 32;               // 11.25° between adjacent teams

const toRad = (deg) => (deg * Math.PI) / 180;
const polar = (deg, r) => ({ x: CX + r * Math.cos(toRad(deg)), y: CY + r * Math.sin(toRad(deg)) });

// Build a ring of parent nodes from child angles (adjacent pairs combine inward).
function buildRing(childAngles, radius) {
  const nodes = [];
  for (let i = 0; i < childAngles.length; i += 2) {
    const ang = (childAngles[i] + childAngles[i + 1]) / 2;
    nodes.push({ ang, ...polar(ang, radius) });
  }
  return nodes;
}

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

  // Build wheel geometry. Bracket data is already in DFS leaf order: left half then right half.
  const geo = useMemo(() => {
    const matches = [...KO.left_r32, ...KO.right_r32]; // 16 matches → 32 team slots
    const slots = [];
    matches.forEach((m) => {
      slots.push({ label: m.home, matchId: m.id });
      slots.push({ label: m.away, matchId: m.id });
    });

    const teamPts = slots.map((s, i) => {
      const ang = -90 + STEP * i;
      return { ang, ...s, ...polar(ang, TEAM_R) };
    });

    const r32 = buildRing(teamPts.map((p) => p.ang), RING_R[0]); // 16
    const r16 = buildRing(r32.map((n) => n.ang), RING_R[1]);     // 8
    const qf = buildRing(r16.map((n) => n.ang), RING_R[2]);      // 4
    const sf = buildRing(qf.map((n) => n.ang), RING_R[3]);       // 2

    const lines = [];
    teamPts.forEach((p, i) => lines.push([p, r32[Math.floor(i / 2)]]));
    r32.forEach((n, j) => lines.push([n, r16[Math.floor(j / 2)]]));
    r16.forEach((n, k) => lines.push([n, qf[Math.floor(k / 2)]]));
    qf.forEach((n, m) => lines.push([n, sf[Math.floor(m / 2)]]));
    sf.forEach((n) => lines.push([n, { x: CX, y: CY }]));

    return { teamPts, nodes: [...r32, ...r16, ...qf, ...sf], lines };
  }, []);

  return (
    <div className="panel active">
      <div className="wheel-wrap">
        {champ && (
          <div className="champion-banner wheel-champion">{FLAGS[champ] || ''} {NAMES[champ] || champ} – WORLD CHAMPIONS!</div>
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
            {/* userSpaceOnUse circle at origin — reused inside each translated badge group */}
            <clipPath id="badgeClip"><circle cx={0} cy={0} r={BADGE_R} /></clipPath>
          </defs>

          {/* central glow */}
          <circle cx={CX} cy={CY} r={320} fill="url(#centerGlow)" />

          {/* connector lines */}
          <g stroke="#565b66" strokeWidth="1.6" fill="none" strokeLinecap="round">
            {geo.lines.map(([a, b], i) => (
              <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
            ))}
          </g>

          {/* junction nodes */}
          <g fill="#7c8290">
            {geo.nodes.map((n, i) => (
              <circle key={i} cx={n.x} cy={n.y} r={3.6} />
            ))}
          </g>

          {/* team badges */}
          {geo.teamPts.map((p, i) => {
            const { code } = resolveTeam(p.label, koResults, standings);
            const url = code ? flagUrl(code) : null;
            const res = koResults[p.matchId];
            const isWinner = !!(res && res.winner && res.winner === code);
            const isOut = !!(res && res.winner && code && res.winner !== code);
            const tipName = code ? (NAMES[code] || code) : p.label;
            return (
              <g key={i} transform={`translate(${p.x} ${p.y})`} opacity={isOut ? 0.45 : 1}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setTip({ name: tipName, x: p.x, y: p.y })}
                onMouseLeave={() => setTip(null)}>
                <title>{tipName}</title>
                {isWinner && <circle r={BADGE_R + 3.5} fill="none" stroke="#27ae60" strokeWidth="3" />}
                <circle r={BADGE_R + 1.5} fill="#ffffff" />
                {url ? (
                  <image href={url} x={-BADGE_R} y={-BADGE_R} width={BADGE_R * 2} height={BADGE_R * 2}
                    clipPath="url(#badgeClip)" preserveAspectRatio="xMidYMid slice" />
                ) : (
                  <>
                    <circle r={BADGE_R} fill="#262b36" stroke="#3a4150" strokeWidth="2" />
                    <text y={1} textAnchor="middle" dominantBaseline="central"
                      fontSize="9" fontWeight="700" fill="#aeb4c0">{p.label}</text>
                  </>
                )}
                <circle r={BADGE_R} fill="none" stroke={code ? '#e2e4e8' : '#3a4150'} strokeWidth="2" />
                <text y={BADGE_R + 11} textAnchor="middle"
                  fontSize="9" fontWeight="600" fill="#cfd3db">{code || p.label}</text>
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
