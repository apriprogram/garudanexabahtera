// Ekstrakurikuler (kunci `studentlife`) + prestasi (kunci `achievements`).
// Ekstrakurikuler: kepala section dengan tombol saring kategori (aria-pressed, rel geser di HP), lalu kartu putih:
// bulatan ikon (dari nama/kategori) atau foto 4:3 bila diisi, nama, chip kategori, jadwal, dan penjelasan. Saring →
// kartu muncul pelan (.pd-pop, hanya setelah saringan diganti) dan jumlahnya diumumkan untuk pembaca layar. HP tanpa
// saringan: empat kartu pertama, sisanya lewat tombol "Tampilkan … ekstrakurikuler lain".
// Prestasi: LINIMASA MENDATAR per tahun (tahun terbaru dulu): garis sumbu tipis yang tergambar sekali saat terlihat,
// pil tahun dengan titik warna tema di sumbu, lalu kartu prestasi (tingkat, capaian, lomba, nama). Rel bisa difokus dan
// digeser (keyboard/sentuh); tombol geser hanya tampil bila isinya lebih lebar dari rel.
import { ChevronLeft, ChevronRight, Clock, Users } from 'lucide-react';
import { useRef, useState, type CSSProperties } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { useOverflow } from './hooks';
import { achievementsByYear, ekskulCategories, filterEkskul, type PradiptaModel } from './model';
import { PRADIPTA_PHOTOS } from './photos';
import { BAND, C, CHIP, DISPLAY, ROUND, SECTION_PAD, TYPE_P, ZOOM, cardOn } from './styles';
import { Head, PillLink, TitleIcon } from './ui';

