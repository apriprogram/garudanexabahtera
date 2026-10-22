// Hero Finova — "panel gelap" (brief §4.3, data-hero-layout="panel"): SELURUH hero = satu panel hijau hutan gelap
// radius 32 di dalam gutter halaman (kisi 64px bermasker + cahaya limau lembut di belakang foto). Menu (./Header)
// menumpang di bagian atas panel. Kiri: chip, H1 dua baris (sorotan berwarna tombol), lead, tombol limau + chip panah;
// kanan: FOTO asli (tangan + ponsel/kartu) radius 24 dengan kartu saldo + chip transaksi melayang menumpang tepinya.
// Baris bawah DI DALAM panel: avatar pengguna bertumpuk + angka bukti sosial; kanan: strip logo mitra putih (section
// `clients`, ≥ @5xl). HP: panel tetap gelap radius 24, H1 → tombol penuh lebar → foto 4:5 dengan SATU kartu saldo →
// bukti sosial; strip mitra = marquee tepat di bawah panel.
import { ArrowDownLeft, ArrowUpRight, ReceiptText } from 'lucide-react';
import type { ReactNode } from 'react';
import { Marquee, Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, list, resolveAction, splitHighlight, text } from '../shared/utils';
import { KitAvatar, KitPhoto } from '../kit/Photo';
import { PANEL_X } from './Header';
import { LineChart } from './marks';
import type { FinovaModel } from './model';
import { FINOVA_PHOTOS } from './photos';
import { BTN, C, CARD, TYPE_F } from './styles';
import { PartnerLogo, PillLink, SectionChip } from './ui';

const CHIP_ICONS = [ReceiptText, ArrowDownLeft, ArrowUpRight];
/** Tinggi baris bawah panel (bukti sosial | mitra) di desktop: strip mitra menumpang tepat di baris ini. */
const BOTTOM_ROW = '@5xl:h-[128px]';

