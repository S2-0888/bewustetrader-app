import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Bell } from '@phosphor-icons/react';

// We voegen 'pendingCount' en 'hasPendingAudit' toe aan de props
export default function NotificationBell({ onClick, pendingCount = 0, onAuditClick }) {
  const [unreadSupportCount, setUnreadSupportCount] = useState(0);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, "beta_feedback"), 
      where("userId", "==", user.uid), 
      where("status", "==", "replied"),
      where("isRead", "==", false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadSupportCount(snapshot.docs.length);
    });

    return () => unsubscribe();
  }, []);

  // Totaal aantal acties = ongelezen support + openstaande AI regels/audits
  const totalNotifications = unreadSupportCount + pendingCount;

  // Verbeterde klik-afhandeling
  const handleBellClick = (e) => {
    // Als er een audit openstaat (pendingCount > 0) en we hebben de audit-functie gekregen
    if (pendingCount > 0 && onAuditClick) {
      onAuditClick();
    } else {
      // Anders voer de standaard actie uit (setView settings)
      onClick(e);
    }
  };

  return (
    <button 
      onClick={handleBellClick}
      style={{ 
        position: 'relative',
        background: 'white', 
        border: 'none', 
        borderRadius: '50%', 
        width: 40, 
        height: 40, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        transition: 'transform 0.2s'
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      <Bell 
        size={20} 
        weight={totalNotifications > 0 ? "fill" : "bold"} 
        color={totalNotifications > 0 ? "#FF3B30" : "#86868B"} 
      />
      
      {totalNotifications > 0 && (
        <div style={{ 
          position: 'absolute', 
          top: 0, 
          right: 0, 
          background: '#FF3B30', 
          color: 'white', 
          fontSize: '10px', 
          fontWeight: 800, 
          width: 18, 
          height: 18, 
          borderRadius: '50%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          border: '2px solid white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          {totalNotifications}
        </div>
      )}
    </button>
  );
}