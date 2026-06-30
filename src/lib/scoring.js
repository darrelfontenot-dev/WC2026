import { KO, GROUPS, NAMES } from '../data/constants';

/* ── Points scheme (shared by My Bracket review + Leaderboard) ──────────── */
export const POINTS = {
  GROUP_EXACT: 3, // picked team finished in the exact position (1st or 2nd)
  GROUP_TOP2: 1,  // picked team finished in the top 2 but wrong slot
  KO_WIN: 2,      // picked the correct winner of a knockout match
};

/* ── Knockout match catalog with round labels ──────────────────────────── */
export const KO_MATCHES = [
  ...KO.left_r32.map((m) => ({ ...m, round: 'R32' })),
  ...KO.right_r32.map((m) => ({ ...m, round: 'R32' })),
  ...KO.left_r16.map((m) => ({ ...m, round: 'R16' })),
  ...KO.right_r16.map((m) => ({ ...m, round: 'R16' })),
  ...KO.left_qf.map((m) => ({ ...m, round: 'QF' })),
  ...KO.right_qf.map((m) => ({ ...m, round: 'QF' })),
  ...KO.left_sf.map((m) => ({ ...m, round: 'SF' })),
  ...KO.right_sf.map((m) => ({ ...m, round: 'SF' })),
  { ...KO.final, round: 'Final' },
  { ...KO.third, round: '3rd Place' },
];

/* ── Team-label resolution + actual knockout results from live fixtures ─── */
function sameGroup(t1, t2) {
  return Object.values(GROUPS).some((g) => g.includes(t1) && g.includes(t2));
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

// Determine the winning team code of a finished knockout fixture.
// Order of trust: ESPN winner flag → penalty (shootout) score → regulation/ET score.
// Returns null if the match is not finished. NEVER guesses home on a level score,
// because a level score means it was decided on penalties (use those instead).
export function koWinner(f) {
  if (!f || f.status !== 'FT') return null;
  if (f.homeWinner === true) return f.home;
  if (f.awayWinner === true) return f.away;
  if (typeof f.hsPen === 'number' && typeof f.asPen === 'number' && f.hsPen !== f.asPen) {
    return f.hsPen > f.asPen ? f.home : f.away;
  }
  if (f.hs > f.as) return f.home;
  if (f.as > f.hs) return f.away;
  return null; // level with no shootout data → unknown, don't guess
}

// Map live fixtures onto KO match ids → { [matchId]: { winner, homeTeam, awayTeam, hs, as, status } }
export function buildKoResults(allFixtures, standings) {
  const koResults = {};
  const allKoMatches = [
    ...KO.left_r32, ...KO.right_r32, ...KO.left_r16, ...KO.right_r16,
    ...KO.left_qf, ...KO.right_qf, ...KO.left_sf, ...KO.right_sf, KO.final, KO.third,
  ];
  const koFixtures = (allFixtures || []).filter((f) => {
    if (f.status !== 'FT' && f.status !== 'HT' && !f.status.includes("'")) return false;
    return !sameGroup(f.home, f.away);
  });
  const claimed = new Set();
  const winnerFor = koWinner;

  for (const match of allKoMatches) {
    const fixture = koFixtures.find((f) => f.matchNumber === match.id && !claimed.has(f));
    if (fixture) {
      claimed.add(fixture);
      koResults[match.id] = { hs: fixture.hs, as: fixture.as, winner: winnerFor(fixture), homeTeam: fixture.home, awayTeam: fixture.away, status: fixture.status };
    }
  }
  for (let pass = 0; pass < 5; pass++) {
    for (const match of allKoMatches) {
      if (koResults[match.id]) continue;
      const hm = resolveTeam(match.home, koResults, standings);
      const aw = resolveTeam(match.away, koResults, standings);
      let fixture = null;
      if (hm.code && aw.code) fixture = koFixtures.find((f) => !claimed.has(f) && ((f.home === hm.code && f.away === aw.code) || (f.home === aw.code && f.away === hm.code)));
      if (!fixture && hm.code && !aw.code) fixture = koFixtures.find((f) => !claimed.has(f) && (f.home === hm.code || f.away === hm.code));
      else if (!fixture && aw.code && !hm.code) fixture = koFixtures.find((f) => !claimed.has(f) && (f.home === aw.code || f.away === aw.code));
      if (fixture) {
        claimed.add(fixture);
        koResults[match.id] = { hs: fixture.hs, as: fixture.as, winner: winnerFor(fixture), homeTeam: fixture.home, awayTeam: fixture.away, status: fixture.status };
      }
    }
  }
  return koResults;
}

// Is a group fully played (all four teams have 3 matches)?
export function isGroupFinished(standings, g) {
  const row = standings[g] || [];
  return row.length >= 4 && row.every((t) => (t.mp || 0) >= 3);
}

/* ── Full bracket scoring with a per-pick breakdown ─────────────────────── */
export function scoreBracket(bracket, standings, allFixtures) {
  const bd = (bracket && bracket.bracket_data) || {};
  const gp = bd.groupPicks || {};
  const ko = bd.knockoutPicks || {};
  let total = 0;

  // Group stage: score the 1st and 2nd predicted positions once a group is final.
  const groups = {};
  let groupPoints = 0;
  Object.keys(GROUPS).forEach((g) => {
    const row = standings[g] || [];
    const real = row.map((t) => t.code);
    const finished = isGroupFinished(standings, g);
    const picks = gp[g] || GROUPS[g];
    const items = [];
    let gpts = 0;
    [0, 1].forEach((pos) => {
      const pick = picks[pos];
      let points = 0, status = 'pending';
      if (finished && pick) {
        if (real[pos] === pick) { points = POINTS.GROUP_EXACT; status = 'exact'; }
        else if (real.slice(0, 2).includes(pick)) { points = POINTS.GROUP_TOP2; status = 'partial'; }
        else { status = 'wrong'; }
      }
      gpts += points;
      items.push({ pos, pick, actual: real[pos], points, status });
    });
    groupPoints += gpts;
    groups[g] = { finished, real, picks, items, points: gpts };
  });
  total += groupPoints;

  // Knockout: did the user pick the team that actually won each match?
  const actual = buildKoResults(allFixtures, standings);
  const koItems = [];
  let koPoints = 0, koCorrect = 0, koDecided = 0;
  KO_MATCHES.forEach((m) => {
    const pick = ko[m.id] || null;
    const res = actual[m.id];
    const decided = !!(res && res.winner);
    let status = 'pending', points = 0, correct = false;
    if (decided) {
      koDecided += 1;
      if (pick && res.winner === pick) { correct = true; points = POINTS.KO_WIN; status = 'correct'; koCorrect += 1; }
      else status = 'wrong';
    }
    koPoints += points;
    koItems.push({ id: m.id, round: m.round, info: m.info, pick, actualWinner: res ? res.winner : null, decided, correct, points, status });
  });
  total += koPoints;

  // Tie-breaker: closeness of the predicted final goal difference.
  const fh = bracket.final_score_home ?? 0;
  const fa = bracket.final_score_away ?? 0;
  const finalRes = actual[KO.final.id];
  let diff = 999;
  let finalDecided = false;
  if (finalRes && finalRes.status === 'FT') {
    finalDecided = true;
    diff = Math.abs((fh - fa) - (finalRes.hs - finalRes.as));
  }

  return {
    total,
    diff,
    groups,
    groupPoints,
    knockout: { items: koItems, points: koPoints, correct: koCorrect, decided: koDecided },
    final: { decided: finalDecided, diff, predicted: { home: fh, away: fa }, actual: finalRes || null },
  };
}
