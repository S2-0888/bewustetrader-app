import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { User, CreditCard, Faders, Plus, X, FloppyDisk, Strategy, CheckCircle, Warning, Tag, Coins } from '@phosphor-icons/react';

// --- DEFAULTS ---
const DEFAULT_CONFIG = {
    strategies: ["Trend Continuation", "Pullback / Retracement", "Breakout", "Reversal (Key Level)", "Supply & Demand", "Liquidity Sweep (SFP)", "Fair Value Gap (FVG)", "Silver Bullet (Time Based)", "Orderblock Entry", "Opening Range Breakout", "Asian Range Fade", "News Fade"],
    rules: ["Max 1% Risk per trade", "Minimum 1:2 Risk/Reward", "Physical Stoploss Placed", "Daily Loss Limit Not Reached", "Wait for Candle Close", "No High Impact News (<30m)", "Aligned with HTF Trend", "Within Trading Session (Lon/NY)", "Clean Headspace (No Tilt)"],
    mistakes: ["None (Perfect Execution)", "FOMO Entry", "Impulsive Entry", "Position Size Too Large", "No Plan", "Stoploss Widening", "Break-Even Too Soon", "Cutting Winners Early", "Target Extension", "Adding to Losers", "Micromanagement", "Revenge Execution"],
    quality: ["A+ (Perfect)", "A (Good)", "B (Average)", "C (Forced/Bad)"]
};

