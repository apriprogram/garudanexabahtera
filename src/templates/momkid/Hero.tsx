// Hero MomKid — "Cradle" (data-hero-layout="cradle"): foto ibu & bayi menjadi LATAR hero selebar layar, tepi bawahnya
// melengkung (gelombang SVG berwarna section berikutnya). Layar lebar (≥ @5xl): foto mengisi seluruh hero, lapisan
// peach lembut dari kiri (≥ 92% di bawah teks, memudar ke 0 di 70%) sehingga tinta ≥ 7:1 di atasnya; teks di kolom kiri
// (label pil, H1, deskripsi, dua tombol pil, catatan kecil); 2–3 chip pastel melayang di atas foto di kanan. HP &
// tablet: foto menjadi pita atas (± 1:1) yang memudar ke peach lembut di tepi bawahnya, teks di bawahnya di atas peach
// padat (selalu terbaca berapa pun panjang teksnya), chip berderet di tepi bawah pita foto, tombol penuh-lebar.
// Gerak khas (./momkid.css): chip mengapung naik-turun DUA kali lalu diam; teks muncul bertahap. Foto hero (LCP) TIDAK
// pernah disembunyikan atau dianimasikan.
import { useRef, type CSSProperties } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { Doodle } from './art';
import { usePlayOnce } from './hooks';
import type { DoodleName } from './icons';
import type { MomkidModel } from './model';
import { MOMKID_PHOTOS } from './photos';
import { C, TYPE } from './styles';
import { ButtonLink, Highlighted, SectionLabel, Wave } from './ui';

/** Warna, doodle, dan posisi layar lebar (persen kotak hero) per chip. */
const CHIP_STYLE: { bg: string; doodle: DoodleName; x: string; y: string }[] = [
  { bg: 'bg-[#DDF3EA]/95', doodle: 'drop', x: '42%', y: '76%' },
  { bg: 'bg-[#FFF1DA]/95', doodle: 'shield', x: '81%', y: '30%' },
  { bg: 'bg-white/95', doodle: 'stethoscope', x: '80%', y: '70%' },
];

function Chips({ m }: { m: MomkidModel }) {
  // Gerak khas diputar lewat data-mk-play (pending → on) hanya bila tab terlihat; tab latar, pratinjau CMS, dan
  // prefers-reduced-motion → chip langsung tampil diam (tidak pernah tertahan transparan).
  const list = useRef<HTMLUListElement>(null);
  usePlayOnce(list);
  if (m.chips.length === 0) return null;
  return (
    <ul
      ref={list}
      aria-label="Layanan pilihan"
      className="relative z-[2] -mt-[76px] mb-4 flex flex-wrap gap-2 @5xl:pointer-events-none @5xl:absolute @5xl:inset-0 @5xl:m-0 @5xl:block"
    >
      {m.chips.map((chip, i) => {
        const look = CHIP_STYLE[i % CHIP_STYLE.length];
        const inner = (
          <>
            <Doodle name={look.doodle} blob="" className="h-7 w-7 shrink-0" />
            <span className="whitespace-nowrap">{chip.label}</span>
          </>
        );
        const pill = `flex h-11 items-center gap-1.5 rounded-full pl-2 pr-4 ${look.bg} ${TYPE.label} text-[14px] ${C.ink} backdrop-blur-md`;
        return (
          // HP: dua chip pertama saja (satu baris); layar ≥ @xl semua
          <li
            key={`${chip.label}-${i}`}
            className={`mk-chip @5xl:absolute @5xl:left-(--mk-x) @5xl:top-(--mk-y) ${i >= 2 ? 'hidden @xl:block' : ''}`}
            style={{ '--mk-x': look.x, '--mk-y': look.y, '--mk-d': `${0.5 + i * 0.35}s` } as CSSProperties}
          >
            {chip.action ? (
              <ActionLink action={chip.action} className={`${pill} pointer-events-auto transition-colors hover:bg-white`}>
                {inner}
              </ActionLink>
            ) : (
              <span className={pill}>{inner}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function Hero({ m }: { m: MomkidModel }) {
  const { hero } = m;
  const eyebrow = text(hero, 'eyebrow');
  const title = text(hero, 'title') || m.companyName;
  const subtitle = text(hero, 'subtitle');
  const note = text(hero, 'note');
  const image = text(hero, 'image');
  const primaryLabel = m.primaryAction ? text(hero, 'primary_label') : '';
  const secondaryLabel = m.secondaryAction ? text(hero, 'secondary_label') : '';

  return (
    <TemplateSection sectionKey="hero" data-hero-layout="cradle" className="relative isolate overflow-hidden bg-(--mk-peach-soft)">
      {/* Foto latar: HP/tablet pita atas, layar lebar seluruh hero. sizes HP: pita ± 1:1 memotong foto 16:9 (± 1,75 ×
          lebar layar) */}
      <KitPhoto
        src={image}
        alt={MOMKID_PHOTOS.alt(image, `Ibu dan bayi di ${m.companyName}`)}
        priority
        fallback="tint"
        sizes="(min-width: 1024px) 100vw, 175vw"
        className="absolute inset-x-0 top-0 h-[400px] @2xl:h-[460px] @5xl:inset-0 @5xl:h-auto"
        imgClassName="object-[66%_32%] @5xl:object-[60%_35%]"
      />
      <div aria-hidden className="mk-hero-veil pointer-events-none absolute inset-0" />

      <div className={`${CONTAINER} relative`}>
        <div className="flex min-h-[max(600px,min(82svh,740px))] flex-col pt-[400px] @2xl:pt-[460px] @5xl:justify-center @5xl:pb-28 @5xl:pt-16">
          <Chips m={m} />
          <div className="relative z-[2] pb-20 pt-2 @3xl:pb-24 @5xl:max-w-[600px] @5xl:pb-0 @5xl:pt-0 @7xl:max-w-[640px]">
            {eyebrow && (
              <Reveal>
                <SectionLabel label={eyebrow} doodle="heart" />
              </Reveal>
            )}
            <Reveal as="h1" delay={80} className={`${eyebrow ? 'mt-5' : ''} max-w-[16ch] ${TYPE.h1} ${C.ink}`}>
              <Highlighted title={title} highlight={text(hero, 'highlight')} />
            </Reveal>
            {subtitle && (
              <Reveal as="p" delay={160} className={`mt-5 max-w-[46ch] text-pretty ${TYPE.lead} ${C.ink}`}>
                {subtitle}
              </Reveal>
            )}
            {(primaryLabel || secondaryLabel) && (
              <Reveal delay={240} className="mt-8 flex flex-col gap-3 @xl:flex-row @xl:flex-wrap">
                <ButtonLink action={m.primaryAction} label={primaryLabel} className="w-full @xl:w-auto" />
                <ButtonLink action={m.secondaryAction} label={secondaryLabel} variant="mint" arrow={false} className="w-full @xl:w-auto" />
              </Reveal>
            )}
            {note && (
              <Reveal as="p" delay={320} className={`mt-6 flex items-center gap-2 text-[14.5px] font-medium ${C.ink}`}>
                <Doodle name="moon" blob="fill-white" className="h-8 w-8 shrink-0 text-(--mk-accent-text)" />
                {note}
              </Reveal>
            )}
          </div>
        </div>
      </div>

      <Wave tone={m.toneAfterHero} position="inside" />
    </TemplateSection>
  );
}
