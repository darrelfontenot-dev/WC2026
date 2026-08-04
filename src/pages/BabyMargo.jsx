import React, { useState, useEffect } from 'react';
import { Baby } from 'lucide-react';

// dt = null means no date given; month is 0-indexed
const GUESSES = [
  { name: 'Uncle Logan',                   weight: '6 lbs 6 oz',  length: '17"',   datetime: '8/4/26 8:00 am',  hair: 'Lot of hair',                    dt: new Date(2026, 7, 4,  8,  0) },
  { name: 'Uncle Luke',                    weight: '15 lbs',      length: '6"',    datetime: '8/3/26 8:00 pm',  hair: 'Hair',                           dt: new Date(2026, 7, 3, 20,  0) },
  { name: 'Aunt MK',                       weight: '5 lbs 8 oz',  length: '12"',   datetime: '8/3/26 8:00 am',  hair: 'Hair',                           dt: new Date(2026, 7, 3,  8,  0) },
  { name: 'Gigi',                          weight: '6 lbs 2 oz',  length: '18½"',  datetime: '8/4/26 4:45 pm',  hair: 'Hair',                           dt: new Date(2026, 7, 4, 16, 45) },
  { name: 'Pop Pop',                       weight: '6 lbs 9 oz',  length: '17.5"', datetime: '8/4/26 5:30 pm',  hair: 'Lot of hair',                    dt: new Date(2026, 7, 4, 17, 30) },
  { name: 'Aunt Kim',                      weight: '7 lbs 3 oz',  length: '18"',   datetime: '8/4/26 4:30 pm',  hair: 'Lots of hair',                   dt: new Date(2026, 7, 4, 16, 30) },
  { name: "Margo's future favorite uncle", weight: '6 lbs 6 oz',  length: '19"',   datetime: '8/4/26 3:00 pm',  hair: 'Dark hair',                      dt: new Date(2026, 7, 4, 15,  0) },
  { name: 'Old Pawpaw',                    weight: '5 lbs 15 oz', length: '16"',   datetime: '—',               hair: 'Plenty of dark hair. Beautiful.', dt: null },
  { name: 'Collin',                        weight: '6 lbs 4 oz',  length: '13"',   datetime: '8/4/26 6:30 pm',  hair: 'Hair',                           dt: new Date(2026, 7, 4, 18, 30) },
  { name: 'Cadence',                       weight: '6 lbs 8 oz',  length: '12"',   datetime: '8/4/26 5:00 pm',  hair: 'Hair',                           dt: new Date(2026, 7, 4, 17,  0) },
];

const COLS = ['name', 'weight', 'length', 'datetime', 'hair'];
const LABELS = { name: 'Guesser', weight: 'Weight', length: 'Length', datetime: 'Date & Time', hair: 'Hair' };

export default function BabyMargo() {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [now, setNow] = useState(() => new Date());

  // Update "now" every minute so badges stay accurate
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const sorted = [...GUESSES].sort((a, b) => {
    if (!sortCol) return 0;
    if (sortCol === 'datetime') {
      // null dates sort last
      if (!a.dt && !b.dt) return 0;
      if (!a.dt) return 1;
      if (!b.dt) return -1;
      return sortDir === 'asc' ? a.dt - b.dt : b.dt - a.dt;
    }
    const va = String(a[sortCol]).toLowerCase();
    const vb = String(b[sortCol]).toLowerCase();
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="page-container">
      <div className="baby-margo-header">
        <Baby size={32} className="baby-icon" />
        <h2>Baby Margo</h2>
        <Baby size={32} className="baby-icon" />
      </div>
      <p className="baby-margo-subtitle">Everyone's guesses for Baby Margo's arrival 👶</p>

      <div className="table-wrapper">
        <table className="baby-margo-table">
          <thead>
            <tr>
              {COLS.map(col => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className={sortCol === col ? 'sorted' : ''}
                  aria-sort={sortCol === col ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  {LABELS[col]}
                  {sortCol === col ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((g, i) => {
              const past = g.dt ? g.dt < now : null;
              return (
                <tr key={i} className={past === true ? 'guess-past' : past === false ? 'guess-upcoming' : ''}>
                  <td className="guesser-name">{g.name}</td>
                  <td>{g.weight}</td>
                  <td>{g.length}</td>
                  <td>
                    <span>{g.datetime}</span>
                    {past === true  && <span className="dt-badge dt-past">Passed</span>}
                    {past === false && <span className="dt-badge dt-upcoming">Upcoming</span>}
                  </td>
                  <td>{g.hair}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="baby-margo-note">Click a column header to sort. Current date: 8/4/26.</p>
    </div>
  );
}
