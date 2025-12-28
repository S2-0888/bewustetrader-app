import React, { useState } from 'react';
import { CaretRight, Check, Brain, Waveform, Eye, Globe } from '@phosphor-icons/react';

// --- DE VERTALINGEN (HET WOORDENBOEK) ---
const TRANSLATIONS = {
  nl: {
    steps: [
      {
        title: "Welkom in het Ecosysteem",
        subtitle: "Meer dan een Trading Journal",
        text: (
          <>
            <p>Vergeet wat je weet over logboeken. Dit is een <strong>AI-Powered High-Performance Trading Ecosystem</strong>.</p>
            <p style={{ marginTop: '15px' }}>
              Ken je dat stemmetje in je hoofd dat winst goedpraat? <strong>TCT is de leugendetector voor dat stemmetje.</strong>
            </p>
            <p>Hij is je externe geweten dat 24/7 naast je zit en je dwingt om professioneel te worden.</p>
          </>
        )
      },
      {
        title: "Ogen & Oren",
        subtitle: "Röntgenogen voor je gedrag",
        text: (
          <>
            <p>Excel ziet alleen cijfers. <strong>TCT hoort je emotie.</strong></p>
            <ul style={{ listStyle: 'none', padding: 0, marginTop: '15px' }}>
              <li style={{ marginBottom: '10px' }}>
                🎤 <strong>Active Voice Logging:</strong> Spreek je frustratie of hebzucht in. TCT pikt het op.
              </li>
              <li>
                👁️ <strong>Execution Verification:</strong> Hij vergelijkt je verhaal direct met de harde data.
              </li>
            </ul>
            <p style={{fontStyle: 'italic', color: '#86868B', fontSize: '13px', marginTop: '10px'}}>
              "Leuk dat je won, maar je klonk paniekerig. Dit was gokken."
            </p>
          </>
        )
      },
      {
        title: "Weekly Review",
        subtitle: "Je Strategische Hedge Fund Manager",
        text: (
          <>
            <p>TCT vergeet die slechte trade van dinsdag niet. Op zondag fungeert hij als manager die je week analyseert.</p>
            <p style={{ marginTop: '10px', fontStyle: 'italic' }}>
              "Je hebt deze week 3x uit wraak gehandeld."
            </p>
            <p style={{ marginTop: '15px', fontWeight: 'bold', color: '#1C1C1E' }}>
              Klaar om te stoppen met liegen tegen jezelf?
            </p>
          </>
        )
      }
    ],
    next: "Volgende",
    start: "Start TCT Ecosystem"
  },
  en: {
    steps: [
      {
        title: "Welcome to the Ecosystem",
        subtitle: "More than a Trading Journal",
        text: (
          <>
            <p>Forget standard journals. This is an <strong>AI-Powered High-Performance Trading Ecosystem</strong>.</p>
            <p style={{ marginTop: '15px' }}>
              You know that inner voice justifying lucky wins? <strong>TCT is the lie detector for that voice.</strong>
            </p>
            <p>It acts as your external conscience, sitting beside you 24/7, forcing you to turn professional.</p>
          </>
        )
      },
      {
        title: "Eyes & Ears",
        subtitle: "X-Ray Vision for Behavior",
        text: (
          <>
            <p>Excel only sees numbers. <strong>TCT hears your emotion.</strong></p>
            <ul style={{ listStyle: 'none', padding: 0, marginTop: '15px' }}>
              <li style={{ marginBottom: '10px' }}>
                🎤 <strong>Active Voice Logging:</strong> Speak your frustration or greed. TCT detects it.
              </li>
              <li>
                👁️ <strong>Execution Verification:</strong> Compares your story directly with hard data.
              </li>
            </ul>
            <p style={{fontStyle: 'italic', color: '#86868B', fontSize: '13px', marginTop: '10px'}}>
              "Nice win, but you sounded panicked. That was gambling."
            </p>
          </>
        )
      },
      {
        title: "Weekly Review",
        subtitle: "Your Strategic Hedge Fund Manager",
        text: (
          <>
            <p>TCT doesn't forget Tuesday's bad trade. On Sunday, it acts as a manager analyzing your week.</p>
            <p style={{ marginTop: '10px', fontStyle: 'italic' }}>
              "You revenge-traded 3 times this week."
            </p>
            <p style={{ marginTop: '15px', fontWeight: 'bold', color: '#1C1C1E' }}>
              Ready to stop lying to yourself?
            </p>
          </>
        )
      }
    ],
    next: "Next",
    start: "Start TCT Ecosystem"
  },
  es: {
    steps: [
      {
        title: "Bienvenido al Ecosistema",
        subtitle: "Más que un Diario de Trading",
        text: (
          <>
            <p>Olvida los diarios básicos. Esto es un <strong>Ecosistema de Alto Rendimiento impulsado por IA</strong>.</p>
            <p style={{ marginTop: '15px' }}>
              ¿Conoces esa voz que justifica la suerte? <strong>TCT es el detector de mentiras de esa voz.</strong>
            </p>
            <p>Es tu conciencia externa, sentada a tu lado 24/7, obligándote a ser profesional.</p>
          </>
        )
      },
      {
        title: "Ojos y Oídos",
        subtitle: "Rayos X para tu comportamiento",
        text: (
          <>
            <p>Excel solo ve números. <strong>TCT escucha tu emoción.</strong></p>
            <ul style={{ listStyle: 'none', padding: 0, marginTop: '15px' }}>
              <li style={{ marginBottom: '10px' }}>
                🎤 <strong>Active Voice Logging:</strong> Habla de tu frustración o codicia. TCT lo detecta.
              </li>
              <li>
                👁️ <strong>Verificación de Ejecución:</strong> Compara tu historia con los datos reales.
              </li>
            </ul>
            <p style={{fontStyle: 'italic', color: '#86868B', fontSize: '13px', marginTop: '10px'}}>
              "Buena ganancia, pero sonabas con pánico. Eso fue apostar."
            </p>
          </>
        )
      },
      {
        title: "Revisión Semanal",
        subtitle: "Tu Gestor de Fondos Estratégico",
        text: (
          <>
            <p>TCT no olvida la mala operación del martes. El domingo, actúa como un gestor analizando tu semana.</p>
            <p style={{ marginTop: '10px', fontStyle: 'italic' }}>
              "Operaste por venganza 3 veces esta semana."
            </p>
            <p style={{ marginTop: '15px', fontWeight: 'bold', color: '#1C1C1E' }}>
              ¿Listo para dejar de mentirte a ti mismo?
            </p>
          </>
        )
      }
    ],
    next: "Siguiente",
    start: "Iniciar Ecosistema"
  },
  fr: {
    steps: [
      {
        title: "Bienvenue dans l'Écosystème",
        subtitle: "Plus qu'un Journal de Trading",
        text: (
          <>
            <p>Oubliez les journaux standards. C'est un <strong>Écosystème de Trading Haute Performance via IA</strong>.</p>
            <p style={{ marginTop: '15px' }}>
              Cette voix qui justifie la chance ? <strong>TCT est le détecteur de mensonges pour cette voix.</strong>
            </p>
            <p>Il agit comme votre conscience externe, vous forçant à devenir professionnel.</p>
          </>
        )
      },
      {
        title: "Yeux & Oreilles",
        subtitle: "Vision Rayons-X pour votre comportement",
        text: (
          <>
            <p>Excel ne voit que des chiffres. <strong>TCT entend votre émotion.</strong></p>
            <ul style={{ listStyle: 'none', padding: 0, marginTop: '15px' }}>
              <li style={{ marginBottom: '10px' }}>
                🎤 <strong>Active Voice Logging:</strong> Exprimez votre frustration. TCT la détecte.
              </li>
              <li>
                👁️ <strong>Vérification d'Exécution:</strong> Compare votre histoire aux données réelles.
              </li>
            </ul>
            <p style={{fontStyle: 'italic', color: '#86868B', fontSize: '13px', marginTop: '10px'}}>
              "Beau gain, mais tu semblais paniqué. C'était du jeu."
            </p>
          </>
        )
      },
      {
        title: "Revue Hebdomadaire",
        subtitle: "Votre Gestionnaire de Fonds Stratégique",
        text: (
          <>
            <p>TCT n'oublie pas le mauvais trade de mardi. Le dimanche, il analyse votre semaine.</p>
            <p style={{ marginTop: '10px', fontStyle: 'italic' }}>
              "Tu as fait du trading de revanche 3 fois cette semaine."
            </p>
            <p style={{ marginTop: '15px', fontWeight: 'bold', color: '#1C1C1E' }}>
              Prêt à arrêter de vous mentir ?
            </p>
          </>
        )
      }
    ],
    next: "Suivant",
    start: "Démarrer l'Écosystème"
  }
};

