import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, onSnapshot, doc, getDoc } from 'firebase/firestore'; 
import { Calculator, X, Trash, PlusCircle, CheckSquare, CaretDown, Gear, Scales } from '@phosphor-icons/react';

const DEFAULT_CONFIG = {
    strategies: ["Breakout", "Pullback", "Reversal"],
    quality: ["A+ (Perfect)", "A (Good)", "B (Average)", "C (Bad)"],
    rules: ["Max 1% Risk", "Wait for Candle Close", "No Impulsive Entry", "Stoploss Placed"]
};

export default function AdvancedJournalForm({ onSubmit, onCancel }) {
  const [accounts, setAccounts] = useState([]);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [showRules, setShowRules] = useState(false);
  const [showPriceArch, setShowPriceArch] = useState(true); // Inklapbaar zoals bij Lightning
  
  const [general, setGeneral] = useState({
    date: new Date().toISOString().split('T')[0],
    accountId: '',
    pair: '',
    direction: 'LONG',
    strategy: '',
    setupQuality: '',
    isAligned: false,
    checkedRules: []
  });

  const [entry, setEntry] = useState({ 
    price: '', sl: '', tp: '', risk: '', totalLots: '' // tp toegevoegd voor blueprint
  });

  const [exits, setExits] = useState([
    { id: 1, price: '', lots: '', note: 'Exit 1' } 
  ]);

  const [stats, setStats] = useState({ closedVol: 0, calculatedPnl: 0, rrr: 0 });

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const unsub = onSnapshot(query(collection(db, "users", user.uid, "accounts")), (snap) => {
      setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(acc => acc.status === 'Active'));
    });

    getDoc(doc(db, "users", user.uid, "settings", "tradelab")).then(docSnap => {
        if (docSnap.exists()) setConfig(docSnap.data());
    });

    return () => unsub();
  }, []);

  const handleAlignedToggle = (checked) => {
    setGeneral(prev => ({
        ...prev,
        isAligned: checked,
        checkedRules: checked ? (config.rules || []) : [],
    }));
    if (checked) setShowRules(true);
  };

  useEffect(() => {
    if (entry.price && entry.sl) {
        const ePrice = Number(entry.price);
        const sPrice = Number(entry.sl);
        if (ePrice > sPrice) setGeneral(prev => ({ ...prev, direction: 'LONG' }));
        else if (ePrice < sPrice) setGeneral(prev => ({ ...prev, direction: 'SHORT' }));
    }
  }, [entry.price, entry.sl]);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    const selectedAcc = accounts.find(a => a.id === general.accountId);
    const totalRules = config.rules?.length || 1;
    const score = Math.round((general.checkedRules.length / totalRules) * 100);
    
    onSubmit({
      ...general,
      accountName: selectedAcc?.firm || 'Unknown',
      accountCurrency: selectedAcc?.accountCurrency || 'USD',
      // Mapping naar uniforme blueprint velden
      entryPrice: Number(entry.price),
      slPrice: Number(entry.sl),
      tpPrice: Number(entry.tp),
      risk: Number(entry.risk), 
      totalLots: Number(entry.totalLots),
      exits, 
      disciplineScore: score,
      pnl: 0, 
      projectedPnl: Math.round(stats.calculatedPnl), 
      projectedRR: Math.round(stats.rrr * 100) / 100,
      isAdvanced: true,
      status: 'OPEN', 
      mistake: [], 
      mae: 0,
      mfe: 0,
      maePrice: Number(entry.price), // Initieel gelijk aan entry
      mfePrice: Number(entry.price), // Initieel gelijk aan entry
      createdAt: new Date()
    });
  };

  const getCurrencySymbol = () => {
    const acc = accounts.find(a => a.id === general.accountId);
    return acc?.accountCurrency === 'EUR' ? '€' : '$';
  };

  return (
    <div className="bento-card" style={{ border: '2px solid #007AFF', background: '#F9FBFF', padding: 25 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }}>
        <div style={{ display:'flex', alignItems:'center', gap: 8, color: '#007AFF', fontWeight: 800, fontSize: 13 }}>
            <Calculator size={20} weight="fill"/> OPERATION PLANNER
        </div>
        <button type="button" onClick={onCancel} style={{ background:'none', border:'none', cursor:'pointer' }}><X size={20} /></button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 25 }}>
            <div className="input-group">
                <label className="input-label">Account & Instrument</label>
                <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:10 }}>
                    <select className="apple-input" value={general.accountId} onChange={e => setGeneral({...general, accountId: e.target.value})} required>
                        <option value="">Select account...</option>
                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.firm} — {acc.accountNumber}</option>)}
                    </select>
                    <input className="apple-input" value={general.pair} onChange={e => setGeneral({...general, pair: e.target.value.toUpperCase()})} placeholder="XAUUSD" required />
                </div>
            </div>
            <div className="input-group">
                <label className="input-label">Strategy & Quality</label>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    <select className="apple-input" value={general.strategy} onChange={e => setGeneral({...general, strategy: e.target.value})}>
                        <option value="">Strategy...</option>
                        {config.strategies.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select className="apple-input" value={general.setupQuality} onChange={e => setGeneral({...general, setupQuality: e.target.value})}>
                        <option value="">Quality...</option>
                        {config.quality.map(q => <option key={q} value={q}>{q}</option>)}
                    </select>
                </div>
            </div>
        </div>

        {/* PRICE ARCHITECTURE - INKLAPBAAR */}
        <div style={{ marginBottom: 25, background: '#FFF', padding: '15px', borderRadius: 16, border: '1px solid #E5E5EA' }}>
            <div onClick={() => setShowPriceArch(!showPriceArch)} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, fontWeight:800, color: '#007AFF' }}>
                    <Scales size={18} weight="bold" /> PRICE ARCHITECTURE
                </div>
                <CaretDown size={16} style={{ transform: showPriceArch ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
            </div>
            
            {showPriceArch && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 15, marginTop: 15 }}>
                    <div className="input-group"><label className="input-label">Entry Price</label><input className="apple-input" type="number" step="any" value={entry.price} onChange={e => setEntry({...entry, price: e.target.value})} required /></div>
                    <div className="input-group"><label className="input-label" style={{color:'#FF3B30'}}>Stoploss</label><input className="apple-input" type="number" step="any" value={entry.sl} onChange={e => setEntry({...entry, sl: e.target.value})} required /></div>
                    <div className="input-group"><label className="input-label" style={{color:'#30D158'}}>Target (TP)</label><input className="apple-input" type="number" step="any" value={entry.tp} onChange={e => setEntry({...entry, tp: e.target.value})} required /></div>
                    <div className="input-group"><label className="input-label">Risk ({getCurrencySymbol()})</label><input className="apple-input" type="number" value={entry.risk} onChange={e => setEntry({...entry, risk: e.target.value})} required /></div>
                </div>
            )}
            {showPriceArch && (
                <div style={{ marginTop: 15, maxWidth: '25%' }}>
                    <div className="input-group"><label className="input-label">Total Lots</label><input className="apple-input" type="number" step="any" value={entry.totalLots} onChange={e => setEntry({...entry, totalLots: e.target.value})} required /></div>
                </div>
            )}
        </div>

        <div className="label-xs" style={{marginBottom:10, opacity:0.6}}>EXIT PLAN</div>
        <div style={{ display: 'grid', gap: 8, marginBottom: 15 }}>
            {exits.map((exit, index) => (
                <div key={exit.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr auto', gap: 10 }}>
                    <input className="apple-input" placeholder="Price" type="number" step="any" value={exit.price} onChange={(e) => { const n = [...exits]; n[index].price = e.target.value; setExits(n); }} />
                    <input className="apple-input" placeholder="Lots" type="number" step="any" value={exit.lots} onChange={(e) => { const n = [...exits]; n[index].lots = e.target.value; setExits(n); }} />
                    <input className="apple-input" placeholder="Note" value={exit.note} onChange={(e) => { const n = [...exits]; n[index].note = e.target.value; setExits(n); }} />
                    <button type="button" onClick={() => setExits(exits.filter(ex => ex.id !== exit.id))} style={{ border:'none', background:'none', color:'#FF3B30' }}><Trash size={18} /></button>
                </div>
            ))}
        </div>
        <button type="button" onClick={() => setExits([...exits, { id: Date.now(), price: '', lots: '', note: `Exit ${exits.length + 1}` }])} style={{ fontSize: 12, color: '#007AFF', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>+ ADD EXIT LEVEL</button>

        {/* COMPLIANCE SECTION */}
        <div style={{ background: '#F2F2F7', padding: 20, borderRadius: 16, marginTop: 25, marginBottom: 20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: showRules ? 15 : 0 }}>
                <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
                    <input type="checkbox" checked={general.isAligned} onChange={e => handleAlignedToggle(e.target.checked)} />
                    <span style={{ fontSize:13, fontWeight:800 }}>ALIGNED WITH PLAN</span>
                </label>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <CaretDown size={20} style={{ cursor:'pointer', transform: showRules ? 'rotate(180deg)' : 'none', transition: '0.2s' }} onClick={() => setShowRules(!showRules)} />
                    <Gear size={20} color="#86868B" style={{ cursor:'pointer' }} onClick={() => window.location.href = '/settings'} />
                </div>
            </div>

            {showRules && (
                <div style={{ display:'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: 'white', padding: 15, borderRadius: 12 }}>
                    {(config.rules || []).map(r => (
                        <label key={r} style={{ fontSize:11, display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
                            <input type="checkbox" checked={general.checkedRules.includes(r)} onChange={() => {
                                const next = general.checkedRules.includes(r) ? general.checkedRules.filter(x => x !== r) : [...general.checkedRules, r];
                                setGeneral({...general, checkedRules: next, isAligned: next.length === (config.rules?.length || 0)});
                            }} /> {r}
                        </label>
                    ))}
                </div>
            )}
        </div>

        {/* OUTCOME PREVIEW */}
        <div style={{ background: '#1D1D1F', color: 'white', padding: 20, borderRadius: 16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
                <div style={{ fontSize: 10, color: '#86868B', fontWeight: 800 }}>EXPECTED OUTCOME</div>
                <div style={{ fontSize: 14 }}>Target R:R: <span style={{fontWeight:800}}>{stats.rrr.toFixed(2)}R</span></div>
            </div>
            <div style={{ textAlign:'right' }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: stats.calculatedPnl >= 0 ? '#34C759' : '#FF453A' }}>
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: getCurrencySymbol() === '€' ? 'EUR' : 'USD', minimumFractionDigits: 0 }).format(stats.calculatedPnl)}
                </div>
                <div style={{ fontSize: 10, color: '#86868B' }}>Lots: {stats.closedVol} / {entry.totalLots || 0}</div>
            </div>
        </div>

        <button type="submit" className="btn-primary" style={{ width: '100%', height: 50, background: '#007AFF', fontWeight: 800, marginTop: 20 }}>LOG POSITION</button>
      </form>
    </div>
  );
}