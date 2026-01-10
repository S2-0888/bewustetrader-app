import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from './lib/firebase';
import { doc, onSnapshot, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'; 
import { signInWithPopup, GoogleAuthProvider, getRedirectResult } from 'firebase/auth';
import { SquaresFour, Notebook, Briefcase, ChartLineUp, Gear, SignOut, ShieldCheck, Flag, Brain } from '@phosphor-icons/react';

// --- COMPONENTS ---
import LandingPage from './components/LandingPage'; // <--- Check of dit bestand hier echt staat!
import FeedbackWidget from './components/FeedbackWidget';
import OnboardingModal from './components/OnboardingModal';
import Dashboard from './components/Dashboard';
import TradeLab from './components/TradeLab';
import Portfolio from './components/Portfolio';
import Finance from './components/Finance';
import Goals from './components/Goals'; 
import Settings from './components/Settings';
import Admin from './components/Admin';
import IntakeChat from './components/IntakeChat';
import Insights from './components/Insights';
import CTraderCallback from './components/CTraderCallback';

/**
 * HULP COMPONENT VOOR NAVIGATIE
 */
const NavButton = ({ id, label, icon: Icon, view, setView }) => (
  <button className={`nav-item ${view === id ? 'active' : ''}`} onClick={() => setView(id)}>
    <Icon size={24} weight={view === id ? "fill" : "bold"} />
    <span>{label}</span>
  </button>
);

/**
 * AUTHENTICATED APP 
 */
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
        <div className="sidebar-header" style={{ textAlign: 'center', marginBottom: 30, padding: '10px 0' }}>
  {/* Volledig logo: Alleen zichtbaar als sidebar niet collapsed is of op hover */}
  <div className="logo-full" style={{ textAlign: 'left', paddingLeft: '22px' }}>
      <div style={{ fontSize: 18, fontWeight: 900, color: '#1D1D1F', letterSpacing: '1px', lineHeight: 1 }}>PROPFOLIO</div>
      <div style={{ fontSize: 8, fontWeight: 800, color: '#86868B', marginTop: 4 }}>POWERED BY TCT</div>
  </div>
          {/* Compact logo voor collapsed rail */}
          <div className="logo-compact" style={{ display: 'none', fontWeight: 900, fontSize: 20, color: '#007AFF' }}>P</div>
        </div>

        <nav className="sidebar-nav" style={{ flex: 1 }}>
          <NavButton id="cockpit" label="Cockpit" icon={SquaresFour} view={view} setView={setView} />
          <NavButton id="tradelab" label="Trade Lab" icon={Notebook} view={view} setView={setView} />
          
          <button className={`nav-item ${view === 'insights' ? 'active' : ''}`} onClick={() => setView('insights')}>
            <Brain size={24} weight={view === 'insights' ? "fill" : "bold"} color={view === 'insights' ? "#007AFF" : "currentColor"} />
            <span>Intelligence</span>
          </button>

          <NavButton id="portfolio" label="Vault" icon={Briefcase} view={view} setView={setView} />
          <NavButton id="finance" label="Capital" icon={ChartLineUp} view={view} setView={setView} />
          <NavButton id="goals" label="Vision" icon={Flag} view={view} setView={setView} />

          {isAdmin && (
            <button className={`nav-item ${view === 'admin' ? 'active' : ''}`} onClick={() => setView('admin')} style={{ marginTop: 20, background: view === 'admin' ? '#1D1D1F' : 'rgba(0,122,255,0.05)', color: view === 'admin' ? 'white' : '#007AFF' }}>
              <ShieldCheck size={24} weight="bold" />
              <span>Command Center</span>
            </button>
          )}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item" onClick={() => setView('settings')}>
            <Gear size={24} weight="bold" />
            <span>Settings</span>
          </button>
          <button className="nav-item" onClick={handleLogout} style={{ color: '#FF3B30' }}>
            <SignOut size={24} weight="bold" />
            <span>Exit</span>
          </button>
        </div>
      </aside>

      <main className="main">
        {view === 'cockpit' && <Dashboard setView={setView} />}
        {view === 'tradelab' && <TradeLab />}
        {view === 'insights' && <Insights />} 
        {view === 'portfolio' && <Portfolio />}
        {view === 'finance' && <Finance />}
        {view === 'goals' && <Goals />} 
        {view === 'settings' && <Settings />}
        {view === 'admin' && isAdmin && <Admin />}
      </main>
    </div>
  );
}

