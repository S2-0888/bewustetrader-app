import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, setDoc, orderBy, limit } from 'firebase/firestore';
import { 
  ShieldCheck, Crown, Trash, Check, LinkSimple, 
  Megaphone, Clock, MagnifyingGlass, ArrowsClockwise,
  ChartBar, Sparkle, TrendUp, UsersThree 
} from '@phosphor-icons/react';

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [tctLogs, setTctLogs] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [broadcast, setBroadcast] = useState('');
  const [activeBroadcast, setActiveBroadcast] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // 1. Listen for users
    const q = query(collection(db, "users"));
    const unsub = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    // 2. Listen for active system broadcast
    const bUnsub = onSnapshot(doc(db, "system", "broadcast"), (d) => {
      if (d.exists()) setActiveBroadcast(d.data().message);
    });

    // 3. Listen voor TCT Insights logs
    const lQuery = query(collection(db, "logs_tct"), orderBy("createdAt", "desc"), limit(5));
    const lUnsub = onSnapshot(lQuery, (snap) => {
        setTctLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsub(); bUnsub(); lUnsub(); };
  }, []);

  // --- ACTIONS ---
  const updateBroadcast = async () => {
    if(!broadcast) return;
    await setDoc(doc(db, "system", "broadcast"), { message: broadcast, updatedAt: new Date() });
    setBroadcast('');
  };

  const toggleFounder = async (user) => {
    await updateDoc(doc(db, "users", user.id), { isFounder: !user.isFounder });
  };

  const toggleApproval = async (user) => {
    await updateDoc(doc(db, "users", user.id), { isApproved: !user.isApproved });
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(window.location.origin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const deleteUser = async (user) => {
    if (window.confirm(`Are you sure you want to delete ${user.email}?`)) {
      await deleteDoc(doc(db, "users", user.id));
    }
  };

  // --- ANALYTICS & SEARCH LOGICA ---
  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalFounders = users.filter(u => u.isFounder).length;
  const avgCommunityAdherence = users.length > 0 
    ? Math.round(users.reduce((acc, u) => acc + (u.avgAdherence || 0), 0) / users.length) 
    : 0;
  const estimatedRevenue = totalFounders * 99;

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><ArrowsClockwise size={32} className="spinner" /></div>;

  return (
    <div style={{ padding: '40px 20px', maxWidth: 1200, margin: '0 auto', background: '#F5F5F7', minHeight: '100vh', paddingBottom: 100 }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-1.5px', margin: 0 }}>Command Center</h1>
          <p style={{ color: '#86868B', fontWeight: 500 }}>The Conscious Trader Platform Oversight</p>
        </div>
        <button onClick={copyInviteLink} style={{ padding: '12px 20px', borderRadius: 14, background: 'white', border: '1px solid #E5E5EA', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            {copied ? <Check color="#30D158" /> : <LinkSimple />} Invite Link
        </button>
      </div>

      {/* GOD MODE METRICS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20, marginBottom: 30 }}>
        <div className="bento-card" style={{ background: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="label-xs">FOUNDERS HARVEST</span>
            <TrendUp size={20} color="#30D158" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, marginTop: 10 }}>€{estimatedRevenue.toLocaleString()}</div>
          <div style={{ fontSize: 12, color: '#86868B', marginTop: 5 }}>{totalFounders} of 100 slots filled</div>
        </div>

        <div className="bento-card" style={{ background: 'white' }}>
          <span className="label-xs">COMMUNITY ADHERENCE</span>
          <div style={{ fontSize: 28, fontWeight: 900, marginTop: 10, color: avgCommunityAdherence > 70 ? '#30D158' : '#FF9500' }}>
            {avgCommunityAdherence}%
          </div>
          <div style={{ fontSize: 12, color: '#86868B', marginTop: 5 }}>Avg. Discipline across platform</div>
        </div>

        <div className="bento-card" style={{ background: '#1D1D1F', color: 'white' }}>
          <span className="label-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>ACTIVE USERS</span>
          <div style={{ fontSize: 28, fontWeight: 900, marginTop: 10 }}>{users.length}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 5 }}>Total registered traders</div>
        </div>
      </div>

      {/* TCT INSIGHT MONITOR */}
      <div className="bento-card" style={{ marginBottom: 30, border: '1px solid rgba(10, 132, 255, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Sparkle size={20} weight="fill" color="#0A84FF" />
            <span style={{ fontWeight: 800, fontSize: 13, letterSpacing: 0.5 }}>LATEST TCT INSIGHTS</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            {tctLogs.length > 0 ? tctLogs.map(log => (
                <div key={log.id} style={{ paddingBottom: 12, borderBottom: '1px solid #F5F5F7' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#86868B', marginBottom: 4 }}>
                        {log.userName?.toUpperCase() || 'TRADER'} • {log.createdAt ? new Date(log.createdAt.toDate()).toLocaleTimeString() : 'Just now'}
                    </div>
                    <div style={{ fontSize: 13, fontStyle: 'italic', color: '#1D1D1F' }}>"{log.insight}"</div>
                </div>
            )) : <p style={{ fontSize: 13, color: '#86868B' }}>Waiting for incoming trade logs...</p>}
        </div>
      </div>

      {/* BROADCAST & SEARCH */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20, marginBottom: 30 }}>
         <div className="bento-card">
            <div className="label-xs"><Megaphone weight="fill" /> ANNOUNCE TO COMMUNITY</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
                <input 
                    value={broadcast} 
                    onChange={(e) => setBroadcast(e.target.value)}
                    placeholder={activeBroadcast || "Ex: High volatility expected today..."}
                    style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid #E5E5EA', fontSize: 14 }}
                />
                <button onClick={updateBroadcast} style={{ background: '#007AFF', color: 'white', border: 'none', padding: '0 25px', borderRadius: 12, fontWeight: 700 }}>Push</button>
            </div>
         </div>
         <div className="bento-card" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <div style={{ position: 'relative', width: '100%' }}>
                <MagnifyingGlass size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#86868B' }} />
                <input 
                    type="text" 
                    placeholder="Search traders..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: 12, border: '1px solid #E5E5EA', fontSize: 14 }}
                />
            </div>
         </div>
      </div>

      {/* USER TABLE */}
      <div className="bento-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#F5F5F7' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: '15px 20px', fontSize: 11, color: '#86868B' }}>TRADER</th>
              <th style={{ textAlign: 'left', padding: '15px 20px', fontSize: 11, color: '#86868B' }}>ADHERENCE</th>
              <th style={{ textAlign: 'left', padding: '15px 20px', fontSize: 11, color: '#86868B' }}>ACCESS & STATUS</th>
              <th style={{ textAlign: 'right', padding: '15px 20px', fontSize: 11, color: '#86868B' }}>MANAGE</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #F5F5F7' }}>
                <td style={{ padding: '15px 20px' }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{u.displayName || u.email?.split('@')[0]}</div>
                  <div style={{ fontSize: 11, color: '#86868B' }}>{u.email}</div>
                  {/* NIEUW: Stripe Status Badge */}
                  {u.status === 'paid' && (
                    <span style={{ fontSize: '9px', background: '#E1F5FE', color: '#01579B', padding: '2px 6px', borderRadius: 4, fontWeight: 800, marginTop: 4, display: 'inline-block' }}>
                      STRIPE PAID
                    </span>
                  )}
                </td>
                <td style={{ padding: '15px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 40, height: 4, background: '#E5E5EA', borderRadius: 2 }}>
                            <div style={{ width: `${u.avgAdherence || 0}%`, height: '100%', background: (u.avgAdherence || 0) > 70 ? '#30D158' : '#FF9500', borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{u.avgAdherence || 0}%</span>
                    </div>
                </td>
                <td style={{ padding: '15px 20px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {/* NIEUW: Approve Knop */}
                        <button 
                            onClick={() => toggleApproval(u)}
                            style={{ border: 'none', background: u.isApproved ? '#30D158' : '#F2F2F7', color: u.isApproved ? 'white' : '#86868B', padding: '6px 12px', borderRadius: 8, fontSize: 10, fontWeight: 800, cursor: 'pointer' }}
                        >
                            {u.isApproved ? 'APPROVED' : 'APPROVE'}
                        </button>
                        <button 
                            onClick={() => toggleFounder(u)}
                            style={{ border: 'none', background: u.isFounder ? '#AF52DE' : '#F2F2F7', color: u.isFounder ? 'white' : '#86868B', padding: '6px 12px', borderRadius: 8, fontSize: 10, fontWeight: 800, cursor: 'pointer' }}
                        >
                            {u.isFounder ? 'FOUNDER' : 'ASSIGN'}
                        </button>
                    </div>
                </td>
                <td style={{ padding: '15px 20px', textAlign: 'right' }}>
                  <button onClick={() => deleteUser(u)} style={{ background: 'none', border: 'none', color: '#FF3B30', cursor: 'pointer', opacity: 0.5 }}>
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