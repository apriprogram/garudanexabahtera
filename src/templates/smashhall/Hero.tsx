// Hero SmashHall — "Rally" (data-hero-layout="rally"): foto GOR yang terang selebar layar sebagai LATAR (pemain di
// kanan), lapisan putih dari kiri sehingga teks gelap terbaca (≥ 14:1), label berikon kok, H1 Sora dengan kata
// berwarna, deskripsi, dua tombol ("Cek Lapangan" ke tabel ketersediaan, "Gabung Member"), lalu STRIP KACA
// ketersediaan hari ini yang menempel di dasar foto: 8 lapangan × jam sebagai pil kecil (kosong = warna tema, penuh =
// abu), legenda, catatan "contoh data", dan tautan ke jadwal lengkap. HP: teks di blok putih di atas, foto terlihat di
// bawahnya, strip (4 × 2 lapangan) menumpang di dasar foto; tombol penuh-lebar.
// Gerak khas (./smashhall.css): kok "di-smash" melengkung dari kanan atas lalu mendarat di ikon strip (sekali,
// 1,4 dtk), lalu pil terisi bergelombang. Foto hero (LCP) TIDAK pernah disembunyikan atau dianimasikan.
import type { CSSProperties } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { ShuttleIcon } from './marks';
import { slotKey, type SmashModel } from './model';
import { SMASHHALL_PHOTOS } from './photos';
import { C, DISPLAY, TYPE_S } from './styles';
import { ButtonLink, Highlighted, SectionLabel, TextLink } from './ui';

