import React from 'react';
import { auth, db } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { GoogleLogo, Crown } from '@phosphor-icons/react';

export default function Login() {
  
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    // Forceer accountkeuze om te voorkomen dat de popup direct sluit
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      console.log("Starting Google login...");
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log("Auth success for:", user.email);

      // Check of de gebruiker al bestaat in Firestore
      const userDocRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) {
        console.log("New user detected. Creating profile with pending approval...");
        await setDoc(userDocRef, {
          email: user.email,
          displayName: user.displayName,
          role: 'user',
          isApproved: false, // Nieuwe users moeten eerst goedgekeurd worden
          isFounder: false,  // Founder status moet verdiend worden
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp()
        });
      } else {
        // Voor bestaande users: Alleen de lastLogin tijd bijwerken
        console.log("Existing user. Updating last login...");
        await setDoc(userDocRef, { 
          lastLogin: serverTimestamp(),
          displayName: user.displayName 
        }, { merge: true });
      }
      
      console.log("Login sequence finished.");
    } catch (error) {
      console.error("Detailed login error:", error.code, error.message);
      if (error.code === 'auth/popup-closed-by-user') {
        alert("Login window closed. Please try again.");
      } else {
        alert("Login error: " + error.message);
      }
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: '#F5F5F7',
      padding: '20px'
    }}>
      <div style={{ 
        width: '100%', 
        maxWidth: '400px', 
        background: 'white', 
        padding: '40px', 
        borderRadius: '30px', 
        boxShadow: '0 20px 40px rgba(0,0,0,0.05)',
        textAlign: 'center'
      }}>
        
        {/* DBT BRANDMARK */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '30px' }}>
            <div style={{ position: 'relative', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                <div style={{ position: 'absolute', width: '30px', height: '30px', borderTop: '3.5px solid #1D1D1F', borderLeft: '3.5px solid #1D1D1F', transform: 'rotate(45deg)', top: '2px' }}></div>
                <div style={{ position: 'absolute', width: '10px', height: '10px', borderRadius: '50%', border: '3.5px solid #1D1D1F', bottom: '4px' }}></div>
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '2px', margin: 0 }}>DBT</h1>
            <p style={{ fontSize: '10px', fontWeight: 800, color: '#86868B', marginTop: '4px', letterSpacing: '1px' }}>THE CONSCIOUS TRADER</p>
        </div>

        <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.5px' }}>
          Welcome to the Network
        </h2>
        <p style={{ color: '#86868B', fontSize: '14px', marginBottom: '30px' }}>
          Master your process, the money follows.
        </p>

        <button 
          onClick={signInWithGoogle}
          style={{ 
            width: '100%', 
            padding: '14px', 
            borderRadius: '12px', 
            border: '1px solid #E5E5EA', 
            background: 'white', 
            color: '#1D1D1F', 
            fontSize: '16px', 
            fontWeight: 700, 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '12px',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#F9F9F9'}
          onMouseOut={(e) => e.currentTarget.style.background = 'white'}
        >
          <GoogleLogo size={22} weight="bold" style={{ color: '#DB4437' }} />
          Sign in with Google
        </button>

        <div style={{ 
          marginTop: '35px', padding: '15px', borderRadius: '15px', 
          background: 'rgba(175, 82, 222, 0.05)', border: '1px solid rgba(175, 82, 222, 0.1)',
          display: 'flex', alignItems: 'center', gap: '12px'
        }}>
          <Crown size={20} weight="fill" color="#AF52DE" />
          <span style={{ fontSize: '11px', color: '#AF52DE', fontWeight: 700, textAlign: 'left', lineHeight: 1.4 }}>
            Founder 100 access is limited. Status will be verified by an admin after sign-in.
          </span>
        </div>

        <p style={{ fontSize: '10px', color: '#C7C7CC', marginTop: '30px', fontWeight: 600 }}>
          SECURE ENCRYPTED ACCESS • DBT TRADING TECH
        </p>
      </div>
    </div>
  );
}