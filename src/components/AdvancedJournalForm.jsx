import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, onSnapshot, doc, getDoc } from 'firebase/firestore'; 
import { Plus, Trash, Calculator, X, Wallet, CaretDown, ArrowUpRight, ArrowDownRight, ArrowsSplit, CheckSquare, WarningCircle, Image } from '@phosphor-icons/react';

// --- DEFAULTS (Als fallback) ---
const DEFAULT_CONFIG = {
    strategies: ["Breakout", "Pullback", "Reversal", "Trend Following", "Scalp"],
    rules: ["Max 1% Risico", "Wachten op Candle Close", "Geen impulsieve entry", "Stoploss geplaatst"],
    mistakes: ["None (Perfect Execution)", "FOMO Entry", "Revenge Trading", "Too Big Size", "No Plan"],
    quality: ["A+ (Perfect)", "A (Good)", "B (Average)", "C (Bad)"]
};

export default function AdvancedJournalForm({ onSubmit, onCancel }) {
  const [accounts, setAccounts] = useState([]);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  
  // 1. DATA OPHALEN
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // A. Accounts (ALLEEN ACTIVE)
    const q = query(collection(db, "users", user.uid, "accounts"));
    const unsub = onSnapshot(q, (snap) => {
      const allAccounts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAccounts(allAccounts.filter(acc => acc.status === 'Active'));
    });

    // B. Settings (Configuratie)
    const fetchSettings = async () => {
        try {
            const docRef = doc(db, "users", user.uid, "settings", "tradelab");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setConfig(data);
                // Update defaults in state
                setGeneral(prev => ({
                    ...prev,
                    strategy: data.strategies?.[0] || '',
                    setupQuality: data.quality?.[0] || '',
                    mistake: data.mistakes?.[0] || ''
                }));
            }
        } catch (e) { console.log("Gebruik defaults"); }
    };
    fetchSettings();

    return () => unsub();
  }, []);

  // 2. STATE
  const [general, setGeneral] = useState({
    date: new Date().toISOString().split('T')[0],
    accountId: '',
    pair: '',
    direction: 'LONG',
    strategy: '',      // <--- NIEUW
    setupQuality: '',  // <--- NIEUW
    mistake: '',       // <--- NIEUW
    screenshot: '',    // <--- NIEUW
    commission: 0,
    checkedRules: [] 
  });

  const [entry, setEntry] = useState({ 
    price: '', sl: '', risk: '', totalLots: '' 
  });

  const [exits, setExits] = useState([
    { id: 1, price: '', lots: '', note: 'TP1' } 
  ]);

  const [stats, setStats] = useState({ 
    closedVol: 0, calculatedPnl: 0, rrr: 0 
  });

  // --- REGELS AFVINKEN ---
  const toggleRule = (rule) => {
    setGeneral(prev => {
      const newRules = prev.checkedRules.includes(rule) 
        ? prev.checkedRules.filter(r => r !== rule) 
        : [...prev.checkedRules, rule];
      return { ...prev, checkedRules: newRules };
    });
  };

  // --- AUTO RICHTING ---
  useEffect(() => {
    if (entry.price && entry.sl) {
        const ePrice = Number(entry.price);
        const sPrice = Number(entry.sl);
        if (ePrice > sPrice) setGeneral(prev => ({ ...prev, direction: 'LONG' }));
        else if (ePrice < sPrice) setGeneral(prev => ({ ...prev, direction: 'SHORT' }));
    }
  }, [entry.price, entry.sl]);

  // --- CALCULATOR ---
  useEffect(() => {
    if (!entry.price || !entry.sl || !entry.risk) return;
    const entryPrice = Number(entry.price);
    const slPrice = Number(entry.sl);
    const riskAmount = Number(entry.risk);
    const totalLots = Number(entry.totalLots) || 1; 

    const slDistance = Math.abs(entryPrice - slPrice);
    if (slDistance === 0) return;

    const valuePerPriceUnit = riskAmount / slDistance;
    let totalPnl = 0;
    let closedLots = 0;

    exits.forEach(ex => {
        if (ex.price && ex.lots) {
            const exitPrice = Number(ex.price);
            const exitLots = Number(ex.lots);
            
            let priceMove = 0;
            if (general.direction === 'LONG') priceMove = exitPrice - entryPrice; 
            else priceMove = entryPrice - exitPrice; 

            const weight = exitLots / totalLots;
            totalPnl += (priceMove * valuePerPriceUnit * weight);
            closedLots += exitLots;
        }
    });

    const rrr = riskAmount > 0 ? totalPnl / riskAmount : 0;
    setStats({ closedVol: Number(closedLots.toFixed(2)), calculatedPnl: totalPnl, rrr: rrr });

  }, [entry, exits, general.direction]);

  // ACTIES
  const addExit = () => setExits([...exits, { id: Date.now(), price: '', lots: '', note: `TP${exits.length + 1}` }]);
  const removeExit = (id) => setExits(exits.filter(e => e.id !== id));

  const distributeLots = () => {
    const total = Number(entry.totalLots);
    const count = exits.length;
    if (!total || count === 0) return;
    const perExit = Math.floor((total / count) * 100) / 100;
    let currentSum = 0;
    const newExits = exits.map((ex, index) => {
        if (index === count - 1) return { ...ex, lots: Number((total - currentSum).toFixed(2)) };
        currentSum += perExit;
        return { ...ex, lots: perExit };
    });
    setExits(newExits);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const selectedAcc = accounts.find(a => a.id === general.accountId);
    const accountName = selectedAcc ? `${selectedAcc.firm} (${selectedAcc.type})` : 'Onbekend';
    
    // Bereken Discipline Score op basis van dynamische regels
    const totalRules = config.rules?.length || 1;
    const disciplineScore = Math.round((general.checkedRules.length / totalRules) * 100);

    onSubmit({
      ...general,
      accountName,
      ...entry,
      risk: Number(entry.risk), 
      exits, 
      disciplineScore, 
      pnl: Math.round(stats.calculatedPnl - Number(general.commission)), 
      rMultiple: Math.round(stats.rrr * 100) / 100,
      isAdvanced: true,
      status: 'CLOSED' 
    });
  };

  const isVolError = stats.closedVol > Number(entry.totalLots);

  return (
    <div className="bento-card" style={{ border: '2px solid #007AFF', background: '#F9FBFF' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: 10 }}>
        <div style={{ display:'flex', alignItems:'center', gap: 6, color: '#007AFF', fontWeight: 800, fontSize: 12 }}>
            <Calculator size={16} weight="fill"/> PRO CALCULATOR
        </div>
        <button type="button" onClick={onCancel} style={{ background:'none', border:'none', cursor:'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
      </div>

      <form onSubmit={handleSubmit}>
        
        {/* --- BLOK 1: BASIS INFO & TAGS --- */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 20 }}>
            
            {/* KOLOM 1: ACCOUNT & PAIR */}
            <div>
                 <div className="input-group" style={{ marginBottom: 10 }}>
                    <label className="input-label">Account</label>
                    <div style={{ position: 'relative' }}>
                        <select className="apple-input" value={general.accountId} onChange={e => setGeneral({...general, accountId: e.target.value})} style={{ paddingLeft: 35 }} required>
                            <option value="">Kies...</option>
                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.firm}</option>)}
                        </select>
                        <Wallet size={16} style={{ position: 'absolute', left: 12, top: 14, color: '#86868B' }} />
                        <CaretDown size={14} style={{ position: 'absolute', right: 12, top: 15, color: '#86868B', pointerEvents:'none' }} />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 10 }}>
                    <div className="input-group" style={{ marginBottom:0 }}>
                        <label className="input-label">Instrument</label>
                        <input className="apple-input" value={general.pair} onChange={e => setGeneral({...general, pair: e.target.value})} placeholder="EURUSD" required />
                    </div>
                    <div className="input-group" style={{ marginBottom:0 }}>
                        <label className="input-label">Richting</label>
                        <div style={{ display:'flex', height: 42, background:'#E5E5EA', borderRadius:8, padding: 2, pointerEvents: 'none' }}>
                            <div style={{ flex:1, borderRadius:6, fontSize:11, fontWeight:700, background: general.direction === 'LONG' ? 'white' : 'transparent', color: general.direction === 'LONG' ? '#30D158' : '#86868B', boxShadow: general.direction === 'LONG' ? '0 2px 5px rgba(0,0,0,0.05)' : 'none', display: 'flex', alignItems:'center', justifyContent:'center', gap:4, transition: 'all 0.3s' }}>LONG <ArrowUpRight weight="bold"/></div>
                            <div style={{ flex:1, borderRadius:6, fontSize:11, fontWeight:700, background: general.direction === 'SHORT' ? 'white' : 'transparent', color: general.direction === 'SHORT' ? '#FF3B30' : '#86868B', boxShadow: general.direction === 'SHORT' ? '0 2px 5px rgba(0,0,0,0.05)' : 'none', display: 'flex', alignItems:'center', justifyContent:'center', gap:4, transition: 'all 0.3s' }}>SHORT <ArrowDownRight weight="bold"/></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* KOLOM 2: TAGS (STRATEGY, QUALITY, MISTAKE) */}
            <div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                    <div className="input-group" style={{ marginBottom:0 }}>
                        <label className="input-label">Strategie</label>
                        <select className="apple-input" value={general.strategy} onChange={e => setGeneral({...general, strategy: e.target.value})}>
                            {(config.strategies || []).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="input-group" style={{ marginBottom:0 }}>
                        <label className="input-label">Kwaliteit</label>
                        <select className="apple-input" value={general.setupQuality} onChange={e => setGeneral({...general, setupQuality: e.target.value})}>
                            {(config.quality || []).map(q => <option key={q} value={q}>{q}</option>)}
                        </select>
                    </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    <div className="input-group" style={{ marginBottom:0 }}>
                        <label className="input-label">Mistake</label>
                        <select className="apple-input" value={general.mistake} onChange={e => setGeneral({...general, mistake: e.target.value})}>
                            {(config.mistakes || []).map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div className="input-group" style={{ marginBottom:0 }}>
                        <label className="input-label">Screenshot URL</label>
                        <div style={{ position:'relative' }}>
                            <input className="apple-input" value={general.screenshot} onChange={e => setGeneral({...general, screenshot: e.target.value})} style={{ paddingLeft:35 }} placeholder="https://..." />
                            <Image size={16} style={{ position: 'absolute', left: 12, top: 14, color: '#86868B' }} />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* --- BLOK 2: ENTRY & RISK & DISCIPLINE --- */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 20 }}>
            
            {/* CALCULATOR */}
            <div style={{ background: 'white', padding: 15, borderRadius: 12, border:'1px solid #E5E5EA' }}>
                <div className="label-xs" style={{marginBottom:10, color:'#007AFF'}}>TRADE PARAMETERS</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                    <div className="input-group" style={{ marginBottom:0 }}><label className="input-label">Entry</label><input className="apple-input" type="number" step="any" placeholder="1.1000" value={entry.price} onChange={e => setEntry({...entry, price: e.target.value})} required /></div>
                    <div className="input-group" style={{ marginBottom:0 }}><label className="input-label">Stoploss</label><input className="apple-input" type="number" step="any" placeholder="1.0990" value={entry.sl} onChange={e => setEntry({...entry, sl: e.target.value})} required /></div>
                    <div className="input-group" style={{ marginBottom:0 }}><label className="input-label">Risk (€)</label><input className="apple-input" type="number" step="any" placeholder="100" value={entry.risk} onChange={e => setEntry({...entry, risk: e.target.value})} required /></div>
                    <div className="input-group" style={{ marginBottom:0 }}><label className="input-label">Lots</label><input className="apple-input" type="number" step="any" placeholder="5.0" value={entry.totalLots} onChange={e => setEntry({...entry, totalLots: e.target.value})} required /></div>
                </div>
            </div>

            {/* DISCIPLINE CHECKLIST (NIEUW IN PRO) */}
            <div style={{ background: '#FFF', borderRadius: 12, padding: 15, border: '1px solid #E5E5EA', display:'flex', flexDirection:'column' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                    <div className="label-xs" style={{ marginBottom:0, color:'#FF3B30' }}>CHECK JE REGELS</div>
                    <div style={{ fontSize:11, fontWeight:700, color: '#1D1D1F' }}>
                        Score: {Math.round((general.checkedRules.length / (config.rules?.length || 1)) * 100)}%
                    </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap: 6, flex:1, maxHeight: 120, overflowY:'auto' }}>
                    {(config.rules || []).map((rule, idx) => (
                        <label key={idx} style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, cursor:'pointer', color:'#1D1D1F' }}>
                            <input 
                                type="checkbox" 
                                checked={general.checkedRules.includes(rule)}
                                onChange={() => toggleRule(rule)}
                                style={{ accentColor: '#007AFF' }}
                            />
                            {rule}
                        </label>
                    ))}
                </div>
            </div>
        </div>

        {/* --- BLOK 3: EXITS --- */}
        <div style={{ marginBottom: 20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                <label className="input-label" style={{marginBottom:0}}>Take Profits (Split Exits)</label>
                <button type="button" onClick={distributeLots} style={{ fontSize:10, color:'#007AFF', background:'none', border:'none', cursor:'pointer', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
                    <ArrowsSplit size={14}/> Verdeel Lots
                </button>
            </div>

            {exits.map((exit, index) => (
                <div key={exit.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, marginBottom: 8 }}>
                    <input className="apple-input" placeholder="TP Prijs" type="number" step="any" value={exit.price} onChange={(e) => { const newExits = [...exits]; newExits[index].price = e.target.value; setExits(newExits); }} />
                    <input className="apple-input" placeholder="Lots" type="number" step="any" value={exit.lots} onChange={(e) => { const newExits = [...exits]; newExits[index].lots = e.target.value; setExits(newExits); }} />
                    <input className="apple-input" placeholder="Notitie" value={exit.note} onChange={(e) => { const newExits = [...exits]; newExits[index].note = e.target.value; setExits(newExits); }} />
                    <button type="button" onClick={() => removeExit(exit.id)} style={{ border:'none', background:'none', color:'#FF3B30', cursor:'pointer' }}><Trash size={16} /></button>
                </div>
            ))}
            
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <button type="button" onClick={addExit} style={{ fontSize: 12, color: '#007AFF', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Plus size={14} weight="bold" /> ADD EXIT
                </button>
                <div style={{ fontSize:11, fontWeight: 700, color: isVolError ? '#FF3B30' : '#86868B', display:'flex', alignItems:'center', gap:4 }}>
                    {isVolError && <WarningCircle weight="fill" />}
                    Gesloten: {stats.closedVol} / {entry.totalLots || '-'} Lots
                </div>
            </div>
        </div>

        {/* --- BLOK 4: RESULTAAT BALK --- */}
        <div className="bento-card" style={{ background: '#1D1D1F', color: 'white', padding: 15, border: 'none', marginBottom: 15 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                    <div style={{ fontSize: 11, color: '#86868B', fontWeight: 600 }}>GESCHAT RESULTAAT</div>
                    <div style={{ fontSize: 13, color: '#86868B' }}>
                        Risk/Reward: <span style={{ color:'white' }}>{stats.rrr.toFixed(2)}R</span>
                    </div>
                </div>
                <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: stats.calculatedPnl >= 0 ? '#30D158' : '#FF453A' }}>
                        {stats.calculatedPnl >= 0 ? '+' : ''}€{Math.round(stats.calculatedPnl)}
                    </div>
                </div>
            </div>
        </div>
        
        <div className="input-group" style={{ marginBottom: 15 }}>
             <label className="input-label">Commissie / Swap (€)</label>
             <input className="apple-input" type="number" placeholder="0" value={general.commission} onChange={e => setGeneral({...general, commission: e.target.value})} />
        </div>

        <button type="submit" className="btn-primary" style={{ width: '100%', background: '#007AFF' }}>Opslaan & Sluiten</button>
      </form>
    </div>
  );
}
