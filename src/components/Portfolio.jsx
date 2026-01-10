import React, { useState, useEffect, useRef } from 'react';
import { db, auth, functions } from '../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import AccountIntelligenceReport from './AccountIntelligenceReport';
import { 
  Trash, MagnifyingGlass, X, PlusCircle, ShieldWarning, 
  Calendar, Funnel, Hash, Percent, Microphone, Waveform, Stop, Gear, Sparkle, MagicWand, CurrencyCircleDollar, Binoculars
} from '@phosphor-icons/react';

const ACCOUNT_TYPES = ["Normal", "Swing", "Intraday (No Weekend)", "Raw Spread"];
const CREATE_STAGES = ["Phase 1", "Phase 2", "Funded"];
const ALL_STAGES = ["Phase 1", "Phase 2", "Funded", "Breached", "Archived"];

export default function Portfolio() {
  const [accounts, setAccounts] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('Active');
  const [editingAccount, setEditingAccount] = useState(null);
  const [originalAccountData, setOriginalAccountData] = useState(null);
  const [promotingAccount, setPromotingAccount] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [incomingSyncs, setIncomingSyncs] = useState([]);
  const [pendingCloudAccounts, setPendingCloudAccounts] = useState([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  
  // Shadow Audit States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [primaryMistake, setPrimaryMistake] = useState('');
  const [reflectionSummary, setReflectionSummary] = useState('');
  const [aiAnalysisData, setAiAnalysisData] = useState(null);

  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

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

  const openAccountModal = (acc) => {
      setEditingAccount({ ...acc });
      setOriginalAccountData({ ...acc });
      setIsEditMode(false);
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    const user = auth.currentUser;
    if (!user) return;
    onSnapshot(doc(db, "users", user.uid), (snap) => setUserProfile(snap.data()));
    const q = query(collection(db, "users", user.uid, "accounts"), orderBy("purchaseDate", "desc"));
    return onSnapshot(q, (snap) => setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const qSync = query(collection(db, "users", user.uid, "incoming_syncs"), orderBy("syncedAt", "desc"));
    return onSnapshot(qSync, (snap) => {
      setIncomingSyncs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  useEffect(() => {
    const pendingId = localStorage.getItem('pendingUpgradeId');
    if (pendingId && accounts.length > 0) {
        const accToUpgrade = accounts.find(a => a.id === pendingId);
        if (accToUpgrade) {
            setPromotingAccount(accToUpgrade);
            setNewPromotionData({ 
                accountNumber: '', 
                startBalance: accToUpgrade.size, 
                profitTarget: accToUpgrade.profitTarget, 
                maxDrawdown: accToUpgrade.maxDrawdown 
            });
            setIsUpgrading(true);
        }
        localStorage.removeItem('pendingUpgradeId');
    }
  }, [accounts]);

  // --- LOGICA HELPERS ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      mediaRecorder.current.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.current.push(e.data); };
      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        await handleVoiceAuditTranscription(audioBlob);
      };
      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) { alert("Microphone access denied."); }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const handleVoiceAuditTranscription = async (blob) => {
    setIsAnalyzing(true);
    const targetAcc = accounts.find(acc => (acc.stage === 'Archived' || acc.stage === 'Breached' || acc.stage === 'Funded') && !acc.postMortemCompleted);
    if (!targetAcc) { setIsAnalyzing(false); return; }

    const formData = new FormData();
    formData.append('audio', blob, 'audit.webm');
    formData.append('accountContext', JSON.stringify({ 
      accountId: targetAcc.id,
      firm: targetAcc.firm, 
      size: targetAcc.size,
      status: targetAcc.stage === 'Archived' || targetAcc.stage === 'Funded' ? 'PASSED' : 'BREACHED', 
      initialMistake: primaryMistake || 'N/A',
      auditType: targetAcc.stage === 'Archived' || targetAcc.stage === 'Funded' ? 'PROFESSIONAL_SUCCESS_REVIEW' : 'SHADOW_FAILURE_AUDIT'
    }));

    try {
      const response = await fetch('https://europe-west1-bewustetrader.cloudfunctions.net/analyzeShadowAudit', {
        method: 'POST',
        headers: { 'x-user-uid': auth.currentUser.uid },
        body: formData, 
      });
      const result = await response.json();
      setReflectionSummary(result.reflection_summary);
      setAiAnalysisData(result);
    } catch (err) { console.error("Audit failed:", err); } finally { setIsAnalyzing(false); }
  };

  const finalizeAudit = async (accountId) => {
    try {
      const user = auth.currentUser;
      const targetAcc = accounts.find(a => a.id === accountId);
      await updateDoc(doc(db, "users", user.uid, "accounts", accountId), {
        status: targetAcc.stage === 'Funded' ? 'Active' : 'Inactive',
        postMortemCompleted: true,
        postMortemData: { ...aiAnalysisData, timestamp: new Date() }
      });
      setPrimaryMistake(''); setReflectionSummary(''); setAiAnalysisData(null);
    } catch (err) { console.error("Failed to save audit:", err); }
  };
    const handleDiscoverCloudAccounts = async () => {
    setIsDiscovering(true);
    try {
      const { httpsCallable } = await import('firebase/functions');
      const discoverFunc = httpsCallable(functions, 'discoverCtraderAccounts');
      const result = await discoverFunc();
      
      // Filter de accounts die nog NIET in de huidige accounts lijst staan
      const newAccounts = result.data.accounts.filter(cloudAcc => 
        !accounts.some(vaultAcc => String(vaultAcc.accountNumber) === String(cloudAcc.number))
      );
      
      setPendingCloudAccounts(newAccounts);
      if (newAccounts.length === 0) alert("No new accounts found on cTrader.");
    } catch (err) {
      console.error("Discovery error:", err);
      alert("Failed to fetch accounts from cTrader.");
    } finally {
      setIsDiscovering(false);
    }
  };

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
      originalPrice: Number(form.originalPrice || 0),
      purchaseCurrency: form.purchaseCurrency,        
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
        stage: nextStage, accountNumber: newPromotionData.accountNumber,
        startBalance: Number(newPromotionData.startBalance), balance: Number(newPromotionData.startBalance),
        profitTarget: Number(newPromotionData.profitTarget), maxDrawdown: Number(newPromotionData.maxDrawdown)
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
      
      {/* 3. CSS VOOR PULSE ANIMATIE */}
      <style>{`
        @keyframes sync-breath {
          0% { opacity: 0.4; transform: scale(0.98); }
          50% { opacity: 1; transform: scale(1); }
          100% { opacity: 0.4; transform: scale(0.98); }
        }
        .sync-pulse { animation: sync-breath 2s infinite ease-in-out; }
      `}</style>
      
      <div style={{ marginBottom: 30, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 15 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          <h1 style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 800, margin: 0 }}>Portfolio Vault</h1>
          
          {/* SUBTIELE MAGIC FILL BADGE NAAST TITEL */}
          {[...new Set(incomingSyncs.map(t => t.account_number))].filter(num => !accounts.some(acc => acc.accountNumber === String(num))).slice(0,1).map(unknownNum => (
            <div 
              key={unknownNum}
              onClick={() => {
                const incomingData = incomingSyncs.find(t => String(t.account_number) === String(unknownNum));
                if (incomingData) {
                  setForm({ ...form, accountNumber: String(unknownNum), firm: incomingData.firm || "", size: incomingData.balance || "", accountCurrency: incomingData.currency || "USD" });
                }
              }}
              style={{ 
                display: 'flex', alignItems: 'center', gap: 6, background: '#EEF6FF', color: '#007AFF', 
                padding: '6px 12px', borderRadius: '100px', cursor: 'pointer', border: '1px solid #CCE4FF',
                fontSize: '11px', fontWeight: 700, transition: '0.2s'
              }}
            >
              <Sparkle size={14} weight="fill" />
              <span>Magic Fill: {unknownNum}</span>
            </div>
          ))}
        </div>
        {!isMobile && <p style={{ color: '#86868B', fontSize: 14, margin: 0 }}>Strategic account management.</p>}
      </div>

      {/* 2. MOBIELE GRID OPTIMALISATIE IN NEW ACCOUNT REGISTRATION */}
      <div className="bento-card" style={{ marginBottom: 35, borderTop: '4px solid #007AFF', padding: 25 }}>
        <div style={{ fontSize: 10, fontWeight: 900, color: '#007AFF', marginBottom: 20, letterSpacing: '1px' }}>NEW ACCOUNT</div>
        <form onSubmit={handleAddAccount}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: 15, marginBottom: 20 }}>
                <div className="input-group" style={{ gridColumn: isMobile ? 'span 2' : 'auto' }}><label className="input-label">Prop Firm</label><input className="apple-input" placeholder="FTMO, etc." value={form.firm} onChange={e => setForm({...form, firm: e.target.value})} required /></div>
                <div className="input-group"><label className="input-label">Stage</label><select className="apple-input" value={form.stage} onChange={e => setForm({...form, stage: e.target.value})}>{CREATE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div className="input-group"><label className="input-label">Login ID</label><input className="apple-input" placeholder="ID" value={form.accountNumber} onChange={e => setForm({...form, accountNumber: e.target.value})} /></div>
                <div className="input-group" style={{ gridColumn: isMobile ? 'span 2' : 'auto' }}><label className="input-label">Purchase Date</label><input type="date" className="apple-input" value={form.purchaseDate} onChange={e => setForm({...form, purchaseDate: e.target.value})} /></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1.2fr 1.2fr 1.2fr 0.8fr', gap: 15, alignItems: 'end' }}>
                <div className="input-group">
                    <label className="input-label">Size</label>
                    <div style={{ display:'flex' }}>
                        <select className="apple-input" style={{ width: 55, borderRight:'none', borderRadius:'8px 0 0 8px', background:'#F5F5F7', fontSize: 11 }} value={form.accountCurrency} onChange={e => setForm({...form, accountCurrency: e.target.value})}><option value="USD">$</option><option value="EUR">€</option><option value="GBP">£</option></select>
                        <input className="apple-input" style={{ borderRadius:'0 8px 8px 0' }} type="number" placeholder="Size" value={form.size} onChange={e => setForm({...form, size: e.target.value})} required />
                    </div>
                </div>
                <div className="input-group">
                    <label className="input-label">Target</label>
                    <div style={{ display:'flex', gap: 5 }}>
                        <input className="apple-input" style={{ flex: 2 }} type="number" value={form.profitTarget} onChange={e => updateFromAmount('profitTarget', e.target.value)} />
                        <div style={{ position:'relative', flex: 1.2 }}><input className="apple-input" type="number" value={form.targetPct} onChange={e => updateFromPct('profitTarget', e.target.value)} /><span style={{ position:'absolute', right:6, top:10, fontSize:9, color:'#86868B' }}>%</span></div>
                    </div>
                </div>
                <div className="input-group">
                    <label className="input-label">Max DD</label>
                    <div style={{ display:'flex', gap: 5 }}>
                        <input className="apple-input" style={{ flex: 2 }} type="number" value={form.maxDrawdown} onChange={e => updateFromAmount('maxDrawdown', e.target.value)} />
                        <div style={{ position:'relative', flex: 1.2 }}><input className="apple-input" type="number" value={form.ddPct} onChange={e => updateFromPct('maxDrawdown', e.target.value)} /><span style={{ position:'absolute', right:6, top:10, fontSize:9, color:'#86868B' }}>%</span></div>
                    </div>
                </div>

                {/* --- NIEUW: PURCHASE PRICE + CURRENCY --- [cite: 2026-01-04] */}
                <div className="input-group">
                    <label className="input-label">Cost Price</label>
                    <div style={{ display:'flex' }}>
                        <select className="apple-input" style={{ width: 55, borderRight:'none', borderRadius:'8px 0 0 8px', background:'#F5F5F7', fontSize: 11 }} value={form.purchaseCurrency} onChange={e => setForm({...form, purchaseCurrency: e.target.value})}><option value="USD">$</option><option value="EUR">€</option><option value="GBP">£</option></select>
                        <input className="apple-input" style={{ borderRadius:'0 8px 8px 0' }} type="number" placeholder="Price" value={form.originalPrice} onChange={e => setForm({...form, originalPrice: e.target.value})} />
                    </div>
                </div>

                <button type="submit" className="btn-primary" style={{ height: 44, fontWeight: 700 }}>Add</button>
            </div>
        </form>
      </div>

      {/* CLOUD DISCOVERY SECTIE */}
      {userProfile?.ctrader_id && (
        <div style={{ marginBottom: 35 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: '#86868B', letterSpacing: '1px' }}>CLOUD DISCOVERY</div>
                <button 
                    onClick={handleDiscoverCloudAccounts} 
                    disabled={isDiscovering}
                    style={{ background: 'none', border: 'none', color: '#007AFF', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                >
                    <Binoculars size={16} /> {isDiscovering ? 'Searching...' : 'Scan cTrader Cloud'}
                </button>
            </div>

            {pendingCloudAccounts.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 15 }}>
                    {pendingCloudAccounts.map(acc => (
                        <div key={acc.number} className="bento-card" style={{ padding: '15px 20px', borderLeft: '4px solid #FF9F0A', background: '#FFF9F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: 13 }}>{acc.brokerName || 'cTrader Account'}</div>
                                <div style={{ fontSize: 11, color: '#86868B' }}>ID: {acc.number} • {acc.accountType}</div>
                            </div>
                            <button 
                                onClick={() => {
                                    setForm({
                                        ...form,
                                        accountNumber: String(acc.number),
                                        firm: acc.brokerName || "",
                                        size: acc.balance || "",
                                        accountCurrency: acc.currency || "USD"
                                    });
                                    setPendingCloudAccounts(prev => prev.filter(a => a.number !== acc.number));
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                style={{ background: '#1D1D1F', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 10, fontWeight: 800, cursor: 'pointer' }}
                            >
                                CONFIGURE
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
      )}

      {/* FILTERS */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', marginBottom: 15, gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 15, background: 'white', padding: '8px 15px', borderRadius: 12, border: '1px solid #F2F2F7' }}>
              <div style={{ color: '#86868B', fontSize: 12 }}><Funnel size={16} /></div>
              {['Active', 'All'].map(f => (
                  <button key={f} onClick={() => setStageFilter(f)} style={{ border:'none', background: stageFilter === f ? '#F2F2F7' : 'transparent', padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, color: stageFilter === f ? '#000' : '#86868B', cursor:'pointer' }}>{f}</button>
              ))}
          </div>
          <div style={{ position: 'relative', flex: 1, maxWidth: isMobile ? '100%' : 250 }}>
              <MagnifyingGlass size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#86868B' }} />
              <input style={{ width: '100%', border: '1px solid #F2F2F7', borderRadius: 12, background: 'white', fontSize: 13, padding: '10px 10px 10px 35px' }} placeholder="Search firm or ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
      </div>

      {/* TABLE */}
      <div className="bento-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="apple-table">
              <thead><tr>{!isMobile && <th>Date</th>}<th>Account</th><th>Status</th><th>Targets</th><th style={{ width:50 }}></th></tr></thead>
              <tbody>
                {filteredAccounts.map(acc => {
                  const hasPassed = acc.balance >= (Number(acc.startBalance) + Number(acc.profitTarget)) && ['Phase 1', 'Phase 2'].includes(acc.stage);
                  return (
                    <tr key={acc.id} onClick={() => openAccountModal(acc)} className="hover-row" style={{ cursor: 'pointer', opacity: acc.stage === 'Breached' ? 0.4 : 1 }}>
                      {!isMobile && <td style={{ fontSize: 11, color: '#86868B' }}>{acc.purchaseDate}</td>}
                      <td>
                        <div style={{ fontWeight: 700 }}>{acc.firm}</div>
                        <div style={{ fontSize: 10, color: '#86868B', display: 'flex', alignItems: 'center', gap: 5 }}>
                          ID: {acc.accountNumber || 'N/A'} • {formatAcc(acc.startBalance, acc.accountCurrency)}
                          {/* SYNC INDICATOR */}
                          {incomingSyncs.some(t => String(t.account_number) === String(acc.accountNumber)) && (
                            <span className="sync-pulse" style={{ color: '#007AFF', display: 'flex', alignItems: 'center', gap: 2, fontWeight: 800, marginLeft: 5 }}>
                              <Waveform size={12} weight="bold" /> SYNC READY
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
  {hasPassed ? (
    <button 
      onClick={(e) => { 
          e.stopPropagation(); 
          setPromotingAccount(acc); 
          setNewPromotionData({ 
              accountNumber: '', 
              startBalance: acc.size, 
              profitTarget: acc.profitTarget, 
              maxDrawdown: acc.maxDrawdown 
          });
          setIsUpgrading(true); 
      }} 
      style={{ background: '#30D158', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 10, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(48, 209, 88, 0.2)' }}
    >
      🎉 UPGRADE PHASE
    </button>
  ) : (
    <span style={{ fontSize: 9, padding: '3px 8px', borderRadius: 6, fontWeight: 800, background: '#F2F2F7', color: acc.stage === 'Funded' ? '#30D158' : acc.stage === 'Breached' ? '#FF3B30' : '#FF9F0A' }}>{acc.stage.toUpperCase()}</span>
  )}
</td>
        <td>
          <div style={{ fontSize: 10, color: '#86868B' }}>
            T: <span style={{ color: '#30D158' }}>{formatAcc(acc.profitTarget, acc.accountCurrency)}</span><br />
            D: <span style={{ color: '#FF3B30' }}>{formatAcc(acc.maxDrawdown, acc.accountCurrency)}</span>
          </div>
        </td>
        <td style={{ textAlign: 'right' }}>
          {/* Alleen de prullenbak blijft hier, het tandwiel is verwijderd */}
          <button 
            onClick={(e) => { e.stopPropagation(); if (confirm('Delete account?')) deleteDoc(doc(db, "users", auth.currentUser.uid, "accounts", acc.id)); }} 
            style={{ border: 'none', background: 'none', color: '#ccc', cursor: 'pointer', padding: '10px', opacity: 0.6 }}
          >
            <Trash size={18} />
          </button>
        </td>
      </tr>
    );
  })}
</tbody>
          </table>
      </div>

      {/* SHADOW & PROFESSIONAL AUDIT OVERLAY */}
{accounts
  .filter(acc => {
    // 1. Check of status een audit vereist
    const needsAudit = (acc.stage === 'Breached' || acc.stage === 'Archived' || acc.stage === 'Funded') && !acc.postMortemCompleted;
    
    // 2. VOORKOM LOOP: Check of het account "recent" is (bijv. aangemaakt of geupdate in de laatste 24 uur)
    // Dit voorkomt dat oude imports of oude breaches je scherm blokkeren.
    const isRecent = acc.createdAt?.toDate ? (new Date() - acc.createdAt.toDate() < 86400000) : true; 

    return needsAudit && isRecent;
  })
  .slice(0, 1)
  .map(acc => {
    const isSuccess = acc.stage === 'Archived' || acc.stage === 'Funded';
    return (
      <div key={acc.id} style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.98)', zIndex: 7000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(10px)' }}>
        {aiAnalysisData ? (
          <AccountIntelligenceReport data={aiAnalysisData} onClose={() => finalizeAudit(acc.id)} status={acc.stage} />
        ) : (
          <div style={{ maxWidth: 500, width: '100%', textAlign: 'center' }}>
            <div style={{ background: isSuccess ? '#30D15815' : '#FF3B3015', width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              {isSuccess ? <Sparkle size={32} color="#30D158" weight="fill" /> : <ShieldWarning size={32} color="#FF3B30" weight="fill" />}
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 900, marginBottom: 8 }}>{isSuccess ? 'Professional Audit' : 'Account Breached'}</h2>
            <p style={{ color: '#86868B', marginBottom: 35, fontSize: 15 }}>{isSuccess ? "Victory requires reflection. Repeat your process." : "TCT takes your truth. Speak honestly."}</p>
            
            {!isSuccess && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 30 }}>
                {["FOMO", "Revenge Trading", "Risk Violation", "Overtrading"].map(m => (
                  <button key={m} onClick={() => setPrimaryMistake(m)} style={{ padding: '12px', borderRadius: 12, border: primaryMistake === m ? `2px solid #FF3B30` : '1px solid #E5E5EA', background: primaryMistake === m ? 'white' : '#F9F9F9', fontWeight: 700 }}>{m}</button>
                ))}
              </div>
            )}

            <div style={{ marginBottom: 35 }}>
              <button onClick={isRecording ? stopRecording : startRecording} disabled={(!isSuccess && !primaryMistake) || isAnalyzing} style={{ width: 90, height: 90, borderRadius: '50%', background: isRecording ? '#FF3B30' : (isSuccess ? '#30D158' : '#1D1D1F'), border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', margin: '0 auto' }}>
                {isRecording ? <Stop size={36} color="white" weight="fill" /> : <Microphone size={36} color="white" />}
              </button>
              <p style={{ fontSize: 12, fontWeight: 900, color: isRecording ? '#FF3B30' : '#8E8E93', textTransform: 'uppercase', marginTop: 20 }}>{isRecording ? "Recording..." : "Click to Speak"}</p>
            </div>

            <textarea value={reflectionSummary} onChange={(e) => setReflectionSummary(e.target.value)} placeholder="Transcript will appear here..." style={{ width: '100%', minHeight: '100px', padding: '15px', borderRadius: '16px', border: '1px solid #E5E5EA', background: '#F9F9F9', marginBottom: 20 }} />
            <button disabled={!reflectionSummary || isAnalyzing} onClick={() => finalizeAudit(acc.id)} style={{ width: '100%', padding: '18px', borderRadius: 18, background: '#1D1D1F', color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer' }}>Finalize Audit</button>
          </div>
        )}
      </div>
    );
})}

{isUpgrading && promotingAccount && (
  <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', backdropFilter:'blur(15px)', zIndex:6000, display:'flex', alignItems: 'center', justifyContent:'center', padding:20 }}>
      <div className="bento-card" style={{ width: '100%', maxWidth: 450, padding: 30, textAlign: 'center' }}>
          <div style={{ background: '#30D15815', width: 50, height: 50, borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
             <PlusCircle size={28} color="#30D158" weight="fill" />
          </div>
          <h3 style={{fontWeight: 900, fontSize: '22px', marginBottom: 10}}>Initialize Next Phase</h3>
          <p style={{fontSize: 13, color: '#86868B', marginBottom: 25, lineHeight: 1.5}}>
            Configureer je nieuwe <strong>{promotingAccount.stage === 'Phase 1' ? 'Phase 2' : 'Funded'}</strong> account. <br/>
            Hierna start je Professional Audit.
          </p>
          
          <form onSubmit={async (e) => {
              e.preventDefault();
              const user = auth.currentUser;
              await addDoc(collection(db, "users", user.uid, "accounts"), {
                  firm: promotingAccount.firm,
                  accountNumber: newPromotionData.accountNumber,
                  size: Number(newPromotionData.startBalance),
                  startBalance: Number(newPromotionData.startBalance),
                  balance: Number(newPromotionData.startBalance),
                  profitTarget: Number(newPromotionData.profitTarget),
                  maxDrawdown: Number(newPromotionData.maxDrawdown),
                  stage: promotingAccount.stage === 'Phase 1' ? 'Phase 2' : 'Funded',
                  status: 'Active',
                  createdAt: new Date(),
                  accountCurrency: promotingAccount.accountCurrency || 'USD'
              });

              await updateDoc(doc(db, "users", user.uid, "accounts", promotingAccount.id), {
                  status: 'Inactive',
                  stage: 'Archived'
              });

              setIsUpgrading(false);
          }} style={{ display:'grid', gap: 15, textAlign: 'left' }}>
              <div className="input-group">
                <label className="input-label">Nieuw Account ID</label>
                <input className="apple-input" placeholder="Bijv. 8061121" value={newPromotionData.accountNumber} onChange={e => setNewPromotionData({...newPromotionData, accountNumber: e.target.value})} required />
              </div>
              <div className="input-group">
                <label className="input-label">Startbalans</label>
                <input className="apple-input" type="number" value={newPromotionData.startBalance} onChange={e => setNewPromotionData({...newPromotionData, startBalance: e.target.value})} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                  <div className="input-group">
                    <label className="input-label">Target</label>
                    <input className="apple-input" type="number" value={newPromotionData.profitTarget} onChange={e => setNewPromotionData({...newPromotionData, profitTarget: e.target.value})} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Max Drawdown</label>
                    <input className="apple-input" type="number" value={newPromotionData.maxDrawdown} onChange={e => setNewPromotionData({...newPromotionData, maxDrawdown: e.target.value})} />
                  </div>
              </div>
              
              <div style={{ marginTop: 10 }}>
                <button type="submit" className="btn-primary" style={{ background: '#30D158', height: '50px', fontSize: '15px' }}>
                    Save & Start Professional Audit
                </button>
                <button 
                    type="button" 
                    onClick={() => { setIsUpgrading(false); setPromotingAccount(null); }} 
                    style={{ width: '100%', padding: '14px', background: 'transparent', color: '#8E8E93', border: 'none', fontWeight: 600, fontSize: '14px', cursor: 'pointer', marginTop: 5 }}
                >
                    Cancel
                </button>
              </div>
          </form>
      </div>
  </div>
)}

      {/* PROMOTION & SETTINGS MODALS (Huidige functionaliteit behouden) */}
      {promotingAccount && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', backdropFilter:'blur(10px)', zIndex:2100, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
            <div className="bento-card" style={{ width: '100%', maxWidth: 400, padding: 30 }}>
                <h2 style={{fontWeight:900, textAlign:'center'}}>Next Stage</h2>
                <form onSubmit={executePromotion} style={{ display:'grid', gap:15 }}>
                    <input className="apple-input" placeholder="New ID" value={newPromotionData.accountNumber} onChange={e => setNewPromotionData({...newPromotionData, accountNumber: e.target.value})} required />
                    <input className="apple-input" type="number" placeholder="New Balance" value={newPromotionData.startBalance} onChange={e => setNewPromotionData({...newPromotionData, startBalance: e.target.value})} required />
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                        <input className="apple-input" type="number" placeholder="Profit Target" value={newPromotionData.profitTarget} onChange={e => setNewPromotionData({...newPromotionData, profitTarget: e.target.value})} />
                        <input className="apple-input" type="number" placeholder="Max DD" value={newPromotionData.maxDrawdown} onChange={e => setNewPromotionData({...newPromotionData, maxDrawdown: e.target.value})} />
                    </div>
                    <button type="submit" className="btn-primary" style={{ background: '#30D158' }}>Activate Phase</button>
                    <button type="button" onClick={() => setPromotingAccount(null)} className="btn-ghost">Cancel</button>
                </form>
            </div>
        </div>
      )}

      {/* --- INITIALIZE NEXT PHASE MODAL (CLEAN APPLE STYLE) --- */}
{isUpgrading && promotingAccount && (
  <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', backdropFilter:'blur(15px)', zIndex:6000, display:'flex', alignItems: 'center', justifyContent:'center', padding:20 }}>
      <div className="bento-card" style={{ width: '100%', maxWidth: 450, padding: 30, textAlign: 'center' }}>
          <div style={{ background: '#30D15815', width: 50, height: 50, borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
             <PlusCircle size={28} color="#30D158" weight="fill" />
          </div>
          <h3 style={{fontWeight: 900, fontSize: '22px', marginBottom: 10}}>Initialize Next Phase</h3>
          <p style={{fontSize: 13, color: '#86868B', marginBottom: 25}}>Configureer je nieuwe fase. Hierna start je audit.</p>
          <form onSubmit={async (e) => {
              e.preventDefault();
              // 1. Maak het NIEUWE account aan
        await addDoc(collection(db, "users", auth.currentUser.uid, "accounts"), {
            // ... nieuwe data (Phase 2 of Funded)
            status: 'Active',
            createdAt: new Date()
        });

        // 2. Update het OUDE account naar Archived
        await updateDoc(doc(db, "users", auth.currentUser.uid, "accounts", promotingAccount.id), {
            status: 'Inactive', // Zorgt dat het niet meer als 'Active' telt
            stage: 'Archived'   // Zorgt dat het dashboard filter hem negeert
        });
              await updateDoc(doc(db, "users", auth.currentUser.uid, "accounts", promotingAccount.id), { status: 'Inactive', stage: 'Archived' });
              setIsUpgrading(false);
          }} style={{ display:'grid', gap: 15, textAlign: 'left' }}>
              <div className="input-group"><label className="input-label">Nieuw Account ID</label><input className="apple-input" value={newPromotionData.accountNumber} onChange={e => setNewPromotionData({...newPromotionData, accountNumber: e.target.value})} required /></div>
              <div className="input-group"><label className="input-label">Startbalans</label><input className="apple-input" type="number" value={newPromotionData.startBalance} onChange={e => setNewPromotionData({...newPromotionData, startBalance: e.target.value})} required /></div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:15 }}>
                  <div className="input-group"><label className="input-label">Target</label><input className="apple-input" type="number" value={newPromotionData.profitTarget} onChange={e => setNewPromotionData({...newPromotionData, profitTarget: e.target.value})} /></div>
                  <div className="input-group"><label className="input-label">Max DD</label><input className="apple-input" type="number" value={newPromotionData.maxDrawdown} onChange={e => setNewPromotionData({...newPromotionData, maxDrawdown: e.target.value})} /></div>
              </div>
              <button type="submit" className="btn-primary" style={{ background: '#30D158' }}>Save & Start Professional Audit</button>
              <button type="button" onClick={() => { setIsUpgrading(false); setPromotingAccount(null); }} style={{ width: '100%', padding: '14px', background: 'transparent', color: '#8E8E93', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          </form>
      </div>
  </div>
)}

     {editingAccount && (
  <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', backdropFilter:'blur(15px)', zIndex:2000, display:'flex', alignItems: 'center', justifyContent:'center', padding:20 }}>
      <div className="bento-card" style={{ width: '100%', maxWidth: 500, padding: 30 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h3 style={{fontWeight:900, margin: 0}}>Account Details</h3>
                {/* HET POTLOOD OM BEWERKEN TE ACTIVEREN */}
                {!isEditMode && (
                    <button 
                      type="button"
                      onClick={() => setIsEditMode(true)} 
                      style={{ background: 'rgba(0, 122, 255, 0.1)', border: 'none', color: '#007AFF', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '11px', fontWeight: 700 }}
                    >
                        <Gear size={14} weight="bold" /> EDIT
                    </button>
                )}
            </div>
            <button onClick={() => { setEditingAccount(null); setIsEditMode(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24}/></button>
          </div>

          <form onSubmit={handleUpdate} style={{ display:'grid', gap:15 }}>
              {/* Alle velden hebben nu readOnly={!isEditMode} */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 10 }}>
                <div className="input-group">
                  <label className="input-label">Prop Firm</label>
                  <input 
                    className="apple-input" 
                    readOnly={!isEditMode}
                    style={{ background: isEditMode ? '#FFFFFF' : '#F5F5F7', border: isEditMode ? '1px solid #007AFF' : '1px solid rgba(0,0,0,0.05)' }}
                    value={editingAccount.firm} 
                    onChange={e => setEditingAccount({...editingAccount, firm: e.target.value})} 
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Purchase Date</label>
                  <input type="date" className="apple-input" readOnly={!isEditMode} style={{ background: isEditMode ? '#FFFFFF' : '#F5F5F7' }} value={editingAccount.purchaseDate || ''} onChange={e => setEditingAccount({...editingAccount, purchaseDate: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="input-group">
                  <label className="input-label">Login ID</label>
                  <input className="apple-input" readOnly={!isEditMode} style={{ background: isEditMode ? '#FFFFFF' : '#F5F5F7' }} value={editingAccount.accountNumber || ''} onChange={e => setEditingAccount({...editingAccount, accountNumber: e.target.value})} />
                </div>
                <div className="input-group">
                  <label className="input-label">Stage</label>
                  <select className="apple-input" disabled={!isEditMode} style={{ background: isEditMode ? '#FFFFFF' : '#F5F5F7' }} value={editingAccount.stage} onChange={e => setEditingAccount({...editingAccount, stage: e.target.value})}>
                    {ALL_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Start Balance</label>
                <input className="apple-input" type="number" readOnly={!isEditMode} style={{ background: isEditMode ? '#FFFFFF' : '#F5F5F7' }} value={editingAccount.startBalance} onChange={e => setEditingAccount({...editingAccount, startBalance: Number(e.target.value)})} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="input-group">
                  <label className="input-label">Target</label>
                  <input className="apple-input" type="number" readOnly={!isEditMode} style={{ background: isEditMode ? '#FFFFFF' : '#F5F5F7' }} value={editingAccount.profitTarget} onChange={e => setEditingAccount({...editingAccount, profitTarget: Number(e.target.value)})} />
                </div>
                <div className="input-group">
                  <label className="input-label">Max DD</label>
                  <input className="apple-input" type="number" readOnly={!isEditMode} style={{ background: isEditMode ? '#FFFFFF' : '#F5F5F7' }} value={editingAccount.maxDrawdown} onChange={e => setEditingAccount({...editingAccount, maxDrawdown: Number(e.target.value)})} />
                </div>
              </div>
              
              <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                {/* Save knop verschijnt enkel als isEditMode actief is én er iets gewijzigd is */}
                {isEditMode && JSON.stringify(editingAccount) !== JSON.stringify(originalAccountData) && (
                    <button type="submit" className="btn-primary" style={{ background: 'var(--blue)' }}>Save Changes</button>
                )}
                <button type="button" onClick={async () => { if(confirm('Breach?')) { await updateDoc(doc(db, "users", auth.currentUser.uid, "accounts", editingAccount.id), { stage: 'Breached', status: 'Inactive', postMortemCompleted: false }); setEditingAccount(null); } }} style={{ height:44, background:'rgba(255, 59, 48, 0.1)', color:'#FF3B30', border:'none', borderRadius:12, fontWeight:700, cursor:'pointer' }}>MARK AS BREACHED</button>
              </div>
          </form>
      </div>
  </div>
)}
    </div>
  );
}