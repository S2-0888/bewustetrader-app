import { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './lib/firebase';
import { 
  List, 
  SquaresFour, // Voor Cockpit
  Notebook,    // Voor TradeLab
  Briefcase,   // Voor Portfolio
  ChartLineUp, // Voor Finance
  Gear,        // Voor Settings (NIEUW)
  SignOut
} from '@phosphor-icons/react';

// Importeer je componenten
import Sidebar from './components/Sidebar'; // (Optioneel, als je die nog gebruikt, anders mag deze weg)
import Dashboard from './components/Dashboard';
import TradeLab from './components/TradeLab';
import Portfolio from './components/Portfolio';
import Finance from './components/Finance';
import Settings from './components/Settings'; // <--- NIEUW
import Login from './components/Login';

function App() {
  const [user, loading] = useAuthState(auth);
  const [view, setView] = useState('cockpit'); // Dit bepaalt welke pagina je ziet
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) return <div style={{display:'flex', height:'100vh', alignItems:'center', justifyContent:'center', color:'#86868B', fontSize:14, fontWeight:500}}>System Loading...</div>;
  if (!user) return <Login />;

  // Functie om uit te loggen
  const handleLogout = () => auth.signOut();

  return (
    <div className="app-container">
      
      {/* MOBIELE KNOP (Alleen zichtbaar op klein scherm) */}
      <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
        <List size={20} weight="bold" />
      </button>

      {/* SIDEBAR (NAVIGATIE) */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
         
         {/* LOGO AREA */}
         <div style={{ padding: '0 10px', marginBottom: 40, marginTop: 10 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1D1D1F', letterSpacing: '-0.5px' }}>
              Command Wall <span style={{ color: '#86868B', fontWeight: 400 }}>Pro</span>
            </div>
         </div>

         {/* MENU ITEMS */}
         <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            
            <button className={`nav-item ${view === 'cockpit' ? 'active' : ''}`} onClick={() => { setView('cockpit'); setSidebarOpen(false); }}>
               <SquaresFour size={18} weight={view === 'cockpit' ? "fill" : "regular"} />
               <span>Cockpit</span>
            </button>

            <button className={`nav-item ${view === 'tradelab' ? 'active' : ''}`} onClick={() => { setView('tradelab'); setSidebarOpen(false); }}>
               <Notebook size={18} weight={view === 'tradelab' ? "fill" : "regular"} />
               <span>Trade Lab</span>
            </button>

            <button className={`nav-item ${view === 'portfolio' ? 'active' : ''}`} onClick={() => { setView('portfolio'); setSidebarOpen(false); }}>
               <Briefcase size={18} weight={view === 'portfolio' ? "fill" : "regular"} />
               <span>Portfolio</span>
            </button>

            <button className={`nav-item ${view === 'finance' ? 'active' : ''}`} onClick={() => { setView('finance'); setSidebarOpen(false); }}>
               <ChartLineUp size={18} weight={view === 'finance' ? "fill" : "regular"} />
               <span>Finance</span>
            </button>
            
            {/* HIER IS DE NIEUWE SETTINGS KNOP */}
            <button className={`nav-item ${view === 'settings' ? 'active' : ''}`} onClick={() => { setView('settings'); setSidebarOpen(false); }}>
               <Gear size={18} weight={view === 'settings' ? "fill" : "regular"} />
               <span>Settings</span>
            </button>

         </nav>

         {/* FOOTER / LOGOUT */}
         <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
            <button className="nav-item" onClick={handleLogout} style={{ color: '#FF3B30' }}>
               <SignOut size={18} />
               <span>Sign Out</span>
            </button>
         </div>

      </div>
      
      {/* OVERLAY VOOR MOBIEL (Klik ernaast om menu te sluiten) */}
      {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)}></div>}

      {/* MAIN CONTENT AREA */}
      <main className="main">
        {view === 'cockpit' && <Dashboard />}
        {view === 'tradelab' && <TradeLab />}
        {view === 'portfolio' && <Portfolio />}
        {view === 'finance' && <Finance />} 
        {view === 'settings' && <Settings />} {/* <--- HIER WORDT SETTINGS GELADEN */}
      </main>
    </div>
  );
}

export default App;