export function StudentLife({ m }: { m: PradiptaModel }) {
  const { studentlife } = m;
  const tone = m.tone('studentlife');
  const items = m.items('studentlife');
  const [category, setCategory] = useState<string | null>(null);
  const [filtered, setFiltered] = useState(false);
  const [more, setMore] = useState(false);
  const categories = ekskulCategories(items);
  const active = category && categories.includes(category) ? category : null;
  const shown = filterEkskul(items, active);
  /** HP: tanpa saringan hanya PHONE_FIRST kartu pertama, sisanya lewat tombol (halaman tidak terlalu panjang) */
  const PHONE_FIRST = 4;
  const collapsed = !more && !active && shown.length > PHONE_FIRST;
  const allLabel = text(studentlife, 'all_label') || 'Semua';
  const buttonLabel = text(studentlife, 'button_label');
  const buttonAction = text(studentlife, 'button_url') ? m.linkOr(text(studentlife, 'button_url'), null) : null;

  const filters =
    categories.length > 1 ? (
      <div role="group" aria-label="Saring ekstrakurikuler" className="pd-rail -mx-5 flex max-w-[calc(100%+40px)] snap-x scroll-px-5 gap-2 overflow-x-auto px-5 pb-1 @2xl:mx-0 @2xl:max-w-full @2xl:flex-wrap @2xl:px-0">
        {[null, ...categories].map((c) => {
          const pressed = c === active;
          return (
            <button
              key={c ?? 'semua'}
              type="button"
              aria-pressed={pressed}
              onClick={() => {
                setCategory(c);
                setFiltered(true);
              }}
              className={`${CHIP.filter} ${pressed ? CHIP.on : tone === 'sky' ? CHIP.offSky : CHIP.offWhite}`}
            >
              {c ?? allLabel}
            </button>
          );
        })}
      </div>
    ) : null;

  return (
    <TemplateSection sectionKey="studentlife" className={`${SECTION_PAD} ${BAND[tone]}`}>
      <div className={CONTAINER}>
        <Head
          sectionKey="studentlife"
          eyebrow={text(studentlife, 'eyebrow')}
          title={text(studentlife, 'title')}
          fallback="Ekstrakurikuler"
          subtitle={text(studentlife, 'subtitle')}
          tone={tone}
        />
        {/* Tombol saring selebar penuh di bawah kepala section, rata kiri: satu baris di layar lebar */}
        {filters && <div className="mt-8">{filters}</div>}
        <p className="sr-only" role="status">
          {active ? `Menampilkan ${shown.length} ekstrakurikuler kategori ${active}` : ''}
        </p>
        <Reveal>
          {/* 1 → 2 → 4 kolom (tanpa 3 kolom: delapan kartu tidak menyisakan baris rumpang) */}
          <ul key={active ?? 'semua'} data-filtered={filtered ? 'true' : 'false'} className={`${filters ? 'mt-6' : 'mt-10 @3xl:mt-12'} grid gap-3 @3xl:grid-cols-2 @3xl:gap-4 @6xl:grid-cols-4`}>
            {shown.map((item, i) => {
              const name = field(item, 'name');
              const image = field(item, 'image');
              const schedule = field(item, 'schedule');
              return (
                <li
                  key={`${name}-${i}`}
                  style={{ '--pd-delay': `${stagger(i, 40)}ms` } as CSSProperties}
                  className={`pd-pop group ${collapsed && i >= PHONE_FIRST ? 'hidden @3xl:flex' : 'flex'} flex-col overflow-hidden p-5 ${cardOn(tone)}`}
                >
                  {hasImage(image) && (
                    <KitPhoto
                      src={image}
                      alt={PRADIPTA_PHOTOS.alt(image, name)}
                      fallback="none"
                      sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
                      className="-mx-2 -mt-2 mb-4 aspect-[4/3] rounded-[14px]"
                      imgClassName={ZOOM}
                    />
                  )}
                  {/* Baris atas tetap: ikon kiri (tanpa foto), chip kategori kanan → judul & jadwal sejajar di semua kartu */}
                  {(!hasImage(image) || field(item, 'category')) && (
                    <div className={`flex items-start justify-between gap-3 ${hasImage(image) ? '' : 'mb-4'}`}>
                      {!hasImage(image) && (
                        <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-(--pd-sky2) text-(--pd-ink)">
                          <TitleIcon title={`${name} ${field(item, 'category')}`} index={i} />
                        </span>
                      )}
                      {field(item, 'category') && <span className={`${CHIP.meta} ${hasImage(image) ? 'mb-3' : 'mt-2'}`}>{field(item, 'category')}</span>}
                    </div>
                  )}
                  <h3 className={`text-balance ${C.ink} ${TYPE_P.h3} @3xl:text-[19px]`}>{name}</h3>
                  {schedule && (
                    <p className={`mt-1.5 flex items-center gap-1.5 text-[13px] ${C.muted}`}>
                      <Clock aria-hidden className="h-3.5 w-3.5 shrink-0" />
                      {schedule}
                    </p>
                  )}
                  {field(item, 'text') && <p className={`mt-3 ${C.body} ${TYPE_P.small}`}>{field(item, 'text')}</p>}
                </li>
              );
            })}
          </ul>
        </Reveal>
        {collapsed && (
          <div className="mt-6 @3xl:hidden">
            <button
              type="button"
              onClick={() => setMore(true)}
              className={`${tone === 'sky' ? 'bg-white' : 'bg-(--pd-sky2)'} flex h-12 w-full items-center justify-center rounded-full text-[15px] font-semibold ${C.ink}`}
            >
              {`Tampilkan ${shown.length - PHONE_FIRST} ekstrakurikuler lain`}
            </button>
          </div>
        )}
        {buttonAction && buttonLabel && (
          <div className="mt-10 flex justify-center">
            <PillLink action={buttonAction} label={buttonLabel} variant={tone === 'sky' ? 'light' : 'soft'} className="w-full @xl:w-auto" />
          </div>
        )}
      </div>
    </TemplateSection>
  );
}

