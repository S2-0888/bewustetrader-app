import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { 
  Trash, X, Wallet, ToggleLeft, ToggleRight, ArrowUpRight, 
  ArrowDownRight, CheckSquare, Smiley, SmileySad, SmileyMeh, 
  SmileyNervous, Plus, Target, ShieldCheck, ChartLineUp, Calendar, PlusCircle
} from '@phosphor-icons/react';
import AdvancedJournalForm from './AdvancedJournalForm';

const DEFAULT_CONFIG = {
    strategies: ["Breakout", "Pullback", "Reversal", "Trend Following", "Scalp", "News Trade"],
    rules: ["Max 1% Risk", "Wait for Candle Close", "No Impulsive Entry", "Stoploss Placed", "Setup Aligns with Plan"],
    mistakes: ["None (Perfect Execution)", "FOMO Entry", "Revenge Trading", "Size Too Large", "Moved Stoploss", "Closed Too Early", "Chasing Price"],
    quality: ["A+ (Perfect)", "A (Good)", "B (Average)", "C (Forced/Bad)"]
};

const EMOTIONS = [
    { label: 'Neutral', icon: <SmileyMeh size={20}/>, color: '#86868B' },
    { label: 'Confident', icon: <Smiley size={20}/>, color: '#30D158' },
    { label: 'Anxious', icon: <SmileyNervous size={20}/>, color: '#FF9F0A' },
    { label: 'Greed/Tilt', icon: <SmileySad size={20}/>, color: '#FF3B30' },
];

