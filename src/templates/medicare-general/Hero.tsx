// Hero MediCare General — "Triage" (data-hero-layout="triage"). Layar lebar (≥ @5xl): foto rumah sakit yang terang
// menutupi SELURUH hero sebagai latar, lapisan putih dari kiri (teks tinta di atas putih ≥ 97%), di kiri label, H1,
// deskripsi, dua tombol; di kanan kolom TIGA UBIN AKSI besar yang menempel di atas foto: dua ubin kaca putih (Daftar
// Online, Jadwal Dokter) dan satu ubin MERAH "IGD 24 Jam" dengan nomor telepon besar (tautan tel:). HP & tablet: foto
// menjadi pita di atas yang memudar ke putih, lalu teks di atas putih, tombol penuh-lebar, dan ubin bertumpuk (tablet:
// tiga sejajar). Gerak khas (./medicare-general.css): ubin masuk dari kanan berurutan. Foto hero (LCP) TIDAK pernah
// disembunyikan atau dianimasikan; teks memakai Reveal 0/80/160/240 ms.
import { ChevronRight, Phone } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { displayPhone, type MedicareModel } from './model';
import { MEDICARE_PHOTOS } from './photos';
import { C, DISPLAY, T } from './styles';
import { AutoIcon, ButtonLink, Highlighted } from './ui';

const TILE_DELAYS = ['0.22s', '0.34s', '0.46s'];

/** Ubin aksi biasa: kaca putih di atas foto (layar lebar) / kartu putih bergaris (HP). Tanpa tautan → kotak biasa. */
function ActionTile({ title, body, action, index }: { title: string; body: string; action: MedicareModel['tiles'][number]['action']; index: number }) {
  const inner = (
    <>
      <span aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] bg-(--tpl-accent-50) text-(--tpl-accent-ink)">
        <AutoIcon name={title} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block ${T.h3} ${C.ink}`}>{title}</span>
        {body && <span className={`mt-1 hidden @xl:block ${T.small} ${C.muted}`}>{body}</span>}
      </span>
      {action && <ChevronRight aria-hidden className="h-6 w-6 shrink-0 text-(--tpl-accent-ink) transition-transform duration-200 group-hover:translate-x-0.5" />}
    </>
  );
  const box =
    'mc-tile group flex min-h-20 w-full items-center gap-4 rounded-[12px] bg-white p-4 ring-1 ring-inset ring-[#0E1B2E]/[0.1] transition-colors duration-200 @xl:min-h-24 @5xl:bg-white/90 @5xl:p-5 @5xl:ring-white/70 @5xl:backdrop-blur-md';
  const style = { '--mc-at': TILE_DELAYS[index] } as CSSProperties;
  return action ? (
    <ActionLink action={action} className={`${box} hover:ring-(--tpl-accent) @5xl:hover:ring-(--tpl-accent)`} style={style}>
      {inner}
    </ActionLink>
  ) : (
    <div className={box} style={style}>
      {inner}
    </div>
  );
}

/** Ubin IGD merah: judul, keterangan, nomor besar; seluruh ubin = tautan telepon (tanpa nomor → kotak tanpa tautan). */
function EmergencyTile({ m }: { m: MedicareModel }) {
  const title = text(m.hero, 'igd_title') || m.igdLabel;
  const body = text(m.hero, 'igd_text');
  const number = displayPhone(m.igdPhone);
  const inner = (
    <>
      <span aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] bg-white/15 text-white">
        <AutoIcon name="IGD" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block ${T.h3} text-white`}>{title}</span>
        {body && <span className={`mt-1 block ${T.small} text-white`}>{body}</span>}
        {number && (
          <span className={`mt-2 flex items-center gap-2 ${DISPLAY} text-[24px] font-bold leading-none tabular-nums text-white @5xl:text-[26px]`}>
            <Phone aria-hidden className="h-5 w-5 shrink-0" />
            {number}
          </span>
        )}
      </span>
    </>
  );
  const box = 'mc-tile flex min-h-24 w-full items-center gap-4 rounded-[12px] bg-[#B71C1C] p-4 text-white transition-colors duration-200 @5xl:p-5';
  const style = { '--mc-at': TILE_DELAYS[2] } as CSSProperties;
  return m.igdAction ? (
    <ActionLink action={m.igdAction} aria-label={`${title}: telepon ${number}`} className={`${box} hover:bg-[#9A1717]`} style={style}>
      {inner}
    </ActionLink>
  ) : (
    <div className={box} style={style}>
      {inner}
    </div>
  );
}

