import React from "react";
import { 
  Robot, 
  Check, 
  Tag, 
  Clock, 
  PlusCircle, 
  Trash, 
  ArrowsClockwise, 
  ListDashes 
} from "@phosphor-icons/react";

const ContentManager = ({
  faqs,
  setShowFaqModal,
  pricing,
  setPricing,
  handleUpdatePricing,
  newFaq,
  setNewFaq,
  handleAddFaq,
  scheduledChange,
  setScheduledChange,
  handleSchedulePrice,
  priceLogs
}) => {
  return (
    <div style={{ display: 'grid', gap: 30 }}>
      
      {/* 1. PRICING MANAGEMENT */}
      <div className="bento-card" style={{ background: 'white', padding: 30, borderRadius: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }}>
          <h3 style={{ margin: 0, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Tag size={24} color="#007AFF" weight="fill" /> Landingpage Pricing
          </h3>
          <button 
            onClick={handleUpdatePricing}
            style={{ background: '#007AFF', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 12, fontWeight: 800, cursor: 'pointer' }}
          >
            Update Live Prices
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 800, color: '#8E8E93' }}>PLAN NAME</label>
            <input 
              className="admin-input"
              value={pricing?.name || ''} 
              onChange={(e) => setPricing({...pricing, name: e.target.value})}
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 800, color: '#8E8E93' }}>CURRENT PRICE (€)</label>
            <input 
              className="admin-input"
              value={pricing?.price || ''} 
              onChange={(e) => setPricing({...pricing, price: e.target.value})}
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 800, color: '#8E8E93' }}>OLD PRICE (STRY THROUGH)</label>
            <input 
              className="admin-input"
              value={pricing?.oldPrice || ''} 
              onChange={(e) => setPricing({...pricing, oldPrice: e.target.value})}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 800, color: '#8E8E93' }}>FEATURES (COMMA SEPARATED)</label>
          <textarea 
            className="admin-input"
            value={pricing?.features || ''} 
            onChange={(e) => setPricing({...pricing, features: e.target.value})}
            style={{ ...inputStyle, minHeight: 80, fontFamily: 'inherit' }}
          />
        </div>
      </div>

      {/* 2. FAQ MANAGEMENT */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30 }}>
        
        {/* ADD NEW FAQ */}
        <div className="bento-card" style={{ background: 'white', padding: 30, borderRadius: 24 }}>
          <h3 style={{ margin: '0 0 20px 0', fontWeight: 900 }}>Add New FAQ</h3>
          <div style={{ display: 'grid', gap: 15 }}>
            <input 
              placeholder="Question..." 
              value={newFaq?.question || ''}
              onChange={(e) => setNewFaq({...newFaq, question: e.target.value})}
              style={inputStyle}
            />
            <textarea 
              placeholder="Detailed answer..." 
              value={newFaq?.answer || ''}
              onChange={(e) => setNewFaq({...newFaq, answer: e.target.value})}
              style={{ ...inputStyle, minHeight: 120 }}
            />
            <button 
              onClick={handleAddFaq}
              style={{ background: '#F2F2F7', color: '#1D1D1F', border: 'none', padding: '15px', borderRadius: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
            >
              <PlusCircle size={20} weight="bold" /> Add to Library
            </button>
          </div>
        </div>

        {/* FAQ OVERVIEW & ORDERING */}
        <div className="bento-card" style={{ background: 'white', padding: 30, borderRadius: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontWeight: 900 }}>Live Library</h3>
            <button 
              onClick={() => setShowFaqModal(true)}
              style={{ background: 'none', border: 'none', color: '#007AFF', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <ListDashes size={20} /> Reorder FAQ's
            </button>
          </div>
          <div style={{ maxHeight: 300, overflowY: 'auto', display: 'grid', gap: 10 }}>
            {faqs.map(faq => (
              <div key={faq.id} style={{ padding: '12px 15px', background: '#F9F9FB', borderRadius: 12, border: '1px solid #F2F2F7', fontSize: 13, fontWeight: 600 }}>
                {faq.question}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 3. PRICE SCHEDULER (TIMER) */}
      <div className="bento-card" style={{ background: 'linear-gradient(135deg, #FF9F0A 0%, #FF3B30 100%)', padding: 30, borderRadius: 24, color: 'white' }}>
        <h3 style={{ margin: '0 0 10px 0', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Clock size={24} weight="fill" /> Price Launch Timer
        </h3>
        <p style={{ margin: '0 0 25px 0', fontSize: 14, opacity: 0.9 }}>
          Plan een automatische prijsverhoging of kortingsactie.
        </p>
        
        <div style={{ display: 'flex', gap: 15 }}>
          <input 
            type="date" 
            style={timerInputStyle} 
            value={scheduledChange?.targetDate || ''}
            onChange={(e) => setScheduledChange({...scheduledChange, targetDate: e.target.value})}
          />
          <input 
            type="time" 
            style={timerInputStyle} 
            value={scheduledChange?.targetTime || ''}
            onChange={(e) => setScheduledChange({...scheduledChange, targetTime: e.target.value})}
          />
          <button 
            onClick={handleSchedulePrice}
            style={{ flex: 1, background: 'white', color: '#FF3B30', border: 'none', padding: '12px', borderRadius: 12, fontWeight: 900, cursor: 'pointer' }}
          >
            ACTIVATE TIMER
          </button>
        </div>
      </div>
    </div>
  );
};

// Styles
const inputStyle = {
  width: '100%',
  padding: '12px 15px',
  borderRadius: 12,
  border: '1px solid #E5E5EA',
  background: '#F5F5F7',
  fontSize: '14px',
  fontWeight: '500',
  outline: 'none',
  boxSizing: 'border-box'
};

const timerInputStyle = {
  flex: 1,
  padding: '12px',
  borderRadius: 12,
  border: 'none',
  background: 'rgba(255,255,255,0.2)',
  color: 'white',
  fontWeight: '700',
  outline: 'none'
};

export default ContentManager;