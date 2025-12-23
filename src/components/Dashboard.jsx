import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, onSnapshot, orderBy, updateDoc, doc, addDoc } from 'firebase/firestore';
import { TrendUp, Target, CalendarBlank, Wallet, Eye, EyeSlash, Scales, Medal, Trophy, WarningOctagon, CircleNotch } from '@phosphor-icons/react';

export default function Dashboard() {
  const [trades, setTrades] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [timeRange, setTimeRange] = useState('ALL'); 
  const [showMoney, setShowMoney] = useState(false);

  // STATE VOOR PROMOTIE POP-UP
  const [promoteAccount, setPromoteAccount] = useState(null); 
  const [nextPhaseForm, setNextPhaseForm] = useState({ firm: '', size: '', type: '2-Step', stage: 'Phase 2' });
  const [isSubmitting, setIsSubmitting] = useState(false); // <--- NIEUW: Voorkomt dubbel klikken

  // 1. DATA OPHALEN
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const qTrades = query(collection(db, "users", user.uid, "trades"), orderBy("date", "desc"));
    const unsubTrades = onSnapshot(qTrades, (snap) => {
      setTrades(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qAccounts = query(collection(db, "users", user.uid, "accounts"));
    const unsubAccounts = onSnapshot(qAccounts, (snap) => {
      setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubTrades(); unsubAccounts(); };
  }, []);

  // --- FILTER LOGICA ---
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

  // --- KPI BEREKENINGEN ---
  const totalR = closedTrades.reduce((sum, t) => sum + (Number(t.rMultiple) || 0), 0);
  const totalScore = closedTrades.reduce((sum, t) => sum + (Number(t.disciplineScore) || 0), 0);
  const avgDiscipline = closedTrades.length > 0 ? Math.round(totalScore / closedTrades.length) : 0;

  const winningTrades = closedTrades.filter(t => t.pnl > 0);
  const losingTrades = closedTrades.filter(t => t.pnl < 0);
  const wins = winningTrades.length;
  const winrate = closedTrades.length > 0 ? Math.round((wins / closedTrades.length) * 100) : 0;

  const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length) : 0;
  const winLossRatio = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : (avgWin > 0 ? '∞' : '0.00');

  const activeAccounts = accounts.filter(acc => acc.status === 'Active');
  const fundedCount = activeAccounts.filter(acc => acc.stage === 'Funded').length;

  const generateCalendarStrip = () => {
    const days = [];
    for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayTrades = trades.filter(t => t.date === dateStr && t.status === 'CLOSED');
        const dayR = dayTrades.reduce((sum, t) => sum + (t.rMultiple || 0), 0);
        days.push({ date: dateStr, dayNum: d.getDate(), val: dayR, hasTrades: dayTrades.length > 0 });
    }
    return days;
  };
  const calendarStrip = generateCalendarStrip();

  const money = (amount) => {
      if (showMoney) return `€${Math.round(amount).toLocaleString()}`;
      return '****';
  };

  // --- ACTIES: DE GAME LOOP ---

  const openPromoteModal = (account) => {
      setPromoteAccount(account);
      let nextStage = 'Funded';
      if (account.stage === 'Phase 1') nextStage = 'Phase 2';
      
      setNextPhaseForm({
          firm: account.firm,
          size: account.balance,
          type: account.type,
          stage: nextStage
      });
  };

  // DE UPDATE: PROMOTIE MET LOADING STATE & AUTO-CLOSE
  const handlePromoteConfirm = async (e) => {
      e.preventDefault();
      const user = auth.currentUser;
      if (!user || !promoteAccount || isSubmitting) return; // Stop als al bezig

      setIsSubmitting(true); // 1. Start laden

      try {
          // A. Oud account op 'Passed' zetten (Verdwijnt uit dashboard)
          await updateDoc(doc(db, "users", user.uid, "accounts", promoteAccount.id), {
              status: 'Passed',
              archivedDate: new Date().toISOString()
          });

          // B. Nieuw account aanmaken
          await addDoc(collection(db, "users", user.uid, "accounts"), {
              firm: nextPhaseForm.firm,
              type: nextPhaseForm.type,
              balance: Number(nextPhaseForm.size),
              startBalance: Number(nextPhaseForm.size), 
              stage: nextPhaseForm.stage,
              purchaseDate: new Date().toISOString().split('T')[0],
              status: 'Active',
              currency: promoteAccount.currency || 'EUR',
              cost: 0, 
              originalCost: 0,
              profitTarget: promoteAccount.profitTarget, 
              maxDrawdown: promoteAccount.maxDrawdown,
              accountNumber: '',
              createdAt: new Date()
          });

          // C. Resetten en sluiten
          setPromoteAccount(null); 
          // alert("Gefeliciteerd! Level Up! 🚀"); // Alert mag weg voor betere flow, of laat staan als je feedback wilt.
      } catch (error) {
          console.error("Fout bij promotie:", error);
          alert("Er ging iets mis. Probeer opnieuw.");
      } finally {
          setIsSubmitting(false); // 4. Stop laden
      }
  };

  const handleBreach = async (account) => {
      if (confirm(`Weet je zeker dat account ${account.firm} de drawdown heeft geraakt? Het wordt gearchiveerd.`)) {
          await updateDoc(doc(db, "users", auth.currentUser.uid, "accounts", account.id), {
              status: 'Breached',
              stage: 'Breached',
              archivedDate: new Date().toISOString()
          });
      }
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: 1200, margin: '0 auto' }}>
      
      {/* HEADER + CONTROLS */}
      <div style={{ marginBottom: 30, display:'flex', justifyContent:'space-between', alignItems:'end', flexWrap:'wrap', gap:20 }}>
        <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>Cockpit</h1>
            <p style={{ color: 'var(--text-muted)' }}>Focus op uitvoering, niet op geld.</p>
        </div>
        
        <div style={{ display:'flex', gap: 10 }}>
            <button onClick={() => setShowMoney(!showMoney)} style={{ border: '1px solid #E5E5EA', background: 'white', color: '#86868B', width: 36, height: 36, borderRadius: 10, cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center' }} title={showMoney ? "Verberg bedragen" : "Toon bedragen"}>
                {showMoney ? <EyeSlash size={18}/> : <Eye size={18}/>}
            </button>
            <div style={{ background: '#E5E5EA', padding: 4, borderRadius: 10, display: 'flex', gap: 2 }}>
                {['7D', '30D', 'YTD', 'ALL'].map(range => (
                    <button key={range} onClick={() => setTimeRange(range)} style={{ border: 'none', background: timeRange === range ? 'white' : 'transparent', color: timeRange === range ? 'black' : '#86868B', padding: '6px 14px', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', boxShadow: timeRange === range ? '0 2px 4px rgba(0,0,0,0.1)' : 'none' }}>
                        {range}
                    </button>
                ))}
            </div>
        </div>
      </div>

      {/* --- GRID 1: KPI WIDGETS --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 30 }}>
          <div className="bento-card" style={{ display:'flex', flexDirection:'column', justifyContent:'space-between', minHeight:140 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#86868B', display:'flex', alignItems:'center', gap:6 }}><TrendUp weight="fill"/> NET PERFORMANCE (R)</div>
              <div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: totalR >= 0 ? '#30D158' : '#FF3B30' }}>{totalR > 0 ? '+' : ''}{totalR.toFixed(1)}R</div>
                  <div style={{ fontSize:12, color:'#86868B', marginTop:4 }}>Discipline Score: {avgDiscipline}%</div>
              </div>
          </div>
          <div className="bento-card" style={{ display:'flex', flexDirection:'column', justifyContent:'space-between', minHeight:140 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#86868B', display:'flex', alignItems:'center', gap:6 }}><Scales weight="fill"/> WIN/LOSS RATIO</div>
              <div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#1D1D1F' }}>{winLossRatio}</div>
                  <div style={{ fontSize:12, color:'#86868B', marginTop:4, display:'flex', gap:10 }}>
                      <span style={{ color:'#30D158' }}>Avg Win: {money(avgWin)}</span>
                      <span style={{ color:'#FF3B30' }}>Avg Loss: {money(avgLoss)}</span>
                  </div>
              </div>
          </div>
          <div className="bento-card" style={{ display:'flex', flexDirection:'column', justifyContent:'space-between', minHeight:140 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#86868B', display:'flex', alignItems:'center', gap:6 }}><Target weight="fill"/> STRIKE RATE</div>
              <div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#1D1D1F' }}>{winrate}%</div>
                  <div style={{ fontSize:12, color:'#86868B', marginTop:4 }}>{wins} Wins / {closedTrades.length} Trades</div>
              </div>
          </div>
           <div className="bento-card" style={{ background:'#1D1D1F', color:'white', minHeight:140 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#86868B', marginBottom:15, display:'flex', alignItems:'center', gap:6 }}><Wallet weight="fill"/> INVENTORY</div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'end' }}>
                  <div>
                      <div style={{ fontSize:32, fontWeight:700 }}>{activeAccounts.length}</div>
                      <div style={{ fontSize:12, color:'#86868B' }}>Active Accounts</div>
                  </div>
                  {fundedCount > 0 && (
                      <div style={{ textAlign:'right' }}>
                          <Medal size={24} color="#FFD60A" weight="fill" style={{ marginBottom:4 }}/>
                          <div style={{ fontSize:12, fontWeight:700, color:'#FFD60A' }}>{fundedCount} FUNDED</div>
                      </div>
                  )}
              </div>
          </div>
      </div>

      {/* --- GRID 2: CONSISTENCY STRIP --- */}
      <div className="bento-card" style={{ padding: 20, marginBottom: 30 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#86868B', marginBottom:15, display:'flex', alignItems:'center', gap:6 }}><CalendarBlank weight="fill"/> PROCESS CONSISTENCY (14 DAGEN)</div>
          <div style={{ display:'flex', gap: 8, overflowX:'auto', paddingBottom: 5 }}>
              {calendarStrip.map((day, idx) => (
                  <div key={idx} style={{ textAlign:'center', minWidth: 40 }}>
                      <div title={`Datum: ${day.date}`} style={{ height: 40, borderRadius: 8, marginBottom: 6, background: !day.hasTrades ? '#F2F2F7' : (day.val > 0 ? '#30D158' : (day.val < 0 ? '#FF3B30' : '#FF9F0A')), display:'flex', alignItems:'center', justifyContent:'center', color: !day.hasTrades ? '#ccc' : 'white', fontWeight:700, fontSize:10 }}>
                          {day.hasTrades && (day.val > 0 ? '+' : '-')}
                      </div>
                      <div style={{ fontSize: 10, color: '#86868B', fontWeight: 600 }}>{day.dayNum}</div>
                  </div>
              ))}
          </div>
      </div>

      {/* --- GRID 3: ACCOUNT GAMIFICATION --- */}
      <div>
          <div className="label-xs" style={{ marginBottom: 15 }}>ACTIVE CHALLENGES & ACCOUNTS</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 20 }}>
              
              {activeAccounts.map(acc => {
                  const accTrades = trades.filter(t => t.accountId === acc.id && t.status === 'CLOSED');
                  const totalAccPnl = accTrades.reduce((sum, t) => sum + t.pnl, 0);
                  const currentBal = (Number(acc.balance) || 0) + totalAccPnl;
                  
                  const target = Number(acc.profitTarget) || 1; 
                  const progressPct = Math.min(Math.max((totalAccPnl / target) * 100, 0), 100);
                  const targetHit = totalAccPnl >= target;

                  const maxDD = Number(acc.maxDrawdown) || 1;
                  const currentDD = Math.max((Number(acc.balance) - currentBal), 0);
                  const ddPct = Math.min((currentDD / maxDD) * 100, 100);
                  const isBreached = currentBal <= (Number(acc.balance) - maxDD);

                  const isFunded = acc.stage === 'Funded';

                  return (
                      <div key={acc.id} className="bento-card" style={{ padding: 25, borderLeft: isFunded ? '4px solid #30D158' : '4px solid #007AFF', position:'relative' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 20 }}>
                              <div>
                                  <div style={{ fontWeight: 800, fontSize: 18 }}>{acc.firm}</div>
                                  <div style={{ fontSize: 12, color:'#86868B', fontWeight:600 }}>{acc.type} • <span style={{ color: isFunded ? '#30D158' : '#007AFF' }}>{acc.stage}</span></div>
                              </div>
                              <div style={{ textAlign:'right' }}>
                                  <div style={{ fontSize:11, color:'#86868B', fontWeight:700, textTransform:'uppercase' }}>Huidig Saldo</div>
                                  <div style={{ fontSize:20, fontWeight:700, color: currentBal < acc.balance ? '#FF3B30' : '#1D1D1F' }}>{money(currentBal)}</div>
                              </div>
                          </div>

                          <div style={{ display:'grid', gap:15 }}>
                              {acc.profitTarget > 0 && !isFunded && (
                                  <div>
                                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, fontWeight:700, marginBottom:4 }}>
                                          <span style={{color:'#86868B'}}>Target: {money(acc.profitTarget)}</span>
                                          <span style={{color:'#30D158'}}>{progressPct.toFixed(1)}%</span>
                                      </div>
                                      <div style={{ width:'100%', height:8, background:'#F2F2F7', borderRadius:4 }}>
                                          <div style={{ width:`${progressPct}%`, height:'100%', background: '#30D158', borderRadius:4, transition:'width 0.5s' }}></div>
                                      </div>
                                  </div>
                              )}
                              {acc.maxDrawdown > 0 && (
                                  <div>
                                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, fontWeight:700, marginBottom:4 }}>
                                          <span style={{color:'#86868B'}}>Max DD: {money(acc.maxDrawdown)}</span>
                                          <span style={{color: ddPct > 80 ? '#FF3B30' : '#FF9F0A'}}>{ddPct.toFixed(1)}% Gebruikt</span>
                                      </div>
                                      <div style={{ width:'100%', height:8, background:'#F2F2F7', borderRadius:4 }}>
                                          <div style={{ width:`${ddPct}%`, height:'100%', background: ddPct > 80 ? '#FF3B30' : '#FF9F0A', borderRadius:4, transition:'width 0.5s' }}></div>
                                      </div>
                                  </div>
                              )}
                          </div>

                          <div style={{ marginTop: 25, borderTop:'1px solid #F5F5F7', paddingTop:15 }}>
                              {targetHit && !isBreached && (
                                  <button onClick={() => openPromoteModal(acc)} className="btn-primary" style={{ width:'100%', background:'linear-gradient(135deg, #FFD60A 0%, #FF9F0A 100%)', color:'black', border:'none', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                                      <Trophy size={18} weight="fill"/> PROMOTE ACCOUNT
                                  </button>
                              )}
                              {isBreached && (
                                  <div style={{ textAlign:'center' }}>
                                      <div style={{ color:'#FF3B30', fontWeight:800, fontSize:14, marginBottom:10, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}><WarningOctagon size={20} weight="fill"/> DRAWDOWN BREACHED</div>
                                      <button onClick={() => handleBreach(acc)} style={{ width:'100%', background:'#FF3B30', color:'white', border:'none', padding:'10px', borderRadius:8, fontWeight:700, cursor:'pointer' }}>Bevestig & Archiveer</button>
                                  </div>
                              )}
                              {!targetHit && !isBreached && <div style={{ textAlign:'center', fontSize:12, color:'#86868B', fontStyle:'italic' }}>Keep grinding. Follow your rules.</div>}
                          </div>
                      </div>
                  );
              })}
              {activeAccounts.length === 0 && <div style={{ color:'#86868B', fontSize:13 }}>Geen actieve accounts.</div>}
          </div>
      </div>

      {/* --- MODAL: PROMOTIE --- */}
      {promoteAccount && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(5px)', zIndex:1200, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div className="bento-card" style={{ width: 400, padding: 30, textAlign:'center' }}>
                 <div style={{ fontSize:48, marginBottom:10 }}>🏆</div>
                 <h2 style={{ fontSize:24, fontWeight:800, margin:'0 0 10px 0' }}>Level Up!</h2>
                 <p style={{ color:'#86868B', marginBottom:20 }}>Je hebt je target op <strong>{promoteAccount.firm}</strong> gehaald.<br/>Tijd om het volgende account te activeren.</p>

                 <form onSubmit={handlePromoteConfirm} style={{ textAlign:'left' }}>
                     <div className="input-group"><label className="input-label">Nieuwe Fase</label><select className="apple-input" value={nextPhaseForm.stage} onChange={e => setNextPhaseForm({...nextPhaseForm, stage: e.target.value})}><option value="Phase 2">Phase 2</option><option value="Funded">Funded</option></select></div>
                     <div className="input-group"><label className="input-label">Account Grootte</label><input className="apple-input" type="number" value={nextPhaseForm.size} onChange={e => setNextPhaseForm({...nextPhaseForm, size: e.target.value})} /></div>
                     
                     <div style={{ display:'flex', gap:10, marginTop:20 }}>
                         <button type="button" disabled={isSubmitting} onClick={() => setPromoteAccount(null)} style={{ flex:1, background:'#F2F2F7', border:'none', borderRadius:8, fontWeight:600, cursor:'pointer', opacity: isSubmitting ? 0.5 : 1 }}>Annuleer</button>
                         <button type="submit" disabled={isSubmitting} style={{ flex:1, background:'#30D158', color:'white', border:'none', borderRadius:8, fontWeight:600, cursor:'pointer', padding:'12px', opacity: isSubmitting ? 0.5 : 1, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                             {isSubmitting ? <><CircleNotch className="spin" size={18}/> Bezig...</> : 'Start Nieuwe Fase'}
                         </button>
                     </div>
                 </form>
            </div>
        </div>
      )}

    </div>
  );
}