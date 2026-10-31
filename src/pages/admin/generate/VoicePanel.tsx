// Input suara menu Generate: mikrofon (Web Speech API, id-ID, deteksi di components/layout/nexa/speech.ts) mengisi
// kotak transkrip; selesai bicara → transkrip dirapikan Nexa AI (gen_voice_parse) dan dipetakan ke isian form. AI mati,
// tanpa kunci, gagal, atau tidak menemukan apa pun → parser lokal (voiceParser.ts). Transkrip bisa juga diketik atau
// ditempel, dan admin selalu memeriksa form sebelum menyimpan.
import { useEffect, useRef, useState } from 'react';
import { Mic, Square, WandSparkles, X } from 'lucide-react';
import { speechInputAvailable, speechRecognition, type SpeechRecognitionLike } from '../../../components/layout/nexa/speech';
import { Button, Notice, Panel, Textarea, cn } from '../../../components/admin/ui';
import { ApiError, errorMessage } from '../../../lib/api';
import { voiceParse } from './api';
import { GEN_LIMITS, type DocKind, type VoiceData } from './types';
import { parseTranscript } from './voiceParser';

const EXAMPLES: Record<DocKind, string> = {
  invoice:
    '“Nama klien Budi Santoso dari PT Maju Jaya, email budi at gmail titik com, telepon 0812 3456 7890. Item pembuatan website 1 paket harga 5 juta, item hosting 12 bulan 100 ribu per bulan. Diskon 10 persen, PPN 11 persen, jatuh tempo 14 hari.”',
  proposal:
    '“Klien Ibu Sari dari SMA Harapan Bangsa. Judul proyek website sekolah dan PPDB online. Latar belakang sekolah butuh website untuk informasi dan pendaftaran. Fitur profil sekolah, berita, galeri dan pendaftaran online. Tahapan analisis 1 minggu, desain 2 minggu, pengembangan 4 minggu. Biaya desain 2 juta, biaya pengembangan 8 juta. Berlaku sampai 30 November.”',
};

/** Pesan untuk galat input suara (kode `error` Web Speech API); null = tidak perlu diberitahukan. */
const speechErrorText = (code: string | undefined): string | null => {
  if (code === 'aborted') return null;
  if (code === 'not-allowed' || code === 'service-not-allowed') return 'Izin mikrofon ditolak. Izinkan mikrofon di browser, atau ketik transkripnya.';
  if (code === 'no-speech') return 'Suara tidak terdengar. Coba lagi lebih dekat ke mikrofon.';
  if (code === 'audio-capture') return 'Mikrofon tidak ditemukan.';
  if (code === 'network') return 'Pengenalan suara butuh koneksi internet.';
  return 'Input suara terhenti. Coba lagi, atau ketik transkripnya.';
};

export type VoiceSource = 'ai' | 'lokal';

