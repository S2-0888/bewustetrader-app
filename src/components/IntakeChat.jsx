import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'; 
import { getFunctions, httpsCallable } from 'firebase/functions';
import { 
  PaperPlaneTilt, Robot, Microphone, 
  Stop, CheckCircle, ArrowsClockwise, X 
} from '@phosphor-icons/react';

const translations = {
  en: {
    accounts: "How many accounts do you currently manage?",
    experience: "How long have you been active in the markets?",
    pain: "What is your biggest challenge right now? Feel free to use the mic for a voice reflection.",
    email: "At what email address can I reach you?",
    processing: "TCT is analyzing your profile...",
    btnSend: "Send Response",
    successTitle: "Analysis Complete", 
    close: "Close"
  }
};

export default function IntakeChat({ onCancel }) {
  const [step, setStep] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const scrollRef = useRef(null);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const hasStarted = useRef(false);
  const [audioData, setAudioData] = useState(new Array(20).fill(5));

  const [formData, setFormData] = useState({
    name: '', email: '', accounts: '', experience: '', biggestPain: '', 
    label: 'beta_tester', audioBase64: null, isAudio: false, analysis: null 
  });

  const [chatLog, setChatLog] = useState([
    { role: 'tct', text: "Systems online. I am The Conscious Trader." }
  ]);

  useEffect(() => {
    if (hasStarted.current) return; 
    hasStarted.current = true; 

    const introSequence = async () => {
      setChatLog([{ role: 'tct', text: "Systems online. I am The Conscious Trader." }]); 
      await new Promise(res => setTimeout(res, 1500)); 
      setIsTyping(true); 
      await new Promise(res => setTimeout(res, 800)); 
      setIsTyping(false); 
      addMessage('tct', "I'm here to bridge the gap between your emotions and institutional execution."); 
      await new Promise(res => setTimeout(res, 2000)); 
      setIsTyping(true); 
      await new Promise(res => setTimeout(res, 800));
      setIsTyping(false); 
      addMessage('tct', `Let’s calibrate your profile. To start: what is your name?`); 
    };
    introSequence(); 
  }, []); 

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatLog, isTyping]);

  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setAudioData(new Array(20).fill(0).map(() => Math.random() * 40 + 5));
      }, 100);
    } else {
      setAudioData(new Array(20).fill(5));
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const steps = [
    { field: 'name', type: 'text', placeholder: 'Identify yourself...' },
    { field: 'accounts', type: 'select', options: ['None', '1-2', '3-5', 'More'], label: "How many accounts are you currently operating?" },
    { field: 'experience', type: 'select', options: ['Rookie', '1-3 Years', '4+'], label: "How deep is your market experience?" },
    { field: 'biggestPain', type: 'voice_text', label: "What is the primary problem in your trading right now? Use the mic for a voice reflection." }
  ];

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => handleNext(reader.result.split(',')[1], true);
      };
      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) { alert("Mic access denied."); }
  };

  const handleNext = async (val, isAudio = false) => {
    const currentField = steps[step].field;
    const updatedData = { 
      ...formData, 
      [currentField]: isAudio ? "AUDIO_SUBMISSION" : val,
      audioBase64: isAudio ? val : formData.audioBase64,
      isAudio: isAudio || formData.isAudio
    };
    
    setFormData(updatedData);
    addMessage('user', isAudio ? "🎤 Voice reflection sent." : val);

    if (step < steps.length - 1) {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setStep(step + 1);
        addMessage('tct', steps[step + 1].label || steps[step + 1].placeholder);
      }, 800);
    } else {
      submitToCloudFunction(updatedData);
    }
  };

  const submitToCloudFunction = async (finalData) => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) { onCancel(); return; }
      const functions = getFunctions(undefined, 'europe-west1');
      const analyze = httpsCallable(functions, 'analyzeTraderIntake');
      const result = await analyze(finalData);
      const analysisResult = result.data.analysis;
      const userDocRef = doc(db, "users", user.uid);
      const profileUpdate = {
        displayName: finalData.name,
        accounts_count: finalData.accounts,
        experience_level: finalData.experience,
        intake_pain: finalData.biggestPain,
        archetype: analysisResult?.archetype || 'Provisional Pilot',
        shadow_analysis: analysisResult?.shadow_analysis || '',
        blueprint: analysisResult?.blueprint || [],
        hasCompletedIntake: false, 
        isApproved: false, 
        status: 'pending',
        lastIntakeUpdate: serverTimestamp()
      };
      await setDoc(userDocRef, profileUpdate, { merge: true });
      await setDoc(doc(db, "whitelist_intakes", user.uid), {
        uid: user.uid, email: user.email, name: finalData.name,
        status: 'pending', submittedAt: serverTimestamp(),
        analysis: analysisResult, rawData: finalData
      });
      setLoading(false);
      setIsRecording(false);
      setAudioData(new Array(20).fill(5));
      setIsTyping(true);
      await new Promise(res => setTimeout(res, 1500));
      setIsTyping(false);
      const feedbackText = `Analysis complete, ${finalData.name}. I have identified your archetype as "${analysisResult?.archetype}". We will focus on bridging the gap in your ${finalData.biggestPain === "AUDIO_SUBMISSION" ? 'behavioral consistency' : 'execution'}.`;
      addMessage('tct', feedbackText);
      await new Promise(res => setTimeout(res, 4000)); 
      setFormData(prev => ({ ...prev, analysis: analysisResult }));
      setSuccess(true);
    } catch (err) {
      console.error("Submit error:", err);
      alert("Calibration failed.");
      setLoading(false);
    }
  };

  const addMessage = (role, text) => setChatLog(prev => [...prev, { role, text }]);

  // --- HIER ZIT DE FIX: Het success scherm is nu een early return ---
  if (success) {
    return (
      <div style={fullScreenOverlay}>
        <div style={{ maxWidth: 480, width: '100%', textAlign: 'center', padding: '20px' }}>
          <CheckCircle size={80} weight="fill" color="#30D158" />
          <h2 style={{ fontSize: 28, fontWeight: 900, marginTop: 20 }}>Calibration Successful</h2>
          
          <div style={{ ...resultCard, background: '#F9F9FB', padding: '24px' }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: '#007AFF', marginBottom: 12 }}>
              {formData.analysis?.archetype}
            </div>
            
            {/* Eén krachtige feedback zin voor de trader */}
            <p style={{ fontSize: 15, color: '#1D1D1F', lineHeight: 1.6, fontWeight: 500 }}>
              {formData.analysis?.shadow_analysis || "Your behavioral patterns have been mapped. TCT is preparing your institutional roadmap."}
            </p>
          </div>

          <button 
            onClick={async () => {
              const userRef = doc(db, "users", auth.currentUser.uid);
              await setDoc(userRef, { hasCompletedIntake: true }, { merge: true });
            }} 
            style={primaryBtn}
          >
            Access My Dashboard <PaperPlaneTilt size={20} weight="bold" />
          </button>
        </div>
      </div>
    );
  }

  // De standaard return voor de chat (als success false is)
  return (
    <div style={fullScreenOverlay}>
      <div style={chatContainer}>
        <div style={chatHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={avatarCircle}><Robot size={20} weight="fill" color="white" /></div>
            <div><div style={{ fontWeight: 800, fontSize: 14 }}>TCT AI Mentor</div><div style={{ fontSize: 10, color: '#30D158' }}>● ONLINE</div></div>
          </div>
          <X size={20} onClick={onCancel} style={{ cursor: 'pointer' }} />
        </div>
        <div style={chatBody}>
          {chatLog.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'tct' ? 'flex-start' : 'flex-end', marginBottom: 15 }}>
              <div style={{ ...chatBubble, background: msg.role === 'tct' ? '#F2F2F7' : '#007AFF', color: msg.role === 'tct' ? '#1D1D1F' : 'white' }}>{msg.text}</div>
            </div>
          ))}
          {isTyping && <ArrowsClockwise size={16} className="spinner" />}
          <div ref={scrollRef} />
        </div>
        <div style={chatInputArea}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#86868B' }}>
              <ArrowsClockwise className="spinner" size={20} /> {translations.en.processing}
            </div>
          ) : (
            <>
              {isRecording && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', height: '40px', marginBottom: '15px' }}>
                  {audioData.map((height, i) => (
                    <div key={i} style={{ width: '3px', height: `${height}px`, backgroundColor: '#007AFF', borderRadius: '2px', transition: 'height 0.1s ease' }} />
                  ))}
                </div>
              )}
              {steps[step].type === 'text' ? (
                <form onSubmit={(e) => { e.preventDefault(); handleNext(e.target.input.value); e.target.input.value=''; }} style={{ display: 'flex', gap: 10 }}>
                  <input name="input" autoFocus style={inputField} placeholder="Type here..." />
                  <button type="submit" style={sendBtn}><PaperPlaneTilt size={20} /></button>
                </form>
              ) : steps[step].type === 'select' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {steps[step].options.map(opt => <button key={opt} onClick={() => handleNext(opt)} style={optionBtn}>{opt}</button>)}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 10 }}>
                  <textarea id="longInput" style={{ ...inputField, minHeight: 60 }} placeholder="Type or record..." />
                  <button onClick={() => isRecording ? mediaRecorder.current.stop() : startRecording()} style={{ ...sendBtn, background: isRecording ? '#FF3B30' : '#1D1D1F' }}>
                    {isRecording ? <Stop size={20} /> : <Microphone size={20} />}
                  </button>
                  {!isRecording && <button onClick={() => handleNext(document.getElementById('longInput').value)} style={sendBtn}><PaperPlaneTilt size={20} /></button>}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// STYLES
