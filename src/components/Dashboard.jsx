import { useEffect, useState } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { TrendUp, Wallet, Trophy } from '@phosphor-icons/react';

export default function Dashboard() {
  const [accounts, setAccounts] = useState([]); // Nu slaan we de losse accounts op
  const [winRate, setWinRate] = useState(0);
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // 1. Haal Accounts op (Gesorteerd op saldo, hoogste eerst)
    const qAccounts = query(collection(db, "users", user.uid, "accounts"), orderBy("balance", "desc"));
    const unsubAccounts = onSnapshot(qAccounts, (snapshot) => {
      setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 2. Haal Trades op voor algemene stats
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

  // Hulpfunctie om progressie per account te berekenen
  const getProgress = (balance) => {
      // Doel is altijd het volgende veelvoud van 10.000 (bijv. 12k -> doel 20k)
      // Je kunt dit later aanpassen naar vaste targets als je wilt
      const target = Math.ceil((balance + 1) / 10000) * 10000;
      const start = target - 10000;
      const percent = Math.min(100, Math.max(0, ((balance - start) / (target - start)) * 100));
      return { target, percent };
  };

  return (
    <div className="dashboard-container">
      <h1>Command Wall</h1>
      
      {/* 1. CHALLENGE OVERZICHT (Per Account een balk) */}
      <h3 style={{marginTop: 10, marginBottom: 15, color: 'var(--text-muted)'}}>Jouw Active Challenges</h3>
      
      <div className="grid-2"> 
        {accounts.length === 0 && <div className="card">Nog geen accounts. Maak er eentje aan in Portfolio!</div>}
        
        {accounts.map(acc => {
            const { target, percent } = getProgress(acc.balance);
            
            return (
                <div key={acc.id} className="card" style={{ background: 'white', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
                    {/* Header van de card */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ background: '#eff6ff', padding: 8, borderRadius: '50%', color: 'var(--primary)' }}>
                                <Trophy size={20} weight="fill" />
                            </div>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '1rem' }}>{acc.firm}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>#{acc.accountNumber || '001'}</div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>€{acc.balance.toLocaleString()}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target: €{target.toLocaleString()}</div>
                        </div>
                    </div>

                    {/* De Progressie Balk */}
                    <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ 
                            width: `${percent}%`, 
                            height: '100%', 
                            background: percent >= 100 ? 'var(--success)' : 'var(--primary)', // Groen als doel bereikt is
                            transition: 'width 1s ease-out'
                        }}></div>
                    </div>
                    <div style={{ marginTop: 5, fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                        {percent.toFixed(1)}% tot volgende level
                    </div>
                </div>
            )
        })}
      </div>

      {/* 2. ALGEMENE STATS (PIJLERS) */}
      <div className="grid-3" style={{ marginTop: 20 }}>
        <div className="pillar-card">
          <div className="pillar-label">WIN RATE</div>
          <div className={`pillar-value ${winRate >= 50 ? 'val-good' : 'val-bad'}`}>
            {winRate.toFixed(1)}%
          </div>
          <div className="pillar-sub">Global Winrate</div>
        </div>

        <div className="pillar-card">
            <div className="pillar-label">DISCIPLINE</div>
            <div className="pillar-value">
                {trades.length > 0 
                  ? (trades.reduce((a,b) => a + (b.score || 0), 0) / trades.length).toFixed(0) 
                  : 100}%
            </div>
            <div className="pillar-sub">Gemiddelde score</div>
        </div>

        <div className="pillar-card">
          <div className="pillar-label">TOTAAL TRADES</div>
          <div className="pillar-value">{trades.length}</div>
          <div className="pillar-sub">Database entries</div>
        </div>
      </div>
    </div>
  );
}