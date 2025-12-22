import { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './lib/firebase';
import { List } from '@phosphor-icons/react'; // Hamburger icoon

import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import TradeLab from './components/TradeLab';
import Portfolio from './components/Portfolio';
import Login from './components/Login';

function App() {
  const [user, loading] = useAuthState(auth);
  const [view, setView] = useState('cockpit');
  const [sidebarOpen, setSidebarOpen] = useState(false); // Staat het menu open?

  if (loading) return <div style={{display:'flex', height:'100vh', alignItems:'center', justifyContent:'center'}}>Laden...</div>;
  if (!user) return <Login />;

  return (
    <div className="app-container">
      {/* HAMBURGER KNOP (Alleen zichtbaar op mobiel via CSS) */}
      <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
        <List size={24} weight="bold" />
      </button>

      {/* SIDEBAR (We geven door of hij open moet zijn) */}
      <Sidebar 
        view={view} 
        setView={(v) => { setView(v); setSidebarOpen(false); }} // Als je klikt, sluit menu
        isOpen={sidebarOpen} 
        closeMenu={() => setSidebarOpen(false)} 
      />
      
      {/* OVERLAY (Donkere achtergrond als menu open is) */}
      {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)}></div>}

      <main className="main">
        {view === 'cockpit' && <Dashboard />}
        {view === 'journal' && <TradeLab />}
        {view === 'finance' && <Portfolio />}
      </main>
    </div>
  );
}

export default App;