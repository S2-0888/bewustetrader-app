import React, { useState } from 'react';
import { ChatTeardropText, X, PaperPlaneTilt, Bug, Lightbulb, ThumbsUp } from '@phosphor-icons/react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState('bug'); // bug, idea, other
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setIsSending(true);

    try {
      // Aangepast om aan te sluiten op de Threaded Inbox architectuur
      await addDoc(collection(db, "beta_feedback"), {
        userId: auth.currentUser?.uid || 'anonymous',
        userEmail: auth.currentUser?.email || 'anonymous',
        type,
        message,
        path: window.location.pathname,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(), // CRUCIAAL: Sortering in Admin werkt hierop
        status: 'open',               // AANGEPAST: 'open' ipv 'new' voor Admin filters
        isRead: true,                 // Gebruiker heeft zijn eigen eerste bericht gelezen
        reply: null                   // Placeholder voor de loop
      });
      
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setIsOpen(false);
        setMessage('');
      }, 2000);
    } catch (error) {
      console.error("Error sending feedback:", error);
      alert("Er ging iets mis. Stuur even een mailtje.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* DE ZWEVENDE KNOP (FAB) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed', bottom: 20, right: 20, zIndex: 9990,
            background: '#1C1C1E', color: 'white', border: 'none',
            borderRadius: '50px', padding: '12px 20px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            display: 'flex', alignItems: 'center', gap: 10,
            cursor: 'pointer', fontWeight: 700, fontSize: 13,
            transition: 'transform 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <ChatTeardropText size={20} weight="fill" color="#007AFF" />
          Beta Feedback
        </button>
      )}

      {/* HET FORMULIER */}
      {isOpen && (
        <div style={{
          position: 'fixed', bottom: 80, right: 20, zIndex: 9991,
          width: 320, background: 'white', borderRadius: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)', border: '1px solid rgba(0,0,0,0.05)',
          overflow: 'hidden', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          {sent ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#30D158' }}>
              <ThumbsUp size={48} weight="duotone" style={{ margin: '0 auto 10px' }} />
              <h3 style={{ margin: 0, fontSize: 16 }}>Ontvangen!</h3>
              <p style={{ fontSize: 12, color: '#86868B' }}>Bedankt voor je hulp.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <span style={{ fontWeight: 800, fontSize: 14 }}>Feedback Melden</span>
                <button type="button" onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 15 }}>
                {[
                    { id: 'bug', icon: <Bug />, label: 'Bug' }, 
                    { id: 'idea', icon: <Lightbulb />, label: 'Idee' },
                    { id: 'other', icon: <ChatTeardropText />, label: 'Anders' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setType(opt.id)}
                    style={{
                      flex: 1, padding: '8px', borderRadius: 10, border: 'none',
                      background: type === opt.id ? '#007AFF' : '#F2F2F7',
                      color: type === opt.id ? 'white' : '#86868B',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
                    }}
                  >
                    {React.cloneElement(opt.icon, { weight: type === opt.id ? 'fill' : 'regular' })}
                    {opt.label}
                  </button>
                ))}
              </div>

              <textarea
                autoFocus
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={type === 'bug' ? "Wat ging er mis?..." : "Ik heb een goed idee..."}
                style={{
                  width: '100%', height: 100, borderRadius: 12, border: '1px solid #E5E5EA',
                  padding: 12, fontSize: 13, fontFamily: 'sans-serif', resize: 'none',
                  outline: 'none', background: '#F9F9F9', marginBottom: 15
                }}
              />

              <button
                type="submit"
                disabled={isSending}
                style={{
                  width: '100%', padding: '12px', background: '#1C1C1E', color: 'white',
                  border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 13,
                  cursor: isSending ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', gap: 8
                }}
              >
                {isSending ? 'Versturen...' : 'Verstuur'} <PaperPlaneTilt weight="fill" />
              </button>
            </form>
          )}
        </div>
      )}
      <style>{`@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </>
  );
}