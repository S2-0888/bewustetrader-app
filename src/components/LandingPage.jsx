import React from 'react';
import { ArrowRight, Brain, ChartLineUp, Briefcase, Target, Microphone } from '@phosphor-icons/react';

export default function LandingPage({ onLoginClick }) {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', color: '#1D1D1F', background: '#F5F5F7', minHeight: '100vh' }}>
      
      {/* NAV */}
      <nav style={{ padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ fontWeight: 900, fontSize: 24, letterSpacing: '-1px' }}>DBT Cloud.</div>
        <button onClick={onLoginClick} style={{ background: '#007AFF', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 20, fontWeight: 600, cursor: 'pointer' }}>Login</button>
      </nav>

      {/* HERO */}
      <header style={{ textAlign: 'center', padding: '100px 20px', maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'inline-block', padding: '6px 12px', background: 'rgba(175, 82, 222, 0.1)', color: '#AF52DE', borderRadius: 20, fontSize: 12, fontWeight: 800, marginBottom: 20 }}>THE GROWTH ENGINE</div>
        <h1 style={{ fontSize: '56px', fontWeight: 900, lineHeight: 1.1, marginBottom: 24, letterSpacing: '-2px' }}>
          Van Dagelijkse Executie <br/> <span style={{ color: '#86868B' }}>Naar Levensvisie.</span>
        </h1>
        <p style={{ fontSize: 20, color: '#48484A', lineHeight: 1.6, marginBottom: 40 }}>
          Traden is eenzaam. De chaos van de markt laat je je doelen vergeten. <br/>
          Dit is geen logboek. Dit is je externe geweten.
        </p>
        <button onClick={onLoginClick} style={{ background: '#1D1D1F', color: 'white', border: 'none', padding: '16px 40px', borderRadius: 30, fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}>
          Start Beta Access <ArrowRight weight="bold" />
        </button>
      </header>

      {/* THE 4 PILLARS */}
      <section style={{ padding: '80px 20px', background: 'white' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', fontWeight: 800, fontSize: 32, marginBottom: 60 }}>Het Holistisch Performance Ecosysteem</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 30 }}>
                <Pillar icon={<Brain size={32} color="#007AFF"/>} title="The Engine" subtitle="TradeLab + Voice" text="De dagelijkse uitvoering. Voice Analysis met röntgenogen die je emotie hoort." />
                <Pillar icon={<Briefcase size={32} color="#FF9F0A"/>} title="The Inventory" subtitle="Portfolio" text="Het beheer van je middelen. Hoe bescherm ik mijn assets en funded accounts?" />
                <Pillar icon={<ChartLineUp size={32} color="#30D158"/>} title="The Business" subtitle="Finance" text="De winstgevendheid. Draait je bedrijf ROI of ben je een hobbyist?" />
                <Pillar icon={<Target size={32} color="#AF52DE"/>} title="The Purpose" subtitle="Goals & Rewards" text="De drijfveer. TCT verbindt je woede van vandaag aan je droomreis naar Bali." />
            </div>
        </div>
      </section>

      {/* USP / TCT */}
      <section style={{ padding: '100px 20px', maxWidth: 1000, margin: '0 auto', display: 'flex', gap: 50, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 300 }}>
            <h2 style={{ fontSize: 40, fontWeight: 900, marginBottom: 20 }}>Ontmoet TCT. <br/>Je Accountability Partner.</h2>
            <p style={{ fontSize: 18, color: '#48484A', lineHeight: 1.6 }}>
                Andere tools kijken naar cijfers. TCT kijkt naar jou. Hij herkent patronen die jij mist ("Je hebt 3x wraak genomen deze week") en grijpt in vóórdat het fout gaat.
            </p>
            <div style={{ marginTop: 30, display: 'flex', gap: 15 }}>
                <div style={{ padding: '15px 25px', background: '#F2F2F7', borderRadius: 16, fontWeight: 700 }}>Active Voice Logging</div>
                <div style={{ padding: '15px 25px', background: '#F2F2F7', borderRadius: 16, fontWeight: 700 }}>Weekly Review</div>
            </div>
        </div>
        <div style={{ flex: 1, minWidth: 300, background: '#1C1C1E', borderRadius: 30, padding: 40, color: 'white', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <Microphone size={40} color="#FF3B30" weight="fill" style={{ marginBottom: 20 }}/>
            <p style={{ fontFamily: 'monospace', fontSize: 14, color: '#86868B', marginBottom: 10 }}>[JOUW AUDIO INPUT]</p>
            <p style={{ fontStyle: 'italic', opacity: 0.8, marginBottom: 30 }}>"Ik ben gefrustreerd en wil wraak nemen op de markt!"</p>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.2)', marginBottom: 30 }}></div>
            <p style={{ fontFamily: 'monospace', fontSize: 14, color: '#007AFF', marginBottom: 10 }}>[TCT INTERVENTIE]</p>
            <p style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.5 }}>"Stop! Je hebt als doel gesteld om je gezin mee te nemen naar Bali. Deze wraak-trade brengt je verder van Bali vandaan. Is dat het waard?"</p>
        </div>
      </section>

      <footer style={{ padding: '40px', textAlign: 'center', borderTop: '1px solid #E5E5EA', color: '#86868B', fontSize: 12 }}>
        <p>&copy; 2025 DBT Cloud. High Performance Systems.</p>
      </footer>
    </div>
  );
}

function Pillar({ icon, title, subtitle, text }) {
    return (
        <div style={{ padding: 30, background: '#F9F9F9', borderRadius: 24, transition: '0.3s' }}>
            <div style={{ marginBottom: 20 }}>{icon}</div>
            <h3 style={{ margin: '0 0 5px 0', fontSize: 18, fontWeight: 800 }}>{title}</h3>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#86868B', textTransform: 'uppercase', marginBottom: 15 }}>{subtitle}</div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#48484A' }}>{text}</p>
        </div>
    )
}