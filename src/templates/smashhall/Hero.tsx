// Hero SmashHall — "Rally" (data-hero-layout="rally"): foto GOR yang terang selebar layar sebagai LATAR (pemain di
// kanan), lapisan putih dari kiri sehingga teks gelap terbaca (≥ 14:1), label berikon kok, H1 Sora dengan kata
// berwarna, deskripsi, dua tombol ("Cek Lapangan" ke tabel ketersediaan, "Gabung Member"), lalu STRIP KACA
// ketersediaan hari ini yang menempel di dasar foto: 8 lapangan × jam sebagai pil kecil (kosong = warna tema, penuh =
// abu), legenda, catatan "contoh data", dan tautan ke jadwal lengkap.
// HP & tablet (< 64rem): foto tetap LATAR di belakang teks. Kotak foto setinggi --sh-photo di puncak hero (pemain
// terlihat jelas di "jendela" --sh-win teratas), lapisan tinta menggelap ke bawah (≥ 0,86 di bawah teks) lalu menyatu
// dengan latar tinta hero; teks putih, kata sorot --sh-bright, tombol selebar kolom, strip putih (4 × 2 lapangan) di
// dasar. Tombol WhatsApp melayang Shell: demo & layar < 640 px 48px, 16px dari tepi; situs ≥ 640 px 56px, 32px dari
// tepi. HP (< 48rem): lajur kanan --sh-lane dibiarkan kosong sampai 8px di kiri tombol itu (3,25rem; ≥ 36rem 4,75rem;
// ≥ 42rem, tepi kontainer 32px, 4rem) — judul, deskripsi, tombol, judul/legenda/tautan/catatan strip, lencana kok, dan
// di layar pendek (≤ 32rem) juga label hero berhenti di kiri lajur, jadi di layar pertama HP tidak ada teks atau tombol
// hero yang tertutup tombol WhatsApp, berapa pun tinggi layarnya dan sependek apa pun isi hero (hanya kisi pil
// dekoratif strip yang bisa lewat di bawahnya). Tablet & layar lebar: lencana kok 64px dari tepi strip (≥ 8px di kiri
// tombol situs) dan baris judul/legenda/tautan strip berhenti di kiri lencana, jadi juga tidak tertutup (demo maupun
// situs).
// Gerak khas (./smashhall.css): kok "di-smash" melengkung dari kiri lalu mendarat di ikon strip (sekali, 1,4 dtk; HP
// dari tepi kiri menyeberangi celah kosong di atas strip, tablet & layar lebar dari atas foto di kanan kolom teks —
// tablet: kolom teks ≤ 31rem — seluruh lintasan di dalam layar dan tidak pernah melintasi teks), lalu pil terisi
// bergelombang. Foto hero (LCP) TIDAK pernah disembunyikan atau dianimasikan.
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

