import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { User, CreditCard, Faders, Plus, X, FloppyDisk, ArrowCounterClockwise, Strategy, CheckCircle, Warning, Tag } from '@phosphor-icons/react';

// --- DEFAULTS ---
const DEFAULT_CONFIG = {
    strategies: ["Trend Continuation", "Pullback / Retracement", "Breakout", "Reversal (Key Level)", "Supply & Demand", "Liquidity Sweep (SFP)", "Fair Value Gap (FVG)", "Silver Bullet (Time Based)", "Orderblock Entry", "Opening Range Breakout", "Asian Range Fade", "News Fade"],
    rules: ["Max 1% Risico per trade", "Minimaal 1:2 Risk/Reward", "Stoploss fysiek geplaatst", "Max Daily Loss niet bereikt", "Wachten op Candle Close", "Geen High Impact News (<30m)", "Aligned met HTF Trend", "Binnen Trading Sessie (Lon/NY)", "Clean Headspace (Geen Tilt)"],
    mistakes: ["None (Perfect Execution)", "FOMO Entry", "Impulsive Entry", "Too Big Size", "No Plan", "Stoploss Widening", "Break-Even Too Soon", "Cutting Winners Early", "Target Extension", "Adding to Losers", "Micromanagement", "Revenge Execution"],
    quality: ["A+ (Perfect)", "A (Good)", "B (Average)", "C (Forced/Bad)"]
};