const resultCard = { background: '#FFFFFF', padding: '24px', borderRadius: '28px', margin: '24px 0', textAlign: 'left', border: '1px solid #E5E5EA' };
const fullScreenOverlay = { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(255,255,255,0.98)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 };
const chatContainer = { width: '100%', maxWidth: 500, height: '85vh', background: 'white', borderRadius: 32, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #F2F2F7' };
const chatHeader = { padding: '20px 25px', borderBottom: '1px solid #F2F2F7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const avatarCircle = { width: 40, height: 40, borderRadius: '50%', background: '#1D1D1F', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const chatBody = { flex: 1, padding: 25, overflowY: 'auto' };
const chatBubble = { padding: '14px 18px', maxWidth: '85%', borderRadius: '18px', fontSize: 15 };
const chatInputArea = { padding: 20, borderTop: '1px solid #F2F2F7' };
const inputField = { flex: 1, padding: '14px', borderRadius: 12, border: '1px solid #E5E5EA', outline: 'none', fontSize: '16px' };
const sendBtn = { background: '#007AFF', color: 'white', border: 'none', borderRadius: 12, width: 48, height: 48, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const optionBtn = { padding: '12px', borderRadius: 12, border: '1px solid #E5E5EA', background: 'white', fontWeight: 700, cursor: 'pointer' };
const primaryBtn = { width: '100%', padding: '16px', borderRadius: 16, background: '#1D1D1F', color: 'white', fontWeight: 800, cursor: 'pointer', border: 'none' };