import React from 'react';
import {
  ArrowRight, Check, CheckCircle2, FileText, Globe2, LayoutTemplate, Loader2, MessageCircle, PenLine, ShieldCheck, Smartphone,
} from 'lucide-react';
import { LogoMark } from '../../ui/LogoMark';

// Ilustrasi kartu bento section Proses. Murni dekoratif (aria-hidden), datar: garis tipis, tanpa shadow.

/** Panel latar ilustrasi: biru muda lembut + pola titik. */
const Panel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div
    className={`relative mx-3 mb-3 mt-5 min-h-[170px] flex-1 overflow-hidden rounded-[20px] bg-gradient-to-br from-brand-50 via-brand-50/60 to-surface ring-1 ring-inset ring-brand-100/70 ${className}`}
    aria-hidden
  >
    <div className="absolute inset-0 opacity-70 [background-image:radial-gradient(var(--color-brand-100)_1px,transparent_1px)] [background-size:16px_16px]" />
    {children}
  </div>
);

/** Pil kecil ber-ikon (di atas panel). */
const Pill: React.FC<{ icon?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ icon, children, className = '' }) => (
  <span
    className={`inline-flex h-8 items-center gap-1.5 rounded-full bg-surface/85 px-3 text-xs font-medium text-fg ring-1 ring-inset ring-line backdrop-blur sm:h-9 sm:text-[13px] [&>svg]:h-3.5 [&>svg]:w-3.5 ${className}`}
  >
    {icon}
    {children}
  </span>
);

/* ===================== Alur template ===================== */

/** 01 · Pilih template: dua pratinjau template miring + ajakan lihat demo. */
export const PickTemplateArt: React.FC = () => (
  <Panel>
    <img
      src="/assets/templates/startup-clean-preview.svg"
      alt=""
      loading="lazy"
      className="absolute right-[-8%] top-6 w-[62%] max-w-[280px] rotate-[4deg] rounded-xl bg-surface opacity-80 ring-1 ring-line"
    />
    <img
      src="/assets/templates/corporate-nexa-preview.svg"
      alt=""
      loading="lazy"
      className="absolute left-4 top-4 w-[66%] max-w-[300px] -rotate-[2deg] rounded-xl bg-surface ring-1 ring-line sm:left-5"
    />
    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-brand-50 via-brand-50/70 to-transparent" />
    <div className="absolute bottom-3 right-3 flex items-center gap-2">
      <Pill icon={<LayoutTemplate />}>Lihat demo</Pill>
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-fg text-white sm:h-10 sm:w-10">
        <ArrowRight className="h-4 w-4" />
      </span>
    </div>
  </Panel>
);

const MockField: React.FC<{ label: string; value: string; ok?: boolean }> = ({ label, value, ok }) => (
  <div className="rounded-xl bg-surface px-3 py-2 ring-1 ring-inset ring-line">
    <span className="block text-[10px] font-medium uppercase tracking-[0.08em] text-subtle sm:text-[11px]">{label}</span>
    <span className="mt-0.5 flex items-center justify-between gap-2">
      <span className="truncate text-[13px] font-semibold text-fg sm:text-sm">{value}</span>
      {ok && (
        <span className="inline-flex h-5 shrink-0 items-center gap-1 rounded-full bg-success-50 px-2 text-[10px] font-semibold text-success-700 sm:text-[11px]">
          <Check className="h-3 w-3" strokeWidth={3} />
          Tersedia
        </span>
      )}
    </span>
  </div>
);

/** 02 · Isi form & domain: formulir mini dengan domain tersedia. */
export const OrderFormArt: React.FC = () => (
  <Panel className="flex flex-col justify-end">
    <div className="relative space-y-2 p-3 sm:p-4">
      <MockField label="Nama domain" value="bisnisanda.com" ok />
      <MockField label="Domain alternatif" value="bisnisanda.id" />
      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted sm:text-xs">
          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          Data pemesan lengkap
        </span>
        <span className="inline-flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-primary px-3 text-[11px] font-semibold text-white sm:text-xs">
          Lanjut bayar
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  </Panel>
);

