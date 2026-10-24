import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp, Mic, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiPost } from '../../../lib/api';
import { FIRST_ORDER_DISCOUNT_PERCENT } from '../../../lib/firstOrderDiscount';
import { HUB_PATHS } from '../../../seo/paths';
import { answerLocally, type NexaAction, type NexaAnswer, type NexaMood } from './localAnswer';

/**
 * Maskot Nexa tanpa latar (dipotong dari gambar pemilik 2026-10-24) dalam 3 lebar; browser memilih sesuai ukuran tampil
 * × kepadatan layar/zoom (`sizes`), jadi tetap tajam di layar 3x/4x atau saat halaman diperbesar. Maskot ekspresif
 * (pemilik 2026-10-24): netral di tombol, senang menyapa, pikir saat mengetik, dan jawaban memilih ekspresinya
 * (replyMood) — ceria menjawab, kedip membalas salam & terima kasih, kilau untuk diskon, maaf saat tidak tahu.
 * Hanya ekspresi tanpa mulut yang dipakai (pemilik 2026-10-24).
 */
const MOODS: readonly NexaMood[] = ['netral', 'kedip', 'ceria', 'kilau', 'pikir', 'maaf'];
const moodFile = (mood: NexaMood, width: 128 | 256 | 512): string =>
  mood === 'netral' ? `/assets/nexa/nexa-${width}.webp` : `/assets/nexa/nexa-${mood}-${width}.webp`;
const moodSrcSet = (mood: NexaMood): string => `${moodFile(mood, 128)} 128w, ${moodFile(mood, 256)} 256w, ${moodFile(mood, 512)} 512w`;

/** Jeda minimum "Nexa sedang mengetik" sebelum balasan tampil (ms), juga untuk jawaban bawaan yang instan. */
export const NEXA_REPLY_DELAY = 700;
/** Riwayat yang dikirim ke nexa_chat (= NEXA_MAX_MESSAGES di backend/modules/nexa.php). */
const HISTORY_LIMIT = 12;
/** Panjang maksimum (code point) per pesan yang dikirim (= NEXA_MAX_USER_CHARS / NEXA_MAX_ASSISTANT_CHARS di backend). */
const HISTORY_MAX_CHARS = { user: 1000, assistant: 4000 } as const;

interface NexaMessage extends NexaAnswer {
  id: number;
  from: 'nexa' | 'user';
}

/** Ekspresi untuk satu jawaban: dari jawabannya sendiri, atau dipilih dari isi pertanyaan & teksnya. */
const replyMood = (question: string, answer: NexaAnswer): NexaMood => {
  if (answer.mood) return answer.mood;
  if (/terima kasih|makasih|thank/i.test(question)) return 'kedip';
  if (/^maaf/i.test(answer.text)) return 'maaf';
  if (/diskon/i.test(answer.text)) return 'kilau';
  return 'ceria';
};

interface NexaTopic {
  label: string;
  reply: string;
  action: NexaAction;
}

/** Topik cepat: jawaban tetap (fakta yang juga tertulis di situs) + tautan halaman, tanpa memanggil AI. */
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
  'Halo, saya Nexa, asisten AI Garuda Nexa. Tanya apa saja seputar template website, harga, cara pembelian, atau jasa website dan aplikasi custom.';


const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

// ── Input suara (Web Speech API; hanya tampil di browser yang mendukungnya, mis. Chrome) ──
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const speechRecognition = (): SpeechRecognitionCtor | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

/** Mikrofon diizinkan header Permissions-Policy halaman ini (microphone=(self) di .htaccess / nginx.conf)? */
const microphoneAllowed = (): boolean => {
  const policy = (document as unknown as { permissionsPolicy?: { allowsFeature(feature: string): boolean } }).permissionsPolicy;
  return policy ? policy.allowsFeature('microphone') : true;
};

