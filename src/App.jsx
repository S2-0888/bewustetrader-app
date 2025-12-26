import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from './lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { 
  SquaresFour, Notebook, Briefcase, ChartLineUp, 
  Gear, SignOut, ShieldCheck, Crown, Flask 
} from '@phosphor-icons/react';

import Dashboard from './components/Dashboard';
import TradeLab from './components/TradeLab';
import Portfolio from './components/Portfolio';
import Finance from './components/Finance';
import Settings from './components/Settings';
import Login from './components/Login';
import Admin from './components/Admin';
import DesignLab from './components/DesignLab'; 

function App() {
  const [user, loading] = useAuthState(auth);
  const [view, setView] = useState('cockpit');
  const [userProfile, setUserProfile] = useState(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  // --- VOEG DIT TOE VOOR DE DESKTOP/MOBILE CHECK ---
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);

    if (user) {
      setIsProfileLoading(true);
      const unsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
        if (docSnap.exists()) {
          setUserProfile(docSnap.data());
        }
        setIsProfileLoading(false);
      });
      return () => {
        unsub();
        window.removeEventListener('resize', handleResize);
      };
    } else {
      setIsProfileLoading(false);
      setUserProfile(null);
    }
    return () => window.removeEventListener('resize', handleResize);
  }, [user]);
  // ------------------------------------------------

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

  const handleLogout = () => { auth.signOut(); };
  const isAdmin = userProfile?.role === 'admin';
  const isApproved = userProfile?.isApproved || isAdmin;

  if (user && !isApproved) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 20, background: '#F5F5F7', fontFamily: 'sans-serif' }}>
        <div style={{ maxWidth: 400, padding: 40, background: 'white', borderRadius: 30, boxShadow: '0 20px 40px rgba(0,0,0,0.05)' }}>
          <Crown size={64} weight="fill" color="#AF52DE" />
          <h2 style={{ fontSize: 24, fontWeight: 800, marginTop: 24, marginBottom: 8 }}>Account Pending Approval</h2>
          <p style={{ color: '#86868B', fontSize: 15, lineHeight: 1.5, marginBottom: 24 }}>Welcome to the DBT Network. For exclusivity reasons, your access is currently being verified by an admin.</p>
          <div style={{ padding: 20, background: '#F5F5F7', borderRadius: 15, marginBottom: 30 }}>
            <p style={{ fontSize: 13, color: '#1D1D1F', fontWeight: 600, margin: 0 }}>Need assistance or want to apply for Founder status?</p>
            <a href="mailto:support@yourdomain.com" style={{ color: '#007AFF', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>Contact Network Admin</a>
          </div>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#FF3B30', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>Sign Out</button>
        </div>
      </div>
    );
  }

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
            <button 
                className={`nav-item ${view === 'design-lab' ? 'active' : ''}`} 
                onClick={() => setView('design-lab')} 
                style={{ 
                    marginTop: 10, 
                    border: '1px dashed #AF52DE', 
                    background: view === 'design-lab' ? '#AF52DE' : 'rgba(175, 82, 222, 0.05)',
                    color: view === 'design-lab' ? 'white' : '#AF52DE'
                }}
            >
              <Flask size={20} weight={view === 'design-lab' ? "fill" : "bold"} />
              <span>Design Lab</span>
            </button>
          )}

          {isAdmin && (
            <button className={`nav-item ${view === 'admin' ? 'active' : ''}`} onClick={() => setView('admin')} style={{ marginTop: 20, background: view === 'admin' ? '#1D1D1F' : 'rgba(0,122,255,0.05)', color: view === 'admin' ? 'white' : '#007AFF', border: view === 'admin' ? 'none' : '1px solid rgba(0,122,255,0.1)' }}>
              <ShieldCheck size={20} weight={view === 'admin' ? "fill" : "bold"} />
              <span>Command Center</span>
            </button>
          )}
        </nav>

        <div className="sidebar-footer" style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button 
            className={`nav-item ${view === 'settings' ? 'active' : ''}`} 
            onClick={() => setView('settings')}
            style={{ padding: '8px', minWidth: 'unset', flex: 1, justifyContent: 'center' }}
            title="Settings"
          >
            <Gear size={22} weight={view === 'settings' ? "fill" : "bold"} />
          </button>
          
          <div style={{ width: 1, height: 20, background: 'rgba(0,0,0,0.05)' }}></div>

          <button 
            className="nav-item" 
            onClick={handleLogout} 
            style={{ color: '#FF3B30', padding: '8px', minWidth: 'unset', flex: 1, justifyContent: 'center' }}
            title="Sign Out"
          >
            <SignOut size={22} weight="bold" />
          </button>
        </div>
      </aside>

      {/* --- GEWIJZIGDE MOBIELE TAB BAR: Alleen cockpit & alleen op mobiel --- */}
      {isMobile && (
        <nav className="mobile-tab-bar" style={{ display: 'flex', justifyContent: 'center', padding: '0 20px' }}>
          <button 
            className={`tab-item ${view === 'cockpit' ? 'active' : ''}`} 
            onClick={() => setView('cockpit')}
            style={{ width: '80px', flex: 'none' }}
          >
            <SquaresFour size={28} weight={view === 'cockpit' ? "fill" : "regular"} />
            <span style={{ fontSize: '10px', fontWeight: 800 }}>Cockpit</span>
          </button>
        </nav>
      )}

      <main className="main">
        {view === 'cockpit' && <Dashboard setView={setView} />}
        {view === 'tradelab' && <TradeLab />}
        {view === 'portfolio' && <Portfolio />}
        {view === 'finance' && <Finance />}
        {view === 'settings' && <Settings />}
        {view === 'admin' && isAdmin && <Admin />}
        {view === 'design-lab' && isAdmin && <DesignLab />}
      </main>
    </div>
  );
}

export default App;