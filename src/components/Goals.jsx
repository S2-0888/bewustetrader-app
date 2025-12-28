import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, query, onSnapshot, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { 
  Target, Gift, Plus, X, LockKey, Trash, Crown, CheckCircle, Sparkle 
} from '@phosphor-icons/react';

// SIMPELE TERMEN & KLEUREN THEMA'S
const GOAL_TYPES = [
  { id: 'ULTIMATE', label: 'Ultimate Goal', icon: <Crown weight="fill" />, theme: 'linear-gradient(135deg, #FFD60A 0%, #FF9F0A 100%)', text: 'black' },
  { id: 'TARGET', label: 'Business Target', icon: <Target weight="fill" />, theme: 'linear-gradient(135deg, #007AFF 0%, #0055B3 100%)', text: 'white' },
  { id: 'REWARD', label: 'Personal Reward', icon: <Gift weight="fill" />, theme: 'linear-gradient(135deg, #AF52DE 0%, #5856D6 100%)', text: 'white' }
];

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [metrics, setMetrics] = useState({ netProfit: 0 });
  const [showForm, setShowForm] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Geen 'image' meer in het formulier, houdt het clean
  const [form, setForm] = useState({ title: '', cost: '', type: 'TARGET', note: '' });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    const user = auth.currentUser;
    if (!user) return;

    const q = query(collection(db, "users", user.uid, "goals"), orderBy("cost", "asc"));
    const unsubGoals = onSnapshot(q, (snap) => {
      setGoals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubAccounts = onSnapshot(collection(db, "users", user.uid, "accounts"), (snap) => {
        let invested = 0;
        snap.forEach(d => invested += (Number(d.data().originalPrice) || Number(d.data().cost) || 0));
        
        onSnapshot(collection(db, "users", user.uid, "payouts"), (payoutSnap) => {
            let payouts = 0;
            payoutSnap.forEach(d => payouts += (Number(d.data().convertedAmount) || 0));
            setMetrics({ netProfit: payouts - invested });
        });
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      unsubGoals();
      unsubAccounts();
    };
  }, []);

  const handleAddGoal = async (e) => {
    e.preventDefault();
    if (!form.title || !form.cost) return;
    await addDoc(collection(db, "users", auth.currentUser.uid, "goals"), {
      ...form,
      cost: Number(form.cost),
      status: 'LOCKED',
      createdAt: new Date()
    });
    setForm({ title: '', cost: '', type: 'TARGET', note: '' });
    setShowForm(false);
  };

  const deleteGoal = async (id) => {
    if(confirm("Delete this goal?")) await deleteDoc(doc(db, "users", auth.currentUser.uid, "goals", id));
  };

  const toggleClaim = async (goal) => {
    if (goal.status === 'LOCKED') return;
    const newStatus = goal.status === 'CLAIMED' ? 'UNLOCKED' : 'CLAIMED';
    await updateDoc(doc(db, "users", auth.currentUser.uid, "goals", goal.id), { status: newStatus });
  };

  const fmt = (val) => `€${Math.round(val).toLocaleString('nl-NL')}`;

  // Sorteren: Ultimate Goal apart, de rest op volgorde van kosten
  const ultimateGoal = goals.find(g => g.type === 'ULTIMATE');
  const roadmap = goals.filter(g => g.type !== 'ULTIMATE');

  return (
    <div style={{ padding: isMobile ? '20px 15px' : '40px 20px', maxWidth: 1200, margin: '0 auto', paddingBottom: 100 }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '28px' : '36px', fontWeight: 900, margin: 0, letterSpacing: '-1px' }}>
            Vision
          </h1>
          <p style={{ color: '#86868B', fontSize: '15px', marginTop: 5 }}>
            Visualize the destination.
          </p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          style={{ 
            background: '#1D1D1F', color: 'white', border: 'none', padding: '12px 20px', 
            borderRadius: '14px', fontWeight: 700, fontSize: '13px', display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
        >
          {showForm ? <X size={18} /> : <Plus size={18} weight="bold" />} {showForm ? 'Cancel' : 'Add Goal'}
        </button>
      </div>

      {showForm && (
        <div className="bento-card" style={{ padding: 30, marginBottom: 40, border: '2px solid #007AFF', background: 'white' }}>
            <h3 style={{ margin:'0 0 25px 0', fontWeight: 900 }}>Create New Vision</h3>
            <form onSubmit={handleAddGoal} style={{ display: 'grid', gap: 20 }}>
                <div className="input-group"><label className="input-label">Title</label><input className="apple-input" placeholder="e.g. Financial Freedom" value={form.title} onChange={e => setForm({...form, title: e.target.value})} autoFocus /></div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div className="input-group"><label className="input-label">Cost Target (€)</label><input className="apple-input" type="number" placeholder="5000" value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} /></div>
                    <div className="input-group"><label className="input-label">Type</label>
                        <select className="apple-input" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                            {GOAL_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                        </select>
                    </div>
                </div>

                <div className="input-group"><label className="input-label">Motivation (Why?)</label><input className="apple-input" placeholder="Keep it short & powerful..." value={form.note} onChange={e => setForm({...form, note: e.target.value})} /></div>
                
                <button type="submit" className="btn-primary" style={{ height: 50 }}>Save Vision</button>
            </form>
        </div>
      )}

      {/* 1. ULTIMATE GOAL (Hero Card) */}
      {ultimateGoal && (
        <div style={{ marginBottom: 50 }}>
            <div className="label-xs" style={{ marginBottom: 15, color: '#FFD60A', display: 'flex', alignItems: 'center', gap: 6 }}>
                THE NORTH STAR
            </div>
            <GoalCard goal={ultimateGoal} currentProfit={metrics.netProfit} onClaim={toggleClaim} onDelete={deleteGoal} isUltimate={true} fmt={fmt} />
        </div>
      )}

      {/* 2. ROADMAP (Targets & Rewards) */}
      <div>
        <div className="label-xs" style={{ marginBottom: 20, color: '#86868B', display: 'flex', alignItems: 'center', gap: 6 }}>
            ROADMAP & REWARDS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))', gap: 25 }}>
            {roadmap.map(goal => (
                <GoalCard key={goal.id} goal={goal} currentProfit={metrics.netProfit} onClaim={toggleClaim} onDelete={deleteGoal} isUltimate={false} fmt={fmt} />
            ))}
            
            {/* Empty State Card */}
            <div 
                onClick={() => setShowForm(true)}
                style={{ 
                    border: '2px dashed #E5E5EA', borderRadius: 24, 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    minHeight: 180, cursor: 'pointer', color: '#86868B', transition: '0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#007AFF'; e.currentTarget.style.color = '#007AFF'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E5EA'; e.currentTarget.style.color = '#86868B'; }}
            >
                <Plus size={32} weight="bold" style={{ marginBottom: 10 }} />
                <span style={{ fontSize: 13, fontWeight: 700 }}>Add Target</span>
            </div>
        </div>
      </div>

    </div>
  );
}

// --- DE "PREMIUM" GOAL CARD (Zonder rommelige foto's) ---
function GoalCard({ goal, currentProfit, onClaim, onDelete, isUltimate, fmt }) {
    const progress = Math.min(Math.max((currentProfit / goal.cost) * 100, 0), 100);
    const isUnlocked = currentProfit >= goal.cost;
    const isClaimed = goal.status === 'CLAIMED';
    
    // Zoek de stijl die bij het type hoort
    const typeConfig = GOAL_TYPES.find(t => t.id === goal.type) || GOAL_TYPES[1];

    return (
        <div className="bento-card" style={{ 
            padding: isUltimate ? 40 : 25, 
            position: 'relative', 
            border: 'none',
            borderRadius: 24,
            height: isUltimate ? 250 : 200, 
            overflow: 'hidden',
            // Hier zit de magie: Strakke Gradients in plaats van foto's
            background: typeConfig.theme,
            color: typeConfig.text,
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
        }}>
            
            {/* Abstract Watermark Icon (Rechtsboven) */}
            <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.15, transform: 'rotate(15deg)' }}>
                {React.cloneElement(typeConfig.icon, { size: 180 })}
            </div>

            {/* Top Row: Status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 2 }}>
                <div style={{ 
                    padding: '6px 12px', borderRadius: 20, 
                    background: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)',
                    fontSize: 10, fontWeight: 800, letterSpacing: 0.5,
                    display: 'flex', alignItems: 'center', gap: 6
                }}>
                    {isClaimed ? <CheckCircle weight="fill" size={14}/> : (isUnlocked ? <Sparkle weight="fill" size={14}/> : <LockKey weight="fill" size={14}/>)}
                    {isClaimed ? 'ACHIEVED' : (isUnlocked ? 'AVAILABLE' : 'LOCKED')}
                </div>

                <button onClick={() => onDelete(goal.id)} style={{ background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(5px)', border: 'none', color: 'inherit', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Trash size={14} />
                </button>
            </div>

            {/* Bottom Row: Content */}
            <div style={{ position: 'relative', zIndex: 2 }}>
                <h3 style={{ margin: '0 0 5px 0', fontSize: isUltimate ? 32 : 22, fontWeight: 900, lineHeight: 1.1 }}>
                    {goal.title}
                </h3>
                
                <p style={{ margin: '0 0 20px 0', fontSize: 13, opacity: 0.85, fontWeight: 500 }}>
                    {goal.note || typeConfig.label}
                </p>

                {/* Progress Bar (Wit op gekleurde achtergrond) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                    <div style={{ flex: 1, height: 8, background: 'rgba(0,0,0,0.2)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ 
                            width: `${progress}%`, 
                            background: 'white', 
                            height: '100%',
                            boxShadow: '0 0 10px rgba(255,255,255,0.5)' 
                        }} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 900, minWidth: 40, textAlign: 'right' }}>
                        {progress.toFixed(0)}%
                    </div>
                </div>

                {/* Unlock Button */}
                {isUnlocked && !isClaimed && (
                    <button 
                        onClick={() => onClaim(goal)}
                        style={{ 
                            marginTop: 15, width: '100%', padding: 12, borderRadius: 12, border: 'none',
                            background: 'white', color: '#1D1D1F', fontWeight: 800, fontSize: 12, cursor: 'pointer',
                            boxShadow: '0 5px 15px rgba(0,0,0,0.2)'
                        }}
                    >
                        CLAIM REWARD
                    </button>
                )}
            </div>
        </div>
    );
}