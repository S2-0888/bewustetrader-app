import React from 'react';
import * as W from './DashboardWidgets';

export default function DesignLab() {
  // Dummy data voor de test
  const testAcc = {
    firm: "FTMO Elite",
    stage: "Phase 1",
    startBalance: 100000,
    profitTarget: 10000,
    maxDrawdown: 10000,
  };

  const dummyMoney = (val) => `$${val.toLocaleString()}`;
  const balanceWin = 104500; // Account in winst
  const balanceLoss = 98000; // Account in drawdown

  return (
    <div style={{ padding: '40px 20px', maxWidth: 800, margin: '0 auto', background: '#F5F5F7', minHeight: '100vh' }}>
      <h1 style={{ fontWeight: 900, marginBottom: 40 }}>Vault Design Lab</h1>

      <section style={{ marginBottom: 60 }}>
        <h3 style={{ fontSize: 12, color: '#8E8E93', marginBottom: 20 }}>V1: THE PREMIUM METAL CARD (STATUS FOCUS)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <W.AccountCard acc={testAcc} balance={balanceWin} progressPct={45} ddPct={0} money={dummyMoney} version="V1" />
          <W.AccountCard acc={{...testAcc, stage: 'Funded'}} balance={balanceWin} progressPct={0} ddPct={0} money={dummyMoney} isFunded={true} version="V1" />
        </div>
      </section>

      <section style={{ marginBottom: 60 }}>
        <h3 style={{ fontSize: 12, color: '#8E8E93', marginBottom: 20 }}>V2: THE LIVE PULSE (RISK FOCUS)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <W.AccountCard acc={testAcc} balance={balanceWin} progressPct={45} ddPct={0} money={dummyMoney} version="V2" />
          <W.AccountCard acc={testAcc} balance={balanceLoss} progressPct={0} ddPct={20} money={dummyMoney} version="V2" />
        </div>
      </section>

      <section style={{ marginBottom: 60 }}>
        <h3 style={{ fontSize: 12, color: '#8E8E93', marginBottom: 20 }}>V3: THE COMPACT TERMINAL (EFFICIENCY FOCUS)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <W.AccountCard acc={testAcc} balance={balanceWin} progressPct={45} ddPct={0} money={dummyMoney} version="V3" />
          <W.AccountCard acc={{...testAcc, firm: "Apex Pro"}} balance={balanceWin} progressPct={80} ddPct={0} money={dummyMoney} version="V3" />
        </div>
      </section>
      // Voeg dit toe in de return van DesignLab.jsx
<section style={{ marginBottom: 60 }}>
  <h3 style={{ fontSize: 12, color: '#8E8E93', marginBottom: 20 }}>FINANCIAL HARVEST CANDLE TEST</h3>
  <W.FinancialHarvestWidget 
    invested={1250} 
    money={dummyMoney} 
    payouts={[
      { date: '2025-10-01', convertedAmount: 2500 },
      { date: '2025-11-15', convertedAmount: 4800 },
      { date: '2025-12-20', convertedAmount: 3200 }
    ]} 
  />
</section>
    </div>
  );
}