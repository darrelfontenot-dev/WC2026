export const LEAGUE = 1;
export const SEASON = 2026;
export const API_HOST = 'v3.football.api-sports.io';

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

  // Scoreboard
  const mr = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard');
  if (mr.ok) {
    const md = await mr.json();
    allFixtures = (md.events || []).map(ev => {
      const c = ev.competitions?.[0];
      const h = c?.competitors?.find(x => x.homeAway === 'home');
      const a = c?.competitors?.find(x => x.homeAway === 'away');
      const st = ev.status?.type?.name || '';
      return {
        home: h?.team?.abbreviation || '', away: a?.team?.abbreviation || '',
        hs: parseInt(h?.score) || 0, as: parseInt(a?.score) || 0,
        status: st.includes('FULL_TIME') ? 'FT' : st.includes('PROGRESS') ? 'LIVE' : st.includes('HALF') ? 'HT' : 'NS',
        date: ev.date || '', round: ev.season?.type?.abbreviation || '',
        venue: c?.venue?.fullName || ''
      };
    });
  }

  return { standings, allFixtures };
}

export async function fetchApiFootballData(apiKey) {
  const standings = {};
  let allFixtures = [];
  const hdr = { 'x-apisports-key': apiKey };

  const sr = await fetch(`https://${API_HOST}/standings?league=${LEAGUE}&season=${SEASON}`, { headers: hdr });
  if (sr.ok) {
    const sd = await sr.json();
    (sd.response?.[0]?.league?.standings || []).forEach(garr => {
      if (!garr.length) return;
      const gl = (garr[0].group || '').replace('Group ', '');
      standings[gl] = garr.map(t => ({
        code: t.team?.name?.substring(0, 3).toUpperCase() || '',
        name: t.team?.name || '', pts: t.points || 0,
        w: t.all?.win || 0, d: t.all?.draw || 0, l: t.all?.lose || 0,
        gf: t.all?.goals?.for || 0, ga: t.all?.goals?.against || 0,
        gd: t.goalsDiff || 0, mp: t.all?.played || 0
      }));
    });
  }

  const fr = await fetch(`https://${API_HOST}/fixtures?league=${LEAGUE}&season=${SEASON}`, { headers: hdr });
  if (fr.ok) {
    const fd = await fr.json();
    allFixtures = (fd.response || []).map(f => ({
      home: f.teams?.home?.name?.substring(0, 3).toUpperCase() || '',
      away: f.teams?.away?.name?.substring(0, 3).toUpperCase() || '',
      hs: f.goals?.home ?? null, as: f.goals?.away ?? null,
      status: f.fixture?.status?.short || 'NS',
      date: f.fixture?.date || '',
      round: f.league?.round || '',
      venue: f.fixture?.venue?.name || '',
      homeWin: f.teams?.home?.winner, awayWin: f.teams?.away?.winner,
      fixtureId: f.fixture?.id
    }));
  }

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
