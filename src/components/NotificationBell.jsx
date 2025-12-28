import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Bell } from '@phosphor-icons/react';

export default function NotificationBell({ onClick }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Luister naar feedback items die de status 'replied' hebben en nog NIET gelezen zijn
    const q = query(
      collection(db, "beta_feedback"), 
      where("userId", "==", user.uid), 
      where("status", "==", "replied"),
      where("isRead", "==", false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.docs.length);
    });

    return () => unsubscribe();
  }, []);

  return (
    <button 
      onClick={onClick}
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
      <Bell size={20} weight={unreadCount > 0 ? "fill" : "bold"} color={unreadCount > 0 ? "#1D1D1F" : "#86868B"} />
      
      {unreadCount > 0 && (
        <div style={{ 
          position: 'absolute', 
          top: 0, 
          right: 0, 
          background: '#FF3B30', 
          color: 'white', 
          fontSize: '10px', 
          fontWeight: 800, 
          width: 16, 
          height: 16, 
          borderRadius: '50%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          border: '2px solid white'
        }}>
          {unreadCount}
        </div>
      )}
    </button>
  );
}