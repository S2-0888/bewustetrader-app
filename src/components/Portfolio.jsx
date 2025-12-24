import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Trash, Receipt, MagnifyingGlass, X, Target, ShieldWarning, CreditCard, IdentificationCard, Calendar } from '@phosphor-icons/react';

export default function Portfolio() {
  const [accounts, setAccounts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingAccount, setEditingAccount] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

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

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "accounts"), orderBy("purchaseDate", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const getUsdToEurRate = async () => {
    try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await response.json();
        return data.rates.EUR;
    } catch (error) { return 0.92; }
  };

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
      stage: 'Phase 1', 
      purchaseDate: form.date, status: 'Active', createdAt: new Date()
    });
    
    setForm(prev => ({ ...prev, firm: '', size: '', originalPrice: '', accountNumber: '', invoiceNumber: '', profitTarget: '', maxDrawdown: '' }));
  };

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
    if (confirm('Verwijderen?')) {
      await deleteDoc(doc(db, "users", auth.currentUser.uid, "accounts", id));
    }
  };

  const filteredAccounts = accounts.filter(acc => {
    const s = searchTerm.toLowerCase();
    return acc.firm.toLowerCase().includes(s) || (acc.accountNumber && acc.accountNumber.toString().includes(s));
  });

  const getStageColor = (stage) => {
    switch(stage) {
      case 'Funded': return '#30D158';
      case 'Phase 2': return '#007AFF';
      case 'Breached': return '#FF3B30';
      default: return '#FF9F0A';
    }
  };

  return (
    <div style={{ padding: isMobile ? '20px 15px' : '40px 20px', maxWidth: 1200, margin: '0 auto', paddingBottom: 100 }}>
      
      <div style={{ marginBottom: 30 }}>
        <h1 style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 800, margin: 0 }}>Portfolio</h1>
        <p style={{ color: '#86868B', fontSize: isMobile ? '14px' : '16px' }}>Beheer je trading inventory en accounts.</p>
      </div>

      {/* QUICK ADD */}
      <div className="bento-card" style={{ marginBottom: 30, borderTop: '4px solid #007AFF' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#007AFF', marginBottom: 20, display:'flex', alignItems:'center', gap:6 }}>
            <Receipt size={18} weight="fill" /> SNEL TOEVOEGEN
        </div>
        <form onSubmit={handleQuickAdd}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(150px, 1fr))', gap: 15, alignItems: 'end' }}>
                <div className="input-group" style={{marginBottom:0}}><label className="input-label">Firm</label><input className="apple-input" placeholder="Bijv. FTMO" value={form.firm} onChange={e => setForm({...form, firm: e.target.value})} /></div>
                <div className="input-group" style={{marginBottom:0}}><label className="input-label">Grootte</label><input className="apple-input" type="number" placeholder="100000" value={form.size} onChange={e => setForm({...form, size: e.target.value})} /></div>
                
                <div className="input-group" style={{ marginBottom:0 }}>
                    <label className="input-label">Inkoop</label>
                    <div style={{ display:'flex' }}>
                        <select className="apple-input" style={{ width: 65, borderTopRightRadius:0, borderBottomRightRadius:0, borderRight:'none', background:'#F2F2F7', fontSize: 12 }} value={form.currency} onChange={e => setForm({...form, currency: e.target.value})}>
                            <option value="EUR">€</option>
                            <option value="USD">$</option>
                        </select>
                        <input className="apple-input" style={{ borderTopLeftRadius:0, borderBottomLeftRadius:0 }} type="number" placeholder="Prijs" value={form.originalPrice} onChange={e => setForm({...form, originalPrice: e.target.value})} />
                    </div>
                </div>

                {!isMobile && <div className="input-group" style={{marginBottom:0}}><label className="input-label">Datum</label><input type="date" className="apple-input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>}
                
                <button type="submit" className="btn-primary" style={{ height: 48, background: '#007AFF', fontWeight: 700 }}>Toevoegen</button>
            </div>
        </form>
      </div>

      {/* SEARCH */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
          <MagnifyingGlass size={20} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#86868B' }} />
          <input className="apple-input" placeholder="Zoek op firm of account ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ paddingLeft: 45, height: 45 }} />
      </div>

      {/* ACCOUNTS LIST (MOBILE CARDS / DESKTOP TABLE) */}
      {isMobile ? (
        <div style={{ display: 'grid', gap: 15 }}>
          {filteredAccounts.map(acc => (
            <div key={acc.id} onClick={() => setEditingAccount(acc)} className="bento-card" style={{ padding: 20, opacity: acc.status === 'Archived' ? 0.6 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{acc.firm}</div>
                  <div style={{ fontSize: 12, color: '#86868B' }}>{acc.type} • €{(acc.balance || 0).toLocaleString()}</div>
                </div>
                <div style={{ 
                  fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 20, 
                  background: acc.status === 'Active' ? 'rgba(48, 209, 88, 0.1)' : '#F2F2F7',
                  color: acc.status === 'Active' ? '#30D158' : '#86868B',
                  height: 'fit-content'
                }}>
                  {acc.status.toUpperCase()}
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: '#F5F5F7', padding: 12, borderRadius: 12, marginBottom: 15 }}>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 800, color: '#86868B', textTransform: 'uppercase' }}>Account ID</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{acc.accountNumber || '---'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 800, color: '#86868B', textTransform: 'uppercase' }}>Fase</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: getStageColor(acc.stage) }}>{acc.stage || 'Phase 1'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#FF3B30' }}>Cost: €{acc.cost}</div>
                <button onClick={(e) => handleDelete(acc.id, e)} style={{ border:'none', background:'none', color:'#D2D2D7' }}><Trash size={20} /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bento-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="apple-table">
              <thead>
                  <tr>
                      <th style={{ width: 100 }}>Datum</th>
                      <th>Account</th>
                      <th>Doelen</th>
                      <th>Inkoop</th>
                      <th>Account ID</th>
                      <th>Fase</th>
                      <th>Status</th>
                      <th style={{ width: 50 }}></th>
                  </tr>
              </thead>
              <tbody>
                  {filteredAccounts.map(acc => (
                      <tr key={acc.id} onClick={() => setEditingAccount(acc)} className="hover-row" style={{ cursor: 'pointer', opacity: acc.status === 'Archived' ? 0.5 : 1 }}>
                          <td style={{ color:'#86868B', fontSize:12 }}>{acc.purchaseDate ? new Date(acc.purchaseDate).toLocaleDateString() : '-'}</td>
                          <td>
                              <div style={{ fontWeight:700 }}>{acc.firm}</div>
                              <div style={{ fontSize:11, color:'#86868B' }}>{acc.type} • €{acc.balance?.toLocaleString()}</div>
                          </td>
                          <td>
                              <div style={{ fontSize:11, display:'flex', gap:10 }}>
                                  <span style={{ color:'#30D158', fontWeight:700, display:'flex', alignItems:'center', gap:4 }}><Target size={14}/> €{acc.profitTarget?.toLocaleString()}</span>
                                  <span style={{ color:'#FF3B30', fontWeight:700, display:'flex', alignItems:'center', gap:4 }}><ShieldWarning size={14}/> €{acc.maxDrawdown?.toLocaleString()}</span>
                              </div>
                          </td>
                          <td style={{ fontWeight:700 }}>€{acc.cost}</td>
                          <td><div style={{ fontWeight: 600 }}>{acc.accountNumber}</div></td>
                          <td>
                              <span style={{ fontSize:10, padding:'3px 8px', borderRadius:6, fontWeight:800, background: 'rgba(0,0,0,0.05)', color: getStageColor(acc.stage) }}>
                                  {(acc.stage || 'Phase 1').toUpperCase()}
                              </span>
                          </td>
                          <td>
                            <span onClick={(e) => toggleStatus(acc, e)} style={{ padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800, background: acc.status === 'Active' ? 'rgba(0, 122, 255, 0.1)' : '#F2F2F7', color: acc.status === 'Active' ? '#007AFF' : '#86868B' }}>
                              {acc.status}
                            </span>
                          </td>
                          <td><button onClick={(e) => handleDelete(acc.id, e)} style={{ border:'none', background:'none', color:'#D2D2D7' }}><Trash size={18} /></button></td>
                      </tr>
                  ))}
              </tbody>
          </table>
        </div>
      )}

      {/* EDIT MODAL (RE-DESIGNED) */}
      {editingAccount && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', backdropFilter:'blur(15px)', zIndex:2000, display:'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent:'center' }}>
            <div className="bento-card" style={{ width: '100%', maxWidth: 500, padding: 30, borderRadius: isMobile ? '30px 30px 0 0' : '24px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:25 }}>
                    <div style={{ fontSize:22, fontWeight:900, letterSpacing: '-0.5px' }}>Account Settings</div>
                    <button onClick={() => setEditingAccount(null)} style={{ border:'none', background:'#F2F2F7', width: 36, height: 36, borderRadius: 18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={20} /></button>
                </div>

                <form onSubmit={handleUpdate} style={{ display:'grid', gap:20 }}>
                    <div style={{ display:'grid', gridTemplateColumns: '1fr 1fr', gap:15 }}>
                      <div className="input-group"><label className="input-label">Firm</label><input className="apple-input" value={editingAccount.firm} onChange={e => setEditingAccount({...editingAccount, firm: e.target.value})} /></div>
                      <div className="input-group"><label className="input-label">Fase</label>
                        <select className="apple-input" value={editingAccount.stage || 'Phase 1'} onChange={e => setEditingAccount({...editingAccount, stage: e.target.value})}>
                          <option value="Phase 1">Phase 1</option>
                          <option value="Phase 2">Phase 2</option>
                          <option value="Funded">Funded</option>
                          <option value="Breached">Breached</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display:'grid', gridTemplateColumns: '1fr 1fr', gap:15 }}>
                      <div className="input-group"><label className="input-label">Target (€)</label><input className="apple-input" type="number" value={editingAccount.profitTarget} onChange={e => setEditingAccount({...editingAccount, profitTarget: e.target.value})} /></div>
                      <div className="input-group"><label className="input-label">Max DD (€)</label><input className="apple-input" type="number" value={editingAccount.maxDrawdown} onChange={e => setEditingAccount({...editingAccount, maxDrawdown: e.target.value})} /></div>
                    </div>

                    <div className="input-group"><label className="input-label">Account ID / Login</label>
                      <input className="apple-input" value={editingAccount.accountNumber} onChange={e => setEditingAccount({...editingAccount, accountNumber: e.target.value})} />
                    </div>

                    <div style={{ display:'flex', gap:10, marginTop:10 }}>
                        <button type="submit" className="btn-primary" style={{ flex: 1, height: 50, background: '#007AFF', fontSize: 16 }}>Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}