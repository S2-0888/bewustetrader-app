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
    LockSimple, PaperPlaneTilt, Robot, ShieldCheck, WarningCircle,
    Bell, Brain, Check, Prohibit, Copy, Info, CloudArrowUp, LinkSimple, PlugsConnected
} from '@phosphor-icons/react';
import Papa from 'papaparse'; 
import Mt5Wizard from './Mt5Wizard';
import CTrader from './CTrader';

// --- OPTIMIZED IMPORT MODULE COMPONENT WITH BATCHING ---
const ImportModule = ({ type = 'payouts', onImportComplete }) => {
    const [csvData, setCsvData] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [mapping, setMapping] = useState({});
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [wizardStep, setWizardStep] = useState(1);
    const [testStatus, setTestStatus] = useState('idle'); // 'idle', 'waiting', 'success'
  
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
  const [activeConfig, setActiveConfig] = useState('strategies')
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [inputValue, setInputValue] = useState(''); 
  const [isWiping, setIsWiping] = useState(false);
  const [recentBatches, setRecentBatches] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' }); // type: 'error' of 'success'
  const [showWizard, setShowWizard] = useState(false); // <--- VOEG DEZE REGEL TOE
  
  // --- MESSAGING & NOTIFICATION STATE ---
  const [notifications, setNotifications] = useState([]);
  const [myFeedback, setMyFeedback] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [replyInputs, setReplyInputs] = useState({});

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;
    const user = auth.currentUser;

    // Listen voor TCT Adaptive Rules (Notificaties)
    const qNotifs = query(
        collection(db, "users", user.uid, "notifications"),
        orderBy("createdAt", "desc")
    );
    const unsubNotifs = onSnapshot(qNotifs, (snap) => {
        setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Listen voor Support Berichten
    const qFeedback = query(
        collection(db, "beta_feedback"), 
        where("userId", "==", user.uid), 
        orderBy("updatedAt", "desc")
    );
    const unsubFeedback = onSnapshot(qFeedback, (snapshot) => {
        setMyFeedback(snapshot.docs.map(d => ({id: d.id, ...d.data()})));
    });

    const unsubProfile = onSnapshot(doc(db, "users", user.uid), (snap) => {
        if (snap.exists()) setUserProfile(snap.data());
    });

    const fetchSettings = async () => {
        const docRef = doc(db, "users", user.uid, "settings", "tradelab");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setConfig(docSnap.data());
        setLoading(false);
        fetchRecentBatches();
    };
    fetchSettings();

    return () => {
        unsubNotifs();
        unsubFeedback();
        unsubProfile();
    }
  }, []);

  const handleRuleDecision = async (notif, decision) => {
    const user = auth.currentUser;
    if (!user) return;

    if (decision !== 'approved') {
        await updateDoc(doc(db, "users", user.uid, "notifications", notif.id), { status: decision });
        return;
    }

    const userRef = doc(db, "users", user.uid);
    const currentRules = config.rules || [];
    
    // 1. Normaliseer inkomende data: splits op punten/komma's als de AI toch een string stuurde
    let proposed = Array.isArray(notif.message) ? notif.message : notif.message.split(/[.,]/);
    
    const cleanedNewRules = proposed
        .map(r => r.trim())
        .filter(r => r.length > 3 && r.length < 60); // Filter ruis

    // 2. Filter regels die al bestaan (Case-insensitive check)
    const newUniqueRules = cleanedNewRules.filter(proposedRule => {
        return !currentRules.some(existingRule => 
            existingRule.toLowerCase().trim() === proposedRule.toLowerCase().trim()
        );
    });

    if (newUniqueRules.length > 0) {
        // 3. Update de algemene Trade Lab checklist config
        const updatedRules = [...currentRules, ...newUniqueRules];
        const newConfig = { ...config, rules: updatedRules };
        setConfig(newConfig);
        await setDoc(doc(db, "users", user.uid, "settings", "tradelab"), newConfig);

        // 4. Update het 'Active Protocols' contract in het User Profile
        const { arrayUnion } = require('firebase/firestore');
        for (const ruleText of newUniqueRules) {
            await updateDoc(userRef, {
                activeProtocols: arrayUnion({
                    text: ruleText,
                    source: notif.shadowContext || "AI Audit",
                    acceptedAt: new Date()
                })
            });
        }
        alert(`${newUniqueRules.length} new rule(s) added to your contract.`);
    } else {
        alert("These rules are already part of your active protocols.");
    }
    
    // 5. Update de notificatie status zodat deze uit de 'Pending' lijst verdwijnt
    await updateDoc(doc(db, "users", user.uid, "notifications", notif.id), { status: 'approved' });
  };

  const getSubscriptionProgress = () => {
    if (!userProfile?.currentPeriodEnd || !userProfile?.updatedAt) return 0;
    const start = userProfile.updatedAt.toDate ? userProfile.updatedAt.toDate().getTime() : new Date().getTime();
    const end = userProfile.currentPeriodEnd.toDate ? userProfile.currentPeriodEnd.toDate().getTime() : new Date().getTime();
    const now = new Date().getTime();
    if (now >= end) return 100;
    const totalDuration = end - start;
    const elapsed = now - start;
    return Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
  };

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

  const filteredMessages = myFeedback.filter(msg => {
    const matchesSearch = msg.message.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (msg.reply && msg.reply.toLowerCase().includes(searchQuery.toLowerCase()));
    if (filter === 'unread') return matchesSearch && msg.status === 'replied' && !msg.isRead;
    if (filter === 'replied') return matchesSearch && msg.reply;
    return matchesSearch;
  });

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

  const generateSyncKey = async () => {
      const newKey = `PF-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      const user = auth.currentUser;
      if (!user) return;

      try {
          // Sla op in Firestore
          await updateDoc(doc(db, "users", user.uid), { 
              sync_id: newKey 
          });

          // Update de lokale state voor de UI
          setConfig(prev => ({ ...prev, syncKey: newKey }));
          
          // Toon de succesmelding in de UI ipv een alert
          setStatusMessage({ text: `Sync ID generated: ${newKey}`, type: 'success' });
          
          // Haal de melding na 4 seconden weer weg
          setTimeout(() => setStatusMessage({ text: '', type: '' }), 4000);
      } catch (error) {
          console.error("Error saving sync_id:", error);
          setStatusMessage({ text: "Failed to save Sync ID.", type: 'error' });
      }
  };
  const handleCancelSubscription = async () => {
    const bevestiging = window.confirm(
      "Are you sure you want to cancel your elite access? \n\nYou will keep access until the end of your current period, but your Shadow Profile will stop gathering data immediately."
    );
    
    if (!bevestiging) return;

    try {
      const user = auth.currentUser;
      await updateDoc(doc(db, "users", user.uid), {
        cancelAtPeriodEnd: true,
        updatedAt: serverTimestamp()
      });

      // Optioneel: Stuur direct een bericht naar de admin via de feedback collectie
      await addDoc(collection(db, "beta_feedback"), {
        userId: user.uid,
        userEmail: user.email,
        type: 'billing',
        message: "USER INITIATED CANCELLATION: Trader has requested to stop their subscription via the dashboard.",
        status: 'open',
        isRead: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      alert("Cancellation processed. Your access remains active until the expiration date.");
    } catch (error) {
      console.error("Cancel error:", error);
      alert("Something went wrong. Please contact support.");
    }
  };

  if (loading && !userProfile) return <div style={{ padding:40, color:'#86868B' }}>Loading System Architect...</div>;

  return (
    <div style={{ padding: isMobile ? '20px 15px' : '40px 20px', maxWidth: 1000, margin: '0 auto', background: '#F5F5F7', minHeight: '100vh' }}>
      
      <header style={{ marginBottom: 30 }}>
            <h1 style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: 800, margin: 0, letterSpacing: '-1px' }}>System Architect</h1>
            <p style={{ color: '#86868B', fontSize: '14px' }}>Configure your trading ecosystem and interventions.</p>
      </header>
      

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '220px 1fr', gap: isMobile ? '20px' : '40px' }}>
          {/* --- SIDEBAR MENU --- */}
          <div style={{ display:'flex', flexDirection: isMobile ? 'row' : 'column', gap: 5, overflowX: isMobile ? 'auto' : 'visible', paddingBottom: isMobile ? 10 : 0 }}>
              <MenuButton 
                label="Trading" 
                icon={<Faders size={20}/>} 
                active={activeTab==='trading'} 
                onClick={() => { setActiveTab('trading'); setActiveConfig('strategies'); }} 
              />

              <MenuButton 
                label="Data & Connectivity" 
                icon={<Database size={20}/>} 
                active={activeTab==='data'} 
                onClick={() => { setActiveTab('data'); setActiveConfig('mt5'); }} 
              />
              
              <div style={{ position: 'relative' }}>
                <MenuButton 
                  label="Messages" 
                  icon={<EnvelopeSimple size={20}/>} 
                  active={activeTab==='messages'} 
                  onClick={()=>setActiveTab('messages')} 
                />
                {(myFeedback.some(m => m.status === 'replied' && !m.isRead) || notifications.some(n => n.status === 'pending')) && (
                  <div className="pulse-dot" style={{ position: 'absolute', right: 12, top: 14, width: 8, height: 8, background: '#FF3B30', borderRadius: '50%', border: '2px solid #F5F5F7' }} />
                )}
              </div>

              <MenuButton label="Billing" icon={<CreditCard size={20}/>} active={activeTab==='account'} onClick={()=>setActiveTab('account')} />
          </div>

          {/* --- MAIN CONTENT AREA --- */}
          <div style={{ minWidth: 0 }}>
              
              {/* 1. TRADING TAB (Strategies, Rules, etc) */}
              {activeTab === 'trading' && (
                  <div style={{ animation: 'fadeIn 0.3s ease' }}>
                      <div className="bento-card" style={{ padding: 0, overflow:'hidden', minHeight: 500, display:'flex', flexDirection:'column', background: 'white' }}>
                          <div style={{ padding: 15, borderBottom: '1px solid #F2F2F7', background:'#F9F9F9', display:'flex', gap:5, overflowX: 'auto' }}>
                              {CATEGORIES.map(cat => (
                                  <button key={cat.id} onClick={() => setActiveConfig(cat.id)} style={{ flex: isMobile ? 'none' : 1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding: '10px 15px', borderRadius: 8, border:'none', fontSize:12, fontWeight:600, cursor:'pointer', background: activeConfig === cat.id ? 'white' : 'transparent', color: activeConfig === cat.id ? '#1D1D1F' : '#86868B', boxShadow: activeConfig === cat.id ? '0 2px 5px rgba(0,0,0,0.05)' : 'none', whiteSpace: 'nowrap' }}>
                                      <span style={{ color: activeConfig === cat.id ? cat.color : 'inherit' }}>{cat.icon}</span> {cat.label}
                                  </button>
                              ))}
                          </div>
                          <div style={{ padding: isMobile ? 20 : 30, flex:1 }}>
                              <h3 style={{ margin:0, fontSize:18, display:'flex', alignItems:'center', gap:10 }}>
                                  Manage {CATEGORIES.find(c => c.id === activeConfig)?.label || 'Settings'}
                              </h3>
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
                  </div>
              )}

              {/* 2. DATA & CONNECTIVITY TAB (MT5 + Migration) */}
              {activeTab === 'data' && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <header style={{ marginBottom: 25 }}>
                        <h2 style={{ fontSize: '24px', fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>Data & Connectivity</h2>
                        <p style={{ color: '#86868B', fontSize: 14, marginTop: 4 }}>Manage live platform connections and historical data imports.</p>
                    </header>

                    {/* SEGMENTED CONTROL */}
                    <div style={{ display: 'flex', background: '#E5E5EA', padding: '4px', borderRadius: '12px', marginBottom: '25px', width: isMobile ? '100%' : 'fit-content' }}>
                        <button 
                            onClick={() => setActiveConfig('mt5')}
                            style={{ padding: '8px 20px', borderRadius: '10px', border: 'none', fontSize: '13px', fontWeight: 700, background: activeConfig === 'mt5' ? 'white' : 'transparent', boxShadow: activeConfig === 'mt5' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', flex: 1 }}
                        >
                            MT5 Bridge
                        </button>
                        <button 
                            onClick={() => setActiveConfig('ctrader')}
                            style={{ padding: '8px 20px', borderRadius: '10px', border: 'none', fontSize: '13px', fontWeight: 700, background: activeConfig === 'ctrader' ? 'white' : 'transparent', boxShadow: activeConfig === 'ctrader' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', flex: 1 }}
                        >
                            cTrader Cloud
                        </button>
                        <button 
                            onClick={() => setActiveConfig('import')}
                            style={{ padding: '8px 20px', borderRadius: '10px', border: 'none', fontSize: '13px', fontWeight: 700, background: activeConfig === 'import' ? 'white' : 'transparent', boxShadow: activeConfig === 'import' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', flex: 1 }}
                        >
                            Migration Hub
                        </button>
                    </div>

                    {/* LIVE PLATFORMS SECTION */}
                    {activeConfig === 'mt5' && (
    <div style={{ animation: 'fadeIn 0.3s ease', display: 'grid', gap: 15 }}>
        
        {/* COMPACTE STATUS BAR (ALTIJD ZICHTBAAR) */}
        <div className="bento-card" style={{ 
            padding: '15px 20px', background: 'white', borderRadius: '18px', 
            border: '1px solid #E5E5EA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div>
                    <div style={{ fontSize: 9, fontWeight: 900, color: '#86868B', letterSpacing: '0.5px' }}>SYNC ID</div>
                    <div style={{ fontSize: 15, fontWeight: 800, fontFamily: 'monospace', color: '#1D1D1F' }}>
                        {userProfile?.sync_id || "NOT GENERATED"}
                    </div>
                </div>

                {/* STATUS BADGE: Kijkt naar sync_id in database */}
                <div style={{ 
                    padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: 800,
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: userProfile?.sync_id ? '#30D15815' : '#F2F2F7',
                    color: userProfile?.sync_id ? '#30D158' : '#86868B',
                    border: `1px solid ${userProfile?.sync_id ? '#30D15820' : '#E5E5EA'}`
                }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: userProfile?.sync_id ? '#30D158' : '#C7C7CC' }} />
                    {userProfile?.sync_id ? 'BRIDGE ACTIVE' : 'DISCONNECTED'}
                </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
                {userProfile?.sync_id && (
                    <button 
                        onClick={() => { 
                            navigator.clipboard.writeText(userProfile.sync_id); 
                            setStatusMessage({ text: "ID Copied!", type: 'success' });
                            setTimeout(() => setStatusMessage({ text: '', type: '' }), 3000);
                        }} 
                        className="btn-mini-icon" 
                        style={{ background: '#F5F5F7', border: 'none', padding: '8px', borderRadius: '10px', cursor: 'pointer' }}
                    >
                        <Copy size={18} />
                    </button>
                )}
                <button 
                    onClick={() => setShowWizard(!showWizard)} 
                    className="btn-primary" 
                    style={{ 
                        padding: '8px 15px', 
                        fontSize: 12, 
                        height: 38, 
                        background: (showWizard || !userProfile?.sync_id) ? '#1D1D1F' : '#F2F2F7', 
                        color: (showWizard || !userProfile?.sync_id) ? 'white' : '#1D1D1F',
                        border: 'none',
                        borderRadius: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                    }}
                >
                    {userProfile?.sync_id ? (showWizard ? 'Hide Guide' : 'Setup Guide') : 'Start Setup'}
                </button>
            </div>
        </div>

        {/* CONDITIONELE WIZARD & MELDING */}
        {(showWizard || !userProfile?.sync_id) && (
            <div style={{ animation: 'fadeIn 0.4s ease' }}>
                <div style={{ background: '#F5F5F7', padding: '20px', borderRadius: '16px', marginBottom: '15px', border: '1px solid #E5E5EA' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <Info size={20} color="#007AFF" weight="fill" />
                        <div>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1D1D1F' }}>
                                {userProfile?.sync_id ? "Systeem Verbonden" : "Koppel je MT5 account"}
                            </p>
                            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#86868B', lineHeight: 1.4 }}>
                                {userProfile?.sync_id 
                                    ? "Je bridge is momenteel actief. Hieronder vind je de instructies mocht je de verbinding opnieuw willen instellen." 
                                    : "Genereer een Sync ID en volg de stappen in de wizard om je trades live te synchroniseren."}
                            </p>
                        </div>
                    </div>
                </div>
                
                {!userProfile?.sync_id && (
                    <button onClick={generateSyncKey} className="btn-primary" style={{ width: '100%', marginBottom: 20, height: 50, fontSize: 14 }}>
                        Generate New Sync ID
                    </button>
                )}
                
                <Mt5Wizard />
            </div>
        )}
    </div>
)}

                {/* CTRADER CLOUD SECTION */}
                {activeConfig === 'ctrader' && <CTrader userProfile={userProfile} />}

                    {/* MIGRATION HUB SECTION */}
                    {activeConfig === 'import' && (
                        <div style={{ animation: 'fadeIn 0.3s ease', display:'grid', gap:20 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>
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
                                                    <div style={{ fontSize: 12, fontWeight: 800 }}>{batch.type}: {batch.date.toLocaleString('nl-NL')}</div>
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
                </div>
              )}

              {activeTab === 'messages' && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                  <div style={{ marginBottom: 25 }}>
                      <h2 style={{ fontSize: '24px', fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>Message Center</h2>
                      <p style={{ color: '#86868B', fontSize: 14, marginTop: 4 }}>Direct support & system updates from the DBT Founders.</p>
                  </div>

                  {/* TCT INTERVENTIONS */}
                  <section style={{ marginBottom: 25 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 15 }}>
                        <Brain size={24} weight="fill" color="#007AFF" />
                        <h2 style={{ fontSize: '18px', fontWeight: 900, margin: 0 }}>TCT Interventions</h2>
                    </div>
                    <div style={{ display: 'grid', gap: 15 }}>
                        {notifications.filter(n => n.status === 'pending').length === 0 ? (
                            <div style={{ padding: 30, textAlign: 'center', background: 'white', borderRadius: 20, border: '1px solid #E5E5EA' }}>
                                <ShieldCheck size={32} color="#30D158" weight="light" style={{ marginBottom: 10 }} />
                                <p style={{ color: '#86868B', fontSize: 13, margin: 0 }}>All protocols are calibrated. No pending interventions.</p>
                            </div>
                        ) : (
                          notifications.filter(n => n.status === 'pending').map(n => (
                                  <div key={n.id} className="bento-card" style={{ padding: 25, background: 'white', borderLeft: '4px solid #FF3B30', boxShadow: '0 10px 30px rgba(255, 59, 48, 0.1)' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                          <div style={{ background: '#FF3B3015', padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 900, color: '#FF3B30' }}>
                                              ADAPTIVE PROTOCOL PROPOSAL
                                          </div>
                                      </div>
                                      
                                      <p style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.4, margin: '0 0 15px 0', color: '#1D1D1F' }}>
                                          "{n.message}"
                                      </p>
                                      
                                      <div style={{ fontSize: 12, color: '#48484A', background: '#F5F5F7', padding: '15px', borderRadius: 12, marginBottom: 20, borderLeft: '3px solid #E5E5EA' }}>
                                          <strong style={{ display: 'block', fontSize: 10, color: '#86868B', marginBottom: 4 }}>REASONING:</strong>
                                          {n.shadowContext}
                                      </div>

                                      <div style={{ display: 'flex', gap: 10 }}>
                                          <button 
                                              onClick={() => handleRuleDecision(n, 'approved')} 
                                              style={{ flex: 1, height: 44, background: '#1D1D1F', color: 'white', border: 'none', borderRadius: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                          >
                                              <CheckCircle size={20} weight="fill" /> Accept & Commit
                                          </button>
                                          <button 
                                              onClick={() => handleRuleDecision(n, 'refused')} 
                                              style={{ padding: '0 20px', height: 44, background: 'transparent', color: '#86868B', border: '1px solid #E5E5EA', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}
                                          >
                                              Discard
                                          </button>
                                      </div>
                                  </div>
                              ))
                        )}
                    </div>

                    {/* VOEG HIER DE ACTIVE PROTOCOLS TOE (STAP 3) */}
                    {userProfile?.activeProtocols && userProfile.activeProtocols.length > 0 && (
                        <div style={{ 
                            marginTop: 20, 
                            padding: 20, 
                            background: 'rgba(48, 209, 88, 0.05)', 
                            borderRadius: 24, 
                            border: '1px solid rgba(48, 209, 88, 0.1)',
                            animation: 'fadeIn 0.5s ease'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                <ShieldCheck size={18} color="#30D158" weight="fill" />
                                <span style={{ fontSize: 10, fontWeight: 900, color: '#30D158', letterSpacing: '0.5px' }}>ACTIVE TRADING CONTRACTS</span>
                            </div>
                            <div style={{ display: 'grid', gap: 10 }}>
                                {userProfile.activeProtocols.map((p, i) => (
                                    <div key={i} style={{ 
                                        background: 'white', 
                                        padding: '12px 15px', 
                                        borderRadius: 12, 
                                        fontSize: 13, 
                                        fontWeight: 700, 
                                        color: '#1D1D1F',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
                                    }}>
                                        <span>{p.text}</span>
                                        <span style={{ fontSize: 9, color: '#86868B', fontWeight: 600 }}>
                                            Source: {p.source}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {/* EINDE ACTIVE PROTOCOLS */}
                  </section>

                  <section style={{ borderTop: '1px solid #E5E5EA', paddingTop: 25 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 15 }}>
                        <ChatCircleText size={24} weight="fill" color="#8E8E93" />
                        <h2 style={{ fontSize: '18px', fontWeight: 900, margin: 0 }}>Support Inbox</h2>
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

                                  <div style={{ display: 'grid', gap: 15 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                        <div style={{ background: '#F2F2F7', padding: '12px 18px', borderRadius: '18px 18px 2px 18px', maxWidth: '85%', fontSize: 14, fontWeight: 500 }}>
                                            {item.message}
                                            {item.attachment && (
                                                <div style={{ marginTop: 10 }}>
                                                    <a href={item.attachment} target="_blank" rel="noreferrer">
                                                        <img src={item.attachment} style={{ width: '100%', borderRadius: 8, border: '1px solid #E5E5EA' }} alt="Attachment" />
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {item.reply && (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, marginLeft: 5 }}>
                                                <Robot size={14} weight="fill" color="#007AFF" />
                                                <span style={{ fontSize: 10, fontWeight: 900, color: '#007AFF', letterSpacing: 0.5 }}>DBT FOUNDER RESPONSE</span>
                                            </div>
                                            <div style={{ background: '#007AFF', color: 'white', padding: '12px 18px', borderRadius: '18px 18px 18px 2px', maxWidth: '85%', fontSize: 14, lineHeight: 1.5 }}>
                                                {item.reply}
                                                {item.replyAttachment && (
                                                    <div style={{ marginTop: 10 }}>
                                                        <a href={item.replyAttachment} target="_blank" rel="noreferrer">
                                                            <img src={item.replyAttachment} style={{ width: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)' }} alt="Admin Attachment" />
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                  </div>
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
                                    </div>
                                  )}
                              </div>
                            );
                          })
                        )}
                      </div>
                  </section>
                </div>
              )}

              {activeTab === 'account' && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <div style={{ marginBottom: 25 }}>
                        <h2 style={{ fontSize: '24px', fontWeight: 900, margin: 0, letterSpacing: '-1.5px' }}>Subscription & Billing</h2>
                        <p style={{ color: '#86868B', fontSize: 14, marginTop: 4 }}>Manage your membership and view payment history.</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr', gap: 25 }}>
                        <div className="bento-card" style={{ padding: 30, background: 'white', border: '1px solid #E5E5EA', position: 'relative', overflow: 'hidden' }}>
                            <div className="label-xs" style={{ color: '#007AFF', marginBottom: 20 }}>MEMBERSHIP STATUS</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 30 }}>
                                <div style={{ 
                                    width: 60, height: 60, borderRadius: 18, 
                                    background: userProfile?.isApproved ? 'rgba(48, 209, 88, 0.1)' : 'rgba(255, 59, 48, 0.1)', 
                                    display: 'flex', alignItems: 'center', justifyContent: 'center' 
                                }}>
                                    {userProfile?.isApproved ? <ShieldCheck size={32} color="#30D158" weight="fill" /> : <WarningCircle size={32} color="#FF3B30" weight="fill" />}
                                </div>
                                <div>
                                    <div style={{ fontSize: 18, fontWeight: 800 }}>{userProfile?.isApproved ? 'Active Access' : 'Access Restricted'}</div>
                                    <div style={{ fontSize: 13, color: '#86868B' }}>{userProfile?.isFounder ? 'Exclusive Founder Member' : 'Standard Member'}</div>
                                </div>
                            </div>
                            <div style={{ background: '#F5F5F7', padding: '20px', borderRadius: 16, marginBottom: 25 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                                    <span style={{ fontSize: 13, color: '#86868B', fontWeight: 600 }}>Renew Date:</span>
                                    <span style={{ fontSize: 13, fontWeight: 800 }}>
                                        {userProfile?.currentPeriodEnd ? new Date(userProfile.currentPeriodEnd.toDate()).toLocaleDateString('nl-NL', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'}
                                    </span>
                                </div>
                                <div style={{ width: '100%', height: 6, background: '#E5E5EA', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ width: `${getSubscriptionProgress()}%`, height: '100%', background: userProfile?.isApproved ? '#30D158' : '#FF3B30', borderRadius: 3 }} />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gap: 10 }}>
                                <button 
                                    onClick={() => window.location.href = 'https://billing.stripe.com/p/login/test_YOUR_PORTAL_LINK'} 
                                    className="btn-primary" 
                                    style={{ width: '100%', background: '#1D1D1F', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                >
                                    <CreditCard size={20} /> Manage Billing & Invoices
                                </button>

                                {!userProfile?.cancelAtPeriodEnd ? (
                                    <button 
                                        onClick={handleCancelSubscription}
                                        style={{ 
                                            width: '100%', background: 'transparent', color: '#FF3B30', 
                                            border: '1px solid #FF3B3020', padding: '12px', borderRadius: '12px', 
                                            fontSize: '12px', fontWeight: 700, cursor: 'pointer', marginTop: 5 
                                        }}
                                    >
                                        Cancel Elite Membership
                                    </button>
                                ) : (
                                    <div style={{ 
                                        background: '#FF3B3010', color: '#FF3B30', padding: '12px', 
                                        borderRadius: '12px', fontSize: '11px', fontWeight: 800, 
                                        textAlign: 'center', border: '1px solid #FF3B3020' 
                                    }}>
                                        <Warning size={14} weight="fill" /> SUBSCRIPTION SET TO EXPIRE
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="bento-card" style={{ padding: 25, background: 'white', border: '1px solid #E5E5EA' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                                <ClockCounterClockwise size={22} weight="bold" color="#8E8E93" />
                                <h4 style={{ fontWeight: 800, margin: 0 }}>Payment History</h4>
                            </div>
                            <div style={{ display: 'grid', gap: 12 }}>
                                <div style={{ padding: '12px 15px', borderBottom: '1px solid #F5F5F7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: 12, fontWeight: 800 }}>Network Membership</div>
                                        <div style={{ fontSize: 10, color: '#86868B' }}>{userProfile?.createdAt?.toDate().toLocaleDateString('nl-NL')} • Visa **** 4242</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 12, fontWeight: 900 }}>€99.00</div>
                                        <div style={{ fontSize: 9, color: '#30D158', fontWeight: 800 }}>PAID</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
              )}
          </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .pulse-dot { animation: pulse 1.5s infinite; }
        @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(255, 59, 48, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(255, 59, 48, 0); } 100% { box-shadow: 0 0 0 0 rgba(255, 59, 48, 0); } }
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
    { id: 'strategies', label: 'Strategies', icon: <Strategy size={18}/>, color: '#007AFF' },
    { id: 'rules', label: 'Rules', icon: <CheckCircle size={18}/>, color: '#30D158' },
    { id: 'mistakes', label: 'Mistakes', icon: <Warning size={18}/>, color: '#FF9F0A' },
    { id: 'quality', label: 'Quality', icon: <Tag size={18}/>, color: '#AF52DE' },
];