export default function TradeLab() {
  // 1. STATES
  const [trades, setTrades] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [isProMode, setIsProMode] = useState(false);
  const [closingTrade, setClosingTrade] = useState(null); 
  const [editingTrade, setEditingTrade] = useState(null);
  const [closePnl, setClosePnl] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showExtraExits, setShowExtraExits] = useState(false);

  // Zorg dat 'form' hier gedefinieerd is
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    accountId: '', pair: '', direction: 'LONG', 
    strategy: '', setupQuality: '', risk: '', checkedRules: [], chartUrl: ''
  });

  // 2. EFFECTS
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    const user = auth.currentUser;
    if (!user) return;

    onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) setUserProfile(snap.data());
    });

    const unsubTrades = onSnapshot(query(collection(db, "users", user.uid, "trades"), orderBy("date", "desc")), (snap) => {
      setTrades(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubAccounts = onSnapshot(query(collection(db, "users", user.uid, "accounts")), (snap) => {
      setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() }))); 
    });

    getDoc(doc(db, "users", user.uid, "settings", "tradelab")).then(docSnap => {
      if (docSnap.exists()) setConfig(docSnap.data());
    });

    return () => { unsubTrades(); unsubAccounts(); window.removeEventListener('resize', handleResize); };
  }, []);

  // 3. HELPERS
  const getAccountInfo = (accountId) => {
    const acc = accounts.find(a => a.id === accountId);
    if (!acc) return { firm: 'Unknown', accountNumber: 'N/A' };
    return { firm: acc.firm, accountNumber: acc.accountNumber || 'N/A' };
  };

  const getCurrencySymbol = (currencyCode) => {
    if (currencyCode === 'EUR') return '€';
    if (currencyCode === 'GBP') return '£';
    return '$';
  };

  // Helper voor het geselecteerde account in de form
  const selectedFormAccount = accounts.find(a => a.id === form.accountId);

  const formatTradeMoney = (amount, currencyCode) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: currencyCode || 'USD',
      minimumFractionDigits: 0 
    }).format(amount || 0);
  };

  // 4. ACTIONS
  const handleSimpleOpen = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user || !selectedFormAccount || !form.pair) return;
    
    const disciplineScore = Math.round(((form.checkedRules || []).length / (config.rules?.length || 1)) * 100);

    await addDoc(collection(db, "users", user.uid, "trades"), {
      ...form, 
      mistake: [], 
      actualExits: [{ price: '', lots: '' }],
      accountName: selectedFormAccount.firm,
      accountCurrency: selectedFormAccount.accountCurrency || 'USD',
      risk: Number(form.risk), 
      disciplineScore, 
      status: 'OPEN',
      pnl: 0, 
      rMultiple: 0, 
      isAdvanced: false, 
      createdAt: new Date()
    });
    setForm(prev => ({ ...prev, pair: '', risk: '', checkedRules: [], chartUrl: '' }));
  };

  const handleAdvancedSubmit = async (proData) => {
    await addDoc(collection(db, "users", auth.currentUser.uid, "trades"), {
        ...proData,
        actualExits: [{ price: '', lots: '' }] 
    });
    setIsProMode(false);
  };

  const handleCloseTrade = async (e) => {
    e.preventDefault();
    if (!closingTrade) return;
    const pnl = Number(closePnl);
    await updateDoc(doc(db, "users", auth.currentUser.uid, "trades", closingTrade.id), {
        status: 'CLOSED', pnl: pnl, rMultiple: Math.round((pnl / (closingTrade.risk || 1)) * 100) / 100
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
        mae: Number(editingTrade.mae) || 0,
        mfe: Number(editingTrade.mfe) || 0,
        exit1: editingTrade.exit1 || '',
        exit2: editingTrade.exit2 || '',
        exit3: editingTrade.exit3 || '',
        rMultiple: Math.round((pnl / risk) * 100) / 100
    });
    setEditingTrade(null);
    setShowExtraExits(false);
  };

  const toggleEditMistake = (mistakeTag) => {
    if (!editingTrade) return;
    let currentMistakes = Array.isArray(editingTrade.mistake) ? editingTrade.mistake : [];
    if (currentMistakes.includes(mistakeTag)) {
        currentMistakes = currentMistakes.filter(m => m !== mistakeTag);
    } else {
        currentMistakes = [...currentMistakes, mistakeTag];
    }
    setEditingTrade({ ...editingTrade, mistake: currentMistakes });
  };

  return (
    <div style={{ padding: isMobile ? '20px 15px' : '40px 20px', maxWidth: 1200, margin: '0 auto', paddingBottom: 100 }}>
      
      {/* HEADER */}
      <div style={{ marginBottom: 30, display:'flex', justifyContent:'space-between', alignItems:'end' }}>
        <div><h1 style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 800, margin: 0, letterSpacing:'-1px' }}>Trade Lab</h1><p style={{ color: '#86868B', fontSize: 14 }}>Operations & Review</p></div>
        <div onClick={() => setIsProMode(!isProMode)} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', background: isProMode ? '#F0F8FF' : 'transparent', padding:'5px 10px', borderRadius:8 }}>
            <span style={{ fontSize:10, fontWeight:800, color: isProMode ? '#007AFF' : '#86868B' }}>{isProMode ? 'PRO' : 'SIMPLE'}</span>
            {isProMode ? <ToggleRight size={32} weight="fill" color="#007AFF" /> : <ToggleLeft size={32} color="#86868B" />}
        </div>
      </div>

      {/* INPUT PANEL */}
      <div style={{ marginBottom: 40 }}>
          {isProMode ? (
              <AdvancedJournalForm onSubmit={handleAdvancedSubmit} onCancel={() => setIsProMode(false)} accounts={accounts.filter(a => a.status === 'Active')} />
          ) : (
              <div className="bento-card" style={{ borderTop: '4px solid #007AFF', padding: 25 }}>
                <form onSubmit={handleSimpleOpen}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: 30 }}>
                        <div>
                            <div className="label-xs" style={{ marginBottom: 15, color: '#007AFF' }}>QUICK LOG (OPEN POSITION)</div>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:15, marginBottom:15 }}>
                                <div className="input-group"><label className="input-label">Ticker</label><input className="apple-input" placeholder="EURUSD" value={form.pair} onChange={e => setForm({...form, pair: e.target.value.toUpperCase()})} required /></div>
                                <div className="input-group">
                                    <label className="input-label">Account</label>
                                    <select className="apple-input" value={form.accountId} onChange={e => setForm({...form, accountId: e.target.value})} required>
                                        <option value="">Select account...</option>
                                        {accounts.filter(a => a.status === 'Active').map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.firm} — {acc.accountNumber || 'No ID'}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:15 }}>
                                <div className="input-group">
                                    <label className="input-label">Risk ({getCurrencySymbol(selectedFormAccount?.accountCurrency)})</label>
                                    <input type="number" step="any" className="apple-input" value={form.risk} onChange={e => setForm({...form, risk: e.target.value})} required />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Direction</label>
                                    <div style={{ display:'flex', height: 42, background:'#E5E5EA', borderRadius:8, padding: 2 }}>
                                        <button type="button" onClick={() => setForm({...form, direction: 'LONG'})} style={{ flex:1, border:'none', borderRadius:6, fontSize:10, fontWeight:800, background: form.direction === 'LONG' ? 'white' : 'transparent', color: form.direction === 'LONG' ? '#30D158' : '#86868B' }}>LONG</button>
                                        <button type="button" onClick={() => setForm({...form, direction: 'SHORT'})} style={{ flex:1, border:'none', borderRadius:6, fontSize:10, fontWeight:800, background: form.direction === 'SHORT' ? 'white' : 'transparent', color: form.direction === 'SHORT' ? '#FF3B30' : '#86868B' }}>SHORT</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div style={{ background: '#F9F9F9', borderRadius: 16, padding: 20, display:'flex', flexDirection:'column' }}>
                            <div className="label-xs" style={{ color:'#FF3B30', marginBottom: 15 }}>PLAN CONFIDENCE</div>
                            <div style={{ display:'flex', flexDirection:'column', gap: 10, flex:1 }}>
                                {(config.rules || []).map((rule, idx) => (
                                    <label key={idx} style={{ display:'flex', alignItems:'center', gap:10, fontSize:12, cursor:'pointer' }}>
                                        <input type="checkbox" checked={form.checkedRules.includes(rule)} onChange={() => setForm({...form, checkedRules: form.checkedRules.includes(rule) ? form.checkedRules.filter(r => r !== rule) : [...form.checkedRules, rule]})} /> {rule}
                                    </label>
                                ))}
                            </div>
                            <button type="submit" className="btn-primary" style={{ width:'100%', marginTop: 20 }}>LOG POSITION</button>
                        </div>
                    </div>
                </form>
              </div>
          )}
      </div>

      {/* JOURNAL TABLE */}
      <div className="bento-card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="apple-table">
                <thead><tr><th>Date</th><th>Ticker</th>{!isMobile && <th>Account</th>}<th>Strategy</th><th>Status</th><th>Result</th><th></th></tr></thead>
                <tbody>
                    {trades.map(trade => {
                        const accInfo = getAccountInfo(trade.accountId);
                        return (
                        <tr key={trade.id} onClick={() => { setEditingTrade(trade); setShowExtraExits(!!(trade.exit2 || trade.exit3)); }} className="hover-row" style={{ cursor:'pointer' }}>
                            <td style={{ fontSize:12, color:'#86868B' }}>{new Date(trade.date).toLocaleDateString()}</td>
                            <td style={{ fontWeight:700 }}>{trade.pair} <span style={{fontSize:9, marginLeft: 5, color: trade.direction==='LONG'?'#30D158':'#FF3B30'}}>{trade.direction}</span></td>
                            {!isMobile && (
                                <td>
                                    <div style={{ display:'flex', flexDirection:'column' }}>
                                        <span style={{ fontSize: '9px', fontWeight: 800, color: '#1D1D1F', textTransform: 'uppercase' }}>{accInfo.firm}</span>
                                        <span style={{ fontSize: '8px', color: '#86868B', fontWeight: 600 }}>ID: {accInfo.accountNumber}</span>
                                    </div>
                                </td>
                            )}
                            <td style={{ fontSize:12 }}>{trade.strategy || '-'}</td>
                            <td>{trade.status==='OPEN' ? <span style={{ background:'#E5F1FF', color:'#007AFF', padding:'3px 8px', borderRadius:6, fontSize:10, fontWeight:800 }}>OPEN</span> : <span style={{ color:'#86868B', fontSize:11 }}>CLOSED</span>}</td>
                            <td>
                                {trade.status==='OPEN' ? 
                                    <button onClick={(e)=>{e.stopPropagation();setClosingTrade(trade)}} style={{ background:'#007AFF', color:'white', border:'none', borderRadius:6, padding:'4px 8px', fontSize:11 }}>CLOSE</button> 
                                    : <div style={{ fontWeight:800, color: trade.pnl>=0?'#30D158':'#FF453A' }}>{formatTradeMoney(trade.pnl, trade.accountCurrency)}</div>
                                }
                            </td>
                            <td><button onClick={(e)=>{e.stopPropagation(); if(window.confirm('Delete trade?')) deleteDoc(doc(db, "users", auth.currentUser.uid, "trades", trade.id))}} style={{ border:'none', background:'none', color:'#ccc' }}><Trash size={16}/></button></td>
                        </tr>
                        );
                    })}
                </tbody>
            </table>
      </div>

      {/* REVIEW MODAL */}
      {editingTrade && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1100 }}>
            <div className="bento-card" style={{ width: '100%', maxWidth: 850, padding: 30, maxHeight:'90vh', overflowY:'auto' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
                    <div style={{ display:'flex', flexDirection:'column' }}>
                        <h3 style={{ fontWeight: 900, margin:0 }}>Review: {editingTrade.pair}</h3>
                        <span style={{ fontSize:10, color:'#86868B', fontWeight:700 }}>{getAccountInfo(editingTrade.accountId).firm} — ID: {getAccountInfo(editingTrade.accountId).accountNumber}</span>
                    </div>
                    <button onClick={() => setEditingTrade(null)} style={{ border:'none', background:'none', cursor:'pointer' }}><X size={24}/></button>
                </div>
                
                <form onSubmit={handleUpdateTrade}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr', gap: 40 }}>
                        <div>
                            <div className="label-xs" style={{color:'#007AFF', marginBottom: 15 }}>PERFORMANCE ARCHITECTURE</div>
                            
                            <div className="input-group" style={{ marginBottom: 20 }}>
                                <label className="input-label">Trade Date</label>
                                <input type="date" className="apple-input" value={editingTrade.date} onChange={e => setEditingTrade({...editingTrade, date: e.target.value})} />
                            </div>

                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, background:'#F2F2F7', padding:15, borderRadius:12, marginBottom:20 }}>
                                <div className="input-group" style={{marginBottom:0}}><label className="input-label">Entry Price</label><input className="apple-input" type="number" step="any" value={editingTrade.price || ''} onChange={e => setEditingTrade({...editingTrade, price: e.target.value})} /></div>
                                <div className="input-group" style={{marginBottom:0}}><label className="input-label">Stoploss</label><input className="apple-input" type="number" step="any" value={editingTrade.sl || ''} onChange={e => setEditingTrade({...editingTrade, sl: e.target.value})} /></div>
                            </div>

                            <div style={{ background: '#F2F2F7', padding: 15, borderRadius: 12, marginBottom: 20 }}>
                                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 10 }}>
                                    <div className="label-xs" style={{ margin:0, fontSize: 9 }}>SCALING EXITS</div>
                                    {!showExtraExits && (
                                        <button type="button" onClick={() => setShowExtraExits(true)} style={{ background:'none', border:'none', color:'#007AFF', display:'flex', alignItems:'center', gap:4, cursor:'pointer', fontSize:10, fontWeight:700 }}>
                                            <PlusCircle size={14} weight="fill" /> ADD EXITS
                                        </button>
                                    )}
                                </div>
                                <div style={{ display:'grid', gridTemplateColumns: showExtraExits ? '1fr 1fr 1fr' : '1fr', gap:10 }}>
                                    <div className="input-group" style={{marginBottom:0}}>
                                        <label className="input-label">Exit 1 (Final)</label>
                                        <input className="apple-input" type="number" step="any" placeholder="Price" value={editingTrade.exit1 || ''} onChange={e => setEditingTrade({...editingTrade, exit1: e.target.value})} />
                                    </div>
                                    {showExtraExits && (
                                        <>
                                            <div className="input-group" style={{marginBottom:0}}>
                                                <label className="input-label">Exit 2</label>
                                                <input className="apple-input" type="number" step="any" placeholder="Price" value={editingTrade.exit2 || ''} onChange={e => setEditingTrade({...editingTrade, exit2: e.target.value})} />
                                            </div>
                                            <div className="input-group" style={{marginBottom:0}}>
                                                <label className="input-label">Exit 3</label>
                                                <input className="apple-input" type="number" step="any" placeholder="Price" value={editingTrade.exit3 || ''} onChange={e => setEditingTrade({...editingTrade, exit3: e.target.value})} />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="input-group">
                                <label className="input-label">Total Net P&L ({getCurrencySymbol(editingTrade.accountCurrency)})</label>
                                <input className="apple-input" type="number" step="any" value={editingTrade.pnl} onChange={e => setEditingTrade({...editingTrade, pnl: e.target.value})} />
                            </div>
                            
                            <div style={{ background: 'rgba(0,122,255,0.05)', padding: 20, borderRadius: 16, marginTop: 15, border: '1px solid rgba(0,122,255,0.1)' }}>
                              <div className="label-xs" style={{ color:'#007AFF', marginBottom:10 }}>EDGE EVALUATION (ENTRY vs EXIT)</div>
                              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                                <div className="input-group" style={{marginBottom:0}}>
                                    <label className="input-label">MAE (Entry Precision)</label>
                                    <input className="apple-input" type="number" step="any" placeholder="Max Drawdown $" value={editingTrade.mae || ''} onChange={e => setEditingTrade({...editingTrade, mae: e.target.value})} />
                                </div>
                                <div className="input-group" style={{marginBottom:0}}>
                                    <label className="input-label">MFE (Exit Efficiency)</label>
                                    <input className="apple-input" type="number" step="any" placeholder="Max Run-up $" value={editingTrade.mfe || ''} onChange={e => setEditingTrade({...editingTrade, mfe: e.target.value})} />
                                </div>
                              </div>
                            </div>
                        </div>
                        <div>
                            <div className="label-xs" style={{color:'#FF9F0A', marginBottom: 15 }}>BEHAVIORAL REVIEW</div>
                            <div className="input-group"><label className="input-label">Strategy</label><select className="apple-input" value={editingTrade.strategy} onChange={e => setEditingTrade({...editingTrade, strategy: e.target.value})}>{(config.strategies||[]).map(s=><option key={s} value={s}>{s}</option>)}</select></div>
                            <div className="input-group" style={{ marginTop: 20 }}>
                                <label className="input-label">Behavioral Leaks (Mistakes)</label>
                                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                                    {(config.mistakes || []).map(m => {
                                        const isSel = (editingTrade.mistake || []).includes(m);
                                        return (
                                            <button key={m} type="button" onClick={() => toggleEditMistake(m)} style={{ border: isSel ? '1px solid #FF3B30' : '1px solid #E5E5EA', background: isSel ? 'rgba(255, 59, 48, 0.1)' : 'white', color: isSel ? '#FF3B30' : '#1D1D1F', padding: '6px 12px', borderRadius: 10, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>{m}</button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="input-group" style={{ marginTop: 20 }}><label className="input-label">Trade Emotion</label><div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:5}}>{EMOTIONS.map(em=><div key={em.label} onClick={()=>setEditingTrade({...editingTrade, emotion:em.label})} style={{border:editingTrade.emotion===em.label?`2px solid ${em.color}`:'1px solid #E5E5EA', padding:10, borderRadius:12, cursor:'pointer', textAlign:'center', background: editingTrade.emotion===em.label?'white':'transparent'}}>{em.icon}</div>)}</div></div>
                            <div className="input-group" style={{ marginTop: 20 }}>
                                <label className="input-label">Review Notes</label>
                                <textarea className="apple-input" rows={2} value={editingTrade.notes || ''} onChange={e => setEditingTrade({...editingTrade, notes: e.target.value})} placeholder="Focus on process..." />
                            </div>

                            <div className="input-group" style={{ marginTop: 20 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                                    <label className="input-label" style={{ margin: 0 }}>TradingView Link</label>
                                    {editingTrade.chartUrl && (
                                        <a href={editingTrade.chartUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '10px', color: '#007AFF', fontWeight: 700, textDecoration: 'none' }}>OPEN CHART ↗</a>
                                    )}
                                </div>
                                <input className="apple-input" placeholder="https://www.tradingview.com/x/..." value={editingTrade.chartUrl || ''} onChange={e => setEditingTrade({...editingTrade, chartUrl: e.target.value})} />
                            </div>
                        </div>
                    </div>
                    <div style={{ marginTop:40, textAlign:'right', borderTop: '1px solid #F5F5F7', paddingTop: 25 }}>
                      <button type="submit" className="btn-primary" style={{ background: '#007AFF', padding: '14px 40px', fontSize: 16 }}>FINALIZE REVIEW</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* CLOSE POSITION MODAL */}
      {closingTrade && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1200 }}>
            <div className="bento-card" style={{ width: 340, padding: 30 }}>
                <h3 style={{ textAlign:'center', margin:0, fontWeight:800 }}>Close {closingTrade.pair}</h3>
                <form onSubmit={handleCloseTrade}>
                    <div className="input-group">
                        <label className="input-label">Net Result ({getCurrencySymbol(closingTrade.accountCurrency)})</label>
                        <input className="apple-input" type="number" step="any" autoFocus value={closePnl} onChange={e => setClosePnl(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn-primary" style={{ width:'100%', marginTop:25, height: 48 }}>CONFIRM RESULT</button>
                    <button type="button" onClick={() => setClosingTrade(null)} style={{ border:'none', background:'none', width:'100%', marginTop:15, color:'#86868B', fontSize:12 }}>Cancel</button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}