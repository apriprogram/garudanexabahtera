import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FIRST_ORDER_DISCOUNT_PERCENT } from '../../../lib/firstOrderDiscount';
import { HUB_PATHS } from '../../../seo/paths';

/** Maskot Nexa tanpa latar (dipotong dari gambar pemilik 2026-10-24): 128 px untuk ikon, 256 px untuk layar 2x. */
const AVATAR = '/assets/nexa/nexa-128.webp';
const AVATAR_2X = '/assets/nexa/nexa-256.webp';

/** Jeda "Nexa sedang mengetik" sebelum balasan tampil (ms). */
export const NEXA_REPLY_DELAY = 700;

interface NexaAction {
  label: string;
  /** Halaman di situs ini (react-router) */
  to?: string;
  /** Tautan luar (WhatsApp), dibuka di tab baru */
  href?: string;
}

interface NexaMessage {
  id: number;
  from: 'nexa' | 'user';
  text: string;
  action?: NexaAction;
}

interface NexaTopic {
  label: string;
  reply: string;
  action: NexaAction;
}

/**
 * Topik cepat. Nexa belum terhubung ke AI (permintaan pemilik 2026-10-24: tampilan percakapan dulu), jadi jawabannya
 * tetap dan hanya berisi fakta yang juga tertulis di situs, lalu menautkan halaman yang tepat.
 */
const TOPICS: NexaTopic[] = [
  {
    label: 'Pilih template',
    reply: `Kami punya template siap pakai untuk company profile, klinik & salon, klub olahraga, sampai fintech. Harganya sudah termasuk setup, domain, hosting, dan SSL tahun pertama, plus diskon ${FIRST_ORDER_DISCOUNT_PERCENT}% otomatis untuk pembelian template pertama.`,
    action: { label: 'Lihat katalog template', to: HUB_PATHS.catalog },
  },
  {
    label: 'Pesan website custom',
    reply:
      'Untuk website atau aplikasi mobile custom, ceritakan kebutuhan Anda lewat form pesan custom. Tim kami menghubungi Anda untuk konsultasi gratis, lalu mengirim penawaran berisi cakupan dan jadwal.',
    action: { label: 'Isi form pesan custom', to: HUB_PATHS.customOrder },
  },
  {
    label: 'Berapa harganya?',
    reply:
      'Harga template tertera di setiap kartu dan sudah termasuk domain, hosting, dan SSL tahun pertama. Jasa website dan aplikasi custom memakai penawaran setelah konsultasi gratis.',
    action: { label: 'Lihat halaman harga', to: HUB_PATHS.pricing },
  },
  {
    label: 'Cara pembelian',
    reply:
      'Pilih template, klik Pesan, isi data dan nama domain, lalu bayar lewat Midtrans. Setelah pembayaran dikonfirmasi, tim kami menyiapkan website Anda dan isinya bisa Anda kelola sendiri lewat CMS.',
    action: { label: 'Mulai pilih template', to: HUB_PATHS.catalog },
  },
];

const GREETING =
  'Halo, saya Nexa, asisten AI Garuda Nexa. Saya bisa bantu memilih template, memesan website, dan menjelaskan layanan kami. Saya masih belajar, jadi untuk sekarang pilih salah satu topik di bawah ini.';

const freeformReply = (whatsappHref: string): Omit<NexaMessage, 'id'> => ({
  from: 'nexa',
  text: 'Maaf, Nexa masih dalam tahap pengembangan dan belum bisa menjawab pertanyaan bebas. Untuk pertanyaan ini, tim kami siap membantu lewat WhatsApp.',
  action: { label: 'Chat WhatsApp', href: whatsappHref },
});

/** Gambar maskot (dekoratif: nama "Nexa" selalu tertulis di dekatnya). */
export const NexaAvatar: React.FC<{ className?: string }> = ({ className = '' }) => (
  <img
    src={AVATAR}
    srcSet={`${AVATAR} 1x, ${AVATAR_2X} 2x`}
    alt=""
    width={128}
    height={118}
    decoding="async"
    draggable={false}
    className={`select-none object-contain ${className}`}
  />
);

const ActionLink: React.FC<{ action: NexaAction; onNavigate: () => void }> = ({ action, onNavigate }) => {
  const className =
    'mt-2 inline-flex h-9 items-center rounded-full bg-surface px-3.5 text-[13px] font-semibold text-primary ring-1 ring-inset ring-brand-200 transition-colors hover:bg-brand-50';
  if (action.href) {
    return (
      <a href={action.href} target="_blank" rel="noopener noreferrer" className={className}>
        {action.label}
        <span className="sr-only"> (tab baru)</span>
      </a>
    );
  }
  return (
    <Link to={action.to as string} onClick={onNavigate} className={className}>
      {action.label}
    </Link>
  );
};

