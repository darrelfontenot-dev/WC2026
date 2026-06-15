export async function fetchESPNData() {
  const standings = {};
  let allFixtures = [];

  // Standings
  const sr = await fetch('https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings');
  if (sr.ok) {
    const sd = await sr.json();
    if (sd.children) {
      sd.children.forEach(g => {
        const gl = (g.abbreviation || g.name || '').replace('Group ', '').trim();
        if (gl.length !== 1) return;
        standings[gl] = (g.standings?.entries || []).map(e => {
          const s = {};
          (e.stats || []).forEach(x => s[x.name] = parseFloat(x.displayValue) || 0);
          return {
            code: e.team?.abbreviation || '???',
            name: e.team?.displayName || '',
            pts: s.points || 0, w: s.wins || 0, d: s.draws || s.ties || 0, l: s.losses || 0,
            gf: s.pointsFor || s.goalsFor || 0, ga: s.pointsAgainst || s.goalsAgainst || 0,
            gd: s.pointDifferential || s.goalDifference || 0, mp: (s.wins || 0) + (s.draws || s.ties || 0) + (s.losses || 0)
          };
        });
      });
    }
  }

  // Scoreboard — fetch a date range to catch all matches including live ones
  const today = new Date();
  const dates = [];
  for (let offset = -1; offset <= 1; offset++) {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    dates.push(d.toISOString().slice(0, 10).replace(/-/g, ''));
  }
  const allEvents = [];
  for (const dt of dates) {
    try {
      const mr = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${dt}`);
      if (mr.ok) {
        const md = await mr.json();
        (md.events || []).forEach(ev => allEvents.push(ev));
      }
    } catch (e) {
      console.warn(`Scoreboard fetch failed for ${dt}:`, e);
    }
  }
  // Deduplicate events by id
  const seen = new Set();
  const uniqueEvents = allEvents.filter(ev => {
    if (seen.has(ev.id)) return false;
    seen.add(ev.id);
    return true;
  });
  allFixtures = uniqueEvents.map(ev => {
      const c = ev.competitions?.[0];
      const h = c?.competitors?.find(x => x.homeAway === 'home');
      const a = c?.competitors?.find(x => x.homeAway === 'away');
      const st = ev.status?.type?.name || '';
      const clock = ev.status?.displayClock || '';
      const period = ev.status?.period || 0;
      let status;
      if (st.includes('FULL_TIME') || st.includes('FINAL')) status = 'FT';
      else if (st.includes('HALFTIME') || st.includes('HALF_TIME')) status = 'HT';
      else if (st.includes('PROGRESS') || st.includes('FIRST_HALF') || st.includes('SECOND_HALF') || st.includes('EXTRA_TIME') || st.includes('SHOOTOUT') || ev.status?.type?.state === 'in') status = clock ? `${clock}'` : 'LIVE';
      else status = 'NS';
      return {
        home: h?.team?.abbreviation || '', away: a?.team?.abbreviation || '',
        hs: parseInt(h?.score) || 0, as: parseInt(a?.score) || 0,
        status,
        date: ev.date || '', round: ev.season?.type?.abbreviation || '',
        venue: c?.venue?.fullName || ''
      };
    });

  return { standings, allFixtures };
}

export function bucketGroupMatches(allFixtures) {
  const matchesByGroup = {};
  allFixtures.forEach(f => {
    const gm = (f.round || '').match(/Group\s*([A-L])/i);
    if (gm) {
      const g = gm[1];
      if (!matchesByGroup[g]) matchesByGroup[g] = [];
      matchesByGroup[g].push(f);
    }
  });
  return matchesByGroup;
}
