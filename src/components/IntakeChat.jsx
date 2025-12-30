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

  const [formData, setFormData] = useState({
    name: '', 
    email: '', 
    accounts: '', 
    experience: '', 
    biggestPain: '', 
    label: 'beta_tester',
    audioBase64: null,
    isAudio: false,
    analysis: null 
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

  const steps = [
    { field: 'name', type: 'text', placeholder: 'Identify yourself...' },
    { field: 'accounts', type: 'select', options: ['None', '1-2', '3-5', 'More'], label: "How many accounts are you currently operating?" },
    { field: 'experience', type: 'select', options: ['Rookie', '1-3 Years', '4+'], label: "How deep is your market experience?" },
    { field: 'biggestPain', type: 'voice_text', label: "What is the primary problem in your trading right now? Use the mic for a voice reflection." }
  ];

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatLog, isTyping]);

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
      if (!user) throw new Error("Geen actieve sessie gevonden");

      const functions = getFunctions(undefined, 'europe-west1');
      const analyze = httpsCallable(functions, 'analyzeTraderIntake');
      
      const result = await analyze(finalData);
      const analysisResult = result.data.analysis;

      const userDocData = {
        uid: user.uid,
        email: user.email,
        name: finalData.name,
        accounts: finalData.accounts,
        experience: finalData.experience,
        biggestPain: finalData.biggestPain,
        archetype: analysisResult?.archetype || 'Analyzing...',
        shadow_analysis: analysisResult?.shadow_analysis || '',
        isApproved: false, 
        role: 'trader',
        status: 'pending',
        hasCompletedIntake: true, // DE TRIGGER VOOR LANDINGPAGE
        lastIntakeUpdate: serverTimestamp()
      };

      // 1. Shadow Profile updaten/maken met hasCompletedIntake: true
      await setDoc(doc(db, "users", user.uid), userDocData, { merge: true });

      // 2. Intake backup opslaan
      await setDoc(doc(db, "whitelist_intakes", user.uid), {
        email: user.email,
        status: 'pending',
        submittedAt: serverTimestamp(),
        data: finalData
      });

      setFormData(prev => ({
        ...prev,
        analysis: analysisResult
      }));

      setSuccess(true);
    } catch (err) { 
      console.error("Submit error:", err);
      alert("Submit error. Please try again."); 
    }
    setLoading(false);
  };

  const addMessage = (role, text) => setChatLog(prev => [...prev, { role, text }]);

 if (success) return (
    <div style={{...fullScreenOverlay, overflowY: 'auto', padding: '10px'}}>
      <div style={{ maxWidth: 450, width: '100%', textAlign: 'center', padding: '10px 0' }}>
        <CheckCircle size={60} weight="fill" color="#30D158" />
        <h2 style={{ fontSize: 24, fontWeight: 900, marginTop: 15 }}>Analysis Complete</h2>
        
        <div style={{...resultCard, padding: '24px', margin: '20px 0', border: '1px solid #007AFF20', background: 'linear-gradient(180deg, #FFFFFF 0%, #F9F9FB 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Robot size={22} weight="fill" color="#007AFF" />
            <span style={{ fontSize: 10, fontWeight: 900, color: '#007AFF', letterSpacing: 1 }}>TCT CLASSIFICATION</span>
          </div>

          <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 10, color: '#1D1D1F' }}>
            {formData.analysis?.archetype}
          </div>
          
          <div style={{ fontSize: 14, color: '#48484A', lineHeight: 1.6 }}>
            {/* We tonen GEEN shadow_analysis meer aan de trader, alleen de hulp-focus */}
            Your profile has been successfully mapped. TCT is now preparing your personalized roadmap to bridge the gap between your current challenges and institutional consistency. 
            <br/><br/>
            <strong>Focus:</strong> Behavioral optimization and capital protection.
          </div>
        </div>

        <p style={{ color: '#86868B', fontSize: 13, marginBottom: 20, padding: '0 20px', lineHeight: 1.5 }}>
            Your data is now being audited by the Architect. You will receive a notification once your access to the <strong>Propfirm Portfolio Operating System</strong> is activated.
        </p>
        
        <button 
          onClick={onCancel} 
          style={{...primaryBtn, marginTop: 0}}
        >
          Return to Portal
        </button>
      </div>
    </div>
  );

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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#86868B', fontWeight: 600 }}>
              <ArrowsClockwise className="spinner" size={20} /> {translations.en.processing}
            </div>
          ) : (
            <>
              {steps[step].type === 'text' || steps[step].type === 'email' ? (
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

// STYLES (Ongewijzigd)
const resultCard = { background: '#FFFFFF', padding: '24px', borderRadius: '28px', margin: '24px 0', textAlign: 'left', border: '1px solid #E5E5EA', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' };
const transcriptBox = { fontSize: '13px', color: '#8E8E93', fontStyle: 'italic', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #F2F2F7', lineHeight: 1.4 };
const fullScreenOverlay = { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(255,255,255,0.98)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 };
const chatContainer = { width: '100%', maxWidth: 500, height: '85vh', background: 'white', borderRadius: 32, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #F2F2F7' };
const chatHeader = { padding: '20px 25px', borderBottom: '1px solid #F2F2F7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const avatarCircle = { width: 40, height: 40, borderRadius: '50%', background: '#1D1D1F', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const chatBody = { flex: 1, padding: 25, overflowY: 'auto' };
const chatBubble = { padding: '14px 18px', maxWidth: '85%', borderRadius: '18px', fontSize: 15 };
const chatInputArea = { padding: 20, borderTop: '1px solid #F2F2F7' };
const inputField = { flex: 1, padding: '14px', borderRadius: 12, border: '1px solid #E5E5EA', outline: 'none', fontSize: '16px', fontFamily: 'inherit' };
const sendBtn = { background: '#007AFF', color: 'white', border: 'none', borderRadius: 12, width: 48, height: 48, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const optionBtn = { padding: '12px', borderRadius: 12, border: '1px solid #E5E5EA', background: 'white', fontWeight: 700, cursor: 'pointer' };
const primaryBtn = { width: '100%', padding: '16px', borderRadius: 16, background: '#1D1D1F', color: 'white', fontWeight: 800, marginTop: 20, cursor: 'pointer', border: 'none' };