interface NexaChatProps {
  /** Tautan WhatsApp untuk pertanyaan yang belum bisa dijawab Nexa */
  whatsappHref: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Widget "Nexa" (calon agen AI pemesanan & penjelasan layanan): tombol maskot di samping tombol WhatsApp, membuka panel
 * percakapan non-modal. Belum terhubung ke AI: topik cepat dijawab teks tetap (TOPICS), pesan bebas dijawab jujur bahwa
 * Nexa masih dikembangkan + tautan WhatsApp. Percakapan hanya di memori (hilang saat halaman dimuat ulang).
 * Panel hanya dirender saat terbuka (HTML prerender = tombol saja), lewat portal ke <body>: di luar konteks tumpuk dok
 * (z-40), dan tingginya menyisakan ruang navbar (--nav-offset) agar header panel tidak tertutup. Bila layar terlalu
 * pendek, panel sendiri yang bergulir (log tetap minimal 8rem). Esc (selama fokus di panel/tombol, dan belum ditangani
 * kontrol lain) atau tombol tutup mengembalikan fokus ke tombol Nexa. Chip topik tidak pernah dilepas dari DOM (hanya
 * aria-disabled selama Nexa mengetik), jadi fokus keyboard tidak hilang; chip berada di luar role=log supaya tidak ikut
 * dibacakan ulang setiap balasan.
 */
export const NexaChat: React.FC<NexaChatProps> = ({ whatsappHref, open, onOpenChange }) => {
  const panelId = useId();
  const titleId = useId();
  const inputId = useId();
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const nextId = useRef(1);
  const [messages, setMessages] = useState<NexaMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  // Buka: fokus ke kolom pesan. Esc hanya bila fokus di panel/tombol Nexa dan belum dipakai kontrol lain (mis. Esc di
  // kolom cari template menghapus kata kunci, bukan menutup chat).
  useEffect(() => {
    if (!open) return undefined;
    inputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      const active = document.activeElement;
      if (!panelRef.current?.contains(active) && active !== launcherRef.current) return;
      onOpenChange(false);
      launcherRef.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  // Pesan baru, atau panel dibuka lagi: gulir log ke pesan terakhir
  useEffect(() => {
    if (!open) return;
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [open, messages, typing]);

  const close = () => {
    onOpenChange(false);
    launcherRef.current?.focus();
  };

  const send = (text: string, reply: Omit<NexaMessage, 'id'>) => {
    setMessages((prev) => [...prev, { id: nextId.current++, from: 'user', text }]);
    setTyping(true);
    timers.current.push(
      window.setTimeout(() => {
        setTyping(false);
        setMessages((prev) => [...prev, { id: nextId.current++, ...reply }]);
      }, NEXA_REPLY_DELAY),
    );
  };

  const askTopic = (topic: NexaTopic) => {
    if (typing) return;
    send(topic.label, { from: 'nexa', text: topic.reply, action: topic.action });
  };

  const canSend = draft.trim() !== '' && !typing;
  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSend) return;
    send(draft.trim(), freeformReply(whatsappHref));
    setDraft('');
    inputRef.current?.focus();
  };

  return (
    <>
      {open &&
        createPortal(
          <section
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-modal="false"
            aria-labelledby={titleId}
            // Di atas dok (48/56px + jarak bawah), di bawah navbar: tinggi maks = layar - navbar - ruang dok
            className="fixed inset-x-3 bottom-[calc(max(16px,calc(env(safe-area-inset-bottom)+8px))+3.75rem)] z-40 flex max-h-[calc(100svh-var(--nav-offset)-6rem)] flex-col overflow-y-auto overscroll-contain rounded-[24px] bg-surface text-left shadow-float ring-1 ring-inset ring-line transition-[opacity,translate] duration-200 ease-calm starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none sm:inset-x-auto sm:bottom-[6.25rem] sm:right-8 sm:max-h-[min(620px,calc(100svh-var(--nav-offset)-7.25rem))] sm:w-[380px]"
          >
            <header className="flex shrink-0 items-center gap-3 bg-fg px-4 py-3 text-white">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
                <NexaAvatar className="h-8 w-8" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="text-[15px] font-semibold leading-tight">
                  Nexa
                </h2>
                <p className="truncate text-xs text-white/60">Asisten AI Garuda Nexa · versi awal</p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Tutup chat Nexa"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-white"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </header>

            <div
              ref={logRef}
              role="log"
              aria-live="polite"
              aria-label="Percakapan dengan Nexa"
              className="min-h-32 flex-1 space-y-3 overflow-y-auto px-4 py-4"
            >
              <div className="flex flex-col items-center pb-1 text-center">
                <NexaAvatar className="h-16 w-16" />
              </div>
              <Bubble from="nexa">{GREETING}</Bubble>
              {messages.map((message) => (
                <Bubble key={message.id} from={message.from}>
                  {message.text}
                  {message.action && <ActionLink action={message.action} onNavigate={() => onOpenChange(false)} />}
                </Bubble>
              ))}
              {typing && (
                <div className="flex w-fit items-center gap-1 rounded-2xl rounded-bl-md bg-fg/6 px-3.5 py-3" aria-hidden>
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-1.5 w-1.5 rounded-full bg-fg/45 motion-safe:animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              )}
            </div>
            {/* Status mengetik untuk pembaca layar: wadah selalu ada, teksnya berganti */}
            <p role="status" className="sr-only">
              {typing ? 'Nexa sedang mengetik' : ''}
            </p>

            {/* Topik cepat di luar log (tidak dibacakan ulang); tidak pernah dilepas dari DOM agar fokus tidak hilang */}
            <div className="flex shrink-0 flex-wrap gap-2 px-4 pb-3" role="group" aria-label="Topik cepat">
              {TOPICS.map((topic) => (
                <button
                  key={topic.label}
                  type="button"
                  onClick={() => askTopic(topic)}
                  aria-disabled={typing || undefined}
                  className="inline-flex h-9 items-center rounded-full bg-surface px-3.5 text-[13px] font-medium text-fg ring-1 ring-inset ring-line transition-colors hover:bg-fg/5 hover:ring-line-strong aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-surface"
                >
                  {topic.label}
                </button>
              ))}
            </div>

            <form onSubmit={onSubmit} className="flex shrink-0 items-center gap-2 border-t border-line p-3">
              <label htmlFor={inputId} className="sr-only">
                Tulis pesan untuk Nexa
              </label>
              <input
                ref={inputRef}
                id={inputId}
                type="text"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Tulis pesan…"
                maxLength={500}
                autoComplete="off"
                enterKeyHint="send"
                // 16px di HP agar iOS tidak memperbesar halaman saat kolom difokus
                className="h-11 min-w-0 flex-1 rounded-full bg-fg/5 px-4 text-base text-fg outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-primary sm:text-[15px]"
              />
              {/* aria-disabled (bukan disabled): tombol yang sedang difokus tetap fokus setelah pesan terkirim */}
              <button
                type="submit"
                aria-label="Kirim pesan"
                aria-disabled={!canSend || undefined}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary-hover aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-primary"
              >
                <ArrowUp className="h-5 w-5" aria-hidden />
              </button>
            </form>
            <p className="shrink-0 px-4 pb-3 text-center text-[11px] leading-snug text-muted">Nexa versi awal: belum terhubung ke AI.</p>
          </section>,
          document.body,
        )}

      <button
        ref={launcherRef}
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-label={open ? 'Tutup chat Nexa' : 'Tanya Nexa, asisten AI'}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-haspopup="dialog"
        className="group relative flex h-12 w-12 items-center justify-center rounded-full bg-surface shadow-float ring-1 ring-inset ring-line transition-[translate,background-color] duration-300 ease-calm hover:bg-alt motion-safe:hover:-translate-y-0.5 sm:h-14 sm:w-14"
      >
        {!open && (
          <span className="pointer-events-none absolute bottom-full right-0 mb-3 hidden whitespace-nowrap rounded-full bg-surface px-3.5 py-2 text-[13px] font-semibold text-fg opacity-0 shadow-float ring-1 ring-inset ring-line transition-opacity group-hover:opacity-100 sm:block">
            Tanya Nexa
          </span>
        )}
        {open ? <X className="h-5 w-5 text-fg sm:h-6 sm:w-6" aria-hidden /> : <NexaAvatar className="h-9 w-9 sm:h-10 sm:w-10" />}
        {!open && (
          <span
            className="absolute -right-1 -top-1 rounded-full bg-fg px-1.5 py-px text-[9px] font-bold leading-tight text-white ring-2 ring-surface"
            aria-hidden
          >
            AI
          </span>
        )}
      </button>
    </>
  );
};

/** Gelembung pesan: Nexa kiri (abu), pengunjung kanan (biru brand). */
const Bubble: React.FC<{ from: 'nexa' | 'user'; children: React.ReactNode }> = ({ from, children }) => (
  <div className={`flex ${from === 'user' ? 'justify-end' : 'justify-start'}`}>
    <div
      className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed ${
        from === 'user' ? 'rounded-br-md bg-primary text-white' : 'rounded-bl-md bg-fg/6 text-fg'
      }`}
    >
      <span className="sr-only">{from === 'user' ? 'Anda: ' : 'Nexa: '}</span>
      {children}
    </div>
  </div>
);

export default NexaChat;
