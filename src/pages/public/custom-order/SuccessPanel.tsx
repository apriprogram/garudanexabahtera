// Layar sukses setelah kebutuhan custom terkirim: nomor referensi (bisa disalin) dan tindak lanjut WhatsApp.
// Tanpa ajakan membuat akun: permintaan custom belum tersimpan di akun dan nomor referensi tidak dikirim lewat email,
// jadi panel ini tidak menjanjikan pemantauan status.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, CircleCheck, Copy, RotateCcw } from 'lucide-react';
import { whatsappUrl } from '../../../hooks/useSiteSettings';
import { WhatsAppIcon } from './WhatsAppIcon';
import type { CustomOrderResult } from './CustomOrderForm';

interface SuccessPanelProps {
  result: CustomOrderResult;
  whatsappNumber: string;
  onReset: () => void;
}

export function SuccessPanel({ result, whatsappNumber, onReset }: SuccessPanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle');
  const service = result.serviceType === 'mobile_app' ? 'aplikasi mobile' : 'website';
  // Pesan WhatsApp hanya berisi nomor referensi & jenis layanan (tanpa data pribadi)
  const waHref = whatsappUrl(
    whatsappNumber,
    `Halo Garuda Nexa, saya baru mengirim kebutuhan ${service} custom lewat website dengan nomor referensi ${result.reference}. Saya ingin melanjutkan diskusinya.`,
  );

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    if (copied === 'idle') return;
    const timer = window.setTimeout(() => setCopied('idle'), 2500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.reference);
      setCopied('copied');
    } catch {
      setCopied('failed');
    }
  };

  return (
    <div className="text-center sm:text-left">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-50 sm:mx-0" aria-hidden>
        <CircleCheck className="h-7 w-7 text-success" />
      </span>
      <h2 ref={headingRef} tabIndex={-1} className="mt-5 text-xl font-semibold tracking-[-0.01em] text-fg outline-none sm:text-2xl">
        Kebutuhan Anda sudah kami terima
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted sm:text-[15px]">
        Tim kami akan meninjau kebutuhan {service} Anda, lalu menghubungi Anda lewat WhatsApp atau email pada jam kerja untuk berdiskusi dan
        mengirim penawaran harga serta jadwal.
      </p>

      <div className="mt-6 rounded-2xl bg-alt p-4 ring-1 ring-inset ring-line sm:p-5">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-subtle">Nomor referensi</p>
        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-3 sm:justify-between">
          <p className="font-mono text-2xl font-semibold tabular-nums tracking-wide text-fg">{result.reference}</p>
          <button type="button" onClick={copy} className="btn btn-outline btn-sm">
            {copied === 'copied' ? <Check className="h-4 w-4 text-success" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
            {copied === 'copied' ? 'Tersalin' : 'Salin'}
          </button>
        </div>
        <p className="mt-2 text-xs text-subtle" aria-live="polite">
          {copied === 'failed'
            ? 'Gagal menyalin otomatis. Catat nomor di atas secara manual.'
            : 'Simpan nomor ini (mis. dengan screenshot) dan sebutkan saat menghubungi kami.'}
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {/* Aksi utama = biru brand (satu aksen, kontras 7:1); hijau WhatsApp hanya untuk ikon di tempat lain */}
        <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg">
          <WhatsAppIcon className="h-5 w-5 max-sm:h-4 max-sm:w-4" />
          Lanjutkan via WhatsApp
        </a>
        <Link to="/" className="btn btn-outline btn-lg">
          Kembali ke beranda
        </Link>
      </div>

      <button type="button" onClick={onReset} className="btn btn-ghost btn-sm mt-3">
        <RotateCcw className="h-4 w-4" aria-hidden />
        Kirim kebutuhan lain
      </button>
    </div>
  );
}
