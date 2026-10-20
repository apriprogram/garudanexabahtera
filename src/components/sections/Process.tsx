import React, { useId, useRef, useState } from 'react';
import { ArrowRight, LayoutTemplate, MessageCircle, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Reveal } from '../ui/Reveal';
import { LogoBadge } from '../ui/LogoMark';
import { SectionHeading } from '../ui/SectionHeading';
import { SmartLink } from '../layout/SmartLink';
import { getHiddenSections, useSiteSettings } from '../../hooks/useSiteSettings';
import {
  AfterPaymentArt, BuildArt, ConsultArt, OrderFormArt, PaymentArt, PickTemplateArt, ProposalArt, ReleaseArt,
} from './process/ProcessVisuals';

const FLOWS = [
  { key: 'template', icon: LayoutTemplate, tab: 'Template siap pakai', short: 'Template', note: '6 langkah, dari memilih desain sampai kelola sendiri.' },
  { key: 'custom', icon: Smartphone, tab: 'Website & aplikasi custom', short: 'Custom', note: '4 langkah, dari konsultasi sampai rilis.' },
] as const;

/** Kepala kartu langkah: judul besar + nomor mono + deskripsi singkat (pola StepsBento CPNS). */
const StepHead: React.FC<{ n: string; title: string; children: React.ReactNode }> = ({ n, title, children }) => (
  <div className="px-5 pt-5 sm:px-7 sm:pt-7 xl:px-8 xl:pt-8">
    <div className="flex items-start justify-between gap-4">
      <h3 className="text-xl font-semibold leading-tight tracking-[-0.025em] text-fg sm:text-[28px] sm:tracking-[-0.03em] xl:text-[32px]">
        {title}
      </h3>
      <span className="mt-1 font-mono text-sm font-semibold text-subtle sm:mt-2">{n}</span>
    </div>
    <p className="mt-2 max-w-[320px] text-sm leading-relaxed text-muted sm:text-[15px]">{children}</p>
  </div>
);

/** Kepala kartu tinggi: bilah alamat + chip "Langkah n" + judul di tengah. */
const TallHead: React.FC<{ n: number; path: string; title: string; children: React.ReactNode }> = ({ n, path, title, children }) => (
  <>
    <div className="mx-3 mt-3 flex h-10 items-center justify-between rounded-full bg-alt pl-1.5 pr-4 sm:h-11 sm:pl-2" aria-hidden>
      <span className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-fg sm:text-sm">
        <LogoBadge className="h-7 w-7" />
        <span className="truncate">
          garudanexa.com<span className="font-medium text-subtle">{path}</span>
        </span>
      </span>
      <span className="flex shrink-0 gap-1">
        <span className="h-2 w-2 rounded-full bg-line-strong" />
        <span className="h-2 w-2 rounded-full bg-line-strong" />
        <span className="h-2 w-2 rounded-full bg-line-strong" />
      </span>
    </div>
    <div className="relative z-10 flex flex-col items-center px-6 pt-6 text-center sm:px-7 sm:pt-7">
      <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-surface px-3 text-xs font-medium text-fg ring-1 ring-inset ring-line">
        Langkah
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-fg px-1 font-mono text-[10px] text-white">{n}</span>
      </span>
      <h3 className="mt-4 text-xl font-semibold leading-tight tracking-[-0.025em] text-fg sm:text-[28px] sm:tracking-[-0.03em] xl:text-[32px]">
        {title}
      </h3>
      <p className="mt-2 max-w-[320px] text-sm leading-relaxed text-muted sm:text-[15px]">{children}</p>
    </div>
  </>
);

// after: = garis tepi di ATAS ilustrasi (ilustrasi berlatar menutupi ring bawaan kartu)
const CARD =
  'card-flat relative flex h-full flex-col overflow-hidden after:pointer-events-none after:absolute after:inset-0 after:z-20 after:rounded-[inherit] after:ring-1 after:ring-inset after:ring-line';

