// Hero Sparring Padel — "Court" (data-hero-layout="court"): FOTO LATAR selebar layar (pemain padel di lapangan biru
// yang gelap, LCP) di bawah lapisan biru-malam yang pekat di kiri dan bawah. Kiri: label mono berbingkai, H1 Saira
// besar dengan satu kata miring neon, deskripsi, dua tombol pil (Lihat jadwal & harga, Cari lawan main). Kanan-belakang
// (≥ @3xl): garis lapangan padel neon dalam perspektif + lengkung bola putus-putus, digambar SEKALI (dekoratif). Dasar
// hero: bilah "Booking cepat" kaca gelap (./BookingBar) yang naik sesudah judul. HP 390: foto terlihat di atas (sekitar
// pemain), teks, lalu bilah booking bertumpuk 2 kolom — semua tetap di atas foto. Foto TIDAK pernah disembunyikan,
// dipudarkan, atau dipotong klip saat muncul.
import { useId } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { TemplateSection } from '../shared/Shell';
import { hasImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { BookingBar } from './BookingBar';
import type { SparringModel } from './model';
import { SPARRING_PHOTOS } from './photos';
import { MONO_LABEL, TYPE } from './styles';
import { ButtonLink, Highlighted } from './ui';

/**
 * Garis lapangan padel 10 × 20 m dalam perspektif (viewBox 800×520): garis belakang jauh 250–550 @ y 60, garis
 * belakang dekat 60–740 @ y 470, garis servis @ y 105 dan 330, garis tengah servis, net @ y 190 dengan dua tiang.
 * pathLength=1 → digambar dengan stroke-dashoffset (CSS .sp-court-line). Lengkung bola putus-putus + bola di ujungnya.
 */
const ARC = 'M80 250 C 200 40, 420 -10, 520 140';

function CourtLines() {
  const line = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round', pathLength: 1 } as const;
  // id topeng unik per render (useId berisi ":" yang tidak aman di url(#…))
  const maskId = `sp-arc-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <svg viewBox="0 0 800 520" className="sp-court pointer-events-none h-auto w-full" aria-hidden focusable="false">
      <defs>
        {/* Lengkung bola putus-putus "tergambar" lewat topeng garis utuh yang dashoffset-nya digeser */}
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="-40" width="800" height="560">
          <path {...line} className="sp-arc-reveal" d={ARC} stroke="#FFFFFF" strokeWidth={14} />
        </mask>
      </defs>
      <g stroke="var(--sp-neon)" strokeWidth={2} strokeOpacity={0.9}>
        <path {...line} className="sp-court-line" d="M250 60 L550 60 L740 470 L60 470 Z" />
        <path {...line} className="sp-court-line" style={{ animationDelay: '0.5s' }} d="M229 105 H571 M125 330 H675" />
        <path {...line} className="sp-court-line" style={{ animationDelay: '0.65s' }} d="M400 105 V330" />
      </g>
      <path {...line} className="sp-court-line" style={{ animationDelay: '0.8s' }} d="M190 190 H610 M190 190 V166 M610 190 V166" stroke="var(--sp-neon)" strokeWidth={2.4} />
      <path mask={`url(#${maskId})`} d={ARC} fill="none" stroke="#FFFFFF" strokeOpacity={0.8} strokeWidth={2.2} strokeDasharray="2 10" strokeLinecap="round" />
      <circle className="sp-ball" cx={520} cy={140} r={9} fill="var(--sp-neon)" />
    </svg>
  );
}

export function Hero({ m }: { m: SparringModel }) {
  const { hero } = m;
  const eyebrow = text(hero, 'eyebrow');
  const title = text(hero, 'title') || m.companyName;
  const subtitle = text(hero, 'subtitle');
  const image = text(hero, 'image');
  const primaryLabel = m.primaryAction ? text(hero, 'primary_label') : '';
  const secondaryLabel = m.secondaryAction ? text(hero, 'secondary_label') : '';
  const photo = hasImage(image);

  return (
    <TemplateSection
      sectionKey="hero"
      data-hero-layout="court"
      data-tpl-tone="inverse"
      className={`relative isolate overflow-hidden bg-(--sp-night) text-white ${photo ? '' : 'sp-hero-fallback'}`}
    >
      {/* Foto latar (LCP): eager + fetchpriority high, tanpa animasi masuk. HP memotong tegak di sekitar pemain. */}
      <KitPhoto
        src={image}
        alt={SPARRING_PHOTOS.alt(image, `Pemain padel bermain di lapangan ${m.companyName}`)}
        priority
        fallback="none"
        sizes="(max-width: 767px) 1460px, 100vw"
        className="absolute inset-0 -z-10 bg-(--sp-night)!"
        imgClassName="object-[80%_50%] @3xl:object-[66%_45%] @5xl:object-[60%_45%]"
      />
      <div aria-hidden className="sp-hero-scrim absolute inset-0 -z-10" />
      {/* Garis lapangan neon: "papan neon" di ruang gelap antara judul dan pemain (≥ 88rem; tidak menimpa pemain di foto
          demo maupun judul) */}
      <div aria-hidden className="pointer-events-none absolute left-[41%] top-[8%] hidden w-[16%] max-w-[260px] @min-[88rem]:block">
        <CourtLines />
      </div>

      <div className={`${CONTAINER} relative flex min-h-[max(640px,min(92svh,880px))] flex-col pb-5 pt-[min(52cqi,240px)] @3xl:pb-7 @3xl:pt-20 @5xl:min-h-[max(620px,min(88svh,860px))] @5xl:pt-24`}>
        <div className="relative flex flex-1 flex-col justify-center">
          <div className="relative max-w-[640px] @5xl:max-w-[54%] @7xl:max-w-[720px]">
            {eyebrow && (
              <Reveal
                as="p"
                className={`inline-flex min-h-8 max-w-full items-center gap-2 rounded-[10px] bg-[color-mix(in_srgb,var(--sp-night)_70%,transparent)] px-3 py-1 ${MONO_LABEL} text-[11px] text-white ring-1 ring-inset ring-white/20 backdrop-blur-md @3xl:text-[12px]`}
              >
                <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-(--sp-neon)" />
                <span className="min-w-0 text-balance">{eyebrow}</span>
              </Reveal>
            )}
            <Reveal as="h1" delay={80} className={`${eyebrow ? 'mt-5 @3xl:mt-6' : ''} max-w-[15ch] ${TYPE.h1} text-white`}>
              <Highlighted title={title} highlight={text(hero, 'highlight')} tone="dark" />
            </Reveal>
            {subtitle && (
              <Reveal as="p" delay={160} className={`mt-5 max-w-[44ch] text-pretty text-white/85 ${TYPE.lead}`}>
                {subtitle}
              </Reveal>
            )}
            {(primaryLabel || secondaryLabel) && (
              <Reveal delay={240} className="mt-7 flex flex-col gap-3 @xl:flex-row @xl:flex-wrap @xl:items-center">
                <ButtonLink action={m.primaryAction} label={primaryLabel} variant="white" className="w-full @xl:w-auto" />
                <ButtonLink action={m.secondaryAction} label={secondaryLabel} variant="ghost" arrow={false} className="w-full @xl:w-auto" />
              </Reveal>
            )}
          </div>
        </div>

        <div className="sp-rise relative mt-8 @3xl:mt-10">
          <BookingBar m={m} />
        </div>
      </div>
    </TemplateSection>
  );
}
