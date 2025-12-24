import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ShieldCheck, Crown, User, Trash, CheckCircle, ArrowsClockwise } from '@phosphor-icons/react';

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "users"));
    const unsub = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const toggleAdmin = async (user) => {
    const userRef = doc(db, "users", user.id);
    await updateDoc(userRef, {
      role: user.role === 'admin' ? 'user' : 'admin'
    });
  };

  const toggleFounder = async (user) => {
    const userRef = doc(db, "users", user.id);
    await updateDoc(userRef, {
      isFounder: !user.isFounder
    });
  };

  const deleteUser = async (user) => {
    if (window.confirm(`Weet je zeker dat je ${user.email} wilt verwijderen?`)) {
      await deleteDoc(doc(db, "users", user.id));
    }
  };

  if (loading) return <div style={{ padding: 40, color: '#86868B' }}><ArrowsClockwise className="spinner" /> Loading Users...</div>;

  const totalUsers = users.length;
  const totalFounders = users.filter(u => u.isFounder).length;

  return (
    <div style={{ padding: '40px 20px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: '36px', fontWeight: 800, letterSpacing: '-1.5px', margin: 0 }}>Command Center</h1>
        <p style={{ color: '#86868B', marginTop: 4 }}>Manage the DBT Network and Founder status.</p>
      </div>

      {/* STATS OVERVIEW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 40 }}>
        <div className="bento-card">
          <div className="label-xs"><User weight="fill" /> TOTAL USERS</div>
          <div style={{ fontSize: 32, fontWeight: 800, marginTop: 10 }}>{totalUsers}</div>
        </div>
        <div className="bento-card">
          <div className="label-xs" style={{ color: '#AF52DE' }}><Crown weight="fill" /> FOUNDERS</div>
          <div style={{ fontSize: 32, fontWeight: 800, marginTop: 10, color: '#AF52DE' }}>{totalFounders} / 100</div>
        </div>
      </div>

      {/* USERS TABLE */}
      <div className="bento-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#F5F5F7', borderBottom: '1px solid #E5E5EA' }}>
              <th style={{ padding: '15px 20px', fontSize: 11, fontWeight: 800, color: '#86868B' }}>USER</th>
              <th style={{ padding: '15px 20px', fontSize: 11, fontWeight: 800, color: '#86868B' }}>ROLE</th>
              <th style={{ padding: '15px 20px', fontSize: 11, fontWeight: 800, color: '#86868B' }}>STATUS</th>
              <th style={{ padding: '15px 20px', fontSize: 11, fontWeight: 800, color: '#86868B', textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid #F5F5F7' }}>
                <td style={{ padding: '15px 20px' }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{u.displayName || 'Onbekend'}</div>
                  <div style={{ fontSize: 12, color: '#86868B' }}>{u.email}</div>
                </td>
                <td style={{ padding: '15px 20px' }}>
                  <button 
                    onClick={() => toggleAdmin(u)}
                    style={{ 
                      padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 800, border: 'none', cursor: 'pointer',
                      background: u.role === 'admin' ? '#1D1D1F' : '#E5E5EA',
                      color: u.role === 'admin' ? 'white' : '#1D1D1F'
                    }}
                  >
                    {u.role === 'admin' ? 'ADMIN' : 'USER'}
                  </button>
                </td>
                <td style={{ padding: '15px 20px' }}>
                  <button 
                    onClick={() => toggleFounder(u)}
                    style={{ 
                      padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 800, border: 'none', cursor: 'pointer',
                      background: u.isFounder ? 'linear-gradient(135deg, #AF52DE 0%, #5856D6 100%)' : 'transparent',
                      color: u.isFounder ? 'white' : '#86868B',
                      border: u.isFounder ? 'none' : '1px solid #E5E5EA'
                    }}
                  >
                    {u.isFounder ? 'FOUNDER' : 'STANDARD'}
                  </button>
                </td>
                <td style={{ padding: '15px 20px', textAlign: 'right' }}>
                  <button 
                    onClick={() => deleteUser(u)}
                    style={{ background: 'none', border: 'none', color: '#FF3B30', cursor: 'pointer', padding: 5 }}
                  >
                    <Trash size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}