// Fasilitas (kunci `facilities`): pita tint; label + H2 + deskripsi dengan tombol sebelumnya/berikutnya persegi di
// kanan (aria-disabled di ujung rel), lalu REL GESER kartu foto 4:5 selebar layar (scroll-snap, tanpa scrollbar; empat
// kartu di layar lebar dengan sepertiga kartu berikutnya mengintip sampai tepi layar) + nama & keterangan, dan garis
// progres tipis warna tema yang mengikuti posisi gulir. Foto zoom-out halus saat masuk layar dan membesar pelan saat
// disorot. HP: kartu 80% lebar, digeser (tombol disembunyikan, garis progres tetap). Rel bisa difokus untuk digulir dengan
// papan ketik.
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { useMotionEnabled } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { useRail } from './hooks';
import type { JumantaraModel } from './model';
import { JUMANTARA_PHOTOS } from './photos';
import { C, LINE, SECTION_PAD, TYPE_J } from './styles';
import { SectionHead } from './ui';

/** Rel selebar layar: margin negatif + padding + scroll-padding sama dengan jarak tepi CONTAINER (20 → 32 → 48 → 64px). */
const RAIL_BLEED =
  '-mx-5 px-5 scroll-px-5 @2xl:-mx-8 @2xl:px-8 @2xl:scroll-px-8 @5xl:-mx-12 @5xl:px-12 @5xl:scroll-px-12 @min-[96rem]:-mx-16 @min-[96rem]:px-16 @min-[96rem]:scroll-px-16';
/**
 * Ruang di ujung kanan rel ≈ jarak tepi wadah: elemen semu kosong setelah kartu terakhir (jarak antarkartu 20px + lebarnya),
 * karena padding kanan pembungkus gulir tidak ikut dihitung sebagai area gulir (Chrome). Minimal 1px: kotak selebar 0
 * diabaikan saat menghitung area gulir.
 */
const RAIL_END = "after:shrink-0 after:content-[''] after:w-px @2xl:after:w-3 @5xl:after:w-7 @min-[96rem]:after:w-11";

const ARROW = `flex h-11 w-11 items-center justify-center rounded-[10px] border bg-white transition-colors duration-200 hover:border-(--jm-line) aria-disabled:cursor-default aria-disabled:opacity-40 aria-disabled:hover:border-[#0E1525]/[0.08] ${C.ink} ${LINE}`;

export function Facilities({ m }: { m: JumantaraModel }) {
  const { facilities } = m;
  const items = m.items('facilities');
  const rail = useRef<HTMLDivElement>(null);
  const state = useRail(rail);
  const motion = useMotionEnabled();
  if (items.length === 0) return null;
  const title = text(facilities, 'title');

  const scroll = (direction: 1 | -1) => {
    const el = rail.current;
    if (!el) return;
    const card = el.querySelector('li');
    const step = card ? card.getBoundingClientRect().width + 20 : el.clientWidth * 0.8;
    el.scrollBy({ left: direction * step, behavior: motion ? 'smooth' : 'auto' });
  };
  // Bagian rel yang sudah terlihat: lebar layar awal → penuh di ujung kanan
  const fill = Math.min(1, state.visible + state.progress * (1 - state.visible));
  const scrollable = !(state.atStart && state.atEnd);

  const arrows = (
    <div className="hidden items-center gap-2 @xl:flex">
      <button type="button" aria-label="Fasilitas sebelumnya" aria-disabled={state.atStart || undefined} onClick={() => !state.atStart && scroll(-1)} className={ARROW}>
        <ChevronLeft aria-hidden className="h-5 w-5" />
      </button>
      <button type="button" aria-label="Fasilitas berikutnya" aria-disabled={state.atEnd || undefined} onClick={() => !state.atEnd && scroll(1)} className={ARROW}>
        <ChevronRight aria-hidden className="h-5 w-5" />
      </button>
    </div>
  );

  return (
    <TemplateSection sectionKey="facilities" className={`bg-(--jm-tint) ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(facilities, 'eyebrow')} title={title} fallback="Fasilitas" subtitle={text(facilities, 'subtitle')} aside={items.length > 1 ? arrows : undefined} />
        <Reveal delay={120} className="mt-10 @3xl:mt-12">
          {/* Rel menembus jarak tepi wadah sampai tepi layar (padding & scroll-padding = jarak tepi CONTAINER): kartu awal
              tetap sejajar judul, kartu berikutnya mengintip sampai tepi layar, tidak terpotong di tepi wadah */}
          <div
            ref={rail}
            role="group"
            tabIndex={0}
            aria-label={`${title || 'Fasilitas'}: geser untuk melihat semua`}
            className={`jm-rail snap-x snap-mandatory overflow-x-auto pb-1 ${RAIL_BLEED}`}
          >
            <ul className={`flex gap-5 ${RAIL_END}`}>
              {items.map((item, i) => {
                const image = field(item, 'image');
                const name = field(item, 'name');
                return (
                  <li key={`${name}-${i}`} className="w-[80%] shrink-0 snap-start @xl:w-[42%] @5xl:w-[29%] @7xl:w-[22%]">
                    <article className="group">
                      <KitPhoto
                        src={image}
                        alt={JUMANTARA_PHOTOS.alt(image, `${name} di ${m.companyName}`)}
                        sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 29vw, (min-width: 640px) 42vw, 80vw"
                        zoom
                        className="aspect-[4/5] rounded-[12px]"
                        imgClassName="transition-[scale] duration-700 ease-out group-hover:scale-[1.04]"
                      />
                      <h3 className={`mt-4 ${C.ink} ${TYPE_J.h3}`}>{name}</h3>
                      {field(item, 'text') && <p className={`mt-1.5 max-w-[40ch] text-[14.5px] leading-relaxed ${C.muted}`}>{field(item, 'text')}</p>}
                    </article>
                  </li>
                );
              })}
            </ul>
          </div>
        </Reveal>
        {scrollable && (
          <div aria-hidden className="mt-7 h-0.5 overflow-hidden rounded-full bg-[#0E1525]/10">
            <div className="jm-progress h-full bg-(--tpl-accent)" style={{ transform: `scaleX(${fill.toFixed(3)})` }} />
          </div>
        )}
      </div>
    </TemplateSection>
  );
}