/** Kartu lebar penutup alur (latar biru muda + glow lembut, terang). */
const WideCard: React.FC<{ eyebrow: string; title: string; text: string; actions: React.ReactNode; art: React.ReactNode }> = ({
  eyebrow,
  title,
  text,
  actions,
  art,
}) => (
  <div className="glow-brand relative flex h-full flex-col gap-6 overflow-hidden rounded-[24px] bg-brand-50/50 p-5 ring-1 ring-inset ring-brand-100 sm:p-8 lg:flex-row lg:items-center lg:gap-8 xl:p-10">
    <div className="lg:w-1/2 lg:shrink-0">
      <span className="font-mono text-xs font-semibold text-primary">{eyebrow}</span>
      <h3 className="mt-3 text-xl font-semibold leading-[1.2] tracking-[-0.025em] text-fg sm:text-[30px] sm:leading-[1.1] sm:tracking-[-0.03em] xl:text-[34px]">
        {title}
      </h3>
      <p className="mt-3 max-w-[380px] text-sm leading-relaxed text-muted sm:text-[15px]">{text}</p>
      <div className="mt-6 flex flex-wrap gap-2">{actions}</div>
    </div>
    <div className="min-w-0 flex-1">{art}</div>
  </div>
);

const TemplateBento: React.FC<{ templatesHidden: boolean }> = ({ templatesHidden }) => (
  <>
    <Reveal className="lg:col-span-4" height="100%">
      <article className={`${CARD} min-h-[320px] lg:min-h-0`}>
        <StepHead n="01" title="Pilih template">
          Lihat demonya dulu, lalu pilih desain yang paling cocok untuk bisnis Anda.
        </StepHead>
        <PickTemplateArt />
      </article>
    </Reveal>

    <Reveal delay={0.1} className="lg:col-span-4" height="100%">
      <article className={`${CARD} min-h-[320px] lg:min-h-0`}>
        <StepHead n="02" title="Isi form & domain">
          Lengkapi data pemesan dan nama domain yang Anda inginkan.
        </StepHead>
        <OrderFormArt />
      </article>
    </Reveal>

    <Reveal delay={0.2} className="md:col-span-2 lg:col-span-4 lg:row-span-2" height="100%">
      <article className={`${CARD} min-h-[560px] lg:min-h-0`}>
        <TallHead n={3} path="/pesan" title="Bayar via Midtrans">
          Virtual account, e-wallet, QRIS, atau kartu. Status pesanan berubah otomatis.
        </TallHead>
        <PaymentArt />
      </article>
    </Reveal>

    <Reveal delay={0.15} className="md:col-span-2 lg:col-span-8" height="100%">
      <WideCard
        eyebrow="Lalu · 04 – 06"
        title="Approval, domain aktif, lalu kelola sendiri."
        text="Setelah pembayaran dikonfirmasi, tim kami menyetujui pesanan dan menyiapkan domain. Begitu online, Anda mengubah isinya sendiri lewat CMS."
        actions={
          // Katalog #templates disembunyikan admin → arahkan ke konsultasi, bukan ke anchor yang tidak ada
          templatesHidden ? (
            <SmartLink href="#kontak" className="btn btn-primary group">
              <MessageCircle className="h-4 w-4" aria-hidden />
              Konsultasi Gratis
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </SmartLink>
          ) : (
            <SmartLink href="#templates" className="btn btn-primary group">
              Pilih Template
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </SmartLink>
          )
        }
        art={<AfterPaymentArt />}
      />
    </Reveal>
  </>
);

const CustomBento: React.FC = () => (
  <>
    <Reveal className="lg:col-span-4" height="100%">
      <article className={`${CARD} min-h-[320px] lg:min-h-0`}>
        <StepHead n="01" title="Konsultasi">
          Ceritakan kebutuhan Anda lewat form pesanan atau WhatsApp, gratis.
        </StepHead>
        <ConsultArt />
      </article>
    </Reveal>

    <Reveal delay={0.1} className="lg:col-span-4" height="100%">
      <article className={`${CARD} min-h-[320px] lg:min-h-0`}>
        <StepHead n="02" title="Penawaran">
          Kami kirim rancangan solusi, perkiraan waktu, dan penawaran biaya.
        </StepHead>
        <ProposalArt />
      </article>
    </Reveal>

    <Reveal delay={0.2} className="md:col-span-2 lg:col-span-4 lg:row-span-2" height="100%">
      <article className={`${CARD} min-h-[560px] lg:min-h-0`}>
        <TallHead n={3} path="/proyek-anda" title="Pengerjaan">
          Desain dan pengembangan bertahap, dengan kabar progres berkala.
        </TallHead>
        <BuildArt />
      </article>
    </Reveal>

    <Reveal delay={0.15} className="md:col-span-2 lg:col-span-8" height="100%">
      <WideCard
        eyebrow="Lalu · 04"
        title="Rilis, lalu tetap kami dampingi."
        text="Website atau aplikasi Android/iOS Anda siap dipakai, lengkap dengan pendampingan setelah rilis."
        actions={
          <>
            <Link to="/pesan-custom" className="btn btn-primary group">
              Pesan Custom
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
            <SmartLink href="#kontak" className="btn btn-outline">
              <MessageCircle className="h-4 w-4" aria-hidden />
              Konsultasi Gratis
            </SmartLink>
          </>
        }
        art={<ReleaseArt />}
      />
    </Reveal>
  </>
);

