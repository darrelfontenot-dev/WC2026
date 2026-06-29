import React from 'react';
import { KO, FLAGS, NAMES, GROUPS } from '../data/constants';
import { useData } from '../context/DataContext';

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
    if (groupStandings && groupStandings[pos]) {
      const team = groupStandings[pos];
      return { name: `${FLAGS[team.code] || ''} ${NAMES[team.code] || team.code}`, code: team.code };
    }
    return { name: label, code: null };
  }
  return { name: label, code: null };
};

const MatchBlock = ({ match, koResults, standings }) => {
  let hm = resolveTeam(match.home, koResults, standings);
  let aw = resolveTeam(match.away, koResults, standings);
  const r = koResults[match.id];
  
  // If fixture was matched, use actual team codes from the result
  if (r) {
    if (r.homeTeam && !hm.code) {
      hm = { name: `${FLAGS[r.homeTeam] || ''} ${NAMES[r.homeTeam] || r.homeTeam}`, code: r.homeTeam };
    }
    if (r.awayTeam && !aw.code) {
      aw = { name: `${FLAGS[r.awayTeam] || ''} ${NAMES[r.awayTeam] || r.awayTeam}`, code: r.awayTeam };
    }
  }
  
  const has = r && r.hs !== null && r.hs !== undefined;
  
  let hc = 'team', ac = 'team';
  if (r?.winner) {
    if (r.winner === hm.code) hc += ' winner';
    if (r.winner === aw.code) ac += ' winner';
  }

  return (
    <div className="ko-match">
      <div className="match-info">{match.info}{r?.status && r.status !== 'FT' ? ` (${r.status})` : ''}{r?.status === 'FT' ? ' (FT)' : ''}</div>
      <div className={hc}><span className="team-name">{hm.name}</span><span className="score">{has ? r.hs : ''}</span></div>
      <div className={ac}><span className="team-name">{aw.name}</span><span className="score">{has ? r.as : ''}</span></div>
    </div>
  );
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

      // Fall back to one team (safe: each team only plays one match per KO round)
      if (!fixture && hm.code) {
        fixture = koFixtures.find(f => !claimed.has(f) &&
          (f.home === hm.code || f.away === hm.code)
        );
      }
      if (!fixture && aw.code) {
        fixture = koFixtures.find(f => !claimed.has(f) &&
          (f.home === aw.code || f.away === aw.code)
        );
      }

      if (fixture) {
        claimed.add(fixture);
        const homeCode = hm.code || (fixture.home !== aw.code ? fixture.home : fixture.away);
        const awayCode = aw.code || (fixture.home === homeCode ? fixture.away : fixture.home);
        const isFlipped = fixture.home === awayCode;
        const hs = isFlipped ? fixture.as : fixture.hs;
        const as = isFlipped ? fixture.hs : fixture.as;
        let winner = null;
        if (fixture.status === 'FT') {
          winner = hs > as ? homeCode : as > hs ? awayCode : null;
          if (!winner) winner = fixture.hs > fixture.as ? fixture.home : fixture.away;
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

  // Debug: show non-group finished fixtures
  const debugFixtures = allFixtures.filter(f => {
    if (f.status !== 'FT' && f.status !== 'HT' && !f.status.includes("'")) return false;
    if (sameGroup(f.home, f.away)) return false;
    return true;
  });

  return (
    <div className="panel active">
      {/* Debug panel - remove after fixing */}
      <details style={{margin:'10px',padding:'10px',background:'#1a1a2e',border:'1px solid #444',borderRadius:'8px'}}>
        <summary style={{cursor:'pointer',color:'#0ff'}}>🔧 Debug: KO Data ({debugFixtures.length} knockout fixtures, {Object.keys(koResults).length} matched)</summary>
        <div style={{fontSize:'11px',color:'#aaa',marginTop:'8px',maxHeight:'200px',overflow:'auto'}}>
          <div><strong>Standings loaded:</strong> {Object.keys(standings).length} groups</div>
          <div><strong>Total fixtures:</strong> {allFixtures.length}</div>
          <div><strong>KO fixtures (non-group, finished):</strong></div>
          {debugFixtures.map((f,i) => (
            <div key={i}>{f.home} {f.hs}-{f.as} {f.away} | {f.status} | mn:{f.matchNumber} | {f.date?.slice(0,10)} | {f.phase}</div>
          ))}
          <div style={{marginTop:'8px'}}><strong>koResults:</strong></div>
          {Object.entries(koResults).map(([id,r]) => (
            <div key={id}>M{id}: {r.homeTeam} {r.hs}-{r.as} {r.awayTeam} winner={r.winner}</div>
          ))}
          <div style={{marginTop:'8px'}}><strong>Group B standings:</strong></div>
          {(standings['B']||[]).map((t,i) => (
            <div key={i}>#{i+1} {t.code} pts={t.pts} mp={t.mp} gd={t.gd}</div>
          ))}
        </div>
      </details>
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
