import React, { useState, useEffect } from 'react';
import { Baby, Trophy, Lock } from 'lucide-react';

// Change this to whatever PIN you want the family to use
const ADMIN_PIN = 'margo';

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
const LABELS = { name: 'Guesser', weight: 'Weight', length: 'Length', datetime: 'Date & Time', hair: 'Hair', score: 'Score' };

// ── Scoring helpers ───────────────────────────────────────────────────────────

// "6 lbs 6 oz" / "15 lbs" / "8 oz" → total ounces
function parseWeightOz(str) {
  if (!str) return null;
  const lbOz = str.match(/(\d+(?:\.\d+)?)\s*lbs?\s+(\d+(?:\.\d+)?)\s*oz?/i);
  if (lbOz) return parseFloat(lbOz[1]) * 16 + parseFloat(lbOz[2]);
  const lbOnly = str.match(/(\d+(?:\.\d+)?)\s*lbs?/i);
  if (lbOnly) return parseFloat(lbOnly[1]) * 16;
  const ozOnly = str.match(/(\d+(?:\.\d+)?)\s*oz/i);
  if (ozOnly) return parseFloat(ozOnly[1]);
  return null;
}

// '18½"' / '17.5"' / '19"' → decimal inches
function parseLengthIn(str) {
  if (!str) return null;
  const s = str.replace('½', '.5').replace('¼', '.25').replace('¾', '.75').replace(/"/g, '').trim();
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// [maxDiff, pts] tiers – ordered ascending
const WEIGHT_SCALE   = [[1, 25], [2, 22], [4, 18], [8, 12], [16, 7]];   // oz diff → pts (max 25)
const LENGTH_SCALE   = [[0.25, 25], [0.5, 22], [1, 18], [2, 12], [3, 7]]; // inch diff (max 25)
const DATETIME_SCALE = [[30, 40], [60, 35], [120, 28], [240, 20], [480, 14], [720, 9], [1440, 5]]; // min diff (max 40)

function tieredPts(diff, scale, fallback) {
  for (const [max, pts] of scale) if (diff <= max) return pts;
  return fallback;
}

function scoreGuess(guess, actual) {
  let weight = 0, length = 0, datetime = 0, hair = 0;

  const gOz = parseWeightOz(guess.weight);
  const aOz = parseWeightOz(actual.weightStr);
  if (gOz !== null && aOz !== null) weight = tieredPts(Math.abs(gOz - aOz), WEIGHT_SCALE, 3);

  const gIn = parseLengthIn(guess.length);
  const aIn = parseLengthIn(actual.lengthStr);
  if (gIn !== null && aIn !== null) length = tieredPts(Math.abs(gIn - aIn), LENGTH_SCALE, 3);

  if (guess.dt && actual.dt) {
    const diffMin = Math.abs(guess.dt - actual.dt) / 60000;
    datetime = tieredPts(diffMin, DATETIME_SCALE, 1);
  }

  // Hair: everyone guessed "hair" – score 10 if they matched yes/no
  const actualHasHair = actual.hair === 'yes';
  const guessedNoHair = /no hair|bald/i.test(guess.hair);
  if (!guessedNoHair === actualHasHair) hair = 10;

  return { weight, length, datetime, hair, total: weight + length + datetime + hair };
}

function fmtActualDateTime(dateStr, timeStr) {
  if (!dateStr) return '—';
  const d = new Date(`${dateStr}T${timeStr || '00:00'}`);
  if (isNaN(d)) return '—';
  const date = d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
  const time = timeStr ? ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
  return date + time;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BabyMargo() {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [now, setNow] = useState(() => new Date());

  // Admin
  const [showAdmin, setShowAdmin]     = useState(false);
  const [pinInput, setPinInput]       = useState('');
  const [pinError, setPinError]       = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);

  // Actual results – persisted in localStorage
  const [actual, setActual] = useState(() => {
    try { return JSON.parse(localStorage.getItem('babyMargoActual') || 'null'); } catch { return null; }
  });
  const [form, setForm] = useState({
    weightLbs: '', weightOz: '', lengthIn: '', date: '', time: '', hair: 'yes',
  });

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  // Pre-fill form when existing results are loaded
  useEffect(() => {
    if (actual) setForm({
      weightLbs: actual.weightLbs ?? '',
      weightOz:  actual.weightOz  ?? '',
      lengthIn:  actual.lengthIn  ?? '',
      date:      actual.date      ?? '',
      time:      actual.time      ?? '',
      hair:      actual.hair      ?? 'yes',
    });
  }, [actual]);

  // Build a resolved actual object (with derived fields) for scoring
  const resolveActual = (saved) => {
    if (!saved) return null;
    const lbs = parseFloat(saved.weightLbs) || 0;
    const oz  = parseFloat(saved.weightOz)  || 0;
    const weightStr = (lbs > 0 && oz > 0) ? `${lbs} lbs ${oz} oz`
                    : lbs > 0             ? `${lbs} lbs`
                    : oz > 0              ? `${oz} oz` : '';
    const lengthStr = saved.lengthIn ? `${saved.lengthIn}"` : '';
    let dt = null;
    if (saved.date && saved.time) {
      const d = new Date(`${saved.date}T${saved.time}`);
      if (!isNaN(d)) dt = d;
    }
    return { ...saved, weightStr, lengthStr, dt };
  };

  const actualResolved = resolveActual(actual);
  const scores = actualResolved
    ? Object.fromEntries(GUESSES.map((g, i) => [i, scoreGuess(g, actualResolved)]))
    : null;

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput === ADMIN_PIN) { setAdminUnlocked(true); setPinError(false); }
    else setPinError(true);
  };

  const handleSaveResults = (e) => {
    e.preventDefault();
    localStorage.setItem('babyMargoActual', JSON.stringify(form));
    setActual(form);
  };

  const handleClearResults = () => {
    if (window.confirm('Clear the actual results and reset all scores?')) {
      localStorage.removeItem('babyMargoActual');
      setActual(null);
    }
  };

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const displayCols = scores ? [...COLS, 'score'] : COLS;

  const sorted = GUESSES.map((g, i) => ({ ...g, _idx: i })).sort((a, b) => {
    if (sortCol === 'score') {
      const sa = scores?.[a._idx]?.total ?? -1;
      const sb = scores?.[b._idx]?.total ?? -1;
      return sortDir === 'asc' ? sa - sb : sb - sa;
    }
    if (sortCol === 'datetime') {
      if (!a.dt && !b.dt) return 0;
      if (!a.dt) return 1;
      if (!b.dt) return -1;
      return sortDir === 'asc' ? a.dt - b.dt : b.dt - a.dt;
    }
    if (!sortCol) return 0;
    const va = String(a[sortCol]).toLowerCase();
    const vb = String(b[sortCol]).toLowerCase();
    return va < vb ? (sortDir === 'asc' ? -1 : 1) : va > vb ? (sortDir === 'asc' ? 1 : -1) : 0;
  });

  const ranked = scores
    ? GUESSES.map((g, i) => ({ ...g, _idx: i })).sort((a, b) => scores[b._idx].total - scores[a._idx].total)
    : null;

  return (
    <div className="page-container">
      <div className="baby-margo-header">
        <Baby size={32} className="baby-icon" />
        <h2>Baby Margo</h2>
        <Baby size={32} className="baby-icon" />
      </div>
      <p className="baby-margo-subtitle">Everyone's guesses for Baby Margo's arrival 👶</p>

      {/* ── Leaderboard (only shown once results are entered) ── */}
      {ranked && (
        <div className="bm-leaderboard">
          <div className="bm-leaderboard-title"><Trophy size={18} /> Leaderboard</div>
          <div className="bm-actual-banner">
            <span>⚖️ {actualResolved.weightStr}</span>
            <span>📏 {actualResolved.lengthStr}"</span>
            <span>🕐 {fmtActualDateTime(actual.date, actual.time)}</span>
            <span>{actual.hair === 'yes' ? '💇 Has hair' : '✨ No hair'}</span>
          </div>
          {ranked.map((g, rank) => {
            const s = scores[g._idx];
            const medal = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `${rank + 1}.`;
            return (
              <div key={g._idx} className={`bm-rank-row${rank < 3 ? ' bm-rank-top' : ''}`}>
                <span className="bm-rank-pos">{medal}</span>
                <span className="bm-rank-name">{g.name}</span>
                <span className="bm-rank-total">{s.total} pts</span>
                <span className="bm-rank-breakdown">⚖️{s.weight} · 📏{s.length} · 🕐{s.datetime} · 💇{s.hair}</span>
              </div>
            );
          })}
          <p className="bm-scoring-note">
            Max: Weight 25 · Length 25 · Date &amp; Time 40 · Hair 10 = <strong>100 pts</strong>
          </p>
        </div>
      )}

      <div className="table-wrapper">
        <table className="baby-margo-table">
          <thead>
            <tr>
              {displayCols.map(col => (
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
            {sorted.map((g) => {
              const past = g.dt ? g.dt < now : null;
              const s = scores?.[g._idx];
              return (
                <tr key={g._idx} className={past === true ? 'guess-past' : past === false ? 'guess-upcoming' : ''}>
                  <td className="guesser-name">{g.name}</td>
                  <td>{g.weight}{s && <span className="bm-subscore">({s.weight})</span>}</td>
                  <td>{g.length}{s && <span className="bm-subscore">({s.length})</span>}</td>
                  <td>
                    <span>{g.datetime}</span>
                    {past === true  && <span className="dt-badge dt-past">Passed</span>}
                    {past === false && <span className="dt-badge dt-upcoming">Upcoming</span>}
                    {s && <span className="bm-subscore">({s.datetime})</span>}
                  </td>
                  <td>{g.hair}{s && <span className="bm-subscore">({s.hair})</span>}</td>
                  {s && <td className="bm-score-cell"><strong>{s.total}</strong></td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="baby-margo-note">Click a column header to sort.{scores && ' Sub-scores shown in parentheses.'}</p>

      {/* ── Admin panel ── */}
      <div className="bm-admin-section">
        <button className="bm-admin-toggle" onClick={() => setShowAdmin(v => !v)}>
          <Lock size={13} /> {showAdmin ? 'Hide Results Entry' : 'Enter Actual Results'}
        </button>

        {showAdmin && (
          <div className="bm-admin-panel">
            {!adminUnlocked ? (
              <form className="bm-pin-form" onSubmit={handlePinSubmit}>
                <label htmlFor="bm-pin">Admin PIN</label>
                <input
                  id="bm-pin"
                  type="password"
                  autoComplete="off"
                  value={pinInput}
                  onChange={e => { setPinInput(e.target.value); setPinError(false); }}
                  placeholder="Enter PIN"
                  autoFocus
                />
                <button type="submit">Unlock</button>
                {pinError && <span className="bm-pin-error">Incorrect PIN</span>}
              </form>
            ) : (
              <form className="bm-results-form" onSubmit={handleSaveResults}>
                <h3>Actual Results</h3>
                <div className="bm-form-row">
                  <label>Weight</label>
                  <input type="number" min="0" max="20" step="1" placeholder="lbs" value={form.weightLbs}
                    onChange={e => setForm(f => ({ ...f, weightLbs: e.target.value }))} />
                  <span>lbs</span>
                  <input type="number" min="0" max="15" step="1" placeholder="oz" value={form.weightOz}
                    onChange={e => setForm(f => ({ ...f, weightOz: e.target.value }))} />
                  <span>oz</span>
                </div>
                <div className="bm-form-row">
                  <label>Length</label>
                  <input type="number" min="0" max="30" step="0.25" placeholder="e.g. 19.5" value={form.lengthIn}
                    onChange={e => setForm(f => ({ ...f, lengthIn: e.target.value }))} />
                  <span>inches</span>
                </div>
                <div className="bm-form-row">
                  <label>Date</label>
                  <input type="date" value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="bm-form-row">
                  <label>Time</label>
                  <input type="time" value={form.time}
                    onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
                </div>
                <div className="bm-form-row">
                  <label>Hair?</label>
                  <select value={form.hair} onChange={e => setForm(f => ({ ...f, hair: e.target.value }))}>
                    <option value="yes">Yes — has hair</option>
                    <option value="no">No — bald / no hair</option>
                  </select>
                </div>
                <div className="bm-form-actions">
                  <button type="submit" className="bm-save-btn">💾 Save &amp; Score</button>
                  {actual && <button type="button" className="bm-clear-btn" onClick={handleClearResults}>Clear Results</button>}
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