/**
 * Section "Proses" (#process) gaya StepsBento BELAJAR CPNS: dua alur (Template & Custom) yang dipilih lewat
 * kontrol segmen, masing-masing tampil sebagai bento: dua kartu langkah, satu kartu tinggi, satu kartu lebar.
 */
const Process: React.FC<{ alt?: boolean; number?: string }> = ({ alt, number = '03' }) => {
  const [flow, setFlow] = useState(0);
  const { settings } = useSiteSettings();
  const templatesHidden = getHiddenSections(settings).has('templates');
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = FLOWS[flow];

  const onTabKey = (event: React.KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? FLOWS.length - 1 : flow === 0 ? 1 : 0;
    setFlow(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section
      id="process"
      aria-labelledby="process-title"
      className={`section-screen scroll-mt-12 sm:scroll-mt-4 ${alt ? 'bg-alt' : 'bg-canvas'}`}
    >
      <div className="container-site w-full">
        <SectionHeading
          index={number}
          label="Proses"
          titleId="process-title"
          title="Cara kerja"
          accent="kami"
          description="Pilih jalurnya: template siap pakai agar cepat online, atau dibuat custom dari nol."
        />

        {/* Kontrol segmen alur */}
        <Reveal delay={0.1} className="mt-6 sm:mt-8">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <div
              role="tablist"
              aria-label="Pilih alur"
              onKeyDown={onTabKey}
              className="relative inline-grid grid-cols-2 rounded-full bg-surface p-1 ring-1 ring-inset ring-line"
            >
              <span
                aria-hidden
                className="absolute inset-y-1 left-1 rounded-full bg-primary transition-transform duration-500 ease-calm"
                style={{ width: 'calc((100% - 8px) / 2)', transform: `translateX(${flow * 100}%)` }}
              />
              {FLOWS.map((item, index) => {
                const selected = flow === index;
                return (
                  <button
                    key={item.key}
                    ref={(el) => {
                      tabRefs.current[index] = el;
                    }}
                    id={`${baseId}-tab-${item.key}`}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls={`${baseId}-panel`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setFlow(index)}
                    className={`relative z-10 inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 text-xs font-semibold transition-colors duration-300 after:absolute after:inset-x-0 after:-inset-y-1.5 sm:h-10 sm:px-5 sm:text-sm sm:after:hidden ${
                      selected ? 'text-white' : 'text-muted hover:text-fg'
                    }`}
                  >
                    <item.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
                    <span className="sm:hidden">{item.short}</span>
                    <span className="hidden sm:inline">{item.tab}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[13px] text-muted sm:text-sm" aria-live="polite">
              {current.note}
            </p>
          </div>
        </Reveal>

        <div
          // Kunci per alur: kartu dipasang ulang dan muncul lagi dengan animasi saat alur berganti
          key={current.key}
          id={`${baseId}-panel`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${current.key}`}
          className="mt-6 grid gap-4 sm:mt-8 sm:gap-5 md:grid-cols-2 lg:grid-cols-12 lg:grid-rows-[minmax(300px,auto)_minmax(300px,auto)] xl:gap-6"
        >
          {current.key === 'template' ? <TemplateBento templatesHidden={templatesHidden} /> : <CustomBento />}
        </div>
      </div>
    </section>
  );
};

export default Process;
