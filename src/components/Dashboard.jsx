import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, onSnapshot, orderBy, updateDoc, doc, addDoc } from 'firebase/firestore';
import { 
  TrendUp, Target, CalendarBlank, Wallet, Eye, EyeSlash, 
  Scales, Medal, Trophy, WarningOctagon, CircleNotch, 
  CheckCircle, ChartPie, Warning, Crown
} from '@phosphor-icons/react';

export default function Dashboard() {
  const [trades, setTrades] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [timeRange, setTimeRange] = useState('ALL'); 
  const [showMoney, setShowMoney] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promoteAccount, setPromoteAccount] = useState(null); 
  const [nextPhaseForm, setNextPhaseForm] = useState({ firm: '', size: '', type: '2-Step', stage: 'Phase 2' });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsubUser = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setUserProfile(docSnap.data());
      }
    });

    const qTrades = query(collection(db, "users", user.uid, "trades"), orderBy("date", "desc"));
    const unsubTrades = onSnapshot(qTrades, (snap) => {
      setTrades(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qAccounts = query(collection(db, "users", user.uid, "accounts"));
    const unsubAccounts = onSnapshot(qAccounts, (snap) => {
      setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubUser(); unsubTrades(); unsubAccounts(); };
  }, []);

  const getFilteredTrades = () => {
    if (timeRange === 'ALL') return trades;
    const now = new Date();
    const pastDate = new Date();
    if (timeRange === '7D') pastDate.setDate(now.getDate() - 7);
    if (timeRange === '30D') pastDate.setDate(now.getDate() - 30);
    if (timeRange === 'YTD') pastDate.setFullYear(now.getFullYear(), 0, 1);
    return trades.filter(t => new Date(t.date) >= pastDate);
  };

  const filteredTrades = getFilteredTrades();
  const closedTrades = filteredTrades.filter(t => t.status === 'CLOSED');

  const totalR = (closedTrades || []).reduce((sum, t) => sum + (Number(t.rMultiple) || 0), 0);
  const totalScore = (closedTrades || []).reduce((sum, t) => sum + (Number(t.disciplineScore) || 0), 0);
  const avgDiscipline = closedTrades.length > 0 ? Math.round(totalScore / closedTrades.length) : 0;
  const wins = closedTrades.filter(t => t.pnl > 0).length;
  const winrate = closedTrades.length > 0 ? Math.round((wins / closedTrades.length) * 100) : 0;

  const winningTrades = closedTrades.filter(t => t.pnl > 0);
  const losingTrades = closedTrades.filter(t => t.pnl < 0);
  const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length) : 0;
  const winLossRatio = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : (avgWin > 0 ? '∞' : '0.00');

  const activeAccounts = accounts.filter(acc => acc.status === 'Active');

  const calendarStrip = (() => {
    const days = [];
    const count = isMobile ? 7 : 14;
    for (let i = count - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayTrades = trades.filter(t => t.date === dateStr && t.status === 'CLOSED');
        const dayR = dayTrades.reduce((sum, t) => sum + (t.rMultiple || 0), 0);
        days.push({ date: dateStr, dayNum: d.getDate(), val: dayR, hasTrades: dayTrades.length > 0 });
    }
    return days;
  })();

  const money = (amount) => {
      if (showMoney) return `€${Math.round(amount || 0).toLocaleString('nl-NL')}`;
      return '••••';
  };

  const openPromoteModal = (account) => {
      setPromoteAccount(account);
      let nextStage = 'Funded';
      if (account.stage === 'Phase 1') nextStage = 'Phase 2';
      setNextPhaseForm({ firm: account.firm || '', size: account.balance || 0, type: account.type || '', stage: nextStage });
  };

  const handlePromoteConfirm = async (e) => {
      e.preventDefault();
      const user = auth.currentUser;
      if (!user || !promoteAccount || isSubmitting) return;
      setIsSubmitting(true);
      try {
          await updateDoc(doc(db, "users", user.uid, "accounts", promoteAccount.id), { status: 'Passed', archivedDate: new Date().toISOString() });
          await addDoc(collection(db, "users", user.uid, "accounts"), {
              ...nextPhaseForm,
              balance: Number(nextPhaseForm.size),
              startBalance: Number(nextPhaseForm.size), 
              purchaseDate: new Date().toISOString().split('T')[0],
              status: 'Active',
              currency: promoteAccount.currency || 'EUR',
              cost: 0, originalCost: 0,
              profitTarget: promoteAccount.profitTarget || 0, 
              maxDrawdown: promoteAccount.maxDrawdown || 0,
              createdAt: new Date()
          });
          setPromoteAccount(null); 
      } catch (error) { console.error(error); } finally { setIsSubmitting(false); }
  };

  const handleBreach = async (account) => {
      if (window.confirm(`Archive account ${account.firm}?`)) {
          await updateDoc(doc(db, "users", auth.currentUser.uid, "accounts", account.id), { status: 'Breached', archivedDate: new Date().toISOString() });
      }
  };

  return (
    <div style={{ padding: isMobile ? '15px' : '40px 20px', maxWidth: 1200, margin: '0 auto', paddingBottom: 100 }}>
      
      {/* BRANDED HEADER */}
      <div style={{ marginBottom: isMobile ? 20 : 40, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:20 }}>
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h1 style={{ fontSize: isMobile ? '26px' : '32px', fontWeight: 800, margin: 0, letterSpacing: '-1px' }}>Cockpit</h1>
                {userProfile?.isFounder && (
                    <div style={{ 
                        display: 'flex', alignItems: 'center', gap: 4, 
                        background: 'linear-gradient(135deg, #AF52DE 0%, #5856D6 100%)',
                        color: 'white', padding: '4px 10px', borderRadius: '30px', 
                        fontSize: '9px', fontWeight: 800, boxShadow: '0 4px 10px rgba(175, 82, 222, 0.3)',
                        marginTop: 4
                    }}>
                        <Crown size={12} weight="fill" /> FOUNDER 100
                    </div>
                )}
            </div>
            <p style={{ color: '#86868B', fontSize: isMobile ? '12px' : '15px', marginTop: 4 }}>
                {userProfile?.isFounder ? "Welcome back, Founder. Conscious status active." : "Master your process, the money follows."}
            </p>
        </div>
        
        {/* RIGHT SIDE: DBT BRANDMARK & FILTERS */}
        <div style={{ display:'flex', alignItems: 'center', gap: isMobile ? 10 : 30, width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
            
            {!isMobile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingRight: 30, borderRight: '1px solid #E5E5EA' }}>
                  <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '1px', color: '#1D1D1F', lineHeight: 1 }}>DBT</div>
                      <div style={{ fontSize: '8px', fontWeight: 800, color: '#86868B', marginTop: 4 }}>CONSCIOUS TRADER</div>
                  </div>
                  {/* CSS VERSION OF YOUR BRANDMARK LOGO */}
                  <div style={{ position: 'relative', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {/* The Outer Triangle/Roof */}
                      <div style={{ position: 'absolute', width: 24, height: 24, borderTop: '3px solid #1D1D1F', borderLeft: '3px solid #1D1D1F', transform: 'rotate(45deg)', top: 4 }}></div>
                      {/* The Inner Circle/Dot */}
                      <div style={{ position: 'absolute', width: 8, height: 8, borderRadius: '50%', border: '3px solid #1D1D1F', bottom: 6 }}></div>
                  </div>
              </div>
            )}

            <div style={{ display:'flex', gap: 10 }}>
                <button onClick={() => setShowMoney(!showMoney)} style={{ border: '1px solid #E5E5EA', background: 'white', color: '#1D1D1F', width: 42, height: 42, borderRadius: 12, cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {showMoney ? <EyeSlash size={20}/> : <Eye size={20}/>}
                </button>
                <div style={{ background: 'rgba(0,0,0,0.05)', padding: 4, borderRadius: 12, display: 'flex', gap: 2 }}>
                    {['7D', '30D', 'YTD', 'ALL'].map(range => (
                        <button key={range} onClick={() => setTimeRange(range)} style={{ border: 'none', background: timeRange === range ? 'white' : 'transparent', color: 'black', padding: '8px 12px', borderRadius: 9, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                            {range}
                        </button>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* KPI GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: isMobile ? 12 : 15, marginBottom: 20 }}>
          <div className="bento-card" style={{ gridColumn: 'span 2', background: '#1D1D1F', color: 'white', minHeight: isMobile ? 130 : 160 }}>
              <div className="label-xs" style={{ color:'#86868B', display:'flex', alignItems:'center', gap:6 }}><TrendUp weight="fill"/> NET PERFORMANCE</div>
              <div style={{ marginTop: isMobile ? 10 : 20 }}>
                  <div style={{ fontSize: isMobile ? 36 : 48, fontWeight: 800, color: totalR >= 0 ? '#30D158' : '#FF453A' }}>{totalR > 0 ? '+' : ''}{totalR.toFixed(1)}R</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 11, color: '#86868B' }}>DISCIPLINE SCORE</div>
                    <div style={{ color: '#30D158', fontWeight: 800, fontSize: 13 }}>{avgDiscipline}%</div>
                  </div>
              </div>
          </div>
          <div className="bento-card" style={{ minHeight: isMobile ? 100 : 160, display:'flex', flexDirection:'column', justifyContent:'center' }}>
              <div className="label-xs"><Target weight="fill"/> STRIKE RATE</div>
              <div style={{ fontSize: isMobile ? 28 : 36, fontWeight: 800 }}>{winrate}%</div>
          </div>
          <div className="bento-card" style={{ minHeight: isMobile ? 100 : 160, display:'flex', flexDirection:'column', justifyContent:'center' }}>
              <div className="label-xs"><Scales weight="fill"/> PROFIT FACTOR</div>
              <div style={{ fontSize: isMobile ? 28 : 36, fontWeight: 800 }}>{winLossRatio}</div>
          </div>
      </div>

      {/* EDGE & BEHAVIORAL INSIGHTS */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: isMobile ? 12 : 20, marginBottom: 30 }}>
          <div className="bento-card">
              <div className="label-xs" style={{ color: '#AF52DE' }}>EXIT EFFICIENCY (MFE)</div>
              <div style={{ marginTop: 10 }}>
                  {(() => {
                      const tradesWithMfe = (closedTrades || []).filter(t => t.mfe > 0 && t.pnl > 0);
                      if (tradesWithMfe.length === 0) return <div style={{ fontSize: 12, color: '#86868B' }}>No data available.</div>;
                      const avgEfficiency = tradesWithMfe.reduce((acc, t) => acc + (t.pnl / t.mfe), 0) / tradesWithMfe.length;
                      const score = Math.round(avgEfficiency * 100);
                      return (
                          <>
                              <div style={{ fontSize: 28, fontWeight: 800 }}>{score}%</div>
                              <div style={{ width: '100%', height: 6, background: '#F2F2F7', borderRadius: 3, marginTop: 10 }}>
                                  <div style={{ width: `${score}%`, height: '100%', background: '#AF52DE', borderRadius: 3 }}></div>
                              </div>
                              <div style={{ fontSize: 10, color: '#86868B', marginTop: 8 }}>{score > 70 ? 'Optimal Exits' : 'Leaving money on table'}</div>
                          </>
                      );
                  })()}
              </div>
          </div>

          <div className="bento-card" style={{ gridColumn: isMobile ? 'span 1' : 'span 2' }}>
              <div className="label-xs" style={{ color: '#FF3B30' }}>BEHAVIORAL LEAKS (TOP MISTAKES)</div>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 8, marginTop: 10 }}>
                  {(() => {
                      const mistakeCounts = {};
                      (closedTrades || []).forEach(t => {
                          const mistakes = Array.isArray(t.mistake) ? t.mistake : [];
                          mistakes.forEach(m => { if (m && !m.includes("None")) mistakeCounts[m] = (mistakeCounts[m] || 0) + 1; });
                      });
                      const sortedMistakes = Object.entries(mistakeCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
                      if (sortedMistakes.length === 0) return <div style={{ fontSize: 12, color: '#86868B' }}>Clean process. No behavioral leaks detected.</div>;
                      return sortedMistakes.map(([name, count]) => (
                          <div key={name} style={{ background: 'rgba(255, 59, 48, 0.05)', border: '1px solid rgba(255, 59, 48, 0.1)', padding: '8px 12px', borderRadius: 10, flex: 1 }}>
                              <div style={{ fontSize: 9, fontWeight: 800, color: '#FF3B30' }}>{count}X OCCURRENCE</div>
                              <div style={{ fontSize: 12, fontWeight: 700 }}>{name}</div>
                          </div>
                      ));
                  })()}
              </div>
          </div>
      </div>

      {/* SYSTEM ALERTS */}
      {avgDiscipline < 70 && closedTrades.length >= 3 && (
          <div className="bento-card" style={{ background: 'linear-gradient(90deg, #FF9F0A 0%, #FF3B30 100%)', color: 'white', marginBottom: 20, padding: '15px', border: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Warning weight="fill" size={20} />
                  <div style={{ fontSize: 12, fontWeight: 600 }}>DISCIPLINE ALERT: Plan execution is low ({avgDiscipline}%). Review rules before next session.</div>
              </div>
          </div>
      )}

      {/* RECENT PERFORMANCE STRIP */}
      <div className="bento-card" style={{ padding: 15, marginBottom: 20 }}>
          <div className="label-xs" style={{ marginBottom:10 }}><CalendarBlank weight="fill"/> RECENT PROCESS LOG</div>
          <div style={{ display:'flex', justifyContent:'space-between', gap: 4 }}>
              {(calendarStrip || []).map((day, idx) => (
                  <div key={idx} style={{ flex: 1, textAlign:'center' }}>
                      <div style={{ height: isMobile ? 30 : 40, borderRadius: 6, background: !day.hasTrades ? '#F2F2F7' : (day.val > 0 ? '#30D158' : '#FF3B30'), color: 'white', fontWeight:800, fontSize: 10, display:'flex', alignItems:'center', justifyContent:'center' }}>
                          {day.hasTrades && (day.val > 0 ? '+' : '-')}
                      </div>
                  </div>
              ))}
          </div>
      </div>

      {/* ACTIVE ACCOUNTS INVENTORY */}
      <div className="label-xs" style={{ marginBottom: 10 }}>ACTIVE ACCOUNTS ({activeAccounts.length})</div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(400px, 1fr))', gap: 15 }}>
          {activeAccounts.map(acc => {
              const accTrades = trades.filter(t => t.accountId === acc.id && t.status === 'CLOSED');
              const currentBal = (Number(acc.balance) || 0) + accTrades.reduce((sum, t) => sum + t.pnl, 0);
              const progressPct = Math.min(Math.max(((currentBal - acc.balance) / (acc.profitTarget || 1)) * 100, 0), 100);
              const ddPct = Math.min((Math.max(acc.balance - currentBal, 0) / (acc.maxDrawdown || 1)) * 100, 100);
              return (
                  <div key={acc.id} className="bento-card" style={{ padding: 20 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 15 }}>
                          <div>
                              <div style={{ fontWeight: 800, fontSize: 16 }}>{acc.firm}</div>
                              <div style={{ fontSize: 9, color: '#007AFF', fontWeight: 800 }}>{(acc.stage || 'N/A').toUpperCase()}</div>
                          </div>
                          <div style={{ textAlign:'right', fontSize: 18, fontWeight: 800 }}>{money(currentBal)}</div>
                      </div>
                      <div style={{ display:'grid', gap:12 }}>
                          <div>
                              <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, fontWeight:800, marginBottom:4 }}>
                                  <span>PROFIT TARGET</span><span>{progressPct.toFixed(1)}%</span>
                              </div>
                              <div style={{ width:'100%', height:6, background:'#F2F2F7', borderRadius:3, overflow:'hidden' }}>
                                  <div style={{ width:`${progressPct}%`, height:'100%', background: '#30D158' }}></div>
                              </div>
                          </div>
                          <div>
                              <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, fontWeight:800, marginBottom:4 }}>
                                  <span>MAX DRAWDOWN</span><span style={{color: ddPct > 80 ? '#FF3B30' : '#FF9F0A'}}>{ddPct.toFixed(1)}%</span>
                              </div>
                              <div style={{ width:'100%', height:6, background:'#F2F2F7', borderRadius:3, overflow:'hidden' }}>
                                  <div style={{ width:`${ddPct}%`, height:'100%', background: ddPct > 80 ? '#FF3B30' : '#FF9F0A' }}></div>
                              </div>
                          </div>
                      </div>
                      <div style={{ marginTop: 15 }}>
                          {progressPct >= 100 && <button onClick={() => openPromoteModal(acc)} className="btn-primary" style={{ width:'100%', background:'#007AFF', padding: '10px' }}>LEVEL UP</button>}
                          {ddPct >= 100 && <button onClick={() => handleBreach(acc)} style={{ width:'100%', background:'#FF3B30', color:'white', border:'none', padding:10, borderRadius:8 }}>BREACHED</button>}
                      </div>
                  </div>
              );
          })}
      </div>

      {/* PHASE TRANSITION MODAL */}
      {promoteAccount && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:3000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
            <div className="bento-card" style={{ width: '100%', maxWidth: 360, textAlign:'center' }}>
                 <div style={{ fontSize: 40 }}>🏆</div>
                 <h2 style={{ fontWeight: 900, fontSize: 20 }}>Phase Accomplished</h2>
                 <form onSubmit={handlePromoteConfirm} style={{ textAlign:'left', marginTop:15 }}>
                     <div className="input-group"><label className="input-label">Next Stage</label><select className="apple-input" value={nextPhaseForm.stage} onChange={e => setNextPhaseForm({...nextPhaseForm, stage: e.target.value})}><option value="Phase 2">Phase 2</option><option value="Funded">Funded</option></select></div>
                     <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ width:'100%', marginTop:15 }}>{isSubmitting ? 'Processing...' : 'Activate Next Phase'}</button>
                     <button type="button" onClick={() => setPromoteAccount(null)} style={{ width:'100%', background:'none', border:'none', marginTop:10, color:'#86868B', fontSize: 12 }}>Cancel</button>
                 </form>
            </div>
        </div>
      )}
    </div>
  );
}