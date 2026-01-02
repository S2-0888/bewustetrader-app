import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { 
  collection, query, onSnapshot, doc, updateDoc, 
  deleteDoc, setDoc, orderBy, limit, addDoc, serverTimestamp, where,
  getDocs 
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { 
  ShieldCheck, Crown, Trash, Check, LinkSimple, 
  Megaphone, Clock, MagnifyingGlass, ArrowsClockwise,
  ChartBar, Sparkle, TrendUp, UsersThree, XCircle,
  ChartLineUp, Pulse, WarningCircle, Eye, 
  Brain, ListDashes, Shield, PlusCircle, DownloadSimple,
  GearSix, Lock, ToggleLeft, ToggleRight, Sliders,
  EnvelopeSimple, Bug, Lightbulb, ChatTeardropText, PaperPlaneTilt,
  Funnel, Robot, CaretRight, CheckCircle, LockSimple, Camera,
  CalendarPlus 
} from '@phosphor-icons/react';

export default function Admin() {
  const [activeTab, setActiveTab] = useState('mission'); 
  const [users, setUsers] = useState([]);
  const [tctLogs, setTctLogs] = useState([]); 
  const [whitelistIntakes, setWhitelistIntakes] = useState([]); // TOEGEVOEGD
  const [loading, setLoading] = useState(true);
  
  // Feedback State
  const [feedbackItems, setFeedbackItems] = useState([]);
  const [replyText, setReplyText] = useState({});
  const [replyAttachment, setReplyAttachment] = useState({});
  const [activeReplyId, setActiveReplyId] = useState(null);

  // Inbox Filters & Search
  const [inboxSearch, setInboxSearch] = useState('');
  const [inboxFilter, setInboxFilter] = useState('all'); 
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null); 

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
    const unsubUsers = onSnapshot(query(collection(db, "users"), orderBy("createdAt", "desc")), (snap) => {
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

    // 5. Listen for Beta Feedback
    const unsubFeedback = onSnapshot(query(collection(db, "beta_feedback"), orderBy("updatedAt", "desc")), (snap) => {
      setFeedbackItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    useEffect(() => {
  if (selectedMessage) {
    const updated = feedbackItems.find(i => i.id === selectedMessage.id);
    if (updated) setSelectedMessage(updated);
  }
}, [feedbackItems]);

    // 6. Listen for Whitelist Intakes (TOEGEVOEGD)
    const unsubWhitelist = onSnapshot(query(collection(db, "whitelist_intakes"), orderBy("createdAt", "desc")), (snap) => {
        setWhitelistIntakes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { 
        unsubUsers(); unsubBroadcast(); unsubSettings(); 
        unsubLogs(); unsubFeedback(); unsubWhitelist(); 
    };
  }, []);

  // --- ACTIONS: DIRECT ACTIVATION FROM REGISTRY ---
  const activateTraderDirectly = async (userId) => {
    if (!window.confirm("Wil je deze trader direct toegang geven tot het dashboard?")) return;
    
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        isApproved: true,
        hasCompletedIntake: true, // Zorg dat ze niet terug in de chat komen
        status: 'approved',
        subscriptionStatus: 'active',
        // Directe proefperiode van 30 dagen toekennen
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 
        updatedAt: serverTimestamp()
      });
      alert("Trader is geactiveerd!");
    } catch (error) {
      console.error("Direct activation error:", error);
      alert("Fout bij activeren.");
    }
  };

  // --- ACTIONS: WHITELIST ---
  const approveTrader = async (intake) => {
    const isBeta = window.confirm(`Approve as BETA TESTER? \n\nOK = Beta Tester Invitation \nCancel = Standard Founder Invitation`);

    const standardMail = `Hi ${intake.name},

I have reviewed your voice reflection and analyzed your profile. The Conscious Trader AI has identified your archetype as: ${intake.analysis?.archetype || 'The Professional Trader'}.

Your account has been officially activated. You now have full access to the Command Center and your personalized Shadow Profile.

Log in here: ${window.location.origin}

See you in the cockpit!
Team The Conscious Trader`;

    const betaMail = `Hi ${intake.name},

Congratulations! You have been selected as an exclusive Beta Tester for The Conscious Trader. 

Our AI analyzed your intake and identified you as: ${intake.analysis?.archetype}. We believe your experience level (${intake.experience}) makes you a perfect fit to help us refine the platform.

As a Beta Tester, you have early access to all features. We would love to hear your feedback as you explore your Shadow Profile.

Start your beta journey here: ${window.location.origin}

Welcome to the elite circle,
Team The Conscious Trader`;

    const mailBericht = isBeta ? betaMail : standardMail;

    try {
        await updateDoc(doc(db, "whitelist_intakes", intake.id), { 
            status: 'approved',
            approvedAs: isBeta ? 'beta_tester' : 'founder'
        });
        
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", intake.email));
        const userSnap = await getDocs(q);
        
        if (!userSnap.empty) {
            await updateDoc(doc(db, "users", userSnap.docs[0].id), { 
                isApproved: true,
                isBetaTester: isBeta,
                updatedAt: serverTimestamp() 
            });
        }

        await navigator.clipboard.writeText(mailBericht);
        alert(`Success! ${intake.name} approved as ${isBeta ? 'Beta Tester' : 'Founder'}. The invitation text is on your clipboard.`);
    } catch (error) {
        console.error("Approval error:", error);
        alert("Something went wrong with the approval.");
    }
  };

  // --- SUBSCRIPTION LOGICA ---
  const extendAccess = async (userId) => {
    if (!window.confirm("Are you sure you want to extend this user's access by 30 days?")) return;
    
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + 30); 
    
    await updateDoc(doc(db, "users", userId), {
      subscriptionStatus: 'active',
      currentPeriodEnd: newExpiry,
      isApproved: true, 
      updatedAt: serverTimestamp()
    });
    alert("Access extended successfully.");
  };

  const revokeAccess = async (userId) => {
    if (!window.confirm("WARNING: Are you sure you want to revoke access and block this trader immediately?")) return;
    
    await updateDoc(doc(db, "users", userId), {
      subscriptionStatus: 'expired',
      isApproved: false,
      updatedAt: serverTimestamp()
    });
    alert("Access revoked.");
  };

  const toggleFounder = async (user) => {
    if (!window.confirm(`Switch Founder status for ${user.displayName || 'this user'}?`)) return;
    await updateDoc(doc(db, "users", user.id), { isFounder: !user.isFounder });
  };

  const formatExpiry = (timestamp) => {
    if (!timestamp) return <span style={{ color: '#8E8E93' }}>No access set</span>;
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const isExpired = date < now;
    
    return (
        <span style={{ color: isExpired ? '#FF3B30' : '#30D158', fontWeight: 700 }}>
            {date.toLocaleDateString('nl-NL')} {isExpired ? '(EXPIRED)' : ''}
        </span>
    );
  };

  const handleAdminFileChange = (id, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setReplyAttachment(prev => ({ ...prev, [id]: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const sendReply = async (id, originalMessage, userEmail) => {
    const text = replyText[id];
    const attachment = replyAttachment[id]; 
    if (!text) return;
    if (confirm("Send this reply to the trader?")) {
        await updateDoc(doc(db, "beta_feedback", id), { 
            reply: text,
            replyAttachment: attachment || null,
            replyAt: serverTimestamp(),
            updatedAt: serverTimestamp(), 
            status: 'replied',
            isRead: false
        });

        await addDoc(collection(db, "ai_training_logs"), {
          type: 'support_reply',
          question: originalMessage,
          answer: text,
          userEmail: userEmail,
          timestamp: serverTimestamp()
        });

        setActiveReplyId(null);
        setReplyText(prev => ({...prev, [id]: ''})); 
        setReplyAttachment(prev => ({...prev, [id]: null}));
        setSelectedMessage(prev => ({ ...prev, reply: text, replyAttachment: attachment, replyAt: { toDate: () => new Date() }, status: 'replied' }));
    }
  };

  const closeTicket = async (id) => {
    if (confirm("Close this ticket? The user will no longer be able to reply.")) {
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
        alert("Could not generate AI draft.");
    } finally {
        setIsAiLoading(false);
    }
  };

  const deleteFeedbackItem = async (id) => {
    if (confirm("Permanently delete this feedback item?")) {
      await deleteDoc(doc(db, "beta_feedback", id));
      setSelectedMessage(null);
    }
  };

  const deleteUser = async (id) => {
    if (confirm("PERMANENTLY DELETE USER? This action cannot be undone and all data will be lost.")) {
      await deleteDoc(doc(db, "users", id));
    }
  };

  const filteredInbox = feedbackItems.filter(item => {
    const matchesSearch = item.userEmail?.toLowerCase().includes(inboxSearch.toLowerCase());
    if (inboxFilter === 'unread') return matchesSearch && item.status !== 'replied' && item.status !== 'closed';
    if (inboxFilter === 'read') return matchesSearch && item.status === 'replied';
    return matchesSearch;
  });

  const nowTime = new Date().getTime();
  const oneWeekAgo = nowTime - (7 * 24 * 60 * 60 * 1000);
  const activeToday = users.filter(u => u.lastLogin && (nowTime - u.lastLogin) < 86400000).length;
  const newTradersThisWeek = users.filter(u => u.createdAt && u.createdAt.toDate().getTime() > oneWeekAgo).length;

  const updateGlobalSetting = async (key, value) => {
    const actionText = value ? 'ENABLE' : 'DISABLE';
    if (!window.confirm(`Are you sure you want to ${actionText} ${key}?`)) return;
    
    setSettings(prev => ({ ...prev, [key]: value }));
    await setDoc(doc(db, "system", "settings"), { [key]: value }, { merge: true });
  };

  const formatLastActive = (timestamp) => {
    if (!timestamp) return { text: 'Never', color: '#8E8E93' };
    const diff = nowTime - timestamp;
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return { text: 'Just now', color: '#30D158' };
    if (hours < 24) return { text: `${hours}h ago`, color: '#30D158' };
    const days = Math.floor(hours / 24);
    return { text: `${days}d ago`, color: days > 7 ? '#FF3B30' : '#1C1C1E' };
  };

  const sendBroadcast = async () => {
    if(!broadcast) return;
    if(!confirm("Push this broadcast live to all users?")) return;
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

      <div style={{ display: 'flex', gap: 8, marginBottom: 30, background: 'rgba(0,0,0,0.03)', padding: 4, borderRadius: 14, width: 'fit-content' }}>
        {[
          { id: 'mission', label: 'Mission Control', icon: <ShieldCheck weight="fill" /> },
          { id: 'whitelist', label: 'Whitelist', icon: <PlusCircle weight="fill" /> }, 
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
            <div className="bento-card" style={{ background: 'white' }}><span className="label-xs">ACTIVE TODAY</span><div style={{ fontSize: 32, fontWeight: 900, marginTop: 10 }}>{activeToday}</div><div style={{ fontSize: 12, color: '#86868B', marginTop: 5 }}>Traders logged in</div></div>
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

      {activeTab === 'whitelist' && (
  <div style={{ display: 'grid', gap: 40 }}>
    
    {/* SECTIE 1: PENDING APPLICATIONS (GLASS & NEUMORPHIC) */}
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF9F0A', boxShadow: '0 0 10px #FF9F0A' }}></div>
        <h3 style={{ fontSize: 20, fontWeight: 900, color: '#1D1D1F', margin: 0 }}>
          Pending Audits ({whitelistIntakes.filter(i => i.status === 'pending').length})
        </h3>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 30 }}>
        {whitelistIntakes.filter(i => i.status === 'pending').map(intake => (
          <div key={intake.id} style={{
            background: 'rgba(255, 255, 255, 0.6)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '35px',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            padding: '30px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.04)',
            position: 'relative'
          }}>
            {/* User Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25 }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: '24px', color: '#1D1D1F', letterSpacing: '-0.8px' }}>{intake.name}</div>
                <div style={{ fontSize: '13px', color: '#007AFF', fontWeight: 700, opacity: 0.8 }}>{intake.email}</div>
              </div>
              <span style={{
                background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.1), rgba(0, 122, 255, 0.05))',
                padding: '8px 16px',
                borderRadius: '14px',
                fontSize: '11px',
                fontWeight: 800,
                color: '#007AFF',
                border: '1px solid rgba(0, 122, 255, 0.1)',
                textTransform: 'uppercase'
              }}>
                {intake.analysis?.archetype}
              </span>
            </div>

            {/* Shadow Audit Box (Inset Depth) */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.03)',
              padding: '20px',
              borderRadius: '24px',
              marginBottom: '25px',
              boxShadow: 'inset 2px 2px 8px rgba(0,0,0,0.05)',
              border: '1px solid rgba(255, 255, 255, 0.5)'
            }}>
              <div style={{ fontSize: '10px', fontWeight: 900, color: '#8E8E93', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                Institutional Shadow Audit
              </div>
              <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#1D1D1F', fontWeight: 500, margin: 0, opacity: 0.9 }}>
                {intake.analysis?.shadow_analysis}
              </p>
            </div>

            {/* Metrics (Neumorphic Wells) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '30px' }}>
              {[
                { label: 'EXPERIENCE', value: intake.experience },
                { label: 'INVENTORY', value: intake.accounts },
                { label: 'READINESS', value: `${intake.analysis?.readiness_score}%`, highlight: true }
              ].map((m, i) => (
                <div key={i} style={{
                  background: '#F2F2F7',
                  padding: '16px 10px',
                  borderRadius: '20px',
                  textAlign: 'center',
                  boxShadow: 'inset 4px 4px 8px #d1d1d6, inset -4px -4px 8px #ffffff',
                }}>
                  <div style={{ fontSize: '8px', fontWeight: 800, color: '#8E8E93', marginBottom: '6px', letterSpacing: '0.5px' }}>{m.label}</div>
                  <div style={{ 
                    fontSize: '15px', 
                    fontWeight: 900, 
                    color: m.highlight ? (intake.analysis?.readiness_score > 75 ? '#30D158' : '#FF9F0A') : '#1D1D1F' 
                  }}>
                    {m.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Initialize Button */}
            <button 
              onClick={() => approveTrader(intake)}
              style={{
                width: '100%',
                padding: '20px',
                background: 'linear-gradient(145deg, #1d1d1f, #2c2c2e)',
                color: 'white',
                border: 'none',
                borderRadius: '22px',
                fontWeight: 800,
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 10px 20px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                transition: 'transform 0.2s ease'
              }}
            >
              Initialize System Access <PaperPlaneTilt size={20} weight="bold" />
            </button>
          </div>
        ))}
      </div>
    </div>

    {/* SECTIE 2: RECENTLY APPROVED (STREEKVRIJ & MODERN) */}
    <div style={{ 
      background: 'rgba(255, 255, 255, 0.4)', 
      borderRadius: '35px', 
      border: '1px solid rgba(255, 255, 255, 0.5)', 
      padding: '30px',
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#1D1D1F', letterSpacing: '-0.5px' }}>Approved Registry</h3>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#8E8E93' }}>READY FOR DISPATCH</div>
      </div>
      
      <div style={{ display: 'grid', gap: 12 }}>
        {whitelistIntakes
          .filter(i => i.status === 'approved')
          .filter(i => !users.some(u => u.email === i.email))
          .map(intake => (
            <div key={intake.id} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '18px 25px', 
              background: 'white', 
              borderRadius: '20px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
              border: '1px solid #F2F2F7'
            }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#1D1D1F' }}>{intake.name}</div>
                <div style={{ fontSize: 12, color: '#8E8E93', fontWeight: 500 }}>{intake.email} • <span style={{color: '#007AFF'}}>{intake.approvedAs?.toUpperCase()}</span></div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button 
                  onClick={() => { /* ... invitation logica ... */ }}
                  style={{ background: '#F2F2F7', color: '#1D1D1F', border: 'none', padding: '10px 18px', borderRadius: '12px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                >
                  Copy Mail
                </button>
                <button onClick={() => deleteDoc(doc(db, "whitelist_intakes", intake.id))} style={{ color: '#FF3B30', background: 'rgba(255, 59, 48, 0.05)', border: 'none', padding: '10px', borderRadius: '12px', cursor: 'pointer' }}>
                  <Trash size={18} />
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  </div>
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
                <th style={{ padding: '15px 25px' }}>Trader</th>
                <th>Status</th>
                <th>Subscription End</th>
                <th>Last Active</th>
                <th style={{ textAlign: 'right', padding: '15px 25px' }}>Management</th>
              </tr>
            </thead>
            <tbody>
              {users.filter(u => u.email?.toLowerCase().includes(searchTerm.toLowerCase())).map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #F5F5F7' }}>
                    <td style={{ padding: '15px 25px' }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{u.displayName || 'Anonymous'}</div>
                      <div style={{ fontSize: 11, color: '#8E8E93' }}>{u.email}</div>
                    </td>
                    <td>
                        {u.isApproved ? (
                            <span style={{ color: '#30D158', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <CheckCircle weight="fill" size={14} /> APPROVED
                            </span>
                        ) : (
                            <span style={{ color: '#FF9F0A', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Clock weight="fill" size={14} /> PENDING
                            </span>
                        )}
                    </td>
                    <td style={{ fontSize: 12 }}>{formatExpiry(u.currentPeriodEnd)}</td>
                    <td style={{ fontSize: 12, fontWeight: 600 }}>{formatLastActive(u.lastLogin).text}</td>
                    <td style={{ textAlign: 'right', padding: '15px 25px' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        {/* APPROVE NOW KNOP VOOR PENDING USERS */}
                        {!u.isApproved && (
                          <button 
                            onClick={() => activateTraderDirectly(u.id)}
                            style={{ background: '#007AFF15', border: 'none', color: '#007AFF', padding: '6px 12px', borderRadius: 8, fontSize: 10, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <CheckCircle size={14} weight="fill" /> APPROVE NOW
                          </button>
                        )}
                        <button 
                            onClick={() => extendAccess(u.id)}
                            title="Extend 30 Days"
                            style={{ background: '#30D15815', border: 'none', color: '#30D158', padding: '6px 10px', borderRadius: 8, fontSize: 10, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                            <CalendarPlus size={14} /> +30D
                        </button>
                        <button 
                            onClick={() => revokeAccess(u.id)}
                            title="Revoke Access"
                            style={{ background: '#FF3B3015', border: 'none', color: '#FF3B30', padding: '6px', borderRadius: 8, cursor: 'pointer' }}
                        >
                            <XCircle size={18} />
                        </button>
                        <button 
                            onClick={() => toggleFounder(u)}
                            style={{ border: 'none', background: u.isFounder ? '#AF52DE15' : '#F2F2F7', color: u.isFounder ? '#AF52DE' : '#8E8E93', padding: '6px 12px', borderRadius: 8, fontSize: 10, fontWeight: 800, cursor: 'pointer' }}
                        >
                            FOUNDER
                        </button>
                        <button onClick={() => deleteUser(u.id)} style={{ border: 'none', background: 'none', color: '#FF3B30', opacity: 0.3, cursor: 'pointer' }}><Trash size={18}/></button>
                      </div>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
                      <div 
                        key={item.id} 
                        onClick={() => setSelectedMessage(item)} // VOEG DEZE REGEL TOE
                        style={{ 
                          padding: '15px 20px', 
                          borderBottom: '1px solid #F5F5F7', 
                          cursor: 'pointer', 
                          background: selectedMessage?.id === item.id ? 'rgba(0,122,255,0.05)' : 'transparent', 
                          position: 'relative' 
                        }}>
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
                        <button onClick={() => deleteFeedbackItem(selectedMessage.id)} style={{ padding: 8, background: '#FF3B3010', border: 'none', color: '#FF3B30', borderRadius: 8 }}><Trash size={20}/></button>
                      </div>
                    </div>

                    <div style={{ marginBottom: 40 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#8E8E93', marginBottom: 10, textTransform: 'uppercase' }}>Message</div>
                      <div style={{ fontSize: 15, color: '#1D1D1F', background: '#F9F9FB', padding: 20, borderRadius: 12, lineHeight: 1.6 }}>{selectedMessage.message}</div>
                      {selectedMessage.attachment && (
                        <div style={{ marginTop: 20 }}>
                          <div style={{ fontSize: 12, fontWeight: 800, color: '#8E8E93', marginBottom: 10, textTransform: 'uppercase' }}>Screenshot</div>
                          <a href={selectedMessage.attachment} target="_blank" rel="noreferrer">
                            <img src={selectedMessage.attachment} style={{ maxWidth: '100%', borderRadius: 12, border: '1px solid #E5E5EA' }} alt="Attachment" />
                          </a>
                        </div>
                      )}
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
                                {selectedMessage.replyAttachment && (
                                    <div style={{ marginTop: 10 }}>
                                        <img src={selectedMessage.replyAttachment} style={{ width: 120, borderRadius: 8, border: '1px solid #E5E5EA' }} alt="Reply Attachment" />
                                    </div>
                                )}
                              </div>
                          )}
                          <div style={{ position: 'relative' }}>
                            <textarea 
                                value={replyText[selectedMessage.id] || ''} 
                                onChange={e => setReplyText({...replyText, [selectedMessage.id]: e.target.value})} 
                                placeholder="Type follow-up or reply..." 
                                style={{ width: '100%', padding: '15px', borderRadius: 12, border: '1px solid #E5E5EA', outline: 'none', minHeight: 150, fontFamily: 'inherit' }} 
                            />
                            {replyAttachment[selectedMessage.id] && (
                                <div style={{ position: 'absolute', bottom: 15, left: 15, display: 'flex', alignItems: 'center', gap: 10, background: 'white', padding: '5px 10px', borderRadius: 8, border: '1px solid #E5E5EA' }}>
                                    <img src={replyAttachment[selectedMessage.id]} style={{ width: 30, height: 30, borderRadius: 4, objectFit: 'cover' }} alt="Preview" />
                                    <Trash size={16} color="#FF3B30" style={{ cursor: 'pointer' }} onClick={() => setReplyAttachment(prev => ({ ...prev, [selectedMessage.id]: null }))} />
                                </div>
                            )}
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', gap: 10 }}>
                                <button onClick={() => generateAiDraft(selectedMessage.id, selectedMessage.message)} disabled={isAiLoading === selectedMessage.id} style={{ background: '#1C1C1E', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {isAiLoading === selectedMessage.id ? <ArrowsClockwise size={18} className="spinner" /> : <Robot size={18} weight="fill" />} AI Draft
                                </button>
                                <label style={{ background: '#F2F2F7', color: '#1D1D1F', borderRadius: 10, padding: '10px 15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700 }}>
                                    <Camera size={18} /> Attachment
                                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleAdminFileChange(selectedMessage.id, e)} />
                                </label>
                              </div>

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

      {activeTab === 'logs' && (
        <div className="bento-card" style={{ background: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <span style={{ fontWeight: 900 }}>AI INSIGHT LOGS</span>
                <button style={{ border: 'none', background: '#F2F2F7', padding: '8px 15px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Export CSV</button>
            </div>
            <div style={{ maxHeight: 600, overflowY: 'auto' }}>
                {tctLogs.map(log => (
                    <div key={log.id} style={{ padding: '15px 0', borderBottom: '1px solid #F5F5F7' }}>
                        <div style={{ display: 'flex', gap: 10, marginBottom: 5 }}>
                            <span style={{ fontWeight: 800, fontSize: 13 }}>{log.userName || 'Unknown'}</span>
                            <span style={{ color: '#8E8E93', fontSize: 11 }}>{log.createdAt?.toDate().toLocaleString()}</span>
                        </div>
                        <div style={{ fontSize: 13, color: '#444' }}>"{log.insight}"</div>
                    </div>
                ))}
            </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div style={{ display: 'grid', gap: 20 }}>
            <div className="bento-card" style={{ background: 'white' }}>
                <h3 style={{ margin: '0 0 20px 0' }}>Global Controls</h3>
                <div style={{ display: 'grid', gap: 15 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div><div style={{ fontWeight: 700 }}>Maintenance Mode</div><div style={{ fontSize: 12, color: '#86868B' }}>Lock platform for all users</div></div>
                        <button onClick={() => updateGlobalSetting('maintenanceMode', !settings.maintenanceMode)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                            {settings.maintenanceMode ? <ToggleRight size={40} color="#FF3B30" weight="fill" /> : <ToggleLeft size={40} color="#C7C7CC" weight="fill" />}
                        </button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div><div style={{ fontWeight: 700 }}>Public Signups</div><div style={{ fontSize: 12, color: '#86868B' }}>Open door for new traders</div></div>
                        <button onClick={() => updateGlobalSetting('signupOpen', !settings.signupOpen)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                            {settings.signupOpen ? <ToggleRight size={40} color="#30D158" weight="fill" /> : <ToggleLeft size={40} color="#C7C7CC" weight="fill" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}