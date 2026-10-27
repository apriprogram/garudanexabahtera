// Hero NusaNiaga "slatted": foto tegak di KIRI yang menembus sampai tepi kiri layar, dipotong menjadi bilah-bilah vertikal
// oleh mask CSS statis (4 bilah di layar lebar, 3 di HP; tinggi bilah naik ke arah judul, bilah tertinggi bergaris aksen
// 3px di atas), teks di KANAN: label berbingkai, H1 Manrope rapat dengan bagian berwarna aksen, deskripsi, chip negara
// asal yang merupakan tautan sungguhan ke bagian Jangkauan, dan dua tombol pil bertitik.
// Urutan DOM = urutan HP: label → H1 → chip → foto → deskripsi → tombol. Di layar lebar hanya deskripsi (tidak bisa
// difokus) yang pindah ke atas chip, jadi urutan fokus selalu sama dengan urutan tampilan.
// Foto hero = LCP: priority (eager + fetchpriority high), TANPA pudar/klip/zoom/parallax; hanya teks yang Reveal.
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { NusaNiagaModel } from './model';
import { NUSANIAGA_PHOTOS } from './photos';
import { C, CODE_BADGE, TYPE_N } from './styles';
import { Highlighted, PillLink, Tag } from './ui';

const CHIP =
  'inline-flex h-11 shrink-0 snap-start items-center gap-1.5 rounded-full bg-white pl-1.5 pr-3.5 text-[14px] font-medium text-[#141821] ring-1 ring-inset ring-[#141821]/[0.12]';

/** Kolom teks layar lebar: kolom 7–12 (@5xl) / 8–12 (@7xl), sedikit menjauh dari foto. */
const TEXT_COL = '@5xl:col-[7/13] @5xl:pl-4 @7xl:col-[8/13]';

export function Hero({ m }: { m: NusaNiagaModel }) {
  const { hero } = m;
  const title = text(hero, 'title') || m.companyName;
  const image = text(hero, 'image');
  const eyebrow = text(hero, 'eyebrow');
  const subtitle = text(hero, 'subtitle');
  const originLabel = text(hero, 'origin_label');
  const primary = text(hero, 'primary_label');
  const secondary = text(hero, 'secondary_label');
  const hasButtons = !!((primary && m.primaryAction) || (secondary && m.secondaryAction));

  return (
    <TemplateSection sectionKey="hero" data-hero-layout="slatted" className="bg-white pb-14 pt-8 @3xl:pb-20 @5xl:py-0">
      <div className={`${CONTAINER} grid @5xl:grid-cols-12 @5xl:grid-rows-[1fr_auto_auto_auto_auto_auto_1fr] @5xl:gap-x-8 @7xl:gap-x-12`}>
        {eyebrow && (
          <Reveal className={`${TEXT_COL} @5xl:row-[2] @5xl:pt-14`}>
            <Tag>{eyebrow}</Tag>
          </Reveal>
        )}

        <Reveal as="h1" delay={80} className={`${TEXT_COL} max-w-[20ch] @5xl:row-[3] ${eyebrow ? 'mt-5 @3xl:mt-6' : '@5xl:pt-14'} ${C.ink} ${TYPE_N.h1}`}>
          <Highlighted title={title} highlight={text(hero, 'highlight')} />
        </Reveal>

        {m.origins.length > 0 && (
          <Reveal delay={240} className={`${TEXT_COL} mt-7 min-w-0 @5xl:row-[5] @5xl:mt-9`}>
            {originLabel && <p className={`text-[13px] font-medium ${C.subtle}`}>{originLabel}</p>}
            {/* HP: satu baris chip yang digeser sendiri (tepi memudar); layar lebar: chip membungkus */}
            <ul
              className={`nn-rail nn-fade-x -mx-5 flex snap-x gap-2 overflow-x-auto scroll-px-5 px-5 py-0.5 @2xl:-mx-8 @2xl:scroll-px-8 @2xl:px-8 @5xl:mx-0 @5xl:flex-wrap @5xl:overflow-visible @5xl:px-0 ${
                originLabel ? 'mt-3' : ''
              }`}
            >
              {m.origins.map((item, i) => {
                const code = field(item, 'code').slice(0, 3).toUpperCase();
                const body = (
                  <>
                    {code && (
                      <span aria-hidden className={CODE_BADGE}>
                        {code}
                      </span>
                    )}
                    <span className={code ? '' : 'pl-2.5'}>{field(item, 'country')}</span>
                  </>
                );
                return (
                  <li key={`${field(item, 'country')}-${i}`} className="flex shrink-0">
                    {m.originAction ? (
                      <ActionLink action={m.originAction} className={`${CHIP} transition-colors duration-200 hover:ring-(--tpl-accent)`}>
                        {body}
                      </ActionLink>
                    ) : (
                      <span className={CHIP}>{body}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Reveal>
        )}

        {/* Foto: menembus tepi kiri layar (margin negatif = jarak tepi CONTAINER; di atas 1680px dihitung dari lebar
            wadah). Bilah = mask statis .nn-slats pada wadah foto. Garis aksen di atas bilah tertinggi (kanan). */}
        <div
          className={`relative -ml-5 mt-8 aspect-[4/5] @xl:aspect-square @2xl:-ml-8 @3xl:aspect-[5/4] @5xl:col-[1/7] @5xl:row-[1/-1] @5xl:mt-0 @5xl:-ml-12 @5xl:aspect-auto @5xl:h-[clamp(580px,calc(100svh-72px),820px)] @7xl:col-[1/8] @min-[96rem]:-ml-16 @min-[105rem]:ml-[calc(840px-50cqw-4rem)]`}
        >
          <KitPhoto
            src={image}
            alt={NUSANIAGA_PHOTOS.alt(image, title)}
            priority
            fallback="tint"
            className="nn-slats h-full w-full"
            sizes="(min-width: 1680px) 940px, (min-width: 1024px) 60vw, 100vw"
            position="50% 55%"
          />
          <span aria-hidden className="pointer-events-none absolute right-0 top-0 h-[3px] w-[calc((100%-16px)/3)] bg-(--tpl-accent) @5xl:w-[calc((100%-36px)/4)]" />
        </div>

        {subtitle && (
          <Reveal as="p" delay={160} className={`${TEXT_COL} mt-8 max-w-[46ch] text-pretty @5xl:row-[4] @5xl:mt-6 ${TYPE_N.lead} ${C.muted}`}>
            {subtitle}
          </Reveal>
        )}

        {hasButtons && (
          <Reveal delay={320} className={`${TEXT_COL} mt-7 @5xl:row-[6] @5xl:mt-9 @5xl:pb-14`}>
            <div className="flex flex-col gap-3 @xl:flex-row @xl:flex-wrap">
              <PillLink action={m.primaryAction} label={primary} size="lg" className="w-full @xl:w-auto" />
              <PillLink action={m.secondaryAction} label={secondary} variant="outline" size="lg" className="w-full @xl:w-auto" />
            </div>
          </Reveal>
        )}
      </div>
    </TemplateSection>
  );
}