/** Rentang jam di deskripsi ("07.00–23.00") tidak dipatah di tanda pisah: dibungkus nowrap, teksnya tetap sama. */
function keepRanges(value: string) {
  return value
    .split(/(\d{1,2}[.:]\d{2} ?[–-] ?\d{1,2}[.:]\d{2})/)
    .map((part, i) => (i % 2 ? <span key={i} className="whitespace-nowrap">{part}</span> : part));
}

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
    <div data-sh-strip="" className="relative rounded-[20px] bg-white p-4 @5xl:bg-white/[0.88] ring-1 ring-[#171512]/[0.08] backdrop-blur-md @3xl:p-5 @5xl:px-6 @5xl:pt-7">
      {/* Tempat mendarat kok yang "di-smash" (gerak khas): lencana bulat di tepi atas kanan strip, di atas foto, jadi
          lintasan kok tidak melewati teks hero; selalu di kiri tombol WhatsApp (HP: di kiri lajur; tablet & layar lebar:
          64px dari tepi strip). Diam = kok tegak di dalam lencana. */}
      <span
        aria-hidden
        className="sh-slot absolute -top-5 right-(--sh-lane) flex h-11 w-11 items-center justify-center rounded-full bg-white ring-1 ring-[#171512]/10 @3xl:right-16 @5xl:-top-6 @5xl:h-12 @5xl:w-12"
      >
        <span className="sh-fly absolute inset-0 flex items-center justify-center">
          <span className="sh-fly-y flex items-center justify-center">
            <ShuttleIcon className="sh-spin h-6 w-6 text-(--tpl-accent) @5xl:h-7 @5xl:w-7 @5xl:text-(--tpl-accent-ink)" />
          </span>
        </span>
      </span>
      {/* HP: baris 1 judul (sisi kanan untuk lencana kok), baris 2 legenda + tautan (tautan pindah ke baris sendiri bila
          tidak muat di kiri lajur WhatsApp); tablet & layar lebar: satu baris yang berhenti di kiri lencana (88px dari
          tepi dalam strip; label CMS panjang turun baris, tidak menyentuh lencana), jadi legenda & tautan tidak di bawah
          tombol WhatsApp melayang (demo 48px/16px, situs 56px/32px dari tepi). */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 @3xl:pr-22">
        <p className={`flex min-h-6 w-full min-w-0 items-center gap-2.5 pr-[calc(var(--sh-lane)+28px)] text-[15px] @3xl:w-auto @3xl:pr-0 ${C.ink}`}>
          <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full bg-(--tpl-accent)" />
          {title && <span className={`${DISPLAY} font-semibold`}>{title}</span>}
          {day && <span className={C.muted}>{title ? `· ${day}` : day}</span>}
        </p>
        <div className="flex w-full flex-wrap items-center justify-between gap-x-4 pr-(--sh-lane) @3xl:contents">
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
      {/* HP: catatan juga berhenti di kiri lajur WhatsApp (isi hero pendek → strip naik ke layar pertama) */}
      {note && <p className={`mt-3 pr-(--sh-lane) text-[12.5px] leading-snug ${C.muted}`}>{note}</p>}
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
      className="relative isolate grid grid-cols-1 grid-rows-[auto_auto] overflow-hidden bg-[#171512] [--sh-lane:3.25rem] [--sh-photo:540px] [--sh-win:272px] @xl:[--sh-lane:4.75rem] @2xl:[--sh-lane:4rem] @3xl:[--sh-lane:0px] @3xl:[--sh-photo:660px] @3xl:[--sh-win:340px] @5xl:min-h-[max(640px,min(calc(100svh-76px),800px))] @5xl:grid-rows-[1fr_auto] @5xl:bg-white"
    >
      {/* Foto latar = LCP: eager + fetchpriority high, tanpa reveal/zoom/parallax. HP/tablet: kotak setinggi --sh-photo
          di puncak hero (pemain di jendela atas, sisanya di bawah lapisan tinta); layar lebar: latar seluruh hero di
          belakang lapisan putih kiri. */}
      <KitPhoto
        src={image}
        alt={SMASHHALL_PHOTOS.alt(image, `Suasana bermain bulu tangkis di ${m.companyName}`)}
        priority
        fallback="tint"
        // HP: kotak 390 × 540 px memotong foto 16:9 → lebar gambar ± 960 px; tablet 660 px → ± 1170 px
        sizes="(min-width: 1024px) 100vw, (min-width: 768px) 1180px, 960px"
        className="col-start-1 row-start-1 row-end-3 h-(--sh-photo) self-start @5xl:h-auto @5xl:self-stretch"
        imgClassName="object-[71%_50%] @3xl:object-[86%_50%] @5xl:origin-[0%_60%] @5xl:scale-[1.1] @5xl:object-[62%_45%]"
      />
      <div aria-hidden className="sh-hero-scrim pointer-events-none relative col-start-1 row-start-1 row-end-3" />

      <div className="sh-hero-copy relative col-start-1 row-start-1 @5xl:flex @5xl:items-center">
        <div className={`${CONTAINER} pt-(--sh-win) @5xl:py-14`}>
          {/* Tablet: kolom teks ≤ 31rem (judul 14ch & deskripsi 44ch sudah di dalamnya; label panjang & tombol ikut),
              jadi lintasan kok di kanannya tidak pernah melewati teks */}
          <div className="min-w-0 @3xl:max-w-[31rem] @5xl:max-w-[min(600px,46%)] @min-[96rem]:max-w-[660px]">
            {/* Label selebar kolom (label bawaan satu baris mulai 375 px); hanya di layar pendek (≤ 32rem, mis. HP
                mendatar) tombol WhatsApp turun sampai baris label, jadi di situ label juga berhenti di kiri lajur */}
            {eyebrow && (
              <Reveal variant="fade" className="[@media(max-height:32rem)]:pr-(--sh-lane)">
                <SectionLabel label={eyebrow} tone="photo" />
              </Reveal>
            )}
            {/* HP: judul, deskripsi, dan tombol berhenti di kiri lajur WhatsApp (--sh-lane). Rentang jam di deskripsi
                tidak dipatah. */}
            <Reveal as="h1" delay={80} className={`${eyebrow ? 'mt-5 @5xl:mt-6' : ''} max-w-[min(14ch,calc(100%-var(--sh-lane)))] ${TYPE_S.h1} text-white @5xl:text-[#171512]`}>
              <Highlighted title={title} highlight={text(hero, 'highlight')} tone="photo" />
            </Reveal>
            {subtitle && (
              <Reveal as="p" delay={160} className={`mt-5 max-w-[min(44ch,calc(100%-var(--sh-lane)))] text-pretty ${TYPE_S.lead} text-white/80 @5xl:text-[#5A564F]`}>
                {keepRanges(subtitle)}
              </Reveal>
            )}
            {(primaryLabel || secondaryLabel) && (
              <Reveal delay={240} className="mt-7 flex flex-col gap-3 pr-(--sh-lane) @xl:flex-row @xl:flex-wrap @xl:items-center @5xl:mt-9">
                <ButtonLink action={m.primaryAction} label={primaryLabel} className="w-full @xl:w-auto" />
                <ButtonLink action={m.secondaryAction} label={secondaryLabel} variant="ghostPhoto" className="w-full @xl:w-auto" />
              </Reveal>
            )}
          </div>
        </div>
      </div>

      {/* HP/tablet: strip di dasar hero (celah atas = lintasan kok); layar lebar: strip menempel di dasar foto */}
      <div className="relative col-start-1 row-start-2 flex flex-col justify-end">
        <div className={`${CONTAINER} pb-5 pt-[76px] @3xl:pb-7 @3xl:pt-16 @5xl:pb-8 @5xl:pt-0`}>
          {/* Reveal (fade): gerak kok & pil dimulai saat strip benar-benar masuk layar (HP: di bawah lipatan) */}
          <Reveal variant="fade">
            <HeroStrip m={m} />
          </Reveal>
        </div>
      </div>
    </TemplateSection>
  );
}