/**
 * APP CONTENT
 */
function AppContent() {
  const [user, loading] = useAuthState(auth);
  const [userProfile, setUserProfile] = useState(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showLogin, setShowLogin] = useState(false); // <--- Nieuw: om te wisselen tussen info en inlog
  const navigate = useNavigate();

  const adminEmails = ["stuiefranken@gmail.com"];

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user) navigate('/dashboard');
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  useEffect(() => {
    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          navigate('/dashboard');
        }
      } catch (error) {
        console.error("Firebase Redirect Error:", error);
      }
    };
    checkRedirect();
  }, [navigate]);

  useEffect(() => {
    if (!user) {
      setIsProfileLoading(false);
      setUserProfile(null);
      return;
    }

    const userRef = doc(db, "users", user.uid);

    const initUser = async () => {
      try {
        const snap = await getDoc(userRef);
        
        if (!snap.exists()) {
          const isMasterAdmin = adminEmails.includes(user.email);
          const newUserData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || "Trader",
            isApproved: isMasterAdmin,
            role: isMasterAdmin ? "admin" : "trader",
            hasCompletedIntake: false,
            createdAt: serverTimestamp(),
            status: isMasterAdmin ? "approved" : "pending"
          };
          await setDoc(userRef, newUserData);
          setUserProfile(newUserData);
          setIsProfileLoading(false); 
        }
      } catch (err) {
        console.error("Error during silent creation:", err);
        setIsProfileLoading(false);
      }
    };

    initUser();

    const unsub = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (adminEmails.includes(user.email) && data.role !== 'admin') {
           setDoc(userRef, { isApproved: true, role: 'admin', status: 'approved' }, { merge: true });
        }
        setUserProfile(data);
        setIsProfileLoading(false);
      }
    });

    return () => unsub();
  }, [user]);

  if (loading || isProfileLoading) return <div className="loading-screen">MATCHING SYSTEMS...</div>;

  return (
    <>
      <Routes>
        <Route path="/" element={!user ? (
  !showLogin ? (
    <LandingPage onSignIn={() => setShowLogin(true)} />
  ) : (
    /* STAP 2: De Login Gateway (Zwart scherm) */
    /* We gebruiken min-h-screen zodat hij wel scrollbaar is als dat nodig is */
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-6">
        <div style={{ marginBottom: '40px' }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#FFF', letterSpacing: '2px' }}>PROPFOLIO</div>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#86868B', marginTop: 4 }}>POWERED BY TCT</div>
        </div>
        <h1 style={{ fontSize: '42px', fontWeight: 900, maxWidth: '600px', marginBottom: '20px', letterSpacing: '-1px', color: '#fff' }}>
          Master Your Trading Shadow.
        </h1>
        <p style={{ color: '#86868B', marginBottom: '40px', maxWidth: '450px', fontSize: '18px' }}>
          Access the Institutional Operating System for Conscious Traders.
        </p>
        
        <button 
          onClick={handleSignIn} 
          style={{ padding: '16px 32px', borderRadius: '12px', background: '#FFF', color: '#000', border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: '16px' }}
        >
          Enter the System
        </button>

        <button 
          onClick={() => setShowLogin(false)} 
          style={{ marginTop: '30px', background: 'none', color: '#444', border: 'none', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}
        >
          Return to information
        </button>
    </div>
  )
) : <Navigate to="/dashboard" replace />} />

        <Route path="/dashboard" element={
          user ? (
            !userProfile ? <div className="loading-screen">INITIALIZING...</div> :
            !userProfile.hasCompletedIntake ? <IntakeChat onCancel={() => auth.signOut()} /> :
            (userProfile.isApproved || userProfile.role === 'admin') ? <AuthenticatedApp userProfile={userProfile} handleLogout={() => auth.signOut()} /> :
            <div className="pending">Access Pending...</div>
          ) : <Navigate to="/" replace />
        } />

       <Route path="/auth/ctrader/callback" element={<CTraderCallback />} />

      </Routes>
      <FeedbackWidget />
      <OnboardingModal isOpen={showOnboarding} onClose={() => {
          setShowOnboarding(false);
          localStorage.setItem('tct_onboarding_completed', 'true');
      }} />
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}