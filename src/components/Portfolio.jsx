import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Trash, Receipt, MagnifyingGlass, X, Target, ShieldWarning } from '@phosphor-icons/react';

export default function Portfolio() {
  const [accounts, setAccounts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingAccount, setEditingAccount] = useState(null);

  const [form, setForm] = useState({ 
    date: new Date().toISOString().split('T')[0],
    firm: '', type: '2-Step', size: '', 
    currency: 'EUR', 
    originalPrice: '', 
    accountNumber: '', 
    invoiceNumber: '',
    profitTarget: '',  
    maxDrawdown: ''    
  });

  // 1. DATA OPHALEN
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "accounts"), orderBy("purchaseDate", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // API Helper
  const getUsdToEurRate = async () => {
    try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await response.json();
        return data.rates.EUR;
    } catch (error) {
        return 0.92; 
    }
  };

  // 2. SNEL TOEVOEGEN
  const handleQuickAdd = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user || !form.firm || !form.size) return;

    let finalCostInEuro = Number(form.originalPrice);

    if (form.currency === 'USD') {
        const rate = await getUsdToEurRate();
        finalCostInEuro = Math.round((Number(form.originalPrice) * rate) * 100) / 100;
    }

    await addDoc(collection(db, "users", user.uid, "accounts"), {
      firm: form.firm, type: form.type,
      balance: Number(form.size), startBalance: Number(form.size),
      currency: form.currency, 
      originalCost: Number(form.originalPrice), 
      cost: finalCostInEuro, 
      accountNumber: form.accountNumber || '---',
      invoiceNumber: form.invoiceNumber || '',
      profitTarget: Number(form.profitTarget) || 0,
      maxDrawdown: Number(form.maxDrawdown) || 0,
      paymentId: '', stage: 'Phase 1', 
      purchaseDate: form.date, status: 'Active', createdAt: new Date()
    });
    
    setForm(prev => ({ ...prev, firm: '', size: '', originalPrice: '', accountNumber: '', invoiceNumber: '', profitTarget: '', maxDrawdown: '' }));
  };

  // 3. UPDATEN
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingAccount) return;

    await updateDoc(doc(db, "users", auth.currentUser.uid, "accounts", editingAccount.id), {
        ...editingAccount,
        balance: Number(editingAccount.balance),
        originalCost: Number(editingAccount.originalCost),
        cost: Number(editingAccount.cost),
        profitTarget: Number(editingAccount.profitTarget),
        maxDrawdown: Number(editingAccount.maxDrawdown)
    });
    setEditingAccount(null); 
  };

  const toggleStatus = async (account, e) => {
    e.stopPropagation(); 
    const newStatus = account.status === 'Active' ? 'Archived' : 'Active';
    await updateDoc(doc(db, "users", auth.currentUser.uid, "accounts", account.id), { status: newStatus });
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation(); 
    if (confirm('Wil je deze factuur definitief verwijderen?')) {
      await deleteDoc(doc(db, "users", auth.currentUser.uid, "accounts", id));
    }
  };

  const filteredAccounts = accounts.filter(acc => {
    const s = searchTerm.toLowerCase();
    return acc.firm.toLowerCase().includes(s) || acc.accountNumber?.toString().includes(s) || acc.invoiceNumber?.toLowerCase().includes(s);
  });

  return (
    <div style={{ padding: '40px 20px', maxWidth: 1200, margin: '0 auto' }}>
      
      {/* HEADER (ZONDER TOTAAL BEDRAG) */}
      <div style={{ marginBottom: 30 }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>Portfolio Administratie</h1>
        <p style={{ color: 'var(--text-muted)' }}>Beheer je actieve en gearchiveerde accounts.</p>
      </div>

      {/* --- QUICK ADD FORMULIER --- */}
      <div className="bento-card" style={{ marginBottom: 30, borderTop: '4px solid #007AFF' }}>
        <div className="label-xs" style={{ display:'flex', alignItems:'center', gap:6, color:'#007AFF', marginBottom: 15 }}>
            <Receipt size={16} weight="fill" /> SNEL TOEVOEGEN
        </div>
        <form onSubmit={handleQuickAdd}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 15, alignItems: 'end' }}>
                <div className="input-group" style={{marginBottom:0}}><label className="input-label">Datum</label><input type="date" className="apple-input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
                <div className="input-group" style={{marginBottom:0}}><label className="input-label">Firm</label><input className="apple-input" placeholder="FTMO" value={form.firm} onChange={e => setForm({...form, firm: e.target.value})} /></div>
                <div className="input-group" style={{marginBottom:0}}><label className="input-label">Grootte</label><input className="apple-input" type="number" placeholder="100000" value={form.size} onChange={e => setForm({...form, size: e.target.value})} /></div>
                
                <div className="input-group" style={{marginBottom:0}}><label className="input-label">Target (€)</label><input className="apple-input" type="number" placeholder="8000" value={form.profitTarget} onChange={e => setForm({...form, profitTarget: e.target.value})} /></div>
                <div className="input-group" style={{marginBottom:0}}><label className="input-label">Max DD (€)</label><input className="apple-input" type="number" placeholder="10000" value={form.maxDrawdown} onChange={e => setForm({...form, maxDrawdown: e.target.value})} /></div>

                <div className="input-group" style={{ marginBottom:0 }}>
                    <label className="input-label">Kosten</label>
                    <div style={{ display:'flex' }}>
                        <select className="apple-input" style={{ width: 60, borderTopRightRadius:0, borderBottomRightRadius:0, borderRight:'none', background:'#F2F2F7' }} value={form.currency} onChange={e => setForm({...form, currency: e.target.value})}>
                            <option value="EUR">€</option>
                            <option value="USD">$</option>
                        </select>
                        <input className="apple-input" style={{ borderTopLeftRadius:0, borderBottomLeftRadius:0 }} type="number" placeholder="500" value={form.originalPrice} onChange={e => setForm({...form, originalPrice: e.target.value})} />
                    </div>
                </div>

                <div className="input-group" style={{marginBottom:0}}>
                    <label className="input-label">Account ID</label>
                    <input className="apple-input" placeholder="Login ID" value={form.accountNumber} onChange={e => setForm({...form, accountNumber: e.target.value})} />
                </div>

                <button type="submit" className="btn-primary" style={{ height: 44 }}>Toevoegen</button>
            </div>
        </form>
      </div>

      {/* --- TOOLBAR --- */}
      <div style={{ display: 'flex', gap: 15, marginBottom: 15, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
             <MagnifyingGlass size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#86868B' }} />
             <input className="apple-input" placeholder="Zoeken..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ paddingLeft: 40 }} />
          </div>
      </div>

      {/* --- DE TABEL --- */}
      <div className="bento-card" style={{ padding: 0, overflow: 'hidden', minHeight: 400 }}>
        <div className="table-container">
            <table className="apple-table">
                <thead>
                    <tr>
                        <th style={{ width: 90 }}>Datum</th>
                        <th>Account</th>
                        <th>Doelen (Target/DD)</th>
                        <th>Inkoop</th>
                        <th>Boekwaarde</th>
                        <th>Account ID</th>
                        <th>Fase</th>
                        <th>Status</th>
                        <th style={{ width: 40 }}></th>
                    </tr>
                </thead>
                <tbody>
                    {filteredAccounts.map(acc => (
                        <tr key={acc.id} onClick={() => setEditingAccount(acc)} className="hover-row" style={{ cursor: 'pointer', opacity: acc.status === 'Archived' ? 0.5 : 1 }}>
                            <td style={{ color:'var(--text-muted)', fontSize:12 }}>{acc.purchaseDate ? new Date(acc.purchaseDate).toLocaleDateString() : '-'}</td>
                            <td>
                                <div style={{ fontWeight:600 }}>{acc.firm}</div>
                                <div style={{ fontSize:11, color:'var(--text-muted)' }}>{acc.type} • €{acc.balance?.toLocaleString()}</div>
                            </td>
                            <td>
                                <div style={{ fontSize:11, display:'flex', gap:8 }}>
                                    <span style={{ color:'#30D158', fontWeight:600, display:'flex', alignItems:'center', gap:2 }}><Target size={12}/> €{acc.profitTarget ? acc.profitTarget.toLocaleString() : '-'}</span>
                                    <span style={{ color:'#FF3B30', fontWeight:600, display:'flex', alignItems:'center', gap:2 }}><ShieldWarning size={12}/> €{acc.maxDrawdown ? acc.maxDrawdown.toLocaleString() : '-'}</span>
                                </div>
                            </td>
                            <td style={{ fontWeight:500, color: '#1D1D1F' }}>{acc.currency === 'USD' ? '$' : '€'}{acc.originalCost}</td>
                            <td style={{ fontWeight:700, color:'#FF3B30' }}>€{acc.cost}{acc.currency === 'USD' && <span style={{ fontSize:9, color:'#86868B', marginLeft:4 }}>(conv)</span>}</td>
                            <td><div style={{ fontWeight: 600, color:'#1D1D1F' }}>{acc.accountNumber !== '---' ? acc.accountNumber : <span style={{color:'#ccc'}}>-</span>}</div></td>
                            <td>
                                <span style={{ fontSize:10, padding:'2px 6px', borderRadius:4, fontWeight:700, border: '1px solid', borderColor: acc.stage === 'Funded' ? '#30D158' : (acc.stage === 'Phase 2' ? '#007AFF' : (acc.stage === 'Breached' ? '#FF3B30' : '#FF9F0A')), color: acc.stage === 'Funded' ? '#30D158' : (acc.stage === 'Phase 2' ? '#007AFF' : (acc.stage === 'Breached' ? '#FF3B30' : '#FF9F0A')), background: 'transparent' }}>
                                    {acc.stage || 'Phase 1'}
                                </span>
                            </td>
                            <td><span onClick={(e) => toggleStatus(acc, e)} style={{ padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: acc.status === 'Active' ? 'rgba(0, 122, 255, 0.1)' : '#F2F2F7', color: acc.status === 'Active' ? 'var(--blue)' : 'var(--text-muted)' }}>{acc.status}</span></td>
                            <td><button onClick={(e) => handleDelete(acc.id, e)} style={{ border:'none', background:'none', color:'#ccc' }}><Trash size={16} /></button></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* --- EDIT MODAL --- */}
      {editingAccount && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', backdropFilter:'blur(4px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
            <div className="bento-card" style={{ width: '100%', maxWidth: 600, padding: 30, maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                    <div style={{ fontSize:18, fontWeight:800 }}>Account Details</div>
                    <button onClick={() => setEditingAccount(null)} style={{ border:'none', background:'none', cursor:'pointer' }}><X size={24} /></button>
                </div>

                <form onSubmit={handleUpdate}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
                        <div>
                            <div className="label-xs">Basis Info</div>
                            <div className="input-group"><label className="input-label">Firm Naam</label><input className="apple-input" value={editingAccount.firm} onChange={e => setEditingAccount({...editingAccount, firm: e.target.value})} /></div>
                            <div className="input-group"><label className="input-label">Type</label><select className="apple-input" value={editingAccount.type} onChange={e => setEditingAccount({...editingAccount, type: e.target.value})}><option value="2-Step">2-Step</option><option value="1-Step">1-Step</option><option value="3-Step">3-Step</option><option value="Instant">Instant</option></select></div>
                            <div className="input-group"><label className="input-label">Huidige Fase</label><select className="apple-input" value={editingAccount.stage || 'Phase 1'} onChange={e => setEditingAccount({...editingAccount, stage: e.target.value})}><option value="Phase 1">Phase 1 (Evaluation)</option><option value="Phase 2">Phase 2 (Verification)</option><option value="Funded">Funded (Live)</option><option value="Breached">Breached (Failed)</option></select></div>
                            <div className="input-group"><label className="input-label">Grootte</label><input className="apple-input" type="number" value={editingAccount.balance} onChange={e => setEditingAccount({...editingAccount, balance: e.target.value})} /></div>
                        </div>
                        <div>
                            <div className="label-xs">Financieel & Regels</div>
                            <div className="input-group"><label className="input-label">Profit Target (€)</label><input className="apple-input" type="number" value={editingAccount.profitTarget} onChange={e => setEditingAccount({...editingAccount, profitTarget: e.target.value})} /></div>
                            <div className="input-group"><label className="input-label">Max Drawdown (€)</label><input className="apple-input" type="number" value={editingAccount.maxDrawdown} onChange={e => setEditingAccount({...editingAccount, maxDrawdown: e.target.value})} /></div>
                            <div className="input-group" style={{marginTop:15}}><label className="input-label">Valuta</label><select className="apple-input" value={editingAccount.currency} onChange={e => setEditingAccount({...editingAccount, currency: e.target.value})}><option value="EUR">EUR (€)</option><option value="USD">USD ($)</option></select></div>
                            <div className="input-group"><label className="input-label">Boekwaarde (Afschrijving)</label><input className="apple-input" type="number" value={editingAccount.cost} onChange={e => setEditingAccount({...editingAccount, cost: e.target.value})} /></div>
                        </div>
                    </div>
                    <div style={{ marginTop: 20 }}>
                        <div className="label-xs">Referenties</div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
                            <div className="input-group"><label className="input-label">Account ID / Login</label><input className="apple-input" value={editingAccount.accountNumber} onChange={e => setEditingAccount({...editingAccount, accountNumber: e.target.value})} /></div>
                            <div className="input-group"><label className="input-label">Factuur Nummer</label><input className="apple-input" value={editingAccount.invoiceNumber} onChange={e => setEditingAccount({...editingAccount, invoiceNumber: e.target.value})} /></div>
                        </div>
                    </div>
                    <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:20, paddingTop: 20, borderTop: '1px solid #F5F5F7' }}>
                        <button type="button" onClick={() => setEditingAccount(null)} className="btn-primary" style={{ background:'#F2F2F7', color:'#1D1D1F' }}>Annuleren</button>
                        <button type="submit" className="btn-primary" style={{ background:'#007AFF' }}>Wijzigingen Opslaan</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}