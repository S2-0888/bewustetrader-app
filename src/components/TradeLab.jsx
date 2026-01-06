import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Trash, X, Wallet, Gear,
  Smiley, SmileySad, SmileyMeh, 
  SmileyNervous, Plus, PlusCircle, Blueprint, ArrowSquareOut, CaretDown, Lightning, Scales, Info,
  Microphone, StopCircle, Waves, Sparkle, CheckCircle, Ghost, ShieldCheck, Eye // <--- CHECK 1: Toegevoegd voor checklist icons
} from '@phosphor-icons/react';

// --- HELPER COMPONENT: VOICE NOTE INPUT (Advanced Context Version) ---
function VoiceNoteInput({ onTranscriptionComplete, onFeedbackReceived, tradeContext }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };
      
      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        await handleTranscription(audioBlob);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied", err);
      alert("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current) {
        mediaRecorder.current.stop();
        setIsRecording(false);
    }
  };

  const handleTranscription = async (blob) => {
    setIsTranscribing(true);

    const formData = new FormData();
    formData.append('audio', blob);
    
    if (tradeContext) {
        const contextData = {
            pair: tradeContext.pair || "Unknown",
            direction: tradeContext.direction || "Long",
            strategy: tradeContext.strategy || "Unknown",
            risk: tradeContext.risk || 0,
            pnl: tradeContext.pnl || 0,
            commission: tradeContext.commission || 0,
            mistakes: tradeContext.mistake || [],
            emotion: tradeContext.emotion || "Neutral",
            entryPrice: tradeContext.entryPrice,
            exitPrice: tradeContext.exitPrice, 
            slPrice: tradeContext.slPrice, 
            tpPrice: tradeContext.tpPrice, 
            maePrice: tradeContext.maePrice, 
            mfePrice: tradeContext.mfePrice
        };
        formData.append('tradeContext', JSON.stringify(contextData));
    }

    try {
      const response = await fetch('https://analyzevoicetrade-zxpdz2eyba-ew.a.run.app', { 
        method: 'POST', 
        body: formData 
      });
      const data = await response.json();

      if (data.journal_entry) {
        onTranscriptionComplete(data.journal_entry);
        if (onFeedbackReceived && data.direct_feedback) {
           onFeedbackReceived(data.direct_feedback, {
               score: data.score,
               emotion: data.emotion_tag,
               shadow: data.shadow_analysis
           });
        }
      }
    } catch (error) {
      console.error("AI Voice Error:", error);
      alert("AI Coach could not process the audio.");
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 15, padding: '15px', background: isRecording ? 'rgba(255, 59, 48, 0.05)' : '#F8F9FB', borderRadius: '16px', border: isRecording ? '1px solid #FF3B30' : '1px solid #E5E5EA', marginBottom: '15px', transition: '0.3s' }}>
      {!isRecording ? (
        <button type="button" onClick={startRecording} style={{ background: '#007AFF', color: 'white', border: 'none', borderRadius: '50%', width: 40, height: 40, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0, 122, 255, 0.2)' }}>
          <Microphone size={20} weight="fill" />
        </button>
      ) : (
        <button type="button" onClick={stopRecording} style={{ background: '#FF3B30', color: 'white', border: 'none', borderRadius: '50%', width: 40, height: 40, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse-slow 1.5s infinite' }}>
          <StopCircle size={20} weight="fill" />
        </button>
      )}
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: 13, fontWeight: 700, display: 'block', color: isRecording ? '#FF3B30' : '#1C1C1E' }}>
          {isRecording ? "Listening to your thoughts..." : isTranscribing ? "TCT Coach is analyzing data & voice..." : "Record Voice Reflection"}
        </span>
        <span style={{ fontSize: 11, color: '#86868B' }}>
          {isRecording ? "Stop to finalize note" : "Tap to speak. Vent your emotions."}
        </span>
      </div>
      {isRecording && <Waves size={24} color="#FF3B30" weight="bold" />}
    </div>
  );
}

