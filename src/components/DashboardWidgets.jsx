import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, ReferenceLine } from 'recharts';
import { 
  Crown, Info, ChartLineUp, Warning, Blueprint, Pulse, 
  CaretRight, Scales, TrendUp, Bank 
} from '@phosphor-icons/react';

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
          width: '240px', background: '#1C1C1E', color: 'white', padding: '12px', borderRadius: '12px', 
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

// --- WIDGET 1: PERFORMANCE (AUTO-FIT & ALIGNMENT FIX) ---
export const PerformanceWidget = ({ winrate = 0, avgDiscipline = 0, trades = [], isMobile }) => {
  const totalR = trades.reduce((sum, t) => sum + (Number(t.pnl) / (Number(t.risk) || 1)), 0);
  const grossProfit = trades.reduce((sum, t) => t.pnl > 0 ? sum + Number(t.pnl) : sum, 0);
  const grossLoss = Math.abs(trades.reduce((sum, t) => t.pnl < 0 ? sum + Number(t.pnl) : sum, 0));
  const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? "MAX" : "0.00") : (grossProfit / grossLoss).toFixed(2);

  return (
    <div className="performance-capsule" style={{ 
      background: 'linear-gradient(135deg, #1C1C1E 0%, #0D0D0E 100%)', color: 'white', 
      padding: isMobile ? '20px' : '20px 35px', borderRadius: '24px', display: 'flex', 
      flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', 
      justifyContent: isMobile ? 'center' : 'space-between',
      border: '1px solid rgba(255,255,255,0.12)',
      boxShadow: '0 12px 32px rgba(0,0,0,0.5)', gap: isMobile ? 25 : 20, 
      width: '100%', boxSizing: 'border-box'
    }}>
      <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
        <div style={{ color: '#8E8E93', fontSize: '9px', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 4 }}>
          CONSCIOUS GAIN <CoachingInfo title="R-MULTIPLE" text="Your performance score measured in risk units." />
        </div>
        <div style={{ fontSize: isMobile ? '42px' : '48px', fontWeight: 900, color: totalR >= 0 ? '#30D158' : '#FF453A', letterSpacing: '-2px', lineHeight: 1 }}>
          {totalR > 0 ? '+' : ''}{totalR.toFixed(1)}<span style={{ fontSize: '20px', opacity: 0.3, marginLeft: 4 }}>R</span>
        </div>
      </div>

      {!isMobile && <div style={{ width: '1px', height: '40px', background: 'rgba(255,255,255,0.15)' }} />}

      <div style={{ textAlign: 'center' }}>
        <div style={{ color: '#8E8E93', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>
          ADHERENCE <CoachingInfo title="DISCIPLINE" text="Rules adherence level." />
        </div>
        <div style={{ fontSize: '24px', fontWeight: 900, color: avgDiscipline >= 80 ? '#30D158' : '#FF9F0A', lineHeight: 1 }}>
          {Number(avgDiscipline || 0).toFixed(0)}%
        </div>
      </div>

      {!isMobile && <div style={{ width: '1px', height: '40px', background: 'rgba(255,255,255,0.15)' }} />}

      <div style={{ display: 'flex', gap: isMobile ? 40 : 30 }}>
        <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#8E8E93', fontSize: '9px', fontWeight: 800, marginBottom: 4 }}>PROFIT FACTOR</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF' }}>{profitFactor}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#8E8E93', fontSize: '9px', fontWeight: 800, marginBottom: 4 }}>WINRATE</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF' }}>{Number(winrate || 0).toFixed(0)}%</div>
        </div>
      </div>
    </div>
  );
};

// --- WIDGET 2: FORM GUIDE ---
export const FormGuideWidget = ({ lastTrades = [] }) => (
  <div className="bento-card" style={{ padding: 20, background: '#FFFFFF', border: '1px solid #F2F2F7', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div className="label-xs" style={{ marginBottom: 15, color: '#000', fontWeight: 900, display:'flex', alignItems:'center' }}>
        RECENT FORM <CoachingInfo title="MOMENTUM" text="Visualizing your current streak." />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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

// --- WIDGET 4: EXPECTANCY ---
export const ExpectancyWidget = ({ data = [], money }) => {
  const chartData = data.length > 0 ? [{ trade: 0, val: 0 }, ...data] : [];
  return (
    <div className="bento-card" style={{ padding: 25, height: 350, background: '#FFFFFF', border: '1px solid #F2F2F7' }}>
      <div className="label-xs" style={{ color: '#86868B', marginBottom: 20, display: 'flex', alignItems: 'center', fontWeight: 800 }}>
        CONSCIOUS GROWTH (R)
        <CoachingInfo title="EQUITY CURVE" text="Visualizing your R-Multiple edge over time." />
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs><linearGradient id="colorVal" x1="0" x2="0" y2="1"><stop offset="5%" stopColor="#007AFF" stopOpacity={0.1}/><stop offset="95%" stopColor="#007AFF" stopOpacity={0}/></linearGradient></defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
          <XAxis dataKey="trade" hide />
          <YAxis fontSize={10} tickFormatter={(val) => `${val}R`} axisLine={false} tickLine={false} tick={{fill: '#8E8E93'}} />
          <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} formatter={(val) => [`${val.toFixed(2)} R`, "Conscious Gain"]} />
          <ReferenceLine y={0} stroke="#E5E5EA" />
          <Area type="monotone" dataKey="val" stroke="#007AFF" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// --- WIDGET 5: ACCOUNT CARD (TINDER SWIPE OPTIMIZED) ---
export const AccountCard = ({ acc, balance, progressPct, ddPct, money, isFunded, version = "V1" }) => {
  const getTheme = () => {
    if (isFunded) return { primary: '#FFD60A', bg: 'linear-gradient(145deg, #1C1C1E 0%, #2C2C2E 100%)', text: '#FFD60A' };
    if (acc.stage === 'Phase 2') return { primary: '#AF52DE', bg: 'linear-gradient(145deg, #0F0F10 0%, #1C1C1E 100%)', text: '#AF52DE' };
    return { primary: '#0A84FF', bg: 'linear-gradient(145deg, #1C1C1E 0%, #0F0F10 100%)', text: '#FFFFFF' };
  };

  const theme = getTheme();
  const profitOrLoss = balance - acc.startBalance;
  const isPositive = profitOrLoss >= 0;
  const remainingDD = acc.maxDrawdown - (acc.startBalance - balance);

  const containerStyle = {
    width: '100%',
    boxSizing: 'border-box'
  };

  if (version === "V1") {
    return (
      <div style={{ ...containerStyle, padding: '25px', borderRadius: '28px', background: theme.bg, color: 'white', border: `1px solid rgba(255,255,255,0.08)`, position: 'relative', overflow: 'hidden', minHeight: '220px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: isPositive ? '#30D158' : '#FF3B30', opacity: 0.6 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 900, color: theme.primary, letterSpacing: '1.5px', textTransform: 'uppercase' }}>{acc.firm}</div>
            <div style={{ fontSize: '11px', opacity: 0.4, fontFamily: 'monospace' }}>ID: {acc.accountNumber || 'N/A'}</div>
          </div>
          <div style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', fontSize: '10px', fontWeight: 800 }}>{acc.stage?.toUpperCase()}</div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '10px', color: '#8E8E93', fontWeight: 700 }}>CURRENT EQUITY</div>
          <div style={{ fontSize: '32px', fontWeight: 900, fontFamily: 'monospace' }}>{money(balance)}</div>
          <div style={{ fontSize: '12px', color: isPositive ? '#30D158' : '#FF453A', fontWeight: 700 }}>{isPositive ? '▲' : '▼'} {money(Math.abs(profitOrLoss))}</div>
        </div>
        <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', marginTop: 20 }}>
          <div style={{ width: `${progressPct}%`, height: '100%', background: theme.primary }} />
        </div>
      </div>
    );
  }

  if (version === "V2") {
    return (
      <div style={{ ...containerStyle, padding: '25px', background: '#FFF', borderRadius: '24px', border: '1px solid #E5E5EA' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
           <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: '12px', background: '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pulse size={22} color={isPositive ? '#30D158' : '#FF3B30'} /></div>
              <div><div style={{ fontSize: '14px', fontWeight: 900 }}>{acc.firm}</div><div style={{ fontSize: '10px', color: '#8E8E93' }}>ID: {acc.accountNumber}</div></div>
           </div>
           <div style={{ textAlign: 'right' }}><div style={{ fontSize: '18px', fontWeight: 900 }}>{money(balance)}</div><div style={{ fontSize: '10px', fontWeight: 800, color: isPositive ? '#30D158' : '#FF3B30' }}>{isPositive ? 'PROFIT' : 'DRAWDOWN'}</div></div>
        </div>
        <div style={{ background: '#F5F5F7', padding: '15px', borderRadius: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
           <div><div style={{ fontSize: '9px', color: '#8E8E93' }}>TARGET GAP</div><div style={{ fontSize: '13px', fontWeight: 800 }}>{money(Math.max(0, acc.profitTarget - profitOrLoss))}</div></div>
           <div style={{ borderLeft: '1px solid #E5E5EA', paddingLeft: 15 }}><div style={{ fontSize: '9px', color: '#8E8E93' }}>SAFETY RUNWAY</div><div style={{ fontSize: '13px', fontWeight: 800, color: '#FF3B30' }}>{money(remainingDD)}</div></div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      ...containerStyle, 
      padding: '20px', 
      background: 'linear-gradient(135deg, #1C1C1E 0%, #0A0A0B 100%)', 
      borderRadius: '24px', 
      display: 'flex', 
      alignItems: 'center', 
      gap: 15,
      border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
    }}>
      <div style={{ 
        width: 50, height: 50, borderRadius: '15px', 
        background: isPositive ? 'rgba(48, 209, 88, 0.1)' : 'rgba(255, 69, 58, 0.1)', 
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${isPositive ? 'rgba(48, 209, 88, 0.2)' : 'rgba(255, 69, 58, 0.2)'}`
      }}>
        <Scales size={24} color={isPositive ? '#30D158' : '#FF453A'} weight="duotone" />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <div style={{ fontSize: '11px', color: '#8E8E93', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{acc.firm}</div>
           <div style={{ fontSize: '9px', padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', color: theme.primary, fontWeight: 800 }}>{acc.stage?.toUpperCase()}</div>
        </div>
        <div style={{ fontSize: '22px', color: '#FFFFFF', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '-0.5px' }}>{money(balance)}</div>
      </div>
      <CaretRight size={18} color="rgba(255,255,255,0.2)" weight="bold" />
    </div>
  );
};

// --- WIDGET 8: EXECUTION BLUEPRINT ---
export const ExecutionBlueprintWidget = ({ trades = [] }) => {
  const calculateMetrics = (subset) => {
    if (subset.length === 0) return { heat: 0, plan: 0, conscious: 0 };
    const totals = subset.reduce((acc, t) => {
      const entry = Number(t.entryPrice || t.price);
      const sl = Number(t.slPrice || t.sl);
      const tp = Number(t.tpPrice);
      const exit = Number(t.exitPrice || entry);
      const mae = Number(t.maePrice || entry);
      const mfe = Number(t.mfePrice || exit);
      const riskDist = Math.abs(entry - sl);
      const planDist = Math.abs(tp - entry);
      const heat = riskDist > 0 ? Math.min(Math.abs(entry - mae) / riskDist, 1.2) : 0;
      const plan = planDist > 0 ? Math.min(Math.abs(entry - exit) / planDist, 1.2) : 0;
      const movePotential = Math.abs(mfe - entry);
      const conscious = movePotential > 0 ? (Math.abs(exit - entry) / movePotential) : 1;
      return { heat: acc.heat + heat, plan: acc.plan + plan, conscious: acc.conscious + conscious };
    }, { heat: 0, plan: 0, conscious: 0 });

    return {
      heat: (totals.heat / subset.length).toFixed(2),
      plan: (totals.plan / subset.length).toFixed(2),
      conscious: (totals.conscious / subset.length).toFixed(2)
    };
  };

  const longMetrics = calculateMetrics(trades.filter(t => t.direction === 'LONG'));
  const shortMetrics = calculateMetrics(trades.filter(t => t.direction === 'SHORT'));
  const allMetrics = calculateMetrics(trades);

  const Column = ({ label, stats, type }) => {
    const isShort = type === 'SHORT';
    const bodyColor = isShort ? '#FF453A' : '#30D158';

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '80px' }}>
        <div style={{ height: '180px', width: '40px', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          {isShort ? (
            <>
              <div style={{ width: '2px', height: `${Math.max(stats.heat * 40, 5)}px`, background: '#FF3B30', opacity: 0.8 }} />
              <div style={{ width: '30px', height: '1px', borderBottom: '2px dashed rgba(255, 59, 48, 0.2)' }} />
              <div style={{ width: '24px', height: `${Math.max(stats.plan * 70, 10)}px`, background: stats.plan > 0.7 ? bodyColor : '#8E8E93', borderRadius: '4px', zIndex: 2 }} />
              <div style={{ width: '2px', height: '30px', background: '#E5E5EA', position: 'relative', opacity: 0.5 }}><div style={{ position: 'absolute', bottom: 0, left: '-4px', width: '100%', height: '2px', background: '#E5E5EA' }} /></div>
            </>
          ) : (
            <>
              <div style={{ width: '2px', height: '30px', background: '#E5E5EA', position: 'relative', opacity: 0.5 }}><div style={{ position: 'absolute', top: 0, left: '-4px', width: '10px', height: '2px', background: '#E5E5EA' }} /></div>
              <div style={{ width: '24px', height: `${Math.max(stats.plan * 70, 10)}px`, background: stats.plan > 0.7 ? bodyColor : '#8E8E93', borderRadius: '4px', zIndex: 2 }} />
              <div style={{ width: '30px', height: '1px', borderBottom: '2px dashed rgba(255, 59, 48, 0.2)' }} />
              <div style={{ width: '2px', height: `${Math.max(stats.heat * 40, 5)}px`, background: '#FF3B30', opacity: 0.8 }} />
            </>
          )}
        </div>
        <div style={{ marginTop: 20, textAlign: 'center', width: '100%' }}>
          <div style={{ fontSize: '10px', fontWeight: 900 }}>{label}</div>
          <div style={{ display: 'grid', gap: 4 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'9px', fontWeight:700 }}><span>HEAT</span><span>{stats.heat}</span></div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'9px', fontWeight:700 }}><span>PLAN</span><span>{stats.plan}</span></div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'9px', fontWeight:700 }}><span>CONSCIOUS</span><span>{stats.conscious}</span></div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bento-card" style={{ padding: 25, background: '#FFFFFF', border: '1px solid #F2F2F7' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 25 }}>
        <div style={{ background: '#1D1D1F', padding: '6px', borderRadius: '8px' }}><Blueprint size={18} color="white" weight="fill" /></div>
        <div style={{ fontSize: '14px', fontWeight: 900 }}>EXECUTION BLUEPRINT</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-around', gap: 15 }}>
        <Column label="SHORT" stats={shortMetrics} type="SHORT" />
        <div style={{ width: '1px', height: '140px', background: '#F2F2F7', alignSelf: 'center' }} />
        <Column label="LONG" stats={longMetrics} type="LONG" />
        <div style={{ width: '1px', height: '140px', background: '#F2F2F7', alignSelf: 'center' }} />
        <Column label="COMBINED" stats={allMetrics} type="LONG" />
      </div>
    </div>
  );
};

// --- WIDGET 9: FINANCIAL HARVEST BLUEPRINT ---
export const FinancialHarvestWidget = ({ payouts = [], invested = 0, money }) => {
  return (
    <div className="bento-card" style={{ padding: 30, background: '#FFFFFF', border: '1px solid #F2F2F7' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 900, letterSpacing: '-0.5px' }}>FINANCIAL HARVEST</div>
          <div style={{ fontSize: '10px', color: '#8E8E93', fontWeight: 600 }}>Realized payouts vs challenge costs.</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '10px', fontWeight: 800, color: '#8E8E93' }}>PORTFOLIO COST</div>
          <div style={{ fontSize: '14px', fontWeight: 900, color: '#FF3B30' }}>-{money(invested)}</div>
        </div>
      </div>
      <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: 15, paddingBottom: 20, borderBottom: '1px solid #F2F2F7', overflowX: 'auto' }}>
        {payouts.length === 0 ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D2D2D7', fontSize: 12 }}>Waiting for harvest...</div>
        ) : (
          payouts.map((p, i) => {
            const height = Math.min(p.convertedAmount / 100, 150);
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '40px' }}>
                <div style={{ width: '2px', height: '15px', background: '#30D158', opacity: 0.4, marginBottom: '2px' }} /> 
                <div style={{ width: '20px', height: `${height}px`, background: '#30D158', borderRadius: '4px', boxShadow: '0 4px 10px rgba(48, 209, 88, 0.3)' }} />
                <div style={{ fontSize: '8px', fontWeight: 800, marginTop: 8, color: '#8E8E93' }}>{new Date(p.date).toLocaleDateString('nl-NL', {month: 'short'})}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};