import React, { useEffect, useState } from 'react';
import { 
  Rocket, ShieldCheck, Brain, ChartBar, 
  ArrowRight, Crown, Warehouse, Fingerprint, 
  CaretDown, Sparkle
} from '@phosphor-icons/react';

export default function LandingPage({ onEnter }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div style={{ 
      background: '#FFFFFF', 
      color: '#1D1D1F', 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      overflowX: 'hidden'
    }}>
      
      {/* NAVIGATION */}
      <nav style={{
        position: 'fixed', top: 0, width: '100%', zIndex: 1000,
        background: scrolled ? 'rgba(255,255,255,0.8)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        transition: 'all 0.3s ease',
        borderBottom: scrolled ? '1px solid rgba(0,0,0,0.05)' : 'none'
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#1D1D1F', color: 'white', padding: '8px', borderRadius: '10px', fontWeight: 900, fontSize: '14px' }}>TCT</div>
            <span style={{ fontWeight: 800, letterSpacing: '-0.5px' }}>PROPFOLIO</span>
          </div>
          <button 
            onClick={onEnter}
            style={{ 
              background: '#1D1D1F', color: 'white', border: 'none', padding: '10px 20px', 
              borderRadius: '12px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' 
            }}
          >
            Founder Login
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section style={{ 
        padding: '160px 20px 100px 20px', textAlign: 'center', maxWidth: 900, margin: '0 auto',
        minHeight: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'center'
      }}>
        <div style={{ 
          display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(0,122,255,0.05)', 
          padding: '6px 16px', borderRadius: '30px', color: '#007AFF', fontSize: '12px', fontWeight: 800, marginBottom: 30,
          margin: '0 auto 30px auto'
        }}>
          <Sparkle weight="fill" size={14} /> THE WORLD'S FIRST PROP-ERP
        </div>
        
        <h1 style={{ 
          fontSize: window.innerWidth < 768 ? '42px' : '72px', 
          fontWeight: 900, letterSpacing: '-3px', lineHeight: 1, margin: '0 0 25px 0' 
        }}>
          Don’t just trade.<br />
          <span style={{ color: '#86868B' }}>Run the business.</span>
        </h1>
        
        <p style={{ 
          fontSize: '20px', color: '#86868B', lineHeight: 1.5, maxWidth: 650, margin: '0 auto 40px auto', fontWeight: 500 
        }}>
          Manage your capital inventory, automate your discipline, and scale your payouts with TCT AI. Designed for high-performance traders.
        </p>

        <div style={{ display: 'flex', gap: 15, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={onEnter}
            style={{ 
              background: '#007AFF', color: 'white', border: 'none', padding: '18px 36px', 
              borderRadius: '16px', fontWeight: 800, fontSize: '17px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 10px 30px rgba(0,122,255,0.3)'
            }}
          >
            Get Founder Access <ArrowRight weight="bold" />
          </button>
        </div>
      </section>

      {/* MODULES SECTION - THE ERP LOGIC */}
      <section style={{ background: '#F5F5F7', padding: '100px 20px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{ fontSize: '40px', fontWeight: 900, letterSpacing: '-1.5px' }}>Enterprise Architecture</h2>
            <p style={{ color: '#86868B', fontSize: '18px' }}>Moving beyond simple journaling into systematic inventory management.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1fr 1fr 1fr', gap: 25 }}>
            
            <ModuleCard 
              icon={<Warehouse size={32} color="#007AFF" weight="duotone" />}
              title="The Account Warehouse"
              desc="Treat accounts as inventory. Track the full lifecycle from Purchased → Challenge → Funded → Payout Phase."
            />
            
            <ModuleCard 
              icon={<Brain size={32} color="#AF52DE" weight="duotone" />}
              title="The Performance Lab"
              desc="Conscious data-entry only. We don't believe in lazy imports. Administration is your greatest competitive edge."
            />
            
            <ModuleCard 
              icon={<ShieldCheck size={32} color="#30D158" weight="duotone" />}
              title="TCT: AI Co-Pilot"
              desc="A behavioral AI that monitors your emotions and risk. TCT intervenes when your psychology deviates from the plan."
            />

          </div>
        </div>
      </section>

      {/* PHILOSOPHY SECTION */}
      <section style={{ padding: '100px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <Crown size={48} weight="fill" color="#FFD60A" style={{ marginBottom: 20 }} />
          <h2 style={{ fontSize: '36px', fontWeight: 900, marginBottom: 20 }}>The Effort Philosophy</h2>
          <p style={{ fontSize: '20px', lineHeight: 1.6, color: '#1D1D1F', fontWeight: 500 }}>
            "Traden op hoog niveau met een rommelige Excel-sheet is als een miljoenenbedrijf runnen op een kladblok. Propfolio dwingt tot bewustzijn. Winst is een resultaat van je proces, niet van geluk."
          </p>
          <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 15 }}>
            <div style={{ width: 40, height: 1, background: '#E5E5EA' }} />
            <span style={{ fontWeight: 800, fontSize: '14px', letterSpacing: '1px' }}>FOUNDERS EDITION</span>
            <div style={{ width: 40, height: 1, background: '#E5E5EA' }} />
          </div>
        </div>
      </section>

      {/* FOOTER CTA */}
      <section style={{ 
        padding: '100px 20px', background: '#1D1D1F', color: 'white', textAlign: 'center' 
      }}>
        <h2 style={{ fontSize: '48px', fontWeight: 900, letterSpacing: '-2px', marginBottom: 20 }}>Ready to scale?</h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '18px', marginBottom: 40 }}>Join the network of conscious traders.</p>
        <button 
          onClick={onEnter}
          style={{ 
            background: 'white', color: 'black', border: 'none', padding: '18px 40px', 
            borderRadius: '16px', fontWeight: 800, fontSize: '17px', cursor: 'pointer' 
          }}
        >
          Claim Founder Status
        </button>
      </section>

    </div>
  );
}

function ModuleCard({ icon, title, desc }) {
  return (
    <div style={{ 
      background: 'white', padding: '40px', borderRadius: '28px', 
      boxShadow: '0 10px 40px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.02)' 
    }}>
      <div style={{ marginBottom: 20 }}>{icon}</div>
      <h3 style={{ fontSize: '22px', fontWeight: 800, marginBottom: 15 }}>{title}</h3>
      <p style={{ color: '#86868B', lineHeight: 1.6, fontSize: '15px', fontWeight: 500 }}>{desc}</p>
    </div>
  );
}