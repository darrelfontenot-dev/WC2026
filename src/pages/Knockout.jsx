import React, { useMemo, useState } from 'react';
import { KO, FLAGS, NAMES, flagUrl } from '../data/constants';
import { useData } from '../context/DataContext';
import { buildKoResults, resolveTeam } from '../lib/scoring';

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

// Knockout resolution (buildKoResults, resolveTeam) is shared from ../lib/scoring.

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
