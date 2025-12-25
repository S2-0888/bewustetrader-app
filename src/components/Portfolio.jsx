import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Trash, MagnifyingGlass, X, PlusCircle, ShieldWarning, Calendar, Funnel, Hash, Percent } from '@phosphor-icons/react';

const ACCOUNT_TYPES = ["Normal", "Swing", "Intraday (No Weekend)", "Raw Spread"];
const CREATE_STAGES = ["Phase 1", "Phase 2", "Funded"];
const ALL_STAGES = ["Phase 1", "Phase 2", "Funded", "Breached", "Archived"];

export default function Portfolio() {
  const [accounts, setAccounts] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('Active');
  const [editingAccount, setEditingAccount] = useState(null);
  const [promotingAccount, setPromotingAccount] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [form, setForm] = useState({ 
    purchaseDate: new Date().toISOString().split('T')[0],
    firm: '', accountType: '', size: '', 
    accountCurrency: 'USD', purchaseCurrency: 'USD',
    originalPrice: '', accountNumber: '', 
    profitTarget: '', maxDrawdown: '', stage: 'Phase 1',
    targetPct: '', ddPct: ''
  });

  const [newPromotionData, setNewPromotionData] = useState({ 
    accountNumber: '', startBalance: '', profitTarget: '', maxDrawdown: '' 
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    const user = auth.currentUser;
    if (!user) return;
    onSnapshot(doc(db, "users", user.uid), (snap) => setUserProfile(snap.data()));
    const q = query(collection(db, "users", user.uid, "accounts"), orderBy("purchaseDate", "desc"));
    return onSnapshot(q, (snap) => setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  // KIS: Berekeningen tussen % en Bedrag
  const updateFromPct = (type, pctValue) => {
    const size = Number(form.size);
    if (!size) return;
    const amount = (size * (Number(pctValue) / 100)).toFixed(0);
    setForm(prev => ({ ...prev, [type]: amount, [type === 'profitTarget' ? 'targetPct' : 'ddPct']: pctValue }));
  };

  const updateFromAmount = (type, amountValue) => {
    const size = Number(form.size);
    if (!size) return;
    const pct = ((Number(amountValue) / size) * 100).toFixed(1);
    setForm(prev => ({ ...prev, [type]: amountValue, [type === 'profitTarget' ? 'targetPct' : 'ddPct']: pct }));
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user || !form.firm || !form.size) return;
    await addDoc(collection(db, "users", user.uid, "accounts"), {
      ...form,
      balance: Number(form.size), startBalance: Number(form.size),
      profitTarget: Number(form.profitTarget), maxDrawdown: Number(form.maxDrawdown),
      status: 'Active', createdAt: new Date()
    });
    setForm({ ...form, firm: '', size: '', originalPrice: '', accountNumber: '', profitTarget: '', maxDrawdown: '', targetPct: '', ddPct: '' });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    await updateDoc(doc(db, "users", auth.currentUser.uid, "accounts", editingAccount.id), { ...editingAccount });
    setEditingAccount(null);
  };

  const executePromotion = async (e) => {
    e.preventDefault();
    const nextStage = promotingAccount.stage === 'Phase 1' ? 'Phase 2' : 'Funded';
    await updateDoc(doc(db, "users", auth.currentUser.uid, "accounts", promotingAccount.id), {
        stage: nextStage,
        accountNumber: newPromotionData.accountNumber,
        startBalance: Number(newPromotionData.startBalance),
        balance: Number(newPromotionData.startBalance),
        profitTarget: Number(newPromotionData.profitTarget),
        maxDrawdown: Number(newPromotionData.maxDrawdown)
    });
    setPromotingAccount(null);
  };

  const formatAcc = (amount, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount || 0);

  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch = acc.firm.toLowerCase().includes(searchTerm.toLowerCase()) || acc.accountNumber?.includes(searchTerm);
    const isActive = ['Phase 1', 'Phase 2', 'Funded'].includes(acc.stage);
    return stageFilter === 'Active' ? (isActive && matchesSearch) : matchesSearch;
  });

  return (
    <div style={{ padding: isMobile ? '20px 15px' : '40px 20px', maxWidth: 1200, margin: '0 auto', paddingBottom: 100 }}>
      
      <div style={{ marginBottom: 30 }}>
        <h1 style={{ fontSize: isMobile ? '26px' : '32px', fontWeight: 800, margin: 0, letterSpacing: '-1px' }}>Portfolio Vault</h1>
        <p style={{ color: '#86868B', fontSize: '14px' }}>Strategic account management.</p>
      </div>

      {/* NEW ACCOUNT REGISTRATION */}
      <div className="bento-card" style={{ marginBottom: 35, borderTop: '4px solid #007AFF', padding: 25 }}>
        <div style={{ fontSize: 10, fontWeight: 900, color: '#007AFF', marginBottom: 20, letterSpacing: '1px' }}>NEW ACCOUNT</div>
        <form onSubmit={handleAddAccount}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr 1fr', gap: 15, marginBottom: 20 }}>
                <div className="input-group"><label className="input-label">Prop Firm</label><input className="apple-input" placeholder="FTMO, etc." value={form.firm} onChange={e => setForm({...form, firm: e.target.value})} required /></div>
                <div className="input-group"><label className="input-label">Stage</label><select className="apple-input" value={form.stage} onChange={e => setForm({...form, stage: e.target.value})}>{CREATE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div className="input-group"><label className="input-label">Login ID</label><input className="apple-input" placeholder="ID" value={form.accountNumber} onChange={e => setForm({...form, accountNumber: e.target.value})} /></div>
                <div className="input-group"><label className="input-label">Purchase Date</label><input type="date" className="apple-input" value={form.purchaseDate} onChange={e => setForm({...form, purchaseDate: e.target.value})} /></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1.2fr 1.2fr 1fr', gap: 15, alignItems: 'end' }}>
                <div className="input-group">
                    <label className="input-label">Size ({form.accountCurrency})</label>
                    <div style={{ display:'flex' }}>
                        <select className="apple-input" style={{ width: 60, borderRight:'none', borderRadius:'8px 0 0 8px', background:'#F2F2F7' }} value={form.accountCurrency} onChange={e => setForm({...form, accountCurrency: e.target.value})}><option value="USD">$</option><option value="EUR">€</option></select>
                        <input className="apple-input" style={{ borderRadius:'0 8px 8px 0' }} type="number" placeholder="100000" value={form.size} onChange={e => setForm({...form, size: e.target.value})} required />
                    </div>
                </div>
                
                {/* DUAL INPUT TARGET */}
                <div className="input-group">
                    <label className="input-label">{form.stage === 'Funded' ? 'Withdrawal Goal' : 'Profit Target'}</label>
                    <div style={{ display:'flex', gap: 5 }}>
                        <input className="apple-input" style={{ flex: 2 }} type="number" placeholder="Amount" value={form.profitTarget} onChange={e => updateFromAmount('profitTarget', e.target.value)} />
                        <div style={{ position:'relative', flex: 1 }}>
                            <input className="apple-input" type="number" placeholder="%" value={form.targetPct} onChange={e => updateFromPct('profitTarget', e.target.value)} />
                            <span style={{ position:'absolute', right:8, top:10, fontSize:10, color:'#86868B' }}>%</span>
                        </div>
                    </div>
                </div>

                {/* DUAL INPUT DRAWDOWN */}
                <div className="input-group">
                    <label className="input-label">Max Drawdown</label>
                    <div style={{ display:'flex', gap: 5 }}>
                        <input className="apple-input" style={{ flex: 2 }} type="number" placeholder="Amount" value={form.maxDrawdown} onChange={e => updateFromAmount('maxDrawdown', e.target.value)} />
                        <div style={{ position:'relative', flex: 1 }}>
                            <input className="apple-input" type="number" placeholder="%" value={form.ddPct} onChange={e => updateFromPct('maxDrawdown', e.target.value)} />
                            <span style={{ position:'absolute', right:8, top:10, fontSize:10, color:'#86868B' }}>%</span>
                        </div>
                    </div>
                </div>

                <button type="submit" className="btn-primary" style={{ height: 44, background: '#000', fontWeight: 700 }}>Add Account</button>
            </div>
        </form>
      </div>

      {/* MODERN SPREADSHEET STYLE FILTERS */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15, background: 'white', padding: '8px 15px', borderRadius: 12, border: '1px solid #F2F2F7' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#86868B', fontSize: 12 }}>
                  <Funnel size={16} /> Filters:
              </div>
              <div style={{ display: 'flex', gap: 5 }}>
                  {['Active', 'All'].map(f => (
                      <button key={f} onClick={() => setStageFilter(f)} style={{ border:'none', background: stageFilter === f ? '#F2F2F7' : 'transparent', padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, color: stageFilter === f ? '#000' : '#86868B', cursor:'pointer' }}>{f}</button>
                  ))}
              </div>
          </div>
          <div style={{ position: 'relative', width: 250 }}>
              <MagnifyingGlass size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#86868B' }} />
              <input style={{ width: '100%', border: 'none', background: 'transparent', fontSize: 13, padding: '5px 5px 5px 35px' }} placeholder="Search firm or ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
      </div>

      {/* TABLE */}
      <div className="bento-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="apple-table">
              <thead><tr>{!isMobile && <th>Date</th>}<th>Account</th><th>Status</th><th>Targets</th><th style={{ width:50 }}></th></tr></thead>
              <tbody>
                  {filteredAccounts.map(acc => {
                      const hasPassed = acc.balance >= (Number(acc.startBalance) + Number(acc.profitTarget)) && ['Phase 1', 'Phase 2'].includes(acc.stage);
                      return (
                      <tr key={acc.id} onClick={() => setEditingAccount(acc)} className="hover-row" style={{ cursor: 'pointer', opacity: acc.stage === 'Breached' ? 0.4 : 1 }}>
                          {!isMobile && <td style={{ fontSize:11, color:'#86868B' }}>{acc.purchaseDate}</td>}
                          <td><div style={{ fontWeight:700 }}>{acc.firm}</div><div style={{ fontSize:10, color:'#86868B' }}>ID: {acc.accountNumber || 'N/A'} • {formatAcc(acc.startBalance, acc.accountCurrency)}</div></td>
                          <td>
                              {hasPassed ? (
                                <button onClick={(e) => { e.stopPropagation(); setPromotingAccount(acc); setNewPromotionData({ accountNumber: '', startBalance: acc.startBalance, profitTarget: '', maxDrawdown: acc.maxDrawdown }); }} style={{ background: '#30D158', color: 'white', border: 'none', padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 800 }}>🎉 UPGRADE</button>
                              ) : (
                                <span style={{ fontSize:9, padding:'3px 8px', borderRadius:6, fontWeight:800, background: '#F2F2F7', color: acc.stage === 'Funded' ? '#30D158' : acc.stage === 'Breached' ? '#FF3B30' : '#FF9F0A' }}>{acc.stage.toUpperCase()}</span>
                              )}
                          </td>
                          <td><div style={{ fontSize:10, color: '#86868B' }}>T: <span style={{color:'#30D158'}}>{formatAcc(acc.profitTarget, acc.accountCurrency)}</span><br/>D: <span style={{color:'#FF3B30'}}>{formatAcc(acc.maxDrawdown, acc.accountCurrency)}</span></div></td>
                          <td><button onClick={(e) => { e.stopPropagation(); if(confirm('Delete?')) deleteDoc(doc(db, "users", auth.currentUser.uid, "accounts", acc.id)); }} style={{ border:'none', background:'none', color:'#ccc' }}><Trash size={16}/></button></td>
                      </tr>
                      );
                  })}
              </tbody>
          </table>
      </div>

      {/* PROMOTION MODAL */}
      {promotingAccount && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', backdropFilter:'blur(10px)', zIndex:2100, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
            <div className="bento-card" style={{ width: '100%', maxWidth: 400, padding: 30 }}>
                <div style={{ textAlign:'center', marginBottom:20 }}><h2 style={{fontWeight:900}}>Next Stage</h2><p style={{ color:'#86868B', fontSize:13 }}>Upgrade {promotingAccount.firm}</p></div>
                <form onSubmit={executePromotion} style={{ display:'grid', gap:15 }}>
                    <div className="input-group"><label className="input-label">New Account ID</label><input className="apple-input" value={newPromotionData.accountNumber} onChange={e => setNewPromotionData({...newPromotionData, accountNumber: e.target.value})} required /></div>
                    <div className="input-group"><label className="input-label">New Start Balance</label><input className="apple-input" type="number" value={newPromotionData.startBalance} onChange={e => setNewPromotionData({...newPromotionData, startBalance: e.target.value})} required /></div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                        <div className="input-group"><label className="input-label">Profit Target</label><input className="apple-input" type="number" value={newPromotionData.profitTarget} onChange={e => setNewPromotionData({...newPromotionData, profitTarget: e.target.value})} /></div>
                        <div className="input-group"><label className="input-label">Max DD</label><input className="apple-input" type="number" value={newPromotionData.maxDrawdown} onChange={e => setNewPromotionData({...newPromotionData, maxDrawdown: e.target.value})} /></div>
                    </div>
                    <button type="submit" className="btn-primary" style={{ height: 48, background: '#30D158' }}>Activate Phase</button>
                    <button type="button" onClick={() => setPromotingAccount(null)} style={{ border:'none', background:'none', color:'#86868B', fontSize:12, marginTop:5 }}>Cancel</button>
                </form>
            </div>
        </div>
      )}

      {/* ACCOUNT SETTINGS MODAL */}
      {editingAccount && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', backdropFilter:'blur(15px)', zIndex:2000, display:'flex', alignItems: 'center', justifyContent:'center', padding:20 }}>
            <div className="bento-card" style={{ width: '100%', maxWidth: 500, padding: 30 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}><h3 style={{fontWeight:900}}>Account Settings</h3><button onClick={() => setEditingAccount(null)} style={{ border:'none', background:'none', cursor:'pointer' }}><X size={20}/></button></div>
                <form onSubmit={handleUpdate} style={{ display:'grid', gap:18 }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                        <div className="input-group"><label className="input-label">Firm</label><input className="apple-input" value={editingAccount.firm} onChange={e => setEditingAccount({...editingAccount, firm: e.target.value})} /></div>
                        <div className="input-group"><label className="input-label">Stage</label><select className="apple-input" value={editingAccount.stage} onChange={e => setEditingAccount({...editingAccount, stage: e.target.value})}>{ALL_STAGES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                        <div className="input-group"><label className="input-label">Account ID</label><input className="apple-input" value={editingAccount.accountNumber || ''} onChange={e => setEditingAccount({...editingAccount, accountNumber: e.target.value})} /></div>
                        <div className="input-group"><label className="input-label">Purchase Date</label><input type="date" className="apple-input" value={editingAccount.purchaseDate || ''} onChange={e => setEditingAccount({...editingAccount, purchaseDate: e.target.value})} /></div>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                        <div className="input-group"><label className="input-label">Target Bedrag</label><input className="apple-input" type="number" value={editingAccount.profitTarget} onChange={e => setEditingAccount({...editingAccount, profitTarget: e.target.value})} /></div>
                        <div className="input-group"><label className="input-label">Max DD Bedrag</label><input className="apple-input" type="number" value={editingAccount.maxDrawdown} onChange={e => setEditingAccount({...editingAccount, maxDrawdown: e.target.value})} /></div>
                    </div>
                    <div className="input-group">
                        <label className="input-label">Account Type (Optioneel)</label>
                        <select className="apple-input" value={editingAccount.accountType || ''} onChange={e => setEditingAccount({...editingAccount, accountType: e.target.value})}>
                            <option value="">Niet geselecteerd</option>
                            {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                        <button type="submit" className="btn-primary">Save Changes</button>
                        <button type="button" onClick={async () => { if(confirm('Mark as Breached?')) { await updateDoc(doc(db, "users", auth.currentUser.uid, "accounts", editingAccount.id), { stage: 'Breached' }); setEditingAccount(null); } }} style={{ height:44, background:'rgba(255, 59, 48, 0.1)', color:'#FF3B30', border:'none', borderRadius:12, fontWeight:700, cursor:'pointer' }}>MARK AS BREACHED</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}