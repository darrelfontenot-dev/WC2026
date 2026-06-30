import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { FLAGS } from '../data/constants';
import { Spinner, EmptyState } from '../components/StateViews';
import { CalendarX, SearchX } from 'lucide-react';

export default function Matches() {
  const { allFixtures } = useData();
  const [search, setSearch] = useState('');

  const sortedMatches = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    let sorted = [...allFixtures].sort((a,b) => {
      const da = new Date(a.date);
      const db = new Date(b.date);
      const aPlayed = ['FT','AET','PEN'].includes(a.status);
      const bPlayed = ['FT','AET','PEN'].includes(b.status);
      const aToday = da.toDateString() === todayStr;
      const bToday = db.toDateString() === todayStr;
      const aLive = ['LIVE','1H','2H','HT'].includes(a.status) || (a.status && a.status.includes("'"));
      const bLive = ['LIVE','1H','2H','HT'].includes(b.status) || (b.status && b.status.includes("'"));
      // Live matches first
      if (aLive && !bLive) return -1;
      if (!aLive && bLive) return 1;
      // Today's unplayed matches next
      if (aToday && !aPlayed && !(bToday && !bPlayed)) return -1;
      if (bToday && !bPlayed && !(aToday && !aPlayed)) return 1;
      // Future matches next (ascending by date)
      const aFuture = !aPlayed && !aLive;
      const bFuture = !bPlayed && !bLive;
      if (aFuture && !bFuture) return -1;
      if (!aFuture && bFuture) return 1;
      if (aFuture && bFuture) return da - db;
      // Played matches last (most recent first)
      return db - da;
    });
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
    return (
      <div className="panel active">
        <Spinner label="Loading fixtures…" />
      </div>
    );
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
          const live = ['LIVE','1H','2H','HT'].includes(m.status) || (m.status && m.status.includes("'"));
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
        {sortedMatches.length === 0 && (
          <EmptyState
            icon={search ? <SearchX size={40}/> : <CalendarX size={40}/>}
            title={search ? 'No matches found' : 'No fixtures yet'}
            message={search ? `Nothing matched “${search}”. Try a different team or venue.` : 'Match data will appear here once available.'}
          />
        )}
      </div>
    </div>
  );
}
