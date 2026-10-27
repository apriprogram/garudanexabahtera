// Komponen kecil Jumantara: label section bergaris pendek warna tema + huruf kapital, kepala section, tautan teks,
// ikon otomatis, garis rambut pemisah section putih, logo/nama sekolah, inisial bulat, nama bergelar yang gelarnya tidak
// dipenggal, dan tab yang aksesibel (Visi/Misi di Profil, Jalur/Jadwal/Syarat di SPMB). Ditulis di folder ini (bukan
// dibagi dengan template lain).
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { ActionLink } from '../shared/Shell';
import { initials, safeImage, type LinkAction } from '../shared/utils';
import { KitAvatar } from '../kit/Photo';
import { ICONS, iconKey } from './icons';
import { JumantaraMark } from './marks';
import { degreeSplit, type JumantaraModel } from './model';
import { C, DISPLAY, LABEL, LINE, TEXT_LINK, TYPE_J } from './styles';

export type Tone = 'light' | 'dark';

/** Label section: garis pendek warna tema + label kapital. Tanpa label → tidak dirender. */
export function SectionLabel({ label, tone = 'light', className = '' }: { label: string; tone?: Tone; className?: string }) {
  if (!label) return null;
  const dark = tone === 'dark';
  return (
    <p className={`flex min-w-0 items-center gap-3 ${LABEL} ${dark ? 'text-(--jm-bright)' : 'text-(--jm-ink)'} ${className}`}>
      <span aria-hidden className={`h-0.5 w-6 shrink-0 ${dark ? 'bg-(--jm-bright)' : 'bg-(--tpl-accent)'}`} />
      <span className="min-w-0">{label}</span>
    </p>
  );
}

/**
 * Kepala section. `row` (bawaan) = label, H2, deskripsi di kiri dan `aside` (tombol) di kanan pada baris yang sama di
 * layar lebar; `split` = label + H2 di 7 kolom kiri, deskripsi + aside di 5 kolom kanan; `stack` = semuanya bertumpuk.
 * `fallback`: judul H2 khusus pembaca layar bila judul di CMS dikosongkan (setiap section tetap diawali satu H2).
 */
export function SectionHead({
  eyebrow,
  title,
  fallback = '',
  subtitle = '',
  tone = 'light',
  layout = 'row',
  aside,
  className = '',
}: {
  eyebrow: string;
  title: string;
  fallback?: string;
  subtitle?: string;
  tone?: Tone;
  layout?: 'row' | 'split' | 'stack';
  aside?: ReactNode;
  className?: string;
}) {
  if (!eyebrow && !title && !fallback && !subtitle && !aside) return null;
  const dark = tone === 'dark';
  const label = eyebrow && (
    <Reveal variant="fade">
      <SectionLabel label={eyebrow} tone={tone} />
    </Reveal>
  );
  const heading = title ? (
    <Reveal as="h2" delay={80} className={`max-w-[24ch] text-balance ${eyebrow ? 'mt-4' : ''} ${dark ? 'text-white' : C.ink} ${TYPE_J.h2}`}>
      {title}
    </Reveal>
  ) : (
    fallback && <h2 className="sr-only">{fallback}</h2>
  );
  const sub = subtitle && (
    <Reveal as="p" delay={160} className={`max-w-[60ch] text-pretty ${TYPE_J.lead} ${dark ? 'text-white/80' : C.muted}`}>
      {subtitle}
    </Reveal>
  );
  const action = aside && (
    <Reveal delay={200} className="flex shrink-0 flex-wrap gap-3">
      {aside}
    </Reveal>
  );

  if (layout === 'split') {
    return (
      <div className={`grid gap-5 @5xl:grid-cols-12 @5xl:items-end @5xl:gap-10 ${className}`}>
        <div className="min-w-0 @5xl:col-span-7">
          {label}
          {heading}
        </div>
        {(sub || action) && (
          <div className="flex min-w-0 flex-col gap-5 @5xl:col-span-5">
            {sub}
            {action}
          </div>
        )}
      </div>
    );
  }
  if (layout === 'stack') {
    return (
      <div className={className}>
        {label}
        {heading}
        {sub && <div className="mt-4">{sub}</div>}
        {action && <div className="mt-6">{action}</div>}
      </div>
    );
  }
  return (
    <div className={`flex flex-col gap-6 @5xl:flex-row @5xl:items-end @5xl:justify-between @5xl:gap-12 ${className}`}>
      <div className="min-w-0">
        {label}
        {heading}
        {sub && <div className="mt-4">{sub}</div>}
      </div>
      {action}
    </div>
  );
}

/** Tautan teks warna tema dengan panah ("Baca profil sekolah →"); tautan keluar memakai panah serong. */
export function TextLink({ action, label, tone = 'light', className = '' }: { action: LinkAction | null; label: string; tone?: Tone; className?: string }) {
  if (!action || !label) return null;
  const external = action.kind === 'external';
  const Icon = external ? ArrowUpRight : ArrowRight;
  return (
    <ActionLink action={action} className={`${TEXT_LINK} ${tone === 'dark' ? 'text-white' : 'text-(--jm-ink)'} ${className}`}>
      <span>{label}</span>
      <Icon aria-hidden className={`h-4 w-4 shrink-0 transition-transform duration-200 ${external ? 'group-hover:-translate-y-0.5 group-hover:translate-x-0.5' : 'group-hover:translate-x-0.5'}`} />
    </ActionLink>
  );
}

/** Ikon yang dipilih otomatis dari judul (lihat ./icons). Dekoratif. */
export function TitleIcon({ title, index = 0, className = 'h-5 w-5' }: { title: string; index?: number; className?: string }) {
  const Icon = ICONS[iconKey(title, index)];
  return <Icon className={className} aria-hidden strokeWidth={1.7} />;
}

