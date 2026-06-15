import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { fetchESPNData, bucketGroupMatches } from '../api/football';
import { GROUPS, NAMES } from '../data/constants';

const DataContext = createContext();

export function DataProvider({ children }) {
  const [standings, setStandings] = useState({});
  const [allFixtures, setAllFixtures] = useState([]);
  const [matchesByGroup, setMatchesByGroup] = useState({});
  const [lastUpdate, setLastUpdate] = useState(null);
  const [statusText, setStatusText] = useState('Initializing...');

  const initEmpty = useCallback(() => {
    const emptyStandings = {};
    Object.keys(GROUPS).forEach(g => {
      emptyStandings[g] = GROUPS[g].map(c => ({ code: c, name: NAMES[c] || c, pts: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, mp: 0 }));
    });
    setStandings(emptyStandings);
  }, []);

  const fetchAllData = useCallback(async () => {
    setStatusText('Fetching live data...');
    let ok = false;
    let data = null;

    try {
      data = await fetchESPNData();
      ok = true;
    } catch (e) {
      console.warn('ESPN error:', e);
    }

    if (ok && data) {
      if (Object.keys(data.standings).length === 0) {
        initEmpty();
      } else {
        setStandings(data.standings);
      }
      setAllFixtures(data.allFixtures);
      setMatchesByGroup(bucketGroupMatches(data.allFixtures));
      setLastUpdate(new Date());
      setStatusText('Connected');
    } else {
      setStatusText('Could not reach any data source');
      initEmpty();
    }
  }, [initEmpty]);

  useEffect(() => {
    initEmpty();
    fetchAllData();
    const timer = setInterval(fetchAllData, 60000);
    return () => clearInterval(timer);
  }, [fetchAllData, initEmpty]);

  return (
    <DataContext.Provider value={{ standings, allFixtures, matchesByGroup, lastUpdate, statusText, fetchAllData }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
