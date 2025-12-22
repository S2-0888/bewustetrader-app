import { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { Robot, TrendUp, Scales, ShieldCheck, Brain } from '@phosphor-icons/react';

export default function Dashboard() {
  const [trades, setTrades] = useState([]);
  const [accounts, setAccounts] = useState([]); // <--- NIEUW: Opslag voor accounts
  const [loading, setLoading] = useState(true);

  // 1. TRADES OPHALEN
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(collection(db, "users", user.uid, "trades"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data());
      setTrades(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. ACCOUNTS OPHALEN (NIEUW)
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(collection(db, "users", user.uid, "accounts"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        // We halen de data op voor de Actieve Assets
        setAccounts(snapshot.docs.map(doc => doc.data()));
    });

    return () => unsubscribe();
  }, []);

  // 3. STATISTIEKEN BEREKENEN
  const stats = useMemo(() => {
    let totalScore = 0;
    let closedCount = 0;
    let wins = 0;
    let grossWinR = 0;
    let grossLossR = 0;

    trades.forEach(t => {
        totalScore += (t.score || 0);
        if (t.status === 'CLOSED') {
            closedCount++;
            if (t.result > 0) {
                wins++;
                grossWinR += t.result;
            } else {
                grossLossR += Math.abs(t.result);
            }
        }
    });

    const avgScore = trades.length > 0 ? (totalScore / trades.length) : 100;
    const winrate = closedCount > 0 ? (wins / closedCount) : 0;
    const pf = grossLossR > 0 ? (grossWinR / grossLossR) : (grossWinR > 0 ? 100 : 0);
    
    const avgWin = wins > 0 ? grossWinR / wins : 0;
    const avgLoss = (closedCount - wins) > 0 ? grossLossR / (closedCount - wins) : 0;
    const expectancy = (winrate * avgWin) - ((1 - winrate) * avgLoss);

    return {
        score: avgScore.toFixed(0),
        pf: pf.toFixed(2),
        expectancy: expectancy.toFixed(2),
        count: trades.length,
        buffer: 100 
    };
  }, [trades]);

  // 4. CO-PILOT LOGICA
  const getBriefing = (s) => {
    if (loading) return { type: 'calm', text: "Data laden...", icon: <Robot size={32} /> };
    if (s.count === 0) return { type: 'calm', text: "Welkom! Log je eerste trade in het Trade Lab om te beginnen.", icon: <Robot size={32} /> };
    
    if (s.score < 80) return { type: 'alert', text: `🛑 <strong>DISCIPLINE ZAKT:</strong> Je score is ${s.score}%. Check je regels!`, icon: <Brain size={32} /> };
    if (Number(s.expectancy) > 0.5) return { type: 'calm', text: "🚀 <strong>EXCELLENT:</strong> Je bent winstgevend en gedisciplineerd.", icon: <TrendUp size={32} /> };
    
    return { type: 'calm', text: "Markt data geanalyseerd. Wachtend op meer closed trades.", icon: <Robot size={32} /> };
  };

  const briefing = getBriefing(stats);
  const headerClass = `copilot-header ${briefing.type === 'alert' ? 'copilot-alert' : 'copilot-calm'}`;

  return (
    <div className="dashboard-container">
        {/* HEADER */}
        <div className="filter-bar">
            <span style={{fontWeight:600, marginRight:5}}>Status:</span>
            <span className="badge badge-blue">Live Data</span>
        </div>

        <div className={headerClass}>
            <div className="copilot-icon">{briefing.icon}</div>
            <div className="copilot-text" dangerouslySetInnerHTML={{ __html: briefing.text }}></div>
        </div>

        {/* PIJLERS */}
        <div className="grid-4" style={{ marginBottom: '30px' }}>
            <div className="pillar-card">
                <div className="pillar-label"><TrendUp size={14} /> Expectancy</div>
                <div className={`pillar-value ${Number(stats.expectancy) > 0 ? 'val-good' : 'val-bad'}`}>
                    {Number(stats.expectancy) > 0 ? '+' : ''}{stats.expectancy}R
                </div>
                <div className="pillar-sub">Per trade</div>
            </div>

            <div className="pillar-card">
                <div className="pillar-label"><Scales size={14} /> Profit Factor</div>
                <div className="pillar-value">{stats.pf}</div>
                <div className="pillar-sub">Gross Win / Loss</div>
            </div>

            <div className="pillar-card">
                <div className="pillar-label"><ShieldCheck size={14} /> Veiligheid</div>
                <div className="pillar-value">{stats.buffer}%</div>
                <div className="dd-bar-bg"><div className="dd-bar-fill" style={{ width: `${stats.buffer}%`, background: 'var(--success)' }}></div></div>
                <div className="pillar-sub">Buffer over</div>
            </div>

            <div className="pillar-card">
                <div className="pillar-label"><Brain size={14} /> Discipline</div>
                <div className="pillar-value">{stats.score}%</div>
                <div className="dd-bar-bg">
                    <div className="dd-bar-fill" style={{ width: `${stats.score}%`, background: stats.score > 90 ? 'var(--primary)' : 'var(--danger)' }}></div>
                </div>
                <div className="pillar-sub">Score ({stats.count} trades)</div>
            </div>
        </div>

        {/* NIEUW: ACTIEVE ASSETS SECTIE */}
        <h2>Actieve Assets</h2>
        <div className="grid-2" style={{ marginBottom: '30px' }}>
            {accounts.length === 0 ? (
                <div style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
                    Nog geen accounts. Ga naar Portfolio om er een toe te voegen.
                </div>
            ) : (
                accounts.map((acc, i) => (
                    <div key={i} className="card" style={{ padding: 20 }}>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{acc.firm}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{acc.type} - {acc.phase}</div>
                        <div className="money-display" style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: 10 }}>
                            €{acc.balance.toLocaleString()}
                        </div>
                    </div>
                ))
            )}
        </div>

        {/* LAATSTE TRADES */}
        <h2>Laatste Trades</h2>
        {trades.length === 0 ? (
             <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', border: '1px dashed var(--border)', borderRadius: 12 }}>
                Nog geen data. Ga naar Trade Lab!
            </div>
        ) : (
            <div className="card" style={{padding:0}}>
                <table>
                    <thead><tr><th>Ticker</th><th>Result</th><th>Status</th></tr></thead>
                    <tbody>
                        {trades.slice(0,5).map((t, i) => (
                            <tr key={i}>
                                <td>{t.ticker}</td>
                                <td>{t.result}R</td>
                                <td>{t.status}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
    </div>
  );
}