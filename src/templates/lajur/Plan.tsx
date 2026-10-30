// Harga termasuk (kunci `included`, abu hangat) + Cara sewa (kunci `steps`, putih).
// Harga: kiri (1-4) kepala section, tabel ringkas "Harga mulai · contoh" per jenis bus (dari data Armada: ikon bus,
// kelas & kursi, harga Unbounded + satuan; tautan "Lihat armada") — menu "Harga" langsung menunjukkan angka — lalu
// catatan harga bergaris amber; kanan (5-12) dua kartu putih: "Termasuk" (kotak tinta + centang amber) dan "Belum
// termasuk" (kotak garis + minus, keterangan singkat "sesuai kesepakatan"). HP bertumpuk.
// Cara sewa: langkah bernomor (kotak tinta + angka Unbounded amber) yang dihubungkan garis lajur putus-putus — mendatar di
// layar lebar, tegak di HP — tergambar SEKALI saat masuk layar (≤ 1,6 dtk); ikon bus kecil parkir di langkah pertama.
import { Check, Info, Minus } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Reveal } from '../shared/Animated';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import { NBSP, formatRupiah, includedItems, pad2, type LajurModel } from './model';
import { C, CARD, DISPLAY, GRID_GAP, LABEL_SM, SECTION_PAD, TYPE, WRAP } from './styles';
import { SectionHead, TextLink } from './ui';
import { BusGlyph } from './vehicles';

/** Sel harga: baris sendiri (menjorok selebar ikon) di kolom sempit, sebaris di kanan bila kolomnya lebar. */
const PRICE_CELL = 'basis-full pl-11 @2xl:basis-auto @2xl:pl-0 @5xl:basis-full @5xl:pl-11 @min-[90rem]:basis-auto @min-[90rem]:pl-0';

/** Harga mulai per jenis bus (data Armada). Tanpa bus berharga → tidak dirender. */
function PriceList({ m }: { m: LajurModel }) {
  if (!m.fleet.some((u) => u.price > 0)) return null;
  return (
    <Reveal delay={160} className="mt-8">
      <p className={`flex items-center gap-2 ${LABEL_SM} ${C.muted}`}>
        Harga mulai
        <span className="rounded-[4px] bg-white px-1.5 py-0.5 text-[10.5px] tracking-[0.1em] text-[#14161A] ring-1 ring-inset ring-[#14161A]/15">contoh</span>
      </p>
      <ul aria-label="Harga mulai per jenis bus" className={`mt-3 divide-y border-y ${C.line} ${C.divide}`}>
        {m.fleet.map((u) => (
          <li key={u.index} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
            <span className="flex min-w-0 items-center gap-3">
              {/* Kotak ikon selebar ikon big bus: nama kelas sejajar di semua baris */}
              <span aria-hidden className="flex w-8 shrink-0 items-center">
                <BusGlyph size={u.size} />
              </span>
              <span className={`text-[15px] font-medium ${C.ink}`}>
                {u.name} · {u.seats} kursi
              </span>
            </span>
            {/* Kolom sempit (HP, 1024–1439px): harga di baris kedua sejajar nama; cukup lebar: satu baris, harga di kanan */}
            {u.price > 0 ? (
              <span className={`${PRICE_CELL} whitespace-nowrap ${C.ink}`}>
                <span className={`${DISPLAY} text-[16px] font-bold tabular-nums tracking-[-0.01em]`}>{formatRupiah(u.price)}</span>
                {u.priceUnit && <span className={`ml-1.5 text-[13.5px] ${C.muted}`}>{u.priceUnit.split(' ').join(NBSP)}</span>}
              </span>
            ) : (
              <span className={`${PRICE_CELL} text-[14px] ${C.muted}`}>Harga menyusul</span>
            )}
          </li>
        ))}
      </ul>
      <TextLink action={m.sectionAction('fleet')} label="Lihat armada" className="mt-2" />
    </Reveal>
  );
}

