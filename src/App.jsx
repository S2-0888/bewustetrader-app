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
import Admin from './components/Admin';

function App() {
  const [user, loading] = useAuthState(auth);
  const [view, setView] = useState('cockpit');
  const [userProfile, setUserProfile] = useState(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setIsProfileLoading(true);
      const unsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
        if (docSnap.exists()) {
          setUserProfile(docSnap.data());
        }
        setIsProfileLoading(false);
      });
      return () => unsub();
    } else {
      setIsProfileLoading(false);
    }
  }, [user]);

  // LAADSCHERM: Voorkomt de "wit scherm" flits tijdens het matchen
  if (loading || (user && isProfileLoading)) return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F5F5F7', fontFamily: 'sans-serif' }}>
      <div style={{ position: 'relative', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ position: 'absolute', width: 30, height: 30, borderTop: '3.5px solid #1D1D1F', borderLeft: '3.5px solid #1D1D1F', transform: 'rotate(45deg)', top: 2 }}></div>
          <div style={{ position: 'absolute', width: 10, height: 10, borderRadius: '50%', border: '3.5px solid #1D1D1F', bottom: 4 }}></div>
      </div>
      <div style={{ color: '#1D1D1F', fontWeight: 800, fontSize: 14, letterSpacing: '1px' }}>MATCHING SYSTEMS...</div>
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
          <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#1D1D1F', letterSpacing: '1px', lineHeight: 1 }}>DBT</div>
              <div style={{ fontSize: 8, fontWeight: 800, color: '#86868B', marginTop: 4 }}>CONSCIOUS TRADER</div>
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
            <span>Inventory</span>
          </button>

          <button className={`nav-item ${view === 'finance' ? 'active' : ''}`} onClick={() => setView('finance')}>
            <ChartLineUp size={20} weight={view === 'finance' ? "fill" : "bold"} />
            <span>Finance</span>
          </button>

          {isAdmin && (
            <button className={`nav-item ${view === 'admin' ? 'active' : 'nav-admin'}`} onClick={() => setView('admin')} style={{ marginTop: 20, background: view === 'admin' ? '#1D1D1F' : 'rgba(0,122,255,0.05)', color: view === 'admin' ? 'white' : '#007AFF' }}>
              <ShieldCheck size={20} weight={view === 'admin' ? "fill" : "bold"} />
              <span>Command Center</span>
            </button>
          )}
        </nav>

        <div className="sidebar-footer" style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          <button className="nav-item" onClick={handleLogout} style={{ color: '#FF3B30' }}>
            <SignOut size={20} weight="bold" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MOBIELE TAB BAR (Zichtbaar op mobiel via CSS) */}
      <nav className="mobile-tab-bar">
        <button className={`tab-item ${view === 'cockpit' ? 'active' : ''}`} onClick={() => setView('cockpit')}>
          <SquaresFour size={24} weight={view === 'cockpit' ? "fill" : "regular"} />
          <span>Cockpit</span>
        </button>
        <button className={`tab-item ${view === 'tradelab' ? 'active' : ''}`} onClick={() => setView('tradelab')}>
          <Notebook size={24} weight={view === 'tradelab' ? "fill" : "regular"} />
          <span>Lab</span>
        </button>
        <button className={`tab-item ${view === 'portfolio' ? 'active' : ''}`} onClick={() => setView('portfolio')}>
          <Briefcase size={24} weight={view === 'portfolio' ? "fill" : "regular"} />
          <span>Inventory</span>
        </button>
        <button className={`tab-item ${view === 'finance' ? 'active' : ''}`} onClick={() => setView('finance')}>
          <ChartLineUp size={24} weight={view === 'finance' ? "fill" : "regular"} />
          <span>Finance</span>
        </button>
        {isAdmin && (
          <button className={`tab-item ${view === 'admin' ? 'active' : ''}`} onClick={() => setView('admin')}>
            <ShieldCheck size={24} weight={view === 'admin' ? "fill" : "regular"} color="#007AFF" />
            <span>Admin</span>
          </button>
        )}
      </nav>

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