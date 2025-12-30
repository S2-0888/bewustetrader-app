import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { 
    ArrowsClockwise, ShieldCheck, Database, 
    CaretRight, XCircle, CheckCircle 
} from '@phosphor-icons/react';

import IntakeChat from './IntakeChat'; 

export default function LandingPage({ onSignIn }) {
    const navigate = useNavigate();
    const [appState, setAppState] = useState('loading'); 
    const BETA_MODE = true; 

    useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            const data = userDoc.data();

            if (userDoc.exists() && (data.isApproved || data.role === 'admin')) {
                // Gebruiker is goedgekeurd -> Dashboard
                navigate('/dashboard');
            } else if (userDoc.exists() && data.hasCompletedIntake) {
                // Ingelogd + Intake gedaan -> Toon de Pending Audit overlay
                setAppState('pending');
            } else {
                // Ingelogd + GEEN intake gedaan -> Open de chat!
                setAppState('intake');
            }
        } else {
            // Niet ingelogd -> Toon landing page
            setAppState('landing');
        }
    });
    return () => unsub();
}, [navigate]);

    useEffect(() => {
        const handleTrigger = () => {
            console.log("Sign-in trigger ontvangen van IntakeChat");
            onSignIn(); 
        };
        window.addEventListener('triggerSignIn', handleTrigger);
        return () => window.removeEventListener('triggerSignIn', handleTrigger);
    }, [onSignIn]);

    const handleLoginClick = () => {
        onSignIn(); 
    };

    if (appState === 'loading') return <div style={styles.fullCenter}><ArrowsClockwise size={32} className="spinner" /></div>;

    // --- START VERVANGEN SECTIE: PENDING STATE ---
    if (appState === 'pending') {
        return (
            <div style={{ ...styles.fullCenter, backgroundColor: '#000', color: '#fff', flexDirection: 'column', textAlign: 'center', padding: '20px' }}>
                {/* Background Decor */}
                <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(0,122,255,0.15) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(40px)', zIndex: 0 }}></div>

                <div style={{ zIndex: 1, maxWidth: '500px' }}>
                    <div className="audit-container" style={{ marginBottom: '40px' }}>
                        <div className="pulse-icon" style={{ width: 100, height: 100, borderRadius: '30%', background: 'rgba(29, 29, 31, 0.8)', border: '1px solid rgba(0, 122, 255, 0.3)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', position: 'relative' }}>
                            <ShieldCheck size={48} weight="duotone" color="#007AFF" />
                            <div style={{ position: 'absolute', inset: '-2px', borderRadius: '30%', border: '1px solid #007AFF', animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite' }}></div>
                        </div>
                    </div>

                    <div style={{ display: 'inline-block', padding: '6px 12px', background: 'rgba(0,122,255,0.1)', borderRadius: '20px', border: '1px solid rgba(0,122,255,0.2)', marginBottom: '20px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 900, color: '#007AFF', letterSpacing: '2px', textTransform: 'uppercase' }}>System Audit in Progress</span>
                    </div>

                    <h2 style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-1px', margin: '0 0 15px 0' }}>Institutional Access Pending</h2>
                    
                    <p style={{ color: '#86868B', lineHeight: 1.6, fontSize: '16px', margin: '0 auto 40px auto' }}>
                        The Conscious Trader is currently auditing your intake parameters. We verify every pilot to ensure the integrity of the Propfolio ecosystem.
                    </p>

                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '20px', textAlign: 'left', marginBottom: '40px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00ff00', boxShadow: '0 0 10px #00ff00' }}></div>
                            <span style={{ fontSize: '13px', fontWeight: 600 }}>Intake Data Received</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#007AFF', animation: 'blink 1s infinite' }}></div>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#86868B' }}>Architect Verification Pending...</span>
                        </div>
                    </div>

                    <button 
                        onClick={() => auth.signOut()} 
                        style={{ background: 'transparent', color: '#86868B', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                    >
                        Sign out and return later
                    </button>
                </div>

                <style>{`
                    @keyframes ping {
                        75%, 100% { transform: scale(1.4); opacity: 0; }
                    }
                    @keyframes blink {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.3; }
                    }
                `}</style>
            </div>
        );
    }
    // --- EINDE VERVANGEN SECTIE ---

    if (appState === 'intake') {
        return <IntakeChat onCancel={() => setAppState('landing')} />;
    }

    return (
        <div style={styles.landingWrapper}>
            <nav style={styles.nav}>
                <div style={{fontWeight: 900, fontSize: 20, letterSpacing: -1}}>PROPFOLIO</div>
                <button onClick={handleLoginClick} style={styles.btnSecondary}>CEO Login</button>
            </nav>

            <div style={styles.hero}>
                <div style={styles.badge}>PPOS — PROPFIRM PORTFOLIO OPERATING SYSTEM</div>
                <h1 style={styles.h1}>Trade like a business.<br/><span style={{color: '#007AFF'}}>Not a hobby.</span></h1>
                <p style={styles.p}>Stop managing millions in messy spreadsheets. Scale your portfolio with TCT-powered emotional intelligence and institutional structure.</p>
                
                {BETA_MODE ? (
                    <button 
                        onClick={() => {
                            // Stap 1: Trigger eerst de login
                            onSignIn(); 
                        }} 
                        style={styles.btnMain}
                    >
                        Apply for Whitelist <CaretRight weight="bold" />
                    </button>
                ) : (
                    <button onClick={handleLoginClick} style={styles.btnMain}>
                        Get Started Now <CaretRight weight="bold" />
                    </button>
                )}
            </div>

            <div style={styles.featureGrid}>
                <div className="bento-card" style={styles.featureCard}>
                    <div style={styles.iconCircle}><CheckCircle size={24} weight="fill" /></div>
                    <h3 style={styles.featureTitle}>Create your Challenge</h3>
                    <p style={styles.featureText}>Manage & journal your account from day one. The Conscious Trader guides you through your goals with institutional precision.</p>
                </div>

                <div className="bento-card" style={styles.featureCard}>
                    <div style={styles.iconCircle}><Database size={24} weight="fill" /></div>
                    <h3 style={styles.featureTitle}>Build Your Prop Portfolio</h3>
                    <p style={styles.featureText}>Buy, manage, and analyze all your challenges & funded accounts in one place. Get real-time AI-powered feedback.</p>
                </div>

                <div className="bento-card" style={styles.featureCard}>
                    <div style={styles.iconCircle}><XCircle size={24} weight="fill" /></div>
                    <h3 style={styles.featureTitle}>Stop the Excel Juggling</h3>
                    <p style={styles.featureText}>Managing 10+ accounts in spreadsheets is a recipe for disaster. Propfolio gives you full control and payout overviews.</p>
                </div>
            </div>

            <footer style={{ padding: '40px 20px', textAlign: 'center', color: '#86868B', fontSize: 12 }}>
                &copy; {new Date().getFullYear()} Propfolio PPOS.
            </footer>
        </div>
    );
}

const styles = {
    landingWrapper: { background: '#F5F5F7', minHeight: '100vh', overflowY: 'auto' },
    fullCenter: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F5F7' },
    nav: { position: 'sticky', top: 0, zIndex: 100, background: 'rgba(245, 245, 247, 0.8)', backdropFilter: 'blur(20px)', padding: '20px 50px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.05)' },
    hero: { minHeight: '90vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '100px 20px 40px 20px' },
    badge: { fontSize: 10, fontWeight: 900, color: '#007AFF', background: 'rgba(0,122,255,0.08)', padding: '8px 16px', borderRadius: 20, marginBottom: 25, letterSpacing: 1 },
    h1: { fontSize: 'clamp(32px, 6vw, 72px)', fontWeight: 900, letterSpacing: '-3px', lineHeight: 1, margin: 0 },
    p: { fontSize: 18, color: '#86868B', maxWidth: 650, marginTop: 25, lineHeight: 1.6 },
    btnMain: { marginTop: 40, padding: '20px 40px', background: '#1D1D1F', color: 'white', border: 'none', borderRadius: 18, fontSize: 17, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 },
    btnSecondary: { padding: '10px 20px', borderRadius: 12, border: '1px solid #E5E5EA', background: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 13 },
    featureGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 30, maxWidth: 1200, margin: '40px auto 100px auto', padding: '0 20px' },
    featureCard: { background: 'white', padding: '40px', textAlign: 'left', borderRadius: '32px', border: '1px solid #E5E5EA' },
    iconCircle: { width: 48, height: 48, borderRadius: 14, background: '#007AFF10', color: '#007AFF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    featureTitle: { fontSize: 20, fontWeight: 900, marginBottom: 15, color: '#1D1D1F' },
    featureText: { fontSize: 15, color: '#86868B', lineHeight: 1.6 }
};