// Hero HealthLink — "App card" (data-hero-layout="appcard"): foto latar selebar layar (LCP: eager, fetchpriority high,
// srcset 800/1280/1920, TIDAK pernah dianimasikan) dengan KARTU APLIKASI putih di atasnya. Teks tidak pernah duduk
// langsung di atas foto: label kapsul, H1, deskripsi, kolom cari dokter, empat ubin layanan besar, dan catatan darurat
// semuanya di kartu (kontras tidak bergantung pada foto).
// HP (desain utama): foto 360px di bawah bilah menu melayang, lalu kartu ala bottom sheet (pegangan kecil di atas) yang
// naik menutupi bagian bawah foto dan berlanjut ke kanvas; ubin 2×2. Layar lebar: foto memenuhi hero (min. 680px),
// kartu 540px di kiri tengah, ubin 4 sebaris, dua label kaca di dekat subjek foto di kanan.
// Cari: mengisi kata kunci daftar dokter (state di ./HealthLink), mengosongkan saringan spesialis, lalu menggulir ke
// bagian Dokter online. Gerak khas: ubin "pop" (skala 0.96 → 1 + memudar, berurutan); foto, H1, dan kartu diam.
import { ArrowRight, PhoneCall, Search } from 'lucide-react';
import { useId, useState, type CSSProperties, type FormEvent } from 'react';
import { CONTAINER } from '../shared/layout';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { HealthLinkModel } from './model';
import { HEALTHLINK_PHOTOS } from './photos';
import { C, TYPE_H } from './styles';
import { Highlighted, IconTile, PillLabel } from './ui';

/** Fokus foto demo: subjek di kanan tengah (kartu menutupi kiri di layar lebar; HP memotong hampir persegi). */
const PHOTO_POSITION = '64% 38%';

