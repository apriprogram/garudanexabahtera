// Hero Lawatan — "Postcard" (data-hero-layout="postcard"): foto pemandangan selebar layar SEBAGAI LATAR (LCP, priority,
// srcset 800/1280/1920, tidak pernah disembunyikan; scrim tinta tipis hanya di bagian bawah), garis rute titik-titik putih
// dengan pin awal/tujuan dan bus kecil di langit (tergambar sekali ± 1,4 dtk; tiga versi: HP/tablet, layar lebar, dan
// ≥ 1920px yang selalu utuh), chip keterangan foto berpin. Menempel di kiri bawah dan MELEWATI tepi bawah foto: PANEL
// KARTU POS krem (radius 18, garis airmail 6px di tepi atas, garis rambut) berisi label perangko, H1 Bricolage 800 (kata
// sorotan warna tema), kalimat singkat, chip jenis trip (radiogroup; sama dengan saringan paket) lalu pil "Lihat paket" +
// tautan WhatsApp. Panel 76% lebar wadah (maks. 920px), jadi di tablet mendatar 1024–1180px foto tetap terlihat di kanan
// dan atas panel. SATU perangko berlubang (bus menuju pin, senada dengan simbol) "ditempel" di sudut kanan atas panel,
// menyeberangi tepinya (mendarat sekali: skala 1,25 → 1, putar −8° → −4°); tanpa cap pos agar hero tetap sederhana.
// HP: foto ± 380px di atas, panel naik menutup bagian bawah foto (lebar penuh dikurangi tepi 20px); di bawah @xl pil
// "Lihat paket" tampil SEBELUM chip 2×2 (urutan visual lewat `order`, urutan DOM = desktop) agar tombol ada di layar pertama.
import { MapPin } from 'lucide-react';
import { useId } from 'react';
import { Reveal } from '../shared/Animated';
import { WhatsAppIcon } from '../shared/icons';
import { useMotionEnabled } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { splitHighlight, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { LawatanModel } from './model';
import { HERO_ROUTE_TALL, HERO_ROUTE_ULTRA, HERO_ROUTE_WIDE } from './paths';
import { LAWATAN_PHOTOS } from './photos';
import { HeroRouteArt, StampArt } from './scenes';
import { C, LABEL_SM, TYPE, WRAP } from './styles';
import { ButtonLink, ChoiceChips, StampTag, TextLink } from './ui';

export function Hero({ m, type, onType, onShow }: { m: LawatanModel; type: string; onType: (type: string) => void; onShow: () => void }) {
  const { hero } = m;
  const legendId = useId();
  const motion = useMotionEnabled();
  const eyebrow = text(hero, 'eyebrow');
  const title = text(hero, 'title') || m.companyName;
  const parts = splitHighlight(title, text(hero, 'highlight'));
  const tailHighlight = !!parts && parts[0].trim().length > 0 && parts[2].trim().length <= 1;
  const subtitle = text(hero, 'subtitle');
  const image = text(hero, 'image');
  const caption = text(hero, 'image_caption');
  const chipsLabel = text(hero, 'chips_label') || 'Pilih jenis trip';
  const packagesShown = m.shown('packages') && m.tours.length > 0;
  const showLabel = text(hero, 'button_label') || 'Lihat paket';
  const showAction = packagesShown ? m.sectionAction('packages') : m.headerAction;
  const linkLabel = text(hero, 'link_label');

  return (
    <TemplateSection sectionKey="hero" data-hero-layout="postcard" className="relative isolate bg-white">
      {/* Foto: HP/tablet kotak atas (panel menutup bagian bawahnya); ≥ @5xl seluruh hero kecuali 88px terbawah, tempat
          panel kartu pos menyeberang ke latar putih */}
      <div className="absolute inset-x-0 top-0 h-[380px] overflow-hidden bg-(--lw-deep) @3xl:h-[520px] @5xl:bottom-[88px] @5xl:h-auto">
        <KitPhoto
          src={image}
          alt={LAWATAN_PHOTOS.alt(image, `Pemandangan tujuan wisata ${m.companyName}`)}
          priority
          fallback="none"
          // HP: foto 16:9 menutupi kotak ± 390×420 → tergambar ± 1,9× lebar layar
          sizes="(max-width: 767px) 200vw, 100vw"
          className="absolute inset-0"
          imgClassName="object-[62%_40%] @5xl:object-[50%_45%]"
        />
        <div aria-hidden className="lw-hero-scrim absolute inset-0" />
        <HeroRouteArt route={HERO_ROUTE_ULTRA} motion={motion} className="absolute inset-0 hidden h-full w-full @min-[120rem]:block" />
        <HeroRouteArt route={HERO_ROUTE_WIDE} motion={motion} className="absolute inset-0 hidden h-full w-full @5xl:block @min-[120rem]:hidden" />
        <HeroRouteArt route={HERO_ROUTE_TALL} motion={motion} className="absolute inset-0 h-full w-full @5xl:hidden" />
        {caption && image && (
          <p
            data-tpl-tone="inverse"
            className={`absolute right-5 top-4 inline-flex max-w-[60%] items-center gap-1.5 rounded-full bg-[#1D2320]/60 px-3 py-1.5 text-[12.5px] font-medium text-white backdrop-blur-sm @2xl:right-8 @5xl:bottom-6 @5xl:right-12 @5xl:top-auto @min-[96rem]:right-16`}
          >
            <MapPin aria-hidden className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            <span className="truncate">{caption}</span>
          </p>
        )}
      </div>

      <div
        className={`${WRAP} relative flex flex-col pb-10 pt-[248px] @3xl:pt-[360px] @5xl:min-h-[max(620px,min(calc(100svh-var(--tpl-sticky-top,0px)-80px),900px))] @5xl:justify-end @5xl:pb-0 @5xl:pt-32`}
      >
        {/* ≥ @5xl: 76% lebar wadah, maks. 920px — 1024px: panel ± 705px (H1 56px) dan foto terlihat ± 270px di kanannya */}
        <div className="relative w-full @5xl:w-[min(76%,920px)]">
          {/* Perangko "ditempel" di sudut kanan atas, menyeberangi tepi panel (dekoratif) */}
          <div aria-hidden className="lw-stamp-land absolute -top-12 right-4 z-10 w-[64px] @3xl:-top-12 @3xl:right-10 @3xl:w-[92px]">
            <span className="lw-perf block bg-white">
              <span className="block rounded-[2px] bg-(--tpl-accent)">
                <StampArt className="block h-auto w-full" />
              </span>
            </span>
          </div>

          <div className="relative overflow-hidden rounded-[18px] bg-[#FBF6EE] ring-1 ring-inset ring-[#1D2320]/10">
            <div aria-hidden className="lw-airmail h-1.5" />
            <div className="p-5 pt-7 @3xl:p-10 @5xl:p-12 @5xl:pt-11">
              {eyebrow && (
                <Reveal variant="fade" className="@3xl:pr-36">
                  <StampTag label={eyebrow} />
                </Reveal>
              )}
              <Reveal as="h1" delay={80} className={`${eyebrow ? 'mt-5 @3xl:mt-6' : ''} max-w-[20ch] ${C.ink} ${TYPE.h1}`}>
                {parts ? (
                  // Sorotan di akhir judul (hanya tanda baca sesudahnya) → baris sendiri yang seimbang: "Liburan
                  // rombongan," / "semua kami yang atur." (HP: "semua kami" / "yang atur."), tanpa kata yatim
                  tailHighlight ? (
                    <>
                      {parts[0]}
                      <span className="block text-balance text-(--lw-ink)">
                        {parts[1]}
                        {parts[2]}
                      </span>
                    </>
                  ) : (
                    <>
                      {parts[0]}
                      <span className="text-(--lw-ink)">{parts[1]}</span>
                      {parts[2]}
                    </>
                  )
                ) : (
                  title
                )}
              </Reveal>
              {subtitle && (
                <Reveal as="p" delay={160} className={`mt-4 max-w-[60ch] text-pretty @3xl:mt-5 ${TYPE.lead} ${C.muted}`}>
                  {subtitle}
                </Reveal>
              )}
              {/* < @xl: tombol dulu (order-1), chip sesudahnya (order-2); ≥ @xl urutan DOM (chip → tombol) */}
              <Reveal delay={240} className="mt-6 flex flex-col @xl:block @3xl:mt-8">
                {packagesShown && m.types.length > 0 && (
                  <div className="order-2 mb-0 mt-6 @xl:order-none @xl:mb-5 @xl:mt-0 @3xl:mb-6">
                    <p id={legendId} className={`mb-2.5 ${LABEL_SM} ${C.muted}`}>
                      {chipsLabel}
                    </p>
                    <ChoiceChips
                      name={`${legendId}-type`}
                      label={chipsLabel}
                      labelledBy={legendId}
                      options={m.types.map((t) => [t, t] as const)}
                      value={type}
                      onChange={onType}
                      className="grid grid-cols-2 @xl:flex"
                    />
                  </div>
                )}
                <div className="order-1 flex flex-col items-stretch gap-2 @xl:order-none @xl:flex-row @xl:items-center @xl:gap-6">
                  <ButtonLink action={showAction} label={packagesShown ? showLabel : m.headerLabel} onNavigate={packagesShown ? onShow : undefined} className="w-full @xl:w-auto" />
                  <TextLink
                    action={linkLabel ? m.waAction : null}
                    label={linkLabel}
                    icon={<WhatsAppIcon className="h-4 w-4 shrink-0" />}
                    className="self-center"
                  />
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}
