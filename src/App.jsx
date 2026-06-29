import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';

import Navbar from './components/Navbar';
import Groups from './pages/Groups';
import Knockout from './pages/Knockout';
import Matches from './pages/Matches';
import MyBracket from './pages/MyBracket';
import Leaderboard from './pages/Leaderboard';
import Venues from './pages/Venues';
import GoldenBoot from './pages/GoldenBoot';
import BracketVisual from './pages/BracketVisual';
import BracketWheel from './pages/BracketWheel';

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <BrowserRouter>
          <div className="app-container">
            <Navbar />
            <Routes>
              <Route path="/" element={<Groups />} />
              <Route path="/bracket" element={<Knockout />} />
              <Route path="/matches" element={<Matches />} />
              <Route path="/my-bracket" element={<MyBracket />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/venues" element={<Venues />} />
              <Route path="/golden-boot" element={<GoldenBoot />} />
              <Route path="/bracket-visual" element={<BracketVisual />} />
              <Route path="/bracket-wheel" element={<BracketWheel />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
