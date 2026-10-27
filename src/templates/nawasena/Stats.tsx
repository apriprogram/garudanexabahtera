// Statistik sekolah (kunci `stats`): pita navy yang melanjutkan hero + strip pengumuman tanpa sambungan. Baris atas:
// H2 serif kecil di kiri, keterangan periode data (mono) di kanan. Baris bawah: hingga 6 angka serif besar yang
// menghitung naik sekali saat terlihat (<CountUp>), dipisah garis tegak tipis putih 10% (bukan kotak); HP 2 kolom × 3.
import { CountUp, Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import type { NawasenaModel } from './model';
import { TYPE_N } from './styles';

/** Kolom grid layar lebar per jumlah angka (kelas utuh agar terbaca Tailwind). */
const DESK_COLS: Record<number, string> = {
  1: '@6xl:grid-cols-1',
  2: '@6xl:grid-cols-2',
  3: '@6xl:grid-cols-3',
  4: '@6xl:grid-cols-4',
  5: '@6xl:grid-cols-5',
  6: '@6xl:grid-cols-6',
};

/** Garis pemisah tegak per posisi: HP 2 kolom, tablet 3 kolom, layar lebar satu baris. */
const divider = (i: number) =>
  [
    i % 2 === 1 ? 'border-l pl-5' : 'pl-0',
    i % 3 === 0 ? '@3xl:border-l-0 @3xl:pl-0' : '@3xl:border-l @3xl:pl-6',
    i === 0 ? '@6xl:border-l-0 @6xl:pl-0' : '@6xl:border-l @6xl:pl-6 @7xl:pl-8',
  ].join(' ');

export function Stats({ m }: { m: NawasenaModel }) {
  const { stats } = m;
  const items = m.items('stats');
  const title = text(stats, 'title');
  const note = text(stats, 'note');
  return (
    <TemplateSection sectionKey="stats" data-tpl-tone="inverse" className="bg-(--nw-navy) pb-14 pt-12 text-white @5xl:pb-16 @5xl:pt-14">
      <div className={CONTAINER}>
        <div className="flex flex-col gap-3 @4xl:flex-row @4xl:items-end @4xl:justify-between @4xl:gap-10">
          {/* H2 wajib ada (satu per section); tanpa judul → untuk pembaca layar saja */}
          <h2 className={title ? `max-w-[28ch] text-balance text-white ${TYPE_N.h2Small}` : 'sr-only'}>{title || 'Statistik sekolah'}</h2>
          {note && <p className={`${TYPE_N.mono} text-white/[0.72] @4xl:text-right`}>{note}</p>}
        </div>
        <Reveal as="dl" className={`mt-8 grid grid-cols-2 gap-y-0 @3xl:mt-10 @3xl:grid-cols-3 ${DESK_COLS[items.length] ?? '@6xl:grid-cols-6'}`}>
          {items.map((item, i) => (
            <div
              key={`${field(item, 'label')}-${i}`}
              className={`flex min-w-0 flex-col border-t border-white/10 py-6 @6xl:border-t-0 @6xl:py-2 ${divider(i)}`}
            >
              {/* dt lebih dulu di DOM (urutan dl yang benar), tampil di bawah angka */}
              <dt className="order-2 mt-3 text-[14px] font-medium leading-snug text-white/[0.86]">{field(item, 'label')}</dt>
              <dd className={`order-1 text-white ${TYPE_N.stat}`}>
                <CountUp value={field(item, 'value')} duration={1600} />
              </dd>
              {field(item, 'note') && <dd className="order-3 mt-1 text-balance text-[12.5px] leading-snug text-white/[0.72]">{field(item, 'note')}</dd>}
            </div>
          ))}
        </Reveal>
      </div>
    </TemplateSection>
  );
}
