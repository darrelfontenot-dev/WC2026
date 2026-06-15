import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { KO, FLAGS } from '../data/constants';

const VENUE_CITIES = {
  'East Rutherford': 'MetLife Stadium',
  'Inglewood': 'SoFi Stadium',
  'Arlington': 'AT&T Stadium',
  'Houston': 'NRG Stadium',
  'Atlanta': 'Mercedes-Benz Stadium',
  'Philadelphia': 'Lincoln Financial Field',
  'Miami': 'Hard Rock Stadium',
  'Seattle': 'Lumen Field',
  'Santa Clara': 'Levi\'s Stadium',
  'Foxborough': 'Gillette Stadium',
  'Kansas City': 'Arrowhead Stadium',
  'Toronto': 'BMO Field',
  'Vancouver': 'BC Place',
  'Mexico City': 'Estadio Azteca',
  'Guadalupe': 'Estadio BBVA',
};

function parseKOSchedule() {
  const matches = [];
  const allRounds = [
    ...KO.left_r32, ...KO.right_r32,
    ...KO.left_r16, ...KO.right_r16,
    ...KO.left_qf, ...KO.right_qf,
    ...KO.left_sf, ...KO.right_sf,
    KO.final, KO.third,
  ];
  for (const m of allRounds) {
    const parts = m.info.match(/^(.+?)\s+(\d{1,2}:\d{2}[ap]m)\s+·\s+(.+)$/);
    if (!parts) continue;
    const [, dateStr, timeStr, city] = parts;
    matches.push({ id: m.id, home: m.home, away: m.away, dateStr, timeStr, city: city.trim() });
  }
  return matches;
}

function formatCDT(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function Venues() {
  const { allFixtures } = useData();
  const [selectedCity, setSelectedCity] = useState('');

  const cities = Object.keys(VENUE_CITIES).sort();

  const koSchedule = useMemo(() => parseKOSchedule(), []);

  // Build a lookup from allFixtures by matching venue text
  const fixturesByVenue = useMemo(() => {
    const map = {};
    for (const f of allFixtures) {
      if (!f.venue) continue;
      for (const city of cities) {
        if (f.venue.toLowerCase().includes(city.toLowerCase()) ||
            f.venue.toLowerCase().includes(VENUE_CITIES[city].toLowerCase())) {
          if (!map[city]) map[city] = [];
          map[city].push(f);
        }
      }
    }
    return map;
  }, [allFixtures, cities]);

  // Merge KO schedule with live fixture data for the selected city
  const cityMatches = useMemo(() => {
    if (!selectedCity) return [];
    const koForCity = koSchedule.filter(m => m.city === selectedCity);
    const liveForCity = fixturesByVenue[selectedCity] || [];

    // Build lookup of live fixtures by matching teams
    const liveMap = {};
    for (const f of liveForCity) {
      liveMap[`${f.home}-${f.away}`] = f;
    }

    const rows = koForCity.map(ko => {
      const liveKey = `${ko.home}-${ko.away}`;
      const live = liveMap[liveKey];
      const played = live && ['FT', 'AET', 'PEN'].includes(live.status);
      const isLive = live && (live.status.includes("'") || ['LIVE', '1H', '2H', 'HT'].includes(live.status));
      return {
        dateStr: `Jun ${ko.dateStr.replace('Jun ', '').replace('Jul ', '')}`,
        fullDateStr: ko.dateStr,
        timeStr: `${ko.timeStr} CDT`,
        home: ko.home,
        away: ko.away,
        score: played || isLive ? `${live.hs} – ${live.as}` : null,
        status: live ? live.status : 'Scheduled',
        isLive,
        played,
        sortKey: ko.id,
      };
    });

    // Also include any live fixtures for this city that aren't in KO (group stage matches)
    const koIds = new Set(koForCity.map(k => `${k.home}-${k.away}`));
    for (const f of liveForCity) {
      if (!koIds.has(`${f.home}-${f.away}`)) {
        const played = ['FT', 'AET', 'PEN'].includes(f.status);
        const isLive = f.status.includes("'") || ['LIVE', '1H', '2H', 'HT'].includes(f.status);
        rows.push({
          dateStr: f.date ? formatCDT(f.date).split(',')[0] : '',
          fullDateStr: '',
          timeStr: f.date ? formatCDT(f.date) : '',
          home: f.home,
          away: f.away,
          score: played || isLive ? `${f.hs} – ${f.as}` : null,
          status: f.status || 'Scheduled',
          isLive,
          played,
          sortKey: f.date ? new Date(f.date).getTime() : 0,
        });
      }
    }

    rows.sort((a, b) => a.sortKey - b.sortKey);
    return rows;
  }, [selectedCity, koSchedule, fixturesByVenue]);

  return (
    <div className="panel active" style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px 30px' }}>
      <h3 style={{ marginBottom: 12, fontSize: '1.2rem' }}>Matches by Venue</h3>

      <div style={{ marginBottom: 16 }}>
        <select
          value={selectedCity}
          onChange={e => setSelectedCity(e.target.value)}
          style={{
            padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border, #ccc)',
            fontSize: '1rem', background: 'var(--card-bg, #fff)', color: 'var(--text, #222)',
            minWidth: 240,
          }}
        >
          <option value="">Select a city...</option>
          {cities.map(c => (
            <option key={c} value={c}>{c} — {VENUE_CITIES[c]}</option>
          ))}
        </select>
      </div>

      {selectedCity && (
        <>
          <p style={{ color: '#888', marginBottom: 12 }}>
            {VENUE_CITIES[selectedCity]} · {selectedCity}
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border, #ccc)', textAlign: 'left' }}>
                <th style={{ padding: '8px 6px' }}>Date</th>
                <th style={{ padding: '8px 6px' }}>Time (CDT)</th>
                <th style={{ padding: '8px 6px' }}>Home</th>
                <th style={{ padding: '8px 6px', textAlign: 'center' }}>Score</th>
                <th style={{ padding: '8px 6px' }}>Away</th>
                <th style={{ padding: '8px 6px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {cityMatches.map((m, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border, #eee)' }}>
                  <td style={{ padding: '8px 6px' }}>{m.fullDateStr || m.dateStr}</td>
                  <td style={{ padding: '8px 6px' }}>{m.timeStr}</td>
                  <td style={{ padding: '8px 6px' }}>{FLAGS[m.home] || ''} {m.home}</td>
                  <td style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 600 }}>
                    {m.score || 'vs'}
                  </td>
                  <td style={{ padding: '8px 6px' }}>{m.away} {FLAGS[m.away] || ''}</td>
                  <td style={{ padding: '8px 6px', color: m.isLive ? 'var(--green, #16a34a)' : m.played ? '#888' : 'var(--text, #222)' }}>
                    {m.status}
                  </td>
                </tr>
              ))}
              {cityMatches.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: '#888' }}>No matches scheduled at this venue.</td></tr>
              )}
            </tbody>
          </table>
        </>
      )}

      {!selectedCity && (
        <p style={{ textAlign: 'center', color: '#888', marginTop: 30 }}>
          Select a city above to see its match schedule.
        </p>
      )}
    </div>
  );
}
