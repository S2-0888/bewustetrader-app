import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { db, auth } from '../lib/firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { 
  Brain, Warning, Target, Quotes, ShieldCheck, 
  TrendDown, Info, ShieldWarning, X, ShieldStar, 
  FileText, CaretRight, ChartPieSlice, Clock, Lightning 
} from '@phosphor-icons/react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip, Cell, PieChart, Pie 
} from 'recharts';
import AccountIntelligenceReport from './AccountIntelligenceReport';

// --- MUTED COLORS PALETTE ---
const PASTEL_COLORS = ['#FFCDD2', '#F8BBD0', '#E1BEE7', '#D1C4E9', '#C5CAE9', '#BBDEFB'];
const THEME = {
  passed: '#34C759',
  breached: '#FF3B30',
  textMain: '#1C1C1E',
  textSecondary: '#8E8E93',
  bgLight: '#F2F2F7'
};

// --- GEOPTIMALISEERDE TOOLTIP MET PORTAL ---
const InfoBadge = ({ title, text }) => {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const handleInteraction = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({ x: rect.left + rect.width / 2, y: rect.top });
    setVisible(true);
  };

  return (
    <>
      <div 
        style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '8px', cursor: 'help' }}
        onMouseEnter={handleInteraction}
        onMouseLeave={() => setVisible(false)}
      >
        <Info size={16} weight="bold" style={{ color: '#8E8E93', opacity: 0.6 }} />
      </div>

      {visible && createPortal(
        <div style={{ 
          position: 'fixed', 
          top: pos.y - 12, 
          left: pos.x, 
          transform: 'translate(-50%, -100%)',
          width: '240px', 
          background: 'rgba(28, 28, 30, 0.98)', 
          color: 'white', 
          padding: '12px 16px', 
          borderRadius: '14px', 
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)', 
          border: '1px solid rgba(255,255,255,0.1)', 
          zIndex: 9999999,
          pointerEvents: 'none', 
          backdropFilter: 'blur(10px)',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <p style={{ fontSize: '10px', fontWeight: 900, color: '#007AFF', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>{title}</p>
          <p style={{ fontSize: '12px', color: '#FFFFFF', lineHeight: '1.4', margin: 0, fontWeight: 400 }}>{text}</p>
          <div style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid rgba(28, 28, 30, 0.98)'
          }} />
        </div>,
        document.body 
      )}
    </>
  );
};