export function VoicePanel({
  kind,
  docDate,
  today,
  onApply,
}: {
  kind: DocKind;
  /** Tanggal dokumen di form: acuan "jatuh tempo 14 hari" untuk parser lokal */
  docDate: string;
  today: string;
  onApply: (data: VoiceData, source: VoiceSource, note: string) => void;
}) {
  const [canListen] = useState(() => speechInputAvailable());
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [micNote, setMicNote] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const alive = useRef(true);
  const processRef = useRef<(text: string) => void>(() => {});

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      const recognition = recognitionRef.current;
      if (recognition) {
        recognition.onresult = null;
        recognition.abort();
      }
    };
  }, []);

  /** Rapikan transkrip: Nexa AI dulu, parser lokal bila AI tidak bisa dipakai atau tidak menemukan apa pun. */
  const process = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;
    setBusy(true);
    const local = () => parseTranscript(text, kind, today, docDate);
    try {
      const { data, provider } = await voiceParse(kind, text);
      if (!alive.current) return;
      if (Object.keys(data).length) {
        onApply(data, 'ai', `Dirapikan Nexa AI (${provider === 'gemini' ? 'Gemini' : provider === 'custom' ? 'endpoint custom' : 'Claude'}).`);
      } else {
        onApply(local(), 'lokal', 'Nexa AI tidak menemukan data; diisi parser lokal.');
      }
    } catch (err) {
      if (!alive.current) return;
      if (err instanceof ApiError && err.status === 400) {
        setMicNote(errorMessage(err));
      } else {
        const why =
          err instanceof ApiError && err.code === 'GEN_AI_OFFLINE'
            ? 'Nexa AI belum aktif (kunci AI di tab Tanya Nexa)'
            : err instanceof ApiError && err.status === 429
              ? 'batas pemakaian Nexa AI per jam tercapai'
              : 'Nexa AI tidak bisa dihubungi';
        onApply(local(), 'lokal', `${why}; diisi parser lokal.`);
      }
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  useEffect(() => {
    processRef.current = (text: string) => {
      void process(text);
    };
  });

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Recognition = speechRecognition();
    if (!Recognition) return;
    const recognition = new Recognition();
    const base = transcript.trim();
    let spoken = '';
    let cancelled = false;
    const fullText = () => `${base}${base && spoken ? ' ' : ''}${spoken}`.slice(0, GEN_LIMITS.transcript);
    setMicNote('');
    recognition.lang = 'id-ID';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event) => {
      spoken = Array.from(event.results)
        .map((result) => result[0]?.transcript.trim() ?? '')
        .filter(Boolean)
        .join(' ');
      setTranscript(fullText());
    };
    recognition.onend = () => {
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      if (!alive.current) return;
      setListening(false);
      // Selesai bicara: langsung dirapikan dan diisikan ke form
      if (!cancelled && spoken.trim() !== '') processRef.current(fullText());
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

  return (
    <Panel padding="md" className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-adm-fg">Isi dengan suara</h2>
          <p className="mt-0.5 text-[13px] leading-relaxed text-adm-muted">
            {canListen
              ? 'Klik mikrofon lalu sebutkan datanya. Setelah berhenti, Nexa AI merapikan dan mengisikannya ke form. Periksa hasilnya sebelum menyimpan.'
              : 'Ketik atau tempel teks bebas di kotak ini, lalu klik Rapikan & isi form.'}
          </p>
        </div>
        {canListen && (
          <Button
            type="button"
            variant={listening ? 'danger' : 'primary'}
            icon={listening ? <Square /> : <Mic />}
            onClick={toggleListening}
            disabled={busy}
            aria-pressed={listening}
            className="shrink-0"
          >
            {listening ? 'Berhenti' : 'Mulai bicara'}
          </Button>
        )}
      </div>

      {!canListen && (
        <Notice tone="warning" title="Input suara tidak didukung browser ini">
          Tombol mikrofon disembunyikan karena browser ini belum mendukung pengenalan suara (Web Speech API) atau mikrofon
          diblokir. Pakai Google Chrome atau Microsoft Edge terbaru di komputer/HP untuk mendikte.
        </Notice>
      )}

      <div className="relative">
        <Textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value.slice(0, GEN_LIMITS.transcript))}
          rows={3}
          placeholder={`Contoh: ${EXAMPLES[kind]}`}
          aria-label="Transkrip suara"
          className={cn('pr-10', listening && 'ring-2 ring-adm-cobalt')}
          readOnly={listening}
        />
        {transcript && !listening && (
          <button
            type="button"
            onClick={() => setTranscript('')}
            className="absolute right-2 top-2 rounded-lg p-1.5 text-adm-subtle hover:bg-adm-hover hover:text-adm-fg"
            aria-label="Kosongkan transkrip"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-adm-subtle" aria-live="polite">
          {listening ? 'Mendengarkan… klik Berhenti bila sudah selesai.' : busy ? 'Merapikan transkrip…' : micNote}
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          icon={<WandSparkles />}
          loading={busy}
          disabled={listening || !transcript.trim()}
          onClick={() => void process(transcript)}
        >
          Rapikan &amp; isi form
        </Button>
      </div>
    </Panel>
  );
}