export function Achievements({ m }: { m: PradiptaModel }) {
  const { achievements } = m;
  const tone = m.tone('achievements');
  const items = m.items('achievements');
  const groups = achievementsByYear(items);
  const rail = useRef<HTMLDivElement>(null);
  const overflow = useOverflow(rail, `${items.length}`);
  const note = text(achievements, 'note');

  const scroll = (dir: 1 | -1) => {
    const el = rail.current;
    if (!el) return;
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: dir * Math.max(296, el.clientWidth * 0.7), behavior: reduce ? 'auto' : 'smooth' });
  };

  const controls = (
    <div className={`hidden items-center gap-2 @3xl:flex ${overflow ? '' : '@3xl:invisible'}`}>
      <button type="button" onClick={() => scroll(-1)} aria-label="Geser linimasa ke kiri" className={ROUND}>
        <ChevronLeft className="h-5 w-5" aria-hidden />
      </button>
      <button type="button" onClick={() => scroll(1)} aria-label="Geser linimasa ke kanan" className={ROUND}>
        <ChevronRight className="h-5 w-5" aria-hidden />
      </button>
    </div>
  );

  return (
    <TemplateSection sectionKey="achievements" className={`${SECTION_PAD} ${BAND[tone]}`}>
      <div className={CONTAINER}>
        <Head
          sectionKey="achievements"
          eyebrow={text(achievements, 'eyebrow')}
          title={text(achievements, 'title')}
          fallback="Prestasi"
          subtitle={text(achievements, 'subtitle')}
          tone={tone}
          aside={controls}
        />
        {/* Rel diungkap utuh (bukan per kartu, agar kartu di luar layar tidak tersembunyi) */}
        <Reveal variant="fade" className="mt-10 @3xl:mt-12">
          <div
            ref={rail}
            tabIndex={0}
            role="region"
            aria-label="Linimasa prestasi"
            // Rel menembus jarak tepi wadah (CONTAINER px-5/8/12/16) sampai tepi layar: kartu terakhir terpotong di tepi
            // layar sebagai isyarat geser, bukan di tepi wadah
            className="pd-rail -mx-5 snap-x snap-mandatory overflow-x-auto scroll-px-5 px-5 pb-2 @2xl:-mx-8 @2xl:scroll-px-8 @2xl:px-8 @5xl:-mx-12 @5xl:scroll-px-12 @5xl:px-12 @min-[96rem]:-mx-16 @min-[96rem]:scroll-px-16 @min-[96rem]:px-16"
          >
            <div className="relative w-max">
              {/* Sumbu tipis selebar linimasa, setinggi pil tahun */}
              <span aria-hidden className="pd-axis absolute left-0 right-0 top-[18px] h-px bg-(--pd-ring)" />
              <ol className="relative flex gap-8">
              {groups.map((group, g) => (
                <li key={`${group.year}-${g}`} className="relative">
                  <p className="flex items-center gap-2.5">
                    <span
                      aria-hidden
                      style={{ '--pd-delay': `${stagger(g, 80)}ms` } as CSSProperties}
                      className={`pd-dot h-2.5 w-2.5 rounded-full bg-(--tpl-accent) ring-4 ${tone === 'sky' ? 'ring-(--pd-sky)' : 'ring-white'}`}
                    />
                    <span className={`inline-flex h-9 items-center rounded-full bg-(--pd-sky2) px-4 text-[15px] font-semibold tabular-nums text-(--pd-ink) ${DISPLAY}`}>
                      {group.year || 'Lainnya'}
                    </span>
                  </p>
                  <ul className="mt-5 flex gap-4">
                    {group.items.map((item, i) => (
                      <li key={`${field(item, 'title')}-${i}`} className={`flex min-h-[200px] w-[280px] shrink-0 snap-start flex-col p-5 ${cardOn(tone)}`}>
                        {field(item, 'level') && <span className={`${CHIP.meta} self-start`}>{field(item, 'level')}</span>}
                        <h3 className={`mt-3 ${DISPLAY} text-[22px] font-semibold leading-tight tracking-[-0.015em] ${C.ink}`}>
                          {field(item, 'title') || field(item, 'event')}
                        </h3>
                        {field(item, 'title') && field(item, 'event') && <p className={`mt-1.5 text-[15px] leading-snug ${C.body}`}>{field(item, 'event')}</p>}
                        {field(item, 'name') && (
                          <p className={`mt-auto flex items-start gap-1.5 pt-4 text-[13.5px] leading-snug ${C.muted}`}>
                            <Users aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            {field(item, 'name')}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
              </ol>
            </div>
          </div>
        </Reveal>
        {note && <p className={`mt-6 text-[13px] leading-relaxed ${C.muted}`}>{note}</p>}
      </div>
    </TemplateSection>
  );
}
