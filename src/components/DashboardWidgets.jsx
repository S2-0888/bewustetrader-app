import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { TrendUp, Timer, ChartBar, Pulse, CalendarBlank, Target, Info } from '@phosphor-icons/react';
import { 
  BarChart, Bar, ResponsiveContainer, Cell, LineChart, Line, 
  PieChart, Pie, YAxis, ReferenceLine, Tooltip, AreaChart, Area 
} from 'recharts';

// --- DE DEFINITIEVE PORTAL TOOLTIP ---
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
          position: 'fixed', 
          top: pos.y - 10, 
          left: pos.x, 
          transform: 'translate(-50%, -100%)',
          width: '240px', 
          background: '#1C1C1E', 
          padding: '12px', 
          borderRadius: '12px', 
          boxShadow: '0 30px 60px rgba(0,0,0,0.5)', 
          border: '1px solid rgba(255,255,255,0.1)', 
          zIndex: 10000000, 
          pointerEvents: 'none'
        }}>
          <p style={{ fontSize: '10px', fontWeight: 900, color: '#0A84FF', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
            {title}
          </p>
          <p style={{ fontSize: '11px', color: '#FFFFFF', lineHeight: '1.4', margin: 0, fontWeight: 400 }}>
            {text}
          </p>
        </div>,
        document.body 
      )}
    </>
  );
};

