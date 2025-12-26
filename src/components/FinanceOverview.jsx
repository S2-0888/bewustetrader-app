import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ArrowUpRight, Coins, TrendUp, ChartPie, Scales } from '@phosphor-icons/react';
// Importeer hier je FinancialHarvestWidget en andere benodigde widgets uit DashboardWidgets.jsx
import { FinancialHarvestWidget } from './DashboardWidgets'; // Pas het pad aan indien nodig

// --- DUMMY DATA VOOR ONTWIKKELING (Gebaseerd op jouw screenshot & discussie) ---
const DUMMY_YEARLY_TURNOVER = [
  { year: 2022, turnover: 2714.82, growth: 0 },
  { year: 2023, turnover: 8650.04, growth: 218.62 },
  { year: 2024, turnover: 26596.80, growth: 207.48 },
  { year: 2025, turnover: 35089.23, growth: 31.93 } // Dit is de "omzet"
];

const DUMMY_PLATFORM_PAYOUTS = [
  { name: 'MFF', profit: 3744.82, payouts: 6, color: '#FF9F0A' }, // Geel/Oranje
  { name: 'AGC', profit: 48415.04, payouts: 21, color: '#5AC8FA' }, // Lichtblauw
  { name: 'IF', profit: 10259.80, payouts: 7, color: '#AF52DE' }, // Paars
  { name: 'FP', profit: 9376.00, payouts: 4, color: '#30D158' }, // Groen
  { name: 'FN', profit: 1255.25, payouts: 1, color: '#FF453A' }, // Rood
];

const DUMMY_TOTAL_INVESTED = 1250; // Voorbeeld van totale challenge kosten

