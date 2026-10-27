// Hero Velora — "Showroom" (data-hero-layout="showroom"): kartu foto lebar membulat (radius 28) di dalam gutter halaman
// dengan menu menumpang di dalamnya (./Header) dan garis tipis di bawah menu. Lapisan gelap bawah & kiri menjaga teks
// putih ≥ 4,5:1. Kiri-bawah: label kecil bergaris + H1 dengan satu kata di dalam pil bergaris dan chip bulat aksen
// berpanah (gaya CBRLP, salinan sendiri). Kanan-bawah: kartu kaca "sorotan" dengan sampul (layar lebar) — tombol
// putar HANYA bila tautannya video (YouTube/Vimeo/.mp4), selain itu bulatan panah — deskripsi singkat, dan pil putih +
// bulatan panah. Foto = LCP (eager + fetchpriority high), zoom-out
// pelan + parallax ringan hanya bila gerak menyala (bukan pratinjau CMS / prefers-reduced-motion). HP: kartu tegak, foto di
// bagian atas kartu (memudar ke bidang gelap) agar mobil terlihat di atas judul, kartu ulasan disembunyikan.
import { ArrowDownRight, ArrowUpRight, Play } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { splitHighlight, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { VeloraModel } from './model';
import { VELORA_PHOTOS } from './photos';
import { DISPLAY, GUTTER, INSET, TYPE_V } from './styles';
import { ArrowPill } from './ui';

/** Judul dengan kata sorotan di dalam pil bergaris + chip bulat aksen berpanah. Tanpa sorotan → judul biasa. */
function PillTitle({ title, highlight }: { title: string; highlight: string }) {
  const parts = splitHighlight(title, highlight);
  if (!parts) return <>{title}</>;
  const [before, mark, after] = parts;
  return (
    <>
      {before}
      {/* Pil selebar isinya, maks. selebar judul: sorotan yang lebih panjang dari judul terbagi dua baris DI DALAM pil
          (tidak terpotong tepi kartu atau keluar dari garis pil); satu kata tidak pernah terbagi */}
      <span className="inline-flex max-w-full items-center gap-[0.16em] align-[-0.06em]">
        <span className="min-w-0 rounded-[0.62em] px-[0.42em] pb-[0.06em] leading-[1.18] ring-[0.045em] ring-inset ring-white/80 [overflow-wrap:anywhere]">{mark}</span>
        <span aria-hidden className="vl-chip flex h-[0.86em] w-[0.86em] shrink-0 items-center justify-center rounded-full bg-(--vl-red) text-(--vl-on-red)">
          <ArrowDownRight className="h-[0.52em] w-[0.52em]" strokeWidth={2.4} />
        </span>
      </span>
      {after}
    </>
  );
}

function ReviewCard({ m }: { m: VeloraModel }) {
  const { hero } = m;
  const title = text(hero, 'review_title');
  const caption = text(hero, 'review_text');
  const label = text(hero, 'review_label');
  const image = text(hero, 'review_image');
  if (!title) return null;
  const body = (
    <>
      <KitPhoto
        src={image}
        alt=""
        sizes="140px"
        fallback="tint"
        className="aspect-[16/11] w-[128px] shrink-0 rounded-[14px] @7xl:w-[140px]"
        imgClassName="transition-[scale] duration-700 group-hover:scale-[1.05]"
      >
        {m.reviewAction && (
          <span aria-hidden className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#0D0E10] transition-colors duration-300 group-hover:bg-(--vl-red) group-hover:text-(--vl-on-red)">
              {m.reviewIsVideo ? (
                <Play className="h-3.5 w-3.5 translate-x-px fill-current" />
              ) : (
                <ArrowUpRight className="h-[18px] w-[18px] transition-transform duration-500 ease-out group-hover:rotate-45" />
              )}
            </span>
          </span>
        )}
      </KitPhoto>
      <span className="flex min-w-0 flex-col justify-center py-1 pr-2">
        <span className={`${DISPLAY} block text-[18px] font-medium leading-tight tracking-[-0.02em] text-[#0D0E10]`}>{title}</span>
        {caption && <span className="mt-1 block text-[13px] leading-snug text-[#55575C]">{caption}</span>}
        {label && (
          <span className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#0D0E10]">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-(--vl-red)" />
            <span className="underline decoration-[#0D0E10]/25 underline-offset-4 group-hover:decoration-[#0D0E10]">{label}</span>
          </span>
        )}
      </span>
    </>
  );
  const box = 'group flex w-[360px] max-w-full items-stretch gap-3.5 rounded-[20px] bg-white/85 p-2 ring-1 ring-inset ring-white/60 backdrop-blur-xl @7xl:w-[380px]';
  return (
    <Reveal variant="right" delay={320} className="hidden @5xl:block">
      {m.reviewAction ? (
        <ActionLink action={m.reviewAction} className={box}>
          {body}
        </ActionLink>
      ) : (
        <div className={box}>{body}</div>
      )}
    </Reveal>
  );
}

export function Hero({ m }: { m: VeloraModel }) {
  const { hero } = m;
  const image = text(hero, 'image');
  const eyebrow = text(hero, 'eyebrow');
  const title = text(hero, 'title') || m.companyName;
  const subtitle = text(hero, 'subtitle');
  const primaryLabel = m.primaryAction ? text(hero, 'primary_label') : '';

  return (
    <TemplateSection sectionKey="hero" data-hero-layout="showroom" data-tpl-tone="inverse" className="pt-2 @2xl:pt-3 @5xl:pt-4">
      <div className={GUTTER}>
        <div className="relative isolate flex min-h-[max(600px,min(150cqw,calc(100svh-24px)))] flex-col overflow-hidden rounded-[24px] bg-[#0D0E10] text-white @2xl:min-h-[max(600px,min(82cqw,calc(100svh-24px)))] @5xl:min-h-[clamp(640px,calc(100svh-32px),900px)] @5xl:rounded-[28px]">
          {/* HP (wadah < 672px): foto hanya di bagian atas kartu dan memudar ke bidang gelap, jadi mobil terlihat di atas judul */}
          <div aria-hidden className="vl-hero-zoom absolute inset-0 -z-20 @max-2xl:bottom-[36%] @max-2xl:[mask-image:linear-gradient(180deg,#000_68%,transparent_100%)]">
            <KitPhoto
              src={image}
              alt={VELORA_PHOTOS.alt(image, `${m.companyName} hero`)}
              priority
              parallax={4}
              sizes="(min-width: 1680px) 1650px, 100vw"
              position="72% 60%"
              className="absolute inset-0"
            />
          </div>
          <div aria-hidden className="vl-hero-scrim absolute inset-0 -z-10" />
          {/* Garis tipis di bawah menu (menu = ./Header, menumpang di atas kartu) */}
          <div aria-hidden className={`${INSET} pointer-events-none absolute inset-x-0 top-[68px] @5xl:top-[80px]`}>
            <div className="h-px bg-white/20" />
          </div>

          <div className={`${INSET} relative mt-auto grid gap-7 pb-5 pt-[104px] @2xl:pb-7 @5xl:grid-cols-12 @5xl:items-end @5xl:gap-8 @5xl:pb-10 @5xl:pt-[128px]`}>
            <div className="min-w-0 @5xl:col-span-8 @7xl:col-span-7">
              {eyebrow && (
                <Reveal as="p" className="inline-flex max-w-full items-center gap-3 text-[13.5px] font-medium text-white/90">
                  <span aria-hidden className="h-px w-8 shrink-0 bg-white/70" />
                  <span className="min-w-0">{eyebrow}</span>
                </Reveal>
              )}
              <Reveal as="h1" delay={80} className={`${eyebrow ? 'mt-4 @3xl:mt-5' : ''} max-w-[15ch] text-balance text-white ${TYPE_V.h1}`}>
                <PillTitle title={title} highlight={text(hero, 'highlight')} />
              </Reveal>
            </div>
            {/* HP: di bawah judul, rata kiri; layar lebar: kolom kanan rata kanan dengan kartu ulasan di atasnya */}
            <div className="flex min-w-0 flex-col items-stretch gap-6 @xl:items-start @5xl:col-span-4 @5xl:items-end @7xl:col-span-5">
              <ReviewCard m={m} />
              {subtitle && (
                <Reveal as="p" delay={160} className="max-w-[46ch] text-pretty text-[15px] leading-relaxed text-white/85 @5xl:max-w-[40ch] @5xl:text-right">
                  {subtitle}
                </Reveal>
              )}
              {primaryLabel && (
                <Reveal delay={240}>
                  <ArrowPill action={m.primaryAction} label={primaryLabel} variant="white" className="w-full @xl:w-auto @5xl:h-14 @5xl:pl-6 @5xl:pr-2" />
                </Reveal>
              )}
            </div>
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}
