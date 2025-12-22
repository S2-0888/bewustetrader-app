import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, deleteDoc, doc } from 'firebase/firestore';
import { Plus, Trash, Trophy } from '@phosphor-icons/react'; // Let op: Bank weggehaald als hij niet gebruikt wordt

export default function Portfolio() {
  const [accounts, setAccounts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ firm: '', type: 'Challenge', size: '', phase: 'Phase 1' });

  // 1. DATA OPHALEN
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    
    // We gebruiken hier een try-catch om fouten op te vangen
    try {
        const q = query(collection(db, "users", user.uid, "accounts"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const accList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAccounts(accList);
        });
        return () => unsubscribe();
    } catch (err) {
        console.error("Fout bij laden portfolio:", err);
    }
  }, []);

  // 2. NIEUWE ASSET OPSLAAN
  const handleAddAsset = async () => {
    if (!form.firm || !form.size) return alert("Vul minstens de Firm en Grootte in.");
    
    try {
        const user = auth.currentUser;
        const sizeNum = parseFloat(form.size) || 0; // Veiligheid: zorgt dat het altijd een getal is

        await addDoc(collection(db, "users", user.uid, "accounts"), {
            firm: form.firm,
            type: form.type, 
            phase: form.phase,
            size: sizeNum,
            balance: sizeNum, // Startbalans = Grootte
            createdAt: new Date()
        });
        setShowModal(false);
        setForm({ firm: '', type: 'Challenge', size: '', phase: 'Phase 1' }); 
    } catch (error) { console.error("Fout bij opslaan:", error); }
  };

  // 3. VERWIJDEREN
  const handleDelete = async (id) => {
    if(confirm("Account verwijderen?")) {
        try {
            await deleteDoc(doc(db, "users", auth.currentUser.uid, "accounts", id));
        } catch (error) { console.error("Fout bij verwijderen:", error); }
    }
  };

  return (
    <div className="portfolio-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h1>Portfolio</h1>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Nieuwe Asset
          </button>
      </div>

      {/* ASSET GRID */}
      <div className="grid-2">
        {accounts.map(acc => {
            // VEILIGHEIDSCHECK: Zorg dat getallen bestaan voordat we toLocaleString doen
            const balance = acc.balance || 0;
            const size = acc.size || 0;
            
            return (
                <div key={acc.id} className="card" style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 15, right: 15, cursor: 'pointer', color: 'var(--muted)' }}>
                        <Trash size={18} onClick={() => handleDelete(acc.id)} />
                    </div>
                    
                    <div style={{ fontWeight: 700, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Trophy size={20} color="var(--accent)" />
                        {acc.firm || "Naamloos"}
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: '0.85rem', color: 'var(--muted)' }}>
                        <span>{acc.type}</span>
                        <span className="badge badge-blue">{acc.phase}</span>
                    </div>

                    <div className="money-display" style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: 15 }}>
                        €{balance.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Start: €{size.toLocaleString()}</div>

                    {/* Progress Bar */}
                    <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, marginTop: 15, overflow: 'hidden' }}>
                        <div style={{ 
                            width: '100%', 
                            height: '100%', 
                            background: balance >= size ? 'var(--success)' : 'var(--danger)' 
                        }}></div>
                    </div>
                </div>
            );
        })}
      </div>

      {accounts.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--muted)', marginTop: 40 }}>
              Nog geen accounts. Klik op "Nieuwe Asset" om te beginnen.
          </div>
      )}

      {/* --- MODAL VOOR TOEVOEGEN --- */}
      {showModal && (
          <div className="modal-overlay" style={{ display: 'flex' }}>
              <div className="modal">
                  <h2>Nieuwe Investering</h2>
                  
                  <label className="input-label">Prop Firm Naam</label>
                  <input type="text" placeholder="Bijv. Funded Engineer" value={form.firm} onChange={e => setForm({...form, firm: e.target.value})} />
                  
                  <div className="grid-2">
                      <div>
                          <label className="input-label">Type</label>
                          <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                              <option>Challenge</option>
                              <option>Funded Account</option>
                              <option>Personal Capital</option>
                          </select>
                      </div>
                      <div>
                          <label className="input-label">Fase</label>
                          <select value={form.phase} onChange={e => setForm({...form, phase: e.target.value})}>
                              <option>Phase 1</option>
                              <option>Phase 2</option>
                              <option>Funded / Live</option>
                          </select>
                      </div>
                  </div>

                  <label className="input-label">Account Grootte (€)</label>
                  <input type="number" placeholder="100000" value={form.size} onChange={e => setForm({...form, size: e.target.value})} />

                  <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
                      <button className="btn btn-primary" onClick={handleAddAsset}>Opslaan</button>
                      <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Annuleren</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}