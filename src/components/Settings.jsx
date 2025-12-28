import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { 
    doc, getDoc, setDoc, collection, addDoc, 
    query, where, getDocs, writeBatch, orderBy, 
    onSnapshot, updateDoc, serverTimestamp 
} from 'firebase/firestore';
import { 
    User, CreditCard, Faders, Plus, X, FloppyDisk, 
    ArrowCounterClockwise, Strategy, CheckCircle, 
    Warning, Tag, UploadSimple, Table, Database, Trash,
    ClockCounterClockwise, ChatCircleText, EnvelopeSimple, MagnifyingGlass,
    LockSimple, PaperPlaneTilt, Robot
} from '@phosphor-icons/react';
import Papa from 'papaparse'; 

// --- OPTIMIZED IMPORT MODULE COMPONENT WITH BATCHING ---
const ImportModule = ({ type = 'payouts', onImportComplete }) => {
    const [csvData, setCsvData] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [mapping, setMapping] = useState({});
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
  
    const mandatoryFields = type === 'payouts' 
      ? ['date', 'source', 'amount'] 
      : ['purchaseDate', 'firm', 'originalPrice'];

    const optionalFields = type === 'payouts' ? ['accountNumber'] : ['size', 'accountNumber'];
    const allFields = [...mandatoryFields, ...optionalFields];
  
    const handleFileUpload = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setHeaders(Object.keys(results.data[0]));
          setCsvData(results.data);
          setStep(2);
        }
      });
    };
  
    const executeImport = async () => {
      setLoading(true);
      const user = auth.currentUser;
      const collectionName = type === 'payouts' ? 'payouts' : 'accounts';
      const batchId = `Batch-${new Date().getTime()}`; 
      
      try {
        const batchPromises = csvData.map(row => {
          const newDoc = {
            createdAt: new Date(),
            sourceType: 'import', 
            sourceBatch: batchId, 
            ...allFields.reduce((acc, field) => {
              const csvColumn = mapping[field];
              let val = csvColumn ? row[csvColumn] : null;

              if ((field === 'date' || field === 'purchaseDate') && val) {
                const cleanVal = val.toString().trim();
                const parts = cleanVal.split(/[-/]/);
                if (parts.length === 3) {
                  const d = parts[0].padStart(2, '0');
                  const m = parts[1].padStart(2, '0');
                  const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
                  val = `${y}-${m}-${d}`;
                } else if (parts.length === 2) {
                  val = `2023-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`; 
                }
              }

              if (['amount', 'originalPrice', 'size'].includes(field) && val) {
                val = Number(val.toString().replace(/[^0-9.-]+/g, ""));
              }
              
              if (!val && field === 'accountNumber') val = 'Imported';
              if (!val && field === 'size') val = 100000; 

              acc[field] = val;
              return acc;
            }, {})
          };

          if (type === 'payouts') {
              newDoc.convertedAmount = newDoc.amount || 0;
              newDoc.currency = 'USD';
          } else {
              newDoc.status = 'Inactive';
              newDoc.stage = 'Archived'; 
              newDoc.balance = Number(newDoc.size) || 0;
              newDoc.startBalance = Number(newDoc.size) || 0;
          }
          return addDoc(collection(db, "users", user.uid, collectionName), newDoc);
        });

        await Promise.all(batchPromises);
        if(onImportComplete) onImportComplete(); 
        setStep(3);
      } catch (err) { 
        console.error("Import error:", err);
        alert("Import failed.");
      } finally { 
        setLoading(false); 
      }
    };

    const isReadyToImport = mandatoryFields.every(f => mapping[f] && mapping[f] !== "");
  
    return (
      <div className="bento-card" style={{ padding: 25, background: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <UploadSimple size={22} weight="bold" color={type === 'payouts' ? '#30D158' : '#007AFF'} />
          <h4 style={{ fontWeight: 800, margin: 0, fontSize: 15 }}>{type === 'payouts' ? 'Import Payouts' : 'Import Challenges'}</h4>
        </div>
  
        {step === 1 && (
          <div style={{ textAlign: 'center', padding: '30px 10px', border: '2px dashed #F2F2F7', borderRadius: 16 }}>
            <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} id={`file-${type}`} />
            <label htmlFor={`file-${type}`} style={{ cursor: 'pointer' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#007AFF' }}>Choose CSV file</div>
              <div style={{ fontSize: 10, color: '#86868B', marginTop: 4 }}>Select spreadsheet export</div>
            </label>
          </div>
        )}
  
        {step === 2 && (
          <div style={{ display: 'grid', gap: 10 }}>
            {allFields.map(field => (
              <div key={field} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700 }}>{field.toUpperCase()} {mandatoryFields.includes(field) && '*'}</span>
                <select className="apple-input" style={{ width: '60%', padding: '6px', fontSize: 12 }} onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}>
                  <option value="">Skip...</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
            <button onClick={executeImport} disabled={loading || !isReadyToImport} className="btn-primary" style={{ marginTop: 10, height: 42, background: isReadyToImport ? '#1D1D1F' : '#E5E5EA' }}>
              {loading ? 'Processing...' : 'Start Import'}
            </button>
          </div>
        )}
  
        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '10px' }}>
            <CheckCircle size={32} weight="fill" color="#30D158" />
            <div style={{ fontSize: 13, fontWeight: 800, marginTop: 10 }}>Import Successful!</div>
            <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: '#007AFF', fontSize: 11, marginTop: 8, cursor: 'pointer' }}>Import another file</button>
          </div>
        )}
      </div>
    );
};

