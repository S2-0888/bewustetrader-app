import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Users, Hourglass, CheckCircle, Funnel, MagnifyingGlass, Robot } from '@phosphor-icons/react';
import TCTAnalysisCard from './TCTAnalysisCard';

export default function AdminDashboard() {
  const [traders, setTraders] = useState([]);
  const [selectedTrader, setSelectedTrader] = useState(null);
  const [filter, setFilter] = useState('all'); // all, pending, beta_tester

  // 1. LIVE DATA FEED
  useEffect(() => {
    const q = query(collection(db, "waitlist"), orderBy("appliedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTraders(data);
      if (!selectedTrader && data.length > 0) setSelectedTrader(data[0]);
    });
    return () => unsubscribe();
  }, []);

  // 2. STATUS UPDATER (De Approve knop)
  const updateStatus = async (id, newStatus) => {
    await updateDoc(doc(db, "waitlist", id), { status: newStatus });
  };

  return (
    <div style={adminContainer}>
      {/* SIDEBAR: DE INBOX */}
      <div style={sidebarStyle}>
        <div style={sidebarHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={24} weight="bold" />
            <h1 style={{ fontSize: 20, fontWeight: 900 }}>Waitlist</h1>
          </div>
          <div style={badgeCount}>{traders.length}</div>
        </div>

        <div style={searchBar}>
          <MagnifyingGlass size={18} color="#8E8E93" />
          <input placeholder="Zoek trader..." style={searchInput} />
        </div>

        <div style={traderList}>
          {traders.map(trader => (
            <div 
              key={trader.id} 
              onClick={() => setSelectedTrader(trader)}
              style={{
                ...traderRow,
                borderLeft: selectedTrader?.id === trader.id ? '4px solid #007AFF' : '4px solid transparent',
                background: selectedTrader?.id === trader.id ? '#F2F2F7' : 'transparent'
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14 }}>{trader.name}</div>
              <div style={{ fontSize: 11, color: '#8E8E93', marginTop: 4 }}>
                {trader.experience} • {trader.label.replace('_', ' ')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT: DE TCT ANALYSE CARD */}
      <div style={mainContent}>
        {selectedTrader ? (
          <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 20px' }}>
            <div style={topActions}>
               <button onClick={() => updateStatus(selectedTrader.id, 'approved')} style={approveBtn}>
                 <CheckCircle size={20} weight="fill" /> Approve as Founder
               </button>
               <button style={secondaryBtn}>Mark as Early Adopter</button>
            </div>
            
            <TCTAnalysisCard trader={selectedTrader} />
          </div>
        ) : (
          <div style={emptyState}>
            <Robot size={48} weight="thin" />
            <p>Selecteer een aanmelding voor TCT Analyse</p>
          </div>
        )}
      </div>
    </div>
  );
}

// STYLING
const adminContainer = { display: 'flex', width: '100vw', height: '100vh', background: '#F5F5F7', overflow: 'hidden' };
const sidebarStyle = { width: 350, background: 'white', borderRight: '1px solid #E5E5EA', display: 'flex', flexDirection: 'column' };
const sidebarHeader = { padding: '30px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const badgeCount = { background: '#1D1D1F', color: 'white', padding: '4px 10px', borderRadius: 10, fontSize: 12, fontWeight: 800 };
const searchBar = { margin: '0 25px 20px 25px', padding: '12px 15px', background: '#F2F2F7', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 };
const searchInput = { border: 'none', background: 'transparent', outline: 'none', fontSize: 14, width: '100%' };
const traderList = { flex: 1, overflowY: 'auto' };
const traderRow = { padding: '20px 25px', cursor: 'pointer', transition: '0.2s', borderBottom: '1px solid #F2F2F7' };
const mainContent = { flex: 1, overflowY: 'auto' };
const topActions = { display: 'flex', gap: 15, marginBottom: 30 };
const approveBtn = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '16px', background: '#30D158', color: 'white', border: 'none', borderRadius: 16, fontWeight: 800, cursor: 'pointer' };
const secondaryBtn = { flex: 1, padding: '16px', background: 'white', border: '1px solid #E5E5EA', borderRadius: 16, fontWeight: 700, cursor: 'pointer' };
const emptyState = { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#8E8E93', gap: 15 };