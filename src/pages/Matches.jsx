import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { FLAGS } from '../data/constants';

export default function Matches() {
  const { allFixtures } = useData();
  const [search, setSearch] = useState('');

  const sortedMatches = useMemo(() => {
    let sorted = [...allFixtures].sort((a,b) => new Date(a.date)-new Date(b.date));
    if (search) {
      const lower = search.toLowerCase();
      sorted = sorted.filter(m => 
        (m.home && m.home.toLowerCase().includes(lower)) ||
        (m.away && m.away.toLowerCase().includes(lower)) ||
        (m.venue && m.venue.toLowerCase().includes(lower)) ||
        (m.round && m.round.toLowerCase().includes(lower))
      );
    }
    return sorted;
  }, [allFixtures, search]);

  if (!allFixtures.length) {
    return <p style={{textAlign:'center', color:'#888', padding:20}}>No match data loaded yet. Connect a data source to see all fixtures.</p>;
  }

  return (
    <div className="panel active" style={{maxWidth: 900, margin: '0 auto', padding: '0 20px 30px'}}>
      <div className="search-container">
        <input 
          type="text" 
          className="search-input" 
          placeholder="Search matches by team or venue..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div>
        <h3 style={{marginBottom: 12, fontSize: '1.2rem'}}>All Matches</h3>
        {sortedMatches.map((m, i) => {
          const played = ['FT','AET','PEN'].includes(m.status);
          const live = ['LIVE','1H','2H','HT'].includes(m.status) || m.status.includes("'");
          const dt = m.date ? new Date(m.date).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '';
          const sc = played || live ? `${m.hs ?? 0} – ${m.as ?? 0}` : 'vs';

          return (
            <div key={i} className="match-row">
              <span className="mr-date">{dt}</span>
              <span className="mr-home">{FLAGS[m.home]||''} {m.home}</span>
              <span className={`gm-score ${!played && !live ? 'pending' : ''}`}>{sc}</span>
              <span className="mr-away">{m.away} {FLAGS[m.away]||''}</span>
              <span className="mr-status" style={{color: live ? 'var(--green)' : '#888'}}>{m.status}</span>
              <span className="mr-venue">{m.venue||''}</span>
              <span className="mr-round">{m.round||''}</span>
            </div>
          );
        })}
        {sortedMatches.length === 0 && <p style={{textAlign:'center', color:'#888', marginTop:20}}>No matches found for "{search}"</p>}
      </div>
    </div>
  );
}
