import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { Trash, Link as LinkIcon, X, Wallet, ToggleLeft, ToggleRight, ArrowUpRight, ArrowDownRight, CheckSquare, Smiley, SmileySad, SmileyMeh, SmileyNervous, Warning } from '@phosphor-icons/react';
import AdvancedJournalForm from './AdvancedJournalForm';

// --- DEFAULTS ---
const DEFAULT_CONFIG = {
    strategies: ["Breakout", "Pullback", "Reversal", "Trend Following", "Scalp", "News Trade"],
    rules: ["Max 1% Risico", "Wachten op Candle Close", "Geen impulsieve entry", "Stoploss geplaatst", "Setup in lijn met plan"],
    mistakes: ["None (Perfect Execution)", "FOMO Entry", "Revenge Trading", "Too Big Size", "Moved Stoploss", "Closed Too Early", "Chasing Price"],
    quality: ["A+ (Perfect)", "A (Good)", "B (Average)", "C (Forced/Bad)"]
};

const EMOTIONS = [
    { label: 'Neutral', icon: <SmileyMeh size={20}/>, color: '#86868B' },
    { label: 'Confident', icon: <Smiley size={20}/>, color: '#30D158' },
    { label: 'Fear/Anxious', icon: <SmileyNervous size={20}/>, color: '#FF9F0A' },
    { label: 'Greed/Tilt', icon: <SmileySad size={20}/>, color: '#FF3B30' },
];

