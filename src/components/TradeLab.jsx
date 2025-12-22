import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, updateDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { PlusCircle, Trash, X, Gear, Plus } from '@phosphor-icons/react'; // Gear icoon toegevoegd

export default function TradeLab() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  
  // Standaard regels als startpunt
  const defaultRules = [
    { id: 'r1', text: "Liquiditeit Sweep", checked: false },
    { id: 'r2', text: "Break of Structure", checked: false },
    { id: 'r3', text: "Risk Management OK", checked: false }
  ];

  const [rules, setRules] = useState(defaultRules);
  const [isEditingRules, setIsEditingRules] = useState(false); // Modus om regels aan te passen
  const [newRuleText, setNewRuleText] = useState('');

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    ticker: '',
    risk: '',
    strategy: '-',
    screenshot: ''
  });

  const [trades, setTrades] = useState([]);
  const [closeModal, setCloseModal] = useState({ isOpen: false, tradeId: null, risk: 0, accountId: null });
  const [pnlInput, setPnlInput] = useState('');

  // --- 1. DATA OPHALEN ---
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // A. Haal Trades op
    const qTrades = query(collection(db, "users", user.uid, "trades"), orderBy("date", "desc"));
    const unsubTrades = onSnapshot(qTrades, (snapshot) => {
      setTrades(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // B. Haal Accounts op
    const qAccounts = query(collection(db, "users", user.uid, "accounts"));
    const unsubAccounts = onSnapshot(qAccounts, (snapshot) => {
      const accs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAccounts(accs);
      if(accs.length > 0 && !selectedAccount) setSelectedAccount(accs[0].id);
    });

    // C. Haal OPGESLAGEN Regels op (NIEUW!)
    const fetchRules = async () => {
        const docRef = doc(db, "users", user.uid, "settings", "config");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().rules) {
            // Zet 'checked' standaard op false bij laden
            setRules(docSnap.data().rules.map(r => ({...r, checked: false})));
        }
    };
    fetchRules();

    return () => { unsubTrades(); unsubAccounts(); };
  }, []);

  // --- 2. REGELS BEHEREN (NIEUW) ---
  const saveRulesToDB = async (updatedRules) => {
      const user = auth.currentUser;
      // We slaan alleen ID en Tekst op, niet of ze aangevinkt zijn (dat is per trade)
      const rulesToSave = updatedRules.map(({id, text}) => ({id, text}));
      await setDoc(doc(db, "users", user.uid, "settings", "config"), { rules: rulesToSave }, { merge: true });
  };

  const handleAddRule = async () => {
      if(!newRuleText.trim()) return;
      const newRule = { id: Date.now().toString(), text: newRuleText, checked: false };
      const updatedRules = [...rules, newRule];
      setRules(updatedRules);
      setNewRuleText('');
      await saveRulesToDB(updatedRules);
  };

  const handleDeleteRule = async (ruleId) => {
      const updatedRules = rules.filter(r => r.id !== ruleId);
      setRules(updatedRules);
      await saveRulesToDB(updatedRules);
  };

  // --- 3. OVERIGE LOGICA ---
  const handleToggleRule = (id) => {
    setRules(rules.map(r => r.id === id ? { ...r, checked: !r.checked } : r));
  };

  const handleAddTrade = async () => {
    if (!form.ticker || !form.risk || form.strategy === '-') return alert("Vul alles in!");
    if (!selectedAccount) return alert("Selecteer eerst een account.");

    try {
        const user = auth.currentUser;
        const score = (rules.filter(r => r.checked).length / rules.length) * 100;

        await addDoc(collection(db, "users", user.uid, "trades"), {
            accountId: selectedAccount,
            date: form.date,
            ticker: form.ticker.toUpperCase(),
            risk: parseFloat(form.risk),
            strategy: form.strategy,
            screenshot: form.screenshot,
            status: 'OPEN',
            result: 0,
            score: isNaN(score) ? 0 : score, // Voorkom NaN als er geen regels zijn
            createdAt: new Date()
        });
        setForm({ ...form, ticker: '', risk: '', strategy: '-', screenshot: '' });
        setRules(rules.map(r => ({ ...r, checked: false })));
    } catch (error) { console.error("Error:", error); }
  };

  const handleDelete = async (id) => {
      if(confirm("Trade verwijderen?")) await deleteDoc(doc(db, "users", auth.currentUser.uid, "trades", id));
  };

  const handleFinalizeTrade = async () => {
      if(!pnlInput) return alert("Vul een bedrag in!");
      const pnl = parseFloat(pnlInput);
      const risk = closeModal.risk;
      const rResult = risk !== 0 ? parseFloat((pnl / risk).toFixed(2)) : 0;

      try {
          const user = auth.currentUser;
          const tradeRef = doc(db, "users", user.uid, "trades", closeModal.tradeId);
          await updateDoc(tradeRef, { status: 'CLOSED', result: rResult, pnl: pnl });

          if (closeModal.accountId) {
              const accountRef = doc(db, "users", user.uid, "accounts", closeModal.accountId);
              const accountSnap = await getDoc(accountRef);
              if (accountSnap.exists()) {
                  await updateDoc(accountRef, { balance: accountSnap.data().balance + pnl });
              }
          }
          setCloseModal({ isOpen: false, tradeId: null, risk: 0, accountId: null });
      } catch (error) { console.error("Fout bij sluiten:", error); }
  };

  return (
    <div className="tradelab-container">
        {/* HEADER & ACCOUNT */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h1>Trade Lab</h1>
            <select style={{ width: 250, fontWeight: 'bold', color: 'var(--primary)' }} value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}>
                {accounts.length === 0 && <option value="">Geen accounts gevonden</option>}
                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.firm} (€{acc.balance.toLocaleString()})</option>)}
            </select>
        </div>

        {/* INVOER CARD */}
        <div className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
            <div className="grid-3">
                <div><label className="input-label">DATUM</label><input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
                <div><label className="input-label">TICKER</label><input type="text" placeholder="EURUSD" value={form.ticker} onChange={e => setForm({...form, ticker: e.target.value.toUpperCase()})} /></div>
                <div><label className="input-label">RISK (€)</label><input type="number" placeholder="250" value={form.risk} onChange={e => setForm({...form, risk: e.target.value})} /></div>
            </div>
            <div className="grid-2" style={{ marginBottom: 20 }}>
                <div>
                    <label className="input-label">STRATEGIE</label>
                    <select value={form.strategy} onChange={e => setForm({...form, strategy: e.target.value})}>
                        <option value="-">Kies strategie...</option>
                        <option value="Pullback">Pullback</option>
                        <option value="Breakout">Breakout</option>
                        <option value="Reversal">Reversal</option>
                    </select>
                </div>
                <div><label className="input-label">SCREENSHOT</label><input type="url" placeholder="https://..." value={form.screenshot} onChange={e => setForm({...form, screenshot: e.target.value})} /></div>
            </div>
            
            {/* REGELS SECTION (VERNIEUWD) */}
            <div style={{ background: '#f8fafc', padding: 15, borderRadius: 8, border: '1px solid var(--border)', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.8rem', letterSpacing: 1 }}>JOUW REGELS</div>
                    <button className="btn btn-ghost btn-sm" onClick={() => setIsEditingRules(!isEditingRules)}>
                        <Gear size={16} /> {isEditingRules ? 'Klaar' : 'Aanpassen'}
                    </button>
                </div>

                {rules.map(rule => (
                    <div key={rule.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 5 }}>
                        {isEditingRules ? (
                            // EDIT MODUS: Toon prullenbak
                            <>
                                <button onClick={() => handleDeleteRule(rule.id)} style={{ border: 'none', background: 'transparent', color: 'var(--danger)', cursor: 'pointer', marginRight: 10 }}>
                                    <Trash size={16} />
                                </button>
                                <span>{rule.text}</span>
                            </>
                        ) : (
                            // CHECK MODUS: Toon checkbox
                            <label className="checklist-item" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', width: '100%' }}>
                                <input type="checkbox" checked={rule.checked} onChange={() => handleToggleRule(rule.id)} style={{ width: 'auto', marginRight: 10 }} /> 
                                {rule.text}
                            </label>
                        )}
                    </div>
                ))}

                {/* NIEUWE REGEL TOEVOEGEN */}
                {isEditingRules && (
                    <div style={{ display: 'flex', gap: 10, marginTop: 10, borderTop: '1px solid #e2e8f0', paddingTop: 10 }}>
                        <input type="text" placeholder="Nieuwe regel..." value={newRuleText} onChange={e => setNewRuleText(e.target.value)} style={{ marginBottom: 0 }} />
                        <button className="btn btn-primary btn-sm" onClick={handleAddRule}><Plus size={16} /></button>
                    </div>
                )}
            </div>
            <button className="btn btn-primary" onClick={handleAddTrade}><PlusCircle size={20} /> Log Trade</button>
        </div>

        {/* TABEL (Onveranderd) */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table>
                <thead>
                    <tr><th>Datum</th><th>Ticker</th><th>Score</th><th>Risk</th><th>R</th><th>P&L</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                    {trades.map(trade => (
                        <tr key={trade.id}>
                            <td>{trade.date}</td>
                            <td><span style={{ fontWeight: 600 }}>{trade.ticker}</span><div style={{fontSize:'0.7em', color:'gray'}}>{trade.strategy}</div></td>
                            <td><span className={`score-badge ${trade.score >= 90 ? 'score-good' : 'score-bad'}`}>{trade.score.toFixed(0)}%</span></td>
                            <td>€{trade.risk}</td>
                            <td>{trade.result}R</td>
                            <td className="money-display" style={{ color: trade.pnl > 0 ? 'var(--success)' : (trade.pnl < 0 ? 'var(--danger)' : 'inherit') }}>
                                {trade.status === 'CLOSED' ? `€${trade.pnl}` : '-'}
                            </td>
                            <td><span className={`badge ${trade.status === 'OPEN' ? 'badge-blue' : 'badge-gray'}`}>{trade.status}</span></td>
                            <td>
                                {trade.status === 'OPEN' && <button className="btn btn-primary btn-sm" onClick={() => setCloseModal({isOpen:true, tradeId:trade.id, risk:trade.risk, accountId:trade.accountId})}>Sluiten</button>}
                                <Trash size={18} className="row-action" onClick={() => handleDelete(trade.id)} style={{marginLeft: 10}}/>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        
        {/* MODAL */}
        {closeModal.isOpen && (
            <div className="modal-overlay">
                <div className="modal">
                    <h2>Resultaat</h2>
                    <label>P&L in Euro's</label>
                    <input type="number" autoFocus value={pnlInput} onChange={e => setPnlInput(e.target.value)} style={{fontSize:'1.5rem', textAlign:'center'}} />
                    <button className="btn btn-primary" style={{width:'100%', marginTop:10}} onClick={handleFinalizeTrade}>Opslaan</button>
                    <button className="btn btn-ghost" style={{width:'100%', marginTop:5}} onClick={() => setCloseModal({isOpen:false, tradeId:null})}>Annuleren</button>
                </div>
            </div>
        )}
    </div>
  );
}