// --- WIDGET 1: PERFORMANCE ---
export const PerformanceWidget = ({ totalR, winrate, avgDiscipline, winLossRatio, isMobile }) => (
  <div className="bento-card" style={{ background: '#1D1D1F', color: 'white', padding: 25, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', border: 'none' }}>
    <div className="label-xs" style={{ color:'#86868B', marginBottom: 15, display:'flex', alignItems:'center', margin: 0 }}>
      NET PERFORMANCE <CoachingInfo title="ALPHA GAIN" text="Your net profit in R-Multiples. Focus on the process, not the money." />
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
            <div style={{ fontSize: isMobile ? 42 : 56, fontWeight: 800, color: totalR >= 0 ? '#30D158' : '#FF453A', lineHeight: 1, letterSpacing: '-2px' }}>
              {totalR > 0 ? '+' : ''}{totalR.toFixed(1)}<span style={{ fontSize: 20, opacity: 0.3, marginLeft: 4 }}>R</span>
            </div>
            <div style={{ display: 'flex', gap: 15, marginTop: 20 }}>
              <div>
                <div className="label-xs" style={{ fontSize: 8, color: '#86868B', display: 'flex', alignItems: 'center' }}>
                  DISCIPLINE <CoachingInfo title="DISCIPLINE" text="How well did you follow your rules? High discipline is the only path to long-term survival." />
                </div>
                <div style={{ color: '#30D158', fontWeight: 700, fontSize: 16 }}>{avgDiscipline}%</div>
              </div>
              <div>
                <div className="label-xs" style={{ fontSize: 8, color: '#86868B', display: 'flex', alignItems: 'center' }}>
                  PROFIT FACTOR <CoachingInfo title="PROFIT FACTOR" text="Gross Profit / Gross Loss. A value above 2.0 indicates a very strong mathematical edge." />
                </div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>{winLossRatio}</div>
              </div>
            </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="label-xs" style={{ fontSize: 9, color: '#86868B', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            WINRATE <CoachingInfo title="WINRATE" text="Percentage of winning trades. Large winners matter more than a high winrate." />
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{winrate}%</div>
        </div>
    </div>
  </div>
);

// --- WIDGET 2: FORM GUIDE ---
export const FormGuideWidget = ({ calendarStrip }) => (
  <div className="bento-card" style={{ padding: 20, background: '#FFFFFF', border: '1px solid #F2F2F7', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div className="label-xs" style={{ marginBottom: 15, color: '#000', fontWeight: 900, display:'flex', alignItems:'center' }}>
        FORM GUIDE <CoachingInfo title="RECENT FORM" text="Shows your last 10 trading days. Green is profitable, red is loss." />
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
          {calendarStrip.map((day, idx) => (
              <div key={idx} style={{ 
                width: 30, height: 30, borderRadius: '6px', 
                background: !day.hasTrades ? '#F2F2F7' : (day.val > 0 ? '#30D158' : '#FF453A'), 
                color: day.hasTrades ? 'white' : '#8E8E93', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, border: day.date === new Date().toISOString().split('T')[0] ? '2px solid #007AFF' : 'none' }}>
                  {day.hasTrades ? (day.val > 0 ? 'W' : (day.val < 0 ? 'L' : 'D')) : '·'}
              </div>
          ))}
      </div>
  </div>
);

// --- WIDGET 3: R-DISTRIBUTION (MET CONTEXT) ---
export const RDistributionWidget = ({ rDistData }) => (
  <div className="bento-card" style={{ padding: 20, background: '#FFFFFF', border: '1px solid #F2F2F7', height: '100%', display: 'flex', flexDirection: 'column' }}>
    <div className="label-xs" style={{ color: '#000', marginBottom: 15, display: 'flex', alignItems: 'center', fontWeight: 900 }}>
      R-DIST <CoachingInfo title="RISK PROFILE" text="Each bar is one trade. Pro traders have capped red bars (-1R) and uncapped green bars." />
    </div>
    <div style={{ flex: 1, width: '100%', minHeight: 100 }}>
      <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rDistData} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
            <YAxis fontSize={8} tick={{fill: '#8E8E93'}} axisLine={false} tickLine={false} domain={[-1.5, 'dataMax + 0.5']} />
            <Tooltip 
              cursor={{fill: '#F2F2F7'}}
              content={({ active, payload }) => (active && payload ? (
                <div style={{ background: '#1C1C1E', padding: '4px 8px', borderRadius: '6px' }}>
                  <p style={{ color: 'white', fontSize: '10px', margin: 0 }}>{payload[0].value.toFixed(2)} R</p>
                </div>
              ) : null)}
            />
            <ReferenceLine y={-1} stroke="#FF3B30" strokeDasharray="3 3" />
            <ReferenceLine y={0} stroke="#E5E5EA" />
            <Bar dataKey="r" radius={[2, 2, 0, 0]} barSize={12}>
                {rDistData.map((e, i) => (
                  <Cell key={i} fill={e.r >= 0 ? '#30D158' : (e.r <= -1.05 ? '#8B0000' : '#FF453A')} />
                ))}
            </Bar>
          </BarChart>
      </ResponsiveContainer>
    </div>
    <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #F2F2F7', paddingTop: 8 }}>
        <span style={{ fontSize: 7, fontWeight: 800, color: '#8E8E93' }}>INDIVIDUAL TRADES</span>
        <span style={{ fontSize: 7, fontWeight: 800, color: '#FF3B30' }}>LIMIT: -1.0R</span>
    </div>
  </div>
);

// --- WIDGET 4: TRADE LIFECYCLE (TOP-ALIGNED & DYNAMISCH) ---
export const TradeLifecycleWidget = ({ maeRatio, mfeScore }) => {
  const getStatusColor = (score) => {
    if (score < 40) return '#FF3B30';
    if (score < 70) return '#FF9F0A';
    return '#30D158';
  };

  return (
    <div className="bento-card" style={{ padding: 20, background: '#FFFFFF', border: '1px solid #F2F2F7', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
      <div className="label-xs" style={{ color: '#000', marginBottom: 20, fontWeight: 900, display: 'flex', alignItems: 'center' }}>
        LIFECYCLE <CoachingInfo title="EXECUTION QUALITY" text="MAE tracks if your entry was 'clean'. MFE tracks if your exit was 'timed'." />
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 8, fontWeight: 800, color: '#86868B' }}>ENTRY PRECISION (MAE)</span>
              <CoachingInfo title="ENTRY PRECISION" text="How much 'heat' did you take? A high score means minimal drawdownna entry." />
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, color: getStatusColor(maeRatio) }}>{Math.round(maeRatio)}%</span>
          </div>
          <div style={{ height: 4, background: '#F2F2F7', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${maeRatio}%`, height: '100%', background: getStatusColor(maeRatio), transition: 'width 1s ease-in-out, background 0.5s ease' }}></div>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 8, fontWeight: 800, color: '#86868B' }}>EXIT EFFICIENCY (MFE)</span>
              <CoachingInfo title="EXIT EFFICIENCY" text="How much did you leave on the table? High score means capturing the bulk of the move." />
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, color: getStatusColor(mfeScore) }}>{mfeScore}%</span>
          </div>
          <div style={{ height: 4, background: '#F2F2F7', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${mfeScore}%`, height: '100%', background: getStatusColor(mfeScore), transition: 'width 1s ease-in-out, background 0.5s ease' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ExpectancyWidget = ({ data }) => {
  // Fix 1: Voeg altijd een beginpunt toe (0R) zodat er altijd een lijn getrokken kan worden
  const chartData = [{ trade: 'Start', val: 0 }, ...data];

  return (
    <div className="bento-card" style={{ padding: 20, background: '#FFFFFF', border: '1px solid #F2F2F7', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="label-xs" style={{ marginBottom: 15, color: '#000', fontWeight: 900, display: 'flex', alignItems: 'center' }}>
          EQUITY CURVE (R) <CoachingInfo title="EQUITY STABILITY" text="Cumulative growth in R. A rising slope confirms a mathematical edge." />
        </div>
        
        <div style={{ flex: 1, width: '100%', minHeight: 150 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#007AFF" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#007AFF" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                
                {/* Fix 2: Verwijder domain beperkingen om te kijken of de lijn verschijnt */}
                <YAxis 
                  fontSize={9} 
                  tick={{fill: '#8E8E93'}} 
                  axisLine={false} 
                  tickLine={false}
                  width={30}
                />
                
                <Tooltip 
                  content={({ active, payload }) => (active && payload ? (
                    <div style={{ background: '#1C1C1E', padding: '8px 12px', borderRadius: '8px', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
                      <p style={{ color: 'white', fontSize: '12px', fontWeight: 800, margin: 0 }}>{payload[0].value.toFixed(2)} R</p>
                    </div>
                  ) : null)}
                />

                <ReferenceLine y={0} stroke="#E5E5EA" strokeWidth={1} />
                
                {/* Fix 3: Voeg 'isAnimationActive={false}' toe om render-vertraging uit te sluiten */}
                <Area 
                  type="monotone" 
                  dataKey="val" 
                  stroke="#007AFF" 
                  strokeWidth={3} 
                  fill="url(#equityGradient)" 
                  isAnimationActive={true}
                  animationDuration={1000}
                />
            </AreaChart>
          </ResponsiveContainer>
        </div>
    </div>
  );
};

// --- WIDGET 6: PROCESS FRICTION ---
export const ProcessFrictionWidget = ({ mistakes }) => (
  <div className="bento-card" style={{ padding: 20, background: '#FFFFFF', border: '1px solid #F2F2F7', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
      <div className="label-xs" style={{ color: '#FF3B30', marginBottom: 12, fontWeight: 900, display: 'flex', alignItems: 'center' }}>
        FRICTION <CoachingInfo title="PROCESS LEAKAGE" text="Recurring behavioral errors. Stop the leakage to scale your position size safely." />
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {mistakes.length === 0 ? <span style={{ fontSize:11, color:'#86868B' }}>Zero friction. Perfect execution.</span> : 
            mistakes.map(([name, count]) => (
              <div key={name} style={{ background: '#FFF2F2', padding: '4px 8px', borderRadius: '6px', fontSize: 9, fontWeight: 700, color: '#FF3B30', border: '1px solid rgba(255,59,48,0.1)' }}>
                {name.toUpperCase()} {count}X
              </div>
          ))}
      </div>
  </div>
);

// --- ACCOUNT CARD ---
export const AccountCard = ({ acc, balance, progressPct, ddPct, money, onPromote, onBreach }) => {
  const ringData = [{ value: progressPct }, { value: 100 - progressPct }];
  const statusColor = ddPct > 80 ? '#FF453A' : ddPct > 50 ? '#FF9F0A' : '#30D158';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px' }}>
      <div style={{ width: 100, height: 100, position: 'relative', marginBottom: 12 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={ringData} innerRadius={38} outerRadius={46} startAngle={90} endAngle={-270} dataKey="value" stroke="none" cornerRadius={10}>
              <Cell fill={progressPct >= 100 ? '#FFD60A' : '#30D158'} />
              <Cell fill="#F2F2F7" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#000' }}>{Math.round(progressPct)}%</div>
          <div style={{ fontSize: 8, fontWeight: 800, color: '#86868B', marginTop: 2 }}>TARGET</div>
        </div>
        <div style={{ position: 'absolute', top: 5, right: 5, width: 10, height: 10, borderRadius: '50%', background: statusColor, border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
      </div>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontWeight: 800, fontSize: 12, color: '#000' }}>{acc.firm}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#48484A' }}>{money(balance)}</div>
      </div>
      {(progressPct >= 100 || ddPct >= 100) && (
        <button onClick={() => progressPct >= 100 ? onPromote(acc) : onBreach(acc)} style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', background: progressPct >= 100 ? '#007AFF' : '#FF453A', color: 'white', fontSize: 10, fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.15)' }}>{progressPct >= 100 ? 'PROMOTE' : 'BREACH'}</button>
      )}
    </div>
  );
};