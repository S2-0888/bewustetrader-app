import React from 'react';
import { 
  GearSix, 
  ListDashes, 
  Bug, 
  CheckCircle, 
  LockSimple, 
  ToggleLeft, 
  ToggleRight, 
  ShieldCheck, 
  Warning, 
  Clock, 
  ArrowsClockwise,
  Pulse // Gebruik Pulse in plaats van Activity
} from "@phosphor-icons/react";

const systemStyles = `
  @keyframes pulse {
    0% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.95); }
    100% { opacity: 1; transform: scale(1); }
  }
  .pulse-animation {
    animation: pulse 2s infinite ease-in-out;
  }
`;

const SystemManager = ({ activeTab, tctLogs, settings, updateGlobalSetting }) => {
  return (
    <>
      {activeTab === 'logs' && (
        <div className="bento-card" style={{ background: 'white', padding: 25, borderRadius: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
  <Pulse size={20} color="#007AFF" weight="bold" className="pulse-animation" />
  <span style={{ fontWeight: 900 }}>AI INSIGHT LOGS</span>
</div>
            <button style={{ border: 'none', background: '#F2F2F7', padding: '8px 15px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Export CSV</button>
          </div>
          <div style={{ maxHeight: 600, overflowY: 'auto' }}>
            {tctLogs.map(log => (
              <div key={log.id} style={{ padding: '15px 0', borderBottom: '1px solid #F5F5F7' }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 5 }}>
                  <span style={{ fontWeight: 800, fontSize: 13 }}>{log.userName || 'Unknown'}</span>
                  <span style={{ color: '#8E8E93', fontSize: 11 }}>{log.createdAt?.toDate().toLocaleString()}</span>
                </div>
                <div style={{ fontSize: 13, color: '#444' }}>"{log.insight}"</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div style={{ display: 'grid', gap: 20 }}>
          <div className="bento-card" style={{ background: 'white', padding: 25, borderRadius: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '10px 15px', background: '#F2F2F7', borderRadius: 12, width: 'fit-content' }}>
            <ShieldCheck size={18} color="#30D158" weight="fill" />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#1C1C1E' }}>System Security: Active</span></div>
            <h3 style={{ margin: '0 0 20px 0' }}>Global Controls</h3>
            <div style={{ display: 'grid', gap: 15 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>Maintenance Mode</div>
                  <div style={{ fontSize: 12, color: '#86868B' }}>Lock platform for all users</div>
                </div>
                <button onClick={() => updateGlobalSetting('maintenanceMode', !settings.maintenanceMode)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                  {settings.maintenanceMode ? <ToggleRight size={40} color="#FF3B30" weight="fill" /> : <ToggleLeft size={40} color="#C7C7CC" weight="fill" />}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>Public Signups</div>
                  <div style={{ fontSize: 12, color: '#86868B' }}>Open door for new traders</div>
                </div>
                <button onClick={() => updateGlobalSetting('signupOpen', !settings.signupOpen)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                  {settings.signupOpen ? <ToggleRight size={40} color="#30D158" weight="fill" /> : <ToggleLeft size={40} color="#C7C7CC" weight="fill" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SystemManager;