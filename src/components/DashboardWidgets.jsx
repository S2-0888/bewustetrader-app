import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, ReferenceLine } from 'recharts';
import { Crown, Info, ChartLineUp, Warning } from '@phosphor-icons/react';

// --- COACHING TOOLTIP COMPONENT ---
const CoachingInfo = ({ title, text }) => {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({ x: rect.left + rect.width / 2, y: rect.top });
    setVisible(true);
  };

  return (
    <>
      <div 
        style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '6px', cursor: 'help' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setVisible(false)}
      >
        <Info size={14} weight="bold" style={{ color: visible ? '#007AFF' : '#8E8E93', opacity: 0.8 }} />
      </div>

      {visible && createPortal(
        <div style={{ 
          position: 'fixed', top: pos.y - 10, left: pos.x, transform: 'translate(-50%, -100%)',
          width: '240px', background: '#1C1C1E', padding: '12px', borderRadius: '12px', 
          boxShadow: '0 30px 60px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', 
          zIndex: 10000000, pointerEvents: 'none'
        }}>
          <p style={{ fontSize: '10px', fontWeight: 900, color: '#0A84FF', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>{title}</p>
          <p style={{ fontSize: '11px', color: '#FFFFFF', lineHeight: '1.4', margin: 0, fontWeight: 400 }}>{text}</p>
        </div>,
        document.body 
      )}
    </>
  );
};

// --- WIDGET 0: SYSTEM BROADCAST ---
export const SystemBroadcast = ({ message }) => {
  if (!message) return null;
  return (
    <div style={{ 
      marginBottom: 25, background: 'rgba(255, 59, 48, 0.05)', borderRadius: '12px', 
      padding: '12px 20px', border: '1px solid rgba(255, 59, 48, 0.2)',
      display: 'flex', alignItems: 'center', gap: 15, position: 'relative'
    }}>
      <div style={{ background: '#FF3B30', color: 'white', fontSize: '9px', fontWeight: 900, padding: '4px 10px', borderRadius: '4px', letterSpacing: '1.5px' }}>
        SYSTEM BROADCAST
      </div>
      <div style={{ color: '#FF3B30', fontSize: '12px', fontWeight: 800, fontFamily: 'monospace', flex: 1 }}>
        {message}
      </div>
      <Warning size={18} color="#FF3B30" weight="fill" />
    </div>
  );
};