/** Pesan untuk galat input suara (kode `error` Web Speech API); null = tidak perlu diberitahukan. */
const speechErrorText = (code: string | undefined): string | null => {
  if (code === 'aborted') return null;
  if (code === 'not-allowed' || code === 'service-not-allowed') return 'Izin mikrofon ditolak. Silakan ketik pertanyaan Anda.';
  if (code === 'no-speech') return 'Suara tidak terdengar. Coba lagi, atau ketik pertanyaan Anda.';
  if (code === 'audio-capture') return 'Mikrofon tidak ditemukan. Silakan ketik pertanyaan Anda.';
  if (code === 'network') return 'Input suara butuh koneksi internet. Silakan ketik pertanyaan Anda.';
  return 'Input suara tidak tersedia. Silakan ketik pertanyaan Anda.';
};

/** Potong ke `max` code point (bukan unit UTF-16, sama dengan mb_substr di backend). */
const clip = (text: string, max: number): string => {
  const chars = [...text];
  return chars.length > max ? chars.slice(0, max).join('') : text;
};

/** Gambar maskot (dekoratif: nama "Nexa" selalu tertulis di dekatnya). */
export const NexaAvatar: React.FC<{ className?: string; sizes: string; mood?: NexaMood }> = ({ className = '', sizes, mood = 'netral' }) => (
  <img
    src={moodFile(mood, 128)}
    srcSet={moodSrcSet(mood)}
    sizes={sizes}
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
    'mt-3 inline-flex h-9 items-center rounded-full bg-surface px-4 text-[13px] font-semibold text-primary ring-1 ring-inset ring-brand-200 transition-colors hover:bg-brand-50';
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

/**
 * Tautan di jawaban AI: path halaman situs yang dikenal (bukan path lain yang mungkin ditulis model) atau wa.me/nomor.
 * Grup 1 = karakter sebelum tautan (awal teks / bukan huruf, "/" atau "."), grup 2 = path, grup 3 = nomor WhatsApp.
 * Tanpa lookbehind: Safari lama gagal mengurai regex lookbehind dan seluruh skrip halaman ikut gagal.
 */
const LINKS =
  /(^|[^\w/.])(?:(\/(?:template|harga|pesan-custom|jasa-pembuatan-website|jasa-pembuatan-aplikasi-mobile|tentang|kontak|panduan|syarat-ketentuan|kebijakan-privasi|kebijakan-pengembalian-dana)(?:\/[a-z0-9-]+)*)|(?:https?:\/\/)?wa\.me\/(\d{8,15}))/g;

/**
 * Teks jawaban Nexa: path situs (/harga, /template/aura-studio) menjadi tautan internal, wa.me/… menjadi tautan WhatsApp
 * (tab baru). Alamat lengkap garudanexa.com dipendekkan ke path-nya; sisa Markdown tebal (**…**) dibuang.
 */
const RichText: React.FC<{ text: string; onNavigate: () => void }> = ({ text, onNavigate }) => {
  const clean = text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/https?:\/\/(?:www\.)?garudanexa\.com(?=\/)/g, '');
  const linkClass = 'font-medium text-primary underline decoration-brand-300 underline-offset-2 hover:decoration-primary';
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const match of clean.matchAll(LINKS)) {
    const start = (match.index ?? 0) + match[1].length;
    const label = match[0].slice(match[1].length);
    if (start > cursor) parts.push(clean.slice(cursor, start));
    parts.push(
      match[3] ? (
        <a key={start} href={`https://wa.me/${match[3]}`} target="_blank" rel="noopener noreferrer" className={linkClass}>
          {label}
          <span className="sr-only"> (WhatsApp, tab baru)</span>
        </a>
      ) : (
        <Link key={start} to={match[2]} onClick={onNavigate} className={linkClass}>
          {label}
        </Link>
      ),
    );
    cursor = start + label.length;
  }
  parts.push(clean.slice(cursor));
  return <>{parts}</>;
};

