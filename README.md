# World Cup 2026 Predictor ⚽

A live-updating React app for tracking the FIFA World Cup 2026 and predicting results. It pulls live scores and standings from ESPN's public API and lets users build and submit their own bracket.

## Features

- **Group Standings** — live table for all 12 groups with qualified / 3rd-place / eliminated highlighting, flags, and a color legend.
- **Live Bracket** — full Round of 32 → Final knockout bracket with live-match highlighting.
- **All Matches** — searchable, smart-sorted fixture list (live → today → upcoming → finished).
- **My Bracket** — build and submit a personal prediction (requires login).
- **Leaderboard** — global rankings scored against real results.
- **Venues** — browse the full schedule by host city / stadium.
- **Golden Boot** — live top-scorer race with goals, assists, and penalties.
- **Dark / light theme** toggle and responsive mobile layout.
- **Auto-refresh** every 60 seconds.

## Tech Stack

- **React 19** + **React Router 7**
- **Vite 8** build tooling
- **Supabase** for auth, brackets, and leaderboard storage
- **ESPN public API** for live scores, standings, and player stats
- **lucide-react** icons

## Getting Started

```bash
npm install
npm run dev      # start dev server
npm run build    # production build
npm run preview  # preview the build
npm run lint     # run ESLint
```

## Configuration

Create a `.env` file with your Supabase credentials:

```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

See `supabase_setup.md` for the database schema (tables: `profiles`, `brackets`) and RLS policies.

## Project Structure

```
src/
  api/football.js        ESPN data fetching + parsing
  context/               Auth and Data (live polling) providers
  components/            Navbar, AuthModal
  pages/                 Groups, Knockout, Matches, MyBracket, Leaderboard, Venues, GoldenBoot
  data/constants.js      Groups, flags, names, and the knockout schedule
  index.css              Theme variables and all styles
```
