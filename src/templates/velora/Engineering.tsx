// Teknologi (`engineering`) & angka (`stats`).
// Teknologi, gaya carousel kartu melebar (referensi Hugo): bidang hampir hitam selebar layar, kepala + tombol ← → di
// kanan; deret kartu foto — kartu terpilih melebar halus dan menampilkan penjelasan, kartu lain menyempit dengan ikon +
// judul (klik kartu atau tombol panah untuk memilih; tombol kartu ber-aria-expanded). Wadah < 1152px: rel geser snap,
// semua kartu menampilkan penjelasan.
// Angka: putih tulang, empat angka raksasa dengan titik aksen (ukuran mengikuti lebar kolom), label & penjelasan.
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useId, useRef, useState, type CSSProperties } from 'react';
import { CountUp, Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { VeloraModel } from './model';
import { VELORA_PHOTOS } from './photos';
import { C, DISPLAY, SECTION_PAD } from './styles';
import { AutoIcon, SectionHead, TextLink } from './ui';

export function Engineering({ m }: { m: VeloraModel }) {
  const s = m.engineering;
  const items = m.items('engineering');
  const [picked, setPicked] = useState(0);
  const baseId = useId();
  const count = items.length;
  const active = Math.min(picked, count - 1);
  const rail = useRef<HTMLUListElement>(null);
  const go = (i: number) => setPicked(((i % count) + count) % count);
  /** Tombol ← →: pilih kartu berikut/sebelumnya; di wadah sempit (rel geser) juga menggeser rel satu kartu. */
  const step = (dir: 1 | -1) => {
    go(active + dir);
    const el = rail.current;
    if (!el || el.scrollWidth <= el.clientWidth + 1) return;
    const card = el.querySelector<HTMLElement>('li');
    const prefersReduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: dir * ((card?.offsetWidth ?? 300) + 12), behavior: prefersReduced ? 'auto' : 'smooth' });
  };

  const arrows =
    count > 1 ? (
      <div role="group" aria-label="Technology cards" className="hidden shrink-0 items-center gap-2 @3xl:flex">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Previous card"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.08] text-white ring-1 ring-inset ring-white/15 transition-colors duration-300 hover:bg-white hover:text-[#0D0E10]"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Next card"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.08] text-white ring-1 ring-inset ring-white/15 transition-colors duration-300 hover:bg-white hover:text-[#0D0E10]"
        >
          <ArrowRight className="h-5 w-5" aria-hidden />
        </button>
      </div>
    ) : null;

  return (
    <TemplateSection sectionKey="engineering" data-tpl-tone="inverse" className={`${SECTION_PAD} bg-[#0D0E10] text-white`}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(s, 'eyebrow')} title={text(s, 'title')} subtitle={text(s, 'subtitle')} tone="dark" aside={arrows} />
        <Reveal className="mt-10 @3xl:mt-14">
          <ul
            ref={rail}
            tabIndex={0}
            aria-label={text(s, 'title') || 'Technology'}
            className="vl-rail vl-eng-list -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-1 @2xl:-mx-8 @2xl:scroll-px-8 @2xl:px-8 @6xl:mx-0 @6xl:h-[clamp(440px,34cqw,520px)] @6xl:overflow-visible @6xl:px-0 @6xl:pb-0"
          >
            {items.map((item, i) => {
              const isActive = i === active;
              const title = field(item, 'title');
              const image = field(item, 'image');
              const textId = `${baseId}-text-${i}`;
              const link = m.linkOr(field(item, 'url'), null);
              return (
                <li
                  key={`${title}-${i}`}
                  data-active={isActive ? 'true' : 'false'}
                  className="vl-eng-card relative isolate flex aspect-[4/5] w-[80%] max-w-[360px] shrink-0 snap-start flex-col justify-end overflow-hidden rounded-[20px] bg-[#1B1D21] @xl:w-[46%] @4xl:w-[31%] @6xl:aspect-auto @6xl:w-auto @6xl:max-w-none @6xl:shrink"
                >
                  <KitPhoto
                    src={image}
                    alt={VELORA_PHOTOS.alt(image, title)}
                    sizes="(min-width: 1152px) 50vw, (min-width: 576px) 46vw, 80vw"
                    fallback="none"
                    className="absolute inset-0 -z-10"
                    imgClassName="transition-[scale] duration-700 hover:scale-[1.03]"
                  />
                  <span aria-hidden className="vl-card-scrim absolute inset-0 -z-10" />
                  <div className={`p-4 @3xl:p-5 ${isActive ? '' : '@6xl:p-3.5 @7xl:p-4'}`}>
                    <span aria-hidden className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.14] text-white ring-1 ring-inset ring-white/25 backdrop-blur-md">
                      <AutoIcon title={title} index={i} className="h-[18px] w-[18px]" />
                    </span>
                    <h3
                      className={`${DISPLAY} text-[18px] font-medium leading-snug tracking-[-0.015em] text-white hyphens-auto ${
                        isActive ? '@6xl:text-[24px] @7xl:text-[28px]' : '@6xl:text-[14px] @7xl:text-[16px]'
                      }`}
                    >
                      {/* Layar lebar: judul kartu = tombol pilih (menutupi kartu); HP: semua penjelasan sudah tampil */}
                      <button
                        type="button"
                        onClick={() => go(i)}
                        aria-expanded={isActive}
                        aria-controls={textId}
                        className="text-left after:absolute after:inset-0 after:rounded-[20px] after:content-[''] focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:-outline-offset-4 focus-visible:after:outline-white"
                      >
                        {title}
                      </button>
                    </h3>
                    <div id={textId} className={`vl-eng-text relative z-10 ${isActive ? '' : '@6xl:hidden'}`}>
                      {field(item, 'text') && <p className="mt-2 max-w-[46ch] text-[14.5px] leading-relaxed text-white/80 @3xl:text-[15px]">{field(item, 'text')}</p>}
                      <TextLink action={link} label={field(item, 'link_label')} tone="dark" className="mt-2" />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </TemplateSection>
  );
}

export function Stats({ m }: { m: VeloraModel }) {
  const s = m.stats;
  const items = m.items('stats');
  // Angka terpanjang (min. 4 huruf) menentukan satu batas ukuran bersama, agar "2,400" dan "1.2M" muat di kolomnya
  const chars = Math.max(4, ...items.map((item) => field(item, 'value').length));
  const fit = { '--vl-fit': `${(100 / (chars * 0.62)).toFixed(1)}cqi` } as CSSProperties;
  const cols = items.length >= 4 ? 'grid-cols-2 @6xl:grid-cols-4' : items.length === 3 ? '@3xl:grid-cols-3' : items.length === 2 ? 'grid-cols-2' : '';
  return (
    <TemplateSection sectionKey="stats" className={SECTION_PAD}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(s, 'eyebrow')} title={text(s, 'title')} subtitle={text(s, 'subtitle')} />
        <dl className={`mt-10 grid gap-x-4 gap-y-10 @3xl:mt-16 @3xl:gap-x-8 ${cols}`}>
          {items.map((item, i) => (
            <Reveal key={`${field(item, 'label')}-${i}`} delay={stagger(i, 90)} className="flex min-w-0 flex-col border-t border-[#0D0E10]/[0.14] pt-5">
              <dt className={`order-2 mt-4 text-[14px] font-medium leading-snug ${C.ink} @3xl:text-[15px]`}>{field(item, 'label')}</dt>
              <dd className={`@container order-1 ${DISPLAY} font-medium leading-[0.92] tracking-[-0.05em] tabular-nums ${C.ink}`}>
                <span className="flex items-start text-[length:min(132px,var(--vl-fit))]" style={fit}>
                  <CountUp value={field(item, 'value')} duration={1800} />
                  <span aria-hidden className="ml-[0.06em] mt-[0.12em] h-[0.16em] w-[0.16em] shrink-0 rounded-full bg-(--vl-red)" />
                </span>
              </dd>
              {field(item, 'text') && <dd className={`order-3 mt-1.5 max-w-[34ch] text-[13.5px] leading-relaxed ${C.muted} @3xl:text-[14px]`}>{field(item, 'text')}</dd>}
            </Reveal>
          ))}
        </dl>
      </div>
    </TemplateSection>
  );
}