export default function FinanceOverview() {
  const [userProfile, setUserProfile] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [payoutsList, setPayoutsList] = useState([]);
  const [accounts, setAccounts] = useState([]);

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

    // Haal de echte accounts op
    const unsubAcc = onSnapshot(query(collection(db, "users", user.uid, "accounts")), (snap) => {
      setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Haal de echte payouts op
    const unsubPayouts = onSnapshot(query(collection(db, "users", user.uid, "payouts"), orderBy("date", "asc")), (snap) => {
      setPayoutsList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubAcc(); unsubPayouts(); };
  }, []);

  // Gebruik jouw formatter functie, aangepast om optioneel geen valuta te tonen
  const fmt = (amount, short = false) => {
    const symbol = userProfile?.baseCurrency === 'EUR' ? '€' : '$';
    const formattedAmount = Math.abs(Math.round(amount)).toLocaleString('nl-NL'); // Gebruik nl-NL voor komma als decimaal
    return short ? formattedAmount : `${symbol}${formattedAmount}`;
  };

  // Bereken totalen
  const totalPayoutsSum = DUMMY_PLATFORM_PAYOUTS.reduce((sum, p) => sum + p.profit, 0);
  const totalProfit = DUMMY_YEARLY_TURNOVER[DUMMY_YEARLY_TURNOVER.length - 1].turnover; // Dit is de "Profit" uit je screenshot, niet de netto winst
  const netRealizedProfit = totalPayoutsSum - DUMMY_TOTAL_INVESTED; // Echte netto winst

  const activeFundedAccounts = accounts.filter(acc => acc.stage === 'Funded' && acc.status === 'Active');

  // Top Platform bepalen voor de donut chart
  const topPlatform = DUMMY_PLATFORM_PAYOUTS.sort((a,b) => b.profit - a.profit)[0];

  return (
    <div style={{ padding: isMobile ? '20px 15px' : '40px 20px', maxWidth: 1200, margin: '0 auto', background: '#F5F5F7', minHeight: '100vh', paddingBottom: 100 }}>
      
      <header style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-1.2px', margin: 0, color: '#1D1D1F' }}>Financial Overview</h1>
        <p style={{ color: '#86868B', fontSize: '15px', fontWeight: 500 }}>Your capital growth and distribution over time.</p>
      </header>

      {/* OVERVIEW CAPSULE: Totalen bovenaan */}
      <div style={{ 
        background: 'linear-gradient(135deg, #1C1C1E 0%, #0D0D0E 100%)', 
        padding: isMobile ? '25px' : '35px 50px', 
        borderRadius: '32px', 
        color: 'white', 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 40,
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
        border: '1px solid rgba(255,255,255,0.08)'
      }}>
        <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
          <div style={{ color: '#8E8E93', fontSize: '10px', fontWeight: 900, letterSpacing: '1.5px', marginBottom: 8, textTransform: 'uppercase' }}>TOTAL REALIZED PAYOUTS</div>
          <div style={{ fontSize: isMobile ? '42px' : '56px', fontWeight: 900, color: totalPayoutsSum >= DUMMY_TOTAL_INVESTED ? '#30D158' : '#FF453A', letterSpacing: '-2px', lineHeight: 1 }}>
            {fmt(totalPayoutsSum)}
          </div>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, justifyContent: isMobile ? 'center' : 'flex-start' }}>
            <div style={{ padding: '4px 10px', background: 'rgba(48, 209, 88, 0.15)', color: '#30D158', borderRadius: '30px', fontSize: '10px', fontWeight: 800 }}>
                NET PROFIT: {fmt(netRealizedProfit)}
            </div>
            {netRealizedProfit > 0 && (
                <div style={{ padding: '4px 10px', background: 'rgba(255, 214, 10, 0.15)', color: '#FFD60A', borderRadius: '30px', fontSize: '10px', fontWeight: 800 }}>
                    HOUSE MONEY MODE
                </div>
            )}
          </div>
        </div>

        {!isMobile && <div style={{ width: '1px', height: '80px', background: 'rgba(255,255,255,0.1)' }} />}

        <div style={{ display: 'flex', gap: 50, marginTop: isMobile ? 30 : 0 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#8E8E93', fontSize: '10px', fontWeight: 900, marginBottom: 8 }}>PLATFORMS</div>
            <div style={{ fontSize: '32px', fontWeight: 800 }}>{DUMMY_PLATFORM_PAYOUTS.length}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#8E8E93', fontSize: '10px', fontWeight: 900, marginBottom: 8 }}>PAYOUTS COUNT</div>
            <div style={{ fontSize: '32px', fontWeight: 800 }}>{DUMMY_PLATFORM_PAYOUTS.reduce((sum, p) => sum + p.payouts, 0)}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: 20, marginBottom: 30 }}>
        {/* YEARLY MOMENTUM BARS */}
        <div className="bento-card" style={{ padding: 30 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom: 30 }}>
            <TrendUp size={20} weight="bold" color="#007AFF"/>
            <span style={{ fontSize: 13, fontWeight: 800 }}>YEARLY MOMENTUM</span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={DUMMY_YEARLY_TURNOVER} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8E8E93' }} />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                formatter={(value, name, props) => [`${fmt(value)}`, `${props.payload.year} Turnover`]}
              />
              <Bar dataKey="turnover" radius={[6, 6, 0, 0]}>
                {DUMMY_YEARLY_TURNOVER.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`url(#gradientYearly${index})`} 
                    strokeWidth={1} 
                    stroke="rgba(0,122,255,0.3)"
                  />
                ))}
              </Bar>
              {/* Gradients voor de bars */}
              {DUMMY_YEARLY_TURNOVER.map((entry, index) => (
                <defs key={`gradientDef-${index}`}>
                  <linearGradient id={`gradientYearly${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#007AFF" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="#007AFF" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
              ))}
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 20, flexWrap: 'wrap', gap: 10 }}>
            {DUMMY_YEARLY_TURNOVER.map(item => (
              <div key={item.year} style={{ textAlign: 'center', minWidth: '80px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#8E8E93' }}>{item.year}</div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#1D1D1F' }}>{fmt(item.turnover)}</div>
                {item.growth > 0 && <div style={{ fontSize: '10px', fontWeight: 700, color: '#30D158' }}>+{item.growth.toFixed(1)}%</div>}
              </div>
            ))}
          </div>
        </div>

        {/* CAPITAL FLOW WHEEL */}
        <div className="bento-card" style={{ padding: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom: 20 }}>
            <ChartPie size={20} weight="bold" color="#007AFF"/>
            <span style={{ fontSize: 13, fontWeight: 800 }}>CAPITAL FLOW</span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={DUMMY_PLATFORM_PAYOUTS}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="profit"
                labelLine={false}
              >
                {DUMMY_PLATFORM_PAYOUTS.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                formatter={(value, name, props) => [`${fmt(value)}`, `${props.payload.name} (${props.payload.payouts} payouts)`]}
              />
              {/* Tekst in het midden van de Donut */}
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '10px', fontWeight: 700, fill: '#8E8E93' }}>
                TOP PLATFORM
              </text>
              <text x="50%" y="65%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '14px', fontWeight: 900, fill: '#1D1D1F' }}>
                {topPlatform.name}
              </text>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ width: '100%', marginTop: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {DUMMY_PLATFORM_PAYOUTS.map(platform => (
                    <div key={platform.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '11px', fontWeight: 600, color: '#1D1D1F' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: platform.color }} />
                        <span>{platform.name}: <span style={{ fontWeight: 800 }}>{fmt(platform.profit, true)}</span> ({platform.payouts}x)</span>
                    </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* FINANCIAL HARVEST WIDGET (Using actual payoutsList) */}
      <FinancialHarvestWidget 
        payouts={payoutsList} 
        invested={DUMMY_TOTAL_INVESTED} 
        money={fmt} 
      />

    </div>
  );
}