import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { 
  TrendUp, Trash, Plus, Wallet, ChartPie, Receipt, Money 
} from '@phosphor-icons/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Finance() {
  const [metrics, setMetrics] = useState({ invested: 0, payouts: 0 });
  const [payoutsList, setPayoutsList] = useState([]);
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [payoutForm, setPayoutForm] = useState({
    date: new Date().toISOString().split('T')[0],
    source: '',
    amount: ''
  });

  // Listen for screen size changes
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
        if (!user) return;

        const qAccounts = query(collection(db, "users", user.uid, "accounts"));
        const unsubAcc = onSnapshot(qAccounts, (snap) => {
          const accounts = snap.docs.map(d => d.data());
          const totalInvested = accounts.reduce((sum, acc) => sum + (Number(acc.cost) || 0), 0);
          setMetrics(prev => ({ ...prev, invested: totalInvested }));
        });

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

  // --- BEREKENINGEN ---
  const netProfit = metrics.payouts - metrics.invested;
  const roi = metrics.invested > 0 ? (netProfit / metrics.invested) * 100 : 0;

  const byYear = payoutsList.reduce((acc, p) => {
      const year = p.date ? p.date.split('-')[0] : 'Unknown';
      acc[year] = (acc[year] || 0) + Number(p.amount);
      return acc;
  }, {});
  const years = Object.keys(byYear).sort();

  const byFirm = payoutsList.reduce((acc, p) => {
      const firm = p.source || 'Unknown';
      if (!acc[firm]) acc[firm] = { amount: 0, count: 0 };
      acc[firm].amount += Number(p.amount);
      acc[firm].count += 1;
      return acc;
  }, {});
  const sortedFirms = Object.keys(byFirm)
    .map(firm => ({ firm, ...byFirm[firm] }))
    .sort((a, b) => b.amount - a.amount);

  const chartData = [...payoutsList].reverse().reduce((acc, p, idx) => {
    const prevBalance = idx > 0 ? acc[idx - 1].total : 0;
    acc.push({
      date: new Date(p.date).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' }),
      total: prevBalance + p.amount
    });
    return acc;
  }, []);

  const fmt = (amount) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(amount || 0);

  return (
    <div style={{ padding: isMobile ? '20px 15px' : '40px 20px', maxWidth: 1200, margin: '0 auto', paddingBottom: 100 }}>
      
      <header style={{ marginBottom: isMobile ? 30 : 40 }}>
        <h1 style={{ fontSize: isMobile ? '28px' : '34px', fontWeight: 800, letterSpacing: '-1px', margin: 0 }}>Finance</h1>
        <p style={{ color: '#86868B', fontSize: isMobile ? '15px' : '17px' }}>Realized performance & cashflow.</p>
      </header>

      {/* BENTO GRID - Responsief naar 1 kolom op mobiel */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', 
        gap: 20 
      }}>
        
        {/* GROWTH CHART */}
        <div className="bento-card" style={{ gridColumn: isMobile ? 'span 1' : 'span 2', minHeight: isMobile ? 350 : 400 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 20 }}>
            <div>
              <span className="label-xs">Net Profit</span>
              <div style={{ fontSize: isMobile ? '32px' : '42px', fontWeight: 800, color: netProfit >= 0 ? '#34C759' : '#FF3B30', letterSpacing: '-1.5px' }}>
                {fmt(netProfit)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="label-xs">ROI</span>
              <div style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 700, color: roi >= 0 ? '#34C759' : '#FF3B30' }}>
                {roi.toFixed(1)}%
              </div>
            </div>
          </div>
          <div style={{ width: '100%', height: isMobile ? 180 : 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34C759" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#34C759" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="0" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#86868B'}} hide={isMobile} />
                <YAxis hide domain={['dataMin - 100', 'dataMax + 500']} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)', fontSize: '12px' }} 
                  itemStyle={{ fontWeight: 800, color: '#1D1D1F' }}
                />
                <Area type="monotone" dataKey="total" stroke="#34C759" strokeWidth={3} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* QUICK STATS - Meer compact op mobiel */}
        <div className="bento-card">
          <span className="label-xs">Accounting Details</span>
          <div style={{ marginTop: 25, display:'flex', flexDirection:'column', gap: 25 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ color: '#86868B', fontSize: 11, fontWeight: 700, textTransform:'uppercase' }}>Totaal Kosten</div>
                <div style={{ fontSize: '24px', fontWeight: 700 }}>{fmt(metrics.invested)}</div>
              </div>
              <div style={{ background: 'rgba(255,59,48,0.1)', color: '#FF3B30', padding: 10, borderRadius: 12 }}>
                <Receipt size={24} weight="fill" />
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ color: '#86868B', fontSize: 11, fontWeight: 700, textTransform:'uppercase' }}>Gem. Payout</div>
                <div style={{ fontSize: '24px', fontWeight: 700 }}>{fmt(payoutsList.length > 0 ? metrics.payouts / payoutsList.length : 0)}</div>
              </div>
              <div style={{ background: 'rgba(0,122,255,0.1)', color: '#007AFF', padding: 10, borderRadius: 12 }}>
                <Money size={24} weight="fill" />
              </div>
            </div>
          </div>
        </div>

        {/* YEARLY TURNOVER */}
        <div className="bento-card">
          <div className="label-xs" style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 20 }}>
            <TrendUp size={16} weight="fill" color="#007AFF"/> YEARLY TURNOVER
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap: 20 }}>
            {years.map(year => {
              const amount = byYear[year];
              const maxYear = Math.max(...Object.values(byYear)) || 1;
              return (
                <div key={year}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                    <span>{year}</span><span style={{ color: '#1D1D1F' }}>{fmt(amount)}</span>
                  </div>
                  <div style={{ width:'100%', height: 10, background:'#F2F2F7', borderRadius: 5, overflow:'hidden' }}>
                    <div style={{ width:`${(amount/maxYear)*100}%`, height:'100%', background:'#007AFF', borderRadius:5 }}></div>
                  </div>
                </div>
              );
            })}
            {years.length === 0 && <div style={{ color:'#ccc', fontSize:13, textAlign:'center', padding:20 }}>Geen data voor dit jaar</div>}
          </div>
        </div>

        {/* INCOME BY FIRM */}
        <div className="bento-card" style={{ gridColumn: isMobile ? 'span 1' : 'span 2' }}>
          <div className="label-xs" style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 20 }}>
            <ChartPie size={16} weight="fill" color="#AF52DE"/> INCOME BY FIRM
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="apple-table">
                <thead>
                  <tr>
                    <th>Platform</th>
                    <th style={{ textAlign: 'center' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Totaal</th>
                    {!isMobile && <th>Share</th>}
                  </tr>
                </thead>
                <tbody>
                  {sortedFirms.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 700 }}>{item.firm}</td>
                      <td style={{ textAlign: 'center' }}>{item.count}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#34C759' }}>{fmt(item.amount)}</td>
                      {!isMobile && (
                        <td>
                          <div style={{ fontSize:10, background:'#F2F2F7', padding:'3px 8px', borderRadius:6, width:'fit-content', fontWeight:700 }}>
                            {((item.amount/metrics.payouts)*100).toFixed(1)}%
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
            </table>
          </div>
        </div>

        {/* PAYOUT HISTORY LOG */}
        <div className="bento-card" style={{ gridColumn: isMobile ? 'span 1' : 'span 3', padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(0,0,0,0.05)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap: 'wrap', gap: 10 }}>
            <span className="label-xs">Payout History</span>
            <button 
              onClick={() => setShowPayoutForm(!showPayoutForm)} 
              className="btn-primary" 
              style={{ padding: isMobile ? '10px 14px' : '8px 16px', borderRadius: 12, fontSize: 13, background: showPayoutForm ? '#86868B' : '#007AFF' }}
            >
              {showPayoutForm ? 'Sluiten' : '+ Log Payout'}
            </button>
          </div>

          {showPayoutForm && (
             <div style={{ padding: 24, background: '#FBFBFC', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!payoutForm.amount || !payoutForm.source) return;
                  await addDoc(collection(db, "users", auth.currentUser.uid, "payouts"), {
                    ...payoutForm, amount: Number(payoutForm.amount), createdAt: new Date()
                  });
                  setPayoutForm({ date: new Date().toISOString().split('T')[0], source: '', amount: '' });
                  setShowPayoutForm(false);
                }} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr auto', gap: 15, alignItems: 'end' }}>
                   <div className="input-group" style={{marginBottom: 0}}><label className="input-label">Datum</label><input className="apple-input" type="date" value={payoutForm.date} onChange={e => setPayoutForm({...payoutForm, date: e.target.value})} /></div>
                   <div className="input-group" style={{marginBottom: 0}}><label className="input-label">Bron (Firm)</label><input className="apple-input" placeholder="Bijv. FTMO" value={payoutForm.source} onChange={e => setPayoutForm({...payoutForm, source: e.target.value})} /></div>
                   <div className="input-group" style={{marginBottom: 0}}><label className="input-label">Bedrag</label><input className="apple-input" type="number" placeholder="0" value={payoutForm.amount} onChange={e => setPayoutForm({...payoutForm, amount: e.target.value})} /></div>
                   <button type="submit" className="btn-primary" style={{ height: 44, background: '#34C759' }}>Bevestig</button>
                </form>
             </div>
          )}

          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            <table className="apple-table">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Firm</th>
                  <th style={{ textAlign: 'right' }}>Bedrag</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {payoutsList.map(pay => (
                  <tr key={pay.id}>
                    <td style={{ color: '#86868B', fontSize: isMobile ? '11px' : '13px' }}>{new Date(pay.date).toLocaleDateString('nl-NL')}</td>
                    <td style={{ fontWeight: 600 }}>{pay.source}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#34C759' }}>+{fmt(pay.amount)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        onClick={() => { if(confirm('Verwijderen?')) deleteDoc(doc(db, "users", auth.currentUser.uid, "payouts", pay.id)) }} 
                        style={{ border:'none', background:'none', color:'#D2D2D7', cursor:'pointer', padding: 5 }}
                      >
                        <Trash size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {payoutsList.length === 0 && <div style={{ padding: 40, textAlign:'center', color:'#86868B', fontSize:13 }}>Nog geen history gelogd.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}