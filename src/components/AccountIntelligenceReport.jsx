import React from 'react';
import { 
  X, Brain, ChartLineUp, Quotes, ShieldCheck, 
  Gauge, Warning, Fingerprint, Target, TrendUp 
} from '@phosphor-icons/react';

export default function AccountIntelligenceReport({ data, onClose, status }) {
  const isPassed = status === 'Funded' || status === 'Passed';
  const themeColor = isPassed ? '#30D158' : '#FF3B30';

  return (
    <div style={{ 
      position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.98)', 
      zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center', 
      padding: '20px', backdropFilter: 'blur(15px)', overflowY: 'auto' 
    }}>
      <div style={{ maxWidth: '800px', width: '100%', position: 'relative', animation: 'fadeIn 0.4s ease' }}>
        
        {/* CLOSE BUTTON */}
        <button onClick={onClose} style={{ position: 'absolute', top: -40, right: 0, background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={28} weight="bold" />
        </button>

        {/* HEADER */}
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{ 
            background: `${themeColor}15`, width: 60, height: 60, borderRadius: '18px', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px' 
          }}>
            <Brain size={32} color={themeColor} weight="fill" />
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 900, margin: 0, letterSpacing: '-1px' }}>
            Account Intelligence Report
          </h1>
          <p style={{ color: '#86868B', fontWeight: 700, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '1px' }}>
             {isPassed ? 'Professional Audit' : 'Post-Mortem Analysis'} • {data.firm || 'Account'}
          </p>
        </div>

        <div style={{ display: 'grid', gap: '15px' }}>
          
          {/* TOP ROW: SCORES */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <section className="bento-card" style={{ padding: '20px', background: '#1D1D1F', color: 'white', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '8px', opacity: 0.6 }}>
                <Gauge size={16} weight="bold" />
                <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}>Account Grade</span>
              </div>
              <div style={{ fontSize: '36px', fontWeight: 900, color: themeColor }}>
                {data.account_grade || '0'}<small style={{ fontSize: '16px', opacity: 0.5 }}>/10</small>
              </div>
              <p style={{ margin: '5px 0 0', fontSize: '10px', fontWeight: 700, color: themeColor, textTransform: 'uppercase' }}>
                {data.score_label || 'Evaluating'}
              </p>
            </section>

            <section className="bento-card" style={{ padding: '20px', background: 'white', border: '1px solid #E5E5EA', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                <ShieldCheck size={16} weight="bold" color="#007AFF" />
                <span style={{ fontSize: '10px', fontWeight: 900, color: '#8E8E93', textTransform: 'uppercase' }}>Risk Integrity</span>
              </div>
              <div style={{ fontSize: '36px', fontWeight: 900, color: '#1D1D1F' }}>
                {data.risk_integrity_score || '0'}<small style={{ fontSize: '16px', opacity: 0.5 }}>%</small>
              </div>
              <p style={{ margin: '5px 0 0', fontSize: '10px', fontWeight: 700, color: '#007AFF', textTransform: 'uppercase' }}>
                Process Adherence
              </p>
            </section>
          </div>

          {/* BLOK 1: THE DEBRIEF (Note or Audio) */}
<section className="bento-card" style={{ padding: '20px', background: '#F9F9F9', borderLeft: `4px solid ${themeColor}` }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Quotes size={18} weight="fill" color={themeColor} />
      <span style={{ fontSize: '10px', fontWeight: 900, color: '#8E8E93', textTransform: 'uppercase' }}>
        The Debrief ({data.audioUrl ? 'Voice Authenticated' : 'Manual Entry'})
      </span>
    </div>
  </div>

  {data.audioUrl ? (
    <div style={{ display: 'grid', gap: '15px' }}>
      {/* Audio Player Simulatier / Component */}
      <div style={{ background: 'white', padding: '12px', borderRadius: '12px', border: '1px solid #E5E5EA', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button style={{ background: themeColor, border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Target size={16} color="white" weight="fill" /> {/* Play icoon vervanger */}
        </button>
        <div style={{ flex: 1, height: '4px', background: '#F2F2F7', borderRadius: '2px' }} />
        <span style={{ fontSize: '10px', fontWeight: 700, color: '#8E8E93' }}>VOICE_REC.WAV</span>
      </div>
      
      {/* AI Transcript voor Emotie Monitoring */}
      <div style={{ fontSize: '13px', lineHeight: '1.5', color: '#1D1D1F', fontStyle: 'italic', opacity: 0.8 }}>
        <span style={{ display: 'block', fontSize: '9px', fontWeight: 900, color: themeColor, marginBottom: '4px' }}>AI TRANSCRIPT:</span>
        "{data.audioTranscript || "Transcribing emotional state for pattern recognition..."}"
      </div>
    </div>
  ) : (
    <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5', fontWeight: 500, fontStyle: 'italic', color: '#1D1D1F' }}>
      "{data.reflection_summary || data.emotion}"
    </p>
  )}
</section>

          {/* BLOK 2: THE MIRROR */}
          <section className="bento-card" style={{ padding: '20px', background: '#F0F7FF', border: '1px solid #CCE5FF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Brain size={18} weight="bold" color="#007AFF" />
              <span style={{ fontSize: '10px', fontWeight: 900, color: '#007AFF', textTransform: 'uppercase' }}>The Mirror (AI Analysis)</span>
            </div>
            <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5', color: '#1D1D1F', fontWeight: 600 }}>
              {data.the_mirror}
            </p>
          </section>

          {/* MIDDLE ROW: ANALYSIS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <section className="bento-card" style={{ padding: '20px', background: 'white', border: '1px solid #E5E5EA' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Warning size={18} weight="bold" color="#FF9F0A" />
                <span style={{ fontSize: '10px', fontWeight: 900, color: '#8E8E93', textTransform: 'uppercase' }}>Tilt Point</span>
              </div>
              <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.4', color: '#1D1D1F' }}>{data.tilt_point_analysis}</p>
            </section>

            <section className="bento-card" style={{ padding: '20px', background: 'white', border: '1px solid #E5E5EA' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Fingerprint size={18} weight="bold" color="#5856D6" />
                <span style={{ fontSize: '10px', fontWeight: 900, color: '#8E8E93', textTransform: 'uppercase' }}>Performance DNA</span>
              </div>
              <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.4', color: '#1D1D1F' }}>{data.performance_dna}</p>
            </section>
          </div>

          {/* BLOK 7: GROWTH TRAJECTORY */}
          <section className="bento-card" style={{ padding: '20px', background: 'white', border: '1px solid #E5E5EA' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <TrendUp size={18} weight="bold" color={themeColor} />
              <span style={{ fontSize: '10px', fontWeight: 900, color: '#8E8E93', textTransform: 'uppercase' }}>Growth Trajectory</span>
            </div>
            <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', color: '#48484A' }}>{data.growth_trajectory}</p>
          </section>

          {/* BLOK 8: ADAPTIVE RULE */}
          <section className="bento-card" style={{ padding: '20px', background: `${themeColor}08`, borderRadius: '20px', border: `1px dashed ${themeColor}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Target size={20} weight="fill" color={themeColor} />
              <span style={{ fontSize: '11px', fontWeight: 900, color: themeColor, textTransform: 'uppercase' }}>Prescribed Protocol (Contract)</span>
            </div>
            <p style={{ margin: 0, fontSize: '15px', lineHeight: '1.5', fontWeight: 800, color: '#1D1D1F' }}>
              {data.adaptive_rule_prescribed}
            </p>
          </section>

        </div>

        <button 
          onClick={onClose}
          style={{ 
            width: '100%', marginTop: '30px', padding: '18px', borderRadius: '18px', 
            background: '#1D1D1F', color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer' 
          }}
        >
          Acknowledge Protocol
        </button>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .bento-card { border-radius: 20px; transition: transform 0.2s ease; }
      `}</style>
    </div>
  );
}