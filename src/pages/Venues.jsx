import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { KO, FLAGS, NAMES } from '../data/constants';

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

function resolveLabel(code, standings) {
  if (NAMES[code]) return NAMES[code];
  const posMatch = code.match(/^(\d)([A-L])$/);
  if (posMatch) {
    const pos = parseInt(posMatch[1]) - 1;
    const group = posMatch[2];
    const gs = standings[group];
    if (gs && gs[pos]) return NAMES[gs[pos].code] || gs[pos].code;
    return `${pos === 0 ? 'Winner' : 'Runner-up'} Group ${group}`;
  }
  if (/^3[A-L]{2,}$/.test(code)) return 'Best 3rd';
  if (/^[WL]\d+$/.test(code)) return code;
  return code;
}

function resolveCode(code, standings) {
  const posMatch = code.match(/^(\d)([A-L])$/);
  if (posMatch) {
    const pos = parseInt(posMatch[1]) - 1;
    const gs = standings[posMatch[2]];
    if (gs && gs[pos]) return gs[pos].code;
  }
  return code;
}

function parseKOSchedule() {
  const allRounds = [
    ...KO.left_r32, ...KO.right_r32,
    ...KO.left_r16, ...KO.right_r16,
    ...KO.left_qf, ...KO.right_qf,
    ...KO.left_sf, ...KO.right_sf,
    KO.final, KO.third,
  ];
  return allRounds.map(m => {
    const parts = m.info.match(/^(.+?)\s+(\d{1,2}:\d{2}[ap]m)\s+·\s+(.+)$/);
    if (!parts) return null;
    return { id: m.id, home: m.home, away: m.away, dateStr: parts[1], timeStr: parts[2], city: parts[3].trim() };
  }).filter(Boolean);
}

function formatCDT(dateStr) {
  if (!dateStr) return { date: '', time: '' };
  const d = new Date(dateStr);
  return {
    date: d.toLocaleDateString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit', hour12: true }) + ' CDT',
  };
}

export default function Venues() {
  const { allFixtures, standings } = useData();
  const [selectedCity, setSelectedCity] = useState('');

  const cities = Object.keys(VENUE_CITIES).sort();
  const koSchedule = useMemo(() => parseKOSchedule(), []);

  const fixturesByCity = useMemo(() => {
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

  const cityMatches = useMemo(() => {
    if (!selectedCity) return [];
    const rows = [];
    const seenKeys = new Set();

    // ESPN fixtures (includes already-played matches)
    for (const f of (fixturesByCity[selectedCity] || [])) {
      const played = ['FT', 'AET', 'PEN'].includes(f.status);
      const isLive = f.status.includes("'") || ['LIVE', '1H', '2H', 'HT'].includes(f.status);
      const { date, time } = formatCDT(f.date);
      seenKeys.add(`${f.home}-${f.away}`);
      rows.push({
        dateStr: date, timeStr: time,
        homeCode: f.home, awayCode: f.away,
        homeName: NAMES[f.home] || f.home, awayName: NAMES[f.away] || f.away,
        score: played || isLive ? `${f.hs} – ${f.as}` : null,
        status: f.status === 'NS' ? 'Scheduled' : f.status,
        isLive, played,
        sortKey: f.date ? new Date(f.date).getTime() : 0,
      });
    }

    // Future KO matches not yet in ESPN data
    for (const ko of koSchedule.filter(m => m.city === selectedCity)) {
      const hc = resolveCode(ko.home, standings);
      const ac = resolveCode(ko.away, standings);
      if (seenKeys.has(`${hc}-${ac}`)) continue;
      rows.push({
        dateStr: ko.dateStr, timeStr: `${ko.timeStr} CDT`,
        homeCode: hc, awayCode: ac,
        homeName: resolveLabel(ko.home, standings), awayName: resolveLabel(ko.away, standings),
        score: null, status: 'Scheduled', isLive: false, played: false, sortKey: ko.id,
      });
    }

    rows.sort((a, b) => a.sortKey - b.sortKey);
    return rows;
  }, [selectedCity, koSchedule, fixturesByCity, standings]);

  return (
    <div className="panel active" style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px 30px' }}>
      <h3 style={{ marginBottom: 12, fontSize: '1.2rem' }}>Matches by Venue</h3>
      <div style={{ marginBottom: 16 }}>
        <select
          value={selectedCity}
          onChange={e => setSelectedCity(e.target.value)}
          style={{
            padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border, #ccc)',
            fontSize: '1rem', background: 'var(--card-bg, #fff)', color: 'var(--text, #222)', minWidth: 240,
          }}
        >
          <option value="">Select a city...</option>
          {cities.map(c => <option key={c} value={c}>{c} — {VENUE_CITIES[c]}</option>)}
        </select>
      </div>

      {selectedCity && (
        <>
          <p style={{ color: '#888', marginBottom: 12 }}>{VENUE_CITIES[selectedCity]} · {selectedCity}</p>
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
                  <td style={{ padding: '8px 6px' }}>{m.dateStr}</td>
                  <td style={{ padding: '8px 6px' }}>{m.timeStr}</td>
                  <td style={{ padding: '8px 6px' }}>{FLAGS[m.homeCode] || ''} {m.homeName}</td>
                  <td style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 600 }}>{m.score || 'vs'}</td>
                  <td style={{ padding: '8px 6px' }}>{m.awayName} {FLAGS[m.awayCode] || ''}</td>
                  <td style={{ padding: '8px 6px', color: m.isLive ? 'var(--green, #16a34a)' : m.played ? '#888' : 'var(--text, #222)' }}>{m.status}</td>
                </tr>
              ))}
              {cityMatches.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: '#888' }}>No matches scheduled at this venue.</td></tr>
              )}
            </tbody>
          </table>
        </>
      )}

      {!selectedCity && <p style={{ textAlign: 'center', color: '#888', marginTop: 30 }}>Select a city above to see its match schedule.</p>}
    </div>
  );
}
