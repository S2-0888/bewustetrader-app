import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, onSnapshot, doc, getDoc } from 'firebase/firestore'; 
import { Plus, Trash, Calculator, X, Wallet, CaretDown, ArrowUpRight, ArrowDownRight, ArrowsSplit, CheckSquare, WarningCircle } from '@phosphor-icons/react';

// --- DEFAULTS ---
const DEFAULT_CONFIG = {
    strategies: ["Breakout", "Pullback", "Reversal", "Trend Following", "Scalp"],
    rules: ["Max 1% Risico", "Wachten op Candle Close", "Geen impulsieve entry", "Stoploss geplaatst"],
    quality: ["A+ (Perfect)", "A (Good)", "B (Average)", "C (Bad)"]
};

export default function AdvancedJournalForm({ onSubmit, onCancel }) {
  const [accounts, setAccounts] = useState([]);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  
  // 1. DATA OPHALEN
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsub = onSnapshot(query(collection(db, "users", user.uid, "accounts")), (snap) => {
      const allAccounts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAccounts(allAccounts.filter(acc => acc.status === 'Active'));
    });

    const fetchSettings = async () => {
        try {
            const docRef = doc(db, "users", user.uid, "settings", "tradelab");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) setConfig(docSnap.data());
        } catch (e) { console.log("Gebruik defaults"); }
    };
    fetchSettings();
    return () => unsub();
  }, []);

  // 2. STATE (Focus op Planning)
  const [general, setGeneral] = useState({
    date: new Date().toISOString().split('T')[0],
    accountId: '',
    pair: '',
    direction: 'LONG',
    strategy: '',
    setupQuality: '',
    screenshot: '',
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

  // --- CALCULATOR VOOR PLANNING ---
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
            let priceMove = general.direction === 'LONG' ? exitPrice - entryPrice : entryPrice - exitPrice; 
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
    if (!total || exits.length === 0) return;
    const perExit = Math.floor((total / exits.length) * 100) / 100;
    let currentSum = 0;
    const newExits = exits.map((ex, index) => {
        if (index === exits.length - 1) return { ...ex, lots: Number((total - currentSum).toFixed(2)) };
        currentSum += perExit;
        return { ...ex, lots: perExit };
    });
    setExits(newExits);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const selectedAcc = accounts.find(a => a.id === general.accountId);
    const accountName = selectedAcc ? `${selectedAcc.firm} (${selectedAcc.type})` : 'Onbekend';
    const totalRules = config.rules?.length || 1;
    const disciplineScore = Math.round((general.checkedRules.length / totalRules) * 100);

    onSubmit({
      ...general,
      accountName,
      ...entry,
      risk: Number(entry.risk), 
      exits, 
      disciplineScore, 
      pnl: 0, // Trade is nog open
      projectedPnl: Math.round(stats.calculatedPnl), // Bewaar het plan
      projectedRR: Math.round(stats.rrr * 100) / 100,
      isAdvanced: true,
      status: 'OPEN', // Belangrijk: trade gaat openstaan
      mistake: [], // Leeg bij start
      mae: 0,
      mfe: 0
    });
  };

  const isVolError = stats.closedVol > (Number(entry.totalLots) + 0.01);

  return (
    <div className="bento-card" style={{ border: '2px solid #007AFF', background: '#F9FBFF', padding: 25 }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: 15 }}>
        <div style={{ display:'flex', alignItems:'center', gap: 8, color: '#007AFF', fontWeight: 800, fontSize: 13 }}>
            <Calculator size={20} weight="fill"/> OPERATION PLANNER (ENTRY)
        </div>
        <button type="button" onClick={onCancel} style={{ background:'none', border:'none', cursor:'pointer' }}><X size={20} /></button>
      </div>

      <form onSubmit={handleSubmit}>
        
        {/* --- BLOK 1: BASIS --- */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 20 }}>
            <div>
                 <div className="input-group">
                    <label className="input-label">Account & Instrument</label>
                    <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:10 }}>
                        <select className="apple-input" value={general.accountId} onChange={e => setGeneral({...general, accountId: e.target.value})} required>
                            <option value="">Kies account...</option>
                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.firm}</option>)}
                        </select>
                        <input className="apple-input" value={general.pair} onChange={e => setGeneral({...general, pair: e.target.value.toUpperCase()})} placeholder="XAUUSD" required />
                    </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:15 }}>
                    <div className="input-group"><label className="input-label">Strategie</label>
                        <select className="apple-input" value={general.strategy} onChange={e => setGeneral({...general, strategy: e.target.value})}>
                            {(config.strategies || []).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="input-group"><label className="input-label">Kwaliteit</label>
                        <select className="apple-input" value={general.setupQuality} onChange={e => setGeneral({...general, setupQuality: e.target.value})}>
                            {(config.quality || []).map(q => <option key={q} value={q}>{q}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div style={{ background: 'white', padding: 20, borderRadius: 16, border: '1px solid #E5E5EA' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                    <div className="label-xs" style={{color:'#FF3B30'}}>PLAN CONFIDENCE</div>
                    <div style={{ fontSize:12, fontWeight:800 }}>{Math.round((general.checkedRules.length / (config.rules?.length || 1)) * 100)}%</div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap: 6, maxHeight: 100, overflowY:'auto' }}>
                    {(config.rules || []).map((rule, idx) => (
                        <label key={idx} style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, cursor:'pointer' }}>
                            <input type="checkbox" checked={general.checkedRules.includes(rule)} onChange={() => toggleRule(rule)} /> {rule}
                        </label>
                    ))}
                </div>
            </div>
        </div>

        {/* --- BLOK 2: ENTRY PARAMETERS --- */}
        <div className="label-xs" style={{marginBottom:10}}>EXECUTION PARAMETERS</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 15, marginBottom: 25 }}>
            <div className="input-group" style={{marginBottom:0}}><label className="input-label">Entry Price</label><input className="apple-input" type="number" step="any" value={entry.price} onChange={e => setEntry({...entry, price: e.target.value})} required /></div>
            <div className="input-group" style={{marginBottom:0}}><label className="input-label">Stoploss</label><input className="apple-input" type="number" step="any" value={entry.sl} onChange={e => setEntry({...entry, sl: e.target.value})} required /></div>
            <div className="input-group" style={{marginBottom:0}}><label className="input-label">Risk (€)</label><input className="apple-input" type="number" value={entry.risk} onChange={e => setEntry({...entry, risk: e.target.value})} required /></div>
            <div className="input-group" style={{marginBottom:0}}><label className="input-label">Total Lots</label><input className="apple-input" type="number" step="any" value={entry.totalLots} onChange={e => setEntry({...entry, totalLots: e.target.value})} required /></div>
        </div>

        {/* --- BLOK 3: ARCHITECTUUR (EXITS) --- */}
        <div style={{ marginBottom: 25 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <label className="input-label" style={{margin:0}}>Architecture (Take Profit Levels)</label>
                <button type="button" onClick={distributeLots} style={{ fontSize:10, color:'#007AFF', background:'none', border:'none', cursor:'pointer', fontWeight:700 }}>AUTO-VERDEEL LOTS</button>
            </div>
            {exits.map((exit, index) => (
                <div key={exit.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, marginBottom: 8 }}>
                    <input className="apple-input" placeholder="TP Prijs" type="number" step="any" value={exit.price} onChange={(e) => { const n = [...exits]; n[index].price = e.target.value; setExits(n); }} />
                    <input className="apple-input" placeholder="Lots" type="number" step="any" value={exit.lots} onChange={(e) => { const n = [...exits]; n[index].lots = e.target.value; setExits(n); }} />
                    <input className="apple-input" placeholder="Note (TP1)" value={exit.note} onChange={(e) => { const n = [...exits]; n[index].note = e.target.value; setExits(n); }} />
                    <button type="button" onClick={() => removeExit(exit.id)} style={{ border:'none', background:'none', color:'#FF3B30' }}><Trash size={18} /></button>
                </div>
            ))}
            <button type="button" onClick={addExit} style={{ fontSize: 12, color: '#007AFF', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>+ ADD TARGET LEVEL</button>
        </div>

        {/* --- BLOK 4: PROJECTED RESULT --- */}
        <div className="bento-card" style={{ background: '#1D1D1F', color: 'white', padding: 20, marginBottom: 20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                    <div style={{ fontSize: 10, color: '#86868B', fontWeight: 800 }}>EXPECTED OUTCOME</div>
                    <div style={{ fontSize: 14 }}>Plan R:R: <span style={{fontWeight:800}}>{stats.rrr.toFixed(2)}R</span></div>
                </div>
                <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: stats.calculatedPnl >= 0 ? '#30D158' : '#FF453A' }}>€{Math.round(stats.calculatedPnl)}</div>
                    <div style={{ fontSize: 10, color: isVolError ? '#FF453A' : '#86868B' }}>Allocatie: {stats.closedVol} / {entry.totalLots || 0} Lots</div>
                </div>
            </div>
        </div>

        <button type="submit" className="btn-primary" style={{ width: '100%', height: 50, background: '#007AFF', fontWeight: 700 }}>OPEN POSITION & LOG PLAN</button>
      </form>
    </div>
  );
}