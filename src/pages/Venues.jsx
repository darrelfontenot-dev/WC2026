import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { KO, FLAGS, NAMES } from '../data/constants';

/* ── venue map ─────────────────────────────────────────────── */
const VENUE_CITIES = {
  'Arlington':        'AT&T Stadium',
  'Atlanta':          'Mercedes-Benz Stadium',
  'East Rutherford':  'MetLife Stadium',
  'Foxborough':       'Gillette Stadium',
  'Guadalajara':      'Estadio Akron',
  'Guadalupe':        'Estadio BBVA',
  'Houston':          'NRG Stadium',
  'Inglewood':        'SoFi Stadium',
  'Kansas City':      'Arrowhead Stadium',
  'Mexico City':      'Estadio Azteca',
  'Miami':            'Hard Rock Stadium',
  'Philadelphia':     'Lincoln Financial Field',
  'Santa Clara':      "Levi's Stadium",
  'Seattle':          'Lumen Field',
  'Toronto':          'BMO Field',
  'Vancouver':        'BC Place',
};

/* ── complete group-stage schedule (all 72 matches, times in CDT) ── */
// Each entry: [date, timeCDT, homeCode, awayCode, city]
const GROUP_SCHEDULE = [
  // ─── Group A ───
  ['Jun 11','2:00 PM','MEX','RSA','Mexico City'],
  ['Jun 11','9:00 PM','KOR','CZE','Guadalajara'],
  ['Jun 18','11:00 AM','CZE','RSA','Atlanta'],
  ['Jun 18','8:00 PM','MEX','KOR','Guadalajara'],
  ['Jun 24','8:00 PM','CZE','MEX','Mexico City'],
  ['Jun 24','8:00 PM','RSA','KOR','Guadalupe'],
  // ─── Group B ───
  ['Jun 12','2:00 PM','CAN','BIH','Toronto'],
  ['Jun 13','2:00 PM','QAT','SUI','Santa Clara'],
  ['Jun 18','2:00 PM','SUI','BIH','Inglewood'],
  ['Jun 18','5:00 PM','CAN','QAT','Vancouver'],
  ['Jun 24','2:00 PM','SUI','CAN','Vancouver'],
  ['Jun 24','2:00 PM','BIH','QAT','Seattle'],
  // ─── Group C ───
  ['Jun 13','5:00 PM','BRA','MAR','East Rutherford'],
  ['Jun 13','8:00 PM','HAI','SCO','Foxborough'],
  ['Jun 19','5:00 PM','SCO','MAR','Foxborough'],
  ['Jun 19','7:30 PM','BRA','HAI','Philadelphia'],
  ['Jun 24','5:00 PM','SCO','BRA','Miami'],
  ['Jun 24','5:00 PM','MAR','HAI','Atlanta'],
  // ─── Group D ───
  ['Jun 12','8:00 PM','USA','PAR','Inglewood'],
  ['Jun 13','11:00 PM','AUS','TUR','Vancouver'],
  ['Jun 19','2:00 PM','USA','AUS','Seattle'],
  ['Jun 19','10:00 PM','TUR','PAR','Santa Clara'],
  ['Jun 25','9:00 PM','TUR','USA','Inglewood'],
  ['Jun 25','9:00 PM','PAR','AUS','Santa Clara'],
  // ─── Group E ───
  ['Jun 14','12:00 PM','GER','CUW','Houston'],
  ['Jun 14','6:00 PM','CIV','ECU','Philadelphia'],
  ['Jun 20','3:00 PM','GER','CIV','Toronto'],
  ['Jun 20','7:00 PM','ECU','CUW','Kansas City'],
  ['Jun 25','3:00 PM','CUW','CIV','Philadelphia'],
  ['Jun 25','3:00 PM','ECU','GER','East Rutherford'],
  // ─── Group F ───
  ['Jun 14','3:00 PM','NED','JPN','Arlington'],
  ['Jun 14','9:00 PM','SWE','TUN','Guadalupe'],
  ['Jun 20','12:00 PM','NED','SWE','Houston'],
  ['Jun 20','11:00 PM','TUN','JPN','Guadalupe'],
  ['Jun 25','6:00 PM','JPN','SWE','Arlington'],
  ['Jun 25','6:00 PM','TUN','NED','Kansas City'],
  // ─── Group G ───
  ['Jun 15','2:00 PM','BEL','EGY','Seattle'],
  ['Jun 15','8:00 PM','IRN','NZL','Inglewood'],
  ['Jun 21','2:00 PM','BEL','IRN','Inglewood'],
  ['Jun 21','8:00 PM','NZL','EGY','Vancouver'],
  ['Jun 26','10:00 PM','EGY','IRN','Seattle'],
  ['Jun 26','10:00 PM','NZL','BEL','Vancouver'],
  // ─── Group H ───
  ['Jun 15','11:00 AM','ESP','CPV','Atlanta'],
  ['Jun 15','5:00 PM','KSA','URU','Miami'],
  ['Jun 21','11:00 AM','ESP','KSA','Atlanta'],
  ['Jun 21','5:00 PM','URU','CPV','Miami'],
  ['Jun 26','7:00 PM','CPV','KSA','Houston'],
  ['Jun 26','7:00 PM','URU','ESP','Guadalajara'],
  // ─── Group I ───
  ['Jun 16','2:00 PM','FRA','SEN','East Rutherford'],
  ['Jun 16','5:00 PM','IRQ','NOR','Foxborough'],
  ['Jun 22','4:00 PM','FRA','IRQ','Philadelphia'],
  ['Jun 22','7:00 PM','NOR','SEN','East Rutherford'],
  ['Jun 26','2:00 PM','NOR','FRA','Foxborough'],
  ['Jun 26','2:00 PM','SEN','IRQ','Toronto'],
  // ─── Group J ───
  ['Jun 16','8:00 PM','ARG','ALG','Kansas City'],
  ['Jun 16','11:00 PM','AUT','JOR','Santa Clara'],
  ['Jun 22','12:00 PM','ARG','AUT','Arlington'],
  ['Jun 22','10:00 PM','JOR','ALG','Santa Clara'],
  ['Jun 27','9:00 PM','ALG','AUT','Kansas City'],
  ['Jun 27','9:00 PM','JOR','ARG','Arlington'],
  // ─── Group K ───
  ['Jun 17','12:00 PM','POR','COD','Houston'],
  ['Jun 17','9:00 PM','UZB','COL','Mexico City'],
  ['Jun 23','12:00 PM','POR','UZB','Houston'],
  ['Jun 23','9:00 PM','COL','COD','Guadalajara'],
  ['Jun 27','6:30 PM','COL','POR','Miami'],
  ['Jun 27','6:30 PM','COD','UZB','Atlanta'],
  // ─── Group L ───
  ['Jun 17','3:00 PM','ENG','CRO','Arlington'],
  ['Jun 17','6:00 PM','GHA','PAN','Toronto'],
  ['Jun 23','3:00 PM','ENG','GHA','Foxborough'],
  ['Jun 23','6:00 PM','PAN','CRO','Toronto'],
  ['Jun 27','4:00 PM','PAN','ENG','East Rutherford'],
  ['Jun 27','4:00 PM','CRO','GHA','Philadelphia'],
];

