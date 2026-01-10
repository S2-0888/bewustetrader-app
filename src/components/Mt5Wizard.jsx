import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { 
    CheckCircle, 
    Lightning, 
    WarningCircle, 
    Copy, 
    FileArrowDown 
} from '@phosphor-icons/react';

export default function Mt5Wizard() {
  const [wizardStep, setWizardStep] = useState(1);
  const [testStatus, setTestStatus] = useState('idle'); // 'idle', 'waiting', 'success'
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });

  // 1. CONNECTION LOGIC: Listen for incoming signal from MT5/Cloud Function
  useEffect(() => {
    if (testStatus === 'waiting') {
      const user = auth.currentUser;
      if (!user) return;

      // Listen to 'incoming_syncs' collection for any activity
      const unsub = onSnapshot(collection(db, "users", user.uid, "incoming_syncs"), (snap) => {
        if (!snap.empty) {
          setTestStatus('success');
          setStatusMessage({ text: "Connection verified! Your data is flowing.", type: 'success' });
          
          // Cleanup signals from the database
          snap.docs.forEach(d => {
            deleteDoc(doc(db, "users", user.uid, "incoming_syncs", d.id));
          });
        }
      });
      return () => unsub();
    }
  }, [testStatus]);

  // 2. HELPER: Copy WebRequest URL
  const copyUrl = () => {
    const url = "https://europe-west1-bewustetrader.cloudfunctions.net";
    navigator.clipboard.writeText(url);
    setStatusMessage({ text: "URL copied! Now paste it in MT5 Options.", type: 'success' });
    setTimeout(() => setStatusMessage({ text: '', type: '' }), 3000);
  };

  return (
    <div className="bento-card" style={{ padding: '30px', background: 'white', borderRadius: '24px', border: '1px solid #E5E5EA', position: 'relative', overflow: 'hidden' }}>
      
      {/* GLOBAL STATUS ALERTS */}
      {statusMessage.text && (
        <div style={{ 
            padding: '12px 20px', borderRadius: '12px', marginBottom: '20px',
            background: statusMessage.type === 'success' ? 'rgba(48, 209, 88, 0.1)' : 'rgba(255, 59, 48, 0.1)',
            color: statusMessage.type === 'success' ? '#30D158' : '#FF3B30',
            border: `1px solid ${statusMessage.type === 'success' ? 'rgba(48, 209, 88, 0.2)' : 'rgba(255, 59, 48, 0.2)'}`,
            display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: '13px', animation: 'fadeIn 0.3s ease'
        }}>
            {statusMessage.type === 'success' ? <CheckCircle size={20} weight="fill" /> : <WarningCircle size={20} weight="fill" />}
            {statusMessage.text}
        </div>
      )}

      {/* HEADER (Hidden when connected to save space) */}
      {testStatus !== 'success' && (
        <div style={{ marginBottom: 25 }}>
          <h3 style={{ margin: 0, fontWeight: 900, fontSize: '18px', letterSpacing: '-0.5px' }}>MT5 Bridge Setup</h3>
          <p style={{ color: '#86868B', fontSize: 13, marginTop: 4 }}>Connect your MT5 terminal to your cockpit.</p>
        </div>
      )}

      {/* STEP INDICATOR (Hidden when connected) */}
      {testStatus !== 'success' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 30 }}>
          {[1, 2, 3].map(step => (
            <div key={step} style={{ 
              flex: 1, height: 6, borderRadius: 3, 
              background: wizardStep >= step ? '#007AFF' : '#F2F2F7',
              transition: '0.4s cubic-bezier(0.4, 0, 0.2, 1)'
            }} />
          ))}
        </div>
      )}

      {/* STEP 1: DOWNLOAD OR SKIP */}
      {wizardStep === 1 && testStatus !== 'success' && (
        <div style={{ animation: 'fadeIn 0.4s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 25 }}>
            <div style={{ background: '#007AFF10', padding: 12, borderRadius: 16 }}>
              <FileArrowDown size={28} color="#007AFF" weight="duotone" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>Step 1: Get the Bridge</div>
              <div style={{ fontSize: 12, color: '#86868B' }}>Place the file in your MT5 MQL5/Experts folder.</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <a 
              href="/Propfolio_Sync.mq5" 
              download="Propfolio_Sync.mq5"
              className="btn-primary" 
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: 48, borderRadius: 14, textDecoration: 'none', fontWeight: 800, background: '#1D1D1F', color: 'white' }} 
              onClick={() => setTimeout(() => setWizardStep(2), 600)}
            >
              DOWNLOAD BRIDGE
            </a>
            <button onClick={() => setWizardStep(2)} style={{ background: 'none', border: 'none', color: '#007AFF', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
              I already have the file, skip to Step 2 →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: WEBQUEST CONFIG */}
      {wizardStep === 2 && testStatus !== 'success' && (
        <div style={{ animation: 'fadeIn 0.4s ease' }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 8 }}>Step 2: Enable WebRequest</div>
            <p style={{ fontSize: 12, color: '#86868B', lineHeight: '1.6' }}>
              In MT5, go to <b>Tools {'>'} Options {'>'} Expert Advisors</b>.<br/>
              Check 'Allow WebRequest' and add this URL:
            </p>
            <div onClick={copyUrl} style={{ background: '#F9F9FB', padding: '14px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, fontFamily: 'monospace', border: '1px solid #E5E5EA', color: '#007AFF', marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>https://europe-west1-bewustetrader.cloudfunctions.net</span>
              <Copy size={18} weight="bold" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={{ flex: 1, height: 48, borderRadius: 14, border: '1px solid #E5E5EA', fontWeight: 700, background: 'white' }} onClick={() => setWizardStep(1)}>Back</button>
            <button style={{ flex: 2, height: 48, borderRadius: 14, background: '#007AFF', color: 'white', border: 'none', fontWeight: 800 }} onClick={() => setWizardStep(3)}>URL ADDED</button>
          </div>
        </div>
      )}

      {/* STEP 3: LIVE TEST & COMPACT SUCCESS STATE */}
      {wizardStep === 3 && (
        <div style={{ animation: 'fadeIn 0.4s ease' }}>
          {testStatus === 'success' ? (
            /* COMPACT SUCCESS BAR */
            <div style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
              padding: '12px 16px', background: '#30D15810', borderRadius: '14px',
              border: '1px solid #30D15820'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle size={20} color="#30D158" weight="fill" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1D1D1F' }}>MT5 Linked & Flowing</span>
              </div>
              <button 
                onClick={() => { setTestStatus('idle'); setWizardStep(1); }}
                style={{ background: 'none', border: 'none', color: '#007AFF', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
              >
                Re-sync
              </button>
            </div>
          ) : (
            /* WAITING UI */
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: 25 }}>
                <div style={{ width: 70, height: 70, borderRadius: '50%', background: '#F9F9FB', margin: '0 auto 15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Lightning size={40} color={testStatus === 'waiting' ? '#FF9F0A' : '#C7C7CC'} weight="fill" className={testStatus === 'waiting' ? 'pulse' : ''} />
                </div>
                <div style={{ fontWeight: 800, fontSize: 17 }}>Waiting for Signal...</div>
                <p style={{ fontSize: 12, color: '#86868B', marginTop: 6, padding: '0 20px' }}>
                  Drag the EA onto a chart in MT5 and paste your <b>Sync ID</b>.
                </p>
              </div>
              
              {testStatus === 'idle' && (
                <button style={{ width: '100%', height: 48, borderRadius: 14, background: '#1D1D1F', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer' }} onClick={() => setTestStatus('waiting')}>START CONNECTION TEST</button>
              )}
              {testStatus === 'waiting' && (
                <div style={{ fontSize: 11, color: '#007AFF', fontWeight: 700 }}>LISTENING FOR MT5...</div>
              )}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .pulse { animation: pulseAnim 1.5s infinite; }
        @keyframes pulseAnim { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.1); } 100% { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}