export function Included({ m }: { m: LajurModel }) {
  const section = m.included;
  const yes = includedItems(section, 'included');
  const no = includedItems(section, 'excluded');
  const note = text(section, 'note');
  const both = yes.length > 0 && no.length > 0;
  return (
    <TemplateSection sectionKey="included" className={`${SECTION_PAD} ${C.grey}`}>
      <div className={`${WRAP} grid grid-cols-1 gap-y-10 @5xl:grid-cols-12 ${GRID_GAP}`}>
        <div className="min-w-0 @5xl:col-span-4">
          <SectionHead layout="stack" eyebrow={text(section, 'eyebrow')} index={m.numbers.included} title={text(section, 'title')} subtitle={text(section, 'subtitle')} srTitle="Harga termasuk" />
          <PriceList m={m} />
          {note && (
            <Reveal delay={200} className="mt-8 flex gap-3 border-l-[3px] border-(--tpl-accent) py-1 pl-4">
              <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-(--lj-ink)" strokeWidth={2} />
              <p className={`text-[14px] leading-snug ${C.ink}`}>{note}</p>
            </Reveal>
          )}
        </div>
        {/* items-start: tiap kartu setinggi isinya (tidak direntang setinggi kolom kiri → tanpa blok putih kosong) */}
        <div className={`grid min-w-0 items-start gap-4 @5xl:col-span-8 @5xl:gap-5 ${both ? '@3xl:grid-cols-2' : ''}`}>
          {yes.length > 0 && (
            <Reveal className={`${CARD} p-5 @3xl:p-7`}>
              <h3 className={`${TYPE.h3} ${C.ink}`}>{text(section, 'included_title') || 'Termasuk'}</h3>
              <ul className={`mt-5 divide-y ${C.divide}`}>
                {yes.map((item, i) => (
                  <li key={`${field(item, 'text')}-${i}`} className="flex items-center gap-3.5 py-3">
                    <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-[#14161A] text-(--lj-bright)">
                      <Check className="h-4 w-4" strokeWidth={2.6} />
                    </span>
                    <span className={`text-[15.5px] font-medium ${C.ink}`}>{field(item, 'text')}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          )}
          {no.length > 0 && (
            <Reveal delay={120} className={`${CARD} p-5 @3xl:p-7`}>
              <h3 className={`${TYPE.h3} ${C.ink}`}>{text(section, 'excluded_title') || 'Belum termasuk'}</h3>
              <ul className={`mt-5 divide-y ${C.divide}`}>
                {no.map((item, i) => (
                  <li key={`${field(item, 'text')}-${i}`} className="flex items-center gap-3.5 py-3">
                    <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] text-[#14161A]/60 ring-1 ring-inset ring-[#14161A]/25">
                      <Minus className="h-4 w-4" strokeWidth={2.4} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3">
                      <span className={`text-[15.5px] font-medium ${C.ink}`}>{field(item, 'text')}</span>
                      {field(item, 'note') && <span className={`text-[13.5px] ${C.muted}`}>{field(item, 'note')}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}

const COLS: Record<number, string> = { 1: '@5xl:grid-cols-1', 2: '@5xl:grid-cols-2', 3: '@5xl:grid-cols-3', 4: '@5xl:grid-cols-4', 5: '@5xl:grid-cols-5' };

export function Steps({ m }: { m: LajurModel }) {
  const section = m.steps;
  const items = m.items('steps');
  return (
    <TemplateSection sectionKey="steps" className={`${SECTION_PAD} ${C.white}`}>
      <div className={WRAP}>
        <SectionHead eyebrow={text(section, 'eyebrow')} index={m.numbers.steps} title={text(section, 'title')} subtitle={text(section, 'subtitle')} srTitle="Cara sewa" />
        <Reveal variant="fade" className="lj-steps-draw relative mt-12 @3xl:mt-14">
          {items.length > 1 && (
            // Layar lebar: dari tengah kotak langkah pertama sampai tengah kotak langkah terakhir (n kolom, jarak 40px)
            <span
              aria-hidden
              className="lj-steps-line absolute bottom-10 left-[27px] top-7 w-[2px] @5xl:bottom-auto @5xl:left-8 @5xl:top-[31px] @5xl:h-[2px] @5xl:w-(--lj-steps-w)"
              style={{ '--lj-steps-w': `calc((100% + 40px) * ${(Math.min(items.length, 5) - 1) / Math.min(items.length, 5)})` } as CSSProperties}
            />
          )}
          {items.length > 1 && <BusGlyph size="big" className="absolute left-[78px] top-[13px] hidden h-[18px] w-auto @5xl:block" />}
          <ol className={`relative grid gap-y-8 ${GRID_GAP} ${COLS[Math.min(items.length, 5)] ?? '@5xl:grid-cols-4'}`}>
            {items.map((item, i) => (
              <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i, 90)} className="relative flex min-w-0 gap-5 @5xl:block">
                <span
                  aria-hidden
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] bg-[#14161A] ${DISPLAY} text-[18px] font-bold tabular-nums text-(--lj-bright) @5xl:h-16 @5xl:w-16 @5xl:text-[20px]`}
                >
                  {pad2(i + 1)}
                </span>
                <div className="min-w-0 pt-1 @5xl:mt-6 @5xl:pt-0">
                  <h3 className={`${TYPE.h3} ${C.ink}`}>{field(item, 'title')}</h3>
                  {field(item, 'text') && <p className={`mt-2 max-w-[38ch] text-pretty ${TYPE.body} ${C.muted}`}>{field(item, 'text')}</p>}
                </div>
              </Reveal>
            ))}
          </ol>
        </Reveal>
      </div>
    </TemplateSection>
  );
}
