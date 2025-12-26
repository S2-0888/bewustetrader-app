import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { 
  TrendUp, Trash, Money, SealCheck, Bank, ChartPieSlice, 
  PresentationChart, ArrowsClockwise, ArrowUpRight, Receipt,
  CaretDown, CaretUp, ArrowDown, ArrowUp, CaretLeft, CaretRight, Plus, X 
} from '@phosphor-icons/react';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';
import * as W from './DashboardWidgets';

export default function Finance() {
  const [metrics, setMetrics] = useState({ invested: 0, payouts: 0 });
  const [payoutsList, setPayoutsList] = useState([]);
  const [accounts, setAccounts] = useState([]); 
  const [userProfile, setUserProfile] = useState(null);
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // --- PAGINERING & SORTEER STATES (Desktop) ---
  const ITEMS_PER_PAGE = 5;
  const [payoutPage, setPayoutPage] = useState(1);
  const [accountPage, setAccountPage] = useState(1);
  const [payoutSortDir, setPayoutSortDir] = useState('desc');
  const [accountSortDir, setAccountSortDir] = useState('desc');
  
  const [payoutForm, setPayoutForm] = useState({
    date: new Date().toISOString().split('T')[0],
    accountId: '', 
    amount: ''
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    const user = auth.currentUser;
    if (!user) return;

    onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) setUserProfile(snap.data());
    });

    onSnapshot(query(collection(db, "users", user.uid, "accounts")), (snap) => {
      const allAccs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAccounts(allAccs); 
      const totalInvested = allAccs.reduce((sum, acc) => sum + (Number(acc.originalPrice) || Number(acc.cost) || 0), 0);
      setMetrics(prev => ({ ...prev, invested: totalInvested }));
    });

    onSnapshot(query(collection(db, "users", user.uid, "payouts")), (snap) => {
      const payouts = snap.docs.map(d => ({ id: d.id, ...d.data() })); 
      setPayoutsList(payouts);
      const totalPayouts = payouts.reduce((sum, p) => sum + (Number(p.convertedAmount) || 0), 0);
      setMetrics(prev => ({ ...prev, payouts: totalPayouts }));
    });

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleAddPayout = async (e) => {
    e.preventDefault();
    const selectedAccount = accounts.find(a => a.id === payoutForm.accountId);
    if (!payoutForm.amount || !selectedAccount || isSubmitting) return;
    setIsSubmitting(true);
    await addDoc(collection(db, "users", auth.currentUser.uid, "payouts"), {
      date: payoutForm.date, accountId: selectedAccount.id, source: selectedAccount.firm,
      accountNumber: selectedAccount.accountNumber || '', amount: Number(payoutForm.amount),
      currency: selectedAccount.accountCurrency || 'USD', convertedAmount: Number(payoutForm.amount), 
      createdAt: new Date()
    });
    setPayoutForm({ date: new Date().toISOString().split('T')[0], accountId: '', amount: '' });
    setShowPayoutForm(false);
    setIsSubmitting(false);
  };

  const fmt = (amount) => {
    const symbol = userProfile?.baseCurrency === 'EUR' ? '€' : '$';
    return `${symbol}${Math.abs(Math.round(amount)).toLocaleString('nl-NL')}`;
  };

  const safeDate = (dateStr) => {
    const d = new Date(dateStr);
    return isNaN(d) ? 'Pending' : d.toLocaleDateString('nl-NL', {day:'2-digit', month:'2-digit', year:'numeric'});
  };

  // --- DESKTOP LOGICA ---
  const sortedPayouts = [...payoutsList].sort((a, b) => {
    const dA = new Date(a.date); const dB = new Date(b.date);
    return payoutSortDir === 'desc' ? dB - dA : dA - dB;
  });

  const sortedAccounts = [...accounts].sort((a, b) => {
    const dA = new Date(a.purchaseDate); const dB = new Date(b.purchaseDate);
    return accountSortDir === 'desc' ? dB - dA : dA - dB;
  });

  const displayedPayouts = sortedPayouts.slice((payoutPage - 1) * ITEMS_PER_PAGE, payoutPage * ITEMS_PER_PAGE);
  const displayedAccounts = sortedAccounts.slice((accountPage - 1) * ITEMS_PER_PAGE, accountPage * ITEMS_PER_PAGE);
  const payoutTotalPages = Math.ceil(sortedPayouts.length / ITEMS_PER_PAGE);
  const accountTotalPages = Math.ceil(sortedAccounts.length / ITEMS_PER_PAGE);

  const yearlyData = payoutsList.reduce((acc, p) => {
    const year = new Date(p.date).getFullYear();
    const existing = acc.find(item => item.year === year);
    if (existing) { existing.val += p.convertedAmount; }
    else { acc.push({ year, val: p.convertedAmount }); }
    return acc;
  }, []).sort((a, b) => a.year - b.year);

  const platformData = payoutsList.reduce((acc, p) => {
    const existing = acc.find(item => item.name === p.source);
    if (existing) { existing.profit += p.convertedAmount; }
    else { acc.push({ name: p.source, profit: p.convertedAmount }); }
    return acc;
  }, []).sort((a, b) => b.profit - a.profit);

  const COLORS = ['#5856D6', '#AF52DE', '#30D158', '#FF9F0A', '#FF453A'];

  // --- MOBIELE WEERGAVE (Minimalistisch) ---
  if (isMobile) {
    return (
      <div style={{ padding: '15px', paddingBottom: 100 }}>
        <h1 style={{ fontSize: '28px', fontWeight: 900, marginBottom: 20 }}>Finance</h1>

        <div style={{ background: 'linear-gradient(135deg, #1C1C1E 0%, #0D0D0E 100%)', padding: '30px 20px', borderRadius: '28px', color: 'white', marginBottom: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#8E8E93', fontSize: '10px', fontWeight: 900, letterSpacing: '1px', marginBottom: 8 }}>NET REALIZED PROFIT</div>
            <div style={{ fontSize: '42px', fontWeight: 900, color: (metrics.payouts - metrics.invested) >= 0 ? '#30D158' : '#FF453A', lineHeight: 1 }}>
              {fmt(metrics.payouts - metrics.invested)}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 30, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 20 }}>
            <div style={{ textAlign: 'center' }}><div style={{ color: '#8E8E93', fontSize: '10px', marginBottom: 5 }}>COSTS</div><div style={{ fontSize: '20px', fontWeight: 800 }}>{fmt(metrics.invested)}</div></div>
            <div style={{ textAlign: 'center' }}><div style={{ color: '#8E8E93', fontSize: '10px', marginBottom: 5 }}>HARVEST</div><div style={{ fontSize: '20px', fontWeight: 800, color: '#30D158' }}>{fmt(metrics.payouts)}</div></div>
          </div>
          <button onClick={() => setShowPayoutForm(!showPayoutForm)} style={{ width: '100%', marginTop: 25, background: showPayoutForm ? 'rgba(255,255,255,0.1)' : '#30D158', color: 'white', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: 800 }}>
            {showPayoutForm ? 'CANCEL' : '+ LOG REWARD'}
          </button>
        </div>

        {showPayoutForm && (
          <div className="bento-card" style={{ padding: 20, border: '2px solid #30D158', background: 'white' }}>
            <form onSubmit={handleAddPayout} style={{ display: 'grid', gap: 15 }}>
              <input style={{ fontSize: '16px', height: '48px' }} className="apple-input" type="date" value={payoutForm.date} onChange={e => setPayoutForm({...payoutForm, date: e.target.value})} />
              <select style={{ fontSize: '16px', height: '48px' }} className="apple-input" value={payoutForm.accountId} onChange={e => setPayoutForm({...payoutForm, accountId: e.target.value})} required>
                <option value="">Select Account...</option>
                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.firm}</option>)}
              </select>
              <input style={{ fontSize: '16px', height: '48px' }} className="apple-input" type="number" inputMode="decimal" placeholder="Amount" value={payoutForm.amount} onChange={e => setPayoutForm({...payoutForm, amount: e.target.value})} />
              <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ background: '#30D158', height: 50, borderRadius: 12 }}>CONFIRM HARVEST</button>
            </form>
          </div>
        )}
      </div>
    );
  }

  // --- DESKTOP WEERGAVE (Volledige code) ---
  return (
    <div style={{ padding: '40px 20px', maxWidth: 1200, margin: '0 auto', background: '#F5F5F7', minHeight: '100vh', paddingBottom: 100 }}>
      
      <header style={{ marginBottom: 30, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-1.2px', margin: 0 }}>Finance Control</h1>
          <p style={{ color: '#86868B', fontSize: '14px' }}>Strategic growth & capital harvest.</p>
        </div>
        <button 
          onClick={() => setShowPayoutForm(!showPayoutForm)}
          style={{ 
            background: '#1D1D1F', color: 'white', border: 'none', padding: '12px 24px', 
            borderRadius: '14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
        >
          {showPayoutForm ? <X size={18} weight="bold"/> : <Plus size={18} weight="bold"/>}
          {showPayoutForm ? 'Cancel' : 'Log New Payout'}
        </button>
      </header>

      {/* WEALTH CAPSULE */}
      <div style={{ background: 'linear-gradient(135deg, #1C1C1E 0%, #0D0D0E 100%)', padding: '35px 50px', borderRadius: '32px', color: 'white', marginBottom: 20, position: 'relative', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2 }}>
            <div>
              <div style={{ color: '#8E8E93', fontSize: '10px', fontWeight: 900, letterSpacing: '1.5px', marginBottom: 8 }}>NET REALIZED PROFIT</div>
              <div style={{ fontSize: '56px', fontWeight: 900, color: (metrics.payouts - metrics.invested) >= 0 ? '#30D158' : '#FF453A', letterSpacing: '-2px', lineHeight: 1 }}>
                  {fmt(metrics.payouts - metrics.invested)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 50 }}>
              <div style={{ textAlign: 'center' }}><div style={{ color: '#8E8E93', fontSize: '10px', fontWeight: 900, marginBottom: 8 }}>TOTAL COSTS</div><div style={{ fontSize: '32px', fontWeight: 800 }}>{fmt(metrics.invested)}</div></div>
              <div style={{ textAlign: 'center' }}><div style={{ color: '#8E8E93', fontSize: '10px', fontWeight: 900, marginBottom: 8 }}>TOTAL HARVEST</div><div style={{ fontSize: '32px', fontWeight: 800, color: '#30D158' }}>{fmt(metrics.payouts)}</div></div>
            </div>
        </div>
      </div>

      {/* QUICK ACTION: HARVEST FORM */}
      {showPayoutForm && (
        <div className="bento-card" style={{ marginBottom: 30, padding: 30, border: '2px solid #30D158', background: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Money size={24} weight="fill" color="#30D158" />
            <h3 style={{ margin: 0, fontWeight: 800 }}>Harvest Rewards</h3>
          </div>
          <form onSubmit={handleAddPayout} style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 1.2fr auto', gap: 15, alignItems: 'end' }}>
              <div className="input-group"><label className="input-label">Date</label><input className="apple-input" type="date" value={payoutForm.date} onChange={e => setPayoutForm({...payoutForm, date: e.target.value})} /></div>
              <div className="input-group"><label className="input-label">Source Account</label>
                  <select className="apple-input" value={payoutForm.accountId} onChange={e => setPayoutForm({...payoutForm, accountId: e.target.value})} required>
                      <option value="">Select account...</option>
                      {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.firm} — {acc.accountNumber} ({acc.size ? acc.size/1000 + 'k' : '?'})</option>)}
                  </select>
              </div>
              <div className="input-group"><label className="input-label">Amount</label><input className="apple-input" type="number" placeholder="0.00" value={payoutForm.amount} onChange={e => setPayoutForm({...payoutForm, amount: e.target.value})} /></div>
              <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ height: 44, background: '#30D158' }}>Log Reward</button>
          </form>
        </div>
      )}

      {/* CHARTS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20, marginBottom: 30 }}>
        <div className="bento-card" style={{ padding: 30 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom: 30 }}><TrendUp size={20} weight="bold" color="#007AFF"/><span style={{ fontSize: 13, fontWeight: 800 }}>YEARLY MOMENTUM</span></div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={yearlyData}>
              <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#8E8E93', fontSize: 11}} />
              <Tooltip cursor={{fill: 'rgba(0,0,0,0.02)'}} contentStyle={{borderRadius:12, border:'none'}} formatter={(v) => fmt(v)} />
              <Bar dataKey="val" radius={[6, 6, 0, 0]} fill="#007AFF" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bento-card" style={{ padding: 30 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom: 20 }}>
            <ChartPieSlice size={20} weight="bold" color="#AF52DE"/>
            <span style={{ fontSize: 13, fontWeight: 800 }}>CAPITAL SOURCE</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={platformData} innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="profit">
                {platformData.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} stroke="white" strokeWidth={2} />)}
              </Pie>
              <Tooltip formatter={(v) => fmt(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <W.FinancialHarvestWidget payouts={payoutsList} invested={metrics.invested} money={fmt} />

      {/* DUAL HISTORY GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 30 }}>
        
        {/* PAYOUT REVENUE */}
        <div className="bento-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(0,0,0,0.05)', display:'flex', justifyContent:'space-between', alignItems:'center', background: 'rgba(48, 209, 88, 0.03)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}><Bank size={20} weight="fill" color="#30D158"/><span style={{ fontSize: 13, fontWeight: 900 }}>PAYOUT REVENUE</span></div>
          </div>
          <table className="apple-table">
              <thead>
                <tr>
                  <th onClick={() => setPayoutSortDir(payoutSortDir === 'desc' ? 'asc' : 'desc')} style={{ cursor: 'pointer' }}>Date {payoutSortDir === 'desc' ? <ArrowDown size={10}/> : <ArrowUp size={10}/>}</th>
                  <th>Account Details</th>
                  <th style={{ textAlign: 'right' }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {displayedPayouts.map(pay => (
                  <tr key={pay.id} className="hover-row">
                    <td style={{ fontSize: 11, color: '#86868B' }}>{safeDate(pay.date)}</td>
                    <td><div style={{ fontWeight: 700, fontSize: 12 }}>{pay.source}</div><div style={{ fontSize: 10, color: '#86868B' }}>ID: {pay.accountNumber}</div></td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#30D158' }}>+{fmt(pay.convertedAmount)}</td>
                  </tr>
                ))}
              </tbody>
          </table>
          <div style={{ padding: '12px 24px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 15, borderTop: '1px solid #F2F2F7' }}>
            <button disabled={payoutPage === 1} onClick={() => setPayoutPage(payoutPage - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><CaretLeft size={16}/></button>
            <span style={{ fontSize: 10, fontWeight: 800 }}>PAGE {payoutPage} / {payoutTotalPages}</span>
            <button disabled={payoutPage === payoutTotalPages} onClick={() => setPayoutPage(payoutPage + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><CaretRight size={16}/></button>
          </div>
        </div>

        {/* CAPITAL ALLOCATION */}
        <div className="bento-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(0,0,0,0.05)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}><Receipt size={20} weight="fill" color="#8E8E93"/><span style={{ fontSize: 13, fontWeight: 900 }}>CAPITAL ALLOCATION</span></div>
          </div>
          <table className="apple-table">
              <thead>
                <tr>
                  <th onClick={() => setAccountSortDir(accountSortDir === 'desc' ? 'asc' : 'desc')} style={{ cursor: 'pointer' }}>Date {accountSortDir === 'desc' ? <ArrowDown size={10}/> : <ArrowUp size={10}/>}</th>
                  <th>Investment Detail</th>
                  <th style={{ textAlign: 'right' }}>Cost</th>
                </tr>
              </thead>
              <tbody>
                {displayedAccounts.map(acc => (
                  <tr key={acc.id} className="hover-row">
                    <td style={{ fontSize: 11, color: '#8E8E93' }}>{safeDate(acc.purchaseDate)}</td>
                    <td><div style={{ fontWeight: 700, fontSize: 12 }}>{acc.firm}</div><div style={{ fontSize: 10, color: '#86868B' }}>{acc.stage}</div></td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(acc.originalPrice || acc.cost)}</td>
                  </tr>
                ))}
              </tbody>
          </table>
          <div style={{ padding: '12px 24px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 15, borderTop: '1px solid #F2F2F7' }}>
            <button disabled={accountPage === 1} onClick={() => setAccountPage(accountPage - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><CaretLeft size={16}/></button>
            <span style={{ fontSize: 10, fontWeight: 800 }}>PAGE {accountPage} / {accountTotalPages}</span>
            <button disabled={accountPage === accountTotalPages} onClick={() => setAccountPage(accountPage + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><CaretRight size={16}/></button>
          </div>
        </div>

      </div>
    </div>
  );
}