const CATEGORIES = [
    { id: 'strategies', label: 'Strategies', icon: <Strategy size={18}/>, color: '#007AFF', desc: 'Which setups do you trade?' },
    { id: 'rules', label: 'Rules', icon: <CheckCircle size={18}/>, color: '#30D158', desc: 'Discipline checklist items.' },
    { id: 'mistakes', label: 'Mistakes', icon: <Warning size={18}/>, color: '#FF9F0A', desc: 'Tags for trade evaluation.' },
    { id: 'quality', label: 'Quality', icon: <Tag size={18}/>, color: '#AF52DE', desc: 'Setup grading labels.' },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('trading'); 
  const [activeConfig, setActiveConfig] = useState('strategies'); 
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [inputValue, setInputValue] = useState(''); 

  useEffect(() => {
    const fetchSettings = async () => {
        const user = auth.currentUser;
        if (!user) return;

        // Load TradeLab Config
        const tradeRef = doc(db, "users", user.uid, "settings", "tradelab");
        const tradeSnap = await getDoc(tradeRef);
        if (tradeSnap.exists()) setConfig(tradeSnap.data());

        // Load Profile (Currency)
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().baseCurrency) {
            setBaseCurrency(userSnap.data().baseCurrency);
        }

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

      try {
          // Save Trading configuration
          await setDoc(doc(db, "users", user.uid, "settings", "tradelab"), config);
          
          // Save Base Currency preference to user profile
          await setDoc(doc(db, "users", user.uid), { baseCurrency }, { merge: true });

          setUnsavedChanges(false);
          alert('System updated successfully!');
      } catch (error) {
          console.error(error);
          alert('Failed to save settings.');
      }
  };

  const currentCat = CATEGORIES.find(c => c.id === activeConfig);

  if (loading) return <div style={{ padding:40, color:'#86868B' }}>Initializing Architecture...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: 1000, margin: '0 auto' }}>
      
      {/* HEADER */}
      <div style={{ marginBottom: 30, display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap: 'wrap', gap: '15px' }}>
        <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>System Architect</h1>
            <p style={{ color: '#86868B', margin: '5px 0 0 0' }}>Configure your trading business rules.</p>
        </div>
        {unsavedChanges && (
            <div style={{ background:'#FF3B30', color:'white', padding:'6px 12px', borderRadius:20, fontSize:11, fontWeight:700 }}>
                ⚠️ Unsaved Changes
            </div>
        )}
      </div>

      <div className="settings-layout">
          
          {/* MAIN MENU */}
          <div className="settings-sidebar">
              <MenuButton label="Trading" icon={<Faders size={20}/>} active={activeTab==='trading'} onClick={()=>setActiveTab('trading')} />
              <MenuButton label="Account" icon={<User size={20}/>} active={activeTab==='account'} onClick={()=>setActiveTab('account')} />
              <MenuButton label="Billing" icon={<CreditCard size={20}/>} active={activeTab==='subscription'} onClick={()=>setActiveTab('subscription')} />
          </div>

          {/* CONTENT AREA */}
          <div style={{ flex: 1, minWidth: 0 }}>
              
              {/* TRADING CONFIGURATION */}
              {activeTab === 'trading' && (
                  <div className="bento-card" style={{ padding: 0, overflow:'hidden', display:'flex', flexDirection:'column' }}>
                      <div style={{ padding: '10px', borderBottom: '1px solid #E5E5EA', background:'#F9F9F9', display:'flex', gap:'5px', overflowX: 'auto' }}>
                          {CATEGORIES.map(cat => (
                              <button 
                                key={cat.id}
                                onClick={() => setActiveConfig(cat.id)}
                                style={{
                                    flexShrink: 0, display:'flex', alignItems:'center', gap:8,
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

                      <div style={{ padding: '20px', flex:1, display:'flex', flexDirection:'column' }}>
                          <div style={{ marginBottom: 20 }}>
                              <h3 style={{ margin:0, fontSize:17 }}>Manage {currentCat.label}</h3>
                              <p style={{ margin:'4px 0 0 0', color:'#86868B', fontSize:12 }}>{currentCat.desc}</p>
                          </div>

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

                          <div style={{ marginTop:'auto', paddingTop:20, borderTop:'1px solid #F5F5F7' }}>
                              <div style={{ display:'flex', gap:8 }}>
                                  <input 
                                      className="apple-input" 
                                      placeholder="Add new item..."
                                      value={inputValue}
                                      onChange={e => setInputValue(e.target.value)}
                                      onKeyDown={e => e.key === 'Enter' && addItem()}
                                      style={{ height: '40px' }}
                                  />
                                  <button onClick={addItem} style={{ width:40, height:40, background:'#007AFF', color:'white', border:'none', borderRadius:10, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink: 0 }}>
                                      <Plus size={20} weight="bold"/>
                                  </button>
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              {/* ACCOUNT PREFERENCES (BASE CURRENCY) */}
              {activeTab === 'account' && (
                  <div className="bento-card" style={{ padding: 25 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                          <div style={{ background: 'rgba(255, 159, 10, 0.1)', padding: 10, borderRadius: 12 }}>
                              <Coins size={24} weight="fill" color="#FF9F0A" />
                          </div>
                          <div>
                              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Account Preferences</h3>
                              <p style={{ margin: 0, color: '#86868B', fontSize: 13 }}>General workspace settings.</p>
                          </div>
                      </div>

                      <div className="input-group" style={{ maxWidth: 350 }}>
                          <label className="input-label">Reporting Base Currency</label>
                          <select 
                            className="apple-input" 
                            value={baseCurrency} 
                            onChange={(e) => { setBaseCurrency(e.target.value); setUnsavedChanges(true); }}
                            style={{ height: 45, fontWeight: 600 }}
                          >
                              <option value="USD">USD ($) - US Dollar</option>
                              <option value="EUR">EUR (€) - Euro</option>
                              <option value="GBP">GBP (£) - British Pound</option>
                          </select>
                          <p style={{ fontSize: 11, color: '#86868B', marginTop: 10, lineHeight: 1.5 }}>
                              Select the currency you want to use for your overall performance analytics. 
                              Amounts in other currencies will be converted to this base.
                          </p>
                      </div>
                  </div>
              )}

              {activeTab === 'subscription' && <div className="bento-card" style={{padding:40, textAlign:'center', color:'#86868B'}}>Subscription details coming soon.</div>}

              {/* GLOBAL SAVE BUTTON */}
              <div style={{ marginTop: 25, display:'flex', justifyContent:'flex-end' }}>
                  <button onClick={handleSave} className="btn-primary" style={{ padding:'12px 40px', fontSize:14, background: unsavedChanges ? '#1D1D1F' : '#C7C7CC', opacity: unsavedChanges ? 1 : 0.6 }}>
                      <FloppyDisk size={18} style={{ marginRight:8 }}/> Save Changes
                  </button>
              </div>
          </div>
      </div>

      <style>{`
          .settings-layout { display: flex; gap: 30px; }
          .settings-sidebar { width: 220px; display: flex; flex-direction: column; gap: 5px; }
          @media (max-width: 768px) {
              .settings-layout { flex-direction: column; gap: 20px; }
              .settings-sidebar { width: 100%; flex-direction: row; overflow-x: auto; padding-bottom: 10px; }
              .settings-sidebar button { white-space: nowrap; padding: 10px 15px; }
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