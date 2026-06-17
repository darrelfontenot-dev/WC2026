import React, { useEffect, useState } from 'react';
import { useData } from '../context/DataContext';
import { FLAGS } from '../data/constants';

export default function GoldenBoot() {
  const { allFixtures } = useData();
  const [scorers, setScorers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGoalScorers() {
      setLoading(true);
      const playerMap = {}; // key: "PlayerName|TeamAbbr" -> { name, team, goals, assists, penalties }

      // Get event IDs from fixtures that have been played
      const playedDates = [];
      const start = new Date(Date.UTC(2026, 5, 11));
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      const end = tomorrow > new Date(Date.UTC(2026, 6, 19)) ? new Date(Date.UTC(2026, 6, 19)) : tomorrow;
      for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        playedDates.push(d.toISOString().slice(0, 10).replace(/-/g, ''));
      }

      try {
        // Fetch scoreboard to get event IDs
        const scoreResults = await Promise.allSettled(
          playedDates.map(dt =>
            fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${dt}`)
              .then(r => r.ok ? r.json() : null)
              .catch(() => null)
          )
        );

        const eventIds = new Set();
        for (const r of scoreResults) {
          if (r.status === 'fulfilled' && r.value) {
            (r.value.events || []).forEach(ev => {
              const st = ev.status?.type?.name || '';
              if (st.includes('FULL_TIME') || st.includes('FINAL') || st.includes('PROGRESS') ||
                  st.includes('HALFTIME') || st.includes('HALF_TIME') || st.includes('EXTRA_TIME') ||
                  st.includes('SHOOTOUT') || ev.status?.type?.state === 'in') {
                eventIds.add(ev.id);
              }
            });
          }
        }

        // Fetch summaries to get per-player stats from rosters
        const ids = [...eventIds];
        const summaryResults = await Promise.allSettled(
          ids.map(id =>
            fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${id}`)
              .then(r => r.ok ? r.json() : null)
              .catch(() => null)
          )
        );

        for (const r of summaryResults) {
          if (r.status !== 'fulfilled' || !r.value) continue;
          const summary = r.value;
          const rosters = summary.rosters || [];

          // Extract goals and assists from each player's stats in the roster
          for (const teamRoster of rosters) {
            const teamAbbr = teamRoster.team?.abbreviation || '';
            for (const entry of (teamRoster.roster || [])) {
              const athlete = entry.athlete || entry;
              const name = athlete.displayName || athlete.shortName || 'Unknown';
              const stats = entry.stats || [];

              const getStat = (statName) => {
                const s = stats.find(x => x.name === statName);
                return s ? parseFloat(s.value) || 0 : 0;
              };

              const goals = getStat('totalGoals');
              const assists = getStat('goalAssists');
              if (goals === 0 && assists === 0) continue;

              const key = `${name}|${teamAbbr}`;
              if (!playerMap[key]) {
                playerMap[key] = { name, team: teamAbbr, goals: 0, assists: 0, penalties: 0 };
              }
              playerMap[key].goals += goals;
              playerMap[key].assists += assists;
            }
          }

          // Count penalties from keyEvents
          const keyEvents = summary.keyEvents || [];
          for (const ev of keyEvents) {
            const type = (ev.type?.text || '').toLowerCase();
            if (!type.includes('penalty') || !ev.scoringPlay) continue;
            const participants = ev.participants || [];
            if (participants.length > 0) {
              const scorer = participants[0]?.athlete;
              if (scorer) {
                const teamAbbr = ev.team?.displayName || '';
                // Find matching team abbreviation from rosters
                const matchingTeam = (summary.rosters || []).find(
                  t => t.team?.displayName === teamAbbr || t.team?.id === ev.team?.id
                );
                const abbr = matchingTeam?.team?.abbreviation || '';
                const key = `${scorer.displayName}|${abbr}`;
                if (playerMap[key]) {
                  playerMap[key].penalties += 1;
                }
              }
            }
          }
        }

        const sorted = Object.values(playerMap)
          .filter(p => p.goals > 0)
          .sort((a, b) => {
            if (b.goals !== a.goals) return b.goals - a.goals;
            if (b.assists !== a.assists) return b.assists - a.assists;
            return a.name.localeCompare(b.name);
          });

        setScorers(sorted);
      } catch (err) {
        console.error('Error fetching goal scorers:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchGoalScorers();
  }, [allFixtures]);

  return (
    <div className="panel active" style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px 40px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: 8 }}>Golden Boot Race</h2>
      <p style={{ textAlign: 'center', color: 'var(--muted)', marginBottom: 24, fontSize: 14 }}>
        Top goal scorers of the FIFA World Cup 2026
      </p>

      {loading ? (
        <div style={{ textAlign: 'center' }}>Loading goal scorers...</div>
      ) : scorers.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
          No goals scored yet. Check back once matches begin!
        </div>
      ) : (
        <div style={{ background: 'var(--card)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg)' }}>
                <th style={{ padding: 12, textAlign: 'center', width: 50 }}>#</th>
                <th style={{ padding: 12, textAlign: 'left' }}>Player</th>
                <th style={{ padding: 12, textAlign: 'center' }}>Team</th>
                <th style={{ padding: 12, textAlign: 'center' }}>Goals</th>
                <th style={{ padding: 12, textAlign: 'center' }}>Assists</th>
                <th style={{ padding: 12, textAlign: 'center' }}>Pens</th>
              </tr>
            </thead>
            <tbody>
              {scorers.map((p, i) => (
                <tr key={`${p.name}-${p.team}`} style={{
                  borderTop: '1px solid var(--border)',
                  background: i === 0 ? 'rgba(255,215,0,0.08)' : i < 3 ? 'rgba(255,215,0,0.03)' : 'transparent'
                }}>
                  <td style={{ padding: 12, textAlign: 'center', fontWeight: i < 3 ? 700 : 400 }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </td>
                  <td style={{ padding: 12, fontWeight: i < 3 ? 600 : 400 }}>{p.name}</td>
                  <td style={{ padding: 12, textAlign: 'center' }}>
                    {FLAGS[p.team] || ''} {p.team}
                  </td>
                  <td style={{ padding: 12, textAlign: 'center', fontWeight: 700, fontSize: 18 }}>{p.goals}</td>
                  <td style={{ padding: 12, textAlign: 'center' }}>{p.assists}</td>
                  <td style={{ padding: 12, textAlign: 'center', color: 'var(--muted)' }}>{p.penalties}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