export function Hero({ m }: { m: MedicareModel }) {
  const { hero } = m;
  const eyebrow = text(hero, 'eyebrow');
  const title = text(hero, 'title') || m.companyName;
  const subtitle = text(hero, 'subtitle');
  const image = text(hero, 'image');
  const primaryLabel = m.primaryAction ? text(hero, 'primary_label') : '';
  const secondaryLabel = m.secondaryAction ? text(hero, 'secondary_label') : '';
  const showIgd = !!(m.igdAction || text(hero, 'igd_title'));
  const tileCount = m.tiles.length + (showIgd ? 1 : 0);

  return (
    <TemplateSection sectionKey="hero" data-hero-layout="triage" className="relative isolate overflow-hidden bg-white">
      {/* Foto latar: HP pita atas 320/440px, layar lebar seluruh hero. Lapisan putih dekoratif. */}
      <div className="absolute inset-x-0 top-0 -z-10 h-[320px] @3xl:h-[440px] @5xl:inset-y-0 @5xl:h-auto">
        <KitPhoto
          src={image}
          alt={MEDICARE_PHOTOS.alt(image, `Gedung dan lobi ${m.companyName}`)}
          priority
          fallback="tint"
          sizes="(min-width: 1024px) 100vw, 160vw"
          className="absolute inset-0"
          imgClassName="object-[96%_50%] @3xl:object-[80%_50%] @5xl:object-[70%_50%]"
        />
        <div aria-hidden className="mc-hero-fade absolute inset-0" />
      </div>

      <div className={`${CONTAINER} grid grid-cols-1 pb-12 pt-[236px] @3xl:pb-16 @3xl:pt-[352px] @5xl:min-h-[max(600px,min(78svh,720px))] @5xl:grid-cols-12 @5xl:items-center @5xl:gap-x-10 @5xl:pb-20 @5xl:pt-20`}>
        <div className="min-w-0 @5xl:col-span-7 @6xl:col-span-6">
          {eyebrow && (
            <Reveal as="p" className={`inline-flex max-w-full items-center gap-2.5 rounded-[10px] bg-white px-3.5 py-2 ring-1 ring-inset ring-[#0E1B2E]/[0.1] ${T.label} text-(--tpl-accent-ink)`}>
              <span aria-hidden className="h-4 w-1 shrink-0 rounded-full bg-(--tpl-accent)" />
              <span className="min-w-0">{eyebrow}</span>
            </Reveal>
          )}
          <Reveal as="h1" delay={80} className={`${eyebrow ? 'mt-6' : ''} max-w-[16ch] ${T.h1} ${C.ink}`}>
            <Highlighted title={title} highlight={text(hero, 'highlight')} />
          </Reveal>
          {subtitle && (
            <Reveal as="p" delay={160} className={`mt-5 max-w-[46ch] text-pretty ${T.lead} ${C.muted}`}>
              {subtitle}
            </Reveal>
          )}
          {(primaryLabel || secondaryLabel) && (
            <Reveal delay={240} className="mt-8 flex flex-col gap-3 @xl:flex-row @xl:flex-wrap">
              <ButtonLink action={m.primaryAction} label={primaryLabel} arrow className="w-full @xl:w-auto" />
              <ButtonLink action={m.secondaryAction} label={secondaryLabel} variant="outline" className="w-full @xl:w-auto" />
            </Reveal>
          )}
        </div>

        {tileCount > 0 && (
          <ul
            aria-label="Akses cepat"
            className={`mt-10 grid gap-3 @5xl:col-span-5 @5xl:col-start-8 @5xl:mt-0 @5xl:grid-cols-1 @6xl:col-span-4 @6xl:col-start-9 ${
              tileCount === 3 ? '@3xl:grid-cols-3' : tileCount === 2 ? '@3xl:grid-cols-2' : ''
            }`}
          >
            {m.tiles.map((tile, i) => (
              <li key={`${tile.title}-${i}`} className="flex min-w-0">
                <ActionTile title={tile.title} body={tile.text} action={tile.action} index={i} />
              </li>
            ))}
            {showIgd && (
              <li className="flex min-w-0">
                <EmergencyTile m={m} />
              </li>
            )}
          </ul>
        )}
      </div>
    </TemplateSection>
  );
}