// --- WIDGET 1: PERFORMANCE (CONSCIOUS GAIN CAPSULE) ---
export const PerformanceWidget = ({ winrate = 0, avgDiscipline = 0, trades = [], isMobile }) => {
  const totalR = trades.reduce((sum, t) => sum + (Number(t.pnl) / (Number(t.risk) || 1)), 0);
  const grossProfit = trades.reduce((sum, t) => t.pnl > 0 ? sum + Number(t.pnl) : sum, 0);
  const grossLoss = Math.abs(trades.reduce((sum, t) => t.pnl < 0 ? sum + Number(t.pnl) : sum, 0));
  const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? "MAX" : "0.00") : (grossProfit / grossLoss).toFixed(2);

  const getDisciplineColor = (score) => {
    if (score >= 80) return '#30D158';
    if (score >= 60) return '#FF9F0A';
    return '#FF453A';
  };

  return (
    <div className="performance-capsule" style={{ 
      background: 'linear-gradient(135deg, #1C1C1E 0%, #0D0D0E 100%)', color: 'white', 
      padding: isMobile ? '16px 24px' : '20px 35px', borderRadius: '24px', display: 'inline-flex', 
      flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', border: '1px solid rgba(255,255,255,0.12)',
      boxShadow: '0 12px 32px rgba(0,0,0,0.5)', gap: isMobile ? 20 : 40, minHeight: '100px', width: isMobile ? '100%' : 'fit-content'
    }}>
      <div>
        <div style={{ color: '#8E8E93', fontSize: '9px', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 4 }}>
          CONSCIOUS GAIN <CoachingInfo title="R-MULTIPLE" text="Your true performance score in risk units." />
        </div>
        <div style={{ fontSize: isMobile ? '42px' : '52px', fontWeight: 900, color: totalR >= 0 ? '#30D158' : '#FF453A', letterSpacing: '-2px', lineHeight: 1 }}>
          {totalR > 0 ? '+' : ''}{totalR.toFixed(1)}<span style={{ fontSize: '20px', opacity: 0.3, marginLeft: 4 }}>R</span>
        </div>
      </div>
      {!isMobile && <div style={{ width: '1px', height: '45px', background: 'rgba(255,255,255,0.15)' }} />}
      <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
        <div style={{ color: '#8E8E93', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>
          ADHERENCE <CoachingInfo title="DISCIPLINE" text="KIS: 100% or 0%." />
        </div>
        <div style={{ fontSize: '28px', fontWeight: 900, color: getDisciplineColor(avgDiscipline), lineHeight: 1 }}>
          {Number(avgDiscipline || 0).toFixed(0)}%
        </div>
        <div style={{ fontSize: '7px', color: '#8E8E93', fontWeight: 700, letterSpacing: '0.5px', marginTop: 4 }}>BINARILY TRACKED</div>
      </div>
      {!isMobile && <div style={{ width: '1px', height: '45px', background: 'rgba(255,255,255,0.15)' }} />}
      <div style={{ display: 'flex', gap: 30 }}>
        <div>
            <div style={{ color: '#8E8E93', fontSize: '9px', fontWeight: 800, marginBottom: 4 }}>PROFIT FACTOR</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF' }}>{profitFactor}</div>
        </div>
        <div>
            <div style={{ color: '#8E8E93', fontSize: '9px', fontWeight: 800, marginBottom: 4 }}>WINRATE</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF' }}>{Number(winrate || 0).toFixed(0)}%</div>
        </div>
      </div>
    </div>
  );
};

// --- WIDGET 2: FORM GUIDE ---
export const FormGuideWidget = ({ lastTrades = [] }) => (
  <div className="bento-card" style={{ padding: 20, background: '#FFFFFF', border: '1px solid #F2F2F7', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div className="label-xs" style={{ marginBottom: 15, color: '#000', fontWeight: 900, display:'flex', alignItems:'center' }}>
        RECENT FORM <CoachingInfo title="MOMENTUM" text="Last 10 outcomes. W=Win, L=Loss, D=Breakeven." />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {lastTrades.length === 0 && <span style={{fontSize:11, color:'#86868B'}}>Waiting for data...</span>}
          {lastTrades.map((t, idx) => {
              const pnl = Number(t.pnl) || 0;
              const label = pnl > 0 ? 'W' : (pnl < 0 ? 'L' : 'D');
              const color = pnl > 0 ? '#30D158' : (pnl < 0 ? '#FF453A' : '#8E8E93');
              return (
                <div key={idx} style={{ width: 32, height: 32, borderRadius: '8px', background: color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900 }}>{label}</div>
              );
          })}
      </div>
  </div>
);

// --- WIDGET 3: EXECUTION PRECISION ---
export const ExecutionPrecisionWidget = ({ avgMaeR = 0, avgMfeR = 0 }) => {
  const safeMae = isNaN(avgMaeR) ? 0 : avgMaeR;
  const safeMfe = isNaN(avgMfeR) ? 0 : avgMfeR;
  const precisionScore = Math.max(0, 100 - (safeMae * 100));
  return (
    <div className="bento-card" style={{ padding: 25, background: '#FFFFFF', border: '1px solid #F2F2F7' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <ChartLineUp size={20} color="#007AFF" weight="bold" />
        <div className="label-xs" style={{ color: '#86868B', letterSpacing: '1px' }}>EXECUTION PRECISION</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#FF3B30' }}>{safeMae.toFixed(2)}R</div>
          <div style={{ fontSize: 9, fontWeight: 800, color: '#8E8E93', marginTop: 4 }}>AVG MAE (HEAT)</div>
        </div>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#30D158' }}>{safeMfe.toFixed(2)}R</div>
          <div style={{ fontSize: 9, fontWeight: 800, color: '#8E8E93', marginTop: 4 }}>AVG MFE (RUN)</div>
        </div>
      </div>
      <div style={{ marginTop: 20, paddingTop: 15, borderTop: '1px solid #F2F2F7', textAlign: 'center' }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#8E8E93' }}>TIMING ACCURACY</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: precisionScore > 70 ? '#30D158' : '#FF9F0A' }}>{precisionScore.toFixed(0)}%</div>
      </div>
    </div>
  );
};

// --- WIDGET 4: EXPECTANCY (CONSCIOUS GROWTH) ---
export const ExpectancyWidget = ({ data = [] }) => {
  const chartData = data.length > 0 ? [{ trade: 0, val: 0 }, ...data] : [];
  return (
    <div className="bento-card" style={{ padding: 25, height: 350, background: '#FFFFFF', border: '1px solid #F2F2F7' }}>
      <div className="label-xs" style={{ color: '#86868B', marginBottom: 20, display: 'flex', alignItems: 'center', fontWeight: 800 }}>
        CONSCIOUS GROWTH (R)
        <CoachingInfo title="EDGE" text="Cumulative gain in R-multiples." />
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs><linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#007AFF" stopOpacity={0.1}/><stop offset="95%" stopColor="#007AFF" stopOpacity={0}/></linearGradient></defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2F2F7" />
          <XAxis dataKey="trade" hide />
          <YAxis fontSize={10} tickFormatter={(val) => `${val}R`} axisLine={false} tickLine={false} tick={{fill: '#8E8E93'}} />
          <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} formatter={(val) => [`${val.toFixed(2)} R`, "Conscious Gain"]} />
          <ReferenceLine y={0} stroke="#E5E5EA" />
          <Area type="monotone" dataKey="val" stroke="#007AFF" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" isAnimationActive={true} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// --- WIDGET 5: ACCOUNT CARD ---
export const AccountCard = ({ acc, balance, progressPct, ddPct, money, isFunded }) => (
    <div className="bento-card" style={{ padding: 20, position: 'relative', overflow: 'hidden', border: isFunded ? '2px solid #AF52DE' : '1px solid #E5E5EA', background: '#FFF' }}>
      {isFunded && <div style={{ position: 'absolute', top: 10, right: 10, color: '#AF52DE' }}><Crown size={20} weight="fill" /></div>}
      <div style={{ marginBottom: 15 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#86868B' }}>{acc.firm.toUpperCase()}</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#1D1D1F' }}>{acc.stage}</div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 900 }}>{money(balance)}</div>
        <div style={{ fontSize: 10, color: balance >= acc.startBalance ? '#30D158' : '#FF3B30', fontWeight: 700 }}>
          {balance >= acc.startBalance ? '+' : ''}{money(balance - acc.startBalance)}
        </div>
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, fontWeight: 800, marginBottom: 5 }}><span>{isFunded ? 'WITHDRAWAL GOAL' : 'PROFIT TARGET'}</span><span>{isFunded ? '∞' : money(acc.profitTarget)}</span></div>
          <div style={{ height: 6, background: '#F2F2F7', borderRadius: 3, overflow: 'hidden' }}><div style={{ width: `${progressPct}%`, height: '100%', background: '#30D158' }} /></div>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, fontWeight: 800, marginBottom: 5 }}><span>MAX DRAWDOWN</span><span style={{ color: '#FF3B30' }}>{money(acc.maxDrawdown)}</span></div>
          <div style={{ height: 6, background: '#F2F2F7', borderRadius: 3, overflow: 'hidden' }}><div style={{ width: `${ddPct}%`, height: '100%', background: '#FF3B30' }} /></div>
        </div>
      </div>
    </div>
);
// --- WIDGET 6: R-DISTRIBUTION ---
export const RDistributionWidget = ({ rDistData }) => (
  <div className="bento-card" style={{ padding: 20, background: '#FFFFFF', border: '1px solid #F2F2F7', height: 120 }}>
    <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rDistData}>
          <Tooltip cursor={{fill: '#F2F2F7'}} content={({ active, payload }) => (active && payload ? <div style={{ background: '#1C1C1E', padding: '4px 8px', borderRadius: '6px' }}><p style={{ color: 'white', fontSize: '10px', margin: 0 }}>{payload[0].value.toFixed(2)} R</p></div> : null)} />
          <Bar dataKey="r" radius={[2, 2, 0, 0]} barSize={12}>{rDistData.map((e, i) => <Cell key={i} fill={e.r >= 0 ? '#30D158' : '#FF453A'} />)}</Bar>
        </BarChart>
    </ResponsiveContainer>
  </div>
);

// --- WIDGET 7: PROCESS FRICTION ---
export const ProcessFrictionWidget = ({ mistakes }) => {
    // We verwachten een array van [naam, count]
    const mistakeEntries = Array.isArray(mistakes) ? mistakes : Object.entries(mistakes || {});
    
    return (
      <div className="bento-card" style={{ padding: 20, background: '#FFFFFF', border: '1px solid #F2F2F7' }}>
          <div className="label-xs" style={{ color: '#FF3B30', marginBottom: 12, fontWeight: 900 }}>FRICTION</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {mistakeEntries.length === 0 ? <span style={{ fontSize:11, color:'#86868B' }}>Zero friction.</span> : 
                mistakeEntries.map(([name, count]) => (
                  <div key={name} style={{ background: '#FFF2F2', padding: '4px 8px', borderRadius: '6px', fontSize: 9, fontWeight: 700, color: '#FF3B30' }}>{name.toUpperCase()} {count}X</div>
              ))}
          </div>
      </div>
    );
};