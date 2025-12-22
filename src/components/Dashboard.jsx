import { useEffect, useState } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { TrendUp, TrendDown, Wallet } from '@phosphor-icons/react';

export default function Dashboard() {
  const [totalBalance, setTotalBalance] = useState(0);
  const [winRate, setWinRate] = useState(0);
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // 1. Haal Accounts op voor Totale Balans
    const qAccounts = query(collection(db, "users", user.uid, "accounts"));
    const unsubAccounts = onSnapshot(qAccounts, (snapshot) => {
      const total = snapshot.docs.reduce((sum, doc) => sum + doc.data().balance, 0);
      setTotalBalance(total);
    });

    // 2. Haal Trades op voor Winrate & Stats
    const qTrades = query(collection(db, "users", user.uid, "trades"));
    const unsubTrades = onSnapshot(qTrades, (snapshot) => {
      const tradeData = snapshot.docs.map(doc => doc.data());
      setTrades(tradeData);

      const closedTrades = tradeData.filter(t => t.status === 'CLOSED');
      if (closedTrades.length > 0) {
        const wins = closedTrades.filter(t => t.result > 0).length;
        setWinRate((wins / closedTrades.length) * 100);
      }
    });

    return () => { unsubAccounts(); unsubTrades(); };
  }, []);

  // --- PROGRESS BAR LOGICA ---
  // We maken dynamische levels. Bijv: 0-10k, 10k-25k, 25k-50k, 50k-100k
  // Simpele versie: Doel is altijd het volgende veelvoud van 10.000 of 25.000
  const nextMilestone = Math.ceil((totalBalance + 1) / 10000) * 10000; 
  // Als je bijv 12.000 hebt, is nextMilestone 20.000.
  
  const prevMilestone = nextMilestone - 10000;
  const progressPercent = Math.min(100, Math.max(0, ((totalBalance - prevMilestone) / (nextMilestone - prevMilestone)) * 100));

  return (
    <div className="dashboard-container">
      <h1>Command Wall</h1>
      
      {/* 1. ASSET PROGRESSIE BALK (NIEUW) */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: 'white', border: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 15 }}>
            <Wallet size={24} color="#f59e0b" weight="fill" />
            <span style={{ fontWeight: 600, fontSize: '1.1rem', color: '#cbd5e1' }}>Actieve Assets</span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 5 }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>€{totalBalance.toLocaleString()}</div>
            <div style={{ color: '#94a3b8', paddingBottom: 5 }}>Doel: €{nextMilestone.toLocaleString()}</div>
        </div>

        {/* De Balk */}
        <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{ 
                width: `${progressPercent}%`, 
                height: '100%', 
                background: 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)',
                transition: 'width 1s ease-out'
            }}></div>
        </div>
      </div>

      {/* 2. PIJLERS (STATS) */}
      <div className="grid-3">
        <div className="pillar-card">
          <div className="pillar-label">WIN RATE</div>
          <div className={`pillar-value ${winRate >= 50 ? 'val-good' : 'val-bad'}`}>
            {winRate.toFixed(1)}%
          </div>
          <div className="pillar-sub">Over {trades.filter(t => t.status === 'CLOSED').length} trades</div>
        </div>

        <div className="pillar-card">
          <div className="pillar-label">TOTAAL TRADES</div>
          <div className="pillar-value">{trades.length}</div>
          <div className="pillar-sub">{trades.filter(t => t.status === 'OPEN').length} Open</div>
        </div>
        
        <div className="pillar-card">
            <div className="pillar-label">DISCIPLINE SCORE</div>
            <div className="pillar-value">
                {trades.length > 0 
                  ? (trades.reduce((a,b) => a + (b.score || 0), 0) / trades.length).toFixed(0) 
                  : 100}%
            </div>
            <div className="pillar-sub">Gemiddelde score</div>
        </div>
      </div>
    </div>
  );
}