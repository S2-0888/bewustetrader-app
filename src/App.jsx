import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from './lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { 
  SquaresFour, Notebook, Briefcase, ChartLineUp, 
  Gear, SignOut, ShieldCheck 
} from '@phosphor-icons/react';

import Dashboard from './components/Dashboard';
import TradeLab from './components/TradeLab';
import Portfolio from './components/Portfolio';
import Finance from './components/Finance';
import Settings from './components/Settings';
import Login from './components/Login';
import Admin from './components/Admin'; // Vergeet niet dit bestand aan te maken!

function App() {
  const [user, loading] = useAuthState(auth);
  const [view, setView] = useState('cockpit');
  const [userProfile, setUserProfile] = useState(null);

  // Haal de gebruikersrol op om te checken of iemand Admin is
  useEffect(() => {
    if (user) {
      const unsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
        if (docSnap.exists()) {
          setUserProfile(docSnap.data());
        }
      });
      return () => unsub();
    }
  }, [user]);

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#F5F5F7', color: '#86868B', fontFamily: 'sans-serif' }}>
      Laden...
    </div>
  );

  if (!user) return <Login />;

  const handleLogout = () => {
    auth.signOut();
  };

  const isAdmin = userProfile?.role === 'admin';

  return (
    <div className="app-container">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-header" style={{ padding: '10px 0 35px 0' }}>
          <div style={{ fontSize: 19, fontWeight: 800, color: '#1D1D1F', letterSpacing: '-0.6px' }}>
            Command Wall <span style={{ color: '#86868B', fontWeight: 400 }}>Pro</span>
          </div>
        </div>

        <nav className="sidebar-nav" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <button className={`nav-item ${view === 'cockpit' ? 'active' : ''}`} onClick={() => setView('cockpit')}>
            <SquaresFour size={20} weight={view === 'cockpit' ? "fill" : "bold"} />
            <span>Cockpit</span>
          </button>

          <button className={`nav-item ${view === 'tradelab' ? 'active' : ''}`} onClick={() => setView('tradelab')}>
            <Notebook size={20} weight={view === 'tradelab' ? "fill" : "bold"} />
            <span>Trade Lab</span>
          </button>

          <button className={`nav-item ${view === 'portfolio' ? 'active' : ''}`} onClick={() => setView('portfolio')}>
            <Briefcase size={20} weight={view === 'portfolio' ? "fill" : "bold"} />
            <span>Portfolio</span>
          </button>

          <button className={`nav-item ${view === 'finance' ? 'active' : ''}`} onClick={() => setView('finance')}>
            <ChartLineUp size={20} weight={view === 'finance' ? "fill" : "bold"} />
            <span>Finance</span>
          </button>

          {/* ADMIN TAB (Alleen zichtbaar voor admins) */}
          {isAdmin && (
            <button className={`nav-item ${view === 'admin' ? 'active' : ''}`} onClick={() => setView('admin')}>
              <ShieldCheck size={20} weight={view === 'admin' ? "fill" : "bold"} />
              <span>Admin</span>
            </button>
          )}

          <button className={`nav-item ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}>
            <Gear size={20} weight={view === 'settings' ? "fill" : "bold"} />
            <span>Settings</span>
          </button>
        </nav>

        <div className="sidebar-footer" style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          <button className="nav-item" onClick={handleLogout} style={{ color: '#FF3B30' }}>
            <SignOut size={20} weight="bold" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MOBIELE TAB BAR */}
      <nav className="mobile-tab-bar">
        <button className={`tab-item ${view === 'cockpit' ? 'active' : ''}`} onClick={() => setView('cockpit')}>
          <SquaresFour size={24} weight={view === 'cockpit' ? "fill" : "regular"} />
          <span>Cockpit</span>
        </button>
        <button className={`tab-item ${view === 'tradelab' ? 'active' : ''}`} onClick={() => setView('tradelab')}>
          <Notebook size={24} weight={view === 'tradelab' ? "fill" : "regular"} />
          <span>Trade Lab</span>
        </button>
        
        {/* Op mobiel tonen we Admin alleen als er plek is, of je vervangt een ander icoon */}
        {isAdmin ? (
          <button className={`tab-item ${view === 'admin' ? 'active' : ''}`} onClick={() => setView('admin')}>
            <ShieldCheck size={24} weight={view === 'admin' ? "fill" : "regular"} />
            <span>Admin</span>
          </button>
        ) : (
          <button className={`tab-item ${view === 'portfolio' ? 'active' : ''}`} onClick={() => setView('portfolio')}>
            <Briefcase size={24} weight={view === 'portfolio' ? "fill" : "regular"} />
            <span>Portfolio</span>
          </button>
        )}

        <button className={`tab-item ${view === 'finance' ? 'active' : ''}`} onClick={() => setView('finance')}>
          <ChartLineUp size={24} weight={view === 'finance' ? "fill" : "regular"} />
          <span>Finance</span>
        </button>
        <button className={`tab-item ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}>
          <Gear size={24} weight={view === 'settings' ? "fill" : "regular"} />
          <span>Settings</span>
        </button>
      </nav>

      {/* MAIN CONTENT */}
      <main className="main">
        {view === 'cockpit' && <Dashboard />}
        {view === 'tradelab' && <TradeLab />}
        {view === 'portfolio' && <Portfolio />}
        {view === 'finance' && <Finance />}
        {view === 'settings' && <Settings />}
        {view === 'admin' && <Admin />}
      </main>
    </div>
  );
}

export default App;