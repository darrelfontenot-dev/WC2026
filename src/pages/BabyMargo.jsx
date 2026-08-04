import React, { useState } from 'react';
import { Baby } from 'lucide-react';

// "today" in guesses = 8/4/26
const GUESSES = [
  { name: 'Uncle Logan',                weight: '6 lbs 6 oz',  length: '17"',    datetime: '8/4/26 8:00 am',   hair: 'Lot of hair' },
  { name: 'Uncle Luke',                 weight: '15 lbs',      length: '6"',     datetime: '8/3/26 8:00 pm',   hair: 'Hair' },
  { name: 'Aunt MK',                    weight: '5 lbs 8 oz',  length: '12"',    datetime: '8/3/26 8:00 am',   hair: 'Hair' },
  { name: 'Gigi',                       weight: '6 lbs 2 oz',  length: '18½"',   datetime: '8/4/26 4:45 pm',   hair: 'Hair' },
  { name: 'Pop Pop',                    weight: '6 lbs 9 oz',  length: '17.5"',  datetime: '8/4/26 5:30 pm',   hair: 'Lot of hair' },
  { name: '(unnamed)',                  weight: '7 lbs 3 oz',  length: '18"',    datetime: '8/4/26 4:30 pm',   hair: 'Lots of hair' },
  { name: "Margo's future favorite uncle", weight: '6 lbs 6 oz', length: '19"', datetime: '8/4/26 3:00 pm',   hair: 'Dark hair' },
  { name: 'Old Pawpaw',                 weight: '5 lbs 15 oz', length: '16"',    datetime: '—',                 hair: 'Plenty of dark hair. Beautiful.' },
  { name: 'Collin',                     weight: '6 lbs 4 oz',  length: '13"',    datetime: '8/4/26 6:30 pm',   hair: 'Hair' },
  { name: 'Cadence',                    weight: '6 lbs 8 oz',  length: '12"',    datetime: '8/4/26 5:00 pm',   hair: 'Hair' },
];

const COLS = ['name', 'weight', 'length', 'datetime', 'hair'];
const LABELS = { name: 'Guesser', weight: 'Weight', length: 'Length', datetime: 'Date & Time', hair: 'Hair' };

export default function BabyMargo() {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

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
    const va = a[sortCol].toLowerCase();
    const vb = b[sortCol].toLowerCase();
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
            {sorted.map((g, i) => (
              <tr key={i}>
                <td className="guesser-name">{g.name}</td>
                <td>{g.weight}</td>
                <td>{g.length}</td>
                <td>{g.datetime}</td>
                <td>{g.hair}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="baby-margo-note">Click a column header to sort. Current date: 8/4/26.</p>
    </div>
  );
}
