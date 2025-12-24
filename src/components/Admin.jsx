import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { 
  ShieldCheck, Crown, Trash, Check, LinkSimple, 
  Megaphone, Clock, MagnifyingGlass, ArrowsClockwise 
} from '@phosphor-icons/react';

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [broadcast, setBroadcast] = useState('');
  const [activeBroadcast, setActiveBroadcast] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Listen for users updates
    const q = query(collection(db, "users"));
    const unsub = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    // Listen for active system broadcast
    const bUnsub = onSnapshot(doc(db, "system", "broadcast"), (d) => {
      if (d.exists()) setActiveBroadcast(d.data().message);
    });

    return () => { unsub(); bUnsub(); };
  }, []);

  const updateBroadcast = async () => {
    try {
      await setDoc(doc(db, "system", "broadcast"), { 
        message: broadcast, 
        updatedAt: new Date() 
      });
      setBroadcast('');
      alert("System broadcast updated successfully!");
    } catch (error) {
      console.error("Error updating broadcast:", error);
    }
  };

  const toggleApproval = async (user) => {
    await updateDoc(doc(db, "users", user.id), { isApproved: !user.isApproved });
  };

  const toggleAdmin = async (user) => {
    await updateDoc(doc(db, "users", user.id), { role: user.role === 'admin' ? 'user' : 'admin' });
  };

  const toggleFounder = async (user) => {
    await updateDoc(doc(db, "users", user.id), { isFounder: !user.isFounder });
  };

  const deleteUser = async (user) => {
    if (window.confirm(`Are you sure you want to delete ${user.email}?`)) {
      await deleteDoc(doc(db, "users", user.id));
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(window.location.origin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatLastLogin = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#86868B' }}>
      <ArrowsClockwise size={32} className="spinner" />
      <p>Initializing Command Center...</p>
    </div>
  );

  const totalFounders = users.filter(u => u.isFounder).length;

  return (
    <div style={{ padding: '40px 20px', maxWidth: 1100, margin: '0 auto', paddingBottom: 100 }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40, flexWrap: 'wrap', gap: 20 }}>
        <div>
          <h1 style={{ fontSize: '36px', fontWeight: 800, letterSpacing: '-1.5px', margin: 0 }}>Command Center</h1>
          <p style={{ color: '#86868B', marginTop: 4 }}>Network administration and user verification.</p>
        </div>
        <button 
          onClick={copyInviteLink}
          style={{ 
            display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 12, 
            background: '#1D1D1F', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer'
          }}
        >
          {copied ? <Check weight="bold" /> : <LinkSimple weight="bold" />}
          {copied ? 'Copied!' : 'Copy Invite Link'}
        </button>
      </div>

      {/* BROADCAST CARD */}
      <div className="bento-card" style={{ marginBottom: 30, background: 'rgba(0,122,255,0.05)', border: '1px solid rgba(0,122,255,0.1)' }}>
        <div className="label-xs" style={{ color: '#007AFF' }}><Megaphone weight="fill" /> SYSTEM BROADCAST</div>
        <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
          <input 
            value={broadcast} 
            onChange={(e) => setBroadcast(e.target.value)}
            placeholder={activeBroadcast || "Message for all traders..."}
            style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid #E5E5EA', outline: 'none' }}
          />
          <button 
            onClick={updateBroadcast} 
            style={{ background: '#007AFF', color: 'white', border: 'none', padding: '0 25px', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}
          >
            Push
          </button>
        </div>
      </div>

      {/* STATS & SEARCH */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 30 }}>
        <div className="bento-card">
          <div className="label-xs">TOTAL TRADERS</div>
          <div style={{ fontSize: 32, fontWeight: 800, marginTop: 10 }}>{users.length}</div>
        </div>
        <div className="bento-card">
          <div className="label-xs" style={{ color: '#AF52DE' }}>FOUNDER SLOTS</div>
          <div style={{ fontSize: 32, fontWeight: 800, marginTop: 10, color: '#AF52DE' }}>
            {totalFounders}<span style={{ fontSize: 16, color: '#86868B', fontWeight: 400 }}> / 100</span>
          </div>
        </div>
        <div className="bento-card" style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '100%' }}>
                <MagnifyingGlass size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#86868B' }} />
                <input 
                    type="text" 
                    placeholder="Search traders..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ 
                        width: '100%', padding: '12px 12px 12px 40px', borderRadius: 10, border: '1px solid #E5E5EA',
                        fontSize: 14, outline: 'none', fontFamily: 'inherit'
                    }}
                />
            </div>
        </div>
      </div>

      {/* USERS TABLE */}
      <div className="bento-card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 900 }}>
          <thead>
            <tr style={{ background: '#F5F5F7', borderBottom: '1px solid #E5E5EA' }}>
              <th style={{ padding: '15px 20px', fontSize: 11, fontWeight: 800, color: '#86868B' }}>TRADER</th>
              <th style={{ padding: '15px 20px', fontSize: 11, fontWeight: 800, color: '#86868B' }}>ACCESS</th>
              <th style={{ padding: '15px 20px', fontSize: 11, fontWeight: 800, color: '#86868B' }}>ROLE</th>
              <th style={{ padding: '15px 20px', fontSize: 11, fontWeight: 800, color: '#86868B' }}>FOUNDER</th>
              <th style={{ padding: '15px 20px', fontSize: 11, fontWeight: 800, color: '#86868B' }}>LAST SEEN</th>
              <th style={{ padding: '15px 20px', fontSize: 11, fontWeight: 800, color: '#86868B', textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid #F5F5F7' }}>
                <td style={{ padding: '15px 20px' }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{u.displayName || u.email?.split('@')[0]}</div>
                  <div style={{ fontSize: 12, color: '#86868B' }}>{u.email}</div>
                </td>
                <td style={{ padding: '15px 20px' }}>
                  <button 
                    onClick={() => toggleApproval(u)}
                    style={{ 
                      padding: '6px 12px', borderRadius: 8, fontSize: 10, fontWeight: 800, border: 'none', cursor: 'pointer',
                      background: u.isApproved ? '#30D158' : '#FF9500', color: 'white'
                    }}
                  >
                    {u.isApproved ? 'APPROVED' : 'PENDING'}
                  </button>
                </td>
                <td style={{ padding: '15px 20px' }}>
                  <button 
                    onClick={() => toggleAdmin(u)}
                    style={{ 
                      padding: '6px 12px', borderRadius: 8, fontSize: 10, fontWeight: 800, border: 'none', cursor: 'pointer',
                      background: u.role === 'admin' ? '#1D1D1F' : '#F2F2F7',
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
                      display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: 'pointer',
                      background: u.isFounder ? 'linear-gradient(135deg, #AF52DE 0%, #5856D6 100%)' : 'white',
                      color: u.isFounder ? 'white' : '#86868B',
                      border: u.isFounder ? 'none' : '1px solid #E5E5EA'
                    }}
                  >
                    <Crown weight={u.isFounder ? "fill" : "bold"} size={14} />
                    {u.isFounder ? 'FOUNDER' : 'ASSIGN'}
                  </button>
                </td>
                <td style={{ padding: '15px 20px', fontSize: 12, color: '#1D1D1F' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Clock size={14} color="#86868B" />
                      {formatLastLogin(u.lastLogin)}
                    </div>
                </td>
                <td style={{ padding: '15px 20px', textAlign: 'right' }}>
                  <button onClick={() => deleteUser(u)} style={{ background: 'none', border: 'none', color: '#FF3B30', cursor: 'pointer', opacity: 0.4 }}>
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