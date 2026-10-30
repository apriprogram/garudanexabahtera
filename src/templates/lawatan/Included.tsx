// Yang termasuk (kunci `included`), latar putih: kepala section lalu ubin bergaya PERANGKO KOLEKSI — krem, radius 16,
// bingkai dalam putus-putus warna tema, ikon garis otomatis dari judul (bus, hotel, makan, tiket, pemandu, dokumentasi)
// dalam lingkaran warna tema, judul Bricolage, satu baris keterangan. 6 kolom @6xl, 3 @3xl, 2 di HP. Di bawahnya satu
// baris "Belum termasuk: …" berikon info. Ubin muncul bertahap (Reveal).
import { Info } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import type { LawatanModel } from './model';
import { C, DISPLAY, SECTION_PAD, WRAP } from './styles';
import { IncludeIcon, SectionHead } from './ui';

const COLS: Record<number, string> = {
  1: '@3xl:grid-cols-1',
  2: '@3xl:grid-cols-2',
  3: '@3xl:grid-cols-3',
  4: '@3xl:grid-cols-2 @6xl:grid-cols-4',
  5: '@3xl:grid-cols-3 @6xl:grid-cols-5',
  6: '@3xl:grid-cols-3 @6xl:grid-cols-6',
  7: '@3xl:grid-cols-4 @6xl:grid-cols-7',
  8: '@3xl:grid-cols-4 @6xl:grid-cols-8',
};

export function Included({ m }: { m: LawatanModel }) {
  const { included } = m;
  const items = m.items('included');
  const excluded = text(included, 'excluded');
  return (
    <TemplateSection sectionKey="included" className={`${SECTION_PAD} ${C.white}`}>
      <div className={WRAP}>
        <SectionHead eyebrow={text(included, 'eyebrow')} number={m.number('included')} title={text(included, 'title')} subtitle={text(included, 'subtitle')} srTitle="Yang termasuk" />
        {/* Judul ubin ("Dokumentasi" ± 6,3 × ukuran huruf) selalu di dalam bingkai putus-putus: HP sempit (< 384px) celah
            8px, bingkai dalam 12px, huruf 14,5–18px mengikuti lebar (4,6cqw); 6 kolom 1152–1279px bingkai 16px + huruf 17px.
            Kata CMS yang tetap terlalu panjang dipatahkan, tidak meluber. */}
        <ul className={`mt-10 grid grid-cols-2 gap-2 @sm:gap-3 @3xl:mt-14 @3xl:gap-4 ${COLS[items.length] ?? COLS[6]}`}>
          {items.map((item, i) => (
            <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i, 60)} className="min-w-0">
              <div className="h-full rounded-[16px] bg-[#FBF6EE] p-1.5">
                <div className="flex h-full flex-col rounded-[11px] border border-dashed border-(--tpl-accent)/45 p-3 @sm:p-4 @3xl:p-5 @6xl:p-4 @7xl:p-5">
                  <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-full bg-(--tpl-accent) text-(--tpl-on-accent)">
                    <IncludeIcon title={field(item, 'title')} className="h-5 w-5" />
                  </span>
                  <h3 className={`mt-4 break-words ${DISPLAY} text-[clamp(14.5px,4.6cqw,18px)] font-bold leading-[1.2] tracking-[-0.01em] @6xl:text-[17px] @7xl:text-[18px] ${C.ink}`}>
                    {field(item, 'title')}
                  </h3>
                  {field(item, 'text') && <p className={`mt-1.5 text-[14px] leading-snug ${C.muted}`}>{field(item, 'text')}</p>}
                </div>
              </div>
            </Reveal>
          ))}
        </ul>
        {excluded && (
          <Reveal as="p" delay={120} className={`mt-6 flex items-start gap-2.5 text-[14.5px] leading-snug @3xl:mt-8 ${C.muted}`}>
            <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-(--lw-ink)" strokeWidth={1.8} />
            {excluded}
          </Reveal>
        )}
      </div>
    </TemplateSection>
  );
}
