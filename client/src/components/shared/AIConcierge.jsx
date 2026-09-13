import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import api from '../../config/api.js';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function AIConcierge() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `Hello ${user?.name?.split(' ')[0] || 'there'} 👋 I'm your Floww AI Financial Concierge. Ask me anything about your fees, receipts, or payment history!`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/ai/chat', { message: text });
      setMessages((prev) => [...prev, { role: 'assistant', text: data.data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Sorry, I\'m having trouble connecting right now. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const suggestions = [
    'Why is my late fee ₹500?',
    'Show my 4th semester receipts',
    'What is my outstanding amount?',
  ];

  return (
    <>
      {/* Floating Button */}
      <motion.button
        id="ai-concierge-btn"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-brand shadow-glow-brand flex items-center justify-center text-white"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X size={22} />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <Sparkles size={22} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="ai-chat-window"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-24 right-6 z-50 w-[360px] h-[520px] card flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-[var(--border-color)] bg-gradient-brand rounded-t-2xl">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot size={16} className="text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Floww AI</p>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <p className="text-white/70 text-xs">Powered by Gemini</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                    msg.role === 'user'
                      ? 'bg-brand-100 dark:bg-brand-900 text-brand-600'
                      : 'bg-gradient-brand text-white'
                  }`}>
                    {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                  </div>
                  <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-brand-500 text-white rounded-tr-sm'
                      : 'bg-slate-100 dark:bg-surface-700 text-[var(--text-primary)] rounded-tl-sm'
                  }`}>
                    {msg.text}
                  </div>
                </motion.div>
              ))}
              {loading && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-brand flex items-center justify-center">
                    <Bot size={12} className="text-white" />
                  </div>
                  <div className="bg-slate-100 dark:bg-surface-700 px-4 py-3 rounded-2xl rounded-tl-sm">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-slate-400"
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick suggestions */}
            {messages.length <= 1 && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    className="text-xs px-2.5 py-1 rounded-full border border-brand-200 dark:border-brand-800 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-[var(--border-color)]">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  id="ai-chat-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your fees..."
                  className="input flex-1 py-2 text-sm"
                />
                <motion.button
                  id="ai-send-btn"
                  whileTap={{ scale: 0.9 }}
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center text-white disabled:opacity-50 flex-shrink-0"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
