import { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './lib/firebase';

// HIER miste waarschijnlijk de regel voor Portfolio:
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import TradeLab from './components/TradeLab';
import Login from './components/Login';
import Portfolio from './components/Portfolio'; // <--- DEZE was je waarschijnlijk vergeten!

function App() {
  const [user, loading] = useAuthState(auth);
  const [view, setView] = useState('cockpit');

  if (loading) return <div style={{display:'flex', height:'100vh', alignItems:'center', justifyContent:'center'}}>Laden...</div>;

  if (!user) return <Login />;

  return (
    <div className="app-container">
      <Sidebar view={view} setView={setView} />
      
      <main className="main">
        {view === 'cockpit' && <Dashboard />}
        {view === 'journal' && <TradeLab />}
        {view === 'finance' && <Portfolio />}
      </main>
    </div>
  );
}

export default App;