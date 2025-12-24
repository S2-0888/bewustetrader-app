import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore';
import { Users, Crown, ShieldCheck, LockKey, SealCheck, TrendUp } from '@phosphor-icons/react';

export default function Admin() {
  const [allUsers, setAllUsers] = useState([]);
  const [stats, setStats] = useState({ total: 0, founders: 0 });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);

    // Haal alle gebruikers op (Let op: hiervoor moet je Firestore regels admin-only zijn)
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const usersData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllUsers(usersData);
      
      const founders = usersData.filter(u => u.isFounder === true).length;
      setStats({ total: usersData.length, founders });
    });

    return () => {
      unsub();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const toggleFounder = async (userId, currentStatus) => {
    if (stats.founders >= 100 && !currentStatus) {
      alert("Founder Cap van 100 bereikt!");
      return;
    }
    await updateDoc(doc(db, "users", userId), {
      isFounder: !currentStatus
    });
  };

  return (
    <div style={{ padding: isMobile ? '20px 15px' : '40px 20px', maxWidth: 1200, margin: '0 auto', paddingBottom: 100 }}>
      
      {/* HEADER */}
      <div style={{ marginBottom: 30 }}>
        <h1 style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 800, margin: 0, letterSpacing: '-1px' }}>Command Center</h1>
        <p style={{ color: '#86868B' }}>Beheer de exclusieve Founder 100 groep.</p>
      </div>

      {/* ADMIN STATS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 20, marginBottom: 30 }}>
        <div className="bento-card" style={{ borderTop: '4px solid #AF52DE' }}>
          <div className="label-xs" style={{ color: '#AF52DE' }}>FOUNDER 100 STATUS</div>
          <div className="number-huge">{stats.founders} <span style={{ fontSize: 18, color: '#86868B' }}>/ 100</span></div>
          <div style={{ width: '100%', height: 8, background: '#F2F2F7', borderRadius: 4, marginTop: 15, overflow: 'hidden' }}>
            <div style={{ width: `${(stats.founders / 100) * 100}%`, height: '100%', background: '#AF52DE' }}></div>
          </div>
        </div>

        <div className="bento-card">
          <div className="label-xs">TOTAAL GEBRUIKERS</div>
          <div className="number-huge">{stats.total}</div>
          <div style={{ fontSize: 12, color: '#86868B', marginTop: 10 }}>Geregistreerde accounts</div>
        </div>

        <div className="bento-card" style={{ background: stats.founders >= 100 ? '#FF3B30' : '#30D158', color: 'white', border: 'none' }}>
          <div className="label-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>PLATFORM STATUS</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 10 }}>
            {stats.founders >= 100 ? 'Wachtlijst Actief' : 'Open voor Founders'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, fontSize: 12 }}>
            <ShieldCheck size={18} weight="fill" /> Systeem beveiligd
          </div>
        </div>
      </div>

      {/* USER TABLE */}
      <div className="bento-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Gebruikerslijst</div>
          <div style={{ fontSize: 12, color: '#86868B' }}>{allUsers.length} Users</div>
        </div>
        
        <div className="table-container">
          <table className="apple-table">
            <thead>
              <tr>
                <th>Gebruiker</th>
                <th>E-mail</th>
                <th>Founder Status</th>
                <th style={{ textAlign: 'right' }}>Acties</th>
              </tr>
            </thead>
            <tbody>
              {allUsers.map(user => (
                <tr key={user.id}>
                  <td style={{ fontWeight: 700 }}>{user.displayName || 'Anoniem'}</td>
                  <td style={{ color: '#86868B' }}>{user.email}</td>
                  <td>
                    {user.isFounder ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#AF52DE', fontWeight: 700, fontSize: 12, background: 'rgba(175, 82, 222, 0.1)', padding: '4px 10px', borderRadius: 20 }}>
                        <Crown size={14} weight="fill" /> FOUNDER
                      </span>
                    ) : (
                      <span style={{ color: '#86868B', fontSize: 12 }}>Regular User</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      onClick={() => toggleFounder(user.id, user.isFounder)}
                      className="btn-primary" 
                      style={{ 
                        background: user.isFounder ? '#F2F2F7' : '#1D1D1F', 
                        color: user.isFounder ? '#1D1D1F' : 'white',
                        padding: '8px 16px',
                        fontSize: 11
                      }}
                    >
                      {user.isFounder ? 'Degradeer' : 'Maak Founder'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}