/** Latar bawah kartu tinggi: gradasi biru muda (terang, tanpa blok gelap). */
const LightGlow: React.FC = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
    <div className="absolute inset-0 bg-gradient-to-b from-surface via-brand-50 to-brand-100" />
    <div className="absolute -bottom-24 left-1/2 h-56 w-[120%] -translate-x-1/2 rounded-[100%] bg-brand-200/60 blur-3xl" />
    <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-surface to-transparent" />
  </div>
);

/** 03 · Bayar via Midtrans: halaman bayar mini (sedikit miring) + notifikasi lunas. */
export const PaymentArt: React.FC = () => (
  <div className="relative mt-6 min-h-[350px] flex-1" aria-hidden>
    <LightGlow />
    <div className="absolute inset-x-5 top-4 sm:inset-x-7 lg:inset-x-5 xl:inset-x-7" style={{ perspective: '1400px' }}>
      <div className="origin-top rounded-[20px] bg-surface p-4 ring-1 ring-inset ring-line [transform:rotateX(6deg)] sm:p-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-subtle">Ringkasan pesanan</span>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-subtle">
            <ShieldCheck className="h-3.5 w-3.5 text-success" />
            Midtrans
          </span>
        </div>
        <p className="mt-1 text-base font-semibold tracking-tight text-fg sm:text-lg">Template Company Profile</p>
        <p className="text-xs text-subtle">Domain: bisnisanda.com</p>
        <div className="mt-3 space-y-1.5">
          {[
            { name: 'QRIS', on: true },
            { name: 'Virtual Account', on: false },
            { name: 'E-wallet', on: false },
          ].map((method) => (
            <div
              key={method.name}
              className={`flex h-9 items-center justify-between rounded-xl px-3 text-[13px] font-medium ring-1 ring-inset ${
                method.on ? 'bg-brand-50 text-fg ring-brand-200' : 'bg-surface text-muted ring-line'
              }`}
            >
              {method.name}
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full ring-1 ring-inset ${method.on ? 'bg-primary ring-primary' : 'ring-line-strong'}`}
              >
                {method.on && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
            </div>
          ))}
        </div>
        <span className="mt-3 flex h-10 items-center justify-center rounded-full bg-primary text-[13px] font-semibold text-white">Bayar sekarang</span>
      </div>
    </div>
    <span className="absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-surface px-4 py-2 text-[13px] font-semibold text-fg ring-1 ring-inset ring-line">
      <CheckCircle2 className="h-4 w-4 text-success" />
      Pembayaran berhasil
    </span>
  </div>
);

/** 04-06 · Approval → domain aktif → CMS: tiga langkah ringkas bersambung. */
export const AfterPaymentArt: React.FC = () => (
  <ol className="relative grid gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-1" aria-label="Langkah 4 sampai 6">
    {[
      { n: '04', icon: CheckCircle2, title: 'Approval', text: 'Tim kami memeriksa pesanan & pembayaran.' },
      { n: '05', icon: Globe2, title: 'Domain aktif', text: 'Domain disiapkan sampai website online.' },
      { n: '06', icon: PenLine, title: 'Kelola via CMS', text: 'Ubah teks, gambar & kontak sendiri.' },
    ].map(({ n, icon: Icon, title, text }) => (
      <li key={n} className="flex items-start gap-3 rounded-[18px] bg-surface p-3.5 ring-1 ring-inset ring-line sm:flex-col sm:p-4 lg:flex-row lg:items-center">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-primary">
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="font-mono text-[11px] font-semibold text-subtle">{n}</span>
          <span className="mt-0.5 block text-[15px] font-semibold leading-snug text-fg sm:text-base">{title}</span>
          <span className="mt-0.5 block text-[13px] leading-relaxed text-muted sm:text-sm">{text}</span>
        </span>
      </li>
    ))}
  </ol>
);

/* ===================== Alur custom ===================== */

/** 01 · Konsultasi: dua gelembung chat. */
export const ConsultArt: React.FC = () => (
  <Panel className="flex flex-col justify-end">
    <div className="relative space-y-2 p-3 sm:p-4">
      <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-[12px] font-medium leading-snug text-white sm:text-[13px]">
        Saya butuh aplikasi kasir Android + website toko.
      </p>
      <div className="flex items-end gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white">
          <LogoMark className="h-2.5" />
        </span>
        <p className="w-fit max-w-[80%] rounded-2xl rounded-bl-md bg-surface px-3.5 py-2 text-[12px] leading-snug text-fg ring-1 ring-inset ring-line sm:text-[13px]">
          Siap! Kami jadwalkan konsultasi gratis untuk Anda.
        </p>
      </div>
      <div className="flex gap-2 pt-1">
        <Pill icon={<MessageCircle />}>WhatsApp</Pill>
        <Pill icon={<FileText />}>Form pesanan</Pill>
      </div>
    </div>
  </Panel>
);

/** 02 · Penawaran: dokumen ringkas dengan poin tercentang. */
export const ProposalArt: React.FC = () => (
  <Panel className="flex flex-col">
    <div className="relative flex flex-1 flex-col justify-between gap-3 p-3 sm:p-4">
      <div className="rounded-2xl bg-surface p-3.5 ring-1 ring-inset ring-line sm:p-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-primary">
            <FileText className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold text-fg">Penawaran proyek</span>
            <span className="block truncate text-[11px] text-subtle">Disusun sesuai kebutuhan Anda</span>
          </span>
        </div>
        <ul className="mt-3 grid gap-1.5">
          {['Rancangan solusi', 'Perkiraan waktu', 'Rincian biaya'].map((row) => (
            <li key={row} className="flex items-center gap-2 text-[12px] text-muted sm:text-[13px]">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
              </span>
              {row}
            </li>
          ))}
        </ul>
      </div>
      <Pill icon={<CheckCircle2 className="text-success" />} className="self-end">
        Dikirim ke email Anda
      </Pill>
    </div>
  </Panel>
);

/** 03 · Pengerjaan: papan progres bertahap. */
export const BuildArt: React.FC = () => (
  <div className="relative mt-6 min-h-[300px] flex-1" aria-hidden>
    <LightGlow />
    <div className="absolute inset-x-5 top-4 sm:inset-x-7 lg:inset-x-5 xl:inset-x-7" style={{ perspective: '1400px' }}>
      <div className="origin-top rounded-[20px] bg-surface p-4 ring-1 ring-inset ring-line [transform:rotateX(6deg)] sm:p-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-subtle">Progres proyek</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-primary">
            <Loader2 className="h-3 w-3" />
            Berjalan
          </span>
        </div>
        <div className="mt-3 space-y-3">
          {[
            { name: 'Desain UI', pct: 100 },
            { name: 'Pengembangan', pct: 64 },
            { name: 'Uji coba', pct: 20 },
          ].map((task) => (
            <div key={task.name}>
              <div className="flex items-center justify-between text-[12px] sm:text-[13px]">
                <span className="font-medium text-fg">{task.name}</span>
                <span className="font-mono tabular-nums text-subtle">{task.pct}%</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-alt">
                <div className={`h-full rounded-full ${task.pct === 100 ? 'bg-success' : 'bg-primary'}`} style={{ width: `${task.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    <span className="absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-surface px-4 py-2 text-[13px] font-semibold text-fg ring-1 ring-inset ring-line">
      <MessageCircle className="h-4 w-4 text-primary" />
      Kabar progres berkala
    </span>
  </div>
);

/** 04 · Rilis: platform yang siap dipakai. */
export const ReleaseArt: React.FC = () => (
  <ul className="grid grid-cols-3 gap-2.5 sm:gap-3" aria-label="Platform rilis">
    {[
      { icon: Globe2, name: 'Website' },
      { icon: Smartphone, name: 'Android' },
      { icon: Smartphone, name: 'iOS' },
    ].map(({ icon: Icon, name }) => (
      <li key={name} className="flex flex-col items-center gap-2 rounded-[18px] bg-surface px-2 py-4 text-center ring-1 ring-inset ring-line sm:py-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-primary sm:h-11 sm:w-11">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <span className="text-[13px] font-semibold text-fg sm:text-sm">{name}</span>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success-700">
          <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
          Siap rilis
        </span>
      </li>
    ))}
  </ul>
);