const CATEGORIES = [
    { id: 'strategies', label: 'Strategieën', icon: <Strategy size={18}/>, color: '#007AFF', desc: 'Welke setups trade je?' },
    { id: 'rules', label: 'Regels', icon: <CheckCircle size={18}/>, color: '#30D158', desc: 'Discipline checklist items.' },
    { id: 'mistakes', label: 'Fouten', icon: <Warning size={18}/>, color: '#FF9F0A', desc: 'Tags voor evaluatie.' },
    { id: 'quality', label: 'Kwaliteit', icon: <Tag size={18}/>, color: '#AF52DE', desc: 'Setup grading labels.' },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('trading'); 
  const [activeConfig, setActiveConfig] = useState('strategies'); 
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [inputValue, setInputValue] = useState(''); 

  useEffect(() => {
    const fetchSettings = async () => {
        const user = auth.currentUser;
        if (!user) return;
        const docRef = doc(db, "users", user.uid, "settings", "tradelab");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setConfig(docSnap.data());
        setLoading(false);
    };
    fetchSettings();
  }, []);

  const addItem = () => {
      const val = inputValue.trim();
      if (!val || config[activeConfig]?.includes(val)) return;
      setConfig({ ...config, [activeConfig]: [...(config[activeConfig] || []), val] });
      setInputValue('');
      setUnsavedChanges(true);
  };

  const removeItem = (itemToRemove) => {
      setConfig({ ...config, [activeConfig]: config[activeConfig].filter(i => i !== itemToRemove) });
      setUnsavedChanges(true);
  };

  const handleSave = async () => {
      const user = auth.currentUser;
      if (!user) return;
      await setDoc(doc(db, "users", user.uid, "settings", "tradelab"), config);
      setUnsavedChanges(false);
      alert('Systeem succesvol opgeslagen!');
  };

  const currentCat = CATEGORIES.find(c => c.id === activeConfig);

  if (loading) return <div style={{ padding:40, color:'#86868B' }}>Laden...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: 1000, margin: '0 auto' }}>
      
      {/* HEADER */}
      <div style={{ marginBottom: 30, display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap: 'wrap', gap: '15px' }}>
        <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>System Architect</h1>
            <p style={{ color: 'var(--text-muted)', margin: '5px 0 0 0' }}>Configureer je trading business.</p>
        </div>
        {unsavedChanges && (
            <div style={{ background:'#FF3B30', color:'white', padding:'6px 12px', borderRadius:20, fontSize:11, fontWeight:700 }}>
                ⚠️ Niet opgeslagen
            </div>
        )}
      </div>

      {/* RESPONSIVE CONTAINER: Menu links op desktop, boven op mobiel */}
      <div className="settings-layout">
          
          {/* HOOFDMENU */}
          <div className="settings-sidebar">
              <MenuButton label="Trading" icon={<Faders size={20}/>} active={activeTab==='trading'} onClick={()=>setActiveTab('trading')} />
              <MenuButton label="Account" icon={<User size={20}/>} active={activeTab==='account'} onClick={()=>setActiveTab('account')} />
              <MenuButton label="Billing" icon={<CreditCard size={20}/>} active={activeTab==='subscription'} onClick={()=>setActiveTab('subscription')} />
          </div>

          {/* CONTENT AREA */}
          <div style={{ flex: 1, minWidth: 0 }}>
              {activeTab === 'trading' && (
                  <div className="bento-card" style={{ padding: 0, overflow:'hidden', display:'flex', flexDirection:'column' }}>
                      
                      {/* SUB-NAVIGATIE (HORIZONTAAL SCROLLBAAR OP MOBIEL) */}
                      <div style={{ 
                        padding: '10px', 
                        borderBottom: '1px solid #E5E5EA', 
                        background:'#F9F9F9', 
                        display:'flex', 
                        gap:'5px', 
                        overflowX: 'auto',
                        WebkitOverflowScrolling: 'touch'
                      }}>
                          {CATEGORIES.map(cat => (
                              <button 
                                key={cat.id}
                                onClick={() => setActiveConfig(cat.id)}
                                style={{
                                    flexShrink: 0,
                                    display:'flex', alignItems:'center', gap:8,
                                    padding: '8px 12px', borderRadius: 8, border:'none', fontSize:12, fontWeight:600, cursor:'pointer',
                                    background: activeConfig === cat.id ? 'white' : 'transparent',
                                    color: activeConfig === cat.id ? '#1D1D1F' : '#86868B',
                                    boxShadow: activeConfig === cat.id ? '0 2px 5px rgba(0,0,0,0.05)' : 'none',
                                    whiteSpace: 'nowrap'
                                }}
                              >
                                  <span style={{ color: activeConfig === cat.id ? cat.color : 'inherit' }}>{cat.icon}</span>
                                  {cat.label}
                              </button>
                          ))}
                      </div>

                      {/* EDITOR AREA */}
                      <div style={{ padding: '20px', flex:1, display:'flex', flexDirection:'column' }}>
                          <div style={{ marginBottom: 20 }}>
                              <h3 style={{ margin:0, fontSize:17, display:'flex', alignItems:'center', gap:10 }}>
                                  Beheer {currentCat.label}
                              </h3>
                              <p style={{ margin:'4px 0 0 0', color:'#86868B', fontSize:12 }}>{currentCat.desc}</p>
                          </div>

                          {/* Tags lijst */}
                          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:20 }}>
                              {(config[activeConfig] || []).map((item, idx) => (
                                  <div key={idx} style={{ 
                                      display:'flex', alignItems:'center', gap:6, 
                                      padding:'6px 12px', borderRadius:15, 
                                      background:'white', border:'1px solid #E5E5EA', 
                                      fontSize:12, fontWeight:500
                                  }}>
                                      {item}
                                      <button onClick={() => removeItem(item)} style={{ border:'none', background:'none', cursor:'pointer', color:'#86868B', padding:0, display:'flex' }}>
                                          <X size={14} weight="bold"/>
                                      </button>
                                  </div>
                              ))}
                          </div>

                          {/* Input Area */}
                          <div style={{ marginTop:'auto', paddingTop:20, borderTop:'1px solid #F5F5F7' }}>
                              <div style={{ display:'flex', gap:8 }}>
                                  <input 
                                      className="apple-input" 
                                      placeholder="Toevoegen..."
                                      value={inputValue}
                                      onChange={e => setInputValue(e.target.value)}
                                      onKeyDown={e => e.key === 'Enter' && addItem()}
                                      style={{ height: '40px' }}
                                  />
                                  <button 
                                    onClick={addItem} 
                                    style={{ 
                                        width:40, height:40, background:'#007AFF', color:'white', 
                                        border:'none', borderRadius:10, cursor:'pointer', 
                                        display:'flex', alignItems:'center', justifyContent:'center', flexShrink: 0
                                    }}
                                  >
                                      <Plus size={20} weight="bold"/>
                                  </button>
                              </div>
                          </div>
                      </div>

                      {/* FOOTER */}
                      <div style={{ padding: 15, background:'#F9F9F9', borderTop:'1px solid #E5E5EA', display:'flex', justifyContent:'flex-end' }}>
                          <button onClick={handleSave} className="btn-primary" style={{ padding:'8px 20px', fontSize:13, background: unsavedChanges ? '#007AFF' : '#C7C7CC', opacity: unsavedChanges ? 1 : 0.6 }}>
                              <FloppyDisk size={16} style={{ marginRight:6 }}/> Opslaan
                          </button>
                      </div>
                  </div>
              )}
              {activeTab !== 'trading' && <div className="bento-card" style={{padding:40, textAlign:'center', color:'#86868B'}}>Binnenkort beschikbaar.</div>}
          </div>
      </div>

      {/* INLINE CSS VOOR RESPONSIVENESS */}
      <style>{`
          .settings-layout {
              display: flex;
              gap: 30px;
          }
          .settings-sidebar {
              width: 220px;
              display: flex;
              flex-direction: column;
              gap: 5px;
          }
          @media (max-width: 768px) {
              .settings-layout {
                  flex-direction: column;
                  gap: 20px;
              }
              .settings-sidebar {
                  width: 100%;
                  flex-direction: row;
                  overflow-x: auto;
                  padding-bottom: 10px;
              }
              .settings-sidebar button {
                  white-space: nowrap;
                  padding: 10px 15px;
              }
          }
      `}</style>
    </div>
  );
}

const MenuButton = ({ label, icon, active, onClick }) => (
    <button onClick={onClick} style={{ 
        display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderRadius:10, border:'none', cursor:'pointer',
        background: active ? 'white' : 'transparent', color: active ? '#1D1D1F' : '#86868B', fontWeight: active ? 700 : 500,
        boxShadow: active ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', textAlign:'left', fontSize:14, transition:'all 0.2s'
    }}>
        {icon} <span className="menu-label">{label}</span>
    </button>
);