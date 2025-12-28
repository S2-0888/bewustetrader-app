import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, query, onSnapshot, doc, updateDoc, 
  deleteDoc, setDoc, orderBy, limit, addDoc, serverTimestamp 
} from 'firebase/firestore';
import { 
  ShieldCheck, Crown, Trash, Check, LinkSimple, 
  Megaphone, Clock, MagnifyingGlass, ArrowsClockwise,
  ChartBar, Sparkle, TrendUp, UsersThree, XCircle,
  ChartLineUp, Pulse, WarningCircle, Eye, 
  Brain, ListDashes, Shield, PlusCircle, DownloadSimple,
  GearSix, Lock, ToggleLeft, ToggleRight, Sliders
} from '@phosphor-icons/react';

export default function Admin() {
  const [activeTab, setActiveTab] = useState('mission'); // mission, intelligence, logs, settings
  const [users, setUsers] = useState([]);
  const [tctLogs, setTctLogs] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  // Platform Settings State
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    signupOpen: true,
    sniperThreshold: 75,
    machineThreshold: 90
  });

  // States voor communicatie & filters
  const [broadcast, setBroadcast] = useState('');
  const [duration, setDuration] = useState(24);
  const [activeBroadcast, setActiveBroadcast] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [logSearchTerm, setLogSearchTerm] = useState(''); 
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // 1. Listen for users
    const unsubUsers = onSnapshot(query(collection(db, "users")), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    // 2. Listen for active system broadcast
    const unsubBroadcast = onSnapshot(doc(db, "system", "broadcast"), (d) => {
      if (d.exists()) setActiveBroadcast(d.data());
      else setActiveBroadcast(null);
    });

    // 3. Listen for platform settings
    const unsubSettings = onSnapshot(doc(db, "system", "settings"), (d) => {
      if (d.exists()) setSettings(d.data());
    });

    // 4. Listen for TCT Insights logs
    const unsubLogs = onSnapshot(query(collection(db, "logs_tct"), orderBy("createdAt", "desc"), limit(100)), (snap) => {
        setTctLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubUsers(); unsubBroadcast(); unsubSettings(); unsubLogs(); };
  }, []);

  // --- ANALYTICS CALCULATIONS ---
  const now = new Date().getTime();
  const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
  
  const activeToday = users.filter(u => u.lastLogin && (now - u.lastLogin) < 86400000).length;
  const communityDiscipline = users.length > 0 ? Math.round(users.reduce((acc, u) => acc + (u.avgAdherence || 0), 0) / users.length) : 0;
  const activeThisMonth = users.filter(u => u.lastLogin && (now - u.lastLogin) < (86400000 * 30)).length;
  const stickiness = activeThisMonth > 0 ? Math.round((activeToday / activeThisMonth) * 100) : 0;
  const newTradersThisWeek = users.filter(u => u.createdAt && u.createdAt.toDate().getTime() > oneWeekAgo).length;
  const convertedUsers = users.filter(u => (u.avgAdherence || 0) > 0).length;
  const activationRate = users.length > 0 ? Math.round((convertedUsers / users.length) * 100) : 0;
  const churnRateEstimate = users.length > 0 ? Math.round((users.filter(u => u.lastLogin && (now - u.lastLogin) > (14 * 24 * 60 * 60 * 1000)).length / users.length) * 100) : 0;
  const totalFounders = users.filter(u => u.isFounder).length;
  const estimatedRevenue = totalFounders * 99;

  const vaultStats = users.reduce((acc, u) => {
    const style = u.vaultVersion || 'V1';
    acc[style] = (acc[style] || 0) + 1;
    return acc;
  }, {});

  // --- ACTIONS: SETTINGS ---
  const updateGlobalSetting = async (key, value) => {
    try {
      // Update lokale state direct voor snelheid (UI feedback)
      setSettings(prev => ({ ...prev, [key]: value }));
      
      const settingsRef = doc(db, "system", "settings");
      await setDoc(settingsRef, { [key]: value }, { merge: true });
      
      await addDoc(collection(db, "system_logs", "admin_actions"), {
        action: `Changed ${key} to ${value}`,
        admin: 'Admin',
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error("Error updating settings:", err);
      alert("Fout bij bijwerken instellingen. Check je Firebase Rules.");
    }
  };

  // --- CSV EXPORT ---
  const downloadCSV = (data, filename) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
  };

  const exportLogs = () => {
    const data = tctLogs.map(l => ({ Date: l.createdAt?.toDate().toLocaleString(), Trader: l.userName, Insight: l.insight }));
    downloadCSV(data, 'AI_Insights');
  };

  const exportTraders = () => {
    const data = users.map(u => ({ Name: u.displayName, Email: u.email, Adherence: u.avgAdherence, Founder: u.isFounder, LastActive: u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never' }));
    downloadCSV(data, 'Traders_Registry');
  };

  // --- HELPERS ---
  const formatLastActive = (timestamp) => {
    if (!timestamp) return { text: 'Never', color: '#8E8E93' };
    const diff = now - timestamp;
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return { text: 'Just now', color: '#30D158' };
    if (hours < 24) return { text: `${hours}h ago`, color: '#30D158' };
    const days = Math.floor(hours / 24);
    return { text: `${days}d ago`, color: days > 7 ? '#FF3B30' : '#1C1C1E' };
  };

  const getArchetype = (u) => {
    const adh = u.avgAdherence || 0;
    if (adh >= settings.machineThreshold) return { label: 'THE MACHINE', color: '#30D158', icon: <ArrowsClockwise size={12} weight="bold" /> };
    if (adh >= settings.sniperThreshold) return { label: 'THE SNIPER', color: '#007AFF', icon: <Eye size={12} weight="bold" /> };
    if (adh < 50 && adh > 0) return { label: 'THE GAMBLER', color: '#FF3B30', icon: <WarningCircle size={12} weight="bold" /> };
    return { label: 'NEWBIE', color: '#8E8E93', icon: <PlusCircle size={12} weight="bold" /> };
  };

  const sendBroadcast = async () => {
    if(!broadcast) return;
    const exp = new Date(); exp.setHours(exp.getHours() + Number(duration));
    await setDoc(doc(db, "system", "broadcast"), { message: broadcast, active: true, expiresAt: exp.getTime(), updatedAt: serverTimestamp() });
    setBroadcast('');
  };

  if (loading) return <div style={{ padding: 60, textAlign: 'center' }}><ArrowsClockwise size={32} className="spinner" color="#4285F4" /></div>;

  return (
    <div style={{ padding: '40px 20px', maxWidth: 1400, margin: '0 auto', background: '#F5F5F7', minHeight: '100vh', paddingBottom: 100 }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25 }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-1.5px', margin: 0, color: '#1D1D1F' }}>Command Center</h1>
          <p style={{ color: '#86868B', fontSize: '14px', fontWeight: 500 }}>The Conscious Trader Elite Oversight</p>
        </div>
        <button onClick={() => { navigator.clipboard.writeText(window.location.origin); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ padding: '10px 18px', borderRadius: 12, background: '#FFF', border: '1px solid #E5E5EA', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            {copied ? <Check color="#30D158" weight="bold" /> : <LinkSimple weight="bold" />} Invite Link
        </button>
      </div>

      {/* TABS NAVIGATION - FIXED center typo */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 30, background: 'rgba(0,0,0,0.03)', padding: 4, borderRadius: 14, width: 'fit-content' }}>
        {[
          { id: 'mission', label: 'Mission Control', icon: <ShieldCheck weight="fill" /> },
          { id: 'intelligence', label: 'Intelligence', icon: <Brain weight="fill" /> },
          { id: 'logs', label: 'System Logs', icon: <ListDashes weight="fill" /> },
          { id: 'settings', label: 'Platform Settings', icon: <GearSix weight="fill" /> }
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id)} 
            style={{ 
                display: 'flex', 
                alignItems: 'center', // FIXED: was center without quotes
                gap: 8, padding: '10px 20px', borderRadius: 11, border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer', background: activeTab === tab.id ? '#FFF' : 'transparent', color: activeTab === tab.id ? '#007AFF' : '#8E8E93', boxShadow: activeTab === tab.id ? '0 4px 12px rgba(0,0,0,0.05)' : 'none' 
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'mission' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 25 }}>
            <div className="bento-card" style={{ background: 'white' }}><span className="label-xs">GROWTH VELOCITY</span><div style={{ fontSize: 32, fontWeight: 900, marginTop: 10, color: '#007AFF' }}>+{newTradersThisWeek}</div><div style={{ fontSize: 12, color: '#86868B', marginTop: 5 }}>New traders (last 7d)</div></div>
            <div className="bento-card" style={{ background: 'white' }}><span className="label-xs">ACTIVATION RATE</span><div style={{ fontSize: 32, fontWeight: 900, marginTop: 10 }}>{activationRate}%</div><div style={{ fontSize: 12, color: '#86868B', marginTop: 5 }}>Users with trade logs</div></div>
            <div className="bento-card" style={{ background: '#FFF', border: '1px solid rgba(255, 59, 48, 0.1)' }}><span className="label-xs" style={{ color: '#FF3B30' }}>CHURN RISK</span><div style={{ fontSize: 32, fontWeight: 900, marginTop: 10, color: '#FF3B30' }}>{churnRateEstimate}%</div><div style={{ fontSize: 12, color: '#86868B', marginTop: 5 }}>Inactive for 14d+</div></div>
            <div className="bento-card" style={{ background: 'linear-gradient(135deg, #1C1C1E 0%, #0D0D0E 100%)', color: 'white' }}><span className="label-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>STICKINESS</span><div style={{ fontSize: 32, fontWeight: 900, marginTop: 10 }}>{stickiness}%</div><div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 5 }}>Daily vs Monthly active</div></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20, marginBottom: 30 }}>
             <div className="bento-card" style={{ background: 'white' }}>
                <div className="label-xs" style={{ marginBottom: 15 }}>FEATURE ADOPTION (VAULT STYLE)</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, height: 100 }}>
                   {['V1', 'V2', 'V3'].map(v => {
                      const count = vaultStats[v] || 0;
                      const height = users.length > 0 ? (count / users.length) * 100 : 0;
                      return (
                        <div key={v} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                           <div style={{ width: '100%', height: `${Math.max(height, 5)}%`, background: '#007AFF', borderRadius: '6px', opacity: 0.8 }} />
                           <span style={{ fontSize: 10, fontWeight: 800, marginTop: 8 }}>{v === 'V1' ? 'Premium' : v === 'V2' ? 'Analytic' : 'Nano'}</span>
                        </div>
                      )
                   })}
                </div>
             </div>
             <div className="bento-card" style={{ background: 'linear-gradient(135deg, #FFF 0%, #FDF8FF 100%)', border: '1px solid rgba(175, 82, 222, 0.1)' }}>
                <span className="label-xs" style={{ color: '#AF52DE' }}>COMMUNITY HEALTH</span>
                <div style={{ fontSize: 28, fontWeight: 900, marginTop: 10, color: communityDiscipline > 75 ? '#30D158' : '#FF9500' }}>{communityDiscipline}%</div>
                <div style={{ fontSize: 11, color: '#86868B', marginTop: 5 }}>Global Discipline Score Avg</div>
             </div>
          </div>
          <div className="bento-card" style={{ background: '#FFF', border: '1px solid #E5E5EA' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}><Megaphone size={20} weight="fill" /><span style={{ fontWeight: 900, fontSize: 14 }}>COMMUNITY BROADCAST</span></div>
              {activeBroadcast?.active && <button onClick={async () => await updateDoc(doc(db, "system", "broadcast"), { active: false })} style={{ background: 'rgba(255, 59, 48, 0.1)', color: '#FF3B30', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 10, fontWeight: 800 }}>STOP LIVE</button>}
            </div>
            {activeBroadcast?.active && (
              <div style={{ padding: 15, background: 'rgba(66, 133, 244, 0.05)', borderRadius: 16, border: '1px solid rgba(66, 133, 244, 0.1)', marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>"{activeBroadcast.message}"</div>
                <div style={{ fontSize: 10, color: '#8E8E93', marginTop: 10 }}><Clock size={12} /> Expires: {new Date(activeBroadcast.expiresAt).toLocaleString('nl-NL')}</div>
              </div>
            )}
            <textarea value={broadcast} onChange={(e) => setBroadcast(e.target.value)} placeholder="Type announcement message..." style={{ width: '100%', padding: 15, borderRadius: 16, border: '1px solid #E5E5EA', fontSize: 14, minHeight: 60, marginBottom: 12, fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <select value={duration} onChange={(e) => setDuration(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid #E5E5EA', background: '#F5F5F7', fontWeight: 700 }}>
                <option value={1}>1 Hour</option><option value={24}>24 Hours</option><option value={168}>1 Week</option>
              </select>
              <button onClick={sendBroadcast} style={{ flex: 2, background: '#007AFF', color: 'white', border: 'none', borderRadius: 12, fontWeight: 800, cursor: 'pointer' }}>PUSH LIVE</button>
            </div>
          </div>
        </>
      )}

      {activeTab === 'intelligence' && (
        <div className="bento-card" style={{ padding: 0, overflow: 'hidden', background: 'white' }}>
          <div style={{ padding: '20px 25px', borderBottom: '1px solid #F5F5F7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
              <span style={{ fontWeight: 900, fontSize: 14 }}>TRADER REGISTRY</span>
              <button onClick={exportTraders} style={{ background: '#F2F2F7', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}><DownloadSimple size={14} /> EXPORT CSV</button>
            </div>
            <div style={{ position: 'relative', width: 350 }}>
              <MagnifyingGlass size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8E8E93' }} />
              <input type="text" placeholder="Search traders..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: 14, border: '1px solid #E5E5EA', fontSize: 14 }} />
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#F9F9FB' }}>
              <tr style={{ textAlign: 'left', fontSize: 11, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 1 }}>
                <th style={{ padding: '15px 25px' }}>Trader</th><th>Archetype</th><th>Performance</th><th>Last Active</th><th style={{ textAlign: 'right', padding: '15px 25px' }}>Management</th>
              </tr>
            </thead>
            <tbody>
              {users.filter(u => u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())).map(u => {
                const arch = getArchetype(u);
                const lastActive = formatLastActive(u.lastLogin);
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid #F5F5F7' }}>
                    <td style={{ padding: '15px 25px' }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{u.displayName || 'Anonymous'}</div>
                      <div style={{ fontSize: 11, color: '#8E8E93' }}>{u.email}</div>
                      {u.status === 'paid' && <span style={{ fontSize: 8, background: '#E1F5FE', color: '#01579B', padding: '2px 5px', borderRadius: 4, fontWeight: 900, marginTop: 4, display: 'inline-block' }}>STRIPE PAID</span>}
                    </td>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 6, color: arch.color, fontSize: 10, fontWeight: 900 }}>{arch.icon} {arch.label}</div></td>
                    <td><div style={{ width: 40, height: 4, background: '#E5E5EA', borderRadius: 2 }}><div style={{ width: `${u.avgAdherence || 0}%`, height: '100%', background: arch.color, borderRadius: 2 }} /></div></td>
                    <td style={{ fontSize: 12, fontWeight: 600, color: lastActive.color }}>{lastActive.text}</td>
                    <td style={{ textAlign: 'right', padding: '15px 25px' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                          <button onClick={() => updateDoc(doc(db, "users", u.id), { isApproved: !u.isApproved })} style={{ border: 'none', background: u.isApproved ? 'rgba(48, 209, 88, 0.1)' : '#F2F2F7', color: u.isApproved ? '#30D158' : '#8E8E93', padding: '6px 12px', borderRadius: 8, fontSize: 10, fontWeight: 800 }}>{u.isApproved ? 'REVOKE' : 'APPROVE'}</button>
                          <button onClick={() => updateDoc(doc(db, "users", u.id), { isFounder: !u.isFounder })} style={{ border: 'none', background: u.isFounder ? 'rgba(175, 82, 222, 0.1)' : '#F2F2F7', color: u.isFounder ? '#AF52DE' : '#8E8E93', padding: '6px 12px', borderRadius: 8, fontSize: 10, fontWeight: 800 }}>{u.isFounder ? 'FOUNDER' : 'ASSIGN'}</button>
                          <button onClick={async () => { if(window.confirm('Delete trader?')) await deleteDoc(doc(db, "users", u.id)) }} style={{ background: 'none', border: 'none', color: '#FF3B30', opacity: 0.4, cursor: 'pointer' }}><Trash size={18} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bento-card" style={{ background: 'white', padding: 0, overflow: 'hidden' }}>
           <div style={{ padding: '20px 25px', borderBottom: '1px solid #F5F5F7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                <span style={{ fontWeight: 900, fontSize: 14 }}>AI INSIGHTS ARCHIVE</span>
                <button onClick={exportLogs} style={{ background: '#F2F2F7', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}><DownloadSimple size={14} /> EXPORT CSV</button>
              </div>
              <input type="text" placeholder="Filter insights..." value={logSearchTerm} onChange={(e) => setLogSearchTerm(e.target.value)} style={{ width: 300, padding: '10px 15px', borderRadius: 12, border: '1px solid #E5E5EA', fontSize: 13 }} />
           </div>
           <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '650px', overflowY: 'auto' }}>
              {tctLogs.filter(l => l.userName?.toLowerCase().includes(logSearchTerm.toLowerCase()) || l.insight?.toLowerCase().includes(logSearchTerm.toLowerCase())).map(log => (
                <div key={log.id} style={{ padding: '18px 25px', borderBottom: '1px solid #F5F5F7' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#8E8E93', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ background: 'rgba(66, 133, 244, 0.08)', color: '#4285F4', padding: '2px 6px', borderRadius: 4 }}>{log.userName?.toUpperCase() || 'TRADER'}</span>
                    <span>{log.createdAt ? new Date(log.createdAt.toDate()).toLocaleString('nl-NL') : 'Recent'}</span>
                  </div>
                  <div style={{ fontSize: 13, fontStyle: 'italic', color: '#1C1C1E', lineHeight: 1.6, borderLeft: '3px solid #E5E5EA', paddingLeft: 12 }}>"{log.insight}"</div>
                </div>
              ))}
           </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="bento-card" style={{ background: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 25 }}>
              <Shield size={22} weight="fill" color="#007AFF" />
              <span style={{ fontWeight: 900, fontSize: 15 }}>PLATFORM CONTROL</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><div style={{ fontWeight: 800, fontSize: 14 }}>Maintenance Mode</div><div style={{ fontSize: 12, color: '#8E8E93' }}>Lock platform for all non-admins.</div></div>
                <button onClick={() => updateGlobalSetting('maintenanceMode', !settings.maintenanceMode)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: settings.maintenanceMode ? '#FF3B30' : '#E5E5EA' }}>
                  {settings.maintenanceMode ? <ToggleRight size={44} weight="fill" /> : <ToggleLeft size={44} weight="fill" />}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F5F5F7', paddingTop: 20 }}>
                <div><div style={{ fontWeight: 800, fontSize: 14 }}>New Registrations</div><div style={{ fontSize: 12, color: '#86868B' }}>Enable or disable signups.</div></div>
                <button onClick={() => updateGlobalSetting('signupOpen', !settings.signupOpen)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: settings.signupOpen ? '#30D158' : '#E5E5EA' }}>
                  {settings.signupOpen ? <ToggleRight size={44} weight="fill" /> : <ToggleLeft size={44} weight="fill" />}
                </button>
              </div>
            </div>
          </div>
          <div className="bento-card" style={{ background: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 25 }}>
              <Sliders size={22} weight="fill" color="#AF52DE" />
              <span style={{ fontWeight: 900, fontSize: 15 }}>ALGO THRESHOLDS</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Sniper Level (%)</span>
                  <span style={{ fontSize: 13, fontWeight: 900, color: '#007AFF' }}>{settings.sniperThreshold}%</span>
                </div>
                <input type="range" min="50" max="85" value={settings.sniperThreshold} onChange={(e) => updateGlobalSetting('sniperThreshold', Number(e.target.value))} style={{ width: '100%', accentColor: '#007AFF' }} />
              </div>
              <div style={{ borderTop: '1px solid #F5F5F7', paddingTop: 20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Machine Level (%)</span>
                  <span style={{ fontSize: 13, fontWeight: 900, color: '#30D158' }}>{settings.machineThreshold}%</span>
                </div>
                <input type="range" min="86" max="100" value={settings.machineThreshold} onChange={(e) => updateGlobalSetting('machineThreshold', Number(e.target.value))} style={{ width: '100%', accentColor: '#30D158' }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}