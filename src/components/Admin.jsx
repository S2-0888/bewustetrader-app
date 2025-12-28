import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, query, onSnapshot, doc, updateDoc, 
  deleteDoc, setDoc, orderBy, limit, addDoc, serverTimestamp, where 
} from 'firebase/firestore';
// TOEGEVOEGD: Imports voor Cloud Functions
import { getFunctions, httpsCallable } from 'firebase/functions';
import { 
  ShieldCheck, Crown, Trash, Check, LinkSimple, 
  Megaphone, Clock, MagnifyingGlass, ArrowsClockwise,
  ChartBar, Sparkle, TrendUp, UsersThree, XCircle,
  ChartLineUp, Pulse, WarningCircle, Eye, 
  Brain, ListDashes, Shield, PlusCircle, DownloadSimple,
  GearSix, Lock, ToggleLeft, ToggleRight, Sliders,
  EnvelopeSimple, Bug, Lightbulb, ChatTeardropText, PaperPlaneTilt,
  Funnel, Robot, CaretRight, CheckCircle, LockSimple // TOEGEVOEGD: LockSimple voor gesloten tickets
} from '@phosphor-icons/react';

export default function Admin() {
  const [activeTab, setActiveTab] = useState('mission'); // mission, intelligence, logs, settings, inbox
  const [users, setUsers] = useState([]);
  const [tctLogs, setTctLogs] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  // Feedback State
  const [feedbackItems, setFeedbackItems] = useState([]);
  const [replyText, setReplyText] = useState({});
  const [activeReplyId, setActiveReplyId] = useState(null);

  // NIEUWE INBOX FILTERS & SEARCH
  const [inboxSearch, setInboxSearch] = useState('');
  const [inboxFilter, setInboxFilter] = useState('all'); // all, unread, read
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null); // Voor 2-koloms selectie

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

    // 5. Listen for Beta Feedback (Gesorteerd op laatst geupdate voor loops)
    const unsubFeedback = onSnapshot(query(collection(db, "beta_feedback"), orderBy("updatedAt", "desc")), (snap) => {
      setFeedbackItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubUsers(); unsubBroadcast(); unsubSettings(); unsubLogs(); unsubFeedback(); };
  }, []);

  // --- ACTIONS: FEEDBACK (TICKETS) ---
  const sendReply = async (id, originalMessage, userEmail) => {
    const text = replyText[id];
    if (!text) return;
    if (confirm("Antwoord versturen naar gebruiker?")) {
        // Update de feedback status naar 'replied' en ververs de updatedAt voor de loop
        await updateDoc(doc(db, "beta_feedback", id), { 
            reply: text,
            replyAt: serverTimestamp(),
            updatedAt: serverTimestamp(), // Belangrijk voor threading
            status: 'replied',
            isRead: false
        });

        // LOG VOOR AI TRAINING
        await addDoc(collection(db, "ai_training_logs"), {
          type: 'support_reply',
          question: originalMessage,
          answer: text,
          userEmail: userEmail,
          timestamp: serverTimestamp()
        });

        setActiveReplyId(null);
        setReplyText(prev => ({...prev, [id]: ''})); 
        // Update lokale selectie
        setSelectedMessage(prev => ({ ...prev, reply: text, replyAt: { toDate: () => new Date() }, status: 'replied' }));
    }
  };

  const closeTicket = async (id) => {
    if (confirm("Ticket sluiten? De gebruiker kan dan niet meer reageren in deze thread.")) {
        await updateDoc(doc(db, "beta_feedback", id), { 
            status: 'closed',
            updatedAt: serverTimestamp()
        });
        setSelectedMessage(prev => ({ ...prev, status: 'closed' }));
    }
  };

  const generateAiDraft = async (id, message) => {
    setIsAiLoading(id);
    try {
        const functions = getFunctions(undefined, 'europe-west1');
        const getAiSupportReply = httpsCallable(functions, 'getAiSupportReply');
        const result = await getAiSupportReply({ ticketMessage: message });
        
        if (result.data && result.data.draft) {
            setReplyText(prev => ({ ...prev, [id]: result.data.draft }));
        }
    } catch (error) {
        console.error("AI Draft Error:", error);
        alert("Kon geen AI concept genereren.");
    } finally {
        setIsAiLoading(false);
    }
  };

  const deleteFeedbackItem = async (id) => {
    if (confirm("Feedback verwijderen?")) {
      await deleteDoc(doc(db, "beta_feedback", id));
      setSelectedMessage(null);
    }
  };

  // Filter Logica voor de Inbox
  const filteredInbox = feedbackItems.filter(item => {
    const matchesSearch = item.userEmail?.toLowerCase().includes(inboxSearch.toLowerCase());
    if (inboxFilter === 'unread') return matchesSearch && item.status !== 'replied' && item.status !== 'closed';
    if (inboxFilter === 'read') return matchesSearch && item.status === 'replied';
    return matchesSearch;
  });

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

  const vaultStats = users.reduce((acc, u) => {
    const style = u.vaultVersion || 'V1';
    acc[style] = (acc[style] || 0) + 1;
    return acc;
  }, {});

  const updateGlobalSetting = async (key, value) => {
    try {
      setSettings(prev => ({ ...prev, [key]: value }));
      await setDoc(doc(db, "system", "settings"), { [key]: value }, { merge: true });
      await addDoc(collection(db, "system_logs", "admin_actions"), {
        action: `Changed ${key} to ${value}`,
        admin: 'Admin',
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error("Error updating settings:", err);
      alert("Fout bij bijwerken instellingen.");
    }
  };

  const downloadCSV = (data, filename) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = window.URL.createObjectURL(blob);
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

      {/* TABS NAVIGATION */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 30, background: 'rgba(0,0,0,0.03)', padding: 4, borderRadius: 14, width: 'fit-content' }}>
        {[
          { id: 'mission', label: 'Mission Control', icon: <ShieldCheck weight="fill" /> },
          { id: 'intelligence', label: 'Intelligence', icon: <Brain weight="fill" /> },
          { id: 'logs', label: 'System Logs', icon: <ListDashes weight="fill" /> },
          { id: 'settings', label: 'Platform Settings', icon: <GearSix weight="fill" /> },
          { id: 'inbox', label: 'Beta Inbox', icon: <EnvelopeSimple weight="fill" /> } 
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 11, border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer', background: activeTab === tab.id ? '#FFF' : 'transparent', color: activeTab === tab.id ? '#007AFF' : '#8E8E93', boxShadow: activeTab === tab.id ? '0 4px 12px rgba(0,0,0,0.05)' : 'none' }}>
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
          <div className="bento-card" style={{ background: '#FFF', border: '1px solid #E5E5EA' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}><Megaphone size={20} weight="fill" /><span style={{ fontWeight: 900, fontSize: 14 }}>COMMUNITY BROADCAST</span></div>
            </div>
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
            <span style={{ fontWeight: 900, fontSize: 14 }}>TRADER REGISTRY</span>
            <input type="text" placeholder="Search traders..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: 350, padding: '12px 15px', borderRadius: 14, border: '1px solid #E5E5EA', fontSize: 14 }} />
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#F9F9FB' }}>
              <tr style={{ textAlign: 'left', fontSize: 11, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 1 }}>
                <th style={{ padding: '15px 25px' }}>Trader</th><th>Performance</th><th>Last Active</th><th style={{ textAlign: 'right', padding: '15px 25px' }}>Management</th>
              </tr>
            </thead>
            <tbody>
              {users.filter(u => u.email?.toLowerCase().includes(searchTerm.toLowerCase())).map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #F5F5F7' }}>
                    <td style={{ padding: '15px 25px' }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{u.displayName || 'Anonymous'}</div>
                      <div style={{ fontSize: 11, color: '#8E8E93' }}>{u.email}</div>
                    </td>
                    <td><div style={{ width: 40, height: 4, background: '#E5E5EA', borderRadius: 2 }}><div style={{ width: `${u.avgAdherence || 0}%`, height: '100%', background: '#007AFF', borderRadius: 2 }} /></div></td>
                    <td style={{ fontSize: 12, fontWeight: 600 }}>{formatLastActive(u.lastLogin).text}</td>
                    <td style={{ textAlign: 'right', padding: '15px 25px' }}>
                      <button onClick={() => updateDoc(doc(db, "users", u.id), { isFounder: !u.isFounder })} style={{ border: 'none', background: u.isFounder ? '#AF52DE15' : '#F2F2F7', color: u.isFounder ? '#AF52DE' : '#8E8E93', padding: '6px 12px', borderRadius: 8, fontSize: 10, fontWeight: 800 }}>FOUNDER</button>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- INBOX: GMAIL/OUTLOOK STYLE MET THREADING & LOCKS --- */}
      {activeTab === 'inbox' && (
         <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: 'calc(100vh - 250px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, background: 'white', padding: '15px 25px', borderRadius: 16, border: '1px solid #E5E5EA' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <MagnifyingGlass size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8E8E93' }} />
                    <input type="text" placeholder="Search user email..." value={inboxSearch} onChange={(e) => setInboxSearch(e.target.value)} style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: 12, border: '1px solid #F2F2F7', fontSize: 13 }} />
                </div>
                <div style={{ display: 'flex', background: '#F5F5F7', padding: 4, borderRadius: 10, gap: 4 }}>
                    {[{ id: 'all', label: 'All' }, { id: 'unread', label: 'Unread' }, { id: 'read', label: 'Replied' }].map(f => (
                        <button key={f.id} onClick={() => setInboxFilter(f.id)} style={{ border: 'none', background: inboxFilter === f.id ? 'white' : 'transparent', padding: '6px 12px', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', boxShadow: inboxFilter === f.id ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>{f.label}</button>
                    ))}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20, flex: 1, overflow: 'hidden' }}>
              <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E5EA', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                {filteredInbox.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#8E8E93' }}>No messages.</div>
                ) : (
                  filteredInbox.map(item => (
                    <div key={item.id} onClick={() => setSelectedMessage(item)} style={{ padding: '15px 20px', borderBottom: '1px solid #F5F5F7', cursor: 'pointer', background: selectedMessage?.id === item.id ? 'rgba(0,122,255,0.05)' : 'transparent', position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#1D1D1F' }}>{item.userEmail}</span>
                        <span style={{ fontSize: 10, color: '#8E8E93' }}>{item.updatedAt?.toDate().toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' })}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <div style={{ width: 16, height: 16, borderRadius: 4, background: item.type === 'bug' ? '#FF3B3015' : '#007AFF15', color: item.type === 'bug' ? '#FF3B30' : '#007AFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {item.type === 'bug' ? <Bug size={10} weight="fill"/> : <Lightbulb size={10} weight="fill"/>}
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: item.type === 'bug' ? '#FF3B30' : '#007AFF', textTransform: 'uppercase' }}>{item.status || 'OPEN'}</span>
                        {item.status === 'replied' && <CheckCircle size={12} color="#30D158" weight="fill" />}
                        {item.status === 'closed' && <LockSimple size={12} color="#8E8E93" weight="bold" />}
                      </div>
                      <div style={{ fontSize: 12, color: '#86868B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.message.substring(0, 45)}...</div>
                      {selectedMessage?.id === item.id && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: '#007AFF' }} />}
                    </div>
                  ))
                )}
              </div>

              <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E5EA', overflowY: 'auto' }}>
                {selectedMessage ? (
                  <div style={{ padding: 30 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 30, borderBottom: '1px solid #F5F5F7', paddingBottom: 20 }}>
                      <div>
                        <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{selectedMessage.userEmail}</h2>
                        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                          <span style={{ fontSize: 11, color: '#8E8E93' }}>{selectedMessage.createdAt?.toDate().toLocaleString('nl-NL')}</span>
                          <span style={{ fontSize: 10, background: '#F2F2F7', padding: '2px 8px', borderRadius: 4, fontWeight: 800 }}>{selectedMessage.status?.toUpperCase() || 'OPEN'}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        {selectedMessage.status !== 'closed' && (
                            <button onClick={() => closeTicket(selectedMessage.id)} style={{ padding: '8px 15px', background: '#F2F2F7', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <LockSimple size={16} /> Close Ticket
                            </button>
                        )}
                        <button onClick={() => deleteFeedbackItem(selectedMessage.id)} style={{ padding: 8, background: '#FF3B3010', border: 'none', color: '#FF3B30', cursor: 'pointer', borderRadius: 8 }}><Trash size={20}/></button>
                      </div>
                    </div>

                    <div style={{ marginBottom: 40 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#8E8E93', marginBottom: 10, textTransform: 'uppercase' }}>Message</div>
                      <div style={{ fontSize: 15, color: '#1D1D1F', background: '#F9F9FB', padding: 20, borderRadius: 12, lineHeight: 1.6 }}>{selectedMessage.message}</div>
                    </div>

                    <div style={{ borderTop: '1px solid #F5F5F7', paddingTop: 30 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#8E8E93', marginBottom: 15, textTransform: 'uppercase' }}>Conversation Flow</div>
                      {selectedMessage.status === 'closed' ? (
                          <div style={{ textAlign: 'center', padding: 30, background: '#F2F2F7', borderRadius: 12, color: '#8E8E93' }}>
                             <LockSimple size={32} style={{ marginBottom: 10 }} />
                             <div style={{ fontWeight: 700 }}>Conversation is locked and closed.</div>
                          </div>
                      ) : (
                        <div style={{ display: 'grid', gap: 15 }}>
                          {selectedMessage.reply && (
                              <div style={{ background: 'rgba(48, 209, 88, 0.05)', padding: 15, borderRadius: 12, borderLeft: '4px solid #30D158', marginBottom: 10 }}>
                                <div style={{ fontSize: 10, fontWeight: 800, color: '#30D158', marginBottom: 4 }}>LAST SENT REPLY:</div>
                                <div style={{ fontSize: 14 }}>{selectedMessage.reply}</div>
                              </div>
                          )}
                          <textarea value={replyText[selectedMessage.id] || ''} onChange={e => setReplyText({...replyText, [selectedMessage.id]: e.target.value})} placeholder="Type follow-up or reply..." style={{ width: '100%', padding: '15px', borderRadius: 12, border: '1px solid #E5E5EA', outline: 'none', minHeight: 150, fontFamily: 'inherit' }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <button onClick={() => generateAiDraft(selectedMessage.id, selectedMessage.message)} disabled={isAiLoading === selectedMessage.id} style={{ background: '#1C1C1E', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                                {isAiLoading === selectedMessage.id ? <ArrowsClockwise size={18} className="spinner" /> : <Robot size={18} weight="fill" />} AI Draft
                              </button>
                              <button onClick={() => sendReply(selectedMessage.id, selectedMessage.message, selectedMessage.userEmail)} disabled={!replyText[selectedMessage.id]} style={{ background: '#007AFF', color: 'white', border: 'none', borderRadius: 10, padding: '10px 30px', cursor: 'pointer', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, opacity: replyText[selectedMessage.id] ? 1 : 0.5 }}>
                                Send Reply <PaperPlaneTilt weight="fill" size={16}/>
                              </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#C7C7CC' }}>
                    <EnvelopeSimple size={64} weight="thin" />
                    <p style={{ marginTop: 15, fontSize: 14, fontWeight: 600 }}>Select a message to view conversation</p>
                  </div>
                )}
              </div>
            </div>
         </div>
      )}
    </div>
  );
}