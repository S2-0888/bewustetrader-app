import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { 
  Trash, X, Wallet, Gear,
  Smiley, SmileySad, SmileyMeh, 
  SmileyNervous, Plus, PlusCircle, Blueprint, ArrowSquareOut, CaretDown, Lightning, Scales, Info
} from '@phosphor-icons/react';
import AdvancedJournalForm from './AdvancedJournalForm';

// --- SUB-COMPONENT FOR TOOLTIPS ---
const FieldInfo = ({ title, text }) => {
    const [visible, setVisible] = useState(false);
    return (
        <div style={{ position: 'relative', display: 'inline-block', marginLeft: '6px' }}>
            <Info 
                size={14} 
                weight="bold" 
                style={{ cursor: 'help', color: '#007AFF', opacity: 0.8 }} 
                onMouseEnter={() => setVisible(true)}
                onMouseLeave={() => setVisible(false)}
            />
            {visible && (
                <div style={{
                    position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                    width: '240px', background: '#1C1C1E', color: 'white', padding: '12px',
                    borderRadius: '12px', fontSize: '11px', zIndex: 100, marginBottom: '8px',
                    boxShadow: '0 15px 35px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <p style={{ margin: 0, fontWeight: 900, color: '#0A84FF', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</p>
                    <p style={{ margin: 0, lineHeight: '1.5', color: '#E5E5EA' }}>{text}</p>
                </div>
            )}
        </div>
    );
};

const DEFAULT_CONFIG = {
    strategies: ["Breakout", "Pullback", "Reversal"],
    mistakes: ["FOMO", "Revenge Trading", "Size Too Large", "Moved Stoploss"],
    rules: ["Max 1% Risk", "Wait for Candle Close", "No Impulsive Entry", "Stoploss Placed"]
};

const EMOTIONS = [
    { label: 'Neutral', icon: <SmileyMeh size={20}/>, color: '#86868B' },
    { label: 'Confident', icon: <Smiley size={20}/>, color: '#30D158' },
    { label: 'Anxious', icon: <SmileyNervous size={20}/>, color: '#FF9F0A' },
    { label: 'Greed/Tilt', icon: <SmileySad size={20}/>, color: '#FF3B30' },
];

export default function TradeLab() {
  const [trades, setTrades] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [isProMode, setIsProMode] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showPriceFields, setShowPriceFields] = useState(false); 
  const [editingTrade, setEditingTrade] = useState(null);
  const [closingTrade, setClosingTrade] = useState(null); 
  const [closePnl, setClosePnl] = useState('');
  const [closeExitPrice, setCloseExitPrice] = useState(''); 
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    accountId: '', pair: '', direction: 'LONG', 
    strategy: '', risk: '', isAligned: false, checkedRules: [], chartUrl: '',
    entryPrice: '', slPrice: '', tpPrice: '', maePrice: '', mfePrice: ''
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    const user = auth.currentUser;
    if (!user) return;

    onSnapshot(query(collection(db, "users", user.uid, "trades"), orderBy("date", "desc")), (snap) => {
      setTrades(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    onSnapshot(query(collection(db, "users", user.uid, "accounts")), (snap) => {
      setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() }))); 
    });

    getDoc(doc(db, "users", user.uid, "settings", "tradelab")).then(docSnap => {
      if (docSnap.exists()) setConfig(docSnap.data());
    });

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const selectedFormAccount = accounts.find(a => a.id === form.accountId);

  const handleAlignedToggle = (checked) => {
    setForm(prev => ({
      ...prev,
      isAligned: checked,
      checkedRules: checked ? (config.rules || []) : []
    }));
    if (checked) setShowRules(true);
  };

  const handleSimpleOpen = async (e) => {
    e.preventDefault();
    if (!selectedFormAccount) return;
    
    const totalRules = config.rules?.length || 1;
    const score = Math.round((form.checkedRules.length / totalRules) * 100);

    await addDoc(collection(db, "users", auth.currentUser.uid, "trades"), {
      ...form, 
      entryPrice: Number(form.entryPrice),
      slPrice: Number(form.slPrice),
      tpPrice: Number(form.tpPrice),
      risk: Number(form.risk),
      mistake: [], status: 'OPEN', pnl: 0, 
      isAdvanced: false, createdAt: new Date(),
      accountName: selectedFormAccount.firm,
      accountCurrency: selectedFormAccount.accountCurrency || 'USD',
      disciplineScore: score
    });
    setForm(prev => ({ ...prev, pair: '', risk: '', isAligned: false, checkedRules: [], entryPrice: '', slPrice: '', tpPrice: '' }));
  };

  const executeCloseTrade = async (e) => {
    e.preventDefault();
    if (!closingTrade) return;

    await updateDoc(doc(db, "users", auth.currentUser.uid, "trades", closingTrade.id), {
        status: 'CLOSED',
        pnl: Number(closePnl),
        exitPrice: Number(closeExitPrice),
        actualExits: [{ price: Number(closeExitPrice) }],
        closedAt: new Date()
    });
    setClosingTrade(null);
    setClosePnl('');
    setCloseExitPrice('');
  };

  const handleUpdateTrade = async (e) => {
    e.preventDefault();
    if (!editingTrade) return;

    const entry = Number(editingTrade.entryPrice || editingTrade.price);
    const sl = Number(editingTrade.slPrice || editingTrade.sl);
    const risk = Number(editingTrade.risk);
    const maeP = Number(editingTrade.maePrice);
    const mfeP = Number(editingTrade.mfePrice);

    const validExits = (editingTrade.actualExits || []).filter(ex => ex.price !== '');
    const avgExitPrice = validExits.length > 0 
        ? validExits.reduce((sum, ex) => sum + Number(ex.price), 0) / validExits.length 
        : Number(editingTrade.exitPrice || entry);

    let maeVal = 0, mfeVal = 0;
    if (entry && sl && risk && maeP && mfeP) {
        const riskDist = Math.abs(entry - sl);
        if (riskDist > 0) {
            const ratio = risk / riskDist;
            maeVal = Math.max(0, (editingTrade.direction === 'LONG' ? entry - maeP : maeP - entry) * ratio);
            mfeVal = Math.max(0, (editingTrade.direction === 'LONG' ? mfeP - entry : entry - mfeP) * ratio);
        }
    }

    await updateDoc(doc(db, "users", auth.currentUser.uid, "trades", editingTrade.id), {
        ...editingTrade, 
        entryPrice: entry,
        slPrice: sl,
        exitPrice: avgExitPrice,
        mae: maeVal, 
        mfe: mfeVal
    });
    setEditingTrade(null);
  };

  return (
    <div style={{ padding: isMobile ? '20px 15px' : '40px 20px', maxWidth: 1200, margin: '0 auto', paddingBottom: 100 }}>
      
      {/* HEADER */}
      <div style={{ marginBottom: 30, display:'flex', justifyContent:'space-between', alignItems:'end' }}>
        <div><h1 style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 800, margin: 0 }}>Trade Lab</h1><p style={{ color: '#86868B', fontSize: 14 }}>Operations & Review</p></div>
        <div onClick={() => setIsProMode(!isProMode)} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', background: isProMode ? '#F0F8FF' : '#F2F2F7', padding:'6px 12px', borderRadius:12 }}>
            {isProMode ? <Blueprint size={18} color="#007AFF" /> : <Lightning size={18} color="#86868B" />}
            <span style={{ fontSize:10, fontWeight:800, color: isProMode ? '#007AFF' : '#86868B' }}>{isProMode ? 'ADVANCED' : 'LIGHTNING'}</span>
        </div>
      </div>

      {/* LIGHTNING INPUT PANEL */}
      {!isProMode && (
        <div className="bento-card" style={{ borderTop: '4px solid #007AFF', padding: 25 }}>
          <form onSubmit={handleSimpleOpen}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: 30 }}>
                  <div>
                      <div className="label-xs" style={{ marginBottom: 15, color: '#007AFF' }}>QUICK LOG</div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:15, marginBottom:15 }}>
                          <input className="apple-input" placeholder="Ticker" value={form.pair} onChange={e => setForm({...form, pair: e.target.value.toUpperCase()})} required />
                          <select className="apple-input" value={form.accountId} onChange={e => setForm({...form, accountId: e.target.value})} required>
                              <option value="">Account...</option>
                              {accounts.filter(a => a.status === 'Active').map(acc => (<option key={acc.id} value={acc.id}>{acc.firm} — {acc.accountNumber}</option>))}
                          </select>
                      </div>
                      
                      <div style={{ marginBottom: 15, background: '#F5F5F7', padding: '12px', borderRadius: 12 }}>
                        <div onClick={() => setShowPriceFields(!showPriceFields)} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, fontWeight:700 }}>
                                <Scales size={18} color="#007AFF" /> PRICE ARCHITECTURE
                            </div>
                            <CaretDown size={16} style={{ transform: showPriceFields ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                        </div>
                        
                        {showPriceFields && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 15 }}>
                                <div className="input-group"><label className="input-label" style={{fontSize:9}}>ENTRY</label><input type="number" step="any" className="apple-input" value={form.entryPrice} onChange={e => setForm({...form, entryPrice: e.target.value})} /></div>
                                <div className="input-group"><label className="input-label" style={{fontSize:9, color:'#FF3B30'}}>STOP LOSS</label><input type="number" step="any" className="apple-input" value={form.slPrice} onChange={e => setForm({...form, slPrice: e.target.value})} /></div>
                                <div className="input-group"><label className="input-label" style={{fontSize:9, color:'#30D158'}}>TARGET (TP)</label><input type="number" step="any" className="apple-input" value={form.tpPrice} onChange={e => setForm({...form, tpPrice: e.target.value})} /></div>
                            </div>
                        )}
                      </div>

                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:15 }}>
                          <input type="number" step="any" placeholder="Risk Amount ($)" className="apple-input" value={form.risk} onChange={e => setForm({...form, risk: e.target.value})} required />
                          <div style={{ display:'flex', height: 42, background:'#E5E5EA', borderRadius:8, padding: 2 }}>
                                <button type="button" onClick={() => setForm({...form, direction: 'LONG'})} style={{ flex:1, border:'none', borderRadius:6, fontSize:10, fontWeight:800, background: form.direction === 'LONG' ? 'white' : 'transparent', color: form.direction === 'LONG' ? '#30D158' : '#86868B' }}>LONG</button>
                                <button type="button" onClick={() => setForm({...form, direction: 'SHORT'})} style={{ flex:1, border:'none', borderRadius:6, fontSize:10, fontWeight:800, background: form.direction === 'SHORT' ? 'white' : 'transparent', color: form.direction === 'SHORT' ? '#FF3B30' : '#86868B' }}>SHORT</button>
                          </div>
                      </div>
                  </div>
                  <div style={{ background: '#F9F9F9', borderRadius: 16, padding: 20 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 10 }}>
                          <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontSize:13, fontWeight:700 }}>
                            <input type="checkbox" checked={form.isAligned} onChange={e => handleAlignedToggle(e.target.checked)} />
                            Aligned with Plan?
                          </label>
                          <div style={{ display: 'flex', gap: 10, alignItems:'center' }}>
                            <CaretDown size={18} style={{ cursor:'pointer', transform: showRules ? 'rotate(180deg)' : 'none', transition: '0.2s' }} onClick={() => setShowRules(!showRules)} />
                          </div>
                      </div>
                      {showRules && (
                          <div style={{ display:'grid', gap:8, marginBottom: 15, background: 'white', padding: 10, borderRadius: 10 }}>
                              {(config.rules || []).map(r => (
                                  <label key={r} style={{ fontSize:11, display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
                                      <input type="checkbox" checked={form.checkedRules.includes(r)} onChange={() => {
                                          const next = form.checkedRules.includes(r) ? form.checkedRules.filter(x => x !== r) : [...form.checkedRules, r];
                                          setForm({...form, checkedRules: next, isAligned: next.length === (config.rules?.length || 0)});
                                      }} /> {r}
                                  </label>
                              ))}
                          </div>
                      )}
                      <button type="submit" className="btn-primary" style={{ width:'100%', height: 44, marginTop: 10 }}>OPEN POSITION</button>
                  </div>
              </div>
          </form>
        </div>
      )}

      {isProMode && <AdvancedJournalForm onSubmit={(data) => { addDoc(collection(db, "users", auth.currentUser.uid, "trades"), data); setIsProMode(false); }} onCancel={() => setIsProMode(false)} />}

      {/* TABLE */}
      <div className="bento-card" style={{ padding: 0, overflow: 'hidden', marginTop: 30 }}>
            <table className="apple-table">
                <thead><tr><th>Ticker</th><th>Account</th><th>Status</th><th>Result</th><th></th></tr></thead>
                <tbody>
                    {trades.map(trade => (
                        <tr key={trade.id} onClick={() => setEditingTrade({ ...trade, actualExits: trade.actualExits || (trade.exitPrice ? [{price: trade.exitPrice}] : [{ price: '' }]) })} className="hover-row" style={{ cursor:'pointer' }}>
                            <td style={{ fontWeight:700 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {trade.isAdvanced ? <Blueprint size={16} color="#007AFF" weight="fill" /> : <Lightning size={16} color="#FF9F0A" weight="fill" />}
                                {trade.pair} <span style={{fontSize:9, color: trade.direction==='LONG'?'#30D158':'#FF3B30'}}>{trade.direction}</span>
                              </div>
                            </td>
                            <td>
                                <div style={{ fontWeight: 700 }}>{trade.accountName}</div>
                                <div style={{ fontSize: 10, color: '#86868B' }}>ID: {accounts.find(a => a.id === trade.accountId)?.accountNumber || '---'}</div>
                            </td>
                            <td>{trade.status === 'OPEN' ? <span className="badge-blue" style={{ background:'#E5F1FF', color:'#007AFF', padding:'3px 8px', borderRadius:6, fontSize:10, fontWeight:800 }}>OPEN</span> : <span style={{color:'#86868B', fontSize:11}}>CLOSED</span>}</td>
                            <td style={{ fontWeight:800, color: (trade.pnl || 0) >= 0 ? '#30D158' : '#FF3B30' }}>
                                {trade.status === 'OPEN' ? (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setClosingTrade(trade); }}
                                      style={{ background:'#007AFF', color:'white', border:'none', borderRadius:6, padding:'4px 12px', fontSize:10, fontWeight:800, cursor:'pointer' }}
                                    >CLOSE</button>
                                ) : (
                                    `${trade.accountCurrency === 'EUR' ? '€' : '$'}${trade.pnl || 0}`
                                )}
                            </td>
                            <td><button onClick={(e) => {e.stopPropagation(); if(confirm('Delete trade?')) deleteDoc(doc(db, "users", auth.currentUser.uid, "trades", trade.id))}} style={{border:'none', background:'none', color:'#ccc'}}><Trash size={16}/></button></td>
                        </tr>
                    ))}
                </tbody>
            </table>
      </div>

      {/* CLOSE POSITION MODAL */}
      {closingTrade && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(5px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1200 }}>
            <div className="bento-card" style={{ width: 340, padding: 30 }}>
                <div style={{ textAlign:'center', marginBottom:20 }}>
                    <div style={{ fontSize:32, marginBottom:10 }}>🎯</div>
                    <h3 style={{ margin:0, fontWeight:900 }}>Close Position</h3>
                    <p style={{ color:'#86868B', fontSize:13 }}>Result for {closingTrade.pair}</p>
                </div>
                <form onSubmit={executeCloseTrade}>
                    <div className="input-group">
                        <label className="input-label">Net P&L ({closingTrade.accountCurrency === 'EUR' ? '€' : '$'})</label>
                        <input className="apple-input" type="number" step="any" autoFocus value={closePnl} onChange={e => setClosePnl(e.target.value)} placeholder="0.00" required />
                    </div>
                    <div className="input-group" style={{marginTop:15}}>
                        <label className="input-label">Actual Exit Price</label>
                        <input className="apple-input" type="number" step="any" value={closeExitPrice} onChange={e => setCloseExitPrice(e.target.value)} placeholder="Ticker price at exit" required />
                    </div>
                    <button type="submit" className="btn-primary" style={{ width:'100%', marginTop:25, height: 48 }}>Confirm Result</button>
                    <button type="button" onClick={() => setClosingTrade(null)} style={{ border:'none', background:'none', width:'100%', marginTop:15, color:'#86868B', fontSize:12 }}>Cancel</button>
                </form>
            </div>
        </div>
      )}

      {/* REVIEW MODAL */}
      {editingTrade && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1100, padding: 20 }}>
            <div className="bento-card" style={{ width: '100%', maxWidth: 850, padding: 30, maxHeight:'90vh', overflowY:'auto' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:25 }}>
                    <div><h3 style={{ fontWeight: 900, margin:0 }}>Review: {editingTrade.pair}</h3><span style={{ fontSize:10, color:'#86868B' }}>Method: {editingTrade.isAdvanced ? 'Advanced Planner' : 'Lightning Entry'}</span></div>
                    <button onClick={() => setEditingTrade(null)} style={{ border:'none', background:'none', cursor:'pointer' }}><X size={24}/></button>
                </div>
                
                <form onSubmit={handleUpdateTrade}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr', gap: 40 }}>
                        <div>
                            <div className="label-xs" style={{color:'#007AFF', marginBottom: 15 }}>PRECISION & EXECUTION</div>
                            <div className="input-group" style={{ marginBottom: 15 }}>
                                <label className="input-label">Trade Date</label>
                                <input type="date" className="apple-input" value={editingTrade.date} onChange={e => setEditingTrade({...editingTrade, date: e.target.value})} />
                            </div>

                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:15 }}>
                                <div className="input-group"><label className="input-label">Entry Price</label><input className="apple-input" type="number" step="any" value={editingTrade.entryPrice || editingTrade.price || ''} onChange={e => setEditingTrade({...editingTrade, entryPrice: e.target.value})} /></div>
                                <div className="input-group"><label className="input-label">Stoploss</label><input className="apple-input" type="number" step="any" value={editingTrade.slPrice || editingTrade.sl || ''} onChange={e => setEditingTrade({...editingTrade, slPrice: e.target.value})} /></div>
                                <div className="input-group"><label className="input-label">Take Profit</label><input className="apple-input" type="number" step="any" value={editingTrade.tpPrice || ''} onChange={e => setEditingTrade({...editingTrade, tpPrice: e.target.value})} /></div>
                            </div>

                            <div className="input-group" style={{ marginBottom: 15 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <label className="input-label" style={{ margin:0 }}>Exit Prices (Partials)</label>
                                    <PlusCircle size={18} color="#007AFF" weight="fill" style={{ cursor: 'pointer' }} onClick={() => setEditingTrade({...editingTrade, actualExits: [...editingTrade.actualExits, { price: '' }]})} />
                                </div>
                                <div style={{ display: 'grid', gap: 8 }}>
                                    {(editingTrade.actualExits || []).map((ex, idx) => (
                                        <div key={idx} style={{ display: 'flex', gap: 8 }}>
                                            <input className="apple-input" placeholder={`Exit ${idx + 1}`} type="number" step="any" value={ex.price} onChange={(e) => {
                                                const exits = [...editingTrade.actualExits];
                                                exits[idx].price = e.target.value;
                                                setEditingTrade({...editingTrade, actualExits: exits});
                                            }} />
                                            {idx > 0 && <button type="button" onClick={() => setEditingTrade({...editingTrade, actualExits: editingTrade.actualExits.filter((_, i) => i !== idx)})} style={{border:'none', background:'none', color:'#FF3B30'}}><Trash size={16}/></button>}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:15 }}>
                                <div className="input-group">
                                    <label className="input-label">
                                        MAE Price (Heat)
                                        <FieldInfo title="MAE (Close to SL)" text="The absolute lowest (worst) price reached while in the trade. Measures how close you came to your Stop Loss." />
                                    </label>
                                    <input className="apple-input" type="number" step="any" value={editingTrade.maePrice || ''} onChange={e => setEditingTrade({...editingTrade, maePrice: e.target.value})} />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">
                                        MFE Price (Run)
                                        <FieldInfo title="MFE (Close to TP)" text="The absolute best price reached during or shortly after the trade. Measures the total move opportunity." />
                                    </label>
                                    <input className="apple-input" type="number" step="any" value={editingTrade.mfePrice || ''} onChange={e => setEditingTrade({...editingTrade, mfePrice: e.target.value})} />
                                </div>
                            </div>

                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom: 15 }}>
                                <div className="input-group"><label className="input-label">Risk ($)</label><input className="apple-input" type="number" value={editingTrade.risk || ''} onChange={e => setEditingTrade({...editingTrade, risk: e.target.value})} /></div>
                                <div className="input-group"><label className="input-label">Net P&L ($)</label><input className="apple-input" type="number" value={editingTrade.pnl || ''} onChange={e => setEditingTrade({...editingTrade, pnl: e.target.value})} /></div>
                            </div>
                            
                            <div className="input-group">
                                <label className="input-label">Strategy</label>
                                <select className="apple-input" value={editingTrade.strategy} onChange={e => setEditingTrade({...editingTrade, strategy: e.target.value})}>
                                    <option value="">Select Strategy...</option>
                                    {config.strategies.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="input-group" style={{marginTop:15}}>
                                <label className="input-label">Review Notes</label>
                                <textarea className="apple-input" rows={3} value={editingTrade.notes || ''} onChange={e => setEditingTrade({...editingTrade, notes: e.target.value})} placeholder="Focus on process..." />
                            </div>
                        </div>

                        <div>
                            <div className="label-xs" style={{color:'#FF9F0A', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 15 }}>
                                BEHAVIORAL REVIEW
                            </div>
                            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:20 }}>
                                {(config.mistakes || []).map(m => {
                                    const isSel = (editingTrade.mistake || []).includes(m);
                                    return (
                                        <button key={m} type="button" onClick={() => {
                                            const current = editingTrade.mistake || [];
                                            const next = current.includes(m) ? current.filter(x => x !== m) : [...current, m];
                                            setEditingTrade({...editingTrade, mistake: next});
                                        }} style={{ border: isSel ? '1px solid #FF3B30' : '1px solid #E5E5EA', background: isSel ? 'rgba(255, 59, 48, 0.1)' : 'white', padding: '6px 12px', borderRadius: 10, fontSize: 11, fontWeight: 600, cursor:'pointer' }}>{m}</button>
                                    );
                                })}
                            </div>
                            <div className="input-group" style={{ marginBottom: 20 }}><label className="input-label">Emotion</label>
                                <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:5}}>
                                    {EMOTIONS.map(em => <div key={em.label} onClick={() => setEditingTrade({...editingTrade, emotion: em.label})} style={{ border: editingTrade.emotion === em.label ? `2px solid ${em.color}` : '1px solid #E5E5EA', padding:10, borderRadius:12, cursor:'pointer', textAlign:'center', background: editingTrade.emotion === em.label ? 'white' : 'transparent' }}>{em.icon}</div>)}
                                </div>
                            </div>
                            <div className="input-group">
                                <label className="input-label">TradingView Link</label>
                                <input className="apple-input" placeholder="https://..." value={editingTrade.chartUrl || ''} onChange={e => setEditingTrade({...editingTrade, chartUrl: e.target.value})} />
                            </div>
                        </div>
                    </div>
                    <button type="submit" className="btn-primary" style={{ width:'100%', marginTop:30, height: 50, fontWeight: 800 }}>FINALIZE REVIEW</button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}