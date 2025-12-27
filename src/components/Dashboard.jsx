import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, onSnapshot, orderBy, updateDoc, doc, addDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions'; // NIEUW
import { Trophy, Crown, Pulse, CaretRight, Layout, PlusCircle, Bank, Sparkle } from '@phosphor-icons/react';
import * as W from './DashboardWidgets';

// --- TCT COACH COMPONENT ---
const TCTCoach = ({ trades, winrate, adherence }) => {
  const [insight, setInsight] = useState("TCT is aan het analyseren...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTCTInsight = async () => {
      setLoading(true);
      try {
        const functions = getFunctions();
        const getTCTInsight = httpsCallable(functions, 'getTCTInsight');
        const result = await getTCTInsight({
          stats: { winrate, adherence },
          recentTrades: trades.slice(0, 3) 
        });
        setInsight(result.data.insight);
      } catch (err) {
        setInsight("Blijf gefocust op je blueprint. De weg naar meesterschap is een marathon.");
      }
      setLoading(false);
    };

    if (trades.length > 0) fetchTCTInsight();
  }, [trades.length]);

  return (
    <div style={{ 
      background: 'linear-gradient(135deg, #1C1C1E 0%, #2C2C2E 100%)', 
      padding: '20px 24px', 
      borderRadius: '24px', 
      marginBottom: '25px',
      border: '1px solid rgba(10, 132, 255, 0.15)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
      position: 'relative', 
      overflow: 'hidden',
      transition: 'all 0.4s ease'
    }}>
      {/* Zachte achtergrond gloed voor elegantie */}
      <div style={{ 
        position: 'absolute', top: '-50%', left: '-10%', width: '40%', height: '200%', 
        background: 'radial-gradient(circle, rgba(10, 132, 255, 0.08) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
        <div style={{ background: 'rgba(10, 132, 255, 0.15)', padding: '6px', borderRadius: '10px', display: 'flex' }}>
          <Sparkle size={16} weight="fill" color="#0A84FF" />
        </div>
        <span style={{ fontSize: '11px', fontWeight: 800, color: '#0A84FF', letterSpacing: '1.2px', textTransform: 'uppercase' }}>
          TCT Coach | Inzicht
        </span>
        {loading && <div className="pulse-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#0A84FF' }} />}
      </div>
      
      <p style={{ 
        color: 'rgba(255, 255, 255, 0.95)', 
        fontSize: '15px', 
        lineHeight: '1.6', 
        margin: 0, 
        fontWeight: 500,
        fontStyle: 'italic',
        opacity: loading ? 0.5 : 1, 
        transition: 'opacity 0.3s ease'
      }}>
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
  const [timeRange, setTimeRange] = useState('ALL');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promoteAccount, setPromoteAccount] = useState(null);
  
  const [vaultVersion, setVaultVersion] = useState(localStorage.getItem('vaultStyle') || 'V1');

  const [nextPhaseForm, setNextPhaseForm] = useState({ 
    firm: '', size: '', type: 'Normal', stage: 'Phase 2', 
    accountNumber: '', profitTarget: '', maxDrawdown: '' 
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    const user = auth.currentUser;
    if (!user) return;

    onSnapshot(doc(db, "users", user.uid), (snap) => setUserProfile(snap.data()));

    onSnapshot(query(collection(db, "users", user.uid, "trades"), orderBy("date", "desc")), (snap) => {
      setTrades(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    onSnapshot(query(collection(db, "users", user.uid, "accounts")), (snap) => {
      setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem('vaultStyle', vaultVersion);
  }, [vaultVersion]);

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

  const openPromoteModal = (account) => {
    setPromoteAccount(account);
    const isP1 = account.stage === 'Phase 1';
    setNextPhaseForm({ 
        firm: account.firm, size: account.startBalance, stage: isP1 ? 'Phase 2' : 'Funded', 
        accountNumber: '',
        profitTarget: isP1 ? (Number(account.startBalance) * 0.05) : (Number(account.startBalance) * 0.10), 
        maxDrawdown: Number(account.maxDrawdown) || (Number(account.startBalance) * 0.10)
    });
  };

  const handlePromoteConfirm = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid, "accounts", promoteAccount.id), { stage: 'Archived', status: 'Passed' });
      await addDoc(collection(db, "users", auth.currentUser.uid, "accounts"), {
        ...nextPhaseForm, balance: Number(nextPhaseForm.size), startBalance: Number(nextPhaseForm.size), 
        profitTarget: Number(nextPhaseForm.profitTarget), maxDrawdown: Number(nextPhaseForm.maxDrawdown),
        purchaseDate: new Date().toISOString().split('T')[0], status: 'Active', 
        accountCurrency: promoteAccount.accountCurrency || 'USD', createdAt: new Date()
      });
      setPromoteAccount(null);
    } catch (err) { console.error(err); } finally { setIsSubmitting(false); }
  };

  return (
    <div style={{ padding: isMobile ? '15px' : '40px 20px', maxWidth: 1200, margin: '0 auto', background: '#F5F5F7', minHeight: '100vh', paddingBottom: 100, overflowX: 'hidden' }}>
      
      <W.SystemBroadcast message={userProfile?.systemBroadcast} />
      
      <div style={{ marginBottom: 25, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:15 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: isMobile ? '26px' : '32px', fontWeight: 800, margin: 0, letterSpacing: '-1px' }}>Cockpit</h1>
            {userProfile?.isFounder && <div style={{ background: 'linear-gradient(135deg, #AF52DE 0%, #5856D6 100%)', color: 'white', padding: '4px 10px', borderRadius: '30px', fontSize: '9px', fontWeight: 800 }}>FOUNDER</div>}
          </div>
          {!isMobile && <p style={{ color: '#86868B', fontSize: '14px' }}>Strategic overview of your trading operations.</p>}
        </div>
        
        <div style={{ background: 'rgba(0,0,0,0.05)', padding: 4, borderRadius: 12, display: 'flex' }}>
          {['7D', '30D', 'ALL'].map(range => (<button key={range} onClick={() => setTimeRange(range)} style={{ border: 'none', background: timeRange === range ? 'white' : 'transparent', padding: isMobile ? '6px 10px' : '8px 12px', borderRadius: 9, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>{range}</button>))}
        </div>
      </div>

      {/* TCT COACH COMPONENT - Elegant geplaatst boven de main widgets */}
      <TCTCoach trades={closedTrades} winrate={winrate} adherence={avgDiscipline} />

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.7fr 1fr', gap: 15, marginBottom: 25 }}>
          <W.PerformanceWidget winrate={winrate} avgDiscipline={avgDiscipline} trades={closedTrades} isMobile={isMobile} />
          {!isMobile && <W.FormGuideWidget lastTrades={closedTrades.slice(-10)} />}
      </div>

      {/* MOBILE QUICK ACTIONS */}
      {isMobile && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 25 }}>
          <button 
            onClick={() => setView('tradelab')}
            style={{ background: '#1C1C1E', color: 'white', border: 'none', padding: '14px', borderRadius: '16px', fontWeight: 800, fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          >
            <PlusCircle size={20} weight="fill" /> LOG TRADE
          </button>
          <button 
            onClick={() => setView('finance')}
            style={{ background: '#30D158', color: 'white', border: 'none', padding: '14px', borderRadius: '16px', fontWeight: 800, fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          >
            <Bank size={20} weight="fill" /> FINANCE
          </button>
        </div>
      )}

      {!isMobile && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, marginBottom: 40 }}>
          <W.ExecutionBlueprintWidget trades={closedTrades} />
          <W.ExpectancyWidget data={expectancyData} money={money} />
        </div>
      )}

      {/* ... De rest van de code (Vault, Accounts, Modals) blijft exact gelijk aan je origineel ... */}
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
          ) : (
            <span style={{ fontSize: 9, color: '#8E8E93', fontWeight: 800 }}>SWIPE LEFT →</span>
          )}
      </div>
      
      {/* ACCOUNT GRID & MODALS (hieronder je originele accounts logica aanhouden) */}
      <div style={{ display: isMobile ? 'flex' : 'grid', gridTemplateColumns: isMobile ? 'none' : vaultVersion === 'V3' ? 'repeat(auto-fill, minmax(280px, 1fr))' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: isMobile ? 10 : 15, width: isMobile ? 'calc(100% + 30px)' : '100%', marginLeft: isMobile ? '-15px' : '0', paddingLeft: isMobile ? '15px' : '0', paddingRight: isMobile ? '15px' : '0', overflowX: isMobile ? 'auto' : 'visible', scrollSnapType: isMobile ? 'x mandatory' : 'none', paddingBottom: 15 }}>
          {accounts.filter(a => a.stage !== 'Archived' && a.status === 'Active').map(acc => {
              const accTrades = trades.filter(t => t.accountId === acc.id && t.status === 'CLOSED');
              const currentBal = (Number(acc.startBalance) || 0) + accTrades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
              const progressPct = acc.stage === 'Funded' ? 0 : Math.min(Math.max(((currentBal - acc.startBalance) / (acc.profitTarget || 1)) * 100, 0), 100);
              const ddPct = Math.min((Math.max(acc.startBalance - currentBal, 0) / (acc.maxDrawdown || 1)) * 100, 100);

              return (
                <div key={acc.id} style={{ flex: isMobile ? '0 0 88%' : 'none', scrollSnapAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10, marginRight: isMobile ? '10px' : '0' }}>
                   <W.AccountCard acc={acc} balance={currentBal} progressPct={progressPct} ddPct={ddPct} money={money} isFunded={acc.stage === 'Funded'} version={isMobile ? 'V3' : vaultVersion} />
                </div>
              );
          })}
      </div>

      {promoteAccount && (
        /* Je originele Promote Modal code... */
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:10000, display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter: 'blur(15px)' }}>
            <div className="bento-card" style={{ width: '100%', maxWidth: 450, padding: 35 }}>
                 <div style={{ textAlign: 'center', marginBottom: 25 }}>
                    <Trophy size={48} weight="fill" color="#FFD60A" />
                    <h2 style={{ fontWeight: 900, fontSize: 22, margin: '10px 0' }}>Promotion Ready</h2>
                 </div>
                 <form onSubmit={handlePromoteConfirm} style={{ display: 'grid', gap: 15 }}>
                     <div className="input-group"><label className="input-label">Next Account ID</label><input className="apple-input" value={nextPhaseForm.accountNumber} onChange={e => setNextPhaseForm({...nextPhaseForm, accountNumber: e.target.value})} required /></div>
                     <button type="submit" className="btn-primary" style={{ width:'100%', height: 50, background: '#007AFF' }}>Start Next Stage</button>
                     <button type="button" onClick={() => setPromoteAccount(null)} style={{ border:'none', background:'none', color:'#86868B', fontSize: 12 }}>Cancel</button>
                 </form>
            </div>
        </div>
      )}
    </div>
  );
}