/* ── helpers ───────────────────────────────────────────────── */
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

/* ── component ─────────────────────────────────────────────── */
export default function Venues() {
  const { allFixtures, standings } = useData();
  const [selectedCity, setSelectedCity] = useState('');

  const cities = Object.keys(VENUE_CITIES).sort();
  const koSchedule = useMemo(() => parseKOSchedule(), []);

  // Build a lookup from "HOME-AWAY" to ESPN fixture for live scores
  const espnLookup = useMemo(() => {
    const map = {};
    for (const f of allFixtures) {
      if (f.home && f.away) map[`${f.home}-${f.away}`] = f;
    }
    return map;
  }, [allFixtures]);

  const cityMatches = useMemo(() => {
    if (!selectedCity) return [];
    const rows = [];

    // Group stage matches from static schedule
    for (const [dateStr, timeStr, home, away, city] of GROUP_SCHEDULE) {
      if (city !== selectedCity) continue;
      const espn = espnLookup[`${home}-${away}`];
      const played = espn && ['FT', 'AET', 'PEN'].includes(espn.status);
      const isLive = espn && (espn.status.includes("'") || ['LIVE', '1H', '2H', 'HT'].includes(espn.status));
      const sortDate = new Date(`${dateStr} 2026 ${timeStr}`);
      rows.push({
        dateStr, timeStr: `${timeStr} CDT`,
        homeCode: home, awayCode: away,
        homeName: NAMES[home] || home, awayName: NAMES[away] || away,
        score: (played || isLive) ? `${espn.hs} – ${espn.as}` : null,
        status: !espn ? 'Scheduled' : espn.status === 'NS' ? 'Scheduled' : espn.status,
        isLive: !!isLive, played: !!played,
        sortKey: isNaN(sortDate.getTime()) ? 0 : sortDate.getTime(),
      });
    }

    // Knockout matches from KO constants
    for (const ko of koSchedule.filter(m => m.city === selectedCity)) {
      const hc = resolveCode(ko.home, standings);
      const ac = resolveCode(ko.away, standings);
      const espn = espnLookup[`${hc}-${ac}`];
      const played = espn && ['FT', 'AET', 'PEN'].includes(espn.status);
      const isLive = espn && (espn.status.includes("'") || ['LIVE', '1H', '2H', 'HT'].includes(espn.status));
      const koDate = new Date(`${ko.dateStr} 2026 ${ko.timeStr}`);
      rows.push({
        dateStr: ko.dateStr, timeStr: `${ko.timeStr} CDT`,
        homeCode: hc, awayCode: ac,
        homeName: resolveLabel(ko.home, standings), awayName: resolveLabel(ko.away, standings),
        score: (played || isLive) ? `${espn.hs} – ${espn.as}` : null,
        status: !espn ? 'Scheduled' : espn.status === 'NS' ? 'Scheduled' : espn.status,
        isLive: !!isLive, played: !!played,
        sortKey: isNaN(koDate.getTime()) ? 9999999999999 : koDate.getTime(),
      });
    }

    rows.sort((a, b) => a.sortKey - b.sortKey);
    return rows;
  }, [selectedCity, koSchedule, espnLookup, standings]);

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