export function Hero({ m, onSearch }: { m: HealthLinkModel; onSearch: ((query: string) => void) | null }) {
  const { hero } = m;
  const [query, setQuery] = useState('');
  const inputId = useId();
  const image = text(hero, 'image');
  const withPhoto = hasImage(image);
  const eyebrow = text(hero, 'eyebrow');
  const title = text(hero, 'title') || m.companyName;
  const subtitle = text(hero, 'subtitle');
  const note = text(hero, 'emergency_note');
  const placeholder = text(hero, 'search_placeholder') || 'Cari dokter atau keluhan';
  const searchButton = text(hero, 'search_button') || 'Cari';

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSearch?.(query);
  };

  return (
    <TemplateSection sectionKey="hero" data-hero-layout="appcard" className={`relative isolate ${C.canvas}`}>
      {/* Foto latar: HP setinggi 360px di atas; layar lebar memenuhi seluruh hero di belakang kartu */}
      {withPhoto && (
        <div className="absolute inset-x-0 top-0 h-[360px] @2xl:h-[420px] @5xl:bottom-0 @5xl:h-auto">
          <KitPhoto
            src={image}
            alt={HEALTHLINK_PHOTOS.alt(image, `Layanan konsultasi dokter online ${m.companyName}`)}
            priority
            fallback="none"
            sizes="(max-width: 767px) 660px, 100vw"
            position={PHOTO_POSITION}
            className="absolute inset-0"
          />
          {/* Peralihan lembut foto → kanvas di tepi bawah (dekoratif, bukan scrim teks) */}
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-[#F5F7FA] to-transparent @5xl:h-24" />
        </div>
      )}

      <div
        className={`${CONTAINER} relative pb-10 ${
          withPhoto ? 'pt-[284px] @2xl:pt-[336px] @5xl:flex @5xl:min-h-[max(680px,min(88svh,780px))] @5xl:items-center @5xl:pb-16 @5xl:pt-28' : 'pt-24 @3xl:pt-28'
        }`}
      >
        <div className="grid items-center gap-6 @5xl:w-full @5xl:grid-cols-12">
          {/* Kartu aplikasi */}
          <div className="relative min-w-0 rounded-[28px] bg-white px-5 pb-5 pt-3 ring-1 ring-inset ring-[#0E1B2B]/[0.06] @2xl:px-8 @2xl:pb-7 @5xl:col-span-6 @5xl:px-9 @5xl:pb-8 @5xl:pt-9 @6xl:col-span-5">
            {/* Pegangan bottom sheet (HP) */}
            <span aria-hidden className="mx-auto mb-4 block h-1.5 w-10 rounded-full bg-[#0E1B2B]/[0.12] @5xl:hidden" />
            <PillLabel label={eyebrow} />
            <h1 className={`${eyebrow ? 'mt-4' : ''} ${C.ink} ${TYPE_H.h1}`}>
              <Highlighted title={title} highlight={text(hero, 'highlight')} />
            </h1>
            {subtitle && <p className={`mt-3 text-pretty ${TYPE_H.lead} ${C.muted}`}>{subtitle}</p>}

            {onSearch && (
              <form role="search" aria-label="Cari dokter" onSubmit={submit} className="mt-5 flex items-center gap-2 rounded-2xl bg-[#F5F7FA] p-1.5 ring-1 ring-inset ring-[#0E1B2B]/[0.1] focus-within:ring-2 focus-within:ring-(--hl-solid)">
                <label htmlFor={inputId} className="sr-only">
                  Cari dokter, spesialis, atau keluhan
                </label>
                <Search aria-hidden className="ml-2.5 h-5 w-5 shrink-0 text-[#4A5869]" />
                <input
                  id={inputId}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={placeholder}
                  maxLength={60}
                  autoComplete="off"
                  enterKeyHint="search"
                  className="h-12 min-w-0 flex-1 bg-transparent text-[16px] text-[#0E1B2B] placeholder:text-[#5E6B7C] focus:outline-none focus-visible:outline-none"
                />
                <button
                  type="submit"
                  aria-label={searchButton}
                  className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-[14px] bg-(--hl-solid) px-4 text-[15px] font-semibold text-white transition-colors duration-200 hover:bg-(--hl-solid-hover)"
                >
                  <span className="hidden @xl:inline">{searchButton}</span>
                  <ArrowRight aria-hidden className="h-5 w-5 @xl:hidden" />
                </button>
              </form>
            )}

            {m.tiles.length > 0 && (
              <ul aria-label="Layanan cepat" className={`mt-4 grid grid-cols-2 gap-2.5 ${m.tiles.length >= 3 ? '@xl:grid-cols-4 @5xl:grid-cols-2' : ''}`}>
                {m.tiles.map((tile, i) => {
                  const label = field(tile, 'label');
                  const action = m.itemAction(label, field(tile, 'link_url'));
                  const inner = (
                    <>
                      <IconTile title={label} className="h-12 w-12 bg-white ring-1 ring-inset ring-[#0E1B2B]/[0.06] @5xl:h-[52px] @5xl:w-[52px]" iconClassName="h-6 w-6 @5xl:h-[26px] @5xl:w-[26px]" />
                      <span className="mt-3 block min-w-0 @5xl:mt-0">
                        <span className={`block text-[15px] font-semibold leading-tight ${C.ink}`}>{label}</span>
                        {field(tile, 'text') && <span className={`mt-1 block text-[12.5px] leading-snug ${C.muted}`}>{field(tile, 'text')}</span>}
                      </span>
                    </>
                  );
                  // HP/tablet: ikon di atas (ubin aplikasi); kartu sempit layar lebar: ikon di kiri, 2×2
                  const box = 'flex h-full min-h-[116px] flex-col rounded-[20px] bg-[#F5F7FA] p-3.5 @5xl:min-h-[84px] @5xl:flex-row @5xl:items-center @5xl:gap-3.5';
                  return (
                    <li key={`${label}-${i}`} className="hl-tile min-w-0" style={{ '--hl-at': `${120 + i * 70}ms` } as CSSProperties}>
                      {action ? (
                        <ActionLink action={action} className={`${box} ring-1 ring-inset ring-transparent transition-colors duration-200 hover:bg-(--hl-tint) hover:ring-(--hl-solid)/30`}>
                          {inner}
                        </ActionLink>
                      ) : (
                        <div className={box}>{inner}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {note && (
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#FEF3F2] px-3.5 py-2.5">
                <p className="min-w-0 flex-1 text-[13.5px] font-medium leading-snug text-[#B42318]">{note}</p>
                {m.emergencyHref && (
                  <a
                    href={m.emergencyHref}
                    aria-label={`Telepon ${m.emergencyPhone}`}
                    className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 text-[14px] font-bold text-[#B42318] ring-1 ring-inset ring-[#B42318]/25 transition-colors hover:ring-[#B42318]/60"
                  >
                    <PhoneCall aria-hidden className="h-4 w-4" />
                    {m.emergencyPhone}
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Label kaca di dekat subjek foto (layar lebar saja; HP: foto dibiarkan bersih) */}
          {withPhoto && m.chips.length > 0 && (
            <ul aria-label="Sorotan layanan" className="hidden @5xl:col-span-5 @5xl:col-start-8 @5xl:flex @5xl:flex-col @5xl:items-end @5xl:gap-24 @6xl:col-start-8">
              {m.chips.map((chip, i) => (
                <li
                  key={`${field(chip, 'label')}-${i}`}
                  className={`flex items-center gap-3 rounded-2xl bg-white/90 py-2.5 pl-2.5 pr-4 ring-1 ring-inset ring-white/60 backdrop-blur-md ${i === 0 ? '@5xl:mr-[18%] @5xl:-mt-24' : '@5xl:mr-0'}`}
                >
                  <IconTile title={field(chip, 'label')} className="h-10 w-10 rounded-[12px]" iconClassName="h-5 w-5" />
                  <span className="min-w-0">
                    <span className={`block text-[14px] font-semibold leading-tight ${C.ink}`}>{field(chip, 'label')}</span>
                    {field(chip, 'text') && <span className={`block text-[12.5px] leading-snug ${C.muted}`}>{field(chip, 'text')}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}
