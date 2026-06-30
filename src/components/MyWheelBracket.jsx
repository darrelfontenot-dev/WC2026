import React, { useMemo, useState } from 'react';
import { KO, GROUPS, FLAGS, NAMES, flagUrl } from '../data/constants';
import { buildKoResults, resolveTeam, isGroupFinished } from '../lib/scoring';

/* ── circular wheel geometry (mirrors the live Wheel Bracket) ─────────── */
const CX = 500;
const CY = 500;
const TEAM_R = 458;                  // outer ring (team badges)
const RING_R = [372, 292, 212, 128]; // R32, R16, QF, SF junction nodes
const BADGE_R = 26;
const NODE_R = 18;
const STEP = 360 / 32;

const toRad = (deg) => (deg * Math.PI) / 180;
const polar = (deg, r) => ({ x: CX + r * Math.cos(toRad(deg)), y: CY + r * Math.sin(toRad(deg)) });

/**
 * Renders the user's *submitted* bracket as a circular wheel, marking each
 * pick with a green check (got it right) or red ✗ (picked wrong / didn't pick)
 * once the corresponding real-world result is known.
 */
export default function MyWheelBracket({ groupPicks = {}, resolvedThirds = {}, knockoutPicks = {}, standings = {}, allFixtures = [] }) {
  const [tip, setTip] = useState(null);

  // Actual (real-world) knockout results, reusing the shared engine.
  const actualKo = useMemo(() => buildKoResults(allFixtures, standings), [allFixtures, standings]);
  const allGroupsFinished = useMemo(
    () => Object.keys(GROUPS).every((g) => isGroupFinished(standings, g)),
    [standings],
  );

  // Resolve who the USER placed in a given bracket slot.
  const resolveUser = (label) => {
    if (!label) return null;
    const wr = label.match(/^W(\d+)$/);
    if (wr) return knockoutPicks[parseInt(wr[1])] || null;       // predicted match winner
    if (/^3[A-L]{2,}$/.test(label)) return resolvedThirds[label] || null; // their 3rd-place slot
    const gm = label.match(/^([12])([A-L])$/);
    if (gm) { const pos = parseInt(gm[1]) - 1, g = gm[2]; return (groupPicks[g] || GROUPS[g])[pos] || null; }
    return null; // L (loser) labels only feed the 3rd-place match, not the wheel
  };

  // The real team that ended up in an outer (R32 participant) slot, or
  // undefined if it isn't decided yet (so we render no mark).
  const actualOuter = (label) => {
    const gm = label.match(/^([12])([A-L])$/);
    if (gm) {
      const g = gm[2];
      if (!isGroupFinished(standings, g)) return undefined;
      const pos = parseInt(gm[1]) - 1;
      return standings[g]?.[pos]?.code ?? null;
    }
    if (/^3[A-L]{2,}$/.test(label)) {
      if (!allGroupsFinished) return undefined;
      return resolveTeam(label, actualKo, standings).code || null;
    }
    return undefined;
  };

  const markFor = (userCode, actualCode) => {
    if (actualCode === undefined || actualCode === null) return null; // not decided
    return userCode && userCode === actualCode ? 'correct' : 'wrong';
  };

  const geo = useMemo(() => {
    const r32m = [...KO.left_r32, ...KO.right_r32];
    const r16m = [...KO.left_r16, ...KO.right_r16];
    const qfm = [...KO.left_qf, ...KO.right_qf];
    const sfm = [...KO.left_sf, ...KO.right_sf];

    const slots = [];
    r32m.forEach((m) => {
      slots.push({ label: m.home, matchId: m.id });
      slots.push({ label: m.away, matchId: m.id });
    });
    const teamPts = slots.map((s, i) => {
      const ang = -90 + STEP * i;
      return { ang, ...s, ...polar(ang, TEAM_R) };
    });

    const mkRing = (childAngles, radius, matchArr) => {
      const nodes = [];
      for (let i = 0; i < childAngles.length; i += 2) {
        const ang = (childAngles[i] + childAngles[i + 1]) / 2;
        nodes.push({ ang, matchId: matchArr[i / 2].id, ...polar(ang, radius) });
      }
      return nodes;
    };
    const r32 = mkRing(teamPts.map((p) => p.ang), RING_R[0], r32m);
    const r16 = mkRing(r32.map((n) => n.ang), RING_R[1], r16m);
    const qf = mkRing(r16.map((n) => n.ang), RING_R[2], qfm);
    const sf = mkRing(qf.map((n) => n.ang), RING_R[3], sfm);
    return { teamPts, r32, r16, qf, sf, finalId: KO.final.id };
  }, []);

  // Occupants per ring come straight from the user's picks.
  const occTeam = geo.teamPts.map((p) => resolveUser(p.label));
  const occR32 = geo.r32.map((n) => knockoutPicks[n.matchId] || null);
  const occR16 = geo.r16.map((n) => knockoutPicks[n.matchId] || null);
  const occQf = geo.qf.map((n) => knockoutPicks[n.matchId] || null);
  const occSf = geo.sf.map((n) => knockoutPicks[n.matchId] || null);
  const championCode = knockoutPicks[geo.finalId] || null;
  const championActual = actualKo[geo.finalId]?.winner;
  const championMark = markFor(championCode, championActual);

  // Connector lines light up gold along the user's predicted champion path.
  const lines = [];
  const addLine = (a, b, child, parent) => lines.push({ a, b, on: !!(child && child === parent) });
  geo.teamPts.forEach((p, i) => addLine(p, geo.r32[Math.floor(i / 2)], occTeam[i], occR32[Math.floor(i / 2)]));
  geo.r32.forEach((n, j) => addLine(n, geo.r16[Math.floor(j / 2)], occR32[j], occR16[Math.floor(j / 2)]));
  geo.r16.forEach((n, k) => addLine(n, geo.qf[Math.floor(k / 2)], occR16[k], occQf[Math.floor(k / 2)]));
  geo.qf.forEach((n, m) => addLine(n, geo.sf[Math.floor(m / 2)], occQf[m], occSf[Math.floor(m / 2)]));
  geo.sf.forEach((n, s) => addLine(n, { x: CX, y: CY }, occSf[s], championCode));

  // Badges: outer team participants + advancing picks at junctions.
  const badges = [];
  geo.teamPts.forEach((p, i) => {
    const code = occTeam[i];
    const mark = markFor(code, actualOuter(p.label));
    badges.push({
      x: p.x, y: p.y, r: BADGE_R, code, label: p.label, showLabel: true, mark,
      name: code ? (NAMES[code] || code) : 'TBD',
    });
  });
  const pushNodes = (nodes, occ, matchIds) => nodes.forEach((n, idx) => {
    const code = occ[idx];
    if (!code) { badges.push({ x: n.x, y: n.y, dot: true }); return; }
    const mark = markFor(code, actualKo[matchIds[idx]]?.winner);
    badges.push({ x: n.x, y: n.y, r: NODE_R, code, label: code, mark, name: NAMES[code] || code });
  });
  pushNodes(geo.r32, occR32, geo.r32.map((n) => n.matchId));
  pushNodes(geo.r16, occR16, geo.r16.map((n) => n.matchId));
  pushNodes(geo.qf, occQf, geo.qf.map((n) => n.matchId));
  pushNodes(geo.sf, occSf, geo.sf.map((n) => n.matchId));

  const hasPicks = championCode || occSf.some(Boolean) || occR32.some(Boolean);

  return (
    <div className="wheel-wrap my-wheel">
      {championCode && (
        <div className={`champion-banner wheel-champion ${championMark || ''}`}>
          {FLAGS[championCode] || ''} {NAMES[championCode] || championCode} — Your Champion
          {championMark === 'correct' && ' ✓'}
          {championMark === 'wrong' && ` ✗ (actual: ${championActual ? `${FLAGS[championActual] || ''} ${championActual}` : 'TBD'})`}
        </div>
      )}
      <div className="wheel-stage">
        {tip && (
          <div className="wheel-tip" style={{ left: `${(tip.x / 1000) * 100}%`, top: `${(tip.y / 1000) * 100}%` }}>
            {tip.name}
          </div>
        )}
        <svg viewBox="0 0 1000 1000" className="wheel-svg" role="img" aria-label="Your World Cup 2026 bracket wheel with correct and incorrect picks">
          <defs>
            <radialGradient id="myCenterGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#caa24a" stopOpacity="0.55" />
              <stop offset="35%" stopColor="#8a6f2a" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#caa24a" stopOpacity="0" />
            </radialGradient>
            {badges.map((b, i) => (b.code && flagUrl(b.code) ? (
              <clipPath key={i} id={`myBadgeClip${i}`}>
                <circle cx={b.x} cy={b.y} r={b.r} />
              </clipPath>
            ) : null))}
          </defs>

          <circle cx={CX} cy={CY} r={320} fill="url(#myCenterGlow)" />

          {lines.map((l, i) => (
            <line key={i} x1={l.a.x} y1={l.a.y} x2={l.b.x} y2={l.b.y}
              stroke={l.on ? '#caa24a' : '#565b66'} strokeWidth={l.on ? 3 : 1.6} strokeLinecap="round" />
          ))}

          {badges.map((b, i) => {
            if (b.dot) return <circle key={i} cx={b.x} cy={b.y} r={3.6} fill="#7c8290" />;
            const url = flagUrl(b.code);
            const ringColor = b.mark === 'correct' ? '#27ae60' : b.mark === 'wrong' ? '#e74c3c' : (b.code ? '#e2e4e8' : '#3a4150');
            return (
              <g key={i}
                style={{ cursor: 'pointer' }}
                opacity={b.mark === 'wrong' ? 0.92 : 1}
                onMouseEnter={() => setTip({ name: b.name, x: b.x, y: b.y })}
                onMouseLeave={() => setTip(null)}>
                <title>{b.name}</title>
                {b.mark && <circle cx={b.x} cy={b.y} r={b.r + 3.5} fill="none" stroke={ringColor} strokeWidth="3" />}
                <circle cx={b.x} cy={b.y} r={b.r + 1.5} fill="#ffffff" />
                {url ? (
                  <image href={url} x={b.x - b.r} y={b.y - b.r} width={b.r * 2} height={b.r * 2}
                    clipPath={`url(#myBadgeClip${i})`} preserveAspectRatio="xMidYMid slice" />
                ) : (
                  <>
                    <circle cx={b.x} cy={b.y} r={b.r} fill="#262b36" stroke="#3a4150" strokeWidth="2" />
                    <text x={b.x} y={b.y + 1} textAnchor="middle" dominantBaseline="central"
                      fontSize="9" fontWeight="700" fill="#aeb4c0">{b.label}</text>
                  </>
                )}
                <circle cx={b.x} cy={b.y} r={b.r} fill="none" stroke={ringColor} strokeWidth="2" />
                {/* correctness marker */}
                {b.mark && (
                  <g>
                    <circle cx={b.x + b.r * 0.72} cy={b.y - b.r * 0.72} r={b.r * 0.46}
                      fill={b.mark === 'correct' ? '#27ae60' : '#e74c3c'} stroke="#fff" strokeWidth="1.5" />
                    <text x={b.x + b.r * 0.72} y={b.y - b.r * 0.72 + 0.5} textAnchor="middle" dominantBaseline="central"
                      fontSize={b.r * 0.62} fontWeight="900" fill="#fff">{b.mark === 'correct' ? '✓' : '✕'}</text>
                  </g>
                )}
                {b.showLabel && (
                  <text x={b.x} y={b.y + b.r + 11} textAnchor="middle"
                    fontSize="9" fontWeight="600" fill="#cfd3db">{b.code || b.label}</text>
                )}
              </g>
            );
          })}

          <text x={CX} y={CY} textAnchor="middle" dominantBaseline="central" fontSize="66">🏆</text>
        </svg>
      </div>

      <div className="wheel-legend">
        <span><i className="wl-dot correct" /> Correct pick</span>
        <span><i className="wl-dot wrong" /> Wrong / not picked</span>
        <span><i className="wl-dot pending" /> Not decided yet</span>
      </div>
      <p className="wheel-caption">
        {hasPicks
          ? 'Your picks fill the wheel from Round of 32 → Final. Marks appear as real results come in.'
          : 'Make your knockout picks to see them mapped onto your personal wheel.'}
      </p>
    </div>
  );
}
