import { SquaresFour, Notebook, Briefcase, Gear, FloppyDisk, ArrowCounterClockwise } from '@phosphor-icons/react';

export default function Sidebar({ view, setView }) {
  
  // Een hulp-functie om te checken of een knop 'active' moet zijn
  const getNavClass = (navName) => {
    return `nav-item ${view === navName ? 'active' : ''}`;
  };

  return (
    <div className="sidebar">
      {/* HEADER */}
      <div style={{ marginBottom: '40px', paddingLeft: '10px' }}>
        <div style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '1.1rem' }}>
          Bewuste Trader
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 500 }}>
          Cloud Edition V10
        </div>
      </div>

      {/* NAVIGATIE */}
      <nav>
        <div className={getNavClass('cockpit')} onClick={() => setView('cockpit')}>
          <SquaresFour size={20} /> Command Wall
        </div>
        <div className={getNavClass('journal')} onClick={() => setView('journal')}>
          <Notebook size={20} /> Trade Lab
        </div>
        <div className={getNavClass('finance')} onClick={() => setView('finance')}>
          <Briefcase size={20} /> Portfolio
        </div>
      </nav>

      {/* FOOTER */}
      <div style={{ marginTop: 'auto' }}>
        <button className="btn btn-ghost" style={{ marginBottom: '10px' }}>
          <Gear size={18} /> Instellingen
        </button>
        
        <div className="card" style={{ padding: '10px', marginBottom: '10px', background: '#f8fafc', boxShadow: 'none', border: '1px solid var(--border)' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text)', fontWeight: 500 }}>
                <input type="checkbox" style={{ width: 'auto', margin: 0, marginRight: '8px' }} /> 
                <span>Zen Mode</span>
            </label>
        </div>

        {/* In de Cloud versie is Backup minder nodig, maar we laten de knop even staan als 'Sync status' */}
        <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FloppyDisk size={18} /> Cloud Sync
          </span>
          <span className="safety-dot"></span>
        </button>
      </div>
    </div>
  );
}