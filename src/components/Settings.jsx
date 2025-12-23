import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { User, CreditCard, Faders, Plus, X, FloppyDisk, ArrowCounterClockwise, Strategy, CheckCircle, Warning, Tag } from '@phosphor-icons/react';

// --- DEFAULTS ---
const DEFAULT_CONFIG = {
    strategies: [
        // --- CLASSIC ---
        "Trend Continuation",
        "Pullback / Retracement",
        "Breakout",
        "Reversal (Key Level)",
        "Supply & Demand",
        
        // --- SMC / ICT ---
        "Liquidity Sweep (SFP)",
        "Fair Value Gap (FVG)",
        "Silver Bullet (Time Based)",
        "Orderblock Entry",
        
        // --- SPECIFIEK ---
        "Opening Range Breakout",
        "Asian Range Fade",
        "News Fade"
    ],
    rules: [
        // --- RISK MANAGEMENT (Harde Cijfers) ---
        "Max 1% Risico per trade", 
        "Minimaal 1:2 Risk/Reward", 
        "Stoploss fysiek geplaatst", 
        "Max Daily Loss niet bereikt",
        
        // --- EXECUTION (Het Proces) ---
        "Wachten op Candle Close", 
        "Geen High Impact News (<30m)", 
        "Aligned met HTF Trend", 
        "Binnen Trading Sessie (Lon/NY)",
        
        // --- PSYCHOLOGIE (Je Hoofd) ---
        "Clean Headspace (Geen Tilt)"
    ],
    mistakes: [
        "None (Perfect Execution)", 
        // --- ENTRY FOUTEN ---
        "FOMO Entry", 
        "Impulsive Entry",
        "Too Big Size",
        "No Plan",
        // --- MANAGEMENT FOUTEN (Jouw Nieuwe Lijst) ---
        "Stoploss Widening",     // De Doodzonde
        "Break-Even Too Soon",   // Angst voor verlies
        "Cutting Winners Early", // Angst dat prijs draait
        "Target Extension",      // Hebzucht
        "Adding to Losers",      // Martingale/DCA uit hoop
        "Micromanagement",       // 1m chart staren
        "Revenge Execution"      // Direct heropenen
    ],
    quality: [
        "A+ (Perfect)", 
        "A (Good)", 
        "B (Average)", 
        "C (Forced/Bad)"
    ]
};

