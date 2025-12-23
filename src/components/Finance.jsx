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
  const [payoutForm, setPayoutForm] = useState({
    date: new Date().toISOString().split('T')[0],
    source: '',
    amount: ''
  });

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

  // --- BEREKENINGEN VOOR STATS ---
  const netProfit = metrics.payouts - metrics.invested;
  const roi = metrics.invested > 0 ? (netProfit / metrics.invested) * 100 : 0;

  // 1. Turnover Per Jaar
  const byYear = payoutsList.reduce((acc, p) => {
      const year = p.date ? p.date.split('-')[0] : 'Unknown';
      acc[year] = (acc[year] || 0) + Number(p.amount);
      return acc;
  }, {});
  const years = Object.keys(byYear).sort();

  // 2. Income By Firm
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

  // 3. Chart Data
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
    <div style={{ padding: '40px 20px', maxWidth: 1200, margin: '0 auto' }}>
      
      <header style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: '34px', fontWeight: 800, letterSpacing: '-1px', margin: 0 }}>Finance</h1>
        <p style={{ color: '#86868B', fontSize: '17px' }}>Realized performance & cashflow insights.</p>
      </header>

      <div className="bento-grid">
        
        {/* ROW 1: EQUITY GROWTH */}
        <div className="bento-card span-2" style={{ minHeight: 400 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 20 }}>
            <div>
              <span className="label-xs">Net Profit</span>
              <div className="number-huge" style={{ color: netProfit >= 0 ? '#34C759' : '#FF3B30' }}>{fmt(netProfit)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="label-xs">ROI</span>
              <div style={{ fontSize: '24px', fontWeight: 700, color: roi >= 0 ? '#34C759' : '#FF3B30' }}>{roi.toFixed(1)}%</div>
            </div>
          </div>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34C759" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#34C759" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="0" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#86868B'}} dy={10} />
                <YAxis hide domain={['dataMin', 'dataMax + 500']} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)' }} />
                <Area type="monotone" dataKey="total" stroke="#34C759" strokeWidth={3} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ROW 1 SIDE: QUICK STATS */}
        <div className="bento-card">
          <span className="label-xs">Details</span>
          <div style={{ marginTop: 20, display:'flex', flexDirection:'column', gap: 20 }}>
            <div>
              <div style={{ color: '#86868B', fontSize: 12, fontWeight: 600 }}>Totaal Kosten</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(metrics.invested)}</div>
            </div>
            <div>
              <div style={{ color: '#86868B', fontSize: 12, fontWeight: 600 }}>Gemiddelde Payout</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(payoutsList.length > 0 ? metrics.payouts / payoutsList.length : 0)}</div>
            </div>
          </div>
        </div>

        {/* ROW 2: YEARLY TURNOVER */}
        <div className="bento-card">
          <div className="label-xs" style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 20 }}>
            <TrendUp size={16} weight="fill"/> YEARLY TURNOVER
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap: 15 }}>
            {years.map(year => {
              const amount = byYear[year];
              const maxYear = Math.max(...Object.values(byYear)) || 1;
              return (
                <div key={year}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize: 12, fontWeight: 700, marginBottom: 5 }}>
                    <span>{year}</span><span>{fmt(amount)}</span>
                  </div>
                  <div style={{ width:'100%', height: 12, background:'#F2F2F7', borderRadius: 6, overflow:'hidden' }}>
                    <div style={{ width:`${(amount/maxYear)*100}%`, height:'100%', background:'#007AFF' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ROW 2: INCOME BY FIRM */}
        <div className="bento-card span-2">
          <div className="label-xs" style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 20 }}>
            <ChartPie size={16} weight="fill"/> INCOME BY FIRM
          </div>
          <table className="apple-table">
            <thead>
              <tr><th>Platform</th><th>Payouts</th><th style={{textAlign:'right'}}>Totaal</th><th>Share</th></tr>
            </thead>
            <tbody>
              {sortedFirms.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 700 }}>{item.firm}</td>
                  <td>{item.count}</td>
                  <td style={{ textAlign:'right', fontWeight: 700, color: '#34C759' }}>{fmt(item.amount)}</td>
                  <td><div style={{ fontSize:11, background:'#F2F2F7', padding:'2px 6px', borderRadius:4, width:'fit-content' }}>{((item.amount/metrics.payouts)*100).toFixed(1)}%</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ROW 3: LOG & HISTORY */}
        <div className="bento-card span-3" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(0,0,0,0.05)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span className="label-xs">Payout History</span>
            <button onClick={() => setShowPayoutForm(!showPayoutForm)} className="btn-primary" style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13 }}>
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
                }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 15, alignItems: 'end' }}>
                   <div className="input-group" style={{marginBottom: 0}}><label className="input-label">Datum</label><input className="apple-input" type="date" value={payoutForm.date} onChange={e => setPayoutForm({...payoutForm, date: e.target.value})} /></div>
                   <div className="input-group" style={{marginBottom: 0}}><label className="input-label">Bron</label><input className="apple-input" placeholder="FTMO" value={payoutForm.source} onChange={e => setPayoutForm({...payoutForm, source: e.target.value})} /></div>
                   <div className="input-group" style={{marginBottom: 0}}><label className="input-label">Bedrag</label><input className="apple-input" type="number" placeholder="0" value={payoutForm.amount} onChange={e => setPayoutForm({...payoutForm, amount: e.target.value})} /></div>
                   <button type="submit" className="btn-primary" style={{ height: 44, background: '#007AFF' }}>Log Payout</button>
                </form>
             </div>
          )}
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            <table className="apple-table">
              <thead><tr><th>Datum</th><th>Firm</th><th style={{ textAlign: 'right' }}>Bedrag</th><th></th></tr></thead>
              <tbody>
                {payoutsList.map(pay => (
                  <tr key={pay.id}>
                    <td style={{ color: '#86868B' }}>{new Date(pay.date).toLocaleDateString('nl-NL')}</td>
                    <td style={{ fontWeight: 600 }}>{pay.source}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#34C759' }}>+{fmt(pay.amount)}</td>
                    <td><button onClick={() => deleteDoc(doc(db, "users", auth.currentUser.uid, "payouts", pay.id))} style={{ border:'none', background:'none', color:'#D2D2D7', cursor:'pointer' }}><Trash size={18} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}