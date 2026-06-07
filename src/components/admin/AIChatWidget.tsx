import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, X, Minimize2, Maximize2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const AIChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Halo Admin! Saya AI Assistant Garuda Nexa. Ada yang bisa saya bantu terkait data website, produk, atau layanan?\n\n**Fitur saya:**\n- Data pengunjung real-time\n- Info produk & pricing\n- Troubleshooting\n- Analisis website' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });

      if (!res.ok) throw new Error('AI service error');
      
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Maaf, terjadi kesalahan teknis. Silakan coba lagi nanti.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-3 md:bottom-6 right-3 md:right-6 z-[9999]">
      <AnimatePresence mode="wait">
        {!isOpen && (
          <motion.button
            key="fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={() => setIsOpen(true)}
            title=""
            className="w-12 h-12 md:w-14 md:h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-primary via-primary/80 to-primary-hover/50 group-hover:rotate-12 transition-transform duration-500"></div>
            <Bot className="w-6 h-6 md:w-7 md:h-7 relative z-10" />
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 md:w-4 md:h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.85, y: 15, originX: 1, originY: 1 }}
            animate={{ 
              opacity: 1, scale: 1, y: 0,
              height: isMinimized ? '48px' : 'auto',
            }}
            exit={{ opacity: 0, scale: 0.85, y: 15, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 350, damping: 25, mass: 0.8 }}
            className={`
              w-[calc(100vw-1.5rem)] md:w-[420px] lg:w-[480px]
              ${isMinimized ? 'max-h-[48px]' : 'max-h-[min(80vh,480px)] md:max-h-[min(85vh,640px)] lg:max-h-[min(90vh,700px)]'}
              bg-[#0F172A] light-theme:bg-white
              border border-white/10 light-theme:border-slate-200
              rounded-2xl shadow-[0_10px_40px_-15px_rgba(0,0,0,0.3)]
              overflow-hidden flex flex-col
            `}
          >
            {/* Header */}
            <div className="px-3 md:px-4 py-2.5 md:py-3 bg-gradient-to-r from-[#1E293B] to-[#0F172A] light-theme:from-slate-50 light-theme:to-white border-b border-white/10 light-theme:border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 md:gap-2.5 min-w-0">
                <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30 shrink-0">
                  <Bot className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs md:text-sm font-semibold text-white light-theme:text-slate-900 leading-none truncate">Garuda Nexa AI</h3>
                  {!isMinimized && (
                    <p className="text-[9px] md:text-[10px] text-primary mt-0.5 flex items-center gap-1">
                      <Sparkles className="w-2 h-2" /> Online
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  title=""
                  className="p-1 md:p-1.5 hover:bg-white/5 light-theme:hover:bg-slate-100 rounded-md transition-colors text-white/50 light-theme:text-slate-400 hover:text-white light-theme:hover:text-slate-900"
                >
                  {isMinimized ? <Maximize2 className="w-3 h-3 md:w-3.5 md:h-3.5" /> : <Minimize2 className="w-3 h-3 md:w-3.5 md:h-3.5" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  title=""
                  className="p-1 md:p-1.5 hover:bg-red-500/20 rounded-md transition-colors text-white/50 light-theme:text-slate-400 hover:text-red-400"
                >
                  <X className="w-3 h-3 md:w-3.5 md:h-3.5" />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            {!isMinimized && (
              <>
                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto px-3 md:px-4 py-3 md:py-4 space-y-3 md:space-y-3.5 chat-scrollbar bg-[#0F172A] light-theme:bg-[#F8FAFC]"
                >
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-center'}`}
                    >
                      <div
                        className={`
                          ${msg.role === 'user'
                            ? 'bg-primary text-white rounded-2xl rounded-tr-sm max-w-[72%] md:max-w-[65%] shadow-[0_1px_3px_rgba(0,0,0,0.12)]'
                            : 'bg-white/[0.04] light-theme:bg-white border border-white/[0.06] light-theme:border-slate-200 text-slate-200 light-theme:text-slate-700 rounded-2xl rounded-tl-sm max-w-[92%] md:max-w-[88%]'
                          }
                          px-3.5 md:px-4 py-2.5 md:py-3 text-[13px] md:text-sm leading-relaxed
                        `}
                      >
                        {msg.role === 'user' ? (
                          <p className="text-white/90">{msg.content}</p>
                        ) : (
                          <div className="prose-aichat">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-center">
                      <div className="bg-white/[0.04] light-theme:bg-white border border-white/[0.06] light-theme:border-slate-200 rounded-2xl rounded-tl-sm px-3.5 md:px-4 py-2.5 md:py-3 flex items-center gap-2.5">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                        <span className="text-[11px] md:text-xs text-slate-400 light-theme:text-slate-500">Mengetik...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="px-3 md:px-4 py-2.5 md:py-3 bg-[#1E293B]/50 light-theme:bg-white border-t border-white/10 light-theme:border-slate-200 shrink-0">
                  <div className="relative">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Ketik pesan..."
                      className="w-full bg-[#0F172A] light-theme:bg-slate-50 border border-white/10 light-theme:border-slate-200 rounded-xl py-2 md:py-2.5 pl-3.5 md:pl-4 pr-10 md:pr-11 text-[13px] md:text-sm text-white light-theme:text-slate-900 placeholder-slate-500 light-theme:placeholder-slate-400 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!input.trim() || isLoading}
                      className={`absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center transition-all ${
                        input.trim() && !isLoading
                          ? 'bg-primary text-white hover:brightness-110 active:scale-90'
                          : 'text-white/20'
                      }`}
                    >
                      <Send className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIChatWidget;
