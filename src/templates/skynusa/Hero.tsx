// Hero SkyNusa — "lembar spesifikasi" (data-hero-layout="specsheet"): kanvas abu dingin berkisi garis tipis dan nama toko
// raksasa bergaris di belakang; kiri label teknis, judul dua nada, deskripsi, tombol gelap (ke Drone) + tombol putih (ke
// Sewa); kanan panel foto drone (4:5 di HP, persegi/6:5 di layar lebar) dengan lingkar bidik tipis dan hingga 3 kartu angka spesifikasi yang melayang pelan,
// keterangan unit di bawah foto. Di bawahnya strip 4 keunggulan toko (paket, garansi, kelas, sewa) yang menuju section
// terkait. HP: teks dulu, lalu foto 4:5, kartu spesifikasi berderet di bawah foto, strip 2×2.
import { ArrowUpRight } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, list, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { DroneIcon } from './marks';
import { featureTarget, type SkyNusaModel } from './model';
import { SKYNUSA_PHOTOS } from './photos';
import { BTN, C, GLASS, MONO_PLAIN, TYPE_S } from './styles';
import { ButtonLink, Crosshair, SectionLabel, TitleIcon, Toned } from './ui';

/** Posisi kartu spesifikasi di atas foto (layar ≥ @2xl): kiri atas, kanan tengah (menjorok keluar), kiri bawah. */
const SPEC_POS = [
  'left-4 top-4 @5xl:-left-8 @5xl:top-10',
  'right-4 top-[38%] @5xl:-right-6',
  'bottom-16 left-4 @5xl:-left-10 @5xl:bottom-20',
];

/** Lingkar bidik tipis di tengah foto (gambar teknik). Dekoratif. */
function Reticle() {
  return (
    <svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false" className="pointer-events-none absolute inset-0 h-full w-full text-white">
      <g fill="none" stroke="currentColor" strokeOpacity=".55" vectorEffect="non-scaling-stroke">
        <circle cx="200" cy="230" r="118" strokeWidth="1" />
        <circle cx="200" cy="230" r="150" strokeWidth="1" strokeDasharray="2 6" />
        <path d="M200 92v26M200 342v26M62 230h26M312 230h26" strokeWidth="1" />
        <path d="M24 24h28M24 24v28M376 24h-28M376 24v28M24 476h28M24 476v-28M376 476h-28M376 476v-28" strokeWidth="1.5" strokeOpacity=".8" />
      </g>
    </svg>
  );
}

