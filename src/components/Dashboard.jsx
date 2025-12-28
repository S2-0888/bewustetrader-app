import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, onSnapshot, orderBy, doc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { PlusCircle, Bank, Sparkle, Pulse } from '@phosphor-icons/react';
import * as W from './DashboardWidgets';
import WeeklyReviewWidget from './WeeklyReviewWidget'; 
import NotificationBell from './NotificationBell'; // NIEUWE IMPORT

// --- TCT COACH COMPONENT ---
const TCTCoach = ({ trades, winrate, adherence }) => {
  const [insight, setInsight] = useState("TCT is aan het analyseren...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTCTInsight = async () => {
      setLoading(true);
      try {
        const functions = getFunctions(undefined, 'europe-west1');
        const getTCTInsight = httpsCallable(functions, 'getTCTInsight');
        const result = await getTCTInsight({
          stats: { winrate, adherence },
          recentTrades: trades.slice(0, 3) 
        });
        setInsight(result.data.insight);
      } catch (err) {
        console.error("TCT Error:", err);
        setInsight("Blijf gefocust op je blueprint. De weg naar meesterschap is een marathon.");
      }
      setLoading(false);
    };

    if (trades.length > 0) fetchTCTInsight();
  }, [trades.length, winrate, adherence]);

  return (
    <div style={{ 
      marginBottom: '25px',
      background: 'rgba(255, 255, 255, 0.7)', 
      padding: '24px 28px', 
      borderRadius: '28px', 
      border: '1px solid rgba(66, 133, 244, 0.12)',
      position: 'relative', 
      overflow: 'hidden',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      transition: 'all 0.4s ease'
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '3px', background: 'linear-gradient(90deg, #4285F4 0%, #9B72CB 100%)', opacity: 0.4 }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'rgba(66, 133, 244, 0.08)', padding: '6px', borderRadius: '10px', display: 'flex', border: '1px solid rgba(66, 133, 244, 0.1)' }}>
            <Sparkle size={16} weight="fill" color="#4285F4" />
          </div>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#4285F4', letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.9 }}>
            {loading ? 'Analyzing Data' : 'AI Coach Insight'}
          </span>
        </div>
        {loading && (
          <div style={{ display: 'flex', gap: '4px' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#4285F4', opacity: 0.3, animation: `geminiPulse 1.5s infinite ease-in-out ${i * 0.2}s` }} />
            ))}
          </div>
        )}
      </div>
      <p style={{ color: '#3C4043', fontSize: '16px', lineHeight: '1.6', margin: 0, fontWeight: 500, fontStyle: 'italic', opacity: loading ? 0.6 : 1, transition: 'opacity 0.3s ease' }}>
        "{insight}"
      </p>
      <style>{`@keyframes geminiPulse { 0%, 100% { opacity: 0.2; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.1); } }`}</style>
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

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    const user = auth.currentUser;
    if (!user) return;

    const unsubBroadcast = onSnapshot(doc(db, "system", "broadcast"), (d) => {
      if (d.exists()) {
        const data = d.data();
        const now = new Date().getTime();
        if (data.active && data.expiresAt > now) {
          setGlobalBroadcast(data.message);
        } else {
          setGlobalBroadcast(null);
        }
      }
    });

    onSnapshot(doc(db, "users", user.uid), (snap) => setUserProfile(snap.data()));

    onSnapshot(query(collection(db, "users", user.uid, "trades"), orderBy("date", "desc")), (snap) => {
      setTrades(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    onSnapshot(query(collection(db, "users", user.uid, "accounts")), (snap) => {
      setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      unsubBroadcast();
    };
  }, []);

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
      
      {/* SYSTEEM BERICHT */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '10px 15px 0' : '20px 20px 0' }}>
         <W.SystemBroadcast message={globalBroadcast} />
      </div>
      
      {/* HOOFD CONTAINER */}
      <div style={{ 
        padding: isMobile ? '15px' : '20px 20px', 
        maxWidth: 1200, 
        margin: '0 auto', 
        overflowX: 'hidden' 
      }}>
        
        {/* HEADER SECTIE */}
        <div style={{ marginBottom: 25, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:15 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 style={{ fontSize: isMobile ? '26px' : '32px', fontWeight: 800, margin: 0, letterSpacing: '-1px' }}>Cockpit</h1>
              
              {/* NIEUW: Notification Bell */}
              <NotificationBell onClick={() => setView('settings')} />
              
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

        {/* 1. WEEKLY REVIEW WIDGET (NIEUW! BOVENAAN!) */}
        {/* Is subtiel en zacht, verschijnt alleen op zondagochtend */}
        <WeeklyReviewWidget />

        {/* 2. TCT COACH (Dagelijks inzicht) */}
        <TCTCoach trades={closedTrades} winrate={winrate} adherence={avgDiscipline} />

        {/* 3. PERFORMANCE & FORM GUIDE */}
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

        {/* DESKTOP ANALYTICS */}
        {!isMobile && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, marginBottom: 40 }}>
            <W.ExecutionBlueprintWidget trades={closedTrades} />
            <W.ExpectancyWidget data={expectancyData} money={money} />
          </div>
        )}

        {/* VAULT SECTION */}
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
        
        {/* ACCOUNTS GRID */}
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
      </div>
    </div>
  );
}