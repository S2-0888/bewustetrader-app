import { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './lib/firebase';
import { 
  List, 
  SquaresFour, 
  Notebook,    
  Briefcase,   
  ChartLineUp, 
  Gear,        
  SignOut,
  X 
} from '@phosphor-icons/react';

// Componenten imports (Zorg dat deze paden kloppen in jouw project)
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
    <div style={{display:'flex', height:'100vh', alignItems:'center', justifyContent:'center', color:'#86868B', fontSize:14, fontWeight:500}}>
      System Loading...
    </div>
  );
  
  if (!user) return <Login />;

  const handleLogout = () => auth.signOut();

  // Helper functie voor navigatie op mobiel
  const navigateTo = (page) => {
    setView(page);
    setSidebarOpen(false); // Sluit menu automatisch na selectie op mobiel
  };

  return (
    <div className="app-container">
      
      {/* MOBIELE HAMBURGER KNOP */}
      <button 
        className="mobile-menu-btn" 
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X size={24} weight="bold" /> : <List size={24} weight="bold" />}
      </button>

      {/* SIDEBAR */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
         <div style={{ padding: '0 10px', marginBottom: 40, marginTop: 10 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1D1D1F', letterSpacing: '-0.5px' }}>
              Command Wall <span style={{ color: '#86868B', fontWeight: 400 }}>Pro</span>
            </div>
         </div>

         <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button className={`nav-item ${view === 'cockpit' ? 'active' : ''}`} onClick={() => navigateTo('cockpit')}>
               <SquaresFour size={18} weight={view === 'cockpit' ? "fill" : "regular"} />
               <span>Cockpit</span>
            </button>

            <button className={`nav-item ${view === 'tradelab' ? 'active' : ''}`} onClick={() => navigateTo('tradelab')}>
               <Notebook size={18} weight={view === 'tradelab' ? "fill" : "regular"} />
               <span>Trade Lab</span>
            </button>

            <button className={`nav-item ${view === 'portfolio' ? 'active' : ''}`} onClick={() => navigateTo('portfolio')}>
               <Briefcase size={18} weight={view === 'portfolio' ? "fill" : "regular"} />
               <span>Portfolio</span>
            </button>

            <button className={`nav-item ${view === 'finance' ? 'active' : ''}`} onClick={() => navigateTo('finance')}>
               <ChartLineUp size={18} weight={view === 'finance' ? "fill" : "regular"} />
               <span>Finance</span>
            </button>

            <button className={`nav-item ${view === 'settings' ? 'active' : ''}`} onClick={() => navigateTo('settings')}>
               <Gear size={18} weight={view === 'settings' ? "fill" : "regular"} />
               <span>Settings</span>
            </button>
         </nav>

         <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
            <button className="nav-item" onClick={handleLogout} style={{ color: '#FF3B30' }}>
               <SignOut size={18} />
               <span>Sign Out</span>
            </button>
         </div>
      </div>
      
      {/* MOBIELE OVERLAY (Klikken naast het menu om te sluiten) */}
      {sidebarOpen && (
        <div className="overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* HOOFD CONTENT */}
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