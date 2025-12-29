import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { 
    ArrowsClockwise, ShieldCheck, Database, 
    CaretRight, XCircle, CheckCircle 
} from '@phosphor-icons/react';

// Importeer het losse component
import IntakeChat from './IntakeChat'; 

export default function LandingPage() {
    const navigate = useNavigate();
    const [appState, setAppState] = useState('loading'); 
    const BETA_MODE = true; // Handmatige switch: true = Whitelist, false = Public Sign Up

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists() && userDoc.data().isApproved) navigate('/dashboard');
                else setAppState('pending');
            } else {
                setAppState('landing');
            }
        });
        return () => unsub();
    }, [navigate]);

    const handleGoogleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const userDoc = await getDoc(doc(db, "users", result.user.uid));
            if (userDoc.exists() && userDoc.data().isApproved) navigate('/dashboard');
            else setAppState('pending');
        } catch (err) { console.error(err); }
    };

    if (appState === 'loading') return <div style={styles.fullCenter}><ArrowsClockwise size={32} className="spinner" /></div>;

    if (appState === 'pending') {
        return (
            <div style={styles.fullCenter}>
                <div className="bento-card" style={{padding: 40, textAlign: 'center', maxWidth: 450, background: 'white'}}>
                    <h2 style={{fontWeight: 900, marginTop: 20}}>Shadow Analysis in Progress</h2>
                    <p style={{color: '#86868B', lineHeight: 1.6}}>TCT is currently auditing your intake data. Access to the Propfolio Cockpit is granted based on professional readiness.</p>
                    <button onClick={() => auth.signOut()} style={{marginTop: 30, color: '#FF3B30', background: 'none', border: 'none', fontWeight: 700, cursor: 'pointer'}}>Cancel & Logout</button>
                </div>
            </div>
        );
    }

    if (appState === 'intake') {
        return <IntakeChat onCancel={() => setAppState('landing')} />;
    }

    return (
        <div style={styles.landingWrapper}>
            {/* STICKY NAV */}
            <nav style={styles.nav}>
                <div style={{fontWeight: 900, fontSize: 20, letterSpacing: -1}}>PROPFOLIO</div>
                <button onClick={handleGoogleLogin} style={styles.btnSecondary}>CEO Login</button>
            </nav>

            {/* HERO SECTIE */}
            <div style={styles.hero}>
                <div style={styles.badge}>PPOS — PROPFIRM PORTFOLIO OPERATING SYSTEM</div>
                <h1 style={styles.h1}>Trade like a business.<br/><span style={{color: '#007AFF'}}>Not a hobby.</span></h1>
                <p style={styles.p}>Stop managing millions in messy spreadsheets. Scale your portfolio with TCT-powered emotional intelligence and institutional structure.</p>
                
                {BETA_MODE ? (
                    <button onClick={() => setAppState('intake')} style={styles.btnMain}>
                        Apply for Whitelist <CaretRight weight="bold" />
                    </button>
                ) : (
                    <button onClick={handleGoogleLogin} style={styles.btnMain}>
                        Get Started Now <CaretRight weight="bold" />
                    </button>
                )}
            </div>

            {/* FEATURE GRID: DE 3 PUNTEN */}
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