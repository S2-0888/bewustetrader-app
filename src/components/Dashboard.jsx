import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, where, addDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { PlusCircle, Bank, Sparkle, Pulse } from '@phosphor-icons/react';
import * as W from './DashboardWidgets';
import WeeklyReviewWidget from './WeeklyReviewWidget'; 
import NotificationBell from './NotificationBell';
import { useRef } from 'react'; // Voeg useRef toe aan de React import
import { Microphone, Stop, CheckCircle, ShieldCheck } from '@phosphor-icons/react';

// --- TCT COACH COMPONENT (ONGEWIJZIGD) ---
const TCTCoach = ({ trades, winrate, adherence, userProfile }) => {
  const [insight, setInsight] = useState("TCT is aan het analyseren...");
  const [loading, setLoading] = useState(true);

  const handleRefresh = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, { lastAiUpdate: null });
    } catch (err) {
      console.error("Refresh error:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchTCTInsight = async () => {
      if (!auth.currentUser || !userProfile || trades.length === 0) return;
      const today = new Date().toISOString().split('T')[0];
      
      if (userProfile.lastAiUpdate === today && userProfile.aiCoachFeedback) {
        setInsight(userProfile.aiCoachFeedback);
        setLoading(false);
        return; 
      }

      setLoading(true);
      try {
        const functions = getFunctions(undefined, 'europe-west1');
        const getTCTInsight = httpsCallable(functions, 'getTCTInsight');
        const result = await getTCTInsight({
          stats: { winrate, adherence },
          recentTrades: trades.slice(0, 3) 
        });
        const newInsight = result.data.insight;
        setInsight(newInsight);
        await updateDoc(doc(db, "users", auth.currentUser.uid), {
          aiCoachFeedback: newInsight,
          lastAiUpdate: today
        });
      } catch (err) {
        console.error("TCT Error:", err);
        setInsight(userProfile.aiCoachFeedback || "Focus on your process.");
      }
      setLoading(false);
    };
    fetchTCTInsight();
  }, [trades.length, userProfile?.lastAiUpdate || null, userProfile?.shadow_analysis || null]); 

  return (
    <div style={{ 
      marginBottom: '25px', background: 'rgba(255, 255, 255, 0.7)', padding: '24px 28px', 
      borderRadius: '28px', border: '1px solid rgba(66, 133, 244, 0.12)', position: 'relative', 
      overflow: 'hidden', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', gap: '12px'
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '3px', background: 'linear-gradient(90deg, #4285F4 0%, #9B72CB 100%)', opacity: 0.4 }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'rgba(66, 133, 244, 0.08)', padding: '6px', borderRadius: '10px', display: 'flex' }}>
            <Sparkle size={16} weight="fill" color="#4285F4" />
          </div>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#4285F4', letterSpacing: '1px', textTransform: 'uppercase' }}>
            {loading ? 'Analyzing Data' : 'AI Coach Insight'}
          </span>
          {!loading && (
            <button onClick={handleRefresh} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0, marginLeft: 4 }}>
              <Pulse size={14} color="#4285F4" weight="bold" />
            </button>
          )}
        </div>
      </div>
      <p style={{ color: '#3C4043', fontSize: '16px', lineHeight: '1.6', margin: 0, fontWeight: 500, fontStyle: 'italic', opacity: loading ? 0.6 : 1 }}>
        "{insight}"
      </p>
    </div>
  );
};