/** Strip kaca ketersediaan hari ini (data dari section Ketersediaan). Tanpa lapangan/jam/hari → tidak dirender. */
function HeroStrip({ m }: { m: SmashModel }) {
  const { hero, courts, hours } = m;
  if (courts.length === 0 || hours.length === 0 || m.days.length === 0) return null;
  const day = field(m.days[m.today], 'label');
  const full = m.fullByDay[m.today];
  const total = courts.length * hours.length;
  const free = total - full.size;
  const title = text(hero, 'strip_title');
  const note = text(hero, 'strip_note');

  return (
    <div data-sh-strip="" className="relative rounded-[20px] bg-white/[0.88] p-4 ring-1 ring-[#171512]/[0.08] backdrop-blur-md @3xl:p-5 @5xl:px-6 @5xl:pt-7">
      {/* Tempat mendarat kok yang "di-smash" (gerak khas): lencana bulat di tepi atas kanan strip, di atas foto, jadi
          lintasan kok tidak melewati teks hero. Diam = kok tegak di dalam lencana. */}
      <span
        aria-hidden
        className="sh-slot absolute -top-5 right-5 flex h-11 w-11 items-center justify-center rounded-full bg-white ring-1 ring-[#171512]/10 @5xl:-top-6 @5xl:right-8 @5xl:h-12 @5xl:w-12"
      >
        <span className="sh-fly absolute inset-0 flex items-center justify-center">
          <span className="sh-fly-y flex items-center justify-center">
            <ShuttleIcon className="sh-spin h-6 w-6 text-(--tpl-accent-ink) @5xl:h-7 @5xl:w-7" />
          </span>
        </span>
      </span>
      {/* HP: baris 1 judul (sisi kanan untuk lencana kok), baris 2 legenda + tautan; layar lebar: satu baris */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5">
        <p className={`flex min-h-6 w-full min-w-0 items-center gap-2.5 pr-12 text-[15px] @3xl:w-auto @3xl:pr-0 ${C.ink}`}>
          <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full bg-(--tpl-accent)" />
          {title && <span className={`${DISPLAY} font-semibold`}>{title}</span>}
          {day && <span className={C.muted}>{title ? `· ${day}` : day}</span>}
        </p>
        <div className="flex w-full flex-wrap items-center justify-between gap-x-4 @3xl:contents">
          <ul className={`flex items-center gap-4 text-[13px] ${C.muted}`}>
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="h-2 w-4 rounded-full bg-(--tpl-accent)" />
              {m.labels.free}
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="h-2 w-4 rounded-full bg-[#171512]/20" />
              {m.labels.full}
            </li>
          </ul>
          <TextLink action={m.sectionAction('availability')} label={text(hero, 'strip_link')} className="text-[14px]! @3xl:ml-auto" />
        </div>
      </div>
      <p className="sr-only">{`Contoh ketersediaan ${day || 'hari ini'}: ${free} dari ${total} slot masih kosong.`}</p>
      <div aria-hidden className="mt-3 grid grid-cols-4 gap-x-3 gap-y-3 @5xl:mt-4 @5xl:grid-cols-8 @5xl:gap-x-4">
        {courts.map((court, ci) => (
          <div key={`${court.short}-${ci}`} className="min-w-0">
            <span className={`${DISPLAY} block text-[12px] font-semibold ${C.ink}`}>{court.short}</span>
            <span className="mt-1.5 flex gap-1">
              {hours.map((hour, hi) => (
                <span
                  key={hour}
                  data-full={full.has(slotKey(ci, hour)) ? 'true' : 'false'}
                  style={{ '--sh-i': ci + hi } as CSSProperties}
                  className={`sh-pill h-2 min-w-0 flex-1 rounded-full ${full.has(slotKey(ci, hour)) ? 'bg-[#171512]/20' : 'bg-(--tpl-accent)'}`}
                />
              ))}
            </span>
          </div>
        ))}
      </div>
      {note && <p className={`mt-3 text-[12.5px] leading-snug ${C.muted}`}>{note}</p>}
    </div>
  );
}

export function Hero({ m }: { m: SmashModel }) {
  const { hero } = m;
  const eyebrow = text(hero, 'eyebrow');
  const title = text(hero, 'title') || m.companyName;
  const subtitle = text(hero, 'subtitle');
  const image = text(hero, 'image');
  const primaryLabel = m.primaryAction ? text(hero, 'primary_label') : '';
  const secondaryLabel = m.secondaryAction ? text(hero, 'secondary_label') : '';

  return (
    <TemplateSection
      sectionKey="hero"
      data-hero-layout="rally"
      className="relative isolate grid grid-cols-1 grid-rows-[auto_auto] overflow-hidden bg-white @5xl:min-h-[max(640px,min(calc(100svh-76px),800px))] @5xl:grid-rows-[1fr_auto]"
    >
      {/* Foto latar = LCP: eager + fetchpriority high, tanpa reveal/zoom/parallax. HP: panel di bawah teks (di belakang
          strip); layar lebar: latar seluruh hero di belakang lapisan putih kiri. */}
      <KitPhoto
        src={image}
        alt={SMASHHALL_PHOTOS.alt(image, `Suasana bermain bulu tangkis di ${m.companyName}`)}
        priority
        fallback="tint"
        // HP: panel 390 × ± 430 px memotong foto 16:9 → lebar gambar ± 2 × lebar layar
        sizes="(min-width: 1024px) 100vw, 200vw"
        className="col-start-1 row-start-2 min-h-[420px] @5xl:row-start-1 @5xl:row-end-3 @5xl:min-h-0"
        imgClassName="object-[61%_30%] @5xl:origin-[0%_60%] @5xl:scale-[1.1] @5xl:object-[62%_45%]"
      />
      <div aria-hidden className="sh-hero-scrim pointer-events-none relative col-start-1 row-start-2 @5xl:row-start-1 @5xl:row-end-3" />

      <div className="relative col-start-1 row-start-1 @5xl:flex @5xl:items-center">
        <div className={`${CONTAINER} pb-8 pt-9 @3xl:pb-10 @3xl:pt-12 @5xl:py-14`}>
          <div className="min-w-0 @5xl:max-w-[min(600px,46%)] @min-[96rem]:max-w-[660px]">
            {eyebrow && (
              <Reveal variant="fade">
                <SectionLabel label={eyebrow} />
              </Reveal>
            )}
            <Reveal as="h1" delay={80} className={`${eyebrow ? 'mt-5 @5xl:mt-6' : ''} max-w-[14ch] ${TYPE_S.h1} ${C.ink}`}>
              <Highlighted title={title} highlight={text(hero, 'highlight')} />
            </Reveal>
            {subtitle && (
              <Reveal as="p" delay={160} className={`mt-5 max-w-[44ch] text-pretty ${TYPE_S.lead} ${C.muted}`}>
                {subtitle}
              </Reveal>
            )}
            {(primaryLabel || secondaryLabel) && (
              <Reveal delay={240} className="mt-7 flex flex-col gap-3 @xl:flex-row @xl:items-center @5xl:mt-9">
                <ButtonLink action={m.primaryAction} label={primaryLabel} className="w-full @xl:w-auto" />
                <ButtonLink action={m.secondaryAction} label={secondaryLabel} variant="ghost" className="w-full bg-white/70 @xl:w-auto" />
              </Reveal>
            )}
          </div>
        </div>
      </div>

      {/* HP: ruang foto lalu strip di dasar panel foto; layar lebar: strip menempel di dasar hero */}
      <div className="relative col-start-1 row-start-2 flex flex-col justify-end">
        <div className={`${CONTAINER} pb-5 pt-[232px] @3xl:pb-7 @3xl:pt-[300px] @5xl:pb-8 @5xl:pt-0`}>
          {/* Reveal (fade): gerak kok & pil dimulai saat strip benar-benar masuk layar (HP: di bawah lipatan) */}
          <Reveal variant="fade">
            <HeroStrip m={m} />
          </Reveal>
        </div>
      </div>
    </TemplateSection>
  );
}