const FieldInfo = ({ title, text }) => {
    const [visible, setVisible] = useState(false);
    return (
        <div style={{ position: 'relative', display: 'inline-block', marginLeft: '6px' }}>
            <Info size={14} weight="bold" style={{ cursor: 'help', color: '#007AFF', opacity: 0.8 }} onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}/>
            {visible && (
                <div style={{ position: 'absolute', bottom: '100%', left: '0', transform: 'translateX(-10px)', width: '240px', background: '#1C1C1E', color: 'white', padding: '12px', borderRadius: '12px', fontSize: '11px', zIndex: 2100, marginBottom: '8px', boxShadow: '0 15px 35px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <p style={{ margin: 0, fontWeight: 900, color: '#0A84FF', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</p>
                    <p style={{ margin: 0, lineHeight: '1.5', color: '#E5E5EA' }}>{text}</p>
                </div>
            )}
        </div>
    );
};

const DEFAULT_CONFIG = {
    strategies: ["Breakout", "Pullback", "Reversal"],
    mistakes: ["FOMO", "Revenge Trading", "Size Too Large", "Moved Stoploss"],
    rules: ["Max 1% Risk", "Wait for Candle Close", "No Impulsive Entry", "Stoploss Placed"]
};

const EMOTIONS = [
    { label: 'Neutral', icon: <SmileyMeh size={20}/>, color: '#86868B' },
    { label: 'Confident', icon: <Smiley size={20}/>, color: '#30D158' },
    { label: 'Anxious', icon: <SmileyNervous size={20}/>, color: '#FF9F0A' },
    { label: 'Greed/Tilt', icon: <SmileySad size={20}/>, color: '#FF3B30' },
];

export default function TradeLab() {
  const [trades, setTrades] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [showPriceFields, setShowPriceFields] = useState(true); 
  const [editingTrade, setEditingTrade] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [tctFeedback, setTctFeedback] = useState(''); 
  const [showRules, setShowRules] = useState(() => localStorage.getItem('tct_show_rules') === 'true');
  const [activeProtocols, setActiveProtocols] = useState([]);
  const [incomingSyncs, setIncomingSyncs] = useState([]);
  const [selectedSyncDetail, setSelectedSyncDetail] = useState(null);
  const [activeTab, setActiveTab] = useState('review'); // 'pretrade' of 'review'
  const [isReadOnlyMode, setIsReadOnlyMode] = useState(false);
  const [validationError, setValidationError] = useState(''); // Nieuwe state voor elegante meldingen

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsubUser = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) setActiveProtocols(snap.data().activeProtocols || []);
    });

    const unsubSync = onSnapshot(collection(db, "users", user.uid, "incoming_syncs"), (snap) => {
      setIncomingSyncs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubUser(); unsubSync(); };
  }, []);

  useEffect(() => {
    localStorage.setItem('tct_show_rules', showRules);
  }, [showRules]);

  const [closingTrade, setClosingTrade] = useState(null); 
  const [closeExitPrice, setCloseExitPrice] = useState(''); 
  const [closeGrossPnl, setCloseGrossPnl] = useState(''); 
  const [closeCommission, setCloseCommission] = useState(''); 
  const [closePnl, setClosePnl] = useState(''); 

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    accountId: '', pair: '', direction: 'LONG', 
    strategy: '', risk: '', isAligned: false, checkedRules: [],
    entryPrice: '', slPrice: '', tpPrice: ''
  });

  useEffect(() => {
    const entry = parseFloat(form.entryPrice);
    const sl = parseFloat(form.slPrice);
    if (!isNaN(entry) && !isNaN(sl)) {
      if (entry > sl && form.direction !== 'LONG') setForm(prev => ({ ...prev, direction: 'LONG' }));
      else if (entry < sl && form.direction !== 'SHORT') setForm(prev => ({ ...prev, direction: 'SHORT' }));
    }
  }, [form.entryPrice, form.slPrice, form.direction]);

  const handleFocus = (e) => e.target.select();

  const updateNetPnl = (gross, comm) => {
    const net = Number(gross || 0) - Math.abs(Number(comm || 0));
    setClosePnl(net.toFixed(2));
  };

  useEffect(() => {
    const handleResize = () => {
        const mobile = window.innerWidth < 768;
        setIsMobile(mobile);
        if (mobile) setIsProMode(false);
    };
    window.addEventListener('resize', handleResize);
    const user = auth.currentUser;
    if (!user) return;
    onSnapshot(query(collection(db, "users", user.uid, "trades"), orderBy("date", "desc")), (snap) => {
      setTrades(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    onSnapshot(query(collection(db, "users", user.uid, "accounts")), (snap) => {
      setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() }))); 
    });
    getDoc(doc(db, "users", user.uid, "settings", "tradelab")).then(docSnap => {
      if (docSnap.exists()) setConfig(docSnap.data());
    });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!editingTrade || !editingTrade.id) return;
    const autoSaveTimer = setTimeout(async () => {
        const net = Number(editingTrade.grossPnl || 0) - Math.abs(Number(editingTrade.commission || 0));
        await updateDoc(doc(db, "users", auth.currentUser.uid, "trades", editingTrade.id), {
            ...editingTrade, pnl: net
        });
    }, 2000);
    return () => clearTimeout(autoSaveTimer);
  }, [editingTrade]); 

  const handleSimpleOpen = async (e) => {
    e.preventDefault();
    const selectedFormAccount = accounts.find(a => a.id === form.accountId);
    if (!selectedFormAccount) return;

    // 1. Definieer de score en het risico bedrag
    const score = form.isAligned ? 100 : 0; 
    const riskAmount = Math.abs(Number(form.risk));
    
    // 2. Bewuste keuze bij overtreding
    if (!form.isAligned) {
        const confirmViolation = confirm("Let op: Deze trade voldoet NIET aan je protocollen. Je discipline score wordt 0. Doorgaan?");
        if (!confirmViolation) return;
    }

    await addDoc(collection(db, "users", auth.currentUser.uid, "trades"), {
      ...form, 
      entryPrice: form.entryPrice ? Number(form.entryPrice) : null,
      slPrice: form.slPrice ? Number(form.slPrice) : null,
      risk: riskAmount, 
      status: 'OPEN', 
      pnl: 0, 
      commission: 0,
      isAdvanced: false, 
      createdAt: new Date(), 
      accountName: selectedFormAccount.firm, 
      accountNumber: selectedFormAccount.accountNumber, 
      disciplineScore: score 
    });
    
    // Reset formulier
    setForm(prev => ({ ...prev, pair: '', risk: '', entryPrice: '', slPrice: '', tpPrice: '', isAligned: false, checkedRules: [] }));
};


  const executeCloseTrade = async (e) => {
    e.preventDefault();
    if (!closingTrade) return;

    // --- LOGIC VALIDATION CHECK ---
    const entry = Number(closingTrade.entryPrice);
    const exit = Number(closeExitPrice);
    const direction = closingTrade.direction;
    const gross = Number(closeGrossPnl);

    if (direction === 'LONG' && exit < entry && gross > 0) {
        if (!window.confirm("DATA INCONSISTENCY: For a LONG trade, the exit price is lower than the entry price. This should be a loss, but you entered a profit. Are you sure?")) return;
    }
    if (direction === 'SHORT' && exit > entry && gross > 0) {
        if (!window.confirm("DATA INCONSISTENCY: For a SHORT trade, the exit price is higher than the entry price. This should be a loss, but you entered a profit. Are you sure?")) return;
    }
    
    await updateDoc(doc(db, "users", auth.currentUser.uid), { lastAiUpdate: null });
    await updateDoc(doc(db, "users", auth.currentUser.uid, "trades", closingTrade.id), {
        status: 'CLOSED', 
        pnl: Number(closePnl), 
        exitPrice: Number(closeExitPrice),
        grossPnl: Number(closeGrossPnl), 
        commission: Number(closeCommission || 0), 
        maePrice: Number(closingTrade.maePrice || 0), // Zorg dat deze mee gaat
        mfePrice: Number(closingTrade.mfePrice || 0), // Zorg dat deze mee gaat
        closedAt: new Date(), 
        actualExits: [{ price: Number(closeExitPrice) }]
    });
    setClosingTrade(null); setClosePnl(''); setCloseExitPrice(''); setCloseCommission(''); setCloseGrossPnl('');
  };

  const handleUpdateTrade = async (e) => {
    e.preventDefault();
    if (!editingTrade) return;
    setValidationError(''); // Reset bij elke poging

    // --- LOGIC VALIDATION CHECK ---
    const entry = Number(editingTrade.entryPrice);
    const exit = Number(editingTrade.actualExits?.[0]?.price || editingTrade.exitPrice);
    const direction = editingTrade.direction;
    const gross = Number(editingTrade.grossPnl || editingTrade.profit || 0); // Hier wordt 'gross' nu gedeclareerd
    const comm = Math.abs(Number(editingTrade.commission || 0));
    const net = gross - comm;

    if ((direction === 'LONG' && exit < entry && gross > 0) || 
        (direction === 'SHORT' && exit > entry && gross > 0)) {
        setValidationError("EXECUTION ERROR: The price action contradicts the profit entered. Please verify your data.");
        return; // Stopt de opslag zonder lelijke popup
    }

    if (direction === 'LONG' && exit < entry && gross > 0) {
        if (!window.confirm("EXECUTION ERROR: The price action (Long + Exit < Entry) contradicts the profit entered. Please verify your MT5 data before finalizing.")) return;
    }
    if (direction === 'SHORT' && exit > entry && gross > 0) {
        if (!window.confirm("EXECUTION ERROR: The price action (Short + Exit > Entry) contradicts the profit entered. Please verify your MT5 data before finalizing.")) return;
    }

    await updateDoc(doc(db, "users", auth.currentUser.uid), { lastAiUpdate: null });

    await updateDoc(doc(db, "users", auth.currentUser.uid, "trades", editingTrade.id), {
        ...editingTrade, 
        pnl: net,
        maePrice: Number(editingTrade.maePrice || 0),
        mfePrice: Number(editingTrade.mfePrice || 0),
        reviewCompleted: true, // De cirkel wordt gesloten [cite: 2026-01-04]
        status: 'CLOSED'
    });
    setEditingTrade(null);
    setTctFeedback(''); 
  };

  // --- NIEUW: Verwerkt de koppeling tussen MT5 data en jouw plan ---
  const handleSmartLink = async (tradeId, mt5Data) => {
    const user = auth.currentUser;
    const tradeRef = doc(db, "users", user.uid, "trades", tradeId);
    
    try {
        await updateDoc(tradeRef, {
            mt5_ticket: mt5Data.ticket,
            exitPrice: Number(mt5Data.close_price || 0),
            grossPnl: Number(mt5Data.profit || 0),
            commission: Number(mt5Data.commission || 0),
            pnl: Number(mt5Data.pnl || mt5Data.profit || 0),
            status: 'CLOSED',
            closedAt: serverTimestamp(),
            notes: `Matched via Close Modal. Ticket: ${mt5Data.ticket}.`
        });
        await deleteDoc(doc(db, "users", user.uid, "incoming_syncs", mt5Data.id));
        setClosingTrade(null); // Sluit de modal
        alert("Execution linked and trade closed!");
    } catch (err) { console.error(err); }
};

  const handleCreateNoPlanTrade = async (mt5Data) => {
    const user = auth.currentUser;
    if (!confirm("Dit was een trade zonder plan (Shadow Event). Loggen voor analyse?")) return;
    await addDoc(collection(db, "users", user.uid, "trades"), {
        date: new Date().toISOString().split('T')[0],
        pair: mt5Data.symbol,
        accountNumber: mt5Data.account_number,
        status: 'CLOSED',
        pnl: Number(mt5Data.pnl),
        mt5_ticket: mt5Data.ticket,
        disciplineScore: 0,
        mistake: ["No Plan"],
        notes: "Automatically logged as unplanned trade."
    });
    await deleteDoc(doc(db, "users", user.uid, "incoming_syncs", mt5Data.id));
  };

  // Splits trades in Active (OPEN) en History (CLOSED < 30 dagen)
  // --- FILTER LOGICA VOOR DASHBOARD SCHOONMAAK ---
  const activeTrades = trades
  .filter(t => t.status === 'OPEN')
  .sort((a, b) => new Date(b.date) - new Date(a.date));

  const pendingReviewTrades = trades
  .filter(t => t.status === 'CLOSED' && !t.reviewCompleted)
  .sort((a, b) => new Date(b.closedAt?.seconds * 1000 || b.date) - new Date(a.closedAt?.seconds * 1000 || a.date));
  
  const historyTrades = trades.filter(t => {
    if (t.status === 'OPEN') return false; // Alleen gesloten trades
    
    const tradeDate = new Date(t.date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return tradeDate > thirtyDaysAgo; // Alleen van de laatste 30 dagen
  }).slice(0, 10); // Toon er maximaal 10 op dit scherm

  const openReviewModal = (trade, readOnly = false) => {
    setIsReadOnlyMode(readOnly); // Zet de modus voor de UI [cite: 2026-01-04]
    setTctFeedback(trade.aiFeedback || ''); 
    setEditingTrade({ 
        ...trade, 
        actualExits: trade.actualExits || (trade.exitPrice ? [{price: trade.exitPrice}] : [{ price: '' }]) 
    });
  };
  

  return (
    <div style={{ padding: isMobile ? '15px' : '40px 20px', maxWidth: 1200, margin: '0 auto', paddingBottom: 100 }}>
      
      <div style={{ marginBottom: 30, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
            <h1 style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 800, margin: 0 }}>Trade Lab</h1>
            {!isMobile && <p style={{ color: '#86868B', fontSize: 14 }}>Operations & Review</p>}
        </div>
        
      </div>


        <div className="bento-card" style={{ borderTop: '4px solid #007AFF', padding: isMobile ? 20 : 25 }}>
          <form onSubmit={handleSimpleOpen}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: 30 }}>
                  <div>
                      <div className="label-xs" style={{ marginBottom: 15, color: '#007AFF' }}>QUICK LOG</div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:15, marginBottom:15 }}>
                          <input className="apple-input" placeholder="Ticker" value={form.pair} onChange={e => setForm({...form, pair: e.target.value.toUpperCase()})} required />
                          <select className="apple-input" value={form.accountId} onChange={e => setForm({...form, accountId: e.target.value})} required>
                              <option value="">Account...</option>
                              {accounts.filter(a => a.status === 'Active').map(acc => (<option key={acc.id} value={acc.id}>{acc.firm} — {acc.accountNumber}</option>))}
                          </select>
                      </div>
                      <div style={{ marginBottom: 15, background: '#F5F5F7', padding: '12px', borderRadius: 12 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, fontWeight:700 }}>
                            <Scales size={18} color="#007AFF" /> PRICE ARCHITECTURE
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 15 }}>
                            <input type="number" step="any" className="apple-input" placeholder="Entry" onFocus={handleFocus} value={form.entryPrice} onChange={e => setForm({...form, entryPrice: e.target.value})} />
                            <input type="number" step="any" className="apple-input" placeholder="SL" onFocus={handleFocus} value={form.slPrice} onChange={e => setForm({...form, slPrice: e.target.value})} />
                            <input type="number" step="any" className="apple-input" placeholder="TP" onFocus={handleFocus} value={form.tpPrice} onChange={e => setForm({...form, tpPrice: e.target.value})} />
                        </div>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:15 }}>
                          <input type="number" step="any" min="0" placeholder="Risk ($)" className="apple-input" onFocus={handleFocus} value={form.risk} onChange={e => setForm({...form, risk: e.target.value.replace('-','')})} required />
                          <div style={{ display:'flex', height: 42, background:'#E5E5EA', borderRadius:8, padding: 2 }}>
                                <button type="button" onClick={() => setForm({...form, direction: 'LONG'})} style={{ flex:1, border:'none', borderRadius:6, fontSize:10, fontWeight:800, background: form.direction === 'LONG' ? 'white' : 'transparent', color: form.direction === 'LONG' ? '#30D158' : '#86868B' }}>LONG</button>
                                <button type="button" onClick={() => setForm({...form, direction: 'SHORT'})} style={{ flex:1, border:'none', borderRadius:6, fontSize:10, fontWeight:800, background: form.direction === 'SHORT' ? 'white' : 'transparent', color: form.direction === 'SHORT' ? '#FF3B30' : '#86868B' }}>SHORT</button>
                          </div>
                      </div>

                      {isMobile && (
                        <div style={{ marginTop: 15, padding: '10px 0', borderTop: '1px solid #E5E5EA' }}>
                            <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontSize:12, color: '#86868B' }}>
                              <input 
                                type="checkbox" 
                                checked={form.isAligned} 
                                onChange={e => setForm(p => ({
                                    ...p, 
                                    isAligned: e.target.checked, 
                                    checkedRules: e.target.checked ? (config.rules || []) : []
                                }))} 
                              /> Aligned with Plan?
                            </label>
                        </div>
                      )}

                      <button 
                        type="submit" 
                        className="btn-primary" 
                        style={{ 
                            width: '100%', 
                            height: 44, 
                            marginTop: 10, 
                            borderRadius: 14,
                            background: form.isAligned ? '#1D1D1F' : '#FF3B30', // Zwart bij OK, Rood bij overtreding
                            color: 'white',
                            cursor: 'pointer',
                            border: 'none',
                            fontWeight: 800,
                            transition: '0.3s ease'
                        }}
                    >
                        {form.isAligned 
                        ? 'OPEN POSITION' 
                        : 'OPEN NON-COMPLIANT POSITION'} 
                    </button>
                    </div>

                  {!isMobile && (
                    <div style={{ background: '#F9F9F9', borderRadius: 16, padding: 20 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 10 }}>
                            <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontSize:13, fontWeight:700 }}>
                              <input type="checkbox" checked={form.isAligned} onChange={e => setForm(p => ({...p, isAligned: e.target.checked, checkedRules: e.target.checked ? (config.rules || []) : []}))} /> Aligned with Plan?
                            </label>
                            <CaretDown size={18} style={{ cursor:'pointer', transform: showRules ? 'rotate(180deg)' : 'none', transition: '0.2s' }} onClick={() => setShowRules(!showRules)} />
                        </div>
                        {showRules && (
    <div style={{ display:'grid', gap:8, background: 'white', padding: 12, borderRadius: 10, marginTop: 10 }}>
        <p style={{ fontSize: 9, fontWeight: 900, color: '#8E8E93', textTransform: 'uppercase', marginBottom: 5 }}>
            Active Protocol Checklist
        </p>
        
        {/* De Standaard Regels */}
        {(config.rules || []).map(r => (
            <div key={r} style={{ fontSize:11, display:'flex', alignItems:'center', gap:8, color: form.isAligned ? '#30D158' : '#1C1C1E', transition: '0.2s' }}>
                <CheckCircle size={14} weight={form.isAligned ? "fill" : "regular"} /> 
                <span style={{ opacity: form.isAligned ? 1 : 0.7 }}>{r}</span>
            </div>
        ))}

        {/* DE ADAPTIVE RULES (HET CONTRACT) */}
        {activeProtocols.map((p, idx) => (
            <div key={`protocol-rule-${idx}`} style={{ 
                fontSize:11, display:'flex', alignItems:'center', gap:8, 
                color: form.isAligned ? '#007AFF' : '#FF3B30', 
                fontWeight: 700,
                padding: '4px 8px',
                background: form.isAligned ? 'rgba(0, 122, 255, 0.05)' : 'rgba(255, 59, 48, 0.05)',
                borderRadius: '6px',
                borderLeft: `3px solid ${form.isAligned ? '#007AFF' : '#FF3B30'}`,
                marginTop: '4px'
            }}>
                <ShieldCheck size={14} weight="fill" /> 
                <span>{p.text}</span>
            </div>
        ))}
        </div>
        )}
                    </div>
                  )}
              </div>
          </form>
        </div>

      <div style={{ marginTop: 30 }}>
        {/* --- SECTION 1: UNMATCHED MT5 TRADES (High-End Grid) --- */}
        {incomingSyncs.length > 0 && (
          <div style={{ marginBottom: 35 }}>
            <div className="label-xs" style={{ color: '#FF9F0A', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Lightning size={14} weight="fill" /> {incomingSyncs.length} UNMATCHED MT5 EXECUTION{incomingSyncs.length > 1 ? 'S' : ''}
            </div>
            
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', 
                gap: 12 
            }}>
              {incomingSyncs.map(sync => {
                const netPnl = Number(sync.pnl || sync.profit || 0);
                const fee = Math.abs(Number(sync.commission || 0)) + Math.abs(Number(sync.swap || 0));

                return (
                  <div key={sync.id} className="bento-card" style={{ 
                      borderTop: `3px solid ${netPnl >= 0 ? '#30D158' : '#FF453A'}`, 
                      padding: '12px', background: '#FFF', borderRadius: '14px',
                      display: 'flex', flexDirection: 'column', gap: 10
                  }}>
                    {/* Ticker - Firm - P&L */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: 15 }}>{sync.symbol}</div>
                        <div style={{ fontSize: 9, color: '#86868B', fontWeight: 600 }}>{sync.firm || 'MT5 Sync'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 900, fontSize: 16, color: netPnl >= 0 ? '#30D158' : '#FF453A' }}>
                          {netPnl >= 0 ? `+$${netPnl.toFixed(2)}` : `-$${Math.abs(netPnl).toFixed(2)}`}
                        </div>
                        <div style={{ fontSize: 8, color: '#86868B' }}>Fee: ${fee.toFixed(2)}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 6 }}>
                      <select 
                        style={{ flex: 1, padding: '7px', borderRadius: '10px', fontSize: '10px', border: '1px solid #E5E5EA', background: 'white', fontWeight: 700, cursor: 'pointer' }}
                        onChange={(e) => { if(e.target.value) handleLinkTrade(e.target.value, sync) }}
                      >
                        <option value="">Link to Plan...</option>
                        {activeTrades.map(t => <option key={t.id} value={t.id}>{t.pair} ({t.direction})</option>)}
                      </select>
                      <button onClick={() => setSelectedSyncDetail(sync)} style={{ background: '#F2F2F7', border: 'none', width: '34px', height: '34px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Info size={18} weight="bold" color="#007AFF" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gap: 30, marginTop: 30 }}>
          
          {/* --- FASE 1: ACTIVE OPERATIONS (Immutable Plans) --- */}
          <div className="bento-card" style={{ padding: 0, overflow: 'hidden', borderLeft: '4px solid #007AFF' }}>
            <div className="label-xs" style={{ padding: '15px 20px', background: '#F9F9F9', color: '#007AFF', display: 'flex', justifyContent: 'space-between' }}>
              <span>ACTIVE OPERATIONS (PLANS)</span>
              <span style={{ fontSize: 9, opacity: 0.5 }}>IMMUTABLE FASE</span>
            </div>
            <table className="apple-table">
            <thead>
                <tr>
                <th>DATE</th>
                <th>TICKER</th>
                <th>ACCOUNT</th>
                <th>PLANNED RISK</th>
                <th style={{ textAlign: 'right', paddingRight: '40px' }}>ACTION</th>
                </tr>
            </thead>
            <tbody>
                {activeTrades.map(trade => (
                <tr key={trade.id} className="hover-row">
                    <td style={{ fontSize: '11px', color: '#86868B' }}>
                      {new Date(trade.date).toLocaleDateString('nl-NL')} <br/>
                      <span style={{ fontSize: '9px', opacity: 0.6 }}>{new Date(trade.date).toLocaleTimeString('nl-NL', {hour: '2-digit', minute:'2-digit'})}</span>
                    </td>
                    <td style={{ fontWeight: 700 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {trade.pair} 
                        <span style={{ fontSize: 9, color: trade.direction === 'LONG' ? '#30D158' : '#FF3B30' }}>
                        {trade.direction}
                        </span>
                    </div>
                    </td>
                    <td>
                    <div style={{ fontWeight: 600, fontSize: '12px' }}>{trade.accountName}</div>
                    <div style={{ fontSize: '10px', color: '#86868B' }}>#{trade.accountNumber || 'N/A'}</div>
                    </td>
                    <td style={{ fontWeight: 700, fontSize: '14px' }}>${trade.risk}</td>
                    <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
                        <button 
                            onClick={() => openReviewModal(trade, true)} 
                            style={{ 
                                background: 'rgba(0, 122, 255, 0.05)', 
                                border: '1px solid rgba(0, 122, 255, 0.1)', 
                                borderRadius: '10px', 
                                padding: '10px 14px', 
                                cursor: 'pointer', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 6 
                            }}
                        >
                            <Eye size={16} color="#007AFF" weight="bold" />
                            <span style={{ fontSize: 11, fontWeight: 800, color: '#007AFF' }}>PEEK</span>
                        </button>

                        <button 
                        onClick={(e) => { e.stopPropagation(); setClosingTrade(trade); }} 
                        style={{ 
                            background: 'rgba(0, 122, 255, 0.1)', 
                            color: '#007AFF', 
                            border: '1px solid rgba(0, 122, 255, 0.2)', 
                            borderRadius: '12px', 
                            padding: '12px 24px', 
                            minWidth: '220px', 
                            fontSize: 11, 
                            fontWeight: 800, 
                            letterSpacing: '0.5px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                        >
                        CLOSE & REVIEW
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* --- FASE 2: READY FOR REVIEW (The Waiting Room) --- */}
          {trades.filter(t => t.status === 'CLOSED' && !t.reviewCompleted).length > 0 && (
            <div className="bento-card" style={{ padding: 0, overflow: 'hidden', borderLeft: '4px solid #FF9F0A' }}>
  <div className="label-xs" style={{ padding: '15px 20px', background: '#FFFBF2', color: '#FF9F0A' }}>
    ⚠️ PENDING BEHAVIORAL REVIEW
  </div>
  <table className="apple-table">
    <thead>
      <tr>
        <th>DATE</th>
        <th>TICKER</th>
        <th>ACCOUNT</th>
        <th>P&L</th>
        <th style={{ textAlign: 'right', paddingRight: '40px' }}>ACTION</th>
      </tr>
    </thead>
    <tbody>
      {pendingReviewTrades.map(trade => (
        <tr key={trade.id} className="hover-row">
          <td style={{ fontSize: '11px', color: '#86868B' }}>
            {new Date(trade.date).toLocaleDateString('nl-NL')} <br/>
            <span style={{ fontSize: '9px', opacity: 0.6 }}>{new Date(trade.date).toLocaleTimeString('nl-NL', {hour: '2-digit', minute:'2-digit'})}</span>
          </td>
          <td style={{ fontWeight: 700 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {trade.pair} 
              <span style={{ fontSize: 9, color: trade.direction === 'LONG' ? '#30D158' : '#FF3B30' }}>
                {trade.direction}
              </span>
            </div>
          </td>
          <td>
            <div style={{ fontWeight: 600, fontSize: '12px' }}>{trade.accountName}</div>
            <div style={{ fontSize: '10px', color: '#86868B' }}>#{trade.accountNumber || 'N/A'}</div>
          </td>
          <td style={{ fontWeight: 800, fontSize: '14px', color: (trade.pnl || 0) >= 0 ? '#30D158' : '#FF453A' }}>
            {trade.pnl >= 0 ? '+' : ''}${Number(trade.pnl || 0).toFixed(2)}
          </td>
          <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                        <button 
                            onClick={() => openReviewModal(trade, false)}
                            className="btn-primary" 
                            style={{ 
                            background: 'linear-gradient(135deg, #FF9F0A 0%, #FF3B30 100%)', 
                            border: 'none', 
                            padding: '12px 24px', 
                            minWidth: '220px', // Exact dezelfde breedte als de blauwe knop
                            fontSize: 11, 
                            fontWeight: 800, 
                            borderRadius: '12px',
                            color: 'white',
                            letterSpacing: '0.5px',
                            boxShadow: '0 4px 15px rgba(255, 159, 10, 0.2)',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            COMPLETE REVIEW
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* --- FASE 3: RECENT HISTORY (Locked & Read-Only Archive) --- */}
          <div className="bento-card" style={{ padding: 0, overflow: 'hidden', opacity: 0.85 }}>
            <div className="label-xs" style={{ padding: '15px 20px', background: '#F9F9F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#86868B' }}>RECENT HISTORY (LOCKED)</span>
              <button 
                onClick={() => window.location.href = '/finance'} 
                style={{ border: 'none', background: 'none', color: '#007AFF', fontSize: '10px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                VIEW FULL ARCHIVE <ArrowSquareOut size={12} />
              </button>
            </div>
            <table className="apple-table">
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>TICKER</th>
                  <th>ACCOUNT</th>
                  <th>NET P&L</th>
                  <th style={{ textAlign: 'right', paddingRight: '40px' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {historyTrades.map(trade => (
                  <tr key={trade.id} className="hover-row">
                    <td style={{ fontSize: '11px', color: '#86868B' }}>
                      {new Date(trade.date).toLocaleDateString('nl-NL')}
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {trade.pair} 
                        <span style={{ fontSize: 9, color: trade.direction === 'LONG' ? '#30D158' : '#FF3B30', opacity: 0.7 }}>
                          {trade.direction}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '12px', color: '#1C1C1E' }}>{trade.accountName}</div>
                      <div style={{ fontSize: '10px', color: '#86868B' }}>#{trade.accountNumber || 'N/A'}</div>
                    </td>
                    <td style={{ fontWeight: 800, color: (trade.pnl || 0) >= 0 ? '#30D158' : '#FF453A' }}>
                      ${Number(trade.pnl || 0).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
                        <ShieldCheck size={18} color="#30D158" weight="fill" />
                        <button 
                          onClick={() => openReviewModal(trade, true)}
                          style={{ 
                            background: 'rgba(142, 142, 147, 0.1)', 
                            color: '#8E8E93', 
                            border: '1px solid rgba(142, 142, 147, 0.2)', 
                            borderRadius: '10px', 
                            padding: '8px 18px', 
                            minWidth: '220px', // Exact dezelfde breedte als de actieve knoppen voor strakke uitlijning
                            fontSize: 10, 
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: '0.2s'
                          }}
                        >
                          VIEW ARCHIVE
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {closingTrade && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:3000, padding: 20 }}>
            <div className="bento-card" style={{ width: '100%', maxWidth: 420, padding: 30 }}>
                <h3 style={{ margin:0, fontWeight:900, textAlign: 'center', marginBottom: 20 }}>Close {closingTrade.pair}</h3>
                
                {/* --- SUGGESTED MT5 EXECUTIONS --- */}
                {incomingSyncs.filter(s => String(s.account_number) === String(closingTrade.accountNumber)).length > 0 && (
                    <div style={{ marginBottom: 25, padding: '15px', background: '#FFFBF2', border: '1px solid #FF9F0A40', borderRadius: '14px' }}>
                        <div style={{ fontSize: 10, fontWeight: 900, color: '#FF9F0A', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Lightning size={14} weight="fill" /> MATCHING MT5 EXECUTIONS FOUND
                        </div>
                        <div style={{ display: 'grid', gap: 8 }}>
                            {incomingSyncs
                                .filter(s => String(s.account_number) === String(closingTrade.accountNumber))
                                .map(sync => (
                                    <div key={sync.id} onClick={() => handleSmartLink(closingTrade.id, sync)} style={{ background: 'white', padding: '10px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', border: '1px solid #E5E5EA' }}>
                                        <div>
                                            <div style={{ fontWeight: 800, fontSize: 13 }}>{sync.symbol}</div>
                                            <div style={{ fontSize: 9, color: '#86868B' }}>Ticket #{sync.ticket}</div>
                                        </div>
                                        <div style={{ fontWeight: 800, color: Number(sync.pnl || sync.profit || 0) >= 0 ? '#30D158' : '#FF453A' }}>
                                            ${Number(sync.pnl || sync.profit || 0).toFixed(2)}
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                )}

                <div style={{ textAlign: 'center', fontSize: 11, color: '#86868B', marginBottom: 15 }}>OR ENTER MANUALLY</div>
                
                <form onSubmit={executeCloseTrade} style={{ display: 'grid', gap: 15 }}>
                    <div className="input-group">
                        <label className="input-label">Exit Price</label>
                        <input className="apple-input" type="number" step="any" autoFocus onFocus={handleFocus} value={closeExitPrice} onChange={e => setCloseExitPrice(e.target.value)} required />
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="input-group"><label className="input-label">Gross P&L</label><input className="apple-input" type="number" step="any" onFocus={handleFocus} value={closeGrossPnl} onChange={e => { setCloseGrossPnl(e.target.value); updateNetPnl(e.target.value, closeCommission); }} required /></div>
                        <div className="input-group"><label className="input-label">Commission</label><input className="apple-input" type="number" step="any" onFocus={handleFocus} value={closeCommission} onChange={e => { setCloseCommission(e.target.value); updateNetPnl(closeGrossPnl, e.target.value); }} /></div>
                    </div>

                    <button type="submit" className="btn-primary" style={{ height: 50, borderRadius: 16, marginTop: 10 }}>CONFIRM & POST</button>
                    <button type="button" onClick={() => setClosingTrade(null)} style={{ border:'none', background:'none', color:'#86868B', marginTop: 10 }}>Cancel</button>
                </form>
            </div>
        </div>
      )}

      {/* --- SYNC DETAIL MODAL (FULL DATA VIEW) --- */}
      {selectedSyncDetail && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(15px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:4000, padding: 20 }}>
          <div className="bento-card" style={{ width: '100%', maxWidth: 450, padding: 0, overflow: 'hidden' }}>
            
            {/* Header: Ticker - Firm - P&L */}
            <div style={{ padding: '25px', background: '#F9F9F9', borderBottom: '1px solid #E5E5EA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900 }}>{selectedSyncDetail.symbol}</div>
                <div style={{ fontSize: 12, color: '#86868B', fontWeight: 600 }}>{selectedSyncDetail.firm} • Vol: {selectedSyncDetail.volume}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: Number(selectedSyncDetail.pnl || selectedSyncDetail.profit || 0) >= 0 ? '#30D158' : '#FF453A' }}>
                {Number(selectedSyncDetail.pnl || selectedSyncDetail.profit || 0) >= 0 
                    ? `+$${Number(selectedSyncDetail.pnl || selectedSyncDetail.profit || 0).toFixed(2)}` 
                    : `-$${Math.abs(selectedSyncDetail.pnl || selectedSyncDetail.profit || 0).toFixed(2)}`}
                </div>
                <div style={{ fontSize: 10, color: '#86868B' }}>Ticket #{selectedSyncDetail.ticket}</div>
              </div>
            </div>

            <div style={{ padding: '25px' }}>
              {/* Prijs & Tijd Sectie */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 25 }}>
                <div style={{ padding: '15px', background: '#F2F2F7', borderRadius: '14px' }}>
                  <label style={{ fontSize: 10, fontWeight: 800, color: '#007AFF', display: 'block', marginBottom: 8 }}>OPEN EXECUTION</label>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{selectedSyncDetail.open_price || '---'}</div>
                  <div style={{ fontSize: 11, color: '#86868B', marginTop: 4 }}>{selectedSyncDetail.open_time}</div>
                </div>
                <div style={{ padding: '15px', background: '#F2F2F7', borderRadius: '14px' }}>
                  <label style={{ fontSize: 10, fontWeight: 800, color: '#FF3B30', display: 'block', marginBottom: 8 }}>CLOSE EXECUTION</label>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{selectedSyncDetail.close_price || '---'}</div>
                  <div style={{ fontSize: 11, color: '#86868B', marginTop: 4 }}>{selectedSyncDetail.close_time}</div>
                </div>
              </div>

              {/* Kosten Analyse */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 5px', borderBottom: '1px solid #F2F2F7', fontSize: 13 }}>
                <span style={{ color: '#86868B' }}>Gross Profit</span>
                <span style={{ fontWeight: 700 }}>${Number(selectedSyncDetail.pln || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 5px', borderBottom: '1px solid #F2F2F7', fontSize: 13 }}>
                <span style={{ color: '#86868B' }}>Fees (Commission/Swap)</span>
                <span style={{ fontWeight: 700, color: '#FF453A' }}>-${(Math.abs(selectedSyncDetail.commission || 0) + Math.abs(selectedSyncDetail.swap || 0)).toFixed(2)}</span>
              </div>
            </div>

            {/* Footer Acties */}
            <div style={{ padding: '20px', background: '#F9F9F9', display: 'flex', gap: 12 }}>
              <button onClick={() => setSelectedSyncDetail(null)} className="btn-ghost" style={{ flex: 1, background: 'white', borderRadius: '12px' }}>Cancel</button>
              <select 
                className="btn-primary" 
                style={{ flex: 2, textAlign: 'center', cursor: 'pointer', borderRadius: '12px', appearance: 'none' }}
                onFocus={(e) => e.target.size = 5}
                onBlur={(e) => e.target.size = 1}
                onChange={(e) => { if(e.target.value) { handleLinkTrade(e.target.value, selectedSyncDetail); setSelectedSyncDetail(null); } }}
              >
                <option value="">LINK TO PLAN</option>
                {activeTrades.map(t => <option key={t.id} value={t.id}>{t.pair} ({t.direction})</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {editingTrade && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding: 20 }}>
            <div className="bento-card" style={{ width: '100%', maxWidth: 850, padding: 30, maxHeight:'90vh', overflowY:'auto', borderTop: `6px solid ${isReadOnlyMode ? '#30D158' : '#FF9F0A'}` }}>
                
                {/* HEADER MET STATUS INDICATOR */}
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:25 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                           <h3 style={{ fontWeight: 900, margin:0 }}>{isReadOnlyMode ? 'Trade Archive' : 'Final Behavioral Review'}: {editingTrade.pair}</h3>
                           {isReadOnlyMode && <span style={{ background: '#30D15820', color: '#30D158', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 800 }}>LOCKED RECORD</span>}
                        </div>
                        <span style={{ fontSize:10, color:'#86868B' }}>Method: {editingTrade.isAdvanced ? 'Advanced' : 'Lightning'} Entry • Plan ID: {editingTrade.id.slice(-6)}</span>
                    </div>
                    <button onClick={() => setEditingTrade(null)} style={{ border:'none', background:'none', cursor:'pointer' }}><X size={24}/></button>
                </div>

                {/* DASHBOARD BANNER (ALTIJD READ-ONLY) */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 15, marginBottom: 25 }}>
                    <div style={{ background: '#F2F2F7', padding: '15px', borderRadius: '14px', textAlign: 'center' }}>
                        <div style={{ fontSize: 9, fontWeight: 800, color: '#86868B', marginBottom: 4 }}>TOTAL COMMISSION</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#FF453A' }}>-{Math.abs(Number(editingTrade.commission || 0)).toFixed(2)}</div>
                    </div>
                    <div style={{ background: isReadOnlyMode ? '#30D158' : '#007AFF', padding: '15px', borderRadius: '14px', textAlign: 'center', color: 'white' }}>
                        <div style={{ fontSize: 9, fontWeight: 800, opacity: 0.8, marginBottom: 4 }}>ACTUAL NET P&L</div>
                        <div style={{ fontSize: 18, fontWeight: 900 }}>
                           ${Number(editingTrade.pnl || editingTrade.profit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>
                
                <form onSubmit={handleUpdateTrade}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr', gap: isMobile ? 20 : 40 }}>
                        
                        {/* LINKER KOLOM: THE PLAN VS REALITY */}
                        <div>
                            <div className="label-xs" style={{color:'#007AFF', marginBottom: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <ShieldCheck size={14} weight="fill" /> 1. THE PLAN (PRE-TRADE)
                            </div>
                            
                            {/* PRE-TRADE DATA (READ-ONLY) */}
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:20, padding: '12px', background: '#F9F9F9', borderRadius: '12px', border: '1px solid #E5E5EA' }}>
                                <div className="input-group"><label style={{fontSize: 9, opacity: 0.6}}>Planned Entry</label><div style={{ fontWeight: 700, fontSize: 13 }}>{editingTrade.entryPrice || '---'}</div></div>
                                <div className="input-group"><label style={{fontSize: 9, opacity: 0.6}}>Planned SL</label><div style={{ fontWeight: 700, fontSize: 13, color: '#FF453A' }}>{editingTrade.slPrice || '---'}</div></div>
                                <div className="input-group"><label style={{fontSize: 9, opacity: 0.6}}>Planned TP</label><div style={{ fontWeight: 700, fontSize: 13, color: '#30D158' }}>{editingTrade.tpPrice || '---'}</div></div>
                            </div>

                            <div className="label-xs" style={{color:'#30D158', marginBottom: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Lightning size={14} weight="fill" /> 2. THE REALITY (MT5 DATA)
                            </div>

                            {/* REAL EXECUTION DATA [cite: 2026-01-04] */}
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:15, padding: '12px', background: 'rgba(48, 209, 88, 0.05)', borderRadius: '12px', border: '1px solid rgba(48, 209, 88, 0.2)' }}>
                                <div className="input-group">
                                    <label style={{fontSize: 9, fontWeight: 800}}>Actual Entry</label>
                                    <div style={{ fontWeight: 800 }}>{editingTrade.open_price || editingTrade.entryPrice || '---'}</div>
                                </div>
                                <div className="input-group">
                                    <label style={{fontSize: 9, fontWeight: 800}}>Actual Final Exit</label>
                                    <div style={{ fontWeight: 800 }}>{editingTrade.close_price || (editingTrade.actualExits?.[0]?.price) || '---'}</div>
                                </div>
                            </div>

                            {/* PARTIAL EXITS / EXTRA TP'S [cite: 2026-01-04] */}
                            <div className="input-group" style={{ marginBottom: 20 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <label className="input-label" style={{ margin:0 }}>Partial Exits / Scales</label>
                                    {!isReadOnlyMode && <PlusCircle size={18} color="#007AFF" weight="fill" style={{ cursor: 'pointer' }} onClick={() => setEditingTrade({...editingTrade, actualExits: [...(editingTrade.actualExits || []), { price: '' }]})} />}
                                </div>
                                <div style={{ display: 'grid', gap: 8 }}>
                                    {(editingTrade.actualExits || []).map((ex, idx) => (
                                        <div key={idx} style={{ display: 'flex', gap: 8 }}>
                                            <input 
                                                className="apple-input" 
                                                placeholder={`Exit Price ${idx + 1}`} 
                                                type="number" 
                                                step="any" 
                                                readOnly={isReadOnlyMode}
                                                style={{ background: isReadOnlyMode ? '#F2F2F7' : 'white', fontSize: 12 }}
                                                value={ex.price} 
                                                onChange={(e) => {
                                                    const exits = [...editingTrade.actualExits];
                                                    exits[idx].price = e.target.value;
                                                    setEditingTrade({...editingTrade, actualExits: exits});
                                                }} 
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="label-xs" style={{color:'#86868B', marginBottom: 15 }}>3. SHADOW METRICS</div>

                            <div className="label-xs" style={{color:'#86868B', marginBottom: 15, marginTop: 25 }}>EXECUTION METRICS</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 15 }}>
                                <div className="input-group">
                                    <label className="input-label">MAE Price <FieldInfo title="MAE" text="Worst price during trade." /></label>
                                    <input className="apple-input" type="number" readOnly={isReadOnlyMode} style={{ background: isReadOnlyMode ? '#F2F2F7' : 'white' }} value={editingTrade.maePrice || ''} onChange={e => setEditingTrade({...editingTrade, maePrice: e.target.value})} placeholder="Worst Price" />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">MFE Price <FieldInfo title="MFE" text="Best price during trade." /></label>
                                    <input className="apple-input" type="number" readOnly={isReadOnlyMode} style={{ background: isReadOnlyMode ? '#F2F2F7' : 'white' }} value={editingTrade.mfePrice || ''} onChange={e => setEditingTrade({...editingTrade, mfePrice: e.target.value})} placeholder="Best Price" />
                                </div>
                            </div>

                            {/* EXIT PRICES SECTIE */}
                            <div className="input-group">
                                <label className="input-label">Actual Exits</label>
                                {(editingTrade.actualExits || []).map((ex, idx) => (
                                    <input key={idx} className="apple-input" readOnly={true} style={{ background: '#F2F2F7', marginBottom: 5 }} value={ex.price} />
                                ))}
                            </div>
                        </div>

                        {/* RECHTER KOLOM: BEHAVIORAL (EDITABLE UNLESS LOCKED) [cite: 2026-01-01] */}
                        <div>
                            <div className="label-xs" style={{color:'#FF9F0A', marginBottom: 15 }}>BEHAVIORAL REVIEW</div>
                            
                            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:20 }}>
                                {(config.mistakes || []).map(m => (
                                    <button key={m} type="button" disabled={isReadOnlyMode} onClick={() => {
                                        const cur = editingTrade.mistake || [];
                                        setEditingTrade({...editingTrade, mistake: cur.includes(m) ? cur.filter(x => x !== m) : [...cur, m]});
                                    }} style={{ border: (editingTrade.mistake || []).includes(m) ? '1px solid #FF3B30' : '1px solid #E5E5EA', background: (editingTrade.mistake || []).includes(m) ? 'rgba(255, 59, 48, 0.1)' : 'white', padding: '6px 12px', borderRadius: 10, fontSize: 11, fontWeight: 600, opacity: isReadOnlyMode && !(editingTrade.mistake || []).includes(m) ? 0.3 : 1 }}>{m}</button>
                                ))}
                            </div>

                            <div className="input-group" style={{ marginBottom: 20 }}><label className="input-label">Emotion</label>
                                <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:5}}>
                                    {EMOTIONS.map(em => <div key={em.label} style={{ border: editingTrade.emotion === em.label ? `2px solid ${em.color}` : '1px solid #E5E5EA', padding:10, borderRadius:12, textAlign:'center', cursor: isReadOnlyMode ? 'default' : 'pointer', opacity: isReadOnlyMode && editingTrade.emotion !== em.label ? 0.3 : 1 }} onClick={() => !isReadOnlyMode && setEditingTrade({...editingTrade, emotion: em.label})}>{em.icon}</div>)}
                                </div>
                            </div>

                            <VoiceNoteInput tradeContext={editingTrade} onTranscriptionComplete={(text) => !isReadOnlyMode && setEditingTrade({...editingTrade, notes: text})} />
                            
                            <textarea className="apple-input" readOnly={isReadOnlyMode} rows={4} value={editingTrade.notes || ''} onChange={e => setEditingTrade({...editingTrade, notes: e.target.value})} placeholder="Final reflections..." style={{ background: isReadOnlyMode ? '#F2F2F7' : 'white' }} />
                        </div>
                    </div>

                    {/* DYNAMISCHE BUTTON ONDERAAN */}
                    {!isReadOnlyMode ? (
                        <button type="submit" className="btn-primary" style={{ width:'100%', marginTop:30, height: 50, fontWeight: 800 }}>FINALIZE & LOCK REVIEW</button>
                    ) : (
                        <div style={{ marginTop: 30, padding: '15px', background: '#F2F2F7', borderRadius: '12px', textAlign: 'center', color: '#86868B', fontWeight: 700, border: '1px dashed #CCC' }}>
                            <ShieldCheck size={20} weight="fill" color="#30D158" style={{ marginBottom: 4 }} /> <br/> ARCHIVED RECORD (IMMUTABLE)
                        </div>
                    )}
                </form>
            </div>
        </div>
      )}

      <style>{`
        @keyframes pulse-slow { 
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 59, 48, 0.4); } 
          70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(255, 59, 48, 0); } 
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 59, 48, 0); } 
        }
      `}</style>
    </div>
  );
}