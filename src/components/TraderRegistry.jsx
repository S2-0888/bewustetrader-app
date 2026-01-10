import React from 'react';
import { 
  MagnifyingGlass, ArrowsClockwise, Trash, ShieldCheck, UserCircle, Key, CheckCircle, XCircle, Clock
} from "@phosphor-icons/react";

const TraderRegistry = ({ users, searchTerm, setSearchTerm, formatExpiry, formatLastActive, activateTraderDirectly, extendAccess, revokeAccess, toggleFounder, deleteUser }) => {
  return (
    <div className="bento-card" style={{ padding: 0, overflow: 'hidden', background: 'white' }}>
      <div style={{ padding: '20px 25px', borderBottom: '1px solid #F5F5F7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 900, fontSize: 14 }}>TRADER REGISTRY</span>
        <input 
          type="text" 
          placeholder="Search traders..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          style={{ width: 350, padding: '12px 15px', borderRadius: 14, border: '1px solid #E5E5EA', fontSize: 14 }} 
        />
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ background: '#F9F9FB' }}>
          <tr style={{ textAlign: 'left', fontSize: 11, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 1 }}>
            <th style={{ padding: '15px 25px' }}>Trader</th>
            <th>Status</th>
            <th>Subscription End</th>
            <th>Last Active</th>
            <th style={{ textAlign: 'right', padding: '15px 25px' }}>Management</th>
          </tr>
        </thead>
        <tbody>
          {users.filter(u => u.email?.toLowerCase().includes(searchTerm.toLowerCase())).map(u => (
            <tr key={u.id} style={{ borderBottom: '1px solid #F5F5F7' }}>
              <td style={{ padding: '15px 25px' }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{u.displayName || 'Anonymous'}</div>
                <div style={{ fontSize: 11, color: '#8E8E93' }}>{u.email}</div>
              </td>
              <td>
                {u.isApproved ? (
                  <span style={{ color: '#30D158', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle weight="fill" size={14} /> APPROVED
                  </span>
                ) : (
                  <span style={{ color: '#FF9F0A', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock weight="fill" size={14} /> PENDING
                  </span>
                )}
              </td>
              <td style={{ fontSize: 12 }}>{formatExpiry(u.currentPeriodEnd)}</td>
              <td style={{ fontSize: 12, fontWeight: 600 }}>{formatLastActive(u.lastLogin).text}</td>
              <td style={{ textAlign: 'right', padding: '15px 25px' }}>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  {!u.isApproved && (
                    <button onClick={() => activateTraderDirectly(u.id)} style={{ background: '#007AFF15', border: 'none', color: '#007AFF', padding: '6px 12px', borderRadius: 8, fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>APPROVE</button>
                  )}
                  <button onClick={() => extendAccess(u.id)} style={{ background: '#30D15815', border: 'none', color: '#30D158', padding: '6px 10px', borderRadius: 8, fontSize: 10, fontWeight: 800 }}>+30D</button>
                  <button onClick={() => revokeAccess(u.id)} style={{ background: '#FF3B3015', border: 'none', color: '#FF3B30', padding: '6px', borderRadius: 8 }}><XCircle size={18} /></button>
                  <button onClick={() => toggleFounder(u)} style={{ border: 'none', background: u.isFounder ? '#AF52DE15' : '#F2F2F7', color: u.isFounder ? '#AF52DE' : '#8E8E93', padding: '6px 12px', borderRadius: 8, fontSize: 10, fontWeight: 800 }}>FOUNDER</button>
                  <button onClick={() => deleteUser(u.id)} style={{ border: 'none', background: 'none', color: '#FF3B30', opacity: 0.3 }}><Trash size={18}/></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TraderRegistry;