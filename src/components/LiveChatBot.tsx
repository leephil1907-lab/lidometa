import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { MessageSquare, X, Send, Bot, Shield, Sparkles, User, Minimize2, Move, GripHorizontal } from 'lucide-react';
import { useAccount } from 'wagmi';
import { ChatMessage } from '../types';

export default function LiveChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAdminConnected, setIsAdminConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { address } = useAccount();

  // Unique session ID stored in localStorage
  const [sessionId] = useState(() => {
    let saved = localStorage.getItem('lido_chat_session_id');
    if (!saved) {
      saved = 'sess_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('lido_chat_session_id', saved);
    }
    return saved;
  });

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/chat/messages?sessionId=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.session) {
          const newMsgs: ChatMessage[] = data.session.messages || [];
          setMessages((prev) => {
            if (newMsgs.length > prev.length && !isOpen) {
              setUnreadCount((count) => count + (newMsgs.length - prev.length));
            }
            return newMsgs;
          });
          setIsAdminConnected(Boolean(data.session.isAdminOverridden));
        }
      }
    } catch (e) {
      // Quietly handle transient polling network errors
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [sessionId, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      scrollToBottom();
    }
  }, [isOpen, messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isSending) return;

    if (!textToSend) setInput('');
    setIsSending(true);

    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userAddress: address || undefined,
          text,
          sender: 'user',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.session) {
          setMessages(data.session.messages || []);
          setIsAdminConnected(Boolean(data.session.isAdminOverridden));
        }
      }
    } catch (e) {
      console.error('Failed to send message:', e);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      className="fixed bottom-5 right-5 z-50 font-sans touch-none select-none"
    >
      {/* Floating Launcher Button */}
      {!isOpen && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="relative group bg-[var(--card)] hover:bg-[var(--card)]/90 border border-[var(--primary)]/40 p-3.5 rounded-full shadow-[0_8px_30px_rgba(0,163,255,0.35)] text-white flex items-center space-x-3 transition-all duration-300 cursor-grab active:cursor-grabbing"
          title="Drag to reposition or click to open Lido Live Chat"
        >
          <div className="relative w-9 h-9 rounded-full bg-[var(--primary)]/10 p-1 flex items-center justify-center border border-[var(--primary)]/30">
            <img
              src="https://cryptologos.cc/logos/lido-dao-ldo-logo.svg"
              alt="Lido Avatar"
              className="w-full h-full object-contain pointer-events-none"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[var(--card)]" />
          </div>

          <div className="hidden sm:flex flex-col text-left pr-1 pointer-events-none">
            <span className="text-[13px] font-bold text-[var(--foreground)] flex items-center gap-1.5">
              Lido Assistant
              <Sparkles size={12} className="text-[var(--primary)]" />
            </span>
            <span className="text-[11px] text-[var(--muted)] flex items-center gap-1">
              <span>Ask anything / Live Admin</span>
              <GripHorizontal size={12} className="text-[var(--muted)] opacity-60" />
            </span>
          </div>

          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-bold text-[11px] w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-pulse">
              {unreadCount}
            </span>
          )}
        </motion.button>
      )}

      {/* Expanded Chat Dialog */}
      {isOpen && (
        <div className="w-[360px] sm:w-[400px] h-[520px] bg-[var(--card)] border border-[var(--border)] rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex flex-col overflow-hidden backdrop-blur-xl transition-all duration-300">
          {/* Draggable Header */}
          <div className="p-3.5 bg-[var(--nav-bg)] border-b border-[var(--border)] flex items-center justify-between cursor-grab active:cursor-grabbing select-none">
            <div className="flex items-center space-x-2.5">
              <span title="Drag to move chat window">
                <GripHorizontal size={16} className="text-[var(--muted)] hover:text-[var(--primary)] transition-colors" />
              </span>
              
              <div className="relative w-8 h-8 rounded-full bg-[var(--primary)]/15 p-1 flex items-center justify-center border border-[var(--primary)]/30">
                <img
                  src="https://cryptologos.cc/logos/lido-dao-ldo-logo.svg"
                  alt="Lido Logo Avatar"
                  className="w-full h-full object-contain pointer-events-none"
                />
                <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border-2 border-[var(--card)]" />
              </div>

              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-[13px] text-[var(--foreground)]">Lido Live Support</span>
                  {isAdminConnected ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                      <Shield size={9} /> Admin Active
                    </span>
                  ) : (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[var(--primary)]/15 text-[var(--primary)] flex items-center gap-1">
                      <Bot size={9} /> Bot Online
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[var(--muted)] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                  {isAdminConnected ? 'Live Admin monitoring' : 'Instant AI bot & Admin bridge'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--input-bg)] rounded-lg transition-colors cursor-pointer"
                title="Minimize chat"
              >
                <Minimize2 size={16} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-thin select-text cursor-default">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              const isAdmin = msg.sender === 'admin';

              return (
                <div
                  key={msg.id}
                  className={`flex items-start space-x-2.5 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div className="shrink-0">
                    {isUser ? (
                      <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-white text-[12px]">
                        <User size={14} />
                      </div>
                    ) : isAdmin ? (
                      <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/50 p-1 flex items-center justify-center">
                        <Shield size={14} className="text-amber-400" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-[var(--primary)]/20 border border-[var(--primary)]/40 p-1 flex items-center justify-center">
                        <img
                          src="https://cryptologos.cc/logos/lido-dao-ldo-logo.svg"
                          alt="Lido Avatar"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[75%] p-3 rounded-[16px] text-[13px] leading-relaxed shadow-sm ${
                      isUser
                        ? 'bg-[var(--primary)] text-white rounded-tr-none'
                        : isAdmin
                        ? 'bg-amber-950/40 border border-amber-500/30 text-amber-100 rounded-tl-none'
                        : 'bg-[var(--nav-bg)] border border-[var(--border)] text-[var(--foreground)] rounded-tl-none'
                    }`}
                  >
                    {!isUser && (
                      <div className="text-[10px] font-bold mb-1 opacity-70 flex items-center justify-between">
                        <span>{isAdmin ? '🛡️ Lido Admin' : '🤖 Lido Assistant'}</span>
                      </div>
                    )}
                    <p>{msg.text}</p>
                    <span className="text-[9px] opacity-50 block text-right mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Option Prompts */}
          <div className="px-3 py-2 bg-[var(--nav-bg)]/50 border-t border-[var(--border)] flex items-center space-x-1.5 overflow-x-auto scrollbar-none select-none">
            {[
              'stETH APR?',
              'How to stake?',
              'Wrap to wstETH',
              'Request Admin Support',
            ].map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                className="shrink-0 text-[11px] font-medium bg-[var(--card)] hover:bg-[var(--primary)]/15 hover:text-[var(--primary)] border border-[var(--border)] text-[var(--muted)] px-2.5 py-1 rounded-full transition-colors cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-3 bg-[var(--nav-bg)] border-t border-[var(--border)] flex items-center space-x-2 select-none">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isAdminConnected ? 'Message Lido Admin...' : 'Ask Lido Bot or request support...'}
              className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-full px-4 py-2 text-[13px] text-[var(--foreground)] placeholder-[var(--input-placeholder)] outline-none focus:border-[var(--primary)] transition-colors select-text"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isSending}
              className="w-9 h-9 rounded-full bg-[var(--primary)] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
              title="Send message"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
