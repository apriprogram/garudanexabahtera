import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, X, Minimize2, Maximize2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { IconBox, IconButton, Input, cn, FOCUS } from './ui';

/* Posisi melayang kanan-bawah, aman untuk notch/home indicator. */
const FLOAT_POS = 'bottom-[max(16px,calc(env(safe-area-inset-bottom)+8px))] right-[max(16px,env(safe-area-inset-right))]';
/* Di bawah Modal/Drawer (z-100): tombol melayang tidak boleh menutupi tombol aksi di footer drawer. */
const FLOAT_LAYER = 'z-[90]';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const AIChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Halo! Saya asisten AI Garuda Nexa. Ada yang bisa saya bantu soal data website, produk, atau layanan kamu?\n\n**Yang bisa saya bantu:**\n- Data pengunjung real-time\n- Info produk & harga\n- Troubleshooting\n- Analisis website' }
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

      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error(data?.error || 'AI service error');

      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      // Tampilkan pesan dari server bila ada (mis. "AI server … tidak merespons"), selain pesan umum
      const detail = err instanceof Error && err.message !== 'AI service error' ? `\n\n${err.message}` : '';
      setMessages(prev => [...prev, { role: 'assistant', content: `Maaf, ada kendala teknis. Coba lagi sebentar lagi, ya.${detail}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {!isOpen && (
          <motion.button
            key="fab"
            type="button"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={() => setIsOpen(true)}
            aria-label="Garuda Nexa AI"
            className={cn(
              'fixed flex h-14 w-14 items-center justify-center rounded-full bg-cobalt text-white shadow-float transition-colors duration-150 hover:bg-cobalt-600 max-sm:h-12 max-sm:w-12',
              FLOAT_POS,
              FLOAT_LAYER,
              FOCUS,
            )}
          >
            <Bot className="h-6 w-6 max-sm:h-[22px] max-sm:w-[22px]" strokeWidth={1.75} aria-hidden />
            <span className="absolute right-0 top-0 h-3.5 w-3.5 animate-pulse rounded-full bg-danger ring-2 ring-adm-surface" aria-hidden />
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
            className={cn(
              'fixed flex flex-col overflow-hidden rounded-[24px] bg-adm-surface text-adm-fg shadow-float ring-1 ring-adm-line',
              FLOAT_POS,
              FLOAT_LAYER,
              'sm:w-[420px] lg:w-[480px]',
              // HP: bottom-sheet penuh lebar
              'max-sm:inset-x-0 max-sm:bottom-0 max-sm:w-full max-sm:rounded-b-none',
              isMinimized ? 'max-h-12' : 'max-h-[min(85vh,640px)] lg:max-h-[min(90vh,700px)] max-sm:max-h-[85vh]',
            )}
          >
            {/* Header */}
            <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-adm-line px-3 sm:px-4">
              <div className="flex min-w-0 items-center gap-2.5">
                <IconBox icon={<Bot />} tone="cobalt" size="sm" />
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold leading-tight text-adm-fg">Garuda Nexa AI</h3>
                  {!isMinimized && (
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium leading-none text-adm-mint-fg">
                      <Sparkles className="h-3 w-3" strokeWidth={1.75} aria-hidden /> Online
                    </p>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <IconButton
                  icon={isMinimized ? <Maximize2 /> : <Minimize2 />}
                  label={isMinimized ? 'Perbesar' : 'Perkecil'}
                  size="sm"
                  onClick={() => setIsMinimized(!isMinimized)}
                />
                <IconButton icon={<X />} label="Tutup" size="sm" onClick={() => setIsOpen(false)} />
              </div>
            </div>

            {/* Chat Messages */}
            {!isMinimized && (
              <>
                <div
                  ref={scrollRef}
                  className="chat-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-4 sm:px-4"
                >
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'min-w-0 rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed sm:text-sm',
                          msg.role === 'user'
                            ? 'max-w-[80%] rounded-br-md bg-cobalt text-white'
                            : 'max-w-[92%] rounded-bl-md bg-adm-ghost text-adm-fg',
                        )}
                      >
                        {msg.role === 'user' ? (
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
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
                    <div className="flex justify-start" role="status">
                      <div className="flex items-center gap-2.5 rounded-2xl rounded-bl-md bg-adm-ghost px-3.5 py-2.5">
                        <div className="flex gap-1" aria-hidden>
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cobalt/70" style={{ animationDelay: '0ms' }}></span>
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cobalt/70" style={{ animationDelay: '150ms' }}></span>
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cobalt/70" style={{ animationDelay: '300ms' }}></span>
                        </div>
                        <span className="text-xs text-adm-muted">Mengetik...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="shrink-0 border-t border-adm-line px-3 py-3 max-sm:pb-[max(12px,env(safe-area-inset-bottom))] sm:px-4">
                  <Input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ketik pesan..."
                    aria-label="Ketik pesan..."
                    enterKeyHint="send"
                    rightSlot={
                      <IconButton
                        icon={<Send />}
                        label="Kirim"
                        variant="primary"
                        size="sm"
                        onClick={handleSendMessage}
                        disabled={!input.trim() || isLoading}
                      />
                    }
                  />
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIChatWidget;
