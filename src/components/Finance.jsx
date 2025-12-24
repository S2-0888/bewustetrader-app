import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { 
  TrendUp, Trash, Plus, Wallet, ChartPie, Receipt, Money, Coins, CaretDown, SealCheck 
} from '@phosphor-icons/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Finance() {
  const [metrics, setMetrics] = useState({ invested: 0, payouts: 0 });
  const [payoutsList, setPayoutsList] = useState([]);
  const [accounts, setAccounts] = useState([]); 
  const [userProfile, setUserProfile] = useState(null);
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [payoutForm, setPayoutForm] = useState({
    date: new Date().toISOString().split('T')[0],
    accountId: '', 
    amount: ''
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) setUserProfile(snap.data());
    });

    const unsubAcc = onSnapshot(query(collection(db, "users", user.uid, "accounts")), (snap) => {
      const allAccs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAccounts(allAccs); 
      const totalInvested = allAccs.reduce((sum, acc) => sum + (Number(acc.cost) || 0), 0);
      setMetrics(prev => ({ ...prev, invested: totalInvested }));
    });

    const unsubPayouts = onSnapshot(query(collection(db, "users", user.uid, "payouts"), orderBy("date", "desc")), (snap) => {
      const payouts = snap.docs.map(d => ({ id: d.id, ...d.data() })); 
      const totalPayouts = payouts.reduce((sum, p) => sum + (Number(p.convertedAmount) || 0), 0);
      setPayoutsList(payouts);
      setMetrics(prev => ({ ...prev, payouts: totalPayouts }));
    });

    return () => { unsubAcc(); unsubPayouts(); };
  }, []);

  const getExchangeRate = async (from, to) => {
    if (from === to) return 1;
    try {
      const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${from}`);
      const data = await res.json();
      return data.rates[to] || 1;
    } catch (e) { return 1; }
  };

  const handleAddPayout = async (e) => {
    e.preventDefault();
    const selectedAccount = accounts.find(a => a.id === payoutForm.accountId);
    if (!payoutForm.amount || !selectedAccount || isSubmitting) return;
    
    setIsSubmitting(true);
    const base = userProfile?.baseCurrency || 'USD';
    const accCurrency = selectedAccount.accountCurrency || 'USD';
    const rate = await getExchangeRate(accCurrency, base);
    const convertedAmount = Number(payoutForm.amount) * rate;

    await addDoc(collection(db, "users", auth.currentUser.uid, "payouts"), {
      date: payoutForm.date,
      accountId: selectedAccount.id,
      source: selectedAccount.firm,
      accountNumber: selectedAccount.accountNumber || '',
      amount: Number(payoutForm.amount),
      currency: accCurrency,
      convertedAmount: convertedAmount,
      baseCurrencyAtTime: base,
      createdAt: new Date()
    });

    setPayoutForm({ date: new Date().toISOString().split('T')[0], accountId: '', amount: '' });
    setShowPayoutForm(false);
    setIsSubmitting(false);
  };

  const fmt = (amount) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: userProfile?.baseCurrency || 'USD', 
      minimumFractionDigits: 0 
    }).format(amount || 0);
  };

  const chartData = [...payoutsList].reverse().reduce((acc, p, idx) => {
    const prevBalance = idx > 0 ? acc[idx - 1].total : 0;
    acc.push({
      date: new Date(p.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
      total: prevBalance + (Number(p.convertedAmount) || 0)
    });
    return acc;
  }, []);

  const fundedAccounts = accounts.filter(acc => acc.stage === 'Funded' && acc.status === 'Active');

  return (
    <div style={{ padding: isMobile ? '20px 15px' : '40px 20px', maxWidth: 1200, margin: '0 auto', paddingBottom: 100 }}>
      
      <header style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: '34px', fontWeight: 800, letterSpacing: '-1px', margin: 0 }}>Finance</h1>
        <p style={{ color: '#86868B' }}>Realized cashflow in {userProfile?.baseCurrency || 'USD'}</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: 20, marginBottom: 30 }}>
        <div className="bento-card" style={{ minWidth: 0, minHeight: 400 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 20 }}>
            <div>
              <span className="label-xs">Net Realized Profit</span>
              <div style={{ fontSize: '42px', fontWeight: 800, color: (metrics.payouts - metrics.invested) >= 0 ? '#34C759' : '#FF3B30' }}>
                {fmt(metrics.payouts - metrics.invested)}
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
                <span className="label-xs">ROI</span>
                <div style={{ fontSize: '24px', fontWeight: 700 }}>{((metrics.payouts - metrics.invested) / (metrics.invested || 1) * 100).toFixed(1)}%</div>
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
                <XAxis dataKey="date" hide={isMobile} />
                <YAxis hide />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)' }} />
                <Area type="monotone" dataKey="total" stroke="#34C759" strokeWidth={3} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bento-card">
          <span className="label-xs">Accounting Details ({userProfile?.baseCurrency})</span>
          <div style={{ marginTop: 25, display:'flex', flexDirection:'column', gap: 25 }}>
            <div>
                <div style={{ color: '#86868B', fontSize: 11, fontWeight: 700, textTransform:'uppercase' }}>Total Portfolio Cost</div>
                <div style={{ fontSize: '28px', fontWeight: 700 }}>{fmt(metrics.invested)}</div>
            </div>
            <div>
                <div style={{ color: '#86868B', fontSize: 11, fontWeight: 700, textTransform:'uppercase' }}>Total Payouts</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#34C759' }}>{fmt(metrics.payouts)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bento-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid rgba(0,0,0,0.05)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Money size={20} weight="fill" color="#34C759"/>
              <span className="label-xs" style={{ margin:0 }}>Payout History</span>
          </div>
          <button onClick={() => setShowPayoutForm(!showPayoutForm)} className="btn-primary" style={{ background: showPayoutForm ? '#86868B' : '#007AFF', padding: '8px 16px' }}>
            {showPayoutForm ? 'Close' : '+ Log Payout'}
          </button>
        </div>

        {showPayoutForm && (
           <div style={{ padding: 24, background: '#FBFBFC', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              {fundedAccounts.length > 0 ? (
                <form onSubmit={handleAddPayout} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 2fr 1.2fr auto', gap: 15, alignItems: 'end' }}>
                   <div className="input-group"><label className="input-label">Date</label><input className="apple-input" type="date" value={payoutForm.date} onChange={e => setPayoutForm({...payoutForm, date: e.target.value})} /></div>
                   <div className="input-group">
                      <label className="input-label">Source</label>
                      <select className="apple-input" value={payoutForm.accountId} onChange={e => setPayoutForm({...payoutForm, accountId: e.target.value})} required>
                          <option value="">Select funded account...</option>
                          {fundedAccounts.map(acc => (
                              <option key={acc.id} value={acc.id}>
                                  {acc.firm} — {acc.accountNumber} ({acc.accountCurrency})
                              </option>
                          ))}
                      </select>
                   </div>
                   <div className="input-group">
                      <label className="input-label">Amount ({accounts.find(a => a.id === payoutForm.accountId)?.accountCurrency || '...' })</label>
                      <input className="apple-input" type="number" placeholder="0.00" value={payoutForm.amount} onChange={e => setPayoutForm({...payoutForm, amount: e.target.value})} />
                   </div>
                   <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ height: 44, background: '#34C759' }}>Confirm</button>
                </form>
              ) : (
                <div style={{ textAlign: 'center', padding: '10px 0', color: '#FF3B30', fontSize: 13, fontWeight: 600 }}>
                  <SealCheck size={20} weight="bold" style={{ marginBottom: 5 }} /><br/>
                  No Funded Accounts found.
                </div>
              )}
           </div>
        )}

        <div style={{ overflowX: 'auto' }}>
            <table className="apple-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Source</th>
                        <th style={{ textAlign: 'right' }}>Local Payout</th>
                        <th style={{ textAlign: 'right' }}>Net Value ({userProfile?.baseCurrency})</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {payoutsList.map(pay => (
                        <tr key={pay.id}>
                            <td style={{ color: '#86868B', fontSize: 13 }}>{new Date(pay.date).toLocaleDateString()}</td>
                            <td>
                                <div style={{ fontWeight: 600 }}>{pay.source}</div>
                                <div style={{ fontSize: 10, color: '#86868B' }}>ID: {pay.accountNumber}</div>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{pay.amount.toLocaleString()} {pay.currency}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#34C759' }}>+{fmt(pay.convertedAmount)}</td>
                            <td style={{ textAlign: 'right' }}>
                                <button onClick={() => deleteDoc(doc(db, "users", auth.currentUser.uid, "payouts", pay.id))} style={{ border:'none', background:'none', color:'#D2D2D7' }}><Trash size={18} /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}