// --- MAIN SETTINGS COMPONENT ---
export default function Settings() {
  const [activeTab, setActiveTab] = useState('trading'); 
  const [activeConfig, setActiveConfig] = useState('strategies'); 
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [inputValue, setInputValue] = useState(''); 
  const [isWiping, setIsWiping] = useState(false);
  const [recentBatches, setRecentBatches] = useState([]);
  
  // --- MESSAGING STATE ---
  const [myFeedback, setMyFeedback] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [replyInputs, setReplyInputs] = useState({});

  // Listen for personal messages/feedback
  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
        collection(db, "beta_feedback"), 
        where("userId", "==", auth.currentUser.uid), 
        orderBy("updatedAt", "desc")
    );
    return onSnapshot(q, (snapshot) => {
        setMyFeedback(snapshot.docs.map(d => ({id: d.id, ...d.data()})));
    });
  }, []);

  const markRead = async (id) => {
    await updateDoc(doc(db, "beta_feedback", id), { isRead: true });
  };

  const sendFollowUp = async (id) => {
    const text = replyInputs[id];
    if (!text) return;
    
    await updateDoc(doc(db, "beta_feedback", id), {
        message: text, 
        status: 'open',
        isRead: true,
        updatedAt: serverTimestamp()
    });
    setReplyInputs(prev => ({ ...prev, [id]: '' }));
  };

  // Filter logic for the inbox
  const filteredMessages = myFeedback.filter(msg => {
    const matchesSearch = msg.message.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (msg.reply && msg.reply.toLowerCase().includes(searchQuery.toLowerCase()));
    if (filter === 'unread') return matchesSearch && msg.status === 'replied' && !msg.isRead;
    if (filter === 'replied') return matchesSearch && msg.reply;
    return matchesSearch;
  });

  // Fetch recent import sessions
  const fetchRecentBatches = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const collections = ['accounts', 'payouts'];
    const batchesMap = {};
    for (const colName of collections) {
        const q = query(collection(db, "users", user.uid, colName), where("sourceType", "==", "import"));
        const snap = await getDocs(q);
        snap.docs.forEach(doc => {
            const data = doc.data();
            if (data.sourceBatch) {
                if (!batchesMap[data.sourceBatch]) {
                    batchesMap[data.sourceBatch] = { 
                        id: data.sourceBatch, 
                        date: data.createdAt?.toDate() || new Date(), 
                        count: 0, 
                        type: colName === 'payouts' ? 'Payouts' : 'Challenges' 
                    };
                }
                batchesMap[data.sourceBatch].count++;
            }
        });
    }
    setRecentBatches(Object.values(batchesMap).sort((a,b) => b.date - a.date));
  };

  useEffect(() => {
    const fetchSettings = async () => {
        const user = auth.currentUser;
        if (!user) return;
        const docRef = doc(db, "users", user.uid, "settings", "tradelab");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setConfig(docSnap.data());
        setLoading(false);
        fetchRecentBatches();
    };
    fetchSettings();
  }, []);

  const handleWipeBatch = async (batchId) => {
      if (!confirm(`Are you sure you want to delete this import batch? (${batchId})`)) return;
      setIsWiping(true);
      const user = auth.currentUser;
      try {
          const collections = ['accounts', 'payouts'];
          for (const colName of collections) {
              const q = query(collection(db, "users", user.uid, colName), where("sourceBatch", "==", batchId));
              const snap = await getDocs(q);
              const batch = writeBatch(db);
              snap.docs.forEach((d) => batch.delete(d.ref));
              await batch.commit();
          }
          fetchRecentBatches(); 
      } catch (err) {
          console.error(err);
      } finally {
          setIsWiping(false);
      }
  };

  const addItem = () => {
      const val = inputValue.trim();
      if (!val || config[activeConfig]?.includes(val)) return;
      setConfig({ ...config, [activeConfig]: [...(config[activeConfig] || []), val] });
      setInputValue('');
      setUnsavedChanges(true);
  };

  const removeItem = (itemToRemove) => {
      setConfig({ ...config, [activeConfig]: config[activeConfig].filter(i => i !== itemToRemove) });
      setUnsavedChanges(true);
  };

  const handleSave = async () => {
      const user = auth.currentUser;
      if (!user) return;
      await setDoc(doc(db, "users", user.uid, "settings", "tradelab"), config);
      setUnsavedChanges(false);
      alert('Saved successfully!');
  };

  if (loading) return <div style={{ padding:40, color:'#86868B' }}>Loading System Architect...</div>;

  return (
    <div style={{ padding: '40px 20px', maxWidth: 1000, margin: '0 auto', background: '#F5F5F7', minHeight: '100vh' }}>
      
      <div style={{ marginBottom: 30 }}>
            <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, letterSpacing: '-1px' }}>System Architect</h1>
            <p style={{ color: '#86868B' }}>Configure your trading ecosystem and communications.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 40 }}>
          <div style={{ display:'flex', flexDirection:'column', gap: 5 }}>
              <MenuButton label="Trading System" icon={<Faders size={20}/>} active={activeTab==='trading'} onClick={()=>setActiveTab('trading')} />
              <MenuButton label="Migration Hub" icon={<Database size={20}/>} active={activeTab==='import'} onClick={()=>setActiveTab('import')} />
              
              <div style={{ position: 'relative' }}>
                <MenuButton 
                  label="Message Center" 
                  icon={<EnvelopeSimple size={20}/>} 
                  active={activeTab==='messages'} 
                  onClick={()=>setActiveTab('messages')} 
                />
                {myFeedback.some(m => m.status === 'replied' && !m.isRead) && (
                  <div style={{ position: 'absolute', right: 12, top: 14, width: 8, height: 8, background: '#FF3B30', borderRadius: '50%', border: '2px solid #F5F5F7' }} />
                )}
              </div>

              <MenuButton label="Account" icon={<User size={20}/>} active={activeTab==='account'} onClick={()=>setActiveTab('account')} />
          </div>

          <div>
              {activeTab === 'trading' && (
                  <div className="bento-card" style={{ padding: 0, overflow:'hidden', minHeight: 500, display:'flex', flexDirection:'column', background: 'white' }}>
                      <div style={{ padding: 15, borderBottom: '1px solid #F2F2F7', background:'#F9F9F9', display:'flex', gap:5 }}>
                          {CATEGORIES.map(cat => (
                              <button key={cat.id} onClick={() => setActiveConfig(cat.id)} style={{ flex: 1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding: '10px', borderRadius: 8, border:'none', fontSize:12, fontWeight:600, cursor:'pointer', background: activeConfig === cat.id ? 'white' : 'transparent', color: activeConfig === cat.id ? '#1D1D1F' : '#86868B', boxShadow: activeConfig === cat.id ? '0 2px 5px rgba(0,0,0,0.05)' : 'none' }}>
                                  <span style={{ color: activeConfig === cat.id ? cat.color : 'inherit' }}>{cat.icon}</span> {cat.label}
                              </button>
                          ))}
                      </div>
                      <div style={{ padding: 30, flex:1 }}>
                          <h3 style={{ margin:0, fontSize:18, display:'flex', alignItems:'center', gap:10 }}>Manage {CATEGORIES.find(c=>c.id===activeConfig).label}</h3>
                          <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginTop: 20 }}>
                              {(config[activeConfig] || []).map((item, idx) => (
                                  <div key={idx} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', borderRadius:20, background:'#F5F5F7', fontSize:13, fontWeight:600 }}>
                                      {item} <X size={12} style={{cursor:'pointer'}} onClick={() => removeItem(item)}/>
                                  </div>
                              ))}
                          </div>
                          <div style={{ marginTop: 40, display:'flex', gap:10 }}>
                              <input className="apple-input" placeholder="Add new..." value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem()} />
                              <button onClick={addItem} style={{ width:50, background:'#007AFF', color:'white', border:'none', borderRadius:10, cursor:'pointer' }}><Plus weight="bold"/></button>
                          </div>
                      </div>
                      <div style={{ padding: 15, background:'#F9F9F9', borderTop:'1px solid #F2F2F7', textAlign:'right' }}>
                          <button onClick={handleSave} className="btn-primary" style={{ padding:'8px 20px', background: unsavedChanges ? '#007AFF' : '#C7C7CC' }}>Save Changes</button>
                      </div>
                  </div>
              )}

              {activeTab === 'import' && (
                  <div style={{ display:'grid', gap:20 }}>
                      <div style={{ background: 'rgba(0,122,255,0.05)', padding: 20, borderRadius: 20, border: '1px solid rgba(0,122,255,0.1)' }}>
                          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Migration Hub</h3>
                          <p style={{ fontSize: 13, color: '#86868B', marginTop: 4 }}>Grouped by batch ID. Your manual data is safe.</p>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                          <ImportModule type="challenges" onImportComplete={fetchRecentBatches} />
                          <ImportModule type="payouts" onImportComplete={fetchRecentBatches} />
                      </div>
                      <div className="bento-card" style={{ padding: 25, background: '#FFF' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                              <ClockCounterClockwise size={22} weight="bold" color="#8E8E93" />
                              <h4 style={{ fontWeight: 800, margin: 0 }}>Recent Import Sessions</h4>
                          </div>
                          {recentBatches.length === 0 ? (
                              <p style={{ fontSize: 12, color: '#86868B', fontStyle: 'italic' }}>No import batches found.</p>
                          ) : (
                              <div style={{ display: 'grid', gap: 10 }}>
                                  {recentBatches.map(batch => (
                                      <div key={batch.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', background: '#F9F9F9', borderRadius: 12, border: '1px solid #F2F2F7' }}>
                                          <div>
                                              <div style={{ fontSize: 12, fontWeight: 800 }}>{batch.type}: {batch.date.toLocaleString('nl-NL', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'})}</div>
                                              <div style={{ fontSize: 10, color: '#86868B' }}>{batch.count} items processed</div>
                                          </div>
                                          <button onClick={() => handleWipeBatch(batch.id)} disabled={isWiping} style={{ background: '#FF3B3011', border: 'none', padding: 8, borderRadius: 8, cursor: 'pointer', color: '#FF3B30' }}><Trash size={18} /></button>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  </div>
              )}

              {activeTab === 'messages' && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                  <div style={{ marginBottom: 25 }}>
                      <h2 style={{ fontSize: '24px', fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>Message Center</h2>
                      <p style={{ color: '#86868B', fontSize: 14, marginTop: 4 }}>Direct support & system updates from the DBT Founders.</p>
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <MagnifyingGlass size={18} style={{ position: 'absolute', left: 12, top: 12, color: '#8E8E93' }} />
                      <input className="apple-input" placeholder="Search messages..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ paddingLeft: 40, background: 'white' }} />
                    </div>
                    <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: '0 15px', borderRadius: 12, border: '1px solid #E5E5EA', fontWeight: 600, fontSize: 13, background: 'white' }}>
                      <option value="all">All</option>
                      <option value="unread">Unread</option>
                      <option value="replied">Answered</option>
                    </select>
                  </div>

                  <div style={{ display: 'grid', gap: 20 }}>
                    {filteredMessages.length === 0 ? (
                      <div style={{ padding: 60, textAlign: 'center', background: 'white', borderRadius: 24, border: '1px dashed #C7C7CC' }}>
                        <EnvelopeSimple size={40} color="#C7C7CC" weight="thin" />
                        <p style={{ color: '#86868B', marginTop: 10 }}>Your inbox is empty.</p>
                      </div>
                    ) : (
                      filteredMessages.map(item => {
                        const lastUpdate = item.updatedAt?.toDate() || new Date();
                        const hoursSinceUpdate = (new Date().getTime() - lastUpdate.getTime()) / 3600000;
                        const isLocked = item.status === 'closed' || hoursSinceUpdate > 24;

                        return (
                          <div key={item.id} onClick={() => !item.isRead && markRead(item.id)}
                            style={{ 
                                padding: 24, borderRadius: 24, border: '1px solid #E5E5EA', background: 'white',
                                boxShadow: item.status === 'replied' && !item.isRead ? '0 10px 20px rgba(0,122,255,0.05)' : 'none',
                                transition: '0.2s ease'
                            }}
                          >
                              {/* HEADER */}
                              <div style={{ display:'flex', justifyContent:'space-between', alignItems: 'center', marginBottom: 15 }}>
                                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                    <span style={{ fontSize: 10, fontWeight: 800, color: '#007AFF', background: 'rgba(0,122,255,0.1)', padding: '3px 10px', borderRadius: 20 }}>
                                        {item.type?.toUpperCase() || 'SUPPORT'}
                                    </span>
                                    <span style={{ fontSize: 12, color: '#86868B', fontWeight: 600 }}>
                                        {item.createdAt?.toDate().toLocaleDateString('nl-NL')}
                                    </span>
                                  </div>
                                  {isLocked && <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#86868B', fontSize: 10, fontWeight: 800 }}><LockSimple size={14}/> CLOSED</div>}
                                  {item.status === 'replied' && !item.isRead && (
                                      <div style={{ background: '#FF3B30', color: 'white', fontSize: 10, fontWeight: 900, padding: '2px 8px', borderRadius: 6 }}>NEW REPLY</div>
                                  )}
                              </div>

                              {/* CHAT BUBBLES */}
                              <div style={{ display: 'grid', gap: 15 }}>
                                {/* USER MESSAGE */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                    <div style={{ background: '#F2F2F7', padding: '12px 18px', borderRadius: '18px 18px 2px 18px', maxWidth: '85%', fontSize: 14, fontWeight: 500 }}>
                                        {item.message}
                                    </div>
                                </div>

                                {/* ADMIN REPLY */}
                                {item.reply && (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, marginLeft: 5 }}>
                                            <Robot size={14} weight="fill" color="#007AFF" />
                                            <span style={{ fontSize: 10, fontWeight: 900, color: '#007AFF', letterSpacing: 0.5 }}>DBT FOUNDER RESPONSE</span>
                                        </div>
                                        <div style={{ background: '#007AFF', color: 'white', padding: '12px 18px', borderRadius: '18px 18px 18px 2px', maxWidth: '85%', fontSize: 14, lineHeight: 1.5 }}>
                                            {item.reply}
                                        </div>
                                    </div>
                                )}
                              </div>

                              {/* FOLLOW UP INPUT (IF NOT LOCKED) */}
                              {!isLocked && (
                                <div style={{ marginTop: 25, paddingTop: 20, borderTop: '1px solid #F2F2F7' }}>
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <input 
                                            className="apple-input" 
                                            placeholder="Type a follow-up message..." 
                                            value={replyInputs[item.id] || ''}
                                            onChange={(e) => setReplyInputs({ ...replyInputs, [item.id]: e.target.value })}
                                            onKeyDown={(e) => e.key === 'Enter' && sendFollowUp(item.id)}
                                            style={{ background: '#F5F5F7', border: 'none' }}
                                        />
                                        <button 
                                            onClick={() => sendFollowUp(item.id)}
                                            disabled={!replyInputs[item.id]}
                                            style={{ width: 45, height: 45, background: '#007AFF', color: 'white', border: 'none', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: replyInputs[item.id] ? 1 : 0.5 }}
                                        >
                                            <PaperPlaneTilt size={20} weight="fill" />
                                        </button>
                                    </div>
                                    <p style={{ fontSize: 10, color: '#86868B', marginTop: 8, fontStyle: 'italic' }}>
                                        This conversation will lock 24h after the last update.
                                    </p>
                                </div>
                              )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'account' && <div className="bento-card" style={{padding:40, background:'white'}}>Account settings & Security.</div>}
          </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .pulse-dot { animation: pulse 1.5s infinite; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
      `}</style>
    </div>
  );
}

const MenuButton = ({ label, icon, active, onClick }) => (
    <button onClick={onClick} style={{ 
        display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderRadius:10, border:'none', cursor:'pointer',
        background: active ? 'white' : 'transparent', color: active ? '#1D1D1F' : '#86868B', fontWeight: active ? 700 : 500,
        width: '100%', textAlign:'left', transition: '0.2s'
    }}>
        {icon} {label}
    </button>
);

const DEFAULT_CONFIG = {
    strategies: ["Trend Continuation", "Pullback / Retracement", "Breakout", "Supply & Demand", "Liquidity Sweep (SFP)", "Fair Value Gap (FVG)"],
    rules: ["Max 1% Risk per trade", "Min 1:2 Risk/Reward", "Stoploss physically set", "Wait for Candle Close"],
    mistakes: ["None (Perfect Execution)", "FOMO Entry", "Impulsive Entry", "Stoploss Widening", "Cutting Winners Early"],
    quality: ["A+ (Perfect)", "A (Good)", "B (Average)", "C (Forced/Bad)"]
};

const CATEGORIES = [
    { id: 'strategies', label: 'Strategies', icon: <Strategy size={18}/>, color: '#007AFF', desc: 'Which setups do you trade?' },
    { id: 'rules', label: 'Rules', icon: <CheckCircle size={18}/>, color: '#30D158', desc: 'Discipline checklist items.' },
    { id: 'mistakes', label: 'Mistakes', icon: <Warning size={18}/>, color: '#FF9F0A', desc: 'Tags for evaluation.' },
    { id: 'quality', label: 'Quality', icon: <Tag size={18}/>, color: '#AF52DE', desc: 'Setup grading labels.' },
];