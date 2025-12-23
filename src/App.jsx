import React, { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './lib/firebase';
import { List, SquaresFour, Notebook, Briefcase, ChartLineUp, Gear, SignOut, X } from '@phosphor-icons/react';

import Dashboard from './components/Dashboard';
import TradeLab from './components/TradeLab';
import Portfolio from './components/Portfolio';
import Finance from './components/Finance';
import Settings from './components/Settings';
import Login from './components/Login';

function App() {
  const [user, loading] = useAuthState(auth);
  const [view, setView] = useState('cockpit');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#F5F5F7', color: '#86868B', fontFamily: 'sans-serif' }}>
      Laden...
    </div>
  );

  if (!user) return <Login />;

  const navigate = (pageId) => {
    setView(pageId);
    setSidebarOpen(false);
  };

  return (
    <div className="app-container">
      {/* Mobiele Hamburger */}
      <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? <X size={22} weight="bold" /> : <List size={22} weight="bold" />}
      </button>

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div style={{ padding: '10px 0 35px 0' }}>
          <div style={{ fontSize: 19, fontWeight: 800, color: '#1D1D1F', letterSpacing: '-0.6px' }}>
            Command Wall <span style={{ color: '#86868B', fontWeight: 400 }}>Pro</span>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <button className={`nav-item ${view === 'cockpit' ? 'active' : ''}`} onClick={() => navigate('cockpit')}>
            <SquaresFour size={20} weight={view === 'cockpit' ? "fill" : "bold"} />
            <span>Cockpit</span>
          </button>

          <button className={`nav-item ${view === 'tradelab' ? 'active' : ''}`} onClick={() => navigate('tradelab')}>
            <Notebook size={20} weight={view === 'tradelab' ? "fill" : "bold"} />
            <span>Trade Lab</span>
          </button>

          <button className={`nav-item ${view === 'portfolio' ? 'active' : ''}`} onClick={() => navigate('portfolio')}>
            <Briefcase size={20} weight={view === 'portfolio' ? "fill" : "bold"} />
            <span>Portfolio</span>
          </button>

          <button className={`nav-item ${view === 'finance' ? 'active' : ''}`} onClick={() => navigate('finance')}>
            <ChartLineUp size={20} weight={view === 'finance' ? "fill" : "bold"} />
            <span>Finance</span>
          </button>

          <button className={`nav-item ${view === 'settings' ? 'active' : ''}`} onClick={() => navigate('settings')}>
            <Gear size={20} weight={view === 'settings' ? "fill" : "bold"} />
            <span>Settings</span>
          </button>
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          <button className="nav-item" onClick={() => auth.signOut()} style={{ color: '#FF3B30' }}>
            <SignOut size={20} weight="bold" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobiele Overlay */}
      {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Content */}
      <main className="main">
        {view === 'cockpit' && <Dashboard />}
        {view === 'tradelab' && <TradeLab />}
        {view === 'portfolio' && <Portfolio />}
        {view === 'finance' && <Finance />}
        {view === 'settings' && <Settings />}
      </main>
    </div>
  );
}

export default App;