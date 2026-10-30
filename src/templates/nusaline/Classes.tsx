// Kelas perjalanan (kunci `classes`), pita #F2F4FA. Kepala section, tab pill per kelas (role=tablist; panah kiri/
// kanan, Home/End; rel tab bergulir sendiri dengan pudar 48px di kanan seperti rel chip rute di jadwal, tab yang dipilih
// digulir ke dalam pandangan), lalu panel 12 kolom di layar lebar: kolom 1-7 kartu putih berisi DENAH tampak atas yang
// dibuat dari konfigurasi kelas (2-2 / 2-1 kursi, 1-1 kabin tidur dua dek bertumpuk; sopir, pintu, toilet, lorong) +
// legenda, dan di bawahnya foto kelas (opsional; kelas kabin tidur tanpa foto menampilkan ilustrasi kabin SVG — bukan
// foto tempat lain; 16:9, makin lebar di layar lebar: 2:1 → 12:5 agar kolom kiri tidak jauh lebih tinggi dari rincian);
// kolom 8-12 rincian: nama, angka konfigurasi · kursi · jarak kaki (mono, nilai sejajar), 5 fitur berikon otomatis, harga
// mulai (contoh) dan tombol "Pesan kelas ini" yang menyaring tabel jadwal dengan kelas itu lalu menggulir ke sana. Rincian
// MENEMPEL (sticky, di bawah header) di samping denah + foto saat layar ≥ 800px tingginya — muat utuh di layar, jadi
// harga dan tombol tetap terlihat di samping foto; layar lebih pendek: ikut bergulir biasa. Jadi setelah tab diganti,
// denah, harga, dan tombol terlihat bersama. HP: denah TEGAK (depan di atas, seperti denah kursi di aplikasi tiket) dengan
// keterangan di sampingnya, lalu rincian, lalu foto. Kursi muncul berurutan saat tab diganti (≤ 600 ms total).
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Reveal } from '../shared/Animated';
import { TemplateSection } from '../shared/Shell';
import { hasImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { formatRupiah, seatGeometry, type NusalineModel } from './model';
import { NUSALINE_PHOTOS } from './photos';
import { BTN, C, CARD, GRID_GAP, LABEL, LABEL_SM, MONO, SECTION_PAD, TYPE, WRAP } from './styles';
import { ButtonLink, FeatureIcon, SectionHead } from './ui';
import { BerthIllustration, SeatMap } from './vehicles';

/** Rasio foto kelas / ilustrasi kabin tidur: 16:9, ≥ 1280px 2:1, ≥ 1536px 12:5 (kolom kiri selebar 7/12 layar). */
const MEDIA_RATIO = 'aspect-[16/9] @7xl:aspect-[2/1] @min-[96rem]:aspect-[12/5]';

function Legend({ pods, className }: { pods: boolean; className: string }) {
  const item = (swatch: string, label: string) => (
    <li className="flex items-center gap-2">
      <span aria-hidden className={`h-3.5 w-3.5 shrink-0 rounded-[4px] ${swatch}`} />
      {label}
    </li>
  );
  return (
    <ul aria-label="Keterangan denah" className={`flex ${LABEL_SM} ${C.muted} ${className}`}>
      {item('bg-(--tpl-accent-100) ring-1 ring-inset ring-(--nl-ink)/55', pods ? 'Kabin tidur' : 'Kursi')}
      {item('bg-[#0E1230]/[0.08] ring-1 ring-inset ring-[#0E1230]/30', 'Sopir')}
      {item('bg-(--nl-ink)', 'Pintu')}
      {item('bg-[#0E1230]/[0.06] ring-1 ring-inset ring-[#0E1230]/30', 'Toilet')}
    </ul>
  );
}

export function Classes({ m, onBook }: { m: NusalineModel; onBook: (cls: string) => void }) {
  const { classes } = m;
  const list = m.classList;
  const baseId = useId();
  const [active, setActive] = useState(0);
  const [changed, setChanged] = useState(false);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const rail = useRef<HTMLDivElement>(null);
  const index = Math.min(active, list.length - 1);

  // Tab yang dipilih (klik, panah, Home/End) di luar rel atau di bawah pudar 48px kanan → digulir ke tengah rel, tanpa
  // menggulir halaman (sama dengan chip rute di jadwal). Rel tidak bergulir / tab sudah terlihat penuh → dibiarkan.
  useEffect(() => {
    const el = rail.current;
    const tab = tabs.current[index];
    if (!el || !tab || el.scrollWidth <= el.clientWidth) return;
    const left = tab.offsetLeft;
    const right = left + tab.offsetWidth;
    if (left >= el.scrollLeft && right <= el.scrollLeft + el.clientWidth - 48) return;
    el.scrollLeft = Math.max(0, left - (el.clientWidth - tab.offsetWidth) / 2);
  }, [index]);

  const info = list[index];
  if (!info) return null;
  const decks = seatGeometry(info.layout);
  const twoDecks = decks.length > 1;
  const total = info.layout.total;
  const step = Math.min(24, Math.floor(320 / Math.max(1, total)));
  const bookLabel = text(classes, 'book_label');
  const note = text(classes, 'note');
  const tabId = (i: number) => `${baseId}-tab-${i}`;
  const panelId = `${baseId}-panel`;
  const image = info.image;
  const photo = hasImage(image);
  // Kabin tidur tanpa foto → ilustrasi kabin (SVG) di tempat foto; kelas kursi tanpa foto → tanpa media
  const berth = !photo && info.layout.pods;
  const summary = `Denah ${info.name}: konfigurasi ${info.layout.label}, ${info.seatsLabel}${twoDecks ? ' di dua dek; dek atas lewat tangga depan' : ''}. Sopir dan pintu di depan, toilet di belakang.`;

  // Kartu denah (grid). HP satu dek: denah tegak di kiri, judul denah + legenda di kanan (baris 2 = 1fr: legenda tetap di
  // atas walau denah tinggi). HP dua dek: judul, legenda, lalu dua denah tegak berdampingan. ≥ @xl: judul | legenda, denah
  // mendatar di bawahnya (dua dek bertumpuk).
  const figureGrid = twoDecks
    ? 'grid-cols-1 @xl:grid-cols-[minmax(0,1fr)_auto]'
    : 'grid-cols-[minmax(0,11fr)_minmax(0,9fr)] grid-rows-[auto_1fr] @xl:grid-cols-[minmax(0,1fr)_auto] @xl:grid-rows-none';
  const captionPlace = twoDecks ? '' : 'col-start-2 row-start-1 @xl:col-start-1';
  const legendPlace = twoDecks
    ? 'flex-wrap gap-x-5 gap-y-2'
    : 'col-start-2 row-start-2 flex-col gap-y-2.5 @xl:row-start-1 @xl:flex-row @xl:flex-wrap @xl:gap-x-5 @xl:gap-y-2';
  const mapsPlace = twoDecks
    ? 'grid grid-cols-2 gap-4 @xl:col-span-2 @xl:grid-cols-1 @xl:gap-5'
    : 'col-start-1 row-span-2 row-start-1 @xl:col-span-2 @xl:row-span-1 @xl:row-start-2';

  const select = (i: number, focus = true) => {
    const next = (i + list.length) % list.length;
    setActive(next);
    setChanged(true);
    if (focus) tabs.current[next]?.focus();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: list.length - 1 };
    if (!(e.key in moves)) return;
    e.preventDefault();
    select(moves[e.key]);
  };
  const bookAction = !m.shown('schedule') && bookLabel ? m.waWith(`Halo ${m.companyName}, saya ingin pesan tiket kelas ${info.name}.`) ?? m.sectionAction('contact') : null;

  return (
    <TemplateSection sectionKey="classes" className={`${C.band} ${SECTION_PAD}`}>
      <div className={WRAP}>
        <SectionHead eyebrow={text(classes, 'eyebrow')} title={text(classes, 'title')} subtitle={text(classes, 'subtitle')} srTitle="Kelas perjalanan" />

        <Reveal className="mt-10 @3xl:mt-12">
          {list.length > 1 && (
            // Rel tab selebar layar di HP (melewati jarak tepi WRAP), pudar 48px di kanan — tab yang terpotong terbaca
            // "bisa digulir", bukan terpotong; pr-12 di akhir baris = tab terakhir bisa digulir keluar dari pudar
            <div
              ref={rail}
              className="relative -mx-5 overflow-x-auto px-5 pb-1 [mask-image:linear-gradient(90deg,#000_calc(100%-48px),transparent)] [scrollbar-width:none] @2xl:-mx-8 @2xl:px-8 @3xl:mx-0 @3xl:px-0"
            >
              <div className="w-max pr-12">
                <div role="tablist" aria-label="Pilih kelas" onKeyDown={onKeyDown} className="inline-flex gap-1 rounded-full bg-white p-1.5 ring-1 ring-inset ring-[#0E1230]/[0.08]">
                  {list.map((c, i) => {
                    const selected = i === index;
                    return (
                      <button
                        key={`${c.name}-${i}`}
                        ref={(el) => {
                          tabs.current[i] = el;
                        }}
                        id={tabId(i)}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        aria-controls={panelId}
                        tabIndex={selected ? 0 : -1}
                        onClick={() => select(i, false)}
                        className={`flex h-11 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-full px-5 text-[15px] font-semibold transition-colors duration-200 @3xl:h-12 @3xl:px-6 ${
                          selected ? 'bg-[#0E1230] text-white' : `${C.ink} hover:bg-[#F2F4FA]`
                        }`}
                      >
                        {c.name}
                        <span aria-hidden className={`font-mono text-[12px] font-medium ${selected ? C.neon : C.muted}`}>
                          {c.layout.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div
            key={index}
            id={panelId}
            role={list.length > 1 ? 'tabpanel' : undefined}
            aria-labelledby={list.length > 1 ? tabId(index) : undefined}
            className={`nl-panel mt-6 grid items-start gap-y-6 @5xl:grid-cols-12 ${GRID_GAP}`}
          >
            {/* Denah (kolom 1-7). figcaption = anak pertama <figure> (nama figur untuk pembaca layar) */}
            <figure className={`${CARD} grid items-start gap-x-5 gap-y-4 p-4 @xl:gap-x-6 @xl:gap-y-5 @3xl:p-7 @5xl:col-span-7 @5xl:row-start-1 ${figureGrid}`}>
              <figcaption className={`min-w-0 ${LABEL} ${C.accent} ${captionPlace}`}>
                Denah {info.layout.label} · {info.seatsLabel}
                <span className="sr-only">. {summary}</span>
              </figcaption>
              <Legend pods={info.layout.pods} className={legendPlace} />
              <div className={`min-w-0 ${mapsPlace}`}>
                {decks.map((deck, d) => (
                  <div key={deck.label || d} className="min-w-0">
                    {deck.label && <p className={`mb-2 ${LABEL_SM} ${C.muted}`}>{deck.label}</p>}
                    <SeatMap deck={deck} pods={info.layout.pods} pop={changed} step={step} upper={d > 0} vertical className="mx-auto block w-full max-w-[180px] @xl:hidden" />
                    <SeatMap deck={deck} pods={info.layout.pods} pop={changed} step={step} upper={d > 0} className="hidden w-full @xl:block" />
                  </div>
                ))}
              </div>
            </figure>

            {/* Rincian (kolom 8-12, di samping denah + foto): nama, angka, fitur, harga, tombol. Menempel 24px di bawah header
                (76px) selama denah + foto digulir, hanya bila layar ≥ 800px tingginya (rincian ± 560–630px muat utuh, tombol
                tidak pernah terpotong di bawah layar) */}
            <div className="min-w-0 @5xl:top-[calc(var(--tpl-sticky-top,0px)+100px)] @5xl:col-span-5 @5xl:col-start-8 @5xl:row-span-2 @5xl:row-start-1 @5xl:self-start [@media(min-height:50rem)]:@5xl:sticky">
              <h3 className={`${TYPE.h3lg} ${C.ink}`}>{info.name}</h3>
              <dl className={`mt-5 grid grid-cols-3 divide-x border-y ${C.line} ${C.divide}`}>
                {[
                  ['Konfigurasi', info.layout.label],
                  [info.layout.pods ? 'Kabin' : 'Kursi', String(total)],
                  [info.layout.pods ? 'Panjang kasur' : 'Jarak kaki', info.legroom || '–'],
                ].map(([label, value], i) => (
                  // Kolom flex: label boleh dua baris (HP), nilai tetap sejajar di dasar baris
                  <div key={label} className={`flex min-w-0 flex-col py-3.5 ${i > 0 ? 'pl-4' : ''} @3xl:py-4 ${i > 0 ? '@3xl:pl-6' : ''}`}>
                    <dt className={`${LABEL_SM} ${C.muted}`}>{label}</dt>
                    <dd className={`mt-auto pt-1 ${MONO} text-[20px] font-semibold ${C.ink} @3xl:text-[24px]`}>{value}</dd>
                  </div>
                ))}
              </dl>
              {info.features.length > 0 && (
                <ul aria-label={`Fitur kelas ${info.name}`} className="mt-5 grid grid-cols-1 gap-x-8 @3xl:grid-cols-2 @5xl:grid-cols-1">
                  {info.features.map((feature) => (
                    <li key={feature} className={`flex items-center gap-3 border-b py-2.5 text-[15px] ${C.line} ${C.ink}`}>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-(--nl-ink) ring-1 ring-inset ring-[#0E1230]/[0.08]">
                        <FeatureIcon title={feature} className="h-[18px] w-[18px]" />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
                {info.price > 0 && (
                  <p className="min-w-0">
                    <span className={`block text-[13px] ${C.muted}`}>Mulai</span>
                    <span className={`${MONO} text-[30px] font-semibold leading-tight tracking-[-0.02em] ${C.ink} @3xl:text-[34px]`}>{formatRupiah(info.price)}</span>
                    <span className={`ml-1 text-[13px] ${C.muted}`}>/ orang</span>
                    {note && <span className={`mt-1 block text-[13px] ${C.muted}`}>{note}</span>}
                  </p>
                )}
                {bookLabel && m.shown('schedule') && (
                  <button type="button" onClick={() => onBook(info.name)} className={`${BTN.primary} ${BTN.lg} w-full @xl:w-auto`} aria-label={`${bookLabel}: ${info.name}`}>
                    {bookLabel}
                    <span aria-hidden>→</span>
                  </button>
                )}
                {bookAction && <ButtonLink action={bookAction} label={bookLabel} className="w-full @xl:w-auto" />}
              </div>
            </div>

            {/* Foto kelas / ilustrasi kabin tidur (kolom 1-7, di bawah denah; HP: paling bawah). 16:9, layar lebar 2:1 →
                12:5: kolom kiri tidak menjulang jauh di bawah rincian. Potongan sedikit ke atas (35%): sandaran kepala kursi
                tetap utuh di potongan lebar */}
            {photo && (
              <KitPhoto
                src={image}
                alt={NUSALINE_PHOTOS.alt(image, `Kabin kelas ${info.name}`)}
                sizes="(min-width: 1024px) 55vw, 100vw"
                position="50% 35%"
                fallback="none"
                className={`rounded-[18px] @5xl:col-span-7 @5xl:row-start-2 ${MEDIA_RATIO}`}
              />
            )}
            {berth && (
              <div className={`nl-berth relative overflow-hidden rounded-[18px] bg-[#0B1026] @5xl:col-span-7 @5xl:row-start-2 ${MEDIA_RATIO}`}>
                <BerthIllustration className="absolute inset-0 h-full w-full" />
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </TemplateSection>
  );
}