function BalanceCard({ m, className = '' }: { m: FinovaModel; className?: string }) {
  const label = text(m.hero, 'balance_label');
  const value = text(m.hero, 'balance_value');
  const caption = text(m.hero, 'balance_caption');
  if (!label && !value) return null;
  return (
    <div className={`${CARD.ui} p-4 text-[#0B0F0E] @3xl:p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {label && <p className={`truncate text-[12px] font-medium ${C.muted}`}>{label}</p>}
          {value && <p className={`mt-1 truncate text-[20px] font-semibold @7xl:text-[22px] ${TYPE_F.mono}`}>{value}</p>}
        </div>
        <span aria-hidden className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--fin-hl) text-(--fin-on-hl)">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>
      <LineChart className="mt-3 h-10 w-full" />
      {caption && (
        <p className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-(--tpl-accent-ink)">
          <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-(--tpl-accent)" />
          <span className="truncate">{caption}</span>
        </p>
      )}
    </div>
  );
}

function TxChip({ label, value, index }: { label: string; value: string; index: number }) {
  const Icon = CHIP_ICONS[index % CHIP_ICONS.length];
  return (
    <div className={`${CARD.ui} flex items-center gap-3 py-2.5 pl-2.5 pr-4 text-[#0B0F0E]`}>
      <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-(--fin-mint) text-(--tpl-accent-ink)">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        {label && <span className={`block truncate text-[12px] ${C.muted}`}>{label}</span>}
        {value && <span className={`block truncate text-[14px] font-semibold ${TYPE_F.mono}`}>{value}</span>}
      </span>
    </div>
  );
}

function Proof({ m }: { m: FinovaModel }) {
  const value = text(m.hero, 'proof_value');
  const proofText = text(m.hero, 'proof_text');
  const people = m.proofPeople;
  if (!value && !proofText && people.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      {people.length > 0 && (
        <ul className="flex shrink-0 -space-x-3" aria-label="Pengguna kami">
          {people.map((person, i) => (
            <Reveal as="li" key={`${person.photo}-${i}`} variant="fade" delay={360 + stagger(i, 90)} className="relative">
              <KitAvatar name={person.name} photo={person.photo} sizes="44px" className="h-10 w-10 object-[50%_22%] ring-2 ring-(--fin-top) @3xl:h-11 @3xl:w-11" />
              {person.name && <span className="sr-only">{person.name}</span>}
            </Reveal>
          ))}
        </ul>
      )}
      {(value || proofText) && (
        <div className="flex min-w-0 items-center gap-4">
          {value && <p className="shrink-0 text-[30px] font-medium leading-none tracking-[-0.05em] text-white @3xl:text-[36px]">{value}</p>}
          {proofText && <p className={`max-w-[28ch] text-[13px] leading-snug @3xl:text-[14px] ${C.onDark}`}>{proofText}</p>}
        </div>
      )}
    </div>
  );
}

/**
 * Strip mitra (section `clients`). `inPanel`: di bawah @5xl tampil di bawah panel (latar putih, logo tinta,
 * marquee), mulai @5xl menumpang baris bawah panel (logo putih). Tanpa hero → strip biasa di latar putih.
 */
export function Partners({ m, inPanel, className = '' }: { m: FinovaModel; inPanel: boolean; className?: string }) {
  const items = list(m.clients, 'items', 12).filter((item) => field(item, 'name') || field(item, 'logo'));
  const title = text(m.clients, 'title');
  if (items.length === 0) return null;
  const logos = items.map((item, i) => (
    <PartnerLogo key={`${field(item, 'name')}-${i}`} name={field(item, 'name')} logo={field(item, 'logo')} onDarkFrom5xl={inPanel} />
  ));
  return (
    <TemplateSection
      sectionKey="clients"
      aria-label={title || 'Mitra kami'}
      className={`relative z-10 min-w-0 ${inPanel ? `${BOTTOM_ROW} @5xl:flex @5xl:flex-col @5xl:justify-center` : ''} ${className}`}
    >
      {title && (
        <p
          className={`text-center text-[13px] font-medium ${C.muted} ${inPanel ? '@5xl:text-left @5xl:text-[#B9C6C1]' : ''}`}
        >
          {title}
        </p>
      )}
      <Marquee
        label={title || 'Mitra kami'}
        duration={36}
        gap={44}
        className={title ? 'mt-4 @5xl:mt-3' : ''}
        staticClassName={`flex flex-wrap items-center justify-center gap-x-9 gap-y-4 ${inPanel ? '@5xl:grid @5xl:grid-cols-3 @5xl:justify-items-start @5xl:gap-x-6 @5xl:gap-y-3' : ''}`}
      >
        {logos}
      </Marquee>
    </TemplateSection>
  );
}

function Title({ m }: { m: FinovaModel }) {
  const title = text(m.hero, 'title') || m.companyName;
  const parts = splitHighlight(title, text(m.hero, 'highlight'));
  let content: ReactNode = title;
  if (parts) {
    content = (
      <>
        {parts[0]}
        <span className="text-(--fin-hl)">{parts[1]}</span>
        {parts[2]}
      </>
    );
  }
  return content;
}

export function Hero({ m, partners }: { m: FinovaModel; partners: boolean }) {
  const { hero } = m;
  const eyebrow = text(hero, 'eyebrow');
  const subtitle = text(hero, 'subtitle');
  const image = text(hero, 'image');
  const primary = resolveAction(text(hero, 'primary_url'), m.startAction);
  const secondary = resolveAction(text(hero, 'secondary_url'), m.featuresAction);
  const primaryLabel = text(hero, 'primary_label');
  const secondaryLabel = text(hero, 'secondary_label');
  const chips = list(hero, 'chips', 3).filter((chip) => field(chip, 'label') || field(chip, 'value'));
  const hasProof = !!(text(hero, 'proof_value') || text(hero, 'proof_text') || m.proofPeople.length > 0);

  return (
    <TemplateSection sectionKey="hero" data-hero-layout="panel" className="pt-3 @3xl:pt-4">
      <div className={CONTAINER}>
        <div className="grid">
          <div
            data-tpl-tone="inverse"
            className={`fin-panel relative isolate col-start-1 row-start-1 overflow-hidden rounded-[24px] text-white @3xl:rounded-[32px] ${partners ? '@5xl:row-end-3' : ''}`}
          >
            <div aria-hidden className="fin-grid absolute inset-0 -z-10" />
            {/* Cahaya limau di belakang foto (bukan di belakang teks) */}
            <div aria-hidden className="fin-glow absolute -z-10 bottom-[20%] right-[-20%] h-[40%] w-[90%] @4xl:bottom-auto @4xl:right-[2%] @4xl:top-[8%] @4xl:h-[64%] @4xl:w-[44%]" />

            <div className={`${PANEL_X} pt-[92px] @3xl:pt-[108px] @5xl:pt-[112px]`}>
              <div className="grid gap-12 @4xl:grid-cols-12 @4xl:items-center @4xl:gap-8">
                <div className="min-w-0 @4xl:col-span-7">
                  {eyebrow && (
                    <Reveal variant="fade">
                      <SectionChip tone="dark" wrap>{eyebrow}</SectionChip>
                    </Reveal>
                  )}
                  <Reveal as="h1" delay={80} className={`${eyebrow ? 'mt-6' : ''} max-w-[17ch] text-balance text-white ${TYPE_F.h1}`}>
                    <Title m={m} />
                  </Reveal>
                  {subtitle && (
                    <Reveal as="p" delay={160} className={`mt-6 max-w-[46ch] text-pretty ${TYPE_F.lead} ${C.onDark}`}>
                      {subtitle}
                    </Reveal>
                  )}
                  {((primary && primaryLabel) || (secondary && secondaryLabel)) && (
                    <Reveal delay={240} className="mt-9 flex flex-col gap-3 @xl:flex-row @xl:items-center">
                      <PillLink action={primary} label={primaryLabel} chip="ink" className={`${BTN.lime} ${BTN.lg} justify-between @xl:justify-center`} />
                      <PillLink action={secondary} label={secondaryLabel} chip={null} className={`${BTN.ghostDark} ${BTN.plainLg}`} />
                    </Reveal>
                  )}
                </div>

                <div className="relative mx-auto w-full max-w-[420px] pb-12 @4xl:col-span-5 @4xl:mr-6 @4xl:max-w-[400px] @4xl:pb-0 @7xl:max-w-[440px]">
                  <Reveal variant="left" delay={200}>
                    <KitPhoto
                      src={image}
                      alt={FINOVA_PHOTOS.alt(image, `Ilustrasi layanan ${m.companyName}`)}
                      priority
                      fallback="tint"
                      sizes="(min-width: 1280px) 440px, (min-width: 896px) 36vw, 92vw"
                      className="aspect-[4/5] rounded-[20px] ring-1 ring-white/10 @3xl:rounded-[24px]"
                    />
                  </Reveal>
                  {/* Kartu saldo: HP menumpang tepi bawah foto; desktop menumpang tepi kiri */}
                  <Reveal
                    delay={320}
                    className="absolute inset-x-4 bottom-0 @xl:inset-x-auto @xl:left-6 @xl:w-[270px] @4xl:-left-6 @4xl:bottom-[10%] @4xl:w-[250px] @6xl:-left-14 @6xl:w-[250px] @7xl:-left-24 @7xl:bottom-[14%] @7xl:w-[270px]"
                  >
                    <BalanceCard m={m} />
                  </Reveal>
                  {chips.length > 0 && (
                    <ul aria-label="Transaksi terbaru" className="absolute -right-6 top-[9%] hidden flex-col items-end gap-3 @4xl:flex @7xl:-right-10">
                      {chips.map((chip, i) => (
                        <Reveal as="li" key={`${field(chip, 'label')}-${i}`} variant="right" delay={400 + i * 80} className={i === 1 ? 'mr-8' : ''}>
                          <TxChip label={field(chip, 'label')} value={field(chip, 'value')} index={i} />
                        </Reveal>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {(hasProof || partners) && (
                <div
                  className={`mt-10 items-center border-t border-white/10 py-6 @3xl:mt-14 @5xl:py-0 ${BOTTOM_ROW} ${partners ? '@5xl:pr-[56%]' : ''} ${
                    hasProof ? 'flex' : 'hidden @5xl:flex'
                  }`}
                >
                  <Reveal delay={320} variant="fade" className="min-w-0">
                    <Proof m={m} />
                  </Reveal>
                </div>
              )}
              {!hasProof && !partners && <div className="h-10 @3xl:h-14" />}
            </div>
          </div>

          {partners && (
            <Partners
              m={m}
              inPanel
              className={`col-start-1 row-start-2 mt-8 @5xl:mt-0 @5xl:w-[54%] @5xl:justify-self-end @5xl:border-l @5xl:border-white/10 @5xl:pl-10 @5xl:pr-12 @5xl:self-end`}
            />
          )}
        </div>
      </div>
    </TemplateSection>
  );
}
