import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { 
  collection, query, onSnapshot, doc, updateDoc, 
  deleteDoc, setDoc, orderBy, limit, addDoc, serverTimestamp, where,
  getDocs 
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { 
  ShieldCheck, Brain, ChartLineUp, EnvelopeSimple, PlusCircle, GearSix, 
  ListDashes, Browser, Robot, MagnifyingGlass, Bug, Lightbulb, CheckCircle, 
  LockSimple, Trash, ArrowsClockwise, Camera, PaperPlaneTilt,
  Clock, Tag, Check, CalendarPlus, XCircle, CaretRight, ToggleRight, ToggleLeft, 
  TrendUp, Pulse, Megaphone, LinkSimple
} from '@phosphor-icons/react';

// Importeer de modules die we hebben gemaakt
import TraderRegistry from './TraderRegistry';
import InboxManager from './InboxManager';
import ContentManager from './ContentManager';
import SystemManager from './SystemManager';

const adminStyles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .spinner {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .bento-card {
    padding: 25px;
    border-radius: 24px;
    border: 1px solid #E5E5EA;
    transition: all 0.3s ease;
  }
  .label-xs {
    font-size: 10px;
    font-weight: 800;
    color: #8E8E93;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
`;

  function Admin() {  const [activeTab, setActiveTab] = useState('mission'); 
  const [users, setUsers] = useState([]);
  const [tctLogs, setTctLogs] = useState([]); 
  const [whitelistIntakes, setWhitelistIntakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [faqs, setFaqs] = useState([]);
  const [newFaq, setNewFaq] = useState({ question: '', answer: '', order: 0 });
  const [pricing, setPricing] = useState({ id: 'default', name: '', price: '', oldPrice: '', features: '' });
  const [copied, setCopied] = useState(false);
  
  // --- SCHEDULER STATE (Zorg dat deze hier maar 1x staat!) ---
  const [scheduledChange, setScheduledChange] = useState({ targetDate: '', targetTime: '' });
  const [priceLogs, setPriceLogs] = useState([]); 

  // MODULAIRE MENU STRUCTUUR
  const menuGroups = [
    {
      title: 'I. Command Center',
      items: [
        { id: 'mission', label: 'Mission Control', icon: <ShieldCheck /> },
        { id: 'intelligence', label: 'Intelligence', icon: <Brain /> },
      ]
    },
    {
      title: 'II. Growth',
      items: [
        { id: 'finance', label: 'Financials', icon: <ChartLineUp /> },
        { id: 'inbox', label: 'Beta Inbox', icon: <EnvelopeSimple /> },
        { id: 'whitelist', label: 'Whitelist', icon: <PlusCircle /> },
      ]
    },
    {
      title: 'III. The Engine',
      items: [
        { id: 'settings', label: 'Platform Settings', icon: <GearSix /> },
        { id: 'logs', label: 'System Logs', icon: <ListDashes /> },
      ]
    },
    {
      title: 'IV. Content',
      items: [
        { id: 'content', label: 'Site Content', icon: <Browser /> },
      ]
    }
  ];
  
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

  // New Content Management States
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [pricingPresets] = useState([
    { name: 'Standard Monthly', price: '97', oldPrice: '147', features: 'AI Dashboard, Shadow Audit, Risk Manager, Weekly Sessions' },
    { name: 'Lifetime Founder', price: '997', oldPrice: '2497', features: 'All Pro Features, No Monthly Fees, Founder Badge, Alpha Access' },
    { name: 'Flash Sale (24h)', price: '47', oldPrice: '97', features: 'Full Platform Access, Discord Community' }
  ]);

  // FAQ Drag & Drop Handler
const moveFaq = async (id, currentOrder, direction) => {
  const newOrder = direction === 'up' ? currentOrder - 1 : currentOrder + 1;
  if (newOrder < 1) return;

  const faqRef = doc(db, "site_content", "faq", "entries", id);
  await updateDoc(faqRef, { order: newOrder });
  // Optioneel: hersorteer de rest ook, maar dit is de basis.
};

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

    // 6. Listen for Whitelist Intakes
    const unsubWhitelist = onSnapshot(query(collection(db, "whitelist_intakes"), orderBy("createdAt", "desc")), (snap) => {
        setWhitelistIntakes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 7. Listen for FAQ
    const unsubFaq = onSnapshot(query(collection(db, "site_content", "faq", "entries"), orderBy("order", "asc")), (snap) => {
      setFaqs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 8. Listen for Pricing
    const unsubPricing = onSnapshot(collection(db, "site_content", "pricing", "plans"), (snap) => {
      if (!snap.empty) {
        const p = snap.docs[0].data();
        setPricing({ id: snap.docs[0].id, ...p, features: p.features?.join(', ') || '' });
      }
    });

    // 9. Listen for Pricing History Logs
    const unsubPriceLogs = onSnapshot(query(collection(db, "system", "pricing_history", "logs"), orderBy("timestamp", "desc"), limit(5)), (snap) => {
      setPriceLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { 
            unsubUsers(); unsubBroadcast(); unsubSettings(); 
            unsubLogs(); unsubFeedback(); unsubWhitelist(); 
            unsubFaq(); unsubPricing(); unsubPriceLogs(); // unsubPriceLogs toegevoegd
        };
  }, []); // Einde van de hoofd-hook

  // --- DEZE HOOK MOET HIER LOS STAAN (rond regel 114) ---
  useEffect(() => {
    if (selectedMessage) {
      const updated = feedbackItems.find(i => i.id === selectedMessage.id);
      if (updated) setSelectedMessage(updated);
    }
  }, [feedbackItems]);

  const impersonateUser = (user) => {
    if (confirm(`Wil je inloggen als ${user.displayName || user.email}?`)) {
      sessionStorage.setItem('impersonate_uid', user.id);
      window.location.href = '/dashboard';
    }
  };

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
  const totalUsers = users.length;
  const pendingAudits = whitelistIntakes.filter(i => i.status === 'pending').length;
  // Churn Risk: Mensen die binnen 3 dagen verlopen OF al hebben opgezegd (cancelAtPeriodEnd)
  const churnRisk = users.filter(u => {
    if (u.cancelAtPeriodEnd) return true;
    if (!u.currentPeriodEnd) return false;
    const daysLeft = (u.currentPeriodEnd.toDate() - new Date()) / (1000 * 60 * 60 * 24);
    return daysLeft > 0 && daysLeft < 3;
  }).length;

  const updateGlobalSetting = async (key, value) => {
    const actionText = value ? 'ENABLE' : 'DISABLE';
    if (!window.confirm(`Are you sure you want to ${actionText} ${key}?`)) return;
    
    setSettings(prev => ({ ...prev, [key]: value }));
    await setDoc(doc(db, "system", "settings"), { [key]: value }, { merge: true });
  };

  const handleAddFaq = async () => {
    if (!newFaq.question || !newFaq.answer) return;
    await addDoc(collection(db, "site_content", "faq", "entries"), newFaq);
    setNewFaq({ question: '', answer: '', order: faqs.length + 1 });
  };

  const deleteFaq = async (id) => {
    if (confirm("Delete this FAQ?")) await deleteDoc(doc(db, "site_content", "faq", "entries", id));
  };

  const handleUpdatePricing = async () => {
    const featArray = pricing.features.split(',').map(f => f.trim());
    await setDoc(doc(db, "site_content", "pricing", "plans", pricing.id), {
      name: pricing.name,
      price: pricing.price,
      oldPrice: pricing.oldPrice,
      features: featArray,
      updatedAt: serverTimestamp()
    }, { merge: true });
    alert("Pricing updated!");
  };

  const handleSchedulePrice = async () => {
    if(!scheduledChange.targetDate || !scheduledChange.targetTime) return alert("Selecteer datum en tijd.");
    
    const executionKey = `${scheduledChange.targetDate} ${scheduledChange.targetTime}`;
    const featArray = pricing.features.split(',').map(f => f.trim());

    await setDoc(doc(db, "system", "scheduled_pricing"), {
      ...pricing,
      features: featArray,
      executionTime: executionKey,
      status: 'pending',
      scheduledBy: auth.currentUser?.email,
      createdAt: serverTimestamp()
    });

    // Log de actie in de geschiedenis
    await addDoc(collection(db, "system", "pricing_history", "logs"), {
      action: `Timer gezet voor ${pricing.name}`,
      user: auth.currentUser?.email,
      timestamp: serverTimestamp(),
      details: `Gepland voor: ${executionKey}`
    });

    alert(`Timer ingesteld! De prijzen gaan live op ${executionKey}.`);
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

  // --- FINANCIELE LOGICA ---
  const calculateFinances = () => {
    const now = new Date();
    const oneWeekAgo = now.getTime() - (7 * 24 * 60 * 60 * 1000);
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

    return users.reduce((acc, user) => {
      if (user.isApproved && user.subscriptionPrice) {
        const price = Number(user.subscriptionPrice) || 0;
        const createdAt = user.createdAt?.toDate().getTime() || now.getTime();

        // Monthly Recurring (Alles wat actief is)
        if (user.subscriptionStatus === 'active') {
          acc.mrr += price;
        }

        // Weekly (Nieuwe omzet afgelopen 7 dagen)
        if (createdAt > oneWeekAgo) {
          acc.weekly += price;
        }

        // YTD (Sinds 1 januari)
        if (createdAt > startOfYear) {
          acc.ytd += price;
        }
      }
      return acc;
    }, { mrr: 0, weekly: 0, ytd: 0 });
  };

  const finances = calculateFinances();

  // Injecteer de adminStyles in de head van de pagina
  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.innerHTML = adminStyles;
    document.head.appendChild(styleTag);
    return () => {
      if (document.head.contains(styleTag)) {
        document.head.removeChild(styleTag);
      }
    };
  }, []);

  if (loading) return <div style={{ padding: 60, textAlign: 'center' }}><ArrowsClockwise size={32} className="spinner" color="#4285F4" /></div>;


  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F5F5F7' }}>
      
      {/* SIDEBAR NAVIGATION */}
      <aside style={{ width: 280, background: 'white', borderRight: '1px solid #E5E5EA', padding: '30px 20px', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ marginBottom: 35, paddingLeft: 10 }}>
          <h1 style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '-0.8px', margin: 0, color: '#1D1D1F' }}>TCT ADMIN</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#30D158' }}></div>
            <span style={{ color: '#86868B', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>System Operational</span>
          </div>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto' }}>
          {menuGroups.map(group => (
            <div key={group.title} style={{ marginBottom: 28 }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#C7C7CC', marginBottom: 12, paddingLeft: 12, textTransform: 'uppercase', letterSpacing: '1px' }}>
                {group.title}
              </div>
              {group.items.map(tab => (
                <button 
                  key={tab.id} 
                  onClick={() => setActiveTab(tab.id)} 
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 14px', borderRadius: 12, border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer', marginBottom: 4,
                    background: activeTab === tab.id ? '#007AFF' : 'transparent', 
                    color: activeTab === tab.id ? 'white' : '#8E8E93',
                    transition: 'all 0.2s ease'
                  }}>
                  {React.cloneElement(tab.icon, { size: 18, weight: activeTab === tab.id ? "fill" : "bold" })} 
                  {tab.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main style={{ flex: 1, padding: '40px 50px', overflowY: 'auto' }}>
        
        {/* HEADER AREA */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <h2 style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-1px', margin: 0 }}>
            {menuGroups.flatMap(g => g.items).find(i => i.id === activeTab)?.label}
          </h2>

          <div style={{ display: 'flex', gap: 12 }}>
            <button 
              onClick={() => { navigator.clipboard.writeText(window.location.origin); setCopied(true); setTimeout(() => setCopied(false), 2000); }} 
              style={{ padding: '10px 18px', borderRadius: 12, background: '#FFF', border: '1px solid #E5E5EA', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                {copied ? <CheckCircle color="#30D158" weight="bold" /> : <LinkSimple weight="bold" />} Invite Link
            </button>
          </div>
        </header>

        {/* DYNAMISCHE CONTENT SECTIES */}
        <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>

      {activeTab === 'mission' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 25 }}>
            <div className="bento-card" style={{ background: 'white' }}>
              <span className="label-xs">TOTAL TRADERS</span>
              <div style={{ fontSize: 32, fontWeight: 900, marginTop: 10 }}>{totalUsers}</div>
              <div style={{ fontSize: 12, color: '#30D158', fontWeight: 700 }}>{newTradersThisWeek} new this week</div>
            </div>
            
            <div className="bento-card" style={{ background: 'white' }}>
              <span className="label-xs" style={{ color: '#FF9F0A' }}>PENDING AUDITS</span>
              <div style={{ fontSize: 32, fontWeight: 900, marginTop: 10 }}>{pendingAudits}</div>
              <div style={{ fontSize: 12, color: '#86868B' }}>Awaiting entrance</div>
            </div>

            <div className="bento-card" style={{ background: 'white' }}>
              <span className="label-xs" style={{ color: '#FF3B30' }}>CHURN RISK</span>
              <div style={{ fontSize: 32, fontWeight: 900, marginTop: 10 }}>{churnRisk}</div>
              <div style={{ fontSize: 12, color: '#86868B' }}>Cancelling or expiring</div>
            </div>

            <div className="bento-card" style={{ background: '#007AFF', color: 'white' }}>
              <span className="label-xs" style={{ opacity: 0.8 }}>ACTIVE TODAY</span>
              <div style={{ fontSize: 32, fontWeight: 900, marginTop: 10 }}>{activeToday}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Current platform load</div>
            </div>
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

      {/* FINANCIAL DASHBOARD TAB */}
      {activeTab === 'finance' && (
        <div style={{ display: 'grid', gap: 25 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            <div className="bento-card" style={{ background: 'linear-gradient(135deg, #1d1d1f 0%, #2c2c2e 100%)', color: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="label-xs" style={{ opacity: 0.6 }}>MONTHLY RECURRING (MRR)</span>
                <TrendUp size={20} color="#30D158" />
              </div>
              <div style={{ fontSize: 38, fontWeight: 900, marginTop: 15 }}>€{finances.mrr.toLocaleString()}</div>
              <div style={{ fontSize: 12, color: '#30D158', fontWeight: 700, marginTop: 5 }}>Verwachte jaaromzet: €{(finances.mrr * 12).toLocaleString()}</div>
            </div>

            <div className="bento-card" style={{ background: 'white' }}>
              <span className="label-xs" style={{ color: '#007AFF' }}>NEW THIS WEEK</span>
              <div style={{ fontSize: 32, fontWeight: 900, marginTop: 10 }}>€{finances.weekly.toLocaleString()}</div>
              <div style={{ fontSize: 12, color: '#86868B' }}>Vers kapitaal uit nieuwe subs</div>
            </div>

            <div className="bento-card" style={{ background: 'white' }}>
              <span className="label-xs">YEAR TO DATE (YTD)</span>
              <div style={{ fontSize: 32, fontWeight: 900, marginTop: 10 }}>€{finances.ytd.toLocaleString()}</div>
              <div style={{ fontSize: 12, color: '#86868B' }}>Totaal omzet in {new Date().getFullYear()}</div>
            </div>
          </div>

          {/* Retention & Growth Analysis */}
          <div className="bento-card" style={{ background: 'white' }}>
            <h3 style={{ fontSize: 16, fontWeight: 900, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
               <Pulse size={20} color="#AF52DE" /> Growth Analytics
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
               <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#8E8E93', marginBottom: 15 }}>LTV (LIFETIME VALUE) INDICATOR</div>
                  <div style={{ height: 10, background: '#F2F2F7', borderRadius: 5, overflow: 'hidden' }}>
                     <div style={{ width: '65%', height: '100%', background: '#AF52DE' }}></div>
                  </div>
                  <p style={{ fontSize: 11, color: '#86868B', marginTop: 10 }}>Je gemiddelde member blijft 6.4 maanden actief.</p>
               </div>
               <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#8E8E93', marginBottom: 15 }}>CHURN RATE (30D)</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#FF3B30' }}>
                    {totalUsers > 0 ? ((churnRisk / totalUsers) * 100).toFixed(1) : "0.0"}%
                  </div>
                  <p style={{ fontSize: 11, color: '#86868B', marginTop: 5 }}>Leden die hebben opgezegd of bijna verlopen.</p>
               </div>
            </div>
          </div>
        </div>
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
                onClick={async () => {
                  const mailText = intake.approvedAs === 'beta_tester' ? 'Beta invitation' : 'Standard invitation';
                  await navigator.clipboard.writeText(mailText); // Hier kun je de mail variabelen uit approveTrader gebruiken
                  alert("Invitation text copied!");
                }}
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
  <TraderRegistry 
    users={users} 
    searchTerm={searchTerm} 
    setSearchTerm={setSearchTerm} 
    formatExpiry={formatExpiry} 
    formatLastActive={formatLastActive} 
    activateTraderDirectly={activateTraderDirectly} 
    extendAccess={extendAccess} 
    revokeAccess={revokeAccess} 
    toggleFounder={toggleFounder} 
    deleteUser={deleteUser} 
    impersonateUser={impersonateUser}
  />
)}

      {activeTab === 'inbox' && (
  <InboxManager 
    inboxSearch={inboxSearch}
    setInboxSearch={setInboxSearch}
    inboxFilter={inboxFilter}
    setInboxFilter={setInboxFilter}
    filteredInbox={filteredInbox}
    selectedMessage={selectedMessage}
    setSelectedMessage={setSelectedMessage}
    closeTicket={closeTicket}
    deleteFeedbackItem={deleteFeedbackItem}
    replyText={replyText}
    setReplyText={setReplyText}
    replyAttachment={replyAttachment}
    setReplyAttachment={setReplyAttachment}
    generateAiDraft={generateAiDraft}
    isAiLoading={isAiLoading}
    handleAdminFileChange={handleAdminFileChange}
    sendReply={sendReply}
  />
)}

     {activeTab === 'content' && (
  <ContentManager 
  faqs={faqs}
  setShowFaqModal={setShowFaqModal}
  pricing={pricing}
  setPricing={setPricing} 
  setNewFaq={setNewFaq}
  newFaq={newFaq}
  handleAddFaq={handleAddFaq}
  handleUpdatePricing={handleUpdatePricing}
  scheduledChange={scheduledChange}
  setScheduledChange={setScheduledChange}
  handleSchedulePrice={handleSchedulePrice}
  priceLogs={priceLogs}
/>
)}

{/* Logs & Settings Tabs */}
      {(activeTab === 'logs' || activeTab === 'settings') && (
        <SystemManager 
          activeTab={activeTab} 
          tctLogs={tctLogs} 
          settings={settings} 
          updateGlobalSetting={updateGlobalSetting} 
        />
      )}

     {/* FAQ ORDER MODAL */}
      {showFaqModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', width: '100%', maxWidth: 600, borderRadius: 30, padding: 40, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
              <h2 style={{ margin: 0, fontWeight: 900 }}>FAQ Management</h2>
              <button onClick={() => setShowFaqModal(false)} style={{ background: '#F2F2F7', border: 'none', padding: '10px 20px', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}>Close</button>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {faqs.map((faq) => (
                <div key={faq.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 15, background: '#F9F9FB', borderRadius: 16, border: '1px solid #E5E5EA' }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{faq.question}</span>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button onClick={() => moveFaq(faq.id, faq.order, 'up')} style={{ border: 'none', background: 'white', padding: 5, borderRadius: 6, cursor: 'pointer' }}>↑</button>
                    <button onClick={() => moveFaq(faq.id, faq.order, 'down')} style={{ border: 'none', background: 'white', padding: 5, borderRadius: 6, cursor: 'pointer' }}>↓</button>
                    <button onClick={() => deleteFaq(faq.id)} style={{ border: 'none', background: 'none', color: '#FF3B30', cursor: 'pointer', marginLeft: 10 }}><Trash size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

        </div> {/* Einde van de animatie wrapper */}
      </main>
    </div> 
  ); 
} 

export default Admin;