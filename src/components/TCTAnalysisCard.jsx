import React from 'react';
import { 
  UserCircle, Microphone, Sparkle, 
  TrendUp, Warning, CheckCircle, Info 
} from '@phosphor-icons/react';

export default function TCTAnalysisCard({ applicant, onApprove }) {
  const { analysis, name, email, accounts, experience, appliedAt } = applicant;

  // Kleurlogica op basis van archetype
  const getArchetypeColor = (type) => {
    if (type?.includes('Professional')) return '#30D158';
    if (type?.includes('Gambler')) return '#FF3B30';
    if (type?.includes('Perfectionist')) return '#007AFF';
    return '#FF9F0A'; // Hesitant Trader
  };

  if (!analysis) return <div style={loadingState}>TCT is analyzing profile...</div>;

  return (
    <div style={cardStyle}>
      {/* HEADER: Applicant Info */}
      <div style={headerSection}>
        <div style={userBadge}>
          <UserCircle size={32} weight="fill" color="#86868B" />
          <div>
            <h4 style={nameStyle}>{name}</h4>
            <span style={emailStyle}>{email}</span>
          </div>
        </div>
        <div style={statusBadge(getArchetypeColor(analysis.archetype))}>
          {analysis.archetype}
        </div>
      </div>

      <div style={divider} />

      {/* TRANSCRIPT SECTIE (De rauwe feiten) */}
      <div style={section}>
        <div style={sectionLabel}>
          <Microphone size={16} weight="fill" /> VOICE TRANSCRIPT
        </div>
        <div style={transcriptBox}>
          "{analysis.transcript || "No audio provided."}"
        </div>
      </div>

      {/* SHADOW REPORT (De AI-inzichten) */}
      <div style={{ ...section, background: 'rgba(0, 122, 255, 0.03)', padding: '15px', borderRadius: '12px' }}>
        <div style={{ ...sectionLabel, color: '#007AFF' }}>
          <Sparkle size={16} weight="fill" /> TCT SHADOW ANALYSIS
        </div>
        <p style={shadowTextStyle}>{analysis.shadow_report}</p>
        
        <div style={metaGrid}>
          <div style={metaItem}>
            <span style={metaLabel}>SENTIMENT</span>
            <span style={metaValue}>{analysis.sentiment}</span>
          </div>
          <div style={metaItem}>
            <span style={metaLabel}>SERIOUSNESS</span>
            <span style={{ ...metaValue, color: analysis.seriousness_score > 7 ? '#30D158' : '#FF9F0A' }}>
              {analysis.seriousness_score}/10
            </span>
          </div>
        </div>
      </div>

      {/* RECOMMENDATION (Het advies aan jou) */}
      <div style={recommendationSection}>
        <div style={sectionLabel}><TrendUp size={16} /> FOUNDER RECOMMENDATION</div>
        <p style={recText}>{analysis.recommendation}</p>
      </div>

      {/* ACTION BUTTON */}
      <button onClick={() => onApprove(applicant)} style={approveBtn}>
        <CheckCircle size={20} weight="fill" /> APPROVE AS FOUNDER
      </button>
    </div>
  );
}

// STYLES
const cardStyle = { background: 'white', borderRadius: '24px', padding: '25px', border: '1px solid #F2F2F7', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '20px' };
const headerSection = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' };
const userBadge = { display: 'flex', gap: '12px', alignItems: 'center' };
const nameStyle = { margin: 0, fontSize: '18px', fontWeight: 800 };
const emailStyle = { fontSize: '12px', color: '#86868B' };
const divider = { height: '1px', background: '#F2F2F7', width: '100%' };
const section = { display: 'flex', flexDirection: 'column', gap: '8px' };
const sectionLabel = { fontSize: '10px', fontWeight: 900, color: '#86868B', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.5px' };
const transcriptBox = { fontStyle: 'italic', fontSize: '13px', color: '#1C1C1E', lineHeight: '1.5', background: '#F8F9FB', padding: '12px', borderRadius: '10px', border: '1px solid #E5E5EA' };
const shadowTextStyle = { fontSize: '14px', lineHeight: '1.6', color: '#1C1C1E', margin: '5px 0' };
const metaGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '10px' };
const metaItem = { display: 'flex', flexDirection: 'column', gap: '2px' };
const metaLabel = { fontSize: '9px', fontWeight: 800, color: '#86868B' };
const metaValue = { fontSize: '12px', fontWeight: 700 };
const recommendationSection = { borderTop: '1px dashed #E5E5EA', paddingTop: '15px' };
const recText = { fontSize: '13px', fontWeight: 600, color: '#1C1C1E', margin: '5px 0' };
const approveBtn = { background: '#1D1D1F', color: 'white', border: 'none', borderRadius: '14px', padding: '16px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '10px', transition: '0.2s' };
const loadingState = { padding: '40px', textAlign: 'center', color: '#86868B', fontSize: '14px', fontWeight: 600 };
const statusBadge = (color) => ({ padding: '6px 12px', borderRadius: '8px', background: `${color}15`, color: color, fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' });