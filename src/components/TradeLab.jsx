import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { 
  Trash, X, Wallet, Gear,
  Smiley, SmileySad, SmileyMeh, 
  SmileyNervous, Plus, PlusCircle, Blueprint, ArrowSquareOut, CaretDown, Lightning, Scales, Info
} from '@phosphor-icons/react';
import AdvancedJournalForm from './AdvancedJournalForm';

const FieldInfo = ({ title, text }) => {
    const [visible, setVisible] = useState(false);
    return (
        <div style={{ position: 'relative', display: 'inline-block', marginLeft: '6px' }}>
            <Info size={14} weight="bold" style={{ cursor: 'help', color: '#007AFF', opacity: 0.8 }} onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}/>
            {visible && (
                <div style={{ position: 'absolute', bottom: '100%', left: '0', transform: 'translateX(-10px)', width: '240px', background: '#1C1C1E', color: 'white', padding: '12px', borderRadius: '12px', fontSize: '11px', zIndex: 2100, marginBottom: '8px', boxShadow: '0 15px 35px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>
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
  const [showPriceFields, setShowPriceFields] = useState(true); 
  const [editingTrade, setEditingTrade] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [closingTrade, setClosingTrade] = useState(null); 
  const [closeExitPrice, setCloseExitPrice] = useState(''); 
  const [closeGrossPnl, setCloseGrossPnl] = useState(''); 
  const [closeCommission, setCloseCommission] = useState(''); 
  const [closePnl, setClosePnl] = useState(''); 

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    accountId: '', pair: '', direction: 'LONG', 
    strategy: '', risk: '', isAligned: false, checkedRules: [],
    entryPrice: '', slPrice: '', tpPrice: ''
  });

  useEffect(() => {
    const entry = parseFloat(form.entryPrice);
    const sl = parseFloat(form.slPrice);
    if (!isNaN(entry) && !isNaN(sl)) {
      if (entry > sl && form.direction !== 'LONG') setForm(prev => ({ ...prev, direction: 'LONG' }));
      else if (entry < sl && form.direction !== 'SHORT') setForm(prev => ({ ...prev, direction: 'SHORT' }));
    }
  }, [form.entryPrice, form.slPrice, form.direction]);

  const handleFocus = (e) => e.target.select();

  const updateNetPnl = (gross, comm) => {
    const net = Number(gross || 0) - Math.abs(Number(comm || 0));
    setClosePnl(net.toFixed(2));
  };

  useEffect(() => {
    const handleResize = () => {
        const mobile = window.innerWidth < 768;
        setIsMobile(mobile);
        if (mobile) setIsProMode(false);
    };
    window.addEventListener('resize', handleResize);
    const user = auth.currentUser;
    if (!user) return;
    onSnapshot(query(collection(db, "users", user.uid, "trades")), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // FIXED SORTING: Open trades first, then Newest Date on top
      const sortedList = list.sort((a, b) => {
        if (a.status === 'OPEN' && b.status !== 'OPEN') return -1;
        if (a.status !== 'OPEN' && b.status === 'OPEN') return 1;
        return new Date(b.date) - new Date(a.date);
      });
      
      setTrades(sortedList);
    });
    onSnapshot(query(collection(db, "users", user.uid, "accounts")), (snap) => {
      setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() }))); 
    });
    getDoc(doc(db, "users", user.uid, "settings", "tradelab")).then(docSnap => {
      if (docSnap.exists()) setConfig(docSnap.data());
    });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSimpleOpen = async (e) => {
    e.preventDefault();
    const selectedFormAccount = accounts.find(a => a.id === form.accountId);
    if (!selectedFormAccount) return;
    const riskAmount = Math.abs(Number(form.risk));
    const score = Math.round(((form.checkedRules?.length || 0) / (config.rules?.length || 1)) * 100);
    
    await addDoc(collection(db, "users", auth.currentUser.uid, "trades"), {
      ...form, 
      entryPrice: form.entryPrice ? Number(form.entryPrice) : null,
      slPrice: form.slPrice ? Number(form.slPrice) : null,
      risk: riskAmount, status: 'OPEN', pnl: 0, commission: 0,
      isAdvanced: false, createdAt: new Date(), 
      accountName: selectedFormAccount.firm, 
      accountNumber: selectedFormAccount.accountNumber, 
      disciplineScore: score
    });
    setForm(prev => ({ ...prev, pair: '', risk: '', entryPrice: '', slPrice: '', tpPrice: '', isAligned: false, checkedRules: [] }));
  };

  const executeCloseTrade = async (e) => {
    e.preventDefault();
    if (!closingTrade) return;
    await updateDoc(doc(db, "users", auth.currentUser.uid, "trades", closingTrade.id), {
        status: 'CLOSED', pnl: Number(closePnl), exitPrice: Number(closeExitPrice),
        grossPnl: Number(closeGrossPnl), commission: Number(closeCommission || 0), 
        closedAt: new Date(), actualExits: [{ price: Number(closeExitPrice) }]
    });
    setClosingTrade(null); setClosePnl(''); setCloseExitPrice(''); setCloseCommission(''); setCloseGrossPnl('');
  };

  const handleUpdateTrade = async (e) => {
    e.preventDefault();
    if (!editingTrade) return;
    const net = Number(editingTrade.grossPnl || 0) - Math.abs(Number(editingTrade.commission || 0));
    await updateDoc(doc(db, "users", auth.currentUser.uid, "trades", editingTrade.id), {
        ...editingTrade, pnl: net
    });
    setEditingTrade(null);
  };

  return (
    <div style={{ padding: isMobile ? '15px' : '40px 20px', maxWidth: 1200, margin: '0 auto', paddingBottom: 100 }}>
      
      {/* HEADER */}
      <div style={{ marginBottom: 30, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
            <h1 style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 800, margin: 0 }}>Trade Lab</h1>
            {!isMobile && <p style={{ color: '#86868B', fontSize: 14 }}>Operations & Review</p>}
        </div>
        {!isMobile && (
            <div onClick={() => setIsProMode(!isProMode)} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', background: isProMode ? '#F0F8FF' : '#F2F2F7', padding:'8px 12px', borderRadius:14 }}>
                {isProMode ? <Blueprint size={18} color="#007AFF" /> : <Lightning size={18} color="#86868B" />}
                <span style={{ fontSize:10, fontWeight:800, color: isProMode ? '#007AFF' : '#86868B' }}>{isProMode ? 'ADVANCED' : 'LIGHTNING'}</span>
            </div>
        )}
      </div>

      {!isProMode && (
        <div className="bento-card" style={{ borderTop: '4px solid #007AFF', padding: isMobile ? 20 : 25 }}>
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
                        <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, fontWeight:700 }}>
                            <Scales size={18} color="#007AFF" /> PRICE ARCHITECTURE
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 15 }}>
                            <input type="number" step="any" className="apple-input" placeholder="Entry" onFocus={handleFocus} value={form.entryPrice} onChange={e => setForm({...form, entryPrice: e.target.value})} />
                            <input type="number" step="any" className="apple-input" placeholder="SL" onFocus={handleFocus} value={form.slPrice} onChange={e => setForm({...form, slPrice: e.target.value})} />
                            <input type="number" step="any" className="apple-input" placeholder="TP" onFocus={handleFocus} value={form.tpPrice} onChange={e => setForm({...form, tpPrice: e.target.value})} />
                        </div>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:15 }}>
                          <input type="number" step="any" min="0" placeholder="Risk ($)" className="apple-input" onFocus={handleFocus} value={form.risk} onChange={e => setForm({...form, risk: e.target.value.replace('-','')})} required />
                          <div style={{ display:'flex', height: 42, background:'#E5E5EA', borderRadius:8, padding: 2 }}>
                                <button type="button" onClick={() => setForm({...form, direction: 'LONG'})} style={{ flex:1, border:'none', borderRadius:6, fontSize:10, fontWeight:800, background: form.direction === 'LONG' ? 'white' : 'transparent', color: form.direction === 'LONG' ? '#30D158' : '#86868B' }}>LONG</button>
                                <button type="button" onClick={() => setForm({...form, direction: 'SHORT'})} style={{ flex:1, border:'none', borderRadius:6, fontSize:10, fontWeight:800, background: form.direction === 'SHORT' ? 'white' : 'transparent', color: form.direction === 'SHORT' ? '#FF3B30' : '#86868B' }}>SHORT</button>
                          </div>
                      </div>

                      {isMobile && (
                        <div style={{ marginTop: 15, padding: '10px 0', borderTop: '1px solid #E5E5EA' }}>
                            <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontSize:12, color: '#86868B' }}>
                              <input 
                                type="checkbox" 
                                checked={form.isAligned} 
                                onChange={e => setForm(p => ({
                                    ...p, 
                                    isAligned: e.target.checked, 
                                    checkedRules: e.target.checked ? (config.rules || []) : []
                                }))} 
                              /> Aligned with Plan?
                            </label>
                        </div>
                      )}

                      <button type="submit" className="btn-primary" style={{ width:'100%', height: 44, marginTop: 10, borderRadius: 14 }}>OPEN POSITION</button>
                  </div>

                  {!isMobile && (
                    <div style={{ background: '#F9F9F9', borderRadius: 16, padding: 20 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 10 }}>
                            <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontSize:13, fontWeight:700 }}>
                              <input type="checkbox" checked={form.isAligned} onChange={e => setForm(p => ({...p, isAligned: e.target.checked, checkedRules: e.target.checked ? (config.rules || []) : []}))} /> Aligned with Plan?
                            </label>
                            <CaretDown size={18} style={{ cursor:'pointer', transform: showRules ? 'rotate(180deg)' : 'none', transition: '0.2s' }} onClick={() => setShowRules(!showRules)} />
                        </div>
                        {showRules && (
                            <div style={{ display:'grid', gap:8, background: 'white', padding: 10, borderRadius: 10 }}>
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
                    </div>
                  )}
              </div>
          </form>
        </div>
      )}

      {!isMobile && isProMode && (
        <AdvancedJournalForm 
          onSubmit={(data) => { addDoc(collection(db, "users", auth.currentUser.uid, "trades"), data); setIsProMode(false); }} 
          onCancel={() => setIsProMode(false)} 
        />
      )}

      {/* TABLE / CARDS SECTION */}
      <div style={{ marginTop: 30 }}>
        {isMobile ? (
          <div style={{ display: 'grid', gap: '15px' }}>
            {trades.map(trade => (
              <div 
                key={trade.id} 
                className="bento-card" 
                onClick={() => setEditingTrade({ ...trade, actualExits: trade.actualExits || (trade.exitPrice ? [{price: trade.exitPrice}] : [{ price: '' }]) })}
                style={{ padding: '20px', borderLeft: `4px solid ${trade.status === 'OPEN' ? '#007AFF' : '#86868B'}` }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {trade.isAdvanced ? <Blueprint size={20} color="#007AFF" weight="fill" /> : <Lightning size={20} color="#FF9F0A" weight="fill" />}
                    <span style={{ fontWeight: 800, fontSize: 16 }}>{trade.pair}</span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: trade.direction === 'LONG' ? '#30D158' : '#FF3B30' }}>{trade.direction}</span>
                  </div>
                  <span style={{ fontSize: 11, color: '#86868B' }}>{new Date(trade.date).toLocaleDateString('nl-NL')}</span>
                </div>

                <div style={{ fontSize: 13, color: '#1D1D1F', marginBottom: 15 }}>
                  <span style={{ color: '#86868B' }}>Account:</span> <span style={{ fontWeight: 700 }}>{trade.accountName}</span>
                  <div style={{ fontSize: 11, color: '#86868B', marginTop: 4, fontWeight: 600 }}>
                    ID: {trade.accountNumber || 'Unknown'}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 900, fontSize: 18, color: trade.status === 'OPEN' ? '#007AFF' : (trade.pnl >= 0 ? '#30D158' : '#FF453A') }}>
                    {trade.status === 'OPEN' ? 'OPEN' : `$${trade.pnl || 0}`}
                  </div>
                  
                  <div style={{ display: 'flex', gap: 10 }}>
                    {trade.status === 'OPEN' && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setClosingTrade(trade); }} 
                        style={{ background: '#FF3B30', color: 'white', border: 'none', borderRadius: '10px', padding: '12px 20px', fontSize: '12px', fontWeight: 800, boxShadow: '0 4px 12px rgba(255, 59, 48, 0.2)' }}
                      >
                        CLOSE POSITION
                      </button>
                    )}
                    <button onClick={(e) => {e.stopPropagation(); if(confirm('Delete?')) deleteDoc(doc(db, "users", auth.currentUser.uid, "trades", trade.id))}} style={{border:'none', background:'none', color:'#FF3B30', padding: 10, opacity: 0.4}}><Trash size={20}/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bento-card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="apple-table">
                  <thead><tr><th>Datum</th><th>Ticker</th><th>Account</th><th>Status</th><th>Resultat</th><th></th></tr></thead>
                  <tbody>
                      {trades.map(trade => (
                          <tr key={trade.id} onClick={() => setEditingTrade({ ...trade, actualExits: trade.actualExits || (trade.exitPrice ? [{price: trade.exitPrice}] : [{ price: '' }]) })} className="hover-row" style={{ cursor:'pointer' }}>
                              <td style={{ fontSize: '11px', color: '#86868B' }}>{new Date(trade.date).toLocaleDateString('nl-NL')}</td>
                              <td style={{ fontWeight:700 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      {trade.isAdvanced ? <Blueprint size={16} color="#007AFF" weight="fill" /> : <Lightning size={16} color="#FF9F0A" weight="fill" />}
                                      {trade.pair} <span style={{fontSize:9, color: trade.direction==='LONG'?'#30D158':'#FF3B30'}}>{trade.direction}</span>
                                  </div>
                              </td>
                              <td>
                                <div style={{ fontWeight: 600 }}>{trade.accountName}</div>
                                <div style={{ fontSize: 10, color: '#86868B' }}>{trade.accountNumber || 'ID N/A'}</div>
                              </td>
                              <td>{trade.status === 'OPEN' ? <span className="badge-blue">OPEN</span> : <span style={{color:'#86868B'}}>CLOSED</span>}</td>
                              <td style={{ fontWeight:800, color: (trade.pnl || 0) >= 0 ? '#30D158' : '#FF453A' }}>
                                  {trade.status === 'OPEN' ? (
                                      <button onClick={(e) => { e.stopPropagation(); setClosingTrade(trade); }} style={{ background: 'rgba(0, 122, 255, 0.08)', color: '#007AFF', border: '1px solid rgba(0, 122, 255, 0.15)', borderRadius: '8px', padding: '6px 16px', fontSize: '11px', fontWeight: 800 }}>CLOSE</button>
                                  ) : `$${trade.pnl || 0}`}
                              </td>
                              <td><button onClick={(e) => {e.stopPropagation(); if(confirm('Delete?')) deleteDoc(doc(db, "users", auth.currentUser.uid, "trades", trade.id))}} style={{border:'none', background:'none', color:'#ccc', cursor: 'pointer', opacity: 0.6}}><Trash size={16}/></button></td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
        )}
      </div>

      {/* CLOSE MODAL */}
      {closingTrade && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:3000, padding: 20 }}>
            <div className="bento-card" style={{ width: '100%', maxWidth: 380, padding: 30 }}>
                <h3 style={{ margin:0, fontWeight:900, textAlign: 'center', marginBottom: 20 }}>Close Position</h3>
                <div style={{ background: '#1C1C1E', color: 'white', padding: '20px', borderRadius: '16px', marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15, alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: 13, opacity: 0.8 }}>NET RESULT</span>
                        <span style={{ fontWeight: 900, fontSize: 24, color: Number(closePnl) >= 0 ? '#30D158' : '#FF453A' }}>${closePnl || '0.00'}</span>
                    </div>
                </div>
                <form onSubmit={executeCloseTrade} style={{ display: 'grid', gap: 15 }}>
                    <div className="input-group">
                        <label className="input-label">Exit Price</label>
                        <input style={{fontSize:16, height:50}} className="apple-input" type="number" step="any" autoFocus onFocus={handleFocus} value={closeExitPrice} onChange={e => setCloseExitPrice(e.target.value)} required />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="input-group">
                            <label className="input-label">Gross P&L</label>
                            <input style={{fontSize:16, height:50}} className="apple-input" type="number" step="any" onFocus={handleFocus} value={closeGrossPnl} onChange={e => { setCloseGrossPnl(e.target.value); updateNetPnl(e.target.value, closeCommission); }} required />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Commission / Swap</label>
                            <input style={{fontSize:16, height:50}} className="apple-input" type="number" step="any" onFocus={handleFocus} value={closeCommission} onChange={e => { setCloseCommission(e.target.value); updateNetPnl(closeGrossPnl, e.target.value); }} />
                        </div>
                    </div>
                    <button type="submit" className="btn-primary" style={{ height: 55, borderRadius: 16, marginTop: 10 }}>CONFIRM & POST</button>
                    <button type="button" onClick={() => setClosingTrade(null)} style={{ border:'none', background:'none', color:'#86868B', fontSize: 12 }}>Cancel</button>
                </form>
            </div>
        </div>
      )}

      {/* REVIEW MODAL */}
      {editingTrade && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding: 20 }}>
            <div className="bento-card" style={{ width: '100%', maxWidth: 850, padding: 30, maxHeight:'90vh', overflowY:'auto' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:25 }}>
                    <div>
                        <h3 style={{ fontWeight: 900, margin:0 }}>Review: {editingTrade.pair}</h3>
                        <span style={{ fontSize:10, color:'#86868B' }}>Method: {editingTrade.isAdvanced ? 'Advanced' : 'Lightning'} Entry</span>
                    </div>
                    <button onClick={() => setEditingTrade(null)} style={{ border:'none', background:'none', cursor:'pointer' }}><X size={24}/></button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 15, marginBottom: 25 }}>
                    <div style={{ background: '#F2F2F7', padding: '15px', borderRadius: '14px', textAlign: 'center' }}>
                        <div style={{ fontSize: 9, fontWeight: 800, color: '#86868B', marginBottom: 4 }}>TOTAL COMMISSION</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#FF453A' }}>-{Math.abs(Number(editingTrade.commission || 0)).toFixed(2)}</div>
                    </div>
                    <div style={{ background: '#007AFF', padding: '15px', borderRadius: '14px', textAlign: 'center', color: 'white' }}>
                        <div style={{ fontSize: 9, fontWeight: 800, opacity: 0.8, marginBottom: 4 }}>ACTUAL NET P&L</div>
                        <div style={{ fontSize: 18, fontWeight: 900 }}>${Number(editingTrade.pnl || 0).toLocaleString('nl-NL')}</div>
                    </div>
                </div>
                <form onSubmit={handleUpdateTrade}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr', gap: isMobile ? 20 : 40 }}>
                        <div>
                            <div className="label-xs" style={{color:'#007AFF', marginBottom: 15 }}>PRECISION & EXECUTION</div>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:15, marginBottom:15, padding: '15px', background: 'rgba(0, 122, 255, 0.05)', borderRadius: '14px' }}>
                                <div className="input-group">
                                    <label className="input-label">Gross P&L</label>
                                    <input className="apple-input" type="number" step="any" onFocus={handleFocus} value={editingTrade.grossPnl ?? ''} onChange={e => setEditingTrade({...editingTrade, grossPnl: e.target.value})} />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Commission / Swap</label>
                                    <input className="apple-input" type="number" step="any" onFocus={handleFocus} value={editingTrade.commission ?? ''} onChange={e => setEditingTrade({...editingTrade, commission: e.target.value})} />
                                </div>
                            </div>
                            <div className="input-group" style={{ marginBottom: 15 }}>
                                <label className="input-label">Trade Date</label>
                                <input type="date" className="apple-input" value={editingTrade.date || ''} onChange={e => setEditingTrade({...editingTrade, date: e.target.value})} />
                            </div>
                            <div className="input-group" style={{ marginBottom: 15 }}>
                                <label className="input-label">Trading Account</label>
                                <select className="apple-input" value={editingTrade.accountId || ''} onChange={e => {
                                    const acc = accounts.find(a => a.id === e.target.value);
                                    setEditingTrade({...editingTrade, accountId: e.target.value, accountName: acc ? acc.firm : editingTrade.accountName});
                                }}>
                                    {accounts.filter(a => a.status === 'Active').map(acc => (<option key={acc.id} value={acc.id}>{acc.firm} — {acc.accountNumber}</option>))}
                                </select>
                            </div>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:15 }}>
                                <div className="input-group"><label className="input-label">Entry</label><input onFocus={handleFocus} className="apple-input" type="number" step="any" value={editingTrade.entryPrice || ''} onChange={e => setEditingTrade({...editingTrade, entryPrice: e.target.value})} /></div>
                                <div className="input-group"><label className="input-label">SL</label><input onFocus={handleFocus} className="apple-input" type="number" step="any" value={editingTrade.slPrice || ''} onChange={e => setEditingTrade({...editingTrade, slPrice: e.target.value})} /></div>
                                <div className="input-group"><label className="input-label">TP</label><input onFocus={handleFocus} className="apple-input" type="number" step="any" value={editingTrade.tpPrice || ''} onChange={e => setEditingTrade({...editingTrade, tpPrice: e.target.value})} /></div>
                            </div>
                            <div className="input-group" style={{ marginBottom: 15 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <label className="input-label" style={{ margin:0 }}>Exit Prices</label>
                                    <PlusCircle size={18} color="#007AFF" weight="fill" style={{ cursor: 'pointer' }} onClick={() => setEditingTrade({...editingTrade, actualExits: [...(editingTrade.actualExits || []), { price: '' }]})} />
                                </div>
                                <div style={{ display: 'grid', gap: 8 }}>
                                    {(editingTrade.actualExits || []).map((ex, idx) => (
                                        <div key={idx} style={{ display: 'flex', gap: 8 }}>
                                            <input onFocus={handleFocus} className="apple-input" placeholder={`Exit ${idx + 1}`} type="number" step="any" value={ex.price} onChange={(e) => {
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
                                <div className="input-group"><label className="input-label">MAE Price <FieldInfo title="MAE" text="Worst price reached while in trade."/></label><input onFocus={handleFocus} className="apple-input" type="number" value={editingTrade.maePrice || ''} onChange={e => setEditingTrade({...editingTrade, maePrice: e.target.value})} /></div>
                                <div className="input-group"><label className="input-label">MFE Price <FieldInfo title="MFE" text="Best price reached while in trade."/></label><input onFocus={handleFocus} className="apple-input" type="number" value={editingTrade.mfePrice || ''} onChange={e => setEditingTrade({...editingTrade, mfePrice: e.target.value})} /></div>
                            </div>
                        </div>
                        <div>
                            <div className="label-xs" style={{color:'#FF9F0A', marginBottom: 15 }}>BEHAVIORAL REVIEW</div>
                            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:20 }}>
                                {(config.mistakes || []).map(m => (
                                    <button key={m} type="button" onClick={() => {
                                        const cur = editingTrade.mistake || [];
                                        setEditingTrade({...editingTrade, mistake: cur.includes(m) ? cur.filter(x => x !== m) : [...cur, m]});
                                    }} style={{ border: (editingTrade.mistake || []).includes(m) ? '1px solid #FF3B30' : '1px solid #E5E5EA', background: (editingTrade.mistake || []).includes(m) ? 'rgba(255, 59, 48, 0.1)' : 'white', padding: '6px 12px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{m}</button>
                                ))}
                            </div>
                            <div className="input-group" style={{ marginBottom: 20 }}><label className="input-label">Emotion</label>
                                <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:5}}>
                                    {EMOTIONS.map(em => <div key={em.label} onClick={() => setEditingTrade({...editingTrade, emotion: em.label})} style={{ border: editingTrade.emotion === em.label ? `2px solid ${em.color}` : '1px solid #E5E5EA', padding:10, borderRadius:12, textAlign:'center', cursor:'pointer' }}>{em.icon}</div>)}
                                </div>
                            </div>
                            <textarea className="apple-input" rows={3} value={editingTrade.notes || ''} onChange={e => setEditingTrade({...editingTrade, notes: e.target.value})} placeholder="Notes..." />
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