export function Hero({ m }: { m: SkyNusaModel }) {
  const { hero } = m;
  const eyebrow = text(hero, 'eyebrow');
  const title = text(hero, 'title') || m.companyName;
  const subtitle = text(hero, 'subtitle');
  const image = text(hero, 'image');
  const caption = text(hero, 'image_caption');
  const withImage = hasImage(image);
  const specs = list(hero, 'specs', 3).filter((item) => field(item, 'value'));
  const features = list(hero, 'features', 4).filter((item) => field(item, 'title') || field(item, 'text'));

  return (
    <TemplateSection sectionKey="hero" data-hero-layout="specsheet" className={`relative isolate overflow-hidden ${C.canvas}`}>
      <div aria-hidden className="sn-grid absolute inset-0 -z-10" />
      <div
        aria-hidden
        className="sn-wordmark pointer-events-none absolute bottom-[-0.14em] left-1/2 -z-10 -translate-x-1/2 font-[family-name:var(--tpl-font-display)] text-[19cqw] font-medium uppercase leading-none"
      >
        {m.companyName}
      </div>

      <div className={`${CONTAINER} relative pb-10 pt-8 @3xl:pb-14 @3xl:pt-12 @5xl:pt-14`}>
        <Crosshair className="left-1 top-3 hidden text-[#0E1A1C]/25 @5xl:block" />
        <Crosshair className="right-1 top-3 hidden text-[#0E1A1C]/25 @5xl:block" />
        <div className="grid items-center gap-10 @5xl:grid-cols-12 @5xl:gap-8 @7xl:gap-12">
          <div className="min-w-0 @5xl:col-span-6 @7xl:col-span-6">
            {eyebrow && (
              <Reveal variant="fade">
                <SectionLabel>{eyebrow}</SectionLabel>
              </Reveal>
            )}
            <Reveal as="h1" delay={80} className={`${eyebrow ? 'mt-6' : ''} max-w-[15ch] text-balance text-[#0E1A1C] ${TYPE_S.h1}`}>
              <Toned title={title} highlight={text(hero, 'highlight')} />
            </Reveal>
            {subtitle && (
              <Reveal as="p" delay={160} className={`mt-6 max-w-[50ch] text-pretty ${TYPE_S.lead} ${C.muted}`}>
                {subtitle}
              </Reveal>
            )}
            <Reveal delay={240} className="mt-9 flex flex-col items-stretch gap-3 @xl:flex-row @xl:items-center">
              <ButtonLink action={m.primaryAction} label={text(hero, 'primary_label')} variant="ink" className={`${BTN.ink} ${BTN.lg} justify-between @xl:justify-center`} />
              <ButtonLink action={m.secondaryAction} label={text(hero, 'secondary_label')} variant="light" className={`${BTN.light} ${BTN.lg} justify-between @xl:justify-center`} />
            </Reveal>
          </div>

          <div className="relative min-w-0 @5xl:col-span-6 @5xl:pl-6 @7xl:pl-10">
            <Reveal variant="scale" className="relative">
              <div className="relative">
                {withImage ? (
                  <KitPhoto
                    src={image}
                    alt={SKYNUSA_PHOTOS.alt(image, caption || `Drone dari ${m.companyName}`)}
                    priority
                    fallback="none"
                    sizes="(min-width: 1024px) 46vw, 100vw"
                    className="aspect-[4/5] rounded-[20px] @3xl:aspect-[5/4] @5xl:aspect-square @7xl:aspect-[6/5]"
                  >
                    <Reticle />
                  </KitPhoto>
                ) : (
                  <div className="sn-hero-fallback relative flex aspect-[4/5] items-center justify-center rounded-[20px] text-[#0E1A1C]/25 @3xl:aspect-[5/4] @5xl:aspect-square @7xl:aspect-[6/5]">
                    <DroneIcon className="h-1/3 w-1/3" />
                  </div>
                )}

                {specs.length > 0 && (
                  <ul aria-label="Spesifikasi unggulan" className="mt-3 grid grid-cols-3 gap-2 @2xl:contents">
                    {specs.map((item, i) => (
                      <li
                        key={`${field(item, 'value')}-${i}`}
                        style={{ '--sn-delay': `${i * 1.2}s` } as CSSProperties}
                        className={`sn-float min-w-0 rounded-[12px] p-3 text-[#0E1A1C] ${GLASS} @2xl:absolute @2xl:w-[200px] @2xl:p-4 ${SPEC_POS[i]}`}
                      >
                        <p className="font-[family-name:var(--tpl-font-display)] text-[20px] leading-none tracking-[-0.04em] tabular-nums @2xl:text-[30px]">{field(item, 'value')}</p>
                        {field(item, 'label') && <p className={`mt-2 text-[11.5px] leading-snug @2xl:text-[12.5px] ${C.muted}`}>{field(item, 'label')}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {caption && (
                <p className={`mt-3 flex items-center gap-2 ${MONO_PLAIN} ${C.muted}`}>
                  <span aria-hidden className="h-px w-6 bg-current" />
                  {caption}
                </p>
              )}
            </Reveal>
          </div>
        </div>

        {features.length > 0 && (
          <ul aria-label="Keunggulan toko" className="mt-12 grid grid-cols-2 overflow-hidden rounded-[16px] bg-white/75 ring-1 ring-inset ring-black/[0.06] backdrop-blur-sm @3xl:mt-16 @5xl:grid-cols-4">
            {features.map((item, i) => {
              const title = field(item, 'title');
              const target = featureTarget(title, m.shown);
              const body = (
                <>
                  <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-(--sn-tint) text-(--tpl-accent-ink)">
                    <TitleIcon title={title} index={i} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    {title && <span className="block text-[15px] font-medium leading-snug text-[#0E1A1C]">{title}</span>}
                    {field(item, 'text') && <span className={`mt-0.5 block text-[13px] leading-snug ${C.muted}`}>{field(item, 'text')}</span>}
                  </span>
                  {target && <ArrowUpRight aria-hidden className={`hidden h-4 w-4 shrink-0 transition-transform group-hover:-translate-y-px group-hover:translate-x-px @xl:block ${C.muted}`} />}
                </>
              );
              const cell = `group flex h-full items-start gap-3 p-4 @3xl:p-5 ${i % 2 === 1 ? 'border-l border-black/[0.06]' : ''} ${i >= 2 ? 'border-t border-black/[0.06] @5xl:border-t-0' : ''} ${i > 0 ? '@5xl:border-l' : ''}`;
              return (
                <Reveal as="li" key={`${title}-${i}`} delay={300 + stagger(i, 70)} className="min-w-0">
                  {target ? (
                    <ActionLink action={{ kind: 'section', target }} className={`${cell} transition-colors hover:bg-white`}>
                      {body}
                    </ActionLink>
                  ) : (
                    <div className={cell}>{body}</div>
                  )}
                </Reveal>
              );
            })}
          </ul>
        )}
      </div>
    </TemplateSection>
  );
}
