import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { SquaresFour, Notebook, ChartLineUp, SignOut, X, Brain } from '@phosphor-icons/react';

export default function Sidebar({ view, setView, isOpen, closeMenu }) {
  
  const handleLogout = () => {
    if(confirm("Uitloggen?")) signOut(auth);
  };

  return (
    // We voegen de class 'open' toe als isOpen true is
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      
      {/* Header met Logo (NU MET PLAATJE) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
        <div className="logo">
           {/* We gebruiken hier de favicon die je net hebt geupload */}
           <img src="/favicon.png" alt="Logo" style={{ height: '50px', width: 'auto' }} />
        </div>
        
        {/* Sluit knop (alleen zichtbaar op mobiel) */}
        <button className="close-btn" onClick={closeMenu}>
            <X size={24} />
        </button>
      </div>

      <nav style={{ flex: 1 }}>
        <button className={`nav-item ${view === 'cockpit' ? 'active' : ''}`} onClick={() => setView('cockpit')}>
          <SquaresFour size={20} weight={view === 'cockpit' ? 'fill' : 'regular'} />
          <span>Command Wall</span>
        </button>

        <button className={`nav-item ${view === 'journal' ? 'active' : ''}`} onClick={() => setView('journal')}>
          <Notebook size={20} weight={view === 'journal' ? 'fill' : 'regular'} />
          <span>Trade Lab</span>
        </button>

        {/* NIEUW: Insights / Intelligence Sectie */}
        <button className={`nav-item ${view === 'insights' ? 'active' : ''}`} onClick={() => setView('insights')}>
          <Brain size={20} weight={view === 'insights' ? 'fill' : 'regular'} />
          <span>Intelligence</span>
        </button>

        <button className={`nav-item ${view === 'finance' ? 'active' : ''}`} onClick={() => setView('finance')}>
          <ChartLineUp size={20} weight={view === 'finance' ? 'fill' : 'regular'} />
          <span>Portfolio</span>
        </button>
      </nav>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
        <button className="nav-item" onClick={handleLogout} style={{ color: 'var(--danger)' }}>
          <SignOut size={20} />
          <span>Uitloggen</span>
        </button>
      </div>
    </div>
  );
}