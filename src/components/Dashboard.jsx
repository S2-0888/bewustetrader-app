import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, onSnapshot, orderBy, updateDoc, doc, addDoc } from 'firebase/firestore';
import { Megaphone, Trophy, Crown, CheckCircle, ShieldCheck, Target as TargetIcon } from '@phosphor-icons/react';
import * as W from './DashboardWidgets';

export default function Dashboard() {
  const [trades, setTrades] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [timeRange, setTimeRange] = useState('ALL');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promoteAccount, setPromoteAccount] = useState(null);
  
  // Uitgebreid formulier voor de volgende fase
  const [nextPhaseForm, setNextPhaseForm] = useState({ 
    firm: '', size: '', type: '2-Step', stage: 'Phase 2', 
    accountNumber: '', profitTarget: '', maxDrawdown: '' 
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    const user = auth.currentUser;
    if (!user) return;

    onSnapshot(doc(db, "users", user.uid), (snap) => setUserProfile(snap.data()));
    onSnapshot(doc(db, "system", "broadcast"), (snap) => setBroadcastMessage(snap.data()?.message));

    onSnapshot(query(collection(db, "users", user.uid, "trades"), orderBy("date", "desc")), (snap) => {
      setTrades(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    onSnapshot(query(collection(db, "users", user.uid, "accounts")), (snap) => {
      setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const filteredTrades = trades.filter(t => {
    if (timeRange === 'ALL') return true;
    const pastDate = new Date();
    if (timeRange === '7D') pastDate.setDate(pastDate.getDate() - 7);
    if (timeRange === '30D') pastDate.setDate(pastDate.getDate() - 30);
    return new Date(t.date) >= pastDate;
  });

  const closedTrades = filteredTrades.filter(t => t.status === 'CLOSED');
  const totalR = closedTrades.reduce((sum, t) => sum + (Number(t.rMultiple) || 0), 0);
  const avgDiscipline = closedTrades.length > 0 ? Math.round(closedTrades.reduce((sum, t) => sum + (Number(t.disciplineScore) || 0), 0) / closedTrades.length) : 0;
  const winrate = closedTrades.length > 0 ? Math.round((closedTrades.filter(t => t.pnl > 0).length / closedTrades.length) * 100) : 0;
  
  const money = (val) => {
    const symbol = userProfile?.baseCurrency === 'EUR' ? '€' : '$';
    return `${symbol}${Math.round(val).toLocaleString()}`;
  };

  const expectancyData = [...closedTrades].sort((a, b) => new Date(a.date) - new Date(b.date)).map((t, i, arr) => ({
    trade: i,
    val: arr.slice(0, i + 1).reduce((sum, curr) => sum + (Number(curr.rMultiple) || 0), 0)
  }));

  const rDistData = closedTrades.slice(-10).map((t, i) => ({ name: i, r: Number(t.rMultiple) || 0 }));

  const mistakeCounts = {};
  closedTrades.forEach(t => { 
    (Array.isArray(t.mistake) ? t.mistake : []).forEach(m => { 
      if (m && !m.includes("None")) mistakeCounts[m] = (mistakeCounts[m] || 0) + 1; 
    }); 
  });
  const topMistakes = Object.entries(mistakeCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);

  const openPromoteModal = (account) => {
    setPromoteAccount(account);
    const isP1 = account.stage === 'Phase 1';
    setNextPhaseForm({ 
        firm: account.firm, 
        size: account.startBalance, 
        type: account.accountType || 'Swing', 
        stage: isP1 ? 'Phase 2' : 'Funded', 
        accountNumber: '',
        profitTarget: isP1 ? (Number(account.startBalance) * 0.05) : 0, // Vaak 5% voor P2, 0 voor Funded
        maxDrawdown: Number(account.maxDrawdown) || (Number(account.startBalance) * 0.10)
    });
  };

  const handlePromoteConfirm = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid, "accounts", promoteAccount.id), { status: 'Passed' });
      await addDoc(collection(db, "users", auth.currentUser.uid, "accounts"), {
        ...nextPhaseForm, 
        balance: Number(nextPhaseForm.size), 
        startBalance: Number(nextPhaseForm.size), 
        profitTarget: Number(nextPhaseForm.profitTarget),
        maxDrawdown: Number(nextPhaseForm.maxDrawdown),
        purchaseDate: new Date().toISOString().split('T')[0], 
        status: 'Active', 
        accountCurrency: promoteAccount.accountCurrency || 'USD', 
        createdAt: new Date()
      });
      setPromoteAccount(null);
    } catch (err) { console.error(err); } finally { setIsSubmitting(false); }
  };

  const handleBreach = async (account) => {
    if (window.confirm(`Archive breach for ${account.firm}?`)) {
      await updateDoc(doc(db, "users", auth.currentUser.uid, "accounts", account.id), { status: 'Breached' });
    }
  };

  return (
    <div style={{ padding: isMobile ? '10px' : '40px 20px', maxWidth: 1200, margin: '0 auto', background: '#F5F5F7', minHeight: '100vh', paddingBottom: 100 }}>
      
      {/* HEADER */}
      <div style={{ marginBottom: 30, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: isMobile ? '26px' : '32px', fontWeight: 800, margin: 0 }}>Cockpit</h1>
            {userProfile?.isFounder && <div style={{ background: 'linear-gradient(135deg, #AF52DE 0%, #5856D6 100%)', color: 'white', padding: '4px 10px', borderRadius: '30px', fontSize: '9px', fontWeight: 800 }}><Crown size={12} weight="fill" /> FOUNDER 100</div>}
          </div>
          <p style={{ color: '#86868B', fontSize: '14px' }}>Master your process, the money follows.</p>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.05)', padding: 4, borderRadius: 12, display: 'flex' }}>
          {['7D', '30D', 'ALL'].map(range => (<button key={range} onClick={() => setTimeRange(range)} style={{ border: 'none', background: timeRange === range ? 'white' : 'transparent', padding: '8px 12px', borderRadius: 9, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>{range}</button>))}
        </div>
      </div>

      {/* CHARTS & ANALYTICS */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.6fr 1fr', gap: 15, marginBottom: 15 }}>
          <W.PerformanceWidget totalR={totalR} winrate={winrate} avgDiscipline={avgDiscipline} winLossRatio={0} isMobile={isMobile} />
          <W.FormGuideWidget calendarStrip={[]} />
      </div>
      <div style={{ marginBottom: 30 }}><W.ExpectancyWidget data={expectancyData} /></div>

      {/* ACTIVE INVENTORY */}
      <div className="label-xs" style={{ margin: '30px 0 15px', opacity: 0.8, textAlign: 'center', color: '#000', fontWeight: 900 }}>ACTIVE INVENTORY</div>
      
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(160px, 1fr))', gap: 20 }}>
          {accounts.filter(a => a.status === 'Active').map(acc => {
              const accTrades = trades.filter(t => t.accountId === acc.id && t.status === 'CLOSED');
              const currentBal = (Number(acc.startBalance) || 0) + accTrades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
              
              const targetAmount = Number(acc.startBalance) + Number(acc.profitTarget);
              // KNOP ALLEEN TONEN VOOR PHASE 1 OF 2
              const canPromote = acc.stage === 'Phase 1' || acc.stage === 'Phase 2';
              const hasPassed = currentBal >= targetAmount && canPromote;

              const progressPct = Math.min(Math.max(((currentBal - acc.startBalance) / (acc.profitTarget || 1)) * 100, 0), 100);
              const ddPct = Math.min((Math.max(acc.startBalance - currentBal, 0) / (acc.maxDrawdown || 1)) * 100, 100);

              return (
                <div key={acc.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                   <W.AccountCard acc={acc} balance={currentBal} progressPct={progressPct} ddPct={ddPct} money={money} onPromote={openPromoteModal} onBreach={handleBreach} />
                   
                   {hasPassed && (
                     <button 
                        onClick={() => openPromoteModal(acc)}
                        style={{ 
                          padding: '12px', background: '#30D158', borderRadius: '14px', color: 'white', 
                          border: 'none', fontWeight: 800, fontSize: 11, cursor: 'pointer',
                          boxShadow: '0 4px 15px rgba(48, 209, 88, 0.4)'
                        }}
                     >
                        🎉 PASS & UPGRADE
                     </button>
                   )}
                </div>
              );
          })}
      </div>

      {/* PROMOTE MODAL */}
      {promoteAccount && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:10000, display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter: 'blur(10px)' }}>
            <div className="bento-card" style={{ width: '100%', maxWidth: 450, background: 'white', padding: 35 }}>
                 <div style={{ textAlign: 'center', marginBottom: 25 }}>
                    <Trophy size={54} weight="fill" color="#FFD60A" />
                    <h2 style={{ fontWeight: 900, fontSize: 24, margin: '15px 0 5px' }}>Challenge Passed!</h2>
                    <p style={{ color: '#86868B', fontSize: 14 }}>Moving {promoteAccount.firm} to {nextPhaseForm.stage}</p>
                 </div>
                 <form onSubmit={handlePromoteConfirm} style={{ display: 'grid', gap: 15 }}>
                     <div className="input-group">
                        <label className="input-label">New Account ID / Login</label>
                        <input className="apple-input" placeholder="New MT4/MT5 ID" value={nextPhaseForm.accountNumber} onChange={e => setNextPhaseForm({...nextPhaseForm, accountNumber: e.target.value})} required />
                     </div>
                     
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                        <div className="input-group">
                            <label className="input-label">New Stage</label>
                            <select className="apple-input" value={nextPhaseForm.stage} onChange={e => setNextPhaseForm({...nextPhaseForm, stage: e.target.value})}>
                                <option value="Phase 2">Phase 2</option><option value="Funded">Funded</option>
                            </select>
                        </div>
                        <div className="input-group">
                            <label className="input-label">Start Balance</label>
                            <input className="apple-input" type="number" value={nextPhaseForm.size} onChange={e => setNextPhaseForm({...nextPhaseForm, size: e.target.value})} required />
                        </div>
                     </div>

                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                        <div className="input-group">
                            <label className="input-label">New Profit Target ($)</label>
                            <input className="apple-input" type="number" placeholder="e.g. 5000" value={nextPhaseForm.profitTarget} onChange={e => setNextPhaseForm({...nextPhaseForm, profitTarget: e.target.value})} />
                        </div>
                        <div className="input-group">
                            <label className="input-label">New Max Drawdown ($)</label>
                            <input className="apple-input" type="number" placeholder="e.g. 10000" value={nextPhaseForm.maxDrawdown} onChange={e => setNextPhaseForm({...nextPhaseForm, maxDrawdown: e.target.value})} />
                        </div>
                     </div>

                     <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ width:'100%', height: 50, background: '#30D158', marginTop: 10 }}>Activate New Phase</button>
                     <button type="button" onClick={() => setPromoteAccount(null)} style={{ border:'none', background:'none', marginTop:10, color:'#86868B', fontSize: 12, width: '100%' }}>Cancel</button>
                 </form>
            </div>
        </div>
      )}
    </div>
  );
}