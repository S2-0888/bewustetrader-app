import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth, db, functions } from '../lib/firebase'; // Zorg dat 'functions' hier ook bij staat
import { CircleNotch, CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { httpsCallable } from 'firebase/functions';

const CTraderCallback = () => {
    const [status, setStatus] = useState('processing');
    const [errorMsg, setErrorMsg] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
    // Luister naar de auth status om te voorkomen dat 'user' null is bij refresh
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
        if (!user) {
            // Geef Firebase even de tijd (soms komt de user net iets later binnen)
            return; 
        }

        const params = new URLSearchParams(location.search);
        const code = params.get('code');

        if (!code) {
            setStatus('error');
            setErrorMsg('Geen autorisatiecode ontvangen.');
            return;
        }

        try {
            // 1. Roep de beveiligde Cloud Function aan
            const exchangeFunction = httpsCallable(functions, 'exchangeCtraderCode');
            
            await exchangeFunction({ 
                code: code, 
                redirectUri: "https://propfolio.app/auth/ctrader/callback"
            });

            setStatus('success');
            
            setTimeout(() => {
                navigate('/portfolio'); 
            }, 2000);

        } catch (error) {
            console.error("cTrader Exchange Error Details:", error);
            setStatus('error');
            setErrorMsg(error.message || 'Kon geen verbinding maken met cTrader.');
        }
    });

    // Cleanup subscription op unmount
    return () => unsubscribe();
}, [location, navigate]);

    return (
        <div style={{ 
            height: '100vh', display: 'flex', flexDirection: 'column', 
            alignItems: 'center', justifyContent: 'center', background: '#F5F5F7', fontFamily: 'sans-serif' 
        }}>
            <div className="bento-card" style={{ 
                padding: 50, textAlign: 'center', background: 'white', 
                borderRadius: 32, boxShadow: '0 20px 60px rgba(0,0,0,0.05)',
                maxWidth: 400, width: '90%'
            }}>
                {status === 'processing' && (
                    <div style={{ animation: 'fadeIn 0.3s ease' }}>
                        <CircleNotch size={54} color="#007AFF" weight="bold" className="ani-spin" />
                        <h2 style={{ marginTop: 25, fontWeight: 800, letterSpacing: '-0.5px' }}>Verbinding maken...</h2>
                        <p style={{ color: '#86868B', fontSize: 14, lineHeight: 1.5 }}>
                            We koppelen je cTrader ID veilig aan je Propfolio account.
                        </p>
                    </div>
                )}

                {status === 'success' && (
                    <div style={{ animation: 'fadeIn 0.3s ease' }}>
                        <div style={{ 
                            width: 60, height: 60, background: '#30D15815', 
                            borderRadius: '50%', display: 'flex', alignItems: 'center', 
                            justifyContent: 'center', margin: '0 auto 20px' 
                        }}>
                            <CheckCircle size={36} color="#30D158" weight="fill" />
                        </div>
                        <h2 style={{ fontWeight: 800, letterSpacing: '-0.5px' }}>Gekoppeld!</h2>
                        <p style={{ color: '#86868B', fontSize: 14 }}>
                            Je cTrader Cloud Sync is nu actief.
                        </p>
                    </div>
                )}

                {status === 'error' && (
                    <div style={{ animation: 'fadeIn 0.3s ease' }}>
                        <WarningCircle size={54} color="#FF3B30" weight="fill" />
                        <h2 style={{ marginTop: 20, fontWeight: 800 }}>Fout bij koppelen</h2>
                        <p style={{ color: '#86868B', fontSize: 14 }}>{errorMsg}</p>
                        <button 
                            onClick={() => navigate('/dashboard')} 
                            className="btn-primary" 
                            style={{ marginTop: 30, width: '100%', background: '#1D1D1F' }}
                        >
                            Terug naar Dashboard
                        </button>
                    </div>
                )}
            </div>

            <style>{`
                .ani-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default CTraderCallback;