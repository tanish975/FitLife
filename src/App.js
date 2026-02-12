import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Layout from './layout';
import Dashboard from './page/dashboard';
import Profile from './page/profile';
import Calories from './page/calories';
import Workouts from './page/workouts';
import { ThemeProvider } from './context/ThemeContext';

function AppContent() {
  const location = useLocation();
  // Capitalize the first letter of the page name
  const currentPageName = location.pathname.substring(1).charAt(0).toUpperCase() + location.pathname.slice(2) || 'Dashboard';

  return (
    <Layout currentPageName={currentPageName}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/calories" element={<Calories />} />
          <Route path="/workouts" element={<Workouts />} />
        </Routes>
      </AnimatePresence>
    </Layout>
  );
}



function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}

export default App;
