import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';

import Navbar from './components/Navbar';
import InstallPrompt from './components/InstallPrompt';
import ScrollToTop from './components/ScrollToTop';
import Groups from './pages/Groups';
import Knockout from './pages/Knockout';
import Matches from './pages/Matches';
import MyBracket from './pages/MyBracket';
import Leaderboard from './pages/Leaderboard';
import Venues from './pages/Venues';
import GoldenBoot from './pages/GoldenBoot';
import BracketVisual from './pages/BracketVisual';
import BabyMargo from './pages/BabyMargo';

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <BrowserRouter>
          <div className="app-container">
            <ScrollToTop />
            <Navbar />
            <InstallPrompt />
            <main>
            <Routes>
              <Route path="/baby-margo" element={<BabyMargo />} />
              <Route path="*" element={<Navigate to="/baby-margo" replace />} />
            </Routes>
            </main>
          </div>
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