/** Garis rambut selebar CONTAINER di tepi atas section putih yang mengikuti section putih (section harus `relative`). */
export function SectionRule({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-x-0 top-0 ${CONTAINER}`}>
      <div className={`border-t ${LINE}`} />
    </div>
  );
}

/**
 * Logo + nama sekolah (+ tagline). Logo sekolah sebagai <img> (alt kosong: nama tertulis di sampingnya); tanpa logo atau
 * logo gagal dimuat → simbol Jumantara. `tone` light = di atas foto / pita gelap.
 */
export function Brand({
  m,
  tone,
  tagline = true,
  markClassName,
}: {
  m: JumantaraModel;
  tone: Tone;
  tagline?: boolean;
  markClassName?: string;
}) {
  const url = safeImage(m.logo);
  const [broken, setBroken] = useState<string | null>(null);
  const showLogo = !!url && broken !== url;
  const light = tone === 'dark';
  return (
    <span className="flex min-w-0 items-center gap-3">
      {showLogo ? (
        <img
          src={url}
          alt=""
          width={40}
          height={40}
          onError={() => setBroken(url)}
          className="h-9 w-auto max-w-[56px] shrink-0 object-contain @3xl:h-10"
        />
      ) : (
        <JumantaraMark className={`h-9 w-9 shrink-0 ${markClassName ?? (light ? 'text-white' : 'text-(--tpl-accent)')}`} />
      )}
      <span className="flex min-w-0 flex-col">
        <span className={`truncate ${DISPLAY} text-[15px] font-semibold leading-tight tracking-[-0.01em] @3xl:text-[16px] ${light ? 'text-white' : C.ink}`}>
          {m.companyName}
        </span>
        {tagline && m.tagline && (
          <span className={`mt-0.5 hidden truncate text-[12px] leading-tight @xl:block ${light ? 'text-white/80' : C.muted}`}>{m.tagline}</span>
        )}
      </span>
    </span>
  );
}

/** Foto bulat bila ada, selain itu inisial nama (Onest, tinta tema di bidang tint). Dekoratif: nama tertulis di samping. */
export function Person({ name, photo, className = 'h-14 w-14 text-[18px]', sizes = '56px' }: { name: string; photo: string; className?: string; sizes?: string }) {
  if (safeImage(photo)) return <KitAvatar name={name} photo={photo} className={className} sizes={sizes} />;
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-full bg-(--jm-tint) ${DISPLAY} font-semibold tracking-[-0.01em] text-(--jm-ink) ${className}`}>
      {initials(name, '?')}
    </span>
  );
}

/**
 * Nama bergelar: kata terakhir nama + gelar dalam satu kotak sebaris (inline-block), jadi turun ke baris berikut
 * bersama-sama dan gelar tidak tertinggal sendirian. Kotak yang lebih lebar dari kartu tetap membungkus di dalamnya
 * (tidak meluber). Teks tetap sama.
 */
export function PersonName({ name }: { name: string }) {
  const split = degreeSplit(name);
  if (!split) return <>{name}</>;
  return (
    <>
      {split[0]}
      <span className="inline-block">{split[1]}</span>
    </>
  );
}

export interface TabDef {
  id: string;
  label: string;
  panel: ReactNode;
}

/**
 * Tab aksesibel: tablist dengan garis penanda 2px di bawah tab aktif, panah kiri/kanan + Home/End, tabindex bergulir;
 * panel tidak aktif `hidden` tetapi tetap di HTML. Panel memudar masuk hanya setelah tab diganti (bukan saat dimuat).
 * Daftar tab bisa digeser sendiri di HP (bukan halaman).
 */
export function TabSet({ tabs, label, tone = 'light', className = '' }: { tabs: TabDef[]; label: string; tone?: Tone; className?: string }) {
  const baseId = useId();
  const [current, setCurrent] = useState<string | null>(null);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  if (tabs.length === 0) return null;
  const ids = tabs.map((tab) => tab.id);
  const selected = current && ids.includes(current) ? current : ids[0];
  const dark = tone === 'dark';

  const select = (id: string, focus = false) => {
    setCurrent(id);
    if (focus) refs.current[id]?.focus();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = ids.indexOf(selected);
    const next: Record<string, number> = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: ids.length - 1 };
    if (!(e.key in next)) return;
    e.preventDefault();
    select(ids[(next[e.key] + ids.length) % ids.length], true);
  };

  return (
    <div className={className} data-changed={current !== null ? 'true' : 'false'}>
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className={`jm-rail -mx-1 flex gap-6 overflow-x-auto border-b px-1 ${dark ? 'border-white/15' : LINE}`}
      >
        {tabs.map((tab) => {
          const on = tab.id === selected;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                refs.current[tab.id] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={on}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={on ? 0 : -1}
              onClick={() => select(tab.id)}
              className={`relative h-11 shrink-0 text-[14.5px] font-semibold transition-colors duration-200 ${
                dark ? (on ? 'text-white' : 'text-white/72 hover:text-white') : on ? C.ink : `${C.muted} hover:text-[#0E1525]`
              }`}
            >
              {tab.label}
              <span
                aria-hidden
                data-on={on ? 'true' : 'false'}
                className={`jm-tab-bar absolute inset-x-0 -bottom-px h-0.5 ${dark ? 'bg-(--jm-bright)' : 'bg-(--tpl-accent)'}`}
              />
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${baseId}-panel-${tab.id}`}
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={tab.id !== selected}
          tabIndex={0}
          className="jm-panel mt-6 rounded-[6px]"
        >
          {tab.panel}
        </div>
      ))}
    </div>
  );
}
