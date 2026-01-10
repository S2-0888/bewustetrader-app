import React from 'react';
import { 
  EnvelopeSimple, 
  Robot, 
  MagnifyingGlass, 
  Trash, 
  CheckCircle, 
  PaperPlaneTilt, 
  XCircle, 
  CaretRight, 
  Camera, 
  ArrowsClockwise,
  Bug,
  Lightbulb,
  ChatCircleText,
  LockSimple,   // Deze miste je nu
  User,         // Vaak gebruikt voor afzender info
  Archive       // Vaak gebruikt voor afsluiten
} from '@phosphor-icons/react';

const InboxManager = ({ 
  inboxSearch, setInboxSearch, inboxFilter, setInboxFilter, filteredInbox,
  selectedMessage, setSelectedMessage, closeTicket, deleteFeedbackItem,
  replyText, setReplyText, replyAttachment, setReplyAttachment,
  generateAiDraft, isAiLoading, handleAdminFileChange, sendReply
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: 'calc(100vh - 250px)' }}>
      {/* SEARCH & FILTER BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, background: 'white', padding: '15px 25px', borderRadius: 16, border: '1px solid #E5E5EA' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <MagnifyingGlass size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8E8E93' }} />
          <input type="text" placeholder="Search user email..." value={inboxSearch} onChange={(e) => setInboxSearch(e.target.value)} style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: 12, border: '1px solid #F2F2F7', fontSize: 13 }} />
        </div>
        <div style={{ display: 'flex', background: '#F5F5F7', padding: 4, borderRadius: 10, gap: 4 }}>
          {[{ id: 'all', label: 'All' }, { id: 'unread', label: 'Unread' }, { id: 'read', label: 'Replied' }].map(f => (
            <button key={f.id} onClick={() => setInboxFilter(f.id)} style={{ border: 'none', background: inboxFilter === f.id ? 'white' : 'transparent', padding: '6px 12px', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', boxShadow: inboxFilter === f.id ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>{f.label}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20, flex: 1, overflow: 'hidden' }}>
        {/* SIDEBAR: MESSAGE LIST */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E5EA', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {filteredInbox.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#8E8E93' }}>No messages.</div>
          ) : (
            filteredInbox.map(item => (
              <div key={item.id} onClick={() => setSelectedMessage(item)} style={{ padding: '15px 20px', borderBottom: '1px solid #F5F5F7', cursor: 'pointer', background: selectedMessage?.id === item.id ? 'rgba(0,122,255,0.05)' : 'transparent', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#1D1D1F' }}>{item.userEmail}</span>
                  <span style={{ fontSize: 10, color: '#8E8E93' }}>{item.updatedAt?.toDate().toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' })}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <div style={{ width: 16, height: 16, borderRadius: 4, background: item.type === 'bug' ? '#FF3B3015' : '#007AFF15', color: item.type === 'bug' ? '#FF3B30' : '#007AFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.type === 'bug' ? <Bug size={10} weight="fill"/> : <Lightbulb size={10} weight="fill"/>}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: item.type === 'bug' ? '#FF3B30' : '#007AFF', textTransform: 'uppercase' }}>{item.status || 'OPEN'}</span>
                  {item.status === 'replied' && <CheckCircle size={12} color="#30D158" weight="fill" />}
                  {item.status === 'closed' && <LockSimple size={12} color="#8E8E93" weight="bold" />}
                </div>
                <div style={{ fontSize: 12, color: '#86868B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.message.substring(0, 45)}...</div>
                {selectedMessage?.id === item.id && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: '#007AFF' }} />}
              </div>
            ))
          )}
        </div>

        {/* DETAIL VIEW */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E5EA', overflowY: 'auto' }}>
          {selectedMessage ? (
            <div style={{ padding: 30 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 30, borderBottom: '1px solid #F5F5F7', paddingBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{selectedMessage.userEmail}</h2>
                  <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                    <span style={{ fontSize: 11, color: '#8E8E93' }}>{selectedMessage.createdAt?.toDate().toLocaleString('nl-NL')}</span>
                    <span style={{ fontSize: 10, background: '#F2F2F7', padding: '2px 8px', borderRadius: 4, fontWeight: 800 }}>{selectedMessage.status?.toUpperCase() || 'OPEN'}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {selectedMessage.status !== 'closed' && (
                    <button onClick={() => closeTicket(selectedMessage.id)} style={{ padding: '8px 15px', background: '#F2F2F7', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <LockSimple size={16} /> Close Ticket
                    </button>
                  )}
                  <button onClick={() => deleteFeedbackItem(selectedMessage.id)} style={{ padding: 8, background: '#FF3B3010', border: 'none', color: '#FF3B30', borderRadius: 8 }}><Trash size={20}/></button>
                </div>
              </div>

              <div style={{ marginBottom: 40 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#8E8E93', marginBottom: 10, textTransform: 'uppercase' }}>Message</div>
                <div style={{ fontSize: 15, color: '#1D1D1F', background: '#F9F9FB', padding: 20, borderRadius: 12, lineHeight: 1.6 }}>{selectedMessage.message}</div>
                {selectedMessage.attachment && (
                  <div style={{ marginTop: 20 }}>
                    <a href={selectedMessage.attachment} target="_blank" rel="noreferrer">
                      <img src={selectedMessage.attachment} style={{ maxWidth: '100%', borderRadius: 12, border: '1px solid #E5E5EA' }} alt="Attachment" />
                    </a>
                  </div>
                )}
              </div>

              {/* REPLY SECTION */}
              <div style={{ borderTop: '1px solid #F5F5F7', paddingTop: 30 }}>
                {selectedMessage.status === 'closed' ? (
                  <div style={{ textAlign: 'center', padding: 30, background: '#F2F2F7', borderRadius: 12, color: '#8E8E93' }}>
                    <LockSimple size={32} style={{ marginBottom: 10 }} />
                    <div style={{ fontWeight: 700 }}>Conversation is locked and closed.</div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 15 }}>
                    <textarea 
                      value={replyText[selectedMessage.id] || ''} 
                      onChange={e => setReplyText({...replyText, [selectedMessage.id]: e.target.value})} 
                      placeholder="Type follow-up..." 
                      style={{ width: '100%', padding: '15px', borderRadius: 12, border: '1px solid #E5E5EA', minHeight: 150 }} 
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={() => generateAiDraft(selectedMessage.id, selectedMessage.message)} disabled={isAiLoading === selectedMessage.id} style={{ background: '#1C1C1E', color: 'white', padding: '10px 20px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                          {isAiLoading === selectedMessage.id ? <ArrowsClockwise size={18} className="spinner" /> : <Robot size={18} weight="fill" />} AI Draft
                        </button>
                      </div>
                      <button onClick={() => sendReply(selectedMessage.id, selectedMessage.message, selectedMessage.userEmail)} disabled={!replyText[selectedMessage.id]} style={{ background: '#007AFF', color: 'white', padding: '10px 30px', borderRadius: 10, fontWeight: 800, cursor: 'pointer' }}>
                        Send Reply <PaperPlaneTilt weight="fill" size={16}/>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#C7C7CC' }}>
              <EnvelopeSimple size={64} weight="thin" />
              <p>Select a message to view conversation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InboxManager;