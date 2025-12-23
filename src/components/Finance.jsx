import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';
// FIX: PieChart vervangen door ChartPie
import { Bank, TrendUp, Trash, Plus, Wallet, ArrowDown, ArrowUp, ChartPie, Receipt, Money } from '@phosphor-icons/react';

export default function Finance() {
  const [metrics, setMetrics] = useState({
    invested: 0,   // Totaal Kosten (uit Portfolio)
    payouts: 0,    // Totaal Inkomsten (uit Payouts)
  });
  
  const [payoutsList, setPayoutsList] = useState([]);
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  
  const [payoutForm, setPayoutForm] = useState({
    date: new Date().toISOString().split('T')[0],
    source: '',
    amount: ''
  });

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
        if (!user) return;

        // 1. HAAL KOSTEN OP (Portfolio)
        const qAccounts = query(collection(db, "users", user.uid, "accounts"));
        const unsubAcc = onSnapshot(qAccounts, (snap) => {
          const accounts = snap.docs.map(d => d.data());
          const totalInvested = accounts.reduce((sum, acc) => sum + (Number(acc.cost) || 0), 0);
          setMetrics(prev => ({ ...prev, invested: totalInvested }));
        });

        // 2. HAAL PAYOUTS OP
        const qPayouts = query(collection(db, "users", user.uid, "payouts"), orderBy("date", "desc"));
        const unsubPayouts = onSnapshot(qPayouts, (snap) => {
          const payouts = snap.docs.map(d => ({ id: d.id, ...d.data() })); 
          const totalPayouts = payouts.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
          
          setPayoutsList(payouts);
          setMetrics(prev => ({ ...prev, payouts: totalPayouts }));
        });

        return () => { unsubAcc(); unsubPayouts(); };
    });
    return () => unsubscribeAuth();
  }, []);

  // --- ACTIES ---
  const handleAddPayout = async (e) => {
    e.preventDefault();
    if (!payoutForm.amount || !payoutForm.source) return;
    
    const user = auth.currentUser;
    if (!user) return;

    await addDoc(collection(db, "users", user.uid, "payouts"), {
      ...payoutForm,
      amount: Number(payoutForm.amount),
      createdAt: new Date()
    });
    setPayoutForm({ date: new Date().toISOString().split('T')[0], source: '', amount: '' });
    setShowPayoutForm(false);
  };

  const handleDeletePayout = async (id) => {
    if (confirm('Payout verwijderen uit administratie?')) {
      await deleteDoc(doc(db, "users", auth.currentUser.uid, "payouts", id));
    }
  };

  // --- BEREKENINGEN VOOR ANALYTICS ---
  
  // 1. Net Profit & ROI
  const netProfit = (metrics.payouts || 0) - (metrics.invested || 0);
  const roi = metrics.invested > 0 ? (netProfit / metrics.invested) * 100 : 0;

  // 2. Turnover Per Jaar (Voor de Growth Chart)
  const byYear = payoutsList.reduce((acc, p) => {
      const year = p.date ? p.date.split('-')[0] : 'Unknown';
      if (!acc[year]) acc[year] = 0;
      acc[year] += Number(p.amount);
      return acc;
  }, {});
  const years = Object.keys(byYear).sort();

  // 3. Breakdown Per Firm (Voor de Pie Chart/Table)
  const byFirm = payoutsList.reduce((acc, p) => {
      const firm = p.source || 'Unknown';
      if (!acc[firm]) acc[firm] = { amount: 0, count: 0 };
      acc[firm].amount += Number(p.amount);
      acc[firm].count += 1;
      return acc;
  }, {});
  
  // Sorteren op meeste omzet
  const sortedFirms = Object.keys(byFirm)
    .map(firm => ({ firm, ...byFirm[firm] }))
    .sort((a, b) => b.amount - a.amount);

  // Formatter
  const fmt = (amount) => {
      return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(amount || 0);
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: 1200, margin: '0 auto' }}>
      
      {/* HEADER */}
      <div style={{ marginBottom: 40, borderBottom: '1px solid #E5E5EA', paddingBottom: 20 }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, color: '#1D1D1F' }}>
          Realized Finance
        </h1>
        <p style={{ color: '#86868B', marginTop: 5 }}>
          Business Intelligence & Cashflow.
        </p>
      </div>

      {/* --- TOP ROW: DE GROTE CIJFERS --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 40 }}>
        
        {/* CARD 1: NETTO WINST */}
        <div className="bento-card" style={{ background: '#1D1D1F', color: '#FFFFFF', minHeight: 160, justifyContent: 'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap: 8, color: '#86868B', fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>
            <Wallet size={16} weight="fill"/> REALIZED NET PROFIT
          </div>
          <div>
            <div style={{ fontSize: '36px', fontWeight: 700, letterSpacing: '-1px', fontFamily: 'SF Pro Display, -apple-system' }}>
              {fmt(netProfit)}
            </div>
            <div style={{ fontSize: '13px', color: netProfit >= 0 ? '#30D158' : '#FF453A', fontWeight: 600, marginTop: 5 }}>
              {netProfit >= 0 ? '▲ Winst' : '▼ Verlies'} (Na kosten)
            </div>
          </div>
        </div>

        {/* CARD 2: ROI */}
        <div className="bento-card" style={{ minHeight: 160, justifyContent: 'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap: 8, color: '#86868B', fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>
             <TrendUp size={16} weight="fill"/> ROI (RENDEMENT)
          </div>
          <div>
            <div style={{ fontSize: '36px', fontWeight: 700, letterSpacing: '-1px', color: roi >= 0 ? '#30D158' : '#FF453A' }}>
              {roi.toFixed(1)}%
            </div>
            <div style={{ fontSize: '13px', color: '#86868B', marginTop: 5 }}>
              Op totale investering van {fmt(metrics.invested)}
            </div>
          </div>
          <div style={{ width: '100%', height: 6, background: '#F2F2F7', borderRadius: 3, marginTop: 10, overflow:'hidden' }}>
             <div style={{ width: `${Math.min(100, Math.max(0, roi + 100) / 2)}%`, height: '100%', background: roi >= 0 ? '#30D158' : '#FF453A' }}></div>
          </div>
        </div>

        {/* CARD 3: AVERAGE PAYOUT */}
        <div className="bento-card" style={{ minHeight: 160, justifyContent: 'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap: 8, color: '#86868B', fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>
             <Money size={16} weight="fill"/> GEMIDDELDE PAYOUT
          </div>
          <div>
            <div style={{ fontSize: '36px', fontWeight: 700, letterSpacing: '-1px', color: '#1D1D1F' }}>
              {fmt(payoutsList.length > 0 ? metrics.payouts / payoutsList.length : 0)}
            </div>
            <div style={{ fontSize: '13px', color: '#86868B', marginTop: 5 }}>
              Over {payoutsList.length} uitbetalingen
            </div>
          </div>
        </div>

      </div>

      {/* --- MIDDLE ROW: ANALYTICS --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 30, marginBottom: 30 }}>
          
          {/* ANALYTICS 1: YEARLY TURNOVER */}
          <div className="bento-card">
              <div className="label-xs" style={{ marginBottom:20, display:'flex', alignItems:'center', gap:6 }}>
                  <TrendUp weight="fill"/> YEARLY TURNOVER
              </div>
              
              <div style={{ display:'flex', flexDirection:'column', gap:15 }}>
                  {years.map(year => {
                      const amount = byYear[year];
                      const maxYear = Math.max(...Object.values(byYear)) || 1; 
                      const percentage = (amount / maxYear) * 100;
                      
                      return (
                          <div key={year}>
                              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, fontWeight:700, marginBottom:5 }}>
                                  <span>{year}</span>
                                  <span>{fmt(amount)}</span>
                              </div>
                              <div style={{ width:'100%', height:24, background:'#F2F2F7', borderRadius:6, overflow:'hidden' }}>
                                  <div style={{ width:`${percentage}%`, height:'100%', background:'#007AFF', borderRadius:6 }}></div>
                              </div>
                          </div>
                      )
                  })}
                  {years.length === 0 && <div style={{ color:'#ccc', textAlign:'center', padding:20, fontSize:13 }}>Nog geen data beschikbaar.</div>}
              </div>
          </div>

          {/* ANALYTICS 2: INCOME BY PLATFORM */}
          <div className="bento-card">
              <div className="label-xs" style={{ marginBottom:20, display:'flex', alignItems:'center', gap:6 }}>
                  {/* FIX: ChartPie ipv PieChart */}
                  <ChartPie weight="fill"/> INCOME BY FIRM
              </div>

              <table className="apple-table">
                  <thead>
                      <tr>
                          <th>Platform</th>
                          <th>Payouts</th>
                          <th style={{textAlign:'right'}}>Totaal</th>
                          <th>%</th>
                      </tr>
                  </thead>
                  <tbody>
                      {sortedFirms.map((item, idx) => {
                          const share = ((item.amount / (metrics.payouts || 1)) * 100).toFixed(1);
                          return (
                              <tr key={idx}>
                                  <td style={{ fontWeight:700 }}>{item.firm}</td>
                                  <td>{item.count}</td>
                                  <td style={{ textAlign:'right', fontWeight:700, color:'#30D158' }}>{fmt(item.amount)}</td>
                                  <td>
                                      <div style={{ fontSize:11, background:'#F2F2F7', padding:'2px 6px', borderRadius:4, width:'fit-content' }}>
                                          {share}%
                                      </div>
                                  </td>
                              </tr>
                          )
                      })}
                      {sortedFirms.length === 0 && <tr><td colSpan="4" style={{textAlign:'center', color:'#ccc', padding:20, fontSize:13}}>Geen data</td></tr>}
                  </tbody>
              </table>
          </div>
      </div>

      {/* --- BOTTOM ROW: LOG & HISTORY --- */}
      <div className="bento-card" style={{ minHeight: 300, display: 'block', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: 20, borderBottom: '1px solid #F5F5F7', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div className="label-xs" style={{ marginBottom:0, display:'flex', alignItems:'center', gap:6 }}>
                    <Receipt weight="fill"/> PAYOUT HISTORY
                </div>
                <button 
                    onClick={() => setShowPayoutForm(!showPayoutForm)}
                    className="btn-primary"
                    style={{ fontSize: 12, padding:'6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                    <Plus weight="bold" /> LOG PAYOUT
                </button>
            </div>

            {showPayoutForm && (
                <div style={{ padding: 20, background: '#F9F9F9', borderBottom: '1px solid #E5E5EA' }}>
                    <form onSubmit={handleAddPayout}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 15, alignItems:'end' }}>
                            <div className="input-group" style={{marginBottom:0}}>
                                <label className="input-label">Datum</label>
                                <input className="apple-input" type="date" value={payoutForm.date} onChange={e => setPayoutForm({...payoutForm, date: e.target.value})} />
                            </div>
                            <div className="input-group" style={{marginBottom:0}}>
                                <label className="input-label">Prop Firm (Bron)</label>
                                <input className="apple-input" placeholder="FTMO" value={payoutForm.source} onChange={e => setPayoutForm({...payoutForm, source: e.target.value})} />
                            </div>
                            <div className="input-group" style={{marginBottom:0}}>
                                <label className="input-label">Bedrag (€)</label>
                                <input className="apple-input" type="number" placeholder="1000" value={payoutForm.amount} onChange={e => setPayoutForm({...payoutForm, amount: e.target.value})} />
                            </div>
                            <button type="submit" className="btn-primary" style={{ height: 42, background:'#30D158' }}>Toevoegen</button>
                        </div>
                    </form>
                </div>
            )}

            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                <table className="apple-table">
                    <thead>
                        <tr>
                            <th style={{width:120}}>Datum</th>
                            <th>Firm</th>
                            <th style={{textAlign:'right'}}>Bedrag</th>
                            <th style={{width:50}}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {payoutsList.map(pay => (
                            <tr key={pay.id} className="hover-row">
                                <td style={{ fontSize: 12, color: '#86868B' }}>{new Date(pay.date).toLocaleDateString()}</td>
                                <td style={{ fontWeight: 600, color: '#1D1D1F' }}>{pay.source}</td>
                                <td style={{ textAlign:'right', fontWeight: 700, color: '#30D158' }}>+{fmt(pay.amount)}</td>
                                <td style={{ textAlign:'right' }}>
                                    <button onClick={() => handleDeletePayout(pay.id)} style={{ border:'none', background:'none', color:'#ccc', cursor:'pointer' }}>
                                        <Trash size={16}/>
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {payoutsList.length === 0 && <tr><td colSpan="4" style={{ padding: 40, textAlign:'center', color:'#86868B', fontSize:13 }}>Nog geen payouts gelogd.</td></tr>}
                    </tbody>
                </table>
            </div>
      </div>
    </div>
  );
}