export default function TradeLab() {
  const [trades, setTrades] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [config, setConfig] = useState(DEFAULT_CONFIG);

  const [isProMode, setIsProMode] = useState(false);
  const [closingTrade, setClosingTrade] = useState(null); 
  const [editingTrade, setEditingTrade] = useState(null);
  const [closePnl, setClosePnl] = useState('');

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    accountId: '', pair: '', direction: 'LONG', 
    strategy: '', setupQuality: '', mistake: '', // Start als string (dropdown)
    risk: '', screenshot: '', checkedRules: [] 
  });

  // 1. DATA OPHALEN
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    
    const qTrades = query(collection(db, "users", user.uid, "trades"), orderBy("date", "desc"));
    const unsubTrades = onSnapshot(qTrades, (snap) => setTrades(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    const qAccounts = query(collection(db, "users", user.uid, "accounts"));
    const unsubAccounts = onSnapshot(qAccounts, (snap) => {
      const allAccounts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAccounts(allAccounts.filter(acc => acc.status === 'Active')); 
    });
    
    const fetchSettings = async () => {
        try {
            const docRef = doc(db, "users", user.uid, "settings", "tradelab");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setConfig(data); 
                setForm(prev => ({
                    ...prev,
                    strategy: data.strategies?.[0] || '',
                    setupQuality: data.quality?.[0] || '',
                    mistake: data.mistakes?.[0] || ''
                }));
            } else {
                setForm(prev => ({
                    ...prev,
                    strategy: DEFAULT_CONFIG.strategies[0],
                    setupQuality: DEFAULT_CONFIG.quality[0],
                    mistake: DEFAULT_CONFIG.mistakes[0]
                }));
            }
        } catch (e) { console.log("Geen settings gevonden"); }
    };
    fetchSettings();

    return () => { unsubTrades(); unsubAccounts(); };
  }, []);

  const toggleRule = (rule) => {
    setForm(prev => {
      const currentRules = prev.checkedRules || [];
      const newRules = currentRules.includes(rule) ? currentRules.filter(r => r !== rule) : [...currentRules, rule];
      return { ...prev, checkedRules: newRules };
    });
  };

  // 2. HELPER VOOR EDIT MODAL (MULTI SELECT MISTAKES)
  const toggleEditMistake = (mistakeTag) => {
      if (!editingTrade) return;
      
      // Zorg dat we altijd met een array werken (backward compatibility)
      let currentMistakes = [];
      if (Array.isArray(editingTrade.mistake)) {
          currentMistakes = editingTrade.mistake;
      } else if (typeof editingTrade.mistake === 'string' && editingTrade.mistake) {
          currentMistakes = [editingTrade.mistake];
      }

      // Toggle logica
      if (currentMistakes.includes(mistakeTag)) {
          currentMistakes = currentMistakes.filter(m => m !== mistakeTag);
      } else {
          currentMistakes = [...currentMistakes, mistakeTag];
      }

      setEditingTrade({ ...editingTrade, mistake: currentMistakes });
  };

  // 3. TRADE OPENEN (SIMPLE)
  const handleSimpleOpen = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user || !form.accountId || !form.pair) return;

    const selectedAcc = accounts.find(a => a.id === form.accountId);
    const accountName = selectedAcc ? `${selectedAcc.firm} (${selectedAcc.type})` : 'Unknown';
    const disciplineScore = Math.round(((form.checkedRules || []).length / (config.rules?.length || 1)) * 100);

    // We slaan de mistake op als Array, ook al komt het uit een single dropdown
    // Dit zorgt voor consistentie met de Edit Modal
    const initialMistakes = form.mistake ? [form.mistake] : [];

    await addDoc(collection(db, "users", user.uid, "trades"), {
      ...form,
      mistake: initialMistakes, // Opslaan als array
      checkedRules: form.checkedRules || [],
      accountName,
      risk: Number(form.risk),
      disciplineScore,
      status: 'OPEN',
      pnl: 0, rMultiple: 0, isAdvanced: false,
      emotion: 'Neutral', notes: '',
      createdAt: new Date()
    });
    setForm(prev => ({ ...prev, pair: '', risk: '', screenshot: '', checkedRules: [] }));
  };

  // 4. TRADE OPENEN (PRO)
  const handleAdvancedSubmit = async (proData) => {
    const user = auth.currentUser;
    if (!user) return;
    
    // Zorg ook hier dat mistake een array is
    const mistakeArray = Array.isArray(proData.mistake) ? proData.mistake : (proData.mistake ? [proData.mistake] : []);

    await addDoc(collection(db, "users", user.uid, "trades"), {
      ...proData,
      mistake: mistakeArray,
      setupQuality: config.quality?.[0] || 'A', 
      emotion: 'Neutral', notes: '',
      createdAt: new Date()
    });
  };

  // 5. UPDATE & CLOSE
  const handleCloseTrade = async (e) => {
    e.preventDefault();
    if (!closingTrade) return;
    const pnl = Number(closePnl);
    const risk = closingTrade.risk || 1;
    await updateDoc(doc(db, "users", auth.currentUser.uid, "trades", closingTrade.id), {
        status: 'CLOSED', pnl: pnl, rMultiple: Math.round((pnl / risk) * 100) / 100
    });
    setClosingTrade(null); setClosePnl('');
  };

  const handleUpdateTrade = async (e) => {
    e.preventDefault();
    if (!editingTrade) return;
    const risk = Number(editingTrade.risk) || 1;
    const pnl = Number(editingTrade.pnl);
    
    await updateDoc(doc(db, "users", auth.currentUser.uid, "trades", editingTrade.id), {
        ...editingTrade, 
        risk, pnl, 
        rMultiple: Math.round((pnl / risk) * 100) / 100
    });
    setEditingTrade(null);
  };

  const handleDelete = async (id, e) => { e.stopPropagation(); if (confirm('Trade verwijderen?')) await deleteDoc(doc(db, "users", auth.currentUser.uid, "trades", id)); };

  return (
    <div style={{ padding: '40px 20px', maxWidth: 1200, margin: '0 auto' }}>
      
      {/* HEADER */}
      <div style={{ marginBottom: 30, display:'flex', justifyContent:'space-between', alignItems:'end' }}>
        <div><h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>Trade Lab</h1><p style={{ color: 'var(--text-muted)' }}>Operations Center</p></div>
        <div onClick={() => setIsProMode(!isProMode)} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', background: isProMode ? '#F0F8FF' : 'transparent', padding:'5px 10px', borderRadius:8 }}>
            <span style={{ fontSize:12, fontWeight:700, color: isProMode ? '#007AFF' : '#86868B' }}>{isProMode ? 'PRO MODE' : 'SIMPLE MODE'}</span>
            {isProMode ? <ToggleRight size={32} weight="fill" color="#007AFF" /> : <ToggleLeft size={32} color="#86868B" />}
        </div>
      </div>

      {/* INPUT PANEL */}
      <div style={{ marginBottom: 40 }}>
          {isProMode ? (
              <AdvancedJournalForm onSubmit={handleAdvancedSubmit} onCancel={() => setIsProMode(false)} />
          ) : (
              <div className="bento-card" style={{ borderTop: '4px solid #007AFF', padding: 25 }}>
                <form onSubmit={handleSimpleOpen}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 30 }}>
                        {/* LINKER KOLOM */}
                        <div>
                            <div className="label-xs" style={{ marginBottom: 15, color: '#007AFF' }}>TRADE SETUP</div>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:15, marginBottom:15 }}>
                                <div className="input-group" style={{marginBottom:0}}><label className="input-label">Datum</label><input type="date" className="apple-input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required /></div>
                                <div className="input-group" style={{marginBottom:0}}><label className="input-label">Account</label><select className="apple-input" value={form.accountId} onChange={e => setForm({...form, accountId: e.target.value})} required><option value="">Kies...</option>{accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.firm}</option>)}</select></div>
                            </div>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:15, marginBottom:15 }}>
                                <div className="input-group" style={{marginBottom:0}}><label className="input-label">Ticker</label><input className="apple-input" placeholder="EURUSD" value={form.pair} onChange={e => setForm({...form, pair: e.target.value})} required /></div>
                                <div className="input-group" style={{marginBottom:0}}><label className="input-label">Richting</label><div style={{ display:'flex', height: 42, background:'#E5E5EA', borderRadius:8, padding: 2 }}><button type="button" onClick={() => setForm({...form, direction: 'LONG'})} style={{ flex:1, border:'none', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer', background: form.direction === 'LONG' ? 'white' : 'transparent', color: form.direction === 'LONG' ? '#30D158' : '#86868B' }}>LONG</button><button type="button" onClick={() => setForm({...form, direction: 'SHORT'})} style={{ flex:1, border:'none', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer', background: form.direction === 'SHORT' ? 'white' : 'transparent', color: form.direction === 'SHORT' ? '#FF3B30' : '#86868B' }}>SHORT</button></div></div>
                                <div className="input-group" style={{marginBottom:0}}><label className="input-label">Risk (€)</label><input type="number" className="apple-input" placeholder="100" value={form.risk} onChange={e => setForm({...form, risk: e.target.value})} required /></div>
                            </div>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:15, marginBottom:15 }}>
                                <div className="input-group" style={{marginBottom:0}}>
                                    <label className="input-label">Setup Quality</label>
                                    <select className="apple-input" value={form.setupQuality} onChange={e => setForm({...form, setupQuality: e.target.value})}>{(config.quality || []).map(q => <option key={q} value={q}>{q}</option>)}</select>
                                </div>
                                <div className="input-group" style={{marginBottom:0}}>
                                    <label className="input-label">Initial Mistake</label>
                                    <select className="apple-input" value={form.mistake} onChange={e => setForm({...form, mistake: e.target.value})}>{(config.mistakes || []).map(m => <option key={m} value={m}>{m}</option>)}</select>
                                </div>
                            </div>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:15 }}>
                                 <div className="input-group" style={{marginBottom:0}}><label className="input-label">Strategie</label><select className="apple-input" value={form.strategy} onChange={e => setForm({...form, strategy: e.target.value})}>{(config.strategies || []).map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                                 <div className="input-group" style={{marginBottom:0}}><label className="input-label">Screenshot</label><input className="apple-input" placeholder="URL" value={form.screenshot} onChange={e => setForm({...form, screenshot: e.target.value})} /></div>
                            </div>
                        </div>
                        {/* RECHTER KOLOM */}
                        <div style={{ background: '#F9F9F9', borderRadius: 12, padding: 20, display:'flex', flexDirection:'column' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:15 }}>
                                <div className="label-xs" style={{ marginBottom:0, color:'#FF3B30' }}>CHECK JE REGELS</div>
                                <div style={{ fontSize:12, fontWeight:700, color: '#1D1D1F' }}>Score: {Math.round(((form.checkedRules || []).length / (config.rules || []).length) * 100)}%</div>
                            </div>
                            <div style={{ display:'flex', flexDirection:'column', gap: 10, flex:1 }}>
                                {(config.rules || []).map((rule, idx) => {
                                    const isChecked = (form.checkedRules || []).includes(rule);
                                    return (
                                        <label key={idx} style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, cursor:'pointer' }}>
                                            <div style={{ width:16, height:16, borderRadius:4, border:'1px solid #C7C7CC', background: isChecked ? '#007AFF' : 'white', display:'flex', alignItems:'center', justifyContent:'center', color:'white' }}>{isChecked && <CheckSquare weight="fill" size={14} />}</div>
                                            <input type="checkbox" checked={isChecked} onChange={() => toggleRule(rule)} style={{ display:'none' }} />{rule}
                                        </label>
                                    );
                                })}
                            </div>
                            <button type="submit" className="btn-primary" style={{ width:'100%', marginTop: 20 }}>EXECUTE TRADE</button>
                        </div>
                    </div>
                </form>
              </div>
          )}
      </div>

      {/* LOGBOEK (TABEL) */}
      <div className="bento-card" style={{ padding: 0, overflow: 'hidden', minHeight: 400 }}>
         <div className="table-container">
            <table className="apple-table">
                <thead><tr><th style={{width:90}}>Datum</th><th>Info</th><th>Quality</th><th>Status</th><th>Result</th><th></th></tr></thead>
                <tbody>
                    {trades.map(trade => {
                        // Display Mistakes (Array handling)
                        let mistakeDisplay = trade.mistake;
                        if(Array.isArray(trade.mistake)) mistakeDisplay = trade.mistake.filter(m => !m.includes('None')).join(", ");
                        else if(trade.mistake && trade.mistake.includes('None')) mistakeDisplay = '';

                        return (
                            <tr key={trade.id} onClick={() => setEditingTrade(trade)} className="hover-row" style={{ cursor:'pointer', opacity: trade.status==='CLOSED'?0.9:1 }}>
                                <td style={{ fontSize:12, color:'var(--text-muted)' }}>{new Date(trade.date).toLocaleDateString()}</td>
                                <td>
                                    <div style={{ fontWeight:600 }}>{trade.pair} <span style={{fontSize:10, color: trade.direction==='LONG'?'#30D158':'#FF3B30'}}>{trade.direction}</span></div>
                                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>{trade.strategy}</div>
                                </td>
                                <td>
                                    <div style={{ fontSize:11, fontWeight:600, color:'#1D1D1F' }}>{trade.setupQuality}</div>
                                    {mistakeDisplay && <div style={{ fontSize:10, color:'#FF3B30', maxWidth:150, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>⚠️ {mistakeDisplay}</div>}
                                </td>
                                <td>{trade.status==='OPEN' ? <span className="badge badge-open">OPEN</span> : <span style={{ fontSize:11, color:'var(--text-muted)' }}>CLOSED</span>}</td>
                                <td>{trade.status==='OPEN' ? <button onClick={(e)=>{e.stopPropagation();setClosingTrade(trade)}} style={{ background:'#007AFF', color:'white', border:'none', borderRadius:6, padding:'4px 8px', fontSize:11 }}>SLUIT</button> : <div style={{ fontWeight:700, color: trade.pnl>=0?'#30D158':'#FF3B30' }}>{trade.pnl>0?'+':''}€{trade.pnl}</div>}</td>
                                <td><button onClick={(e)=>handleDelete(trade.id, e)} style={{ border:'none', background:'none', color:'#ccc' }}><Trash size={16}/></button></td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
         </div>
      </div>

      {/* MODAL 1: SNEL SLUITEN */}
      {closingTrade && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', backdropFilter:'blur(2px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
            <div className="bento-card" style={{ width: 320, padding: 30 }}>
                <div style={{ textAlign:'center', marginBottom:20 }}><h3>{closingTrade.pair}</h3><p style={{color:'gray'}}>Risk: €{closingTrade.risk}</p></div>
                <form onSubmit={handleCloseTrade}>
                    <div className="input-group"><label className="input-label">P&L (€)</label><input className="apple-input" type="number" autoFocus value={closePnl} onChange={e => setClosePnl(e.target.value)} required /></div>
                    <button type="submit" className="btn-primary" style={{ width:'100%', marginTop:20 }}>Bevestig</button>
                </form>
            </div>
        </div>
      )}

      {/* MODAL 2: EDIT TRADE (EVALUATIE) */}
      {editingTrade && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1100 }}>
            <div className="bento-card" style={{ width: '100%', maxWidth: 700, padding: 30, maxHeight:'90vh', overflowY:'auto' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}><h3>Edit Trade & Evaluatie</h3><button onClick={() => setEditingTrade(null)} style={{ border:'none', background:'none' }}><X size={24}/></button></div>
                <form onSubmit={handleUpdateTrade}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                        {/* LINKER KOLOM: DATA */}
                        <div>
                            <div className="label-xs" style={{color:'#007AFF'}}>HARDE DATA</div>
                            <div className="input-group"><label className="input-label">P&L (€)</label><input className="apple-input" type="number" value={editingTrade.pnl} onChange={e => setEditingTrade({...editingTrade, pnl: e.target.value})} /></div>
                            
                            <div className="input-group"><label className="input-label">Setup Quality</label><select className="apple-input" value={editingTrade.setupQuality} onChange={e => setEditingTrade({...editingTrade, setupQuality: e.target.value})}>{(config.quality||[]).map(q=><option key={q} value={q}>{q}</option>)}</select></div>
                            
                            {/* --- MULTI-SELECT MISTAKES (HET NIEUWE ONDERDEEL) --- */}
                            <div className="input-group">
                                <label className="input-label">Fouten / Evaluatie (Meerdere mogelijk)</label>
                                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                                    {(config.mistakes || []).map(m => {
                                        // Check of mistake in de lijst zit (support string en array)
                                        const currentMistakes = Array.isArray(editingTrade.mistake) ? editingTrade.mistake : (editingTrade.mistake ? [editingTrade.mistake] : []);
                                        const isSelected = currentMistakes.includes(m);
                                        
                                        return (
                                            <button 
                                                key={m} 
                                                type="button" 
                                                onClick={() => toggleEditMistake(m)}
                                                style={{ 
                                                    border: isSelected ? '1px solid #FF3B30' : '1px solid #E5E5EA',
                                                    background: isSelected ? 'rgba(255, 59, 48, 0.1)' : 'white',
                                                    color: isSelected ? '#FF3B30' : '#1D1D1F',
                                                    padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {m}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* RECHTER KOLOM: PSYCHOLOGIE */}
                        <div>
                            <div className="label-xs" style={{color:'#FF9F0A'}}>PSYCHOLOGY</div>
                            <div className="input-group"><label className="input-label">Emotion</label><div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>{EMOTIONS.map(em=><div key={em.label} onClick={()=>setEditingTrade({...editingTrade, emotion:em.label})} style={{border:editingTrade.emotion===em.label?`2px solid ${em.color}`:'1px solid #E5E5EA', padding:6, borderRadius:6, cursor:'pointer', fontSize:11}}>{em.label}</div>)}</div></div>
                            <div className="input-group"><label className="input-label">Notes</label><textarea className="apple-input" rows={4} value={editingTrade.notes} onChange={e => setEditingTrade({...editingTrade, notes: e.target.value})} /></div>
                        </div>
                    </div>
                    <div style={{ marginTop:20, textAlign:'right' }}><button type="submit" className="btn-primary">Opslaan</button></div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}