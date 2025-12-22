import { auth } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { GoogleLogo } from '@phosphor-icons/react';

export default function Login() {
  
  const signInWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch((error) => {
      console.error("Fout bij inloggen:", error);
    });
  };

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      background: '#f1f5f9' 
    }}>
      <div className="card" style={{ textAlign: 'center', maxWidth: '400px' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Bewuste Trader Cloud</h1>
        <p style={{ color: 'var(--muted)', marginBottom: '30px' }}>
          Je persoonlijke trading journal, veilig in de cloud.
        </p>
        
        <button 
          className="btn" 
          onClick={signInWithGoogle}
          style={{ background: 'white', border: '1px solid #e2e8f0', color: '#334155', display: 'flex', justifyContent: 'center', gap: '10px' }}
        >
          <GoogleLogo size={20} weight="bold" style={{ color: '#DB4437' }} />
          Inloggen met Google
        </button>
      </div>
    </div>
  );
}