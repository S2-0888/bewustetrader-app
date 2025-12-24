import React, { useState } from 'react';
import { X, Plus, Trash } from '@phosphor-icons/react';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export default function TradeSettingsModal({ onClose, config, onUpdate }) {
  // Local state for editing (preventing DB writes on every keystroke)
  const [localConfig, setLocalConfig] = useState(config);
  const [newItems, setNewItems] = useState({ strategies: '', rules: '', mistakes: '', quality: '' });

  // Function to add item
  const addItem = (category, value) => {
    if (!value.trim()) return;
    const updatedList = [...(localConfig[category] || []), value.trim()];
    setLocalConfig({ ...localConfig, [category]: updatedList });
    setNewItems({ ...newItems, [category]: '' }); // Reset input
  };

  // Function to remove item
  const removeItem = (category, itemToRemove) => {
    const updatedList = localConfig[category].filter(item => item !== itemToRemove);
    setLocalConfig({ ...localConfig, [category]: updatedList });
  };

  // Save to Firebase
  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      // Saved in a separate document 'settings/tradelab'
      await setDoc(doc(db, "users", user.uid, "settings", "tradelab"), localConfig);
      onUpdate(localConfig); // Update parent state directly
      onClose();
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Could not save settings.");
    }
  };

  // Helper component for a list section
  const ListSection = ({ title, category, placeholder }) => (
    <div style={{ marginBottom: 20 }}>
      <label className="input-label" style={{ fontWeight: 700, marginBottom: 8, display: 'block' }}>{title}</label>
      
      {/* The List */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        {(localConfig[category] || []).map((item, idx) => (
          <div key={idx} style={{ background: '#F2F2F7', padding: '4px 10px', borderRadius: 6, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            {item}
            <button onClick={() => removeItem(category, item)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#FF3B30', padding: 0, display: 'flex' }}>
              <X size={12} weight="bold" />
            </button>
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 10 }}>
        <input 
          className="apple-input" 
          placeholder={placeholder} 
          value={newItems[category]} 
          onChange={(e) => setNewItems({ ...newItems, [category]: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && addItem(category, newItems[category])}
        />
        <button 
          onClick={() => addItem(category, newItems[category])} 
          style={{ background: '#E5E5EA', border: 'none', borderRadius: 8, width: 40, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Plus size={20} weight="bold" color="#007AFF" />
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
      <div className="bento-card" style={{ width: '100%', maxWidth: 500, padding: 30, maxHeight: '90vh', overflowY: 'auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>TradeLab Settings</div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 5 }}>
            <ListSection title="📋 Your Rules (Discipline)" category="rules" placeholder="e.g. Wait for candle close" />
            <ListSection title="📈 Strategies" category="strategies" placeholder="e.g. Silver Bullet" />
            <ListSection title="⚠️ Mistakes / Tags" category="mistakes" placeholder="e.g. FOMO" />
            <ListSection title="⭐ Quality Labels" category="quality" placeholder="e.g. A+ Setup" />
        </div>

        <div style={{ paddingTop: 20, marginTop: 20, borderTop: '1px solid #F5F5F7', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} className="btn-primary" style={{ background: '#F2F2F7', color: '#1D1D1F' }}>Cancel</button>
          <button onClick={handleSave} className="btn-primary" style={{ background: '#007AFF' }}>Save Settings</button>
        </div>

      </div>
    </div>
  );
}