interface NexaChatProps {
  /** Tautan WhatsApp untuk pertanyaan yang belum bisa dijawab Nexa */
  whatsappHref: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Widget "Nexa AI" (permintaan pemilik 2026-10-24, gaya kartu chat AI putih): tombol maskot di samping tombol WhatsApp
 * membuka panel percakapan non-modal. Pertanyaan bebas dijawab Claude lewat aksi publik nexa_chat
 * (backend/modules/nexa.php = nexa.js, berbekal isi situs + data terkini); bila AI belum aktif, gagal, atau batas
 * pertanyaan tercapai, Nexa menjawab dari data situs (answerLocally). Topik cepat dijawab teks tetap tanpa AI.
 * Percakapan hanya di memori (hilang saat halaman dimuat ulang). Jawaban baru digulir ke awalnya (bukan ke ujung).
 * Panel hanya dirender saat terbuka (HTML prerender = tombol saja), lewat portal ke <body>: di luar konteks tumpuk dok
 * (z-40), tingginya menyisakan ruang navbar (--nav-offset); di desktop lebih tinggi & lebar (maks. 740 × 460 px).
 * Esc (selama fokus di panel/tombol, dan belum ditangani kontrol lain) atau tombol tutup mengembalikan fokus ke tombol
 * Nexa. Chip topik tidak pernah dilepas dari DOM (hanya aria-disabled selama Nexa mengetik), jadi fokus keyboard tidak
 * hilang; chip berada di luar role=log supaya tidak ikut dibacakan ulang setiap balasan.
 */
export const NexaChat: React.FC<NexaChatProps> = ({ whatsappHref, open, onOpenChange }) => {
  const panelId = useId();
  const titleId = useId();
  const inputId = useId();
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const alive = useRef(true);
  const nextId = useRef(1);
  const [messages, setMessages] = useState<NexaMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');
  const [listening, setListening] = useState(false);
  // Pesan galat input suara (tampil di bawah form & dibacakan lewat role=status)
  const [micNote, setMicNote] = useState('');
  // Maskot tombol menyapa (senang) saat disorot/difokus
  const [greetingLauncher, setGreetingLauncher] = useState(false);
  // Panel hanya dirender di klien (tidak ada di HTML prerender), jadi deteksi fitur saat render pertama aman
  const [canListen] = useState(() => speechRecognition() !== null && microphoneAllowed());

  // Panel terbuka: muat semua ekspresi sekali, supaya pergantian maskot tidak berkedip
  useEffect(() => {
    if (!open) return;
    for (const mood of MOODS) {
      const img = new Image();
      img.srcset = moodSrcSet(mood);
      img.sizes = '40px';
      img.src = moodFile(mood, 128);
    }
  }, [open]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      recognitionRef.current?.abort();
    };
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

  // Panel ditutup: hentikan rekaman suara yang masih berjalan
  useEffect(() => {
    if (open) return;
    recognitionRef.current?.abort();
  }, [open]);

  // Pesan baru, atau panel dibuka lagi: gulir ke ujung log; jawaban Nexa yang baru tiba digulir ke AWALNYA, jadi jawaban
  // panjang terbaca dari kalimat pertama (bukan hanya ekornya)
  useEffect(() => {
    if (!open) return;
    const log = logRef.current;
    if (!log) return;
    const last = messages[messages.length - 1];
    const reply = !typing && last?.from === 'nexa' ? log.querySelector<HTMLElement>(`[data-message-id="${last.id}"]`) : null;
    log.scrollTop = reply ? Math.max(0, reply.offsetTop - 16) : log.scrollHeight;
  }, [open, messages, typing]);

  const close = () => {
    onOpenChange(false);
    launcherRef.current?.focus();
  };

  /** Tampilkan pertanyaan, lalu balasan yang dihasilkan `reply` (minimal NEXA_REPLY_DELAY "sedang mengetik"). */
  const send = (text: string, reply: () => Promise<NexaAnswer>) => {
    setMessages((prev) => [...prev, { id: nextId.current++, from: 'user', text }]);
    setTyping(true);
    void Promise.all([reply(), wait(NEXA_REPLY_DELAY)]).then(([answer]) => {
      if (!alive.current) return;
      setTyping(false);
      setMessages((prev) => [...prev, { id: nextId.current++, from: 'nexa', ...answer, mood: replyMood(text, answer) }]);
    });
  };

  /**
   * Jawaban AI (nexa_chat) untuk pertanyaan bebas. Gagal apa pun (AI belum aktif, Claude gagal, batas pertanyaan 429,
   * jaringan) → jawaban bawaan dari data situs, jadi Nexa tidak pernah buntu.
   */
  const askAi = async (question: string, prior: NexaMessage[]): Promise<NexaAnswer> => {
    const history = [...prior.map((message) => ({ from: message.from, text: message.text })), { from: 'user' as const, text: question }]
      .slice(-HISTORY_LIMIT)
      .map(({ from, text }) => {
        const role = from === 'user' ? 'user' : 'assistant';
        return { role, content: clip(text, HISTORY_MAX_CHARS[role]) };
      });
    try {
      const data = await apiPost<{ reply?: unknown }>('nexa_chat', { messages: history });
      if (typeof data?.reply === 'string' && data.reply.trim() !== '') return { text: data.reply.trim() };
    } catch {
      // jawab dari data situs di bawah (status "mengetik" selalu selesai)
    }
    return answerLocally(question, whatsappHref);
  };

  const askTopic = (topic: NexaTopic) => {
    if (typing) return;
    send(topic.label, async () => ({ text: topic.reply, action: topic.action }));
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  const toggleListening = () => {
    if (listening) {
      stopListening();
      return;
    }
    const Recognition = speechRecognition();
    if (!Recognition) return;
    const recognition = new Recognition();
    const base = draft.trim();
    setMicNote('');
    let spoken = '';
    let finished = false;
    let cancelled = false;
    const fullText = () => `${base}${base && spoken ? ' ' : ''}${spoken}`.slice(0, 500);
    recognition.lang = 'id-ID';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const results = Array.from(event.results);
      spoken = results.map((result) => result[0]?.transcript ?? '').join('');
      finished = Boolean(results[results.length - 1]?.isFinal);
      setDraft(fullText());
    };
    recognition.onend = () => {
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      if (!alive.current) return;
      setListening(false);
      inputRef.current?.focus();
      // Selesai berbicara (hasil final, bukan dibatalkan): pertanyaannya langsung terkirim (pemilik 2026-10-24)
      if (!cancelled && finished && spoken.trim() !== '') submitRef.current(fullText());
    };
    recognition.onerror = (event) => {
      if (event.error === 'aborted') cancelled = true;
      const note = speechErrorText(event.error);
      if (note && alive.current) setMicNote(note);
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      recognitionRef.current = null;
    }
  };

  /** Kirim satu pertanyaan (form & kiriman otomatis input suara); false bila kosong atau Nexa masih mengetik. */
  const submit = (raw: string): boolean => {
    const question = raw.trim();
    if (question === '' || typing) return false;
    const prior = messages;
    send(question, () => askAi(question, prior));
    setDraft('');
    inputRef.current?.focus();
    return true;
  };
  // Versi terbaru `submit` untuk onend pengenal suara (closure-nya dibuat saat mic dinyalakan)
  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  });

  const canSend = draft.trim() !== '' && !typing;
  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSend) return;
    // Dikte yang masih berjalan dibatalkan: hasil akhirnya tidak boleh mengisi ulang kolom / terkirim dua kali
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onresult = null;
      recognition.abort();
    }
    setMicNote('');
    submit(draft);
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
            // Di atas dok (48/56px + jarak bawah), di bawah navbar. HP: hampir selebar layar; desktop: 460 px, tinggi
            // tetap maks. 740 px (pemilik 2026-10-24: lebih tinggi & luas). Layar sangat pendek (HP mendatar, zoom besar):
            // log tetap minimal 8rem dan panel sendiri yang bergulir
            className="fixed inset-x-3 bottom-[calc(max(16px,calc(env(safe-area-inset-bottom)+8px))+3.75rem)] z-40 flex h-[min(620px,calc(100svh-var(--nav-offset)-6rem))] custom-scrollbar flex-col overflow-y-auto overscroll-contain rounded-[28px] bg-surface text-left shadow-float ring-1 ring-inset ring-line/70 transition-[opacity,translate] duration-200 ease-calm starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none sm:inset-x-auto sm:bottom-[6.25rem] sm:right-8 sm:h-[min(740px,calc(100svh-var(--nav-offset)-7.25rem))] sm:w-[440px] lg:w-[460px]"
          >
            {/* Kepala ringkas (pemilik 2026-10-24: lebih kecil) */}
            <header className="flex shrink-0 items-center justify-between gap-3 px-6 pb-1 pt-3.5 sm:px-7 sm:pt-4">
              <h2 id={titleId} className="text-[15px] font-semibold tracking-[-0.01em] text-fg">
                Tanya Nexa AI
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="Tutup chat Nexa"
                className="-mr-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-fg transition-colors hover:bg-fg/5"
              >
                <X className="h-5 w-5" strokeWidth={2.25} aria-hidden />
              </button>
            </header>

            <div
              ref={logRef}
              role="log"
              aria-live="polite"
              aria-label="Percakapan dengan Nexa"
              className="custom-scrollbar relative min-h-32 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-4 sm:px-7"
            >
              <Bubble from="nexa" mood="ceria">
                {GREETING}
              </Bubble>
              {messages.map((message) => (
                <Bubble key={message.id} id={message.id} from={message.from} mood={message.mood}>
                  {message.from === 'nexa' ? <RichText text={message.text} onNavigate={() => onOpenChange(false)} /> : message.text}
                  {message.action && (
                    <span className="block">
                      <ActionLink action={message.action} onNavigate={() => onOpenChange(false)} />
                    </span>
                  )}
                </Bubble>
              ))}
              {typing && (
                <NexaRow mood="pikir">
                  <div className="flex items-center gap-1.5 rounded-[22px] bg-fg/[0.045] px-5 py-4" aria-hidden>
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="h-2 w-2 rounded-full bg-fg/40 motion-safe:animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </NexaRow>
              )}
            </div>
            {/* Status untuk pembaca layar (mengetik / galat input suara): wadah selalu ada, teksnya berganti */}
            <p role="status" className="sr-only">
              {typing ? 'Nexa sedang mengetik' : micNote}
            </p>

            {/* Topik cepat di luar log (tidak dibacakan ulang); tidak pernah dilepas dari DOM agar fokus tidak hilang.
                HP: satu baris yang bisa digeser; desktop: membungkus agar semua chip terlihat tanpa scroll */}
            <div className="shrink-0 px-6 pb-3 max-sm:overflow-x-auto max-sm:[scrollbar-width:none] sm:px-7 max-sm:[&::-webkit-scrollbar]:hidden">
              <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap" role="group" aria-label="Topik cepat">
                {TOPICS.map((topic) => (
                  <button
                    key={topic.label}
                    type="button"
                    onClick={() => askTopic(topic)}
                    aria-disabled={typing || undefined}
                    className="inline-flex h-9 items-center whitespace-nowrap rounded-full bg-surface px-4 text-[13px] font-medium text-fg ring-1 ring-inset ring-line transition-colors hover:bg-fg/5 hover:ring-line-strong aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-surface"
                  >
                    {topic.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={onSubmit} className="flex shrink-0 items-center gap-3 px-6 pb-3 sm:px-7">
              <div className="flex h-14 min-w-0 flex-1 items-center rounded-full bg-fg/[0.045] pl-5 pr-2 ring-1 ring-inset ring-transparent transition-[box-shadow,background-color] duration-300 ease-calm focus-within:bg-surface focus-within:ring-primary motion-reduce:transition-none">
                <label htmlFor={inputId} className="sr-only">
                  Tulis pesan untuk Nexa
                </label>
                <input
                  ref={inputRef}
                  id={inputId}
                  type="text"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={listening ? 'Mendengarkan…' : 'Tanya apa saja…'}
                  maxLength={500}
                  autoComplete="off"
                  enterKeyHint="send"
                  // 16px di HP agar iOS tidak memperbesar halaman saat kolom difokus
                  className="h-full min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-muted focus-visible:outline-none sm:text-[15px]"
                />
                {canListen && (
                  <button
                    type="button"
                    onClick={toggleListening}
                    aria-pressed={listening}
                    aria-label={listening ? 'Berhenti mendengarkan' : 'Bicara (isi pesan dengan suara)'}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-[background-color,color,scale] duration-200 ease-calm active:scale-90 motion-reduce:transition-none ${
                      listening ? 'bg-brand-50 text-primary motion-safe:animate-pulse' : 'text-fg hover:bg-fg/5'
                    }`}
                  >
                    <Mic className="h-5 w-5" aria-hidden />
                  </button>
                )}
              </div>
              {/* aria-disabled (bukan disabled): tombol yang sedang difokus tetap fokus setelah pesan terkirim */}
              <button
                type="submit"
                aria-label="Kirim pesan"
                aria-disabled={!canSend || undefined}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-[background-color,color,scale] duration-200 ease-calm hover:bg-primary-hover active:scale-90 aria-disabled:cursor-not-allowed aria-disabled:bg-fg/[0.045] aria-disabled:text-muted aria-disabled:active:scale-100 aria-disabled:hover:bg-fg/[0.045] motion-reduce:transition-none"
              >
                <ArrowUp className="h-5 w-5" strokeWidth={2.25} aria-hidden />
              </button>
            </form>
            <p className={`shrink-0 px-6 pb-4 text-center text-[11px] leading-snug ${micNote ? 'text-fg' : 'text-subtle'}`}>
              {micNote || 'Nexa AI bisa keliru. Pastikan detail penting di halaman terkait.'}
            </p>
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
        onMouseEnter={() => setGreetingLauncher(true)}
        onMouseLeave={() => setGreetingLauncher(false)}
        onFocus={() => setGreetingLauncher(true)}
        onBlur={() => setGreetingLauncher(false)}
        // Hanya gambar maskot, tanpa latar & garis (pemilik 2026-10-24); juga saat panel terbuka (tutup = klik lagi)
        className="group relative flex h-12 w-12 items-center justify-center rounded-full transition-[translate] duration-300 ease-calm motion-safe:hover:-translate-y-0.5 sm:h-14 sm:w-14"
      >
        {!open && (
          <span className="pointer-events-none absolute bottom-full right-0 mb-3 hidden whitespace-nowrap rounded-full bg-surface px-3.5 py-2 text-[13px] font-semibold text-fg opacity-0 shadow-float ring-1 ring-inset ring-line transition-opacity group-hover:opacity-100 sm:block">
            Tanya Nexa
          </span>
        )}
        <NexaAvatar className="h-12 w-12 sm:h-14 sm:w-14" sizes="(min-width: 640px) 56px, 48px" mood={greetingLauncher ? 'ceria' : 'netral'} />
        {/* Lencana "AI": lingkaran hitam kecil, teks putih, tanpa garis, di kiri agak ke bawah (pemilik 2026-10-24) */}
        {!open && (
          <span
            className="absolute -left-0.5 top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-black text-[8px] font-bold leading-none text-white sm:top-2 sm:h-5 sm:w-5 sm:text-[9px]"
            aria-hidden
          >
            AI
          </span>
        )}
      </button>
    </>
  );
};

/** Baris pesan Nexa: maskot berekspresi (hanya gambar, tanpa latar & garis) di kiri bawah, sejajar dasar gelembung. */
const NexaRow: React.FC<{ id?: number; mood?: NexaMood; children: React.ReactNode }> = ({ id, mood, children }) => (
  <div
    className="flex items-end gap-3 transition-[opacity,translate] duration-300 ease-calm starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none"
    data-message-id={id}
  >
    <NexaAvatar className="h-10 w-10 shrink-0" sizes="40px" mood={mood} />
    <div className="min-w-0 max-w-[85%]">{children}</div>
  </div>
);

/** Gelembung pesan: Nexa kiri (abu, avatar berekspresi `mood`), pengunjung kanan (biru muda). `id` = data-message-id. */
const Bubble: React.FC<{ from: 'nexa' | 'user'; id?: number; mood?: NexaMood; children: React.ReactNode }> = ({ from, id, mood, children }) => {
  const label = <span className="sr-only">{from === 'user' ? 'Anda: ' : 'Nexa: '}</span>;
  if (from === 'user') {
    return (
      <div
        className="flex justify-end pl-10 transition-[opacity,translate] duration-300 ease-calm starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none"
        data-message-id={id}
      >
        <div className="max-w-[85%] whitespace-pre-line break-words rounded-[22px] bg-brand-50 px-5 py-3.5 text-[15px] leading-relaxed text-primary">
          {label}
          {children}
        </div>
      </div>
    );
  }
  return (
    <NexaRow id={id} mood={mood}>
      <div className="whitespace-pre-line break-words rounded-[22px] bg-fg/[0.045] px-5 py-3.5 text-[15px] leading-relaxed text-fg">
        {label}
        {children}
      </div>
    </NexaRow>
  );
};

export default NexaChat;
