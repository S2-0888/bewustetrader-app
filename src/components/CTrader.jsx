import React from 'react';
import { LinkSimple, PlugsConnected, Info, CheckCircle } from '@phosphor-icons/react';

const CTrader = ({ userProfile }) => {
    
const handleConnect = () => {
    const clientId = "20232";
    const redirectUri = "https://propfolio.app/auth/ctrader/callback";
    
    // DIT IS DE ENIGSTE JUISTE URL:
    const authUrl = `https://openapi.ctrader.com/apps/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=accounts,trading`;
    
    console.log("Redirecting to:", authUrl);
    window.location.href = authUrl;
};

    // We controleren of er een ctrader_id aanwezig is in het profiel
    const isConnected = userProfile?.ctrader_id || userProfile?.ctrader_connected;

    return (
        <div style={{ animation: 'fadeIn 0.3s ease', display: 'grid', gap: 20 }}>
            <div className="bento-card" style={{ padding: 40, background: 'white', textAlign: 'center', border: '1px solid #E5E5EA', borderRadius: 24, boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
                
                {/* Het Logo bovenaan */}
                <div style={{ marginBottom: 25 }}>
                    <img 
                        src="/CTRADERLOGO.png" 
                        alt="cTrader" 
                        style={{ height: 40, width: 'auto', marginBottom: 15 }} 
                    />
                </div>

                <h3 style={{ margin: '0 0 10px 0', fontSize: 22, fontWeight: 900 }}>cTrader Cloud Sync</h3>
                <p style={{ color: '#86868B', fontSize: 14, maxWidth: 420, margin: '0 auto 30px', lineHeight: 1.6 }}>
                    Connect your cTrader ID (CTID) to synchronize all your Propfirm accounts directly via the Cloud. No bridge or VPS required.
                </p>

                {isConnected ? (
                    <div style={{ 
                        background: '#30D15808', 
                        padding: '24px', 
                        borderRadius: 20, 
                        border: '1px solid #30D15830', 
                        display: 'inline-block', 
                        minWidth: 320 
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#30D158', fontWeight: 800, fontSize: 15 }}>
                            <CheckCircle size={24} weight="fill" /> CONNECTED TO CTID
                        </div>
                        <p style={{ fontSize: 12, color: '#30D158', marginTop: 8, fontWeight: 600, opacity: 0.8 }}>
                            All accounts linked to {userProfile?.email} are syncing.
                        </p>
                        <div style={{ marginTop: 15, paddingTop: 15, borderTop: '1px solid #30D15820', display: 'flex', justifyContent: 'center', gap: 20 }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 10, color: '#86868B', fontWeight: 700 }}>STATUS</div>
                                <div style={{ fontSize: 11, fontWeight: 800, color: '#30D158' }}>ACTIVE</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 10, color: '#86868B', fontWeight: 700 }}>MODE</div>
                                <div style={{ fontSize: 11, fontWeight: 800, color: '#1C1C1E' }}>CLOUD-SYNC</div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <button 
                        onClick={handleConnect}
                        className="btn-primary" 
                        style={{ 
                            width: '100%', 
                            maxWidth: 320, 
                            height: 56, 
                            fontSize: 16, 
                            background: '#1D1D1F', 
                            borderRadius: 16, 
                            fontWeight: 800, 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 10,
                            margin: '0 auto',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                        }}
                    >
                        <LinkSimple size={22} weight="bold" /> Link cTrader ID
                    </button>
                )}
            </div>

            {/* Info Box */}
            <div style={{ background: '#F5F5F7', padding: '25px', borderRadius: 24, border: '1px solid #E5E5EA' }}>
                <div style={{ display: 'flex', gap: 15, alignItems: 'flex-start' }}>
                    <div style={{ background: '#007AFF', padding: 8, borderRadius: 10 }}>
                        <Info size={20} color="white" weight="bold" />
                    </div>
                    <div style={{ fontSize: 13, color: '#48484A', lineHeight: 1.6 }}>
                        <strong style={{ display: 'block', color: '#1D1D1F', marginBottom: 4, fontSize: 14 }}>Secure Cloud Connection</strong>
                        Linking your CTID allows the Trade Control Tower to read your trade history and executions. We never receive your password and cannot place orders without your explicit permission in the Lab.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CTrader;