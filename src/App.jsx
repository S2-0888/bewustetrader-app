import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from './lib/firebase';
import { doc, onSnapshot, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'; // Toegevoegd: Firestore methodes
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'; // Toegevoegd: Auth methodes
import { 
  SquaresFour, Notebook, Briefcase, ChartLineUp, 
  Gear, SignOut, ShieldCheck, Flag 
} from '@phosphor-icons/react';

// --- COMPONENTS ---
import LandingPage from './components/LandingPage';
import FeedbackWidget from './components/FeedbackWidget';
import OnboardingModal from './components/OnboardingModal';
import Dashboard from './components/Dashboard';
import TradeLab from './components/TradeLab';
import Portfolio from './components/Portfolio';
import Finance from './components/Finance';
import Goals from './components/Goals'; 
import Settings from './components/Settings';
import Admin from './components/Admin';

// --- LOGIN LOGIC (VOOR NAADLOZE DATABASE REGISTRATIE) ---
export const handleSignIn = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // --- CRITICAL: Maak de user aan in Firestore als deze niet bestaat ---
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        status: "pending",
        isApproved: false, // John ziet de 'Offline' screen tot jij hem goedkeurt
        role: "trader",
        createdAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error("Login failed:", error);
  }
};

function AuthenticatedApp({ userProfile, handleLogout }) {
  const [view, setView] = useState(() => localStorage.getItem('tct_active_view') || 'cockpit');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const isAdmin = userProfile?.role === 'admin';

  useEffect(() => { localStorage.setItem('tct_active_view', view); }, [view]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header" style={{ padding: '10px 0 35px 0' }}>
          <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#1D1D1F', letterSpacing: '1px', lineHeight: 1 }}>PROPFOLIO</div>
              <div style={{ fontSize: 8, fontWeight: 800, color: '#86868B', marginTop: 4 }}>POWERED BY TCT</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button className={`nav-item ${view === 'cockpit' ? 'active' : ''}`} onClick={() => setView('cockpit')}>
            <SquaresFour size={20} weight={view === 'cockpit' ? "fill" : "bold"} />
            <span>Cockpit</span>
          </button>
          <button className={`nav-item ${view === 'tradelab' ? 'active' : ''}`} onClick={() => setView('tradelab')}>
            <Notebook size={20} weight={view === 'tradelab' ? "fill" : "bold"} />
            <span>Performance Lab</span>
          </button>
          <button className={`nav-item ${view === 'portfolio' ? 'active' : ''}`} onClick={() => setView('portfolio')}>
            <Briefcase size={20} weight={view === 'portfolio' ? "fill" : "bold"} />
            <span>Warehouse</span>
          </button>
          <button className={`nav-item ${view === 'finance' ? 'active' : ''}`} onClick={() => setView('finance')}>
            <ChartLineUp size={20} weight={view === 'finance' ? "fill" : "bold"} />
            <span>Finance</span>
          </button>
          <button className={`nav-item ${view === 'goals' ? 'active' : ''}`} onClick={() => setView('goals')}>
            <Flag size={20} weight={view === 'goals' ? "fill" : "bold"} />
            <span>Vision</span>
          </button>

          {isAdmin && (
            <button className={`nav-item ${view === 'admin' ? 'active' : ''}`} onClick={() => setView('admin')} style={{ marginTop: 20, background: view === 'admin' ? '#1D1D1F' : 'rgba(0,122,255,0.05)', color: view === 'admin' ? 'white' : '#007AFF' }}>
              <ShieldCheck size={20} weight="bold" />
              <span>Command Center</span>
            </button>
          )}
        </nav>

        <div className="sidebar-footer" style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center' }}>
          <button className="nav-item" onClick={() => setView('settings')} style={{ flex: 1 }}><Gear size={22} /></button>
          <button className="nav-item" onClick={handleLogout} style={{ color: '#FF3B30', flex: 1 }}><SignOut size={22} /></button>
        </div>
      </aside>

      <main className="main">
        {view === 'cockpit' && <Dashboard setView={setView} />}
        {view === 'tradelab' && <TradeLab />}
        {view === 'portfolio' && <Portfolio />}
        {view === 'finance' && <Finance />}
        {view === 'goals' && <Goals />} 
        {view === 'settings' && <Settings />}
        {view === 'admin' && isAdmin && <Admin />}
      </main>
    </div>
  );
}

function App() {
  const [user, loading] = useAuthState(auth);
  const [userProfile, setUserProfile] = useState(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('tct_onboarding_completed')) setShowOnboarding(true);

    if (user) {
      const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
        setUserProfile(snap.data());
        setIsProfileLoading(false);
      });
      return () => unsub();
    } else {
      setIsProfileLoading(false);
    }
  }, [user]);

  if (loading || isProfileLoading) return <div className="loading-screen">MATCHING SYSTEMS...</div>;

  return (
    <Router>
      <Routes>
        <Route path="/" element={!user ? <LandingPage onSignIn={handleSignIn} /> : <Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={
          user ? (
            !userProfile ? (
              <div className="loading-screen">INITIALIZING PROFILE...</div>
            ) : (userProfile.isApproved || userProfile.role === 'admin') ? (
              <AuthenticatedApp userProfile={userProfile} handleLogout={() => auth.signOut()} />
            ) : (
              /* --- NEW PTMS PENDING SCREEN (REPLACING THE CROWN) --- */
              <div className="pending-screen" style={{ backgroundColor: '#000', color: '#fff', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px' }}>
                 <div className="blink-logo">
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'radial-gradient(circle, #00ff00 0%, #003300 100%)', boxShadow: '0 0 20px #00ff00', animation: 'pulse 2s infinite ease-in-out' }}></div>
                 </div>
                 <h2 style={{ fontWeight: 900, marginTop: 24, letterSpacing: '2px' }}>COMMAND CENTER OFFLINE</h2>
                 <p style={{ color: '#86868B', marginBottom: 30, maxWidth: '400px' }}>Your PTMS access is pending manual verification by the Architect.</p>
                 <button onClick={() => auth.signOut()} style={{ background: 'transparent', color: '#FF3B30', border: '1px solid #FF3B30', padding: '12px 24px', borderRadius: '12px', cursor: 'pointer', fontWeight: 800 }}>Sign Out</button>
                 <style>{`
                   @keyframes pulse {
                     0% { transform: scale(1); opacity: 1; }
                     50% { transform: scale(0.9); opacity: 0.6; }
                     100% { transform: scale(1); opacity: 1; }
                   }
                 `}</style>
              </div>
            )
          ) : (
            <Navigate to="/" />
          )
        } />
      </Routes>

      <FeedbackWidget />
      <OnboardingModal isOpen={showOnboarding} onClose={() => {
          setShowOnboarding(false);
          localStorage.setItem('tct_onboarding_completed', 'true');
      }} />
    </Router>
  );
}

export default App;