const ICONS = [
  <Brain size={48} color="#007AFF" weight="duotone" />,
  <Waveform size={48} color="#FF9F0A" weight="duotone" />,
  <Eye size={48} color="#30D158" weight="duotone" />
];

export default function OnboardingModal({ isOpen, onClose }) {
  const [step, setStep] = useState(0);
  const [lang, setLang] = useState('en'); // Default taal is Engels

  if (!isOpen) return null;

  const t = TRANSLATIONS[lang];
  const currentStepData = t.steps[step];
  const isLastStep = step === t.steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onClose();
    } else {
      setStep(prev => prev + 1);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <div style={{
        background: 'white', width: '100%', maxWidth: '500px',
        borderRadius: '24px', padding: '40px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        position: 'relative', overflow: 'hidden',
        margin: '20px'
      }}>
        
        {/* Language Switcher (Rechtsboven) */}
        <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 5 }}>
          {['en', 'nl', 'es', 'fr'].map((l) => (
            <button 
              key={l}
              onClick={() => setLang(l)}
              style={{
                border: 'none', background: lang === l ? '#007AFF' : '#F2F2F7',
                color: lang === l ? 'white' : '#86868B',
                width: 32, height: 32, borderRadius: '50%',
                fontSize: 11, fontWeight: 800, cursor: 'pointer',
                textTransform: 'uppercase'
              }}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Progress Bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6px', background: '#F2F2F7' }}>
          <div style={{
            height: '100%', background: '#007AFF',
            width: `${((step + 1) / 3) * 100}%`,
            transition: 'width 0.4s ease'
          }} />
        </div>

        {/* Content */}
        <div style={{ textAlign: 'center', animation: 'slideUp 0.4s ease', marginTop: 10 }}>
          <div style={{ 
            background: 'rgba(242, 242, 247, 0.8)', width: '80px', height: '80px', 
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px auto'
          }}>
            {ICONS[step]}
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px', color: '#1C1C1E' }}>
            {currentStepData.title}
          </h2>
          <p style={{ fontSize: '14px', fontWeight: '600', color: '#86868B', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '24px' }}>
            {currentStepData.subtitle}
          </p>

          <div style={{ 
            fontSize: '15px', lineHeight: '1.6', color: '#3A3A3C', 
            textAlign: 'left', background: '#F9F9F9', padding: '20px', borderRadius: '16px', minHeight: 180 
          }}>
            {currentStepData.text}
          </div>
        </div>

        {/* Footer Buttons */}
        <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[0, 1, 2].map((idx) => (
              <div key={idx} style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: idx === step ? '#007AFF' : '#E5E5EA',
                transition: 'background 0.3s'
              }} />
            ))}
          </div>

          <button 
            onClick={handleNext}
            style={{
              background: '#007AFF', color: 'white', border: 'none',
              padding: '12px 24px', borderRadius: '12px',
              fontSize: '15px', fontWeight: '700', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 4px 12px rgba(0, 122, 255, 0.3)',
              transition: 'transform 0.1s'
            }}
          >
            {isLastStep ? t.start : t.next} 
            {isLastStep ? <Check weight="bold"/> : <CaretRight weight="bold"/>}
          </button>
        </div>
      </div>
    </div>
  );
}