export default function Insights({ setView }) {
  const [accounts, setAccounts] = useState([]);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAudit, setSelectedAudit] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsubAcc = onSnapshot(collection(db, "users", user.uid, "accounts"), (snap) => {
      setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qTrades = query(collection(db, "users", user.uid, "trades"), orderBy("date", "desc"));
    const unsubTrades = onSnapshot(qTrades, (snap) => {
      setTrades(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => { unsubAcc(); unsubTrades(); };
  }, []);

  const pendingAudits = accounts.filter(acc => acc.stage === 'Breached' && !acc.postMortemCompleted);
  const auditedAccounts = accounts.filter(a => a.postMortemCompleted === true && (a.postMortemData || a.auditAnswers));

  const leakData = accounts.filter(a => a.stage === 'Breached' && a.postMortemData).reduce((acc, curr) => {
    const mistake = curr.postMortemData.primaryMistake || 'Unknown';
    const existing = acc.find(item => item.name === mistake);
    if (existing) {
      existing.value += Number(curr.size || 0);
    } else {
      acc.push({ name: mistake, value: Number(curr.size || 0) });
    }
    return acc;
  }, []).sort((a, b) => b.value - a.value);

  const strategyStats = trades.filter(t => t.status === 'CLOSED').reduce((acc, t) => {
    const strat = t.strategy || 'General';
    const existing = acc.find(item => item.name === strat);
    const pnl = Number(t.pnl) || 0;
    const disc = Number(t.disciplineScore) || 0;

    if (existing) {
      existing.totalPnl += pnl;
      existing.totalDisc += disc;
      existing.trades += 1;
    } else {
      acc.push({ name: strat, totalPnl: pnl, totalDisc: disc, trades: 1 });
    }
    return acc;
  }, []);

  const closedTrades = trades.filter(t => t.status === 'CLOSED');

  const biasData = closedTrades.reduce((acc, t) => {
    const side = (t.side?.toUpperCase().includes('BUY') || t.side?.toUpperCase().includes('LONG')) ? 'Longs' : 'Shorts';
    const existing = acc.find(item => item.name === side);
    if (existing) {
      existing.total += 1; 
      if (Number(t.pnl) > 0) existing.wins += 1;
    } else {
      acc.push({ name: side, total: 1, wins: Number(t.pnl) > 0 ? 1 : 0 });
    }
    return acc;
  }, []);

  const sessionData = closedTrades.reduce((acc, t) => {
    const hour = new Date(t.date).getUTCHours();
    let session = 'Asia';
    if (hour >= 7 && hour < 13) session = 'London';
    if (hour >= 13 && hour < 20) session = 'New York';
    const existing = acc.find(item => item.name === session);
    if (existing) { existing.value += Number(t.pnl) || 0; } 
    else { acc.push({ name: session, value: Number(t.pnl) || 0 }); }
    return acc;
  }, []);

  const COLORS = ['#FF3B30', '#FF9F0A', '#AF52DE', '#007AFF', '#30D158'];

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Matching Intelligence Parameters...</div>;

  return (
    <div style={{ padding: '40px 20px', maxWidth: 1200, margin: '0 auto', paddingBottom: 100 }}>
      
      <header style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <Brain size={32} weight="fill" color="#007AFF" />
          <h1 style={{ fontSize: '32px', fontWeight: 900, margin: 0, letterSpacing: '-1.2px' }}>Intelligence</h1>
        </div>
        <p style={{ color: '#86868B', fontSize: '15px' }}>De-coding behavioral patterns and capital leaks.</p>
      </header>

      {/* ALERT: OPENSTAANDE SHADOW AUDITS */}
      {pendingAudits.length > 0 && (
        <div className="bento-card" style={{ border: '2px solid #FF3B30', padding: '20px', marginBottom: '25px', background: 'rgba(255, 59, 48, 0.05)', animation: 'fadeIn 0.5s ease-out' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
            <div style={{ background: '#FF3B30', padding: 8, borderRadius: '50%', display: 'flex' }}>
              <ShieldWarning size={20} color="white" weight="fill" />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, fontWeight: 900, fontSize: '14px', letterSpacing: '-0.3px' }}>UNRESOLVED SHADOW AUDIT</h4>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#86868B', lineHeight: 1.4 }}>
                You have {pendingAudits.length} account(s) waiting for calibration. Running from the truth delays your growth.
              </p>
            </div>
            <button 
              onClick={() => setView ? setView('portfolio') : (window.location.hash = 'portfolio')} 
              style={{ padding: '10px 18px', borderRadius: '10px', background: '#1D1D1F', color: 'white', border: 'none', fontWeight: 800, fontSize: '12px', cursor: 'pointer', transition: '0.2s' }}
            >
              FACE THE TRUTH
            </button>
          </div>
        </div>
      )}

      {/* RIJ 1: LEAK RADAR & STRATEGY EDGE */}
      <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1.4fr 1fr', gap: 25, marginBottom: 25 }}>
        
        <div className="bento-card" style={{ padding: 30 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 25 }}>
            <TrendDown size={20} weight="bold" color="#FF3B30" />
            <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.5px' }}>CAPITAL LEAKS</span>
            <InfoBadge 
              title="Capital Leaks" 
              text="This data is generated from your Post-Mortem Audits. It reveals which psychological behaviors are costing you the most capital." 
            />
          </div>
          
          {leakData.length > 0 ? (
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leakData} layout="vertical" margin={{ left: 30 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} style={{ fontSize: '11px', fontWeight: 700 }} />
                  <Tooltip cursor={{fill: 'rgba(0,0,0,0.02)'}} contentStyle={{ borderRadius: 12, border: 'none' }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {leakData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#86868B', textAlign: 'center', fontSize: 13 }}>
              No leaks detected yet.
            </div>
          )}
        </div>

        <div className="bento-card" style={{ padding: 30 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 25 }}>
            <ShieldCheck size={20} weight="bold" color="#007AFF" />
            <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.5px' }}>STRATEGY EDGE</span>
          </div>
          
          <div style={{ display: 'grid', gap: 12 }}>
            {strategyStats.map((strat, i) => {
              const avgDisc = strat.totalDisc / strat.trades;
              return (
                <div key={i} style={{ padding: '15px', background: '#F9F9FB', borderRadius: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: 14 }}>{strat.name}</span>
                    <span style={{ fontWeight: 900, color: strat.totalPnl >= 0 ? '#30D158' : '#FF3B30' }}>
                      {strat.totalPnl >= 0 ? '+' : ''}{Math.round(strat.totalPnl)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, height: 4, background: '#E5E5EA', borderRadius: 2 }}>
                      <div style={{ width: `${avgDisc}%`, height: '100%', background: avgDisc > 80 ? '#30D158' : '#FF9F0A', borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#86868B' }}>{Math.round(avgDisc)}% DISC.</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIJ 2: EXTRA INZICHTEN (ALPHA & SESSION) */}
      <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1.5fr 1fr', gap: 20, marginBottom: 25 }}>
        <div className="bento-card" style={{ padding: '24px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 15 }}>
              <ChartPieSlice size={18} weight="bold" color="#AF52DE" />
              <span style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase' }}>Directional Alpha</span>
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              {biasData.map((d, i) => (
                <div key={i}>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: '#8E8E93' }}>{d.name.toUpperCase()}</div>
                  <div style={{ fontSize: '16px', fontWeight: 900 }}>{Math.round((d.wins / d.total) * 100)}% <span style={{fontSize: '10px', color: '#8E8E93'}}>WR</span></div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
             <Lightning size={24} color="#FF9F0A" weight="fill" />
             <div style={{ fontSize: '9px', fontWeight: 800, color: '#8E8E93', marginTop: 4 }}>EFFICIENCY DNA</div>
          </div>
        </div>

        <div className="bento-card" style={{ padding: '24px', background: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Clock size={18} weight="bold" color="#007AFF" />
            <span style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase' }}>Session DNA</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {sessionData.map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: 900, color: s.value >= 0 ? '#34C759' : '#FF3B30' }}>
                  {s.value >= 0 ? '+' : ''}{Math.round(s.value / 100) / 10}k
                </div>
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#8E8E93' }}>{s.name.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIJ 3: VALIDATION LOG */}
      <div className="bento-card" style={{ 
        padding: '32px', 
        background: 'white',
        borderRadius: '30px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
      }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#F2F2F7', padding: '8px', borderRadius: '12px' }}>
              <FileText size={20} weight="fill" color="#1D1D1F" />
            </div>
            <span style={{ fontSize: '15px', fontWeight: 800 }}>Validation Log</span>
          </div>
          <div style={{ fontSize: '12px', color: '#86868B', fontWeight: 600 }}>{auditedAccounts.length} Reports Total</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1fr 1fr 1fr', gap: 24 }}>
          {auditedAccounts.length > 0 ? auditedAccounts.map((acc, i) => {
            const isPassed = acc.stage !== 'Breached';
            const reportData = isPassed ? acc.auditAnswers : acc.postMortemData;
            const theme = isPassed ? '#30D158' : '#FF3B30';
            const Icon = isPassed ? ShieldStar : ShieldWarning;

            return (
              <div 
                key={i} 
                onClick={() => setSelectedAudit(acc)}
                className="report-card"
                style={{ 
                  position: 'relative',
                  padding: '24px', 
                  borderRadius: '24px', 
                  background: 'white', 
                  border: '1px solid #E5E5EA',
                  cursor: 'pointer', 
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  minHeight: '180px'
                }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6px', background: theme, borderRadius: '24px 24px 0 0', opacity: 0.8 }} />
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{ background: `${theme}10`, padding: '6px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon size={14} weight="fill" color={theme} />
                      <span style={{ fontSize: '10px', fontWeight: 900, color: theme, textTransform: 'uppercase' }}>{isPassed ? 'Standard' : 'Shadow'}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#86868B' }}>{reportData?.timestamp ? new Date(reportData.timestamp.toDate()).toLocaleDateString('nl-NL') : 'Recent'}</span>
                  </div>
                  <div style={{ fontSize: '14px', color: '#1D1D1F', fontWeight: 600, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {isPassed ? reportData?.emotion : reportData?.primaryMistake}
                  </div>
                </div>
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #F2F2F7', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#86868B' }}>{acc.firm}</span>
                  <span style={{ fontSize: '11px', fontWeight: 800 }}>${(acc.size / 1000)}k</span>
                </div>
              </div>
            );
          }) : <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: 40, color: '#86868B' }}>No reports archived yet.</div>}
        </div>
      </div>

      {selectedAudit && (
        <AccountIntelligenceReport 
          data={{
            firm: selectedAudit.firm,
            ...(selectedAudit.stage === 'Breached' ? selectedAudit.postMortemData : selectedAudit.auditAnswers),
            account_grade: selectedAudit.ai_report?.grade || "8.2", 
            score_label: selectedAudit.ai_report?.label || "Disciplined",
            risk_integrity_score: selectedAudit.ai_report?.risk_score || "94",
            reflection_summary: selectedAudit.stage === 'Breached' ? selectedAudit.postMortemData?.reflectionSummary : selectedAudit.auditAnswers?.emotion,
            the_mirror: selectedAudit.ai_report?.mirror_analysis || "Your process is stabilizing...",
            adaptive_rule_prescribed: selectedAudit.ai_report?.new_rule || "Max 0.5% risk on Fridays"
          }}
          status={selectedAudit.stage === 'Breached' ? 'Breached' : 'Passed'}
          onClose={() => setSelectedAudit(null)}
        />
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .report-card:hover { transform: translateY(-5px); box-shadow: 0 12px 30px rgba(0,0,0,0.08); border-color: transparent !important; }
      `}</style>
    </div>
  );
}