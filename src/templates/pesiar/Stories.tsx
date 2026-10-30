// Sudah & belum termasuk (kunci `included`, pita PASIR) + Cerita tamu (kunci `testimonials`, PUTIH).
// Termasuk: kepala section bertumpuk di kiri (1-4, ≥ 1280px; lebih sempit: di atas), dua kolom Playfair di kanan (6-12): "Sudah termasuk" dengan centang
// bulat hijau tua, "Belum termasuk" dengan tanda minus bergaris; baris bergaris rambut.
// Cerita tamu: SATU kutipan besar Playfair miring sekaligus (kiri 1-8) dengan nama + keterangan, kanan (9-12) daftar nama
// tamu sebagai tab (role=tablist; panah/Home/End) + tombol sebelumnya/berikutnya bulat 44px. HP & tablet (< 1024px):
// daftar nama tidak ditampilkan (nama tamu aktif sudah tertulis di bawah kutipan) — tombol sebelumnya/berikutnya +
// "1 / 4" langsung di bawah kutipan. Tanpa putar otomatis; kutipan berganti dengan pudar ≤ 300 ms (./pesiar.css). Tanpa
// foto wajah (inisial), nama tamu fiktif.
import { Check, ChevronLeft, ChevronRight, Minus, Quote } from 'lucide-react';
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Reveal } from '../shared/Animated';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, initials, text } from '../shared/utils';
import { textItems, type PesiarModel } from './model';
import { C, GRID_GAP, SECTION_PAD, SERIF, TYPE, WRAP } from './styles';
import { SectionHead } from './ui';