// --- MAIN DASHBOARD ---
export default function Dashboard({ setView }) {
  const [trades, setTrades] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [globalBroadcast, setGlobalBroadcast] = useState(null); 
  const [timeRange, setTimeRange] = useState('ALL');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [vaultVersion, setVaultVersion] = useState(localStorage.getItem('vaultStyle') || 'V1');
  const [pendingCount, setPendingCount] = useState(0);
  const [showAudit, setShowAudit] = useState(false);
  const [auditAccount, setAuditAccount] = useState(null);
  const [auditAnswers, setAuditAnswers] = useState({ planPct: '', riskControl: '', emotion: '' });
  // --- AUDIO RECORDING LOGIC ---
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const [audioBlob, setAudioBlob] = useState(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
      mediaRecorder.current.onstop = () => setAudioBlob(new Blob(audioChunks.current, { type: 'audio/webm' }));
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

  const handleFinalizeEdgeAudit = async () => {
    if (!auditAccount) return;
    const user = auth.currentUser;
    try {
      // 1. Update het account met de audit data
      const accountRef = doc(db, "users", user.uid, "accounts", auditAccount.id);
      await updateDoc(accountRef, {
        postMortemCompleted: true,
        auditAnswers: {
          ...auditAnswers,
          type: 'PASSED_EDGE_VALIDATION',
          submittedAt: new Date(),
          hasAudio: !!audioBlob // Indicator voor Intelligence
        }
      });

      // 2. Zoek en sluit de bijbehorende notificatie om de loop te stoppen
      const qNotif = query(
        collection(db, "users", user.uid, "notifications"), 
        where("accountId", "==", auditAccount.id),
        where("status", "==", "pending")
      );
      
      // In een echte omgeving zou je hier getDocs gebruiken en de status op 'completed' zetten
      // Voor nu triggeren we de UI-sluiting
      setShowAudit(false);
      setAuditAccount(null);
      setAudioBlob(null);
      setAuditAnswers({ planPct: '', riskControl: '', emotion: '' });
      
      // Optioneel: Forceer een refresh van de pendingCount indien nodig
    } catch (err) { 
      console.error("Finalize error:", err); 
    }
  };

  // --- UPGRADE MODAL STATES ---
  const [upgradingAccount, setUpgradingAccount] = useState(null);
  const [upgradeForm, setUpgradeForm] = useState({
    accountNumber: '',
    size: '',
    profitTarget: '',
    maxDrawdown: '',
    purchaseDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    const user = auth.currentUser;
    if (!user) return;

    const unsubBroadcast = onSnapshot(doc(db, "system", "broadcast"), (d) => {
      if (d.exists()) {
        const data = d.data();
        const now = new Date().getTime();
        if (data.active && data.expiresAt > now) setGlobalBroadcast(data.message);
        else setGlobalBroadcast(null);
      }
    });

    onSnapshot(doc(db, "users", user.uid), (snap) => setUserProfile(snap.data()));
    onSnapshot(query(collection(db, "users", user.uid, "trades"), orderBy("date", "desc")), (snap) => {
      setTrades(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    onSnapshot(query(collection(db, "users", user.uid, "accounts")), (snap) => {
      setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Definieer de unsub voor notificaties direct
    const qNotifs = query(collection(db, "users", user.uid, "notifications"), where("status", "==", "pending"));
    const unsubNotifs = onSnapshot(qNotifs, (snap) => {
      const now = Date.now();
      const activeNotifs = snap.docs.filter(d => !d.data().expiresAt || d.data().expiresAt > now);
      setPendingCount(activeNotifs.length);
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      unsubBroadcast();
      unsubNotifs(); // Nu werkt deze correct
    };
  }, []);

  const handleExecuteUpgrade = async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user || !upgradingAccount) return;

  try {
    const oldAccountData = { ...upgradingAccount };
    const nextStage = upgradingAccount.stage === 'Phase 1' ? 'Phase 2' : 'Funded';

    // 1. Maak het nieuwe account aan
    await addDoc(collection(db, "users", user.uid, "accounts"), {
      firm: oldAccountData.firm,
      accountNumber: upgradeForm.accountNumber,
      size: Number(upgradeForm.size),
      startBalance: Number(upgradeForm.size),
      balance: Number(upgradeForm.size),
      profitTarget: Number(upgradeForm.profitTarget),
      maxDrawdown: Number(upgradeForm.maxDrawdown),
      stage: nextStage,
      status: 'Active',
      createdAt: new Date(),
      accountCurrency: oldAccountData.accountCurrency || 'USD',
      postMortemCompleted: true 
    });

    // 2. Archiveer het oude account
    const oldRef = doc(db, "users", user.uid, "accounts", oldAccountData.id);
    await updateDoc(oldRef, {
      status: 'Inactive',
      stage: 'Archived',
      postMortemCompleted: false, // Trigger voor de audit
      archivedAt: new Date()
    });

    // Voeg notificatie toe voor de Professional Audit (24u geldig)
    await addDoc(collection(db, "users", user.uid, "notifications"), {
      type: "AUDIT_REQUIRED",
      accountId: oldAccountData.id,
      title: "Professional Audit Vereist",
      message: `${oldAccountData.firm} succesvol afgerond. Valideer je proces.`,
      status: "pending",
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), 
      createdAt: new Date()
    });

    // 3. Open de Audit direct op het dashboard
    setAuditAccount(oldAccountData);
    setShowAudit(true);
    setUpgradingAccount(null);
  } catch (err) {
    console.error("Upgrade error:", err);
  }
};

  // Filter Logica
  const filteredTrades = trades.filter(t => {
    if (timeRange === 'ALL') return true;
    const pastDate = new Date();
    if (timeRange === '7D') pastDate.setDate(pastDate.getDate() - 7);
    if (timeRange === '30D') pastDate.setDate(pastDate.getDate() - 30);
    return new Date(t.date) >= pastDate;
  });

  const closedTrades = filteredTrades.filter(t => t.status === 'CLOSED');
  const winrate = closedTrades.length > 0 ? Math.round((closedTrades.filter(t => Number(t.pnl) > 0).length / closedTrades.length) * 100) : 0;
  const avgDiscipline = closedTrades.length > 0 ? Math.round(closedTrades.reduce((sum, t) => sum + (t.disciplineScore === 100 ? 100 : 0), 0) / closedTrades.length) : 0;
  
  const money = (val) => {
    const symbol = userProfile?.baseCurrency === 'EUR' ? '€' : '$';
    return `${symbol}${Math.abs(Math.round(val)).toLocaleString('nl-NL')}`;
  };

  const expectancyData = [...closedTrades].sort((a, b) => new Date(a.date) - new Date(b.date)).reduce((acc, t, i) => {
    const tradeR = Number(t.pnl) / (Number(t.risk) || 1);
    const prevVal = i === 0 ? 0 : acc[i - 1].val;
    acc.push({ trade: i + 1, val: prevVal + (isNaN(tradeR) ? 0 : tradeR) });
    return acc;
  }, []);

  return (
    <div style={{ background: '#F5F5F7', minHeight: '100vh', paddingBottom: 100 }}>
      
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '10px 15px 0' : '20px 20px 0' }}>
         <W.SystemBroadcast message={globalBroadcast} />
      </div>
      
      <div style={{ padding: isMobile ? '15px' : '20px 20px', maxWidth: 1200, margin: '0 auto', overflowX: 'hidden' }}>
        
        {/* HEADER SECTIE */}
        <div style={{ marginBottom: 25, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:15 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 style={{ fontSize: isMobile ? '26px' : '32px', fontWeight: 800, margin: 0, letterSpacing: '-1px' }}>Cockpit</h1>
              <NotificationBell 
  pendingCount={pendingCount} 
  onClick={() => setView('settings')} 
  onAuditClick={() => {
    // Zoek het eerste account dat nog een audit nodig heeft
    const accToAudit = accounts.find(a => !a.postMortemCompleted && (a.stage === 'Archived' || a.stage === 'Funded' || a.stage === 'Breached'));
    if (accToAudit) {
      setAuditAccount(accToAudit);
      setShowAudit(true);
    }
  }}
/>
              {userProfile?.isFounder && <div style={{ background: 'linear-gradient(135deg, #AF52DE 0%, #5856D6 100%)', color: 'white', padding: '4px 10px', borderRadius: '30px', fontSize: '9px', fontWeight: 800 }}>FOUNDER</div>}
            </div>
            {!isMobile && <p style={{ color: '#86868B', fontSize: '14px' }}>Strategic overview of your trading operations.</p>}
          </div>
          
          <div style={{ background: 'rgba(0,0,0,0.05)', padding: 4, borderRadius: 12, display: 'flex' }}>
            {['7D', '30D', 'ALL'].map(range => (
              <button key={range} onClick={() => setTimeRange(range)} style={{ border: 'none', background: timeRange === range ? 'white' : 'transparent', padding: isMobile ? '6px 10px' : '8px 12px', borderRadius: 9, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>{range}</button>
            ))}
          </div>
        </div>

        <WeeklyReviewWidget />

        <TCTCoach trades={closedTrades} winrate={winrate} adherence={avgDiscipline} userProfile={userProfile} />

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.7fr 1fr', gap: 15, marginBottom: 25 }}>
            <W.PerformanceWidget winrate={winrate} avgDiscipline={avgDiscipline} trades={closedTrades} isMobile={isMobile} />
            {!isMobile && <W.FormGuideWidget lastTrades={closedTrades.slice(-10)} />}
        </div>

        {/* MOBILE QUICK ACTIONS */}
        {isMobile && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 25 }}>
            <button onClick={() => setView('tradelab')} style={{ background: '#1C1C1E', color: 'white', border: 'none', padding: '14px', borderRadius: '16px', fontWeight: 800, fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}><PlusCircle size={20} weight="fill" /> LOG TRADE</button>
            <button onClick={() => setView('finance')} style={{ background: '#30D158', color: 'white', border: 'none', padding: '14px', borderRadius: '16px', fontWeight: 800, fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}><Bank size={20} weight="fill" /> FINANCE</button>
          </div>
        )}

        {!isMobile && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, marginBottom: 40 }}>
            <W.ExecutionBlueprintWidget trades={closedTrades} />
            <W.ExpectancyWidget data={expectancyData} money={money} />
          </div>
        )}

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 15 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Pulse size={20} weight="bold" color="#1D1D1F" />
                <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.5px' }}>ACTIVE VAULT</div>
            </div>
            {!isMobile ? (
              <div style={{ background: 'rgba(0,0,0,0.05)', padding: '3px', borderRadius: '10px', display: 'flex', gap: '4px' }}>
                  {[{ id: 'V1', label: 'PREMIUM' }, { id: 'V2', label: 'ANALYTIC' }, { id: 'V3', label: 'NANO' }].map(v => (
                    <button key={v.id} onClick={() => setVaultVersion(v.id)} style={{ border: 'none', background: vaultVersion === v.id ? 'white' : 'transparent', padding: '6px 12px', borderRadius: '8px', fontSize: '9px', fontWeight: 800, cursor: 'pointer', color: vaultVersion === v.id ? '#007AFF' : '#8E8E93' }}>{v.label}</button>
                  ))}
              </div>
            ) : ( <span style={{ fontSize: 9, color: '#8E8E93', fontWeight: 800 }}>SWIPE LEFT →</span> )}
        </div>
        
        <div 
          className="active-vault-scroll"
          style={{ 
            display: isMobile ? 'flex' : 'grid', 
            gridTemplateColumns: isMobile ? 'none' : vaultVersion === 'V3' ? 'repeat(auto-fill, minmax(280px, 1fr))' : 'repeat(auto-fill, minmax(320px, 1fr))', 
            gap: isMobile ? 10 : 15, 
            width: isMobile ? 'calc(100% + 30px)' : '100%', 
            marginLeft: isMobile ? '-15px' : '0', 
            paddingLeft: isMobile ? '15px' : '0', 
            paddingRight: isMobile ? '15px' : '0', 
            overflowX: isMobile ? 'auto' : 'visible', 
            scrollSnapType: isMobile ? 'x mandatory' : 'none', 
            paddingBottom: 15 
          }}
        >
          {accounts
            .filter(a => a.status === 'Active' && a.stage !== 'Archived') 
            .map(acc => {
            const accTrades = trades.filter(t => t.accountId === acc.id && t.status === 'CLOSED');
            const currentBal = (Number(acc.startBalance) || 0) + accTrades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
            const isTargetMet = currentBal >= (Number(acc.startBalance) + Number(acc.profitTarget)) && ['Phase 1', 'Phase 2'].includes(acc.stage);

            return (
              <div key={acc.id} style={{ flex: isMobile ? '0 0 88%' : 'none', scrollSnapAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10, marginRight: isMobile ? '10px' : '0' }}>
                  <W.AccountCard 
                    acc={acc} 
                    balance={currentBal} 
                    isTargetMet={isTargetMet} 
                    onUpgrade={() => {
                        setUpgradingAccount(acc);
                        setUpgradeForm({
                          accountNumber: '',
                          size: acc.size,
                          profitTarget: acc.profitTarget,
                          maxDrawdown: acc.maxDrawdown,
                          purchaseDate: new Date().toISOString().split('T')[0]
                        });
                    }} 
                    money={money} 
                    version={isMobile ? 'V3' : vaultVersion} 
                />
              </div>
            );
        })}
        </div>
      </div>

      {/* --- NEXT PHASE MODAL (MET DRAWDOWN & DATE) --- */}
      {upgradingAccount && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', backdropFilter:'blur(15px)', zIndex:9999, display:'flex', alignItems: 'center', justifyContent:'center', padding:20 }}>
            <div style={{ background: 'white', width: '100%', maxWidth: 450, padding: 30, borderRadius: 28, textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
                <div style={{ background: '#30D15815', width: 60, height: 60, borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                   <Sparkle size={32} color="#30D158" weight="fill" />
                </div>
                <h2 style={{ fontWeight: 900, fontSize: '24px', margin: '0 0 10px' }}>Initialize {upgradingAccount.stage === 'Phase 1' ? 'Phase 2' : 'Funded'}</h2>
                <p style={{ color: '#86868B', fontSize: '13px', marginBottom: 25 }}>Stel de parameters in voor je nieuwe account.</p>
                
                <form onSubmit={handleExecuteUpgrade} style={{ display:'grid', gap: 15, textAlign: 'left' }}>
                    <div style={{ display: 'grid', gap: 5 }}>
                      <label style={{ fontSize: 10, fontWeight: 800, color: '#86868B', marginLeft: 5 }}>NEW ACCOUNT LOGIN ID</label>
                      <input style={{ padding: '12px', borderRadius: 12, border: '1px solid #E5E5EA', background: '#F5F5F7', fontSize: '15px', fontWeight: 600 }} placeholder="New Login ID" value={upgradeForm.accountNumber} onChange={e => setUpgradeForm({...upgradeForm, accountNumber: e.target.value})} required />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                      <div style={{ display: 'grid', gap: 5 }}>
                        <label style={{ fontSize: 10, fontWeight: 800, color: '#86868B', marginLeft: 5 }}>SIZE</label>
                        <input type="number" style={{ padding: '12px', borderRadius: 12, border: '1px solid #E5E5EA', background: '#F5F5F7' }} value={upgradeForm.size} onChange={e => setUpgradeForm({...upgradeForm, size: e.target.value})} required />
                      </div>
                      <div style={{ display: 'grid', gap: 5 }}>
                        <label style={{ fontSize: 10, fontWeight: 800, color: '#86868B', marginLeft: 5 }}>TARGET</label>
                        <input type="number" style={{ padding: '12px', borderRadius: 12, border: '1px solid #E5E5EA', background: '#F5F5F7' }} value={upgradeForm.profitTarget} onChange={e => setUpgradeForm({...upgradeForm, profitTarget: e.target.value})} required />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                      <div style={{ display: 'grid', gap: 5 }}>
                        <label style={{ fontSize: 10, fontWeight: 800, color: '#86868B', marginLeft: 5 }}>MAX DRAWDOWN</label>
                        <input type="number" style={{ padding: '12px', borderRadius: 12, border: '1px solid #E5E5EA', background: '#F5F5F7' }} value={upgradeForm.maxDrawdown} onChange={e => setUpgradeForm({...upgradeForm, maxDrawdown: e.target.value})} required />
                      </div>
                      <div style={{ display: 'grid', gap: 5 }}>
                        <label style={{ fontSize: 10, fontWeight: 800, color: '#86868B', marginLeft: 5 }}>PURCHASE DATE</label>
                        <input type="date" style={{ padding: '12px', borderRadius: 12, border: '1px solid #E5E5EA', background: '#F5F5F7' }} value={upgradeForm.purchaseDate} onChange={e => setUpgradeForm({...upgradeForm, purchaseDate: e.target.value})} required />
                      </div>
                    </div>

                    <button type="submit" style={{ background: '#30D158', color: 'white', border: 'none', padding: '16px', borderRadius: 16, fontWeight: 800, fontSize: '16px', cursor: 'pointer', marginTop: 10 }}>Activate Next Phase</button>
                    <button type="button" onClick={() => setUpgradingAccount(null)} style={{ background: 'transparent', color: '#86868B', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                </form>
            </div>
        </div>
      )}
      {/* --- PLAK HIER DE PROFESSIONAL AUDIT OVERLAY --- */}
    {showAudit && auditAccount && (
  <div style={{ 
    position: 'fixed', inset: 0, background: '#F2F2F7', zIndex: 10000, 
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? 10 : 20 
  }}>
    <div style={{ 
      maxWidth: 500, width: '100%', maxHeight: '95vh', overflowY: 'auto', // Zorgt voor scrollen op kleine schermen
      background: 'white', borderRadius: '35px', padding: isMobile ? '25px 20px' : '40px 30px', 
      boxShadow: '0 20px 60px rgba(0,0,0,0.05)', position: 'relative'
    }}>
      
      {/* Status Badge */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: '#30D15815', borderRadius: '100px', marginBottom: 20, border: '1px solid #30D15830' }}>
        <ShieldCheck size={16} color="#30D158" weight="fill" />
        <span style={{ fontSize: '11px', fontWeight: 800, color: '#1C6B30' }}>{auditAccount.firm} PASSED</span>
      </div>

      <h2 style={{ fontSize: '26px', fontWeight: 900, marginBottom: 8, letterSpacing: '-1.2px' }}>Professional Audit</h2>
      <p style={{ color: '#86868B', fontSize: '14px', lineHeight: '1.4', marginBottom: 25 }}>
        Authenticate your process to turn this success into a repeatable standard.
      </p>

      {/* Input Sectie */}
      <div style={{ textAlign: 'left', display: 'grid', gap: 20, marginBottom: 25 }}>
        <div>
          <label style={{ fontSize: '10px', fontWeight: 900, color: '#86868B', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Execution Integrity</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {["IMPROVISED", "DISCIPLINED", "ELITE"].map(v => (
              <button key={v} onClick={() => setAuditAnswers({...auditAnswers, planPct: v})} style={{ padding: '12px 5px', borderRadius: '12px', border: auditAnswers.planPct === v ? '2px solid #30D158' : '1px solid #E5E5EA', background: auditAnswers.planPct === v ? '#30D15805' : 'white', fontWeight: 800, fontSize: '10px', cursor: 'pointer' }}>{v}</button>
            ))}
          </div>
        </div>

        <div style={{ borderRadius: '20px', border: '1px solid #E5E5EA', overflow: 'hidden', background: '#F9F9F9' }}>
          <textarea 
            placeholder="Describe your process integrity here..."
            value={auditAnswers.emotion}
            onChange={(e) => setAuditAnswers({...auditAnswers, emotion: e.target.value})}
            style={{ width: '100%', minHeight: '80px', padding: '15px', border: 'none', background: 'transparent', fontSize: '14px', outline: 'none', fontFamily: 'inherit', display: 'block' }}
          />
          
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px' }}>
            <div style={{ flex: 1, height: '1px', background: '#E5E5EA' }} />
            <span style={{ padding: '0 10px', fontSize: '9px', fontWeight: 800, color: '#AEAEB2' }}>OR SPEAK</span>
            <div style={{ flex: 1, height: '1px', background: '#E5E5EA' }} />
          </div>

          <div style={{ padding: '15px', textAlign: 'center' }}>
            <button type="button" onClick={isRecording ? stopRecording : startRecording} style={{ width: 48, height: 48, borderRadius: '50%', background: isRecording ? '#FF453A' : '#1C1C1E', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', margin: '0 auto 8px', transition: '0.3s' }}>
              {isRecording ? <Stop size={22} weight="fill" color="white" /> : <Microphone size={22} weight="fill" color="white" />}
            </button>
            <p style={{ fontSize: '10px', fontWeight: 700, color: isRecording ? '#FF453A' : '#1D1D1F', margin: 0 }}>
              {isRecording ? "Listening..." : (audioBlob ? "Voice Authenticated ✓" : "Voice for AI Analysis")}
            </p>
          </div>
        </div>
      </div>

      <button 
        disabled={!auditAnswers.planPct || (!auditAnswers.emotion.trim() && !audioBlob)}
        onClick={handleFinalizeEdgeAudit}
        style={{ width: '100%', padding: '18px', borderRadius: '18px', background: '#1C1C1E', color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', opacity: (!auditAnswers.planPct || (!auditAnswers.emotion.trim() && !audioBlob)) ? 0.3 : 1 }}
      >
        SAVE EDGE VALIDATION
      </button>

      <button onClick={() => setShowAudit(false)} style={{ background: 'none', border: 'none', color: '#86868B', fontWeight: 700, cursor: 'pointer', fontSize: '13px', marginTop: 15 }}>
        Snooze (Blijft in Cockpit)
      </button>
    </div>
  </div>
)}
    </div> 
  );
}