// Categorie definities voor de UI
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

  // 1. DATA OPHALEN
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

  // 2. LOGICA
  const addItem = () => {
      const val = inputValue.trim();
      if (!val) return;
      if (config[activeConfig]?.includes(val)) return;

      const newList = [...(config[activeConfig] || []), val];
      setConfig({ ...config, [activeConfig]: newList });
      setInputValue('');
      setUnsavedChanges(true);
  };

  const removeItem = (itemToRemove) => {
      const newList = config[activeConfig].filter(i => i !== itemToRemove);
      setConfig({ ...config, [activeConfig]: newList });
      setUnsavedChanges(true);
  };

  const handleSave = async () => {
      const user = auth.currentUser;
      if (!user) return;
      await setDoc(doc(db, "users", user.uid, "settings", "tradelab"), config);
      setUnsavedChanges(false);
      alert('Systeem succesvol opgeslagen!');
  };

  const handleResetDefaults = () => {
      if(confirm("Terug naar standaard instellingen?")) {
          setConfig(DEFAULT_CONFIG);
          setUnsavedChanges(true);
      }
  };

  const currentCat = CATEGORIES.find(c => c.id === activeConfig);

  if (loading) return <div style={{ padding:40, color:'#86868B' }}>Laden...</div>;

  return (
    <div style={{ padding: '40px 20px', maxWidth: 1000, margin: '0 auto' }}>
      
      {/* HEADER */}
      <div style={{ marginBottom: 30, display:'flex', justifyContent:'space-between', alignItems:'end' }}>
        <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>System Architect</h1>
            <p style={{ color: 'var(--text-muted)' }}>Configureer de kern van je trading business.</p>
        </div>
        {unsavedChanges && (
            <div style={{ background:'#FF3B30', color:'white', padding:'6px 12px', borderRadius:20, fontSize:12, fontWeight:700, animation:'pulse 2s infinite' }}>
                ⚠️ Niet opgeslagen
            </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 40 }}>
          
          {/* HOOFDMENU (Links) */}
          <div style={{ display:'flex', flexDirection:'column', gap: 5 }}>
              <MenuButton label="Trading System" icon={<Faders size={20}/>} active={activeTab==='trading'} onClick={()=>setActiveTab('trading')} />
              <MenuButton label="Account" icon={<User size={20}/>} active={activeTab==='account'} onClick={()=>setActiveTab('account')} />
              <MenuButton label="Billing" icon={<CreditCard size={20}/>} active={activeTab==='subscription'} onClick={()=>setActiveTab('subscription')} />
          </div>

          {/* CONTENT AREA (Rechts) */}
          <div>
              
              {activeTab === 'trading' && (
                  <div className="bento-card" style={{ padding: 0, overflow:'hidden', minHeight: 500, display:'flex', flexDirection:'column' }}>
                      
                      {/* 1. TOP BAR: SUB-NAVIGATIE */}
                      <div style={{ padding: 15, borderBottom: '1px solid #E5E5EA', background:'#F9F9F9', display:'flex', gap:5 }}>
                          {CATEGORIES.map(cat => (
                              <button 
                                key={cat.id}
                                onClick={() => setActiveConfig(cat.id)}
                                style={{
                                    flex: 1,
                                    display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                                    padding: '10px', borderRadius: 8, border:'none', fontSize:13, fontWeight:600, cursor:'pointer',
                                    background: activeConfig === cat.id ? 'white' : 'transparent',
                                    color: activeConfig === cat.id ? '#1D1D1F' : '#86868B',
                                    boxShadow: activeConfig === cat.id ? '0 2px 5px rgba(0,0,0,0.05)' : 'none',
                                    transition: 'all 0.2s ease'
                                }}
                              >
                                  <span style={{ color: activeConfig === cat.id ? cat.color : 'inherit' }}>{cat.icon}</span>
                                  {cat.label}
                              </button>
                          ))}
                      </div>

                      {/* 2. EDITOR AREA */}
                      <div style={{ padding: 30, flex:1, display:'flex', flexDirection:'column' }}>
                          
                          {/* Titel */}
                          <div style={{ marginBottom: 25 }}>
                              <h3 style={{ margin:0, fontSize:18, display:'flex', alignItems:'center', gap:10 }}>
                                  <span style={{ color: currentCat.color }}>{currentCat.icon}</span> 
                                  Beheer {currentCat.label}
                              </h3>
                              <p style={{ margin:'5px 0 0 0', color:'#86868B', fontSize:13 }}>{currentCat.desc}</p>
                          </div>

                          {/* De Lijst (Tags) */}
                          <div style={{ flex:1, alignContent:'flex-start', display:'flex', flexWrap:'wrap', gap:10, marginBottom:20 }}>
                              {(config[activeConfig] || []).map((item, idx) => (
                                  <div key={idx} style={{ 
                                      display:'flex', alignItems:'center', gap:8, 
                                      padding:'8px 14px', borderRadius:20, 
                                      background:'white', border:'1px solid #E5E5EA', 
                                      fontSize:13, fontWeight:500, color:'#1D1D1F',
                                      boxShadow:'0 1px 2px rgba(0,0,0,0.02)'
                                  }}>
                                      {item}
                                      <button onClick={() => removeItem(item)} style={{ border:'none', background:'#E5E5EA', borderRadius:'50%', width:18, height:18, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#86868B' }}>
                                          <X size={10} weight="bold"/>
                                      </button>
                                  </div>
                              ))}
                              {(config[activeConfig] || []).length === 0 && <div style={{ color:'#ccc', fontStyle:'italic' }}>Geen items gevonden. Voeg er een toe.</div>}
                          </div>

                          {/* Input Area (HIER ZAT DE FOUT: NU MET KLEUR) */}
                          <div style={{ marginTop:'auto', paddingTop:20, borderTop:'1px solid #F5F5F7' }}>
                              <div style={{ display:'flex', gap:10 }}>
                                  <input 
                                      className="apple-input" 
                                      placeholder={`Nieuwe ${currentCat.label.toLowerCase()} toevoegen...`}
                                      value={inputValue}
                                      autoFocus
                                      onChange={e => setInputValue(e.target.value)}
                                      onKeyDown={e => e.key === 'Enter' && addItem()}
                                  />
                                  <button 
                                    onClick={addItem} 
                                    style={{ 
                                        width:50, 
                                        background:'#007AFF', // <--- FIX: BLAUWE ACHTERGROND
                                        color:'white',        // <--- FIX: WITTE TEKST
                                        border:'none', borderRadius:10, cursor:'pointer', 
                                        display:'flex', alignItems:'center', justifyContent:'center',
                                        boxShadow: '0 2px 5px rgba(0,122,255,0.3)'
                                    }}
                                  >
                                      <Plus size={20} weight="bold"/>
                                  </button>
                              </div>
                          </div>

                      </div>

                      {/* 3. FOOTER ACTIONS */}
                      <div style={{ padding: 15, background:'#F9F9F9', borderTop:'1px solid #E5E5EA', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <button onClick={handleResetDefaults} style={{ border:'none', background:'none', color:'#FF3B30', fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                              <ArrowCounterClockwise size={16}/> Reset
                          </button>
                          <button onClick={handleSave} className="btn-primary" style={{ padding:'8px 20px', fontSize:13, background: unsavedChanges ? '#007AFF' : '#C7C7CC', pointerEvents: unsavedChanges ? 'auto' : 'none' }}>
                              <FloppyDisk size={16} style={{ marginRight:6 }}/> Opslaan
                          </button>
                      </div>

                  </div>
              )}

              {/* PLACEHOLDERS VOOR ANDERE TABS */}
              {activeTab === 'account' && <div className="bento-card" style={{padding:40,textAlign:'center',color:'#86868B'}}>Account instellingen komen hier.</div>}
              {activeTab === 'subscription' && <div className="bento-card" style={{padding:40,textAlign:'center',color:'#86868B'}}>Abonnement beheer komt hier.</div>}

          </div>
      </div>
    </div>
  );
}

const MenuButton = ({ label, icon, active, onClick }) => (
    <button onClick={onClick} style={{ 
        display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderRadius:10, border:'none', cursor:'pointer',
        background: active ? 'white' : 'transparent', color: active ? '#1D1D1F' : '#86868B', fontWeight: active ? 700 : 500,
        boxShadow: active ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', textAlign:'left', fontSize:14, transition:'all 0.2s', width: '100%'
    }}>
        {icon} {label}
    </button>
);