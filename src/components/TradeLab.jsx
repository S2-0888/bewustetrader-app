import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import { PlusCircle, Trash, X, Check } from '@phosphor-icons/react';

export default function TradeLab() {
  // --- STATE ---
  const [accounts, setAccounts] = useState([]); // <--- NIEUW: Lijst met accounts
  const [selectedAccount, setSelectedAccount] = useState(''); // <--- NIEUW: Welk account traden we?

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    ticker: '',
    risk: '',
    strategy: '-',
    screenshot: ''
  });

  const [rules, setRules] = useState([
    { id: 1, text: "Liquiditeit Sweep", checked: false },
    { id: 2, text: "Break of Structure", checked: false },
    { id: 3, text: "Geen High Impact Nieuws", checked: false },
    { id: 4, text: "Risk Management OK", checked: false }
  ]);

  const [trades, setTrades] = useState([]);
  
  // State voor de 'Sluiten' Pop-up
  const [closeModal, setCloseModal] = useState({ isOpen: false, tradeId: null, risk: 0, accountId: null });
  const [pnlInput, setPnlInput] = useState('');

  // --- 1. DATA OPHALEN (Trades EN Accounts) ---
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Haal trades op
    const qTrades = query(collection(db, "users", user.uid, "trades"), orderBy("date", "desc"));
    const unsubTrades = onSnapshot(qTrades, (snapshot) => {
      setTrades(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Haal accounts op (NIEUW)
    const qAccounts = query(collection(db, "users", user.uid, "accounts"));
    const unsubAccounts = onSnapshot(qAccounts, (snapshot) => {
      const accs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAccounts(accs);
      // Selecteer automatisch de eerste als er nog geen geselecteerd is
      if(accs.length > 0 && !selectedAccount) setSelectedAccount(accs[0].id);
    });

    return () => { unsubTrades(); unsubAccounts(); };
  }, []);

  // --- 2. LOGICA ---
  const handleToggleRule = (id) => {
    setRules(rules.map(r => r.id === id ? { ...r, checked: !r.checked } : r));
  };

  const handleAddTrade = async () => {
    if (!form.ticker || !form.risk || form.strategy === '-') return alert("Vul alles in!");
    if (!selectedAccount) return alert("Selecteer eerst een account (of maak er een aan in Portfolio).");

    try {
        const user = auth.currentUser;
        const score = (rules.filter(r => r.checked).length / rules.length) * 100;

        await addDoc(collection(db, "users", user.uid, "trades"), {
            accountId: selectedAccount, // <--- We slaan op bij welk account dit hoort
            date: form.date,
            ticker: form.ticker.toUpperCase(),
            risk: parseFloat(form.risk),
            strategy: form.strategy,
            screenshot: form.screenshot,
            status: 'OPEN',
            result: 0,
            score: score,
            createdAt: new Date()
        });
        setForm({ ...form, ticker: '', risk: '', strategy: '-', screenshot: '' });
        setRules(rules.map(r => ({ ...r, checked: false })));
    } catch (error) { console.error("Error:", error); }
  };

  const handleDelete = async (id) => {
      if(confirm("Trade verwijderen?")) {
          await deleteDoc(doc(db, "users", auth.currentUser.uid, "trades", id));
      }
  };

  // --- 3. TRADE SLUITEN & BALANS UPDATEN ---
  const openCloseModal = (trade) => {
      // We geven nu ook het accountId mee aan de modal
      setCloseModal({ isOpen: true, tradeId: trade.id, risk: trade.risk, accountId: trade.accountId });
      setPnlInput(''); 
  };

  const handleFinalizeTrade = async () => {
      if(!pnlInput) return alert("Vul een bedrag in!");
      
      const pnl = parseFloat(pnlInput);
      const risk = closeModal.risk;
      const rResult = parseFloat((pnl / risk).toFixed(2));

      try {
          const user = auth.currentUser;

          // A. Update de Trade status
          const tradeRef = doc(db, "users", user.uid, "trades", closeModal.tradeId);
          await updateDoc(tradeRef, {
              status: 'CLOSED',
              result: rResult,
              pnl: pnl
          });

          // B. Update de Account Balans (De Magie ✨)
          if (closeModal.accountId) {
              const accountRef = doc(db, "users", user.uid, "accounts", closeModal.accountId);
              const accountSnap = await getDoc(accountRef);
              
              if (accountSnap.exists()) {
                  const currentBalance = accountSnap.data().balance;
                  await updateDoc(accountRef, {
                      balance: currentBalance + pnl
                  });
              }
          }
          
          setCloseModal({ isOpen: false, tradeId: null, risk: 0, accountId: null });

      } catch (error) {
          console.error("Fout bij sluiten:", error);
      }
  };

  return (
    <div className="tradelab-container">
        {/* HEADER & ACCOUNT SELECTIE */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h1>Trade Lab</h1>
            <select 
                style={{ width: 250, margin: 0, fontWeight: 'bold', color: 'var(--primary)' }}
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
            >
                {accounts.length === 0 && <option value="">Maak eerst een account in Portfolio!</option>}
                {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                        {acc.firm} (€{acc.balance.toLocaleString()})
                    </option>
                ))}
            </select>
        </div>

        {/* INVOER FORMULIER (Hetzelfde als eerst) */}
        <div className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
            <h3 style={{ marginBottom: 20 }}>Nieuwe Trade</h3>
            <div className="grid-3" style={{ marginBottom: 10 }}>
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
                        <option value="Fakeout">Fakeout</option>
                        <option value="FOMO">FOMO</option>
                    </select>
                </div>
                <div><label className="input-label">SCREENSHOT</label><input type="url" placeholder="https://..." value={form.screenshot} onChange={e => setForm({...form, screenshot: e.target.value})} /></div>
            </div>
            
            <div style={{ background: '#f8fafc', padding: 15, borderRadius: 8, border: '1px solid var(--border)', marginBottom: 20 }}>
                <div style={{ fontWeight: 700, marginBottom: 10, color: 'var(--primary)', fontSize: '0.8rem', letterSpacing: 1 }}>JOUW REGELS</div>
                {rules.map(rule => (
                    <label key={rule.id} className="checklist-item" style={{ display: 'flex', alignItems: 'center', marginBottom: 5, padding: 5, borderRadius: 4, cursor: 'pointer' }}>
                        <input type="checkbox" checked={rule.checked} onChange={() => handleToggleRule(rule.id)} style={{ width: 'auto', marginRight: 10 }} /> {rule.text}
                    </label>
                ))}
            </div>
            <button className="btn btn-primary" onClick={handleAddTrade}><PlusCircle size={20} /> Log Trade</button>
        </div>

        {/* TABEL */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: 30 }}>
            <table>
                <thead>
                    <tr><th>Datum</th><th>Ticker</th><th>Discipline</th><th>Risk</th><th>Result</th><th>P&L</th><th>Status</th><th>Actie</th></tr>
                </thead>
                <tbody>
                    {trades.map(trade => (
                        <tr key={trade.id}>
                            <td>{trade.date}</td>
                            <td>
                                <span style={{ fontWeight: 600 }}>{trade.ticker}</span>
                                <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{trade.strategy}</div>
                            </td>
                            <td><span className={`score-badge ${trade.score >= 90 ? 'score-good' : 'score-bad'}`}>{trade.score.toFixed(0)}%</span></td>
                            <td className="money-display">€{trade.risk}</td>
                            <td>{trade.result}R</td>
                            <td className="money-display" style={{ fontWeight: 700, color: trade.result >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                {trade.status === 'CLOSED' ? `€${(trade.pnl || (trade.result * trade.risk)).toFixed(0)}` : '-'}
                            </td>
                            <td><span className={`badge ${trade.status === 'OPEN' ? 'badge-blue' : 'badge-gray'}`}>{trade.status}</span></td>
                            <td style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                {trade.status === 'OPEN' && (
                                    <button className="btn btn-primary btn-sm" onClick={() => openCloseModal(trade)}>Sluiten</button>
                                )}
                                <Trash size={18} className="row-action" onClick={() => handleDelete(trade.id)} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* POP-UP */}
        {closeModal.isOpen && (
            <div className="modal-overlay" style={{display: 'flex'}}>
                <div className="modal">
                    <h2>Resultaat Boeken</h2>
                    <p>Wat was het resultaat in Euro's?</p>
                    
                    <label style={{fontWeight:'bold'}}>Netto P&L (€)</label>
                    <input 
                        type="number" 
                        autoFocus
                        value={pnlInput} 
                        onChange={e => setPnlInput(e.target.value)}
                        style={{ fontSize: '1.5rem', fontWeight: 'bold', textAlign: 'center' }} 
                    />

                    <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
                        <button className="btn btn-primary" onClick={handleFinalizeTrade}>Opslaan & Balans Updaten</button>
                        <button className="btn btn-ghost" onClick={() => setCloseModal({isOpen:false, tradeId:null})}>Annuleren</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}