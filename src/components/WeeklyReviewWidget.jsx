import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Sparkle, TrendUp, Warning, X } from '@phosphor-icons/react';

export default function WeeklyReviewWidget() {
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState(null);
  const [error, setError] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // --- CONFIGURATIE ---
  // Zet op FALSE voor productie! (Nu TRUE om te testen op niet-zondagen)
  const DEV_MODE = true; 

  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const day = now.getDay(); // 0 = Sunday
      const hour = now.getHours();

      // Only visible on Sunday before 12:00
      const isSundayMorning = day === 0 && hour < 12;

      if (isSundayMorning || DEV_MODE) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const generateReview = async () => {
    setLoading(true);
    setError('');
    setIsExpanded(true); 

    const functions = getFunctions(undefined, 'europe-west1');
    const generateWeeklyReview = httpsCallable(functions, 'generateWeeklyReview');

    try {
      const result = await generateWeeklyReview();
      if (result.data.error) {
        setError(result.data.error);
      } else {
        setReview(result.data);
      }
    } catch (err) {
      console.error(err);
      setError("Could not generate review. No trades found this week?");
    } finally {
      setLoading(false);
    }
  };

  // 1. Ghost Mode (Invisible)
  if (!isVisible) return null;

  // 2. Subtle Mode (Soft Glassmorphism)
  if (!isExpanded) {
    return (
      <div 
        onClick={generateReview}
        style={{ 
          marginBottom: '25px', 
          background: 'rgba(255, 255, 255, 0.6)', 
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          padding: '16px 24px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          cursor: 'pointer',
          boxShadow: '0 8px 32px rgba(0,0,0,0.05)', 
          border: '1px solid rgba(255, 214, 10, 0.3)', 
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(255, 214, 10, 0.15)';
        }}
        onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.05)';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          <div style={{ 
              background: 'linear-gradient(135deg, #FFD60A 0%, #FF9F0A 100%)', 
              padding: '8px', 
              borderRadius: '50%',
              display: 'flex',
              boxShadow: '0 4px 10px rgba(255, 214, 10, 0.3)'
          }}>
            <Sparkle size={20} color="white" weight="fill" />
          </div>
          <div>
            <div style={{ color: '#1D1D1F', fontSize: '14px', fontWeight: 800, letterSpacing: '-0.3px' }}>
                Weekly Review Ready
            </div>
            <div style={{ color: '#86868B', fontSize: '11px', fontWeight: 600 }}>
                Sunday reflection & strategy session.
            </div>
          </div>
        </div>
        
        <div style={{ 
            display: 'flex', alignItems: 'center', gap: 8, 
            color: '#FF9F0A', fontSize: '11px', fontWeight: 800 
        }}>
            START SESSION <TrendUp size={14} weight="bold" />
        </div>
      </div>
    );
  }

  // 3. Expanded Mode (Report Card)
  return (
    <div className="bento-card" style={{ marginBottom: '25px', padding: '25px', background: 'white', borderTop: review ? `5px solid ${getColorForGrade(review.grade)}` : 'none', position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}>
      
      <button 
        onClick={() => { setIsExpanded(false); setReview(null); }} 
        style={{ position: 'absolute', top: 15, right: 15, background: 'none', border: 'none', cursor: 'pointer', color: '#86868B' }}
      >
        <X size={20} />
      </button>

      {loading && (
        <div style={{ textAlign: 'center', padding: '30px' }}>
          <div className="spinner" style={{ margin: '0 auto 15px', borderTopColor: '#FFD60A' }}></div>
          <p style={{ fontWeight: 700, color: '#1D1D1F', fontSize: '14px' }}>TCT is analyzing your week...</p>
          <p style={{ fontSize: 11, color: '#86868B' }}>Fetching trades • Identifying patterns • Building strategy</p>
        </div>
      )}

      {error && (
        <div style={{ textAlign: 'center', color: '#FF3B30', fontSize: '13px', padding: '20px' }}>
          <Warning size={24} style={{ marginBottom: 10 }} />
          <p>{error}</p>
        </div>
      )}

      {review && (
        <div style={{ animation: 'fadeIn 0.5s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: '#86868B', letterSpacing: 1 }}>WEEKLY REPORT CARD</span>
              <h2 style={{ fontSize: 24, fontWeight: 800, margin: '5px 0', color: '#1D1D1F', letterSpacing: '-0.5px' }}>{review.headline}</h2>
            </div>
            <div style={{ 
              background: getColorForGrade(review.grade), 
              color: 'white', 
              width: 55, height: 55, 
              borderRadius: 16, 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 900,
              boxShadow: '0 8px 20px rgba(0,0,0,0.15)'
            }}>
              {review.grade}
            </div>
          </div>

          <div style={{ marginBottom: 25, padding: '15px', background: '#F9F9F9', borderRadius: '12px', borderLeft: '4px solid #1D1D1F' }}>
            <p style={{ lineHeight: '1.6', fontSize: 14, color: '#3C4043', margin: 0, fontStyle: 'italic' }}>"{review.analysis}"</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
            <div style={{ background: '#FFF5F5', padding: 15, borderRadius: 16, border: '1px solid #FFE5E5' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#FF3B30' }}>
                <Warning size={18} weight="fill" />
                <span style={{ fontSize: 11, fontWeight: 800 }}>BIGGEST LEAK</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1D1D1F' }}>{review.top_pitfall || "Clean sheet!"}</p>
            </div>

            <div style={{ background: '#F0F9FF', padding: 15, borderRadius: 16, border: '1px solid #E0F2FE' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#007AFF' }}>
                <TrendUp size={18} weight="fill" />
                <span style={{ fontSize: 11, fontWeight: 800 }}>GAMEPLAN</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1D1D1F' }}>{review.gameplan}</p>
            </div>
          </div>
          <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
      )}
    </div>
  );
}

function getColorForGrade(grade) {
  if (['A+', 'A'].includes(grade)) return '#30D158'; 
  if (['B'].includes(grade)) return '#007AFF'; 
  if (['C'].includes(grade)) return '#FF9F0A'; 
  return '#FF3B30'; 
}