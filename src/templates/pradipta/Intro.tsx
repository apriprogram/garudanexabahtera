// Akses cepat (kunci `quicklinks`) + statistik sekolah (kunci `stats`).
// Akses cepat: empat ubin besar biru langit di pita putih tepat di bawah hero (H2 hanya untuk pembaca layar). Ubin =
// satu tautan: bulatan ikon putih (ikon dari judul), judul, teks singkat, dan bulatan panah warna tema yang bergeser saat
// disorot; latar ubin bergeser satu nada. Ubin layanan yang tautannya belum diisi (mis. E-Learning, PPID) = tombol
// (aria-expanded) berbulatan "+" yang membuka SATU panel catatan dari CMS di bawah deret, dengan tombol Tutup yang
// mengembalikan fokus; tanpa catatan → ubin diam tanpa bulatan. HP: 2×2, teks singkat disembunyikan.
// Statistik: pita langit, kepala section (judul kiri, deskripsi kanan), lalu angka di GELEMBUNG putih bulat yang
// menghitung naik saat terlihat (CountUp), catatan kecil di bawah gelembung, dan keterangan periode data di tengah.
import { ArrowRight, Info, Plus, X } from 'lucide-react';
import { useId, useRef, useState, type CSSProperties } from 'react';
import { CountUp, Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import { titleTarget, type PradiptaModel } from './model';
import { BAND, C, DISPLAY, SECTION_PAD, STAT_SIZE, TYPE_P } from './styles';
import { Head, TitleIcon } from './ui';

/** Bulatan aksi warna tema di sudut ubin (panah = tautan, plus = membuka catatan). */
const TILE_DOT =
  'absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-(--tpl-accent) text-(--tpl-on-accent) @3xl:bottom-6 @3xl:right-6 @3xl:top-auto @3xl:h-10 @3xl:w-10';
const TILE = 'pd-tile group relative flex h-full min-h-[156px] w-full flex-col rounded-[20px] bg-(--pd-sky) p-4 text-left @3xl:p-6 @5xl:min-h-[188px]';

export function QuickLinks({ m }: { m: PradiptaModel }) {
  const items = m.items('quicklinks');
  const note = text(m.quicklinks, 'pending_note');
  const [open, setOpen] = useState<number | null>(null);
  const baseId = useId();
  const noteId = `${baseId}-catatan`;
  const buttons = useRef<Record<number, HTMLButtonElement | null>>({});
  if (items.length === 0) return null;

  /** Tutup catatan dan kembalikan fokus ke ubin yang membukanya. */
  const close = () => {
    const i = open;
    setOpen(null);
    if (i !== null) buttons.current[i]?.focus();
  };

  return (
    <TemplateSection sectionKey="quicklinks" className="bg-white pb-12 pt-6 @3xl:pb-16 @5xl:pt-10">
      <div className={CONTAINER}>
        <h2 className="sr-only">{text(m.quicklinks, 'title') || 'Akses cepat'}</h2>
        <Reveal as="ul" className="grid grid-cols-2 gap-3 @3xl:gap-4 @5xl:grid-cols-4">
          {items.map((item, i) => {
            const title = field(item, 'title');
            const target = titleTarget(title, m.shown);
            const action = m.linkOr(field(item, 'url'), target ? { kind: 'section', target } : null);
            const titleId = `${baseId}-judul-${i}`;
            const textId = `${baseId}-teks-${i}`;
            const icon = (
              <span
                aria-hidden
                className="pd-tile-icon flex h-11 w-11 items-center justify-center rounded-full bg-white text-(--pd-ink) @3xl:h-[52px] @3xl:w-[52px]"
              >
                <TitleIcon title={title} index={i} className="h-5 w-5 @3xl:h-[22px] @3xl:w-[22px]" />
              </span>
            );
            const titleClass = `${DISPLAY} text-[16px] font-semibold leading-snug tracking-[-0.01em] @3xl:text-[19px] ${C.ink}`;
            const textClass = `mt-1.5 hidden text-pretty text-[14.5px] leading-snug @xl:block ${C.body}`;
            if (action)
              return (
                <li key={`${title}-${i}`}>
                  <ActionLink action={action} className={`${TILE} transition-colors duration-200 hover:bg-(--pd-sky2)`}>
                    {icon}
                    <div className="mt-auto pt-6 [overflow-wrap:anywhere] @3xl:pr-12">
                      <h3 className={titleClass}>{title}</h3>
                      {field(item, 'text') && <p className={textClass}>{field(item, 'text')}</p>}
                    </div>
                    <span aria-hidden className={TILE_DOT}>
                      <ArrowRight className="pd-nudge h-4 w-4" strokeWidth={2.2} />
                    </span>
                  </ActionLink>
                </li>
              );
            // Tanpa tautan + ada catatan CMS → tombol buka-tutup catatan (tidak menjanjikan pindah halaman); H3 membungkus
            // tombol (judul = nama tombol, teks singkat = deskripsinya)
            if (note)
              return (
                <li key={`${title}-${i}`}>
                  <h3 className="h-full">
                    <button
                      ref={(el) => {
                        buttons.current[i] = el;
                      }}
                      type="button"
                      aria-expanded={open === i}
                      aria-controls={noteId}
                      aria-labelledby={titleId}
                      aria-describedby={field(item, 'text') ? textId : undefined}
                      onClick={() => setOpen(open === i ? null : i)}
                      className={`${TILE} transition-colors duration-200 hover:bg-(--pd-sky2) ${open === i ? 'bg-(--pd-sky2)' : ''}`}
                    >
                      {icon}
                      <span className="mt-auto block pt-6 [overflow-wrap:anywhere] @3xl:pr-12">
                        <span id={titleId} className={`block ${titleClass}`}>
                          {title}
                        </span>
                        {field(item, 'text') && (
                          <span id={textId} className={textClass}>
                            {field(item, 'text')}
                          </span>
                        )}
                      </span>
                      <span aria-hidden className={TILE_DOT}>
                        <Plus className={`pd-turn h-4 w-4 ${open === i ? 'rotate-45' : ''}`} strokeWidth={2.2} />
                      </span>
                    </button>
                  </h3>
                </li>
              );
            return (
              <li key={`${title}-${i}`}>
                <div className={TILE}>
                  {icon}
                  <div className="mt-auto pt-6 [overflow-wrap:anywhere] @3xl:pr-12">
                    <h3 className={titleClass}>{title}</h3>
                    {field(item, 'text') && <p className={textClass}>{field(item, 'text')}</p>}
                  </div>
                </div>
              </li>
            );
          })}
        </Reveal>
        {note && (
          // Buka-tutup biasa (aria-expanded/aria-controls di ubin), bukan wilayah live; satu panel untuk semua ubin
          <div id={noteId} hidden={open === null} className="pd-step mt-3 rounded-[20px] bg-(--pd-sky) p-4 @3xl:mt-4 @3xl:px-6 @3xl:py-5">
            <div className="flex items-start gap-3">
              <Info aria-hidden className="mt-0.5 hidden h-5 w-5 shrink-0 text-(--pd-ink) @xl:block" />
              <p className={`min-w-0 flex-1 text-pretty text-[14.5px] leading-relaxed ${C.body}`}>
                {open !== null && <strong className={`font-semibold ${C.ink}`}>{field(items[open], 'title')}: </strong>}
                {note}
              </p>
              <button
                type="button"
                onClick={close}
                className="-my-2 inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold text-(--pd-ink) transition-colors duration-200 hover:bg-(--pd-sky2)"
              >
                <X aria-hidden className="h-4 w-4" />
                Tutup
              </button>
            </div>
          </div>
        )}
      </div>
    </TemplateSection>
  );
}

export function Stats({ m }: { m: PradiptaModel }) {
  const { stats } = m;
  const items = m.items('stats');
  const tone = m.tone('stats');
  const note = text(stats, 'note');
  /** Panjang nilai terpanjang (min. 4): dasar ukuran muat angka */
  const fitChars = Math.max(4, ...items.map((item) => field(item, 'value').length));
  return (
    <TemplateSection sectionKey="stats" className={`${SECTION_PAD} ${BAND[tone]}`}>
      <div className={CONTAINER}>
        <Head
          sectionKey="stats"
          eyebrow={text(stats, 'eyebrow')}
          title={text(stats, 'title')}
          fallback="Statistik sekolah"
          subtitle={text(stats, 'subtitle')}
          tone={tone}
        />
        {/* Ukuran angka: langkah 28/38/44px (STAT_SIZE, di luar gelembung) dibatasi ukuran muat dari nilai TERPANJANG
            (--pd-fit, satuan cqi gelembung): nilai 10 karakter dari CMS tetap di dalam lingkaran, semua angka seukuran */}
        <ul
          style={{ '--pd-fit': `calc((100cqi - 28px) / ${(fitChars * 0.6).toFixed(2)})` } as CSSProperties}
          className={`mt-10 grid grid-cols-2 gap-x-4 gap-y-6 @3xl:mt-12 @3xl:grid-cols-3 @3xl:gap-6 @6xl:grid-cols-6 ${STAT_SIZE}`}
        >
          {items.map((item, i) => (
            <Reveal as="li" key={`${field(item, 'label')}-${i}`} variant="scale" delay={stagger(i, 70)} className="flex min-w-0 flex-col items-center text-center">
              <div
                className={`flex aspect-square w-full max-w-[140px] flex-col items-center justify-center rounded-full px-3 [container-type:inline-size] @xl:max-w-[184px] @xl:px-4 ${tone === 'sky' ? 'bg-white' : 'bg-(--pd-sky)'}`}
              >
                <p className={`${TYPE_P.stat} text-(--pd-ink)`}>
                  <CountUp value={field(item, 'value')} duration={1600} />
                </p>
                {/* Keterangan selalu setinggi dua baris: angka di semua gelembung sejajar */}
                <p className={`mt-2 line-clamp-2 min-h-[2.75em] max-w-[13ch] text-balance text-(length:--pd-stat-label) font-medium leading-snug ${C.body}`}>
                  {field(item, 'label')}
                </p>
              </div>
              {field(item, 'note') && <p className={`mt-3 text-[12.5px] leading-snug ${C.muted}`}>{field(item, 'note')}</p>}
            </Reveal>
          ))}
        </ul>
        {note && (
          <Reveal as="p" delay={200} className={`mt-10 flex items-center justify-center gap-2 text-center text-[13px] ${C.muted}`}>
            <Info aria-hidden className="h-4 w-4 shrink-0" />
            {note}
          </Reveal>
        )}
      </div>
    </TemplateSection>
  );
}
