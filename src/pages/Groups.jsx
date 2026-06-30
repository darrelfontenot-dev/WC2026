import React from 'react';
import { useData } from '../context/DataContext';
import { GROUPS, FLAGS, NAMES } from '../data/constants';

export default function Groups() {
  const { standings, matchesByGroup } = useData();

  if (Object.keys(standings).length === 0) {
    return (
      <div className="panel active">
        <div className="skeleton-grid">
          {Array.from({ length: 12 }).map((_, i) => <div key={i} className="skeleton-card" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="panel active">
      <div className="group-legend">
        <span><i className="legend-swatch q" /> Qualified (top 2)</span>
        <span><i className="legend-swatch t" /> 3rd place (possible qualifier)</span>
        <span><i className="legend-swatch e" /> Eliminated</span>
      </div>
      <div className="groups-container">
        {Object.keys(GROUPS).map(g => {
          const teams = [...(standings[g] || [])].sort((a,b) => b.pts-a.pts || b.gd-a.gd || b.gf-a.gf);
          const done = teams.length > 0 && teams.every(x => x.mp >= 3);
          const matches = matchesByGroup[g] || [];

          return (
            <div key={g} className="group">
              <div className="group-header">GROUP {g}</div>
              <table>
                <thead>
                  <tr>
                    <th></th><th>Pts</th><th>MP</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((t, i) => {
                    let cls = '';
                    if (i % 2 === 1) cls += 'group-row-even ';
                    if (done && i < 2) cls += 'qualified ';
                    if (done && i === 2) cls += 'third-place ';
                    if (done && i >= 3) cls += 'eliminated ';
                    
                    return (
                      <tr key={t.code} className={cls.trim()}>
                        <td title={NAMES[t.code] || t.name || t.code}>{FLAGS[t.code] || ''} {t.code}</td>
                        <td><b>{t.pts}</b></td>
                        <td>{t.mp}</td><td>{t.w}</td><td>{t.d}</td><td>{t.l}</td>
                        <td>{t.gf}</td><td>{t.ga}</td><td>{t.gd >= 0 ? '+' : ''}{t.gd}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {matches.length > 0 && (
                <div className="group-matches">
                  <h4>Matches</h4>
                  {matches.map((m, i) => {
                    const played = m.status === 'FT';
                    const live = m.status === 'LIVE' || m.status === 'HT' || (m.status && m.status.includes("'"));
                    const sc = played || live ? `${m.hs ?? 0} – ${m.as ?? 0}` : 'vs';
                    return (
                      <div key={i} className="group-match">
                        <span className="gm-team right">{FLAGS[m.home]||''} {m.home}</span>
                        <span className={`gm-score ${!played && !live ? 'pending' : ''}`}>{sc}</span>
                        <span className="gm-team">{m.away} {FLAGS[m.away]||''}</span>
                        {live && <span className="gm-status">● {m.status === 'LIVE' ? 'LIVE' : m.status}</span>}
                        {played && <span className="gm-status" style={{color:'#888'}}>{m.status}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
