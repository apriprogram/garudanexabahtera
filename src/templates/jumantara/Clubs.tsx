// Ekstrakurikuler (kunci `clubs`): label + H2 + deskripsi, deret tombol saring kategori (aria-pressed; aktif = warna
// tema, lainnya putih bergaris rambut; turun baris bila tidak muat), lalu kartu putih bergaris rambut: ikon otomatis di
// kotak tint, nama, kategori, jadwal, keterangan. Setelah disaring, kartu muncul bergiliran (.jm-pop, hanya bila gerak
// menyala). Catatan kecil di bawah (mis. kegiatan lain yang tidak ditampilkan).
import { Clock } from 'lucide-react';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import { clubCategories, filterByCategory, type JumantaraModel } from './model';
import { C, CARD, LINE, SECTION_PAD, TYPE_J } from './styles';
import { SectionHead, SectionRule, TitleIcon } from './ui';

export function Clubs({ m }: { m: JumantaraModel }) {
  const { clubs } = m;
  const items = m.items('clubs');
  const [category, setCategory] = useState<string | null>(null);
  if (items.length === 0) return null;
  const categories = clubCategories(items);
  const active = category && categories.includes(category) ? category : null;
  const shown = filterByCategory(items, active);
  const allLabel = text(clubs, 'all_label') || 'Semua';
  const footnote = text(clubs, 'footnote');

  return (
    <TemplateSection sectionKey="clubs" className={`relative ${SECTION_PAD}`}>
      <SectionRule show={m.ruleAbove('clubs')} />
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(clubs, 'eyebrow')} title={text(clubs, 'title')} fallback="Ekstrakurikuler" subtitle={text(clubs, 'subtitle')} />
        {categories.length > 1 && (
          <Reveal delay={200} className="mt-8">
            {/* Tombol saring turun baris bila tidak muat (di HP 2–3 baris), jadi semua kategori selalu terlihat */}
            <div role="group" aria-label="Saring ekstrakurikuler" className="flex flex-wrap gap-2">
              {[null, ...categories].map((c) => {
                const pressed = c === active;
                return (
                  <button
                    key={c ?? 'semua'}
                    type="button"
                    aria-pressed={pressed}
                    onClick={() => setCategory(c)}
                    className={`h-11 shrink-0 rounded-[8px] border px-4 text-[14px] font-semibold transition-colors duration-200 ${
                      pressed ? 'border-transparent bg-(--tpl-accent) text-(--tpl-on-accent)' : `bg-white ${C.ink} ${LINE} hover:border-(--jm-line)`
                    }`}
                  >
                    {c ?? allLabel}
                  </button>
                );
              })}
            </div>
          </Reveal>
        )}
        <p className="sr-only" role="status">
          {active ? `${shown.length} kegiatan kategori ${active}` : ''}
        </p>
        <Reveal delay={120} className="mt-8">
          {/* Kunci = kategori: kartu dipasang ulang agar animasi muncul diputar setiap filter diganti */}
          <ul key={active ?? 'semua'} data-filtered={category !== null ? 'true' : 'false'} className="grid gap-4 @xl:grid-cols-2 @4xl:grid-cols-3 @6xl:grid-cols-4">
            {shown.map((item, i) => {
              const name = field(item, 'name');
              const schedule = field(item, 'schedule');
              return (
                <li key={`${name}-${i}`} className="jm-pop min-w-0" style={{ '--jm-delay': `${Math.min(i, 6) * 30}ms` } as CSSProperties}>
                  <article className={`flex h-full flex-col p-4 @xl:p-5 ${CARD.white} hover:border-(--jm-line)`}>
                    {/* HP: ikon di samping nama (kartu lebih ringkas); layar ≥ @xl: ikon di atas */}
                    <div className="flex items-center gap-3.5 @xl:block">
                      <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-(--jm-tint) text-(--jm-ink)">
                        <TitleIcon title={name} index={i} className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 @xl:mt-5">
                        <h3 className={`${C.ink} ${TYPE_J.h3}`}>{name}</h3>
                        {field(item, 'category') && <p className={`mt-1 text-[12px] font-semibold uppercase tracking-[0.1em] ${C.muted}`}>{field(item, 'category')}</p>}
                      </div>
                    </div>
                    {field(item, 'text') && <p className={`mt-3 text-[14.5px] leading-relaxed ${C.muted}`}>{field(item, 'text')}</p>}
                    {schedule && (
                      <>
                        <div aria-hidden className="min-h-4 flex-1" />
                        <p className={`flex items-center gap-1.5 border-t pt-3 text-[13.5px] font-medium ${C.ink} ${LINE}`}>
                          <Clock aria-hidden className="h-3.5 w-3.5 shrink-0 text-(--jm-ink)" />
                          {schedule}
                        </p>
                      </>
                    )}
                  </article>
                </li>
              );
            })}
          </ul>
        </Reveal>
        {footnote && <p className={`mt-6 max-w-[80ch] ${TYPE_J.small} ${C.muted}`}>{footnote}</p>}
      </div>
    </TemplateSection>
  );
}
