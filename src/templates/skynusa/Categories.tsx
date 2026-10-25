// Kategori per kebutuhan (kunci `categories`): kepala terbelah, lalu kartu foto tinggi radius 20 dengan garis teknis SVG
// sesuai kebutuhan (dipilih dari judul: bingkai bidik untuk foto, lintasan orbit untuk wedding, kisi + jalur terbang
// zig-zag untuk pemetaan), nomor "01", label mono, judul, deskripsi, dan tautan #products yang memfilter daftar Drone
// lalu menggulir ke sana (tanpa produk berlabel itu → WhatsApp berisi nama kategori). Seluruh kartu bisa diklik lewat
// tautan yang membentang. HP: kartu bertumpuk.
import { ArrowUpRight } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, list, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { iconKey } from './icons';
import { categoryTag, normalize, type SkyNusaModel } from './model';
import { SKYNUSA_PHOTOS } from './photos';
import { useShop } from './shop';
import { MONO, TYPE_S } from './styles';
import { SectionHead, TitleIcon } from './ui';

type Overlay = 'map' | 'orbit' | 'frame';

const overlayOf = (title: string, index: number): Overlay => {
  const key = iconKey(title, index);
  if (key === 'map') return 'map';
  if (key === 'wedding' || key === 'video') return 'orbit';
  return 'frame';
};

/** Garis teknis di atas foto kategori. Dekoratif; garis tetap 1px berapa pun ukuran kartu. */
function TechLines({ kind }: { kind: Overlay }) {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden focusable="false" className="pointer-events-none absolute inset-0 h-full w-full text-white">
      <g fill="none" stroke="currentColor" vectorEffect="non-scaling-stroke">
        {kind === 'map' && (
          <>
            {[80, 160, 240, 320].map((x) => (
              <path key={`v${x}`} d={`M${x} 0V300`} strokeOpacity=".22" vectorEffect="non-scaling-stroke" />
            ))}
            {[50, 100, 150].map((y) => (
              <path key={`h${y}`} d={`M0 ${y}H400`} strokeOpacity=".22" vectorEffect="non-scaling-stroke" />
            ))}
            <path d="M64 46H336V76H64V106H336V136H200" className="sn-route" strokeWidth="1.5" strokeOpacity=".9" vectorEffect="non-scaling-stroke" />
            <path d="M48 34H352V150H48Z" strokeOpacity=".7" strokeDasharray="2 5" vectorEffect="non-scaling-stroke" />
          </>
        )}
        {kind === 'orbit' && (
          <>
            <ellipse cx="200" cy="96" rx="150" ry="52" strokeOpacity=".7" strokeDasharray="3 6" vectorEffect="non-scaling-stroke" />
            <ellipse cx="200" cy="96" rx="96" ry="32" strokeOpacity=".35" vectorEffect="non-scaling-stroke" />
            <path d="M188 96h24M200 84v24" strokeOpacity=".9" vectorEffect="non-scaling-stroke" />
          </>
        )}
        {kind === 'frame' && (
          <>
            <path d="M133 0V300M267 0V300M0 100H400M0 200H400" strokeOpacity=".2" vectorEffect="non-scaling-stroke" />
            <path d="M40 62V44H64M360 62V44H336M40 136V154H64M360 136V154H336" strokeWidth="1.5" strokeOpacity=".9" vectorEffect="non-scaling-stroke" />
          </>
        )}
      </g>
    </svg>
  );
}

export function Categories({ m }: { m: SkyNusaModel }) {
  const { categories } = m;
  const { setFilter } = useShop();
  const items = list(categories, 'items', 4).filter((item) => field(item, 'title') || field(item, 'description'));
  if (items.length === 0) return null;
  const cols = items.length === 4 ? '@3xl:grid-cols-2 @6xl:grid-cols-4' : items.length === 2 ? '@3xl:grid-cols-2' : '@3xl:grid-cols-3';

  return (
    <TemplateSection sectionKey="categories" className={`${SECTION_Y} bg-white`}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(categories, 'eyebrow')} title={text(categories, 'title')} highlight={text(categories, 'highlight')} subtitle={text(categories, 'subtitle')} />

        <ul className={`mt-10 grid gap-4 @3xl:mt-14 @5xl:gap-5 ${cols}`}>
          {items.map((item, i) => {
            const title = field(item, 'title');
            const tag = categoryTag(item);
            const image = field(item, 'image');
            const filterable = m.filterTags.some((t) => normalize(t) === normalize(tag));
            const label = field(item, 'link_label') || (filterable ? `Lihat drone ${tag.toLowerCase()}` : 'Tanya rekomendasi');
            const ask = filterable ? null : m.askAbout(`drone untuk ${title.toLowerCase()}`);
            // Seluruh kartu bisa diklik lewat tautan yang membentang (after:inset-0); isi kartu tetap teks biasa
            const cta = (
              <>
                {label}
                <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-white text-[#0E1A1C] transition-transform group-hover:-translate-y-px group-hover:translate-x-px">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </>
            );
            const ctaClass = "mt-5 inline-flex items-center gap-2 text-[14px] font-medium text-white after:absolute after:inset-0 after:content-['']";
            return (
              <Reveal
                as="li"
                key={`${title}-${i}`}
                delay={stagger(i, 80)}
                data-tpl-tone="inverse"
                className="group relative isolate flex min-h-[380px] min-w-0 flex-col overflow-hidden rounded-[20px] bg-[#1A2A2D] p-5 @3xl:min-h-[460px] @3xl:p-6 @7xl:min-h-[520px]"
              >
                {hasImage(image) && (
                  <KitPhoto
                    src={image}
                    alt={SKYNUSA_PHOTOS.alt(image, title)}
                    fallback="none"
                    zoom
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="absolute inset-0 -z-20"
                    imgClassName="transition-[scale] duration-700 group-hover:scale-[1.04]"
                  />
                )}
                <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(10_18_20/0.5)_0%,rgb(10_18_20/0.1)_35%,rgb(10_18_20/0.78)_100%)]" />
                <div aria-hidden className="absolute inset-0 -z-10">
                  <TechLines kind={overlayOf(title, i)} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className={`${MONO} text-white/85`}>{String(i + 1).padStart(2, '0')}</span>
                  {tag && <span className={`rounded-[6px] bg-white/[0.14] px-2 py-1 text-white ring-1 ring-inset ring-white/25 backdrop-blur-md ${MONO}`}>{tag}</span>}
                </div>
                <div className="mt-auto pt-16">
                  <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-white/[0.14] text-white ring-1 ring-inset ring-white/25 backdrop-blur-md">
                    <TitleIcon title={title} index={i} />
                  </span>
                  {title && <h3 className={`mt-4 text-white ${TYPE_S.h3} @3xl:text-[24px]`}>{title}</h3>}
                  {field(item, 'description') && <p className="mt-2 max-w-[40ch] text-[14.5px] leading-relaxed text-white/85">{field(item, 'description')}</p>}
                  {/* Tautan asli (#products / WhatsApp); sebelum menggulir, filter Drone dipasang ke label kategori ini */}
                  <ActionLink
                    action={filterable ? { kind: 'section', target: 'products' } : ask}
                    onNavigate={filterable ? () => setFilter(tag) : undefined}
                    aria-label={`${label}: ${title}`}
                    className={ctaClass}
                  >
                    {cta}
                  </ActionLink>
                </div>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}