export function Included({ m }: { m: PesiarModel }) {
  const { included } = m;
  const yes = textItems(included, 'yes', 8);
  const no = textItems(included, 'no', 8);
  const columns = [
    { key: 'yes', title: text(included, 'yes_title') || 'Sudah termasuk', items: yes, yes: true },
    { key: 'no', title: text(included, 'no_title') || 'Belum termasuk', items: no, yes: false },
  ].filter((c) => c.items.length > 0);
  return (
    <TemplateSection sectionKey="included" className={`${SECTION_PAD} ${C.sand}`}>
      {/* Kepala di kiri mulai 1280px; di bawahnya kepala di atas dan dua kolom selebar penuh (tidak berdesakan di 1024px) */}
      <div className={`${WRAP} grid grid-cols-1 gap-y-10 @7xl:grid-cols-12 ${GRID_GAP}`}>
        <div className="min-w-0 @7xl:col-span-4">
          <SectionHead layout="stack" number={m.number('included')} eyebrow={text(included, 'eyebrow')} title={text(included, 'title')} subtitle={text(included, 'subtitle')} srTitle="Sudah & belum termasuk" />
        </div>
        <div className={`grid min-w-0 gap-x-10 gap-y-10 @3xl:grid-cols-2 @7xl:col-span-7 @7xl:col-start-6 @7xl:pt-3`}>
          {columns.map((col) => (
            <div key={col.key} className="min-w-0">
              <h3 className={`${TYPE.h3} ${C.ink}`}>{col.title}</h3>
              <ul className={`mt-5 divide-y border-y ${C.line} ${C.divide}`}>
                {col.items.map((item, i) => (
                  <Reveal as="li" key={`${item}-${i}`} delay={stagger(i, 50)} className="flex items-center gap-4 py-4">
                    <span
                      aria-hidden
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${col.yes ? 'bg-[#17332B] text-[#F5EFE6]' : `ring-1 ring-inset ring-[#1E2622]/35 ${C.muted}`}`}
                    >
                      {col.yes ? <Check className="h-4 w-4" strokeWidth={2.2} /> : <Minus className="h-4 w-4" strokeWidth={2.2} />}
                    </span>
                    <span className={`${SERIF} text-[19px] leading-snug @3xl:text-[21px] ${col.yes ? C.ink : 'text-[#3E4842]'}`}>{item}</span>
                  </Reveal>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </TemplateSection>
  );
}

export function Testimonials({ m }: { m: PesiarModel }) {
  const { testimonials } = m;
  const items = m.items('testimonials');
  const baseId = useId();
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.min(active, items.length - 1);
  const item = items[index];
  const many = items.length > 1;
  const tabId = (i: number) => `${baseId}-tab-${i}`;
  const panelId = `${baseId}-panel`;

  const go = (i: number, focus = true) => {
    const next = (i + items.length) % items.length;
    setActive(next);
    if (focus) tabs.current[next]?.focus();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = { ArrowDown: index + 1, ArrowRight: index + 1, ArrowUp: index - 1, ArrowLeft: index - 1, Home: 0, End: items.length - 1 };
    if (!(e.key in moves)) return;
    e.preventDefault();
    go(moves[e.key]);
  };

  return (
    <TemplateSection sectionKey="testimonials" className={`${SECTION_PAD} ${C.white}`}>
      <div className={WRAP}>
        <SectionHead number={m.number('testimonials')} eyebrow={text(testimonials, 'eyebrow')} title={text(testimonials, 'title')} srTitle="Cerita tamu" />
        <div className={`mt-10 grid grid-cols-1 gap-y-8 @3xl:mt-14 @5xl:grid-cols-12 @5xl:gap-y-10 ${GRID_GAP}`}>
          <Reveal className="min-w-0 @5xl:col-span-8">
            <div id={panelId} role={many ? 'tabpanel' : undefined} aria-labelledby={many ? tabId(index) : undefined} className="relative">
              <Quote aria-hidden className={`h-10 w-10 ${C.accent}`} strokeWidth={1.2} />
              <figure key={index} className="ps-quote mt-5">
                {/* ≥ 1536px: kutipan 46px & 34ch (mengisi kolom 1-8, tanpa celah kosong di tengah pita) */}
                <blockquote className={`max-w-[30ch] @min-[96rem]:max-w-[34ch] ${TYPE.quote} ${C.ink}`}>{field(item, 'quote')}</blockquote>
                {(field(item, 'name') || field(item, 'place')) && (
                  <figcaption className="mt-8 flex items-center gap-3.5">
                    <span aria-hidden className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F5EFE6] ${SERIF} text-[19px] font-medium italic ${C.ink}`}>
                      {/* Nama satu kata ("Rina") → satu huruf; dua kata → dua huruf */}
                      {initials(field(item, 'name'), '?').slice(0, /\s/.test(field(item, 'name')) ? 2 : 1)}
                    </span>
                    <span className="text-[14.5px] leading-snug">
                      {field(item, 'name') && <span className={`block font-semibold ${C.ink}`}>{field(item, 'name')}</span>}
                      {field(item, 'place') && <span className={`block ${C.muted}`}>{field(item, 'place')}</span>}
                    </span>
                  </figcaption>
                )}
              </figure>
            </div>
          </Reveal>
          {many && (
            <Reveal delay={120} className="min-w-0 @5xl:col-span-4 @5xl:self-end">
              {/* Daftar nama hanya di samping kutipan (≥ 1024px); di HP nama aktif sudah ada di bawah kutipan */}
              <div role="tablist" aria-label="Pilih cerita tamu" aria-orientation="vertical" onKeyDown={onKeyDown} className={`hidden border-t @5xl:block ${C.line}`}>
                {items.map((t, i) => {
                  const selected = i === index;
                  return (
                    <button
                      key={`${field(t, 'name')}-${i}`}
                      ref={(el) => {
                        tabs.current[i] = el;
                      }}
                      id={tabId(i)}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      aria-controls={panelId}
                      tabIndex={selected ? 0 : -1}
                      onClick={() => setActive(i)}
                      className={`flex min-h-14 w-full items-center gap-3 border-b py-3 text-left transition-colors duration-200 ${C.line} ${selected ? C.ink : 'text-[#1E2622]/70 hover:text-[#1E2622]'}`}
                    >
                      <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${selected ? 'bg-(--tpl-accent)' : 'bg-[#1E2622]/25'}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15.5px] font-semibold">{field(t, 'name') || `Tamu ${i + 1}`}</span>
                        {field(t, 'place') && <span className={`block truncate text-[13px] ${selected ? C.muted : 'text-[#5A6560]/90'}`}>{field(t, 'place')}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 @5xl:mt-6">
                <button type="button" onClick={() => go(index - 1, false)} aria-label="Cerita sebelumnya" className="flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-inset ring-[#1E2622]/30 transition-colors hover:bg-[#1E2622] hover:text-white">
                  <ChevronLeft aria-hidden className="h-5 w-5" />
                </button>
                <button type="button" onClick={() => go(index + 1, false)} aria-label="Cerita berikutnya" className="flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-inset ring-[#1E2622]/30 transition-colors hover:bg-[#1E2622] hover:text-white">
                  <ChevronRight aria-hidden className="h-5 w-5" />
                </button>
                <p className={`ml-2 text-[13.5px] tabular-nums ${C.muted}`} aria-live="polite">
                  {index + 1} / {items.length}
                </p>
              </div>
            </Reveal>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}
