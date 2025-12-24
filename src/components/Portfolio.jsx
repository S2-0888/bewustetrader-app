import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Trash, Receipt, MagnifyingGlass, X, Target, ShieldWarning, CreditCard, IdentificationCard, Calendar, PlusCircle, CheckCircle, Confetti } from '@phosphor-icons/react';

const ACCOUNT_TYPES = ["Swing", "Intraday (No Weekend)", "Raw Spread", "Normal"];
const STAGES = ["Phase 1", "Phase 2", "Funded", "Breached", "Archived"];

export default function Portfolio() {
  const [accounts, setAccounts] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingAccount, setEditingAccount] = useState(null);
  const [promotingAccount, setPromotingAccount] = useState(null);
  const [newPromotionData, setNewPromotionData] = useState({ accountNumber: '', startBalance: '' });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [form, setForm] = useState({ 
    date: new Date().toISOString().split('T')[0],
    firm: '', 
    accountType: 'Swing',
    size: '', 
    accountCurrency: 'USD',
    purchaseCurrency: 'USD',
    originalPrice: '', 
    accountNumber: '', 
    profitTarget: '',  
    maxDrawdown: '',
    stage: 'Phase 1'
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) setUserProfile(snap.data());
    });

    const q = query(collection(db, "users", user.uid, "accounts"), orderBy("purchaseDate", "desc"));
    const unsubAccounts = onSnapshot(q, (snap) => {
      setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubAccounts(); };
  }, []);

  const formatAcc = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', currency, minimumFractionDigits: 0 
    }).format(amount || 0);
  };

  const formatBase = (amount) => {
    const pref = userProfile?.baseCurrency || 'USD';
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', currency: pref, minimumFractionDigits: 0 
    }).format(amount || 0);
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user || !form.firm || !form.size) return;

    let finalCostInBase = Number(form.originalPrice);
    const base = userProfile?.baseCurrency || 'USD';
    
    if (form.purchaseCurrency === 'USD' && base === 'EUR') finalCostInBase *= 0.92;
    if (form.purchaseCurrency === 'EUR' && base === 'USD') finalCostInBase *= 1.08;

    await addDoc(collection(db, "users", user.uid, "accounts"), {
      firm: form.firm, 
      accountType: form.accountType,
      balance: Number(form.size), 
      startBalance: Number(form.size),
      accountCurrency: form.accountCurrency,
      purchaseCurrency: form.purchaseCurrency, 
      originalCost: Number(form.originalPrice), 
      cost: finalCostInBase, 
      accountNumber: form.accountNumber || '---',
      profitTarget: Number(form.profitTarget) || (Number(form.size) * 0.10),
      maxDrawdown: Number(form.maxDrawdown) || (Number(form.size) * 0.10),
      stage: form.stage, 
      purchaseDate: form.date, 
      status: 'Active', 
      createdAt: new Date()
    });
    
    setForm({ ...form, firm: '', size: '', originalPrice: '', accountNumber: '', profitTarget: '', maxDrawdown: '', stage: 'Phase 1' });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingAccount) return;
    await updateDoc(doc(db, "users", auth.currentUser.uid, "accounts", editingAccount.id), {
        ...editingAccount,
        balance: Number(editingAccount.balance),
        profitTarget: Number(editingAccount.profitTarget),
        maxDrawdown: Number(editingAccount.maxDrawdown)
    });
    setEditingAccount(null); 
  };

  const executePromotion = async (e) => {
    e.preventDefault();
    const nextStage = promotingAccount.stage === 'Phase 1' ? 'Phase 2' : 'Funded';
    await updateDoc(doc(db, "users", auth.currentUser.uid, "accounts", promotingAccount.id), {
        stage: nextStage,
        accountNumber: newPromotionData.accountNumber,
        startBalance: Number(newPromotionData.startBalance),
        balance: Number(newPromotionData.startBalance)
    });
    setPromotingAccount(null);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation(); 
    if (window.confirm('Delete this account?')) {
      await deleteDoc(doc(db, "users", auth.currentUser.uid, "accounts", id));
    }
  };

  const getStageColor = (stage) => {
    switch(stage) {
      case 'Funded': return '#30D158';
      case 'Phase 2': return '#007AFF';
      case 'Breached': return '#FF3B30';
      default: return '#FF9F0A';
    }
  };

  const filteredAccounts = accounts.filter(acc => {
    const s = searchTerm.toLowerCase();
    return acc.firm.toLowerCase().includes(s) || (acc.accountNumber && acc.accountNumber.toString().includes(s));
  });

  return (
    <div style={{ padding: isMobile ? '20px 15px' : '40px 20px', maxWidth: 1200, margin: '0 auto', paddingBottom: 100 }}>
      
      <div style={{ marginBottom: 30 }}>
        <h1 style={{ fontSize: isMobile ? '26px' : '32px', fontWeight: 800, margin: 0 }}>Portfolio</h1>
        <p style={{ color: '#86868B', fontSize: '14px' }}>Inventory management for funded challenges.</p>
      </div>

      {/* FULL INVENTORY ADD PANEL */}
      <div className="bento-card" style={{ marginBottom: 35, borderTop: '4px solid #007AFF', padding: 25 }}>
        <div style={{ fontSize: 11, fontWeight: 900, color: '#007AFF', marginBottom: 20, display:'flex', alignItems:'center', gap:8, textTransform:'uppercase', letterSpacing:'1px' }}>
            <PlusCircle size={20} weight="fill" /> Register New Account
        </div>
        <form onSubmit={handleAddAccount}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: 20, marginBottom: 20 }}>
                <div className="input-group">
                    <label className="input-label">Prop Firm</label>
                    <input className="apple-input" placeholder="e.g. FTMO, FundingPips..." value={form.firm} onChange={e => setForm({...form, firm: e.target.value})} required />
                </div>
                <div className="input-group">
                    <label className="input-label">Account Type</label>
                    <select className="apple-input" value={form.accountType} onChange={e => setForm({...form, accountType: e.target.value})}>
                        {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div className="input-group">
                    <label className="input-label">Initial Stage</label>
                    <select className="apple-input" value={form.stage} onChange={e => setForm({...form, stage: e.target.value})}>
                        {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="input-group">
                    <label className="input-label">Login / Account ID</label>
                    <input className="apple-input" placeholder="12345678" value={form.accountNumber} onChange={e => setForm({...form, accountNumber: e.target.value})} />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr 1fr 1fr', gap: 20, alignItems: 'end' }}>
                <div className="input-group">
                    <label className="input-label">Account Size ({form.accountCurrency})</label>
                    <div style={{ display:'flex' }}>
                        <select className="apple-input" style={{ width: 70, borderRight:'none', borderTopRightRadius:0, borderBottomRightRadius:0, background:'#F2F2F7' }} value={form.accountCurrency} onChange={e => setForm({...form, accountCurrency: e.target.value})}>
                            <option value="USD">$</option><option value="EUR">€</option><option value="GBP">£</option>
                        </select>
                        <input className="apple-input" style={{ borderTopLeftRadius:0, borderBottomLeftRadius:0 }} type="number" placeholder="100000" value={form.size} onChange={e => setForm({...form, size: e.target.value})} required />
                    </div>
                </div>
                <div className="input-group"><label className="input-label">Profit Target ($)</label><input className="apple-input" type="number" placeholder="8000" value={form.profitTarget} onChange={e => setForm({...form, profitTarget: e.target.value})} /></div>
                <div className="input-group"><label className="input-label">Max Drawdown ($)</label><input className="apple-input" type="number" placeholder="10000" value={form.maxDrawdown} onChange={e => setForm({...form, maxDrawdown: e.target.value})} /></div>
                <div className="input-group">
                    <label className="input-label">Fee ({form.purchaseCurrency})</label>
                    <div style={{ display:'flex' }}>
                        <select className="apple-input" style={{ width: 70, borderRight:'none', borderTopRightRadius:0, borderBottomRightRadius:0, background:'#F2F2F7' }} value={form.purchaseCurrency} onChange={e => setForm({...form, purchaseCurrency: e.target.value})}>
                            <option value="USD">$</option><option value="EUR">€</option><option value="GBP">£</option>
                        </select>
                        <input className="apple-input" style={{ borderTopLeftRadius:0, borderBottomLeftRadius:0 }} type="number" placeholder="500" value={form.originalPrice} onChange={e => setForm({...form, originalPrice: e.target.value})} />
                    </div>
                </div>
            </div>
            <button type="submit" className="btn-primary" style={{ marginTop: 25, height: 48, background: '#000', color:'#fff', fontWeight: 700, width: isMobile ? '100%' : '240px' }}>Register Account</button>
        </form>
      </div>

      {/* SEARCH */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
          <MagnifyingGlass size={20} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#86868B' }} />
          <input className="apple-input" placeholder="Search firm, Login ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ paddingLeft: 45, height: 45 }} />
      </div>

      {/* ACCOUNTS LIST */}
      <div className="bento-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="apple-table">
              <thead>
                  <tr>
                      {!isMobile && <th style={{ width: 100 }}>Date</th>}
                      <th>Account Info</th>
                      {!isMobile && <th>Type</th>}
                      <th>Targets</th>
                      <th>Stage</th>
                      <th style={{ width: 50 }}></th>
                  </tr>
              </thead>
              <tbody>
                  {filteredAccounts.map(acc => {
                      const hasPassed = acc.balance >= (acc.startBalance + acc.profitTarget) && acc.stage !== 'Funded';
                      
                      return (
                      <tr key={acc.id} onClick={() => setEditingAccount(acc)} className="hover-row" style={{ cursor: 'pointer', opacity: acc.stage === 'Breached' || acc.status === 'Archived' ? 0.5 : 1 }}>
                          {!isMobile && <td style={{ color:'#86868B', fontSize:12 }}>{acc.purchaseDate ? new Date(acc.purchaseDate).toLocaleDateString() : '-'}</td>}
                          <td>
                              <div style={{ fontWeight:700 }}>{acc.firm}</div>
                              <div style={{ fontSize:11, color:'#86868B' }}>ID: {acc.accountNumber} • {formatAcc(acc.startBalance, acc.accountCurrency)}</div>
                          </td>
                          {!isMobile && <td style={{ fontSize:12 }}>{acc.accountType}</td>}
                          <td>
                              <div style={{ fontSize:11, display:'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 2 : 10 }}>
                                  <span style={{ color:'#30D158', fontWeight:700 }}>T: {formatAcc(acc.profitTarget, acc.accountCurrency)}</span>
                                  <span style={{ color:'#FF3B30', fontWeight:700 }}>DD: {formatAcc(acc.maxDrawdown, acc.accountCurrency)}</span>
                              </div>
                          </td>
                          <td>
                              {hasPassed ? (
                                <button 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setPromotingAccount(acc); 
                                    setNewPromotionData({ accountNumber: '', startBalance: acc.startBalance });
                                  }}
                                  style={{ background: '#30D158', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                  🎉 UPGRADE
                                </button>
                              ) : (
                                <span style={{ fontSize:10, padding:'3px 8px', borderRadius:6, fontWeight:800, background: 'rgba(0,0,0,0.05)', color: getStageColor(acc.stage) }}>
                                    {(acc.stage || 'Phase 1').toUpperCase()}
                                </span>
                              )}
                          </td>
                          <td><button onClick={(e) => handleDelete(acc.id, e)} style={{ border:'none', background:'none', color:'#D2D2D7' }}><Trash size={18} /></button></td>
                      </tr>
                      )
                  })}
              </tbody>
          </table>
      </div>

      {/* PROMOTION MODAL */}
      {promotingAccount && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', backdropFilter:'blur(15px)', zIndex:2100, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div className="bento-card" style={{ width: '100%', maxWidth: 400, padding: 30 }}>
                <div style={{ textAlign:'center', marginBottom:20 }}>
                    <div style={{ fontSize:40 }}>🎉</div>
                    <h2 style={{ fontWeight:900, margin:'10px 0 5px' }}>Congratulations!</h2>
                    <p style={{ color:'#86868B', fontSize:14 }}>Promoting {promotingAccount.firm} to {promotingAccount.stage === 'Phase 1' ? 'Phase 2' : 'Funded'}</p>
                </div>
                <form onSubmit={executePromotion} style={{ display:'grid', gap:15 }}>
                    <div className="input-group">
                        <label className="input-label">New Login / Account ID</label>
                        <input className="apple-input" placeholder="Enter new ID from email..." value={newPromotionData.accountNumber} onChange={e => setNewPromotionData({...newPromotionData, accountNumber: e.target.value})} required autoFocus />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Starting Balance ({promotingAccount.accountCurrency})</label>
                        <input className="apple-input" type="number" value={newPromotionData.startBalance} onChange={e => setNewPromotionData({...newPromotionData, startBalance: e.target.value})} required />
                    </div>
                    <button type="submit" className="btn-primary" style={{ height: 50, background: '#30D158', marginTop:10 }}>Start New Phase</button>
                    <button type="button" onClick={() => setPromotingAccount(null)} style={{ border:'none', background:'none', color:'#86868B', fontSize:12 }}>Cancel</button>
                </form>
            </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingAccount && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', backdropFilter:'blur(15px)', zIndex:2000, display:'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent:'center' }}>
            <div className="bento-card" style={{ width: '100%', maxWidth: 500, padding: 30, borderRadius: isMobile ? '30px 30px 0 0' : '24px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:25 }}>
                    <div style={{ fontSize:22, fontWeight:900 }}>Account Settings</div>
                    <button onClick={() => setEditingAccount(null)} style={{ border:'none', background:'#F2F2F7', width: 36, height: 36, borderRadius: 18, cursor:'pointer' }}><X size={20} /></button>
                </div>

                <form onSubmit={handleUpdate} style={{ display:'grid', gap:20 }}>
                    <div style={{ display:'grid', gridTemplateColumns: '1fr 1fr', gap:15 }}>
                      <div className="input-group"><label className="input-label">Firm</label><input className="apple-input" value={editingAccount.firm} onChange={e => setEditingAccount({...editingAccount, firm: e.target.value})} /></div>
                      <div className="input-group"><label className="input-label">Stage</label>
                        <select className="apple-input" value={editingAccount.stage || 'Phase 1'} onChange={e => setEditingAccount({...editingAccount, stage: e.target.value})}>
                          {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    
                    <div className="input-group"><label className="input-label">Login / Account ID</label><input className="apple-input" value={editingAccount.accountNumber} onChange={e => setEditingAccount({...editingAccount, accountNumber: e.target.value})} /></div>

                    <div style={{ display:'grid', gridTemplateColumns: '1fr 1fr', gap:15 }}>
                      <div className="input-group"><label className="input-label">Target ({editingAccount.accountCurrency})</label><input className="apple-input" type="number" value={editingAccount.profitTarget} onChange={e => setEditingAccount({...editingAccount, profitTarget: e.target.value})} /></div>
                      <div className="input-group"><label className="input-label">Max DD ({editingAccount.accountCurrency})</label><input className="apple-input" type="number" value={editingAccount.maxDrawdown} onChange={e => setEditingAccount({...editingAccount, maxDrawdown: e.target.value})} /></div>
                    </div>

                    <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                        <button type="submit" className="btn-primary" style={{ height: 50, background: '#007AFF' }}>Save Changes</button>
                        
                        <button 
                            type="button" 
                            onClick={async () => {
                                if(window.confirm('Confirm Account Breach? This will archive the account.')) {
                                    await updateDoc(doc(db, "users", auth.currentUser.uid, "accounts", editingAccount.id), {
                                        stage: 'Breached',
                                        status: 'Archived'
                                    });
                                    setEditingAccount(null);
                                }
                            }}
                            style={{ 
                                height: 50, 
                                background: 'rgba(255, 59, 48, 0.1)', 
                                color: '#FF3B30', 
                                border: 'none', 
                                borderRadius: 12, 
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                        >
                            <ShieldWarning size={18} style={{ marginBottom: -4, marginRight: 6 }} />
                            MARK AS BREACHED
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}