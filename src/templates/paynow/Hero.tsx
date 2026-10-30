// Hero PayNow — "Wallet" (data-hero-layout="wallet"). Foto latar selebar layar (satu-satunya gambar eager, LCP) di bawah
// lapisan gradasi malam indigo → indigo → ungu yang pekat di sisi teks (teks putih ≥ 4,5:1 walau piksel foto putih) dan
// lebih tipis di sisi HP, plus kilau gradasi dekoratif. Layar lebar: kolom kiri chip label kaca, H1 dengan kata glow,
// deskripsi, tombol pil putih "Unduh aplikasi" + pil garis "Untuk merchant", tiga chip; kolom kanan mockup HP dari
// CSS/HTML (sapaan, kartu saldo bergradasi dengan angka berjalan, empat tombol fitur, transaksi terakhir) dan tiga kartu
// notifikasi bertumpuk di kirinya. HP 390: teks lalu HP lebih kecil yang terpotong tepi bawah hero, satu notifikasi
// menutup judul + baris pertama transaksinya. Gerak khas (./paynow.css): kilau bergeser sekali, HP naik masuk,
// notifikasi muncul berurutan lalu diam. Foto hero TIDAK pernah dianimasikan.
import { Bell, CircleCheck, Download, Eye, History, House, QrCode, Store, TicketPercent, UserRound } from 'lucide-react';
import { useRef, type CSSProperties } from 'react';
import { CountUp, Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { useNoteSlot } from './hooks';
import { paymentIcon } from './icons';
import { greetingInitial, isCredit, type PaynowModel } from './model';
import { PAYNOW_PHOTOS } from './photos';
import { C, DISPLAY, TYPE } from './styles';
import { AutoIcon, ButtonLink, Highlighted, PhoneFrame } from './ui';

/** Jeda munculnya notifikasi (detik), sesudah HP naik masuk. */
const NOTIF_DELAYS = [0.9, 1.4, 1.9] as const;

/**
 * Posisi kartu notifikasi relatif ke kotak HP. Wadah sempit (< @5xl): SATU kartu di tengah yang menutup judul + baris
 * pertama daftar transaksi (HP terpotong tepi bawah hero). Top & tinggi minimumnya diukur dari mockup (./hooks
 * useNoteSlot → --pn-note-top / --pn-note-h): tepi atas tepat di atas panel transaksi, tepi bawah melewati garis
 * pemisah baris terakhir yang tertutup, tanpa ikon/teks yang mengintip, juga bila blok di atas daftar dikosongkan
 * di CMS; nilai em cadangan (pra-render) = isi contoh. Layar lebar: tiga kartu sejajar di kiri HP, tepi
 * kanannya 17px ke dalam kotak HP (@5xl & @7xl), jadi hanya menimpa bingkai + tepi kosong layar (konten layar mulai
 * 1,7em: 24,65px di @5xl, 27,2px di @7xl), juga selama muncul (./paynow.css pn-notif tanpa geser mendatar). Pada wadah
 * 1024px tepi kirinya 5px di kanan kolom teks.
 */
const NOTIF_POS = [
  'left-1/2 top-[var(--pn-note-top,17.2em)] w-[252px] -translate-x-1/2 @5xl:left-[-195px] @5xl:top-[20%] @5xl:w-[212px] @5xl:translate-x-0 @7xl:left-[-231px] @7xl:w-[248px]',
  'hidden @5xl:block @5xl:left-[-195px] @5xl:top-[40%] @5xl:w-[212px] @7xl:left-[-231px] @7xl:w-[248px]',
  'hidden @5xl:block @5xl:left-[-195px] @5xl:top-[60%] @5xl:w-[212px] @7xl:left-[-231px] @7xl:w-[248px]',
] as const;

/** Ikon bilah navigasi bawah aplikasi (dekoratif, tanpa teks). */
const TAB_ICONS = [House, History, QrCode, TicketPercent, UserRound] as const;

function AppHome({ m }: { m: PaynowModel }) {
  const { hero } = m;
  const greeting = text(hero, 'app_greeting');
  const balanceLabel = text(hero, 'balance_label');
  const balance = text(hero, 'balance');
  const listTitle = text(hero, 'transactions_title');
  return (
    <div data-pn-app="" className="px-[1.1em] pb-[1.2em]">
      {greeting && (
        <div className="mt-[0.6em] flex items-center justify-between gap-[0.6em]">
          <span className="flex min-w-0 items-center gap-[0.55em]">
            <span aria-hidden className={`pn-grad flex h-[2.2em] w-[2.2em] shrink-0 items-center justify-center rounded-full text-[0.85em] font-bold text-white ${DISPLAY}`}>
              {greetingInitial(greeting)}
            </span>
            <span className={`truncate text-[0.95em] font-semibold ${C.ink} ${DISPLAY}`}>{greeting}</span>
          </span>
          <Bell aria-hidden className="h-[1.15em] w-[1.15em] shrink-0 text-[#0E0F2C]" strokeWidth={2} />
        </div>
      )}
      {(balanceLabel || balance) && (
        <div data-tpl-tone="inverse" className="pn-grad mt-[0.9em] rounded-[1.25em] px-[1.1em] py-[1em] text-white">
          <p className="flex items-center justify-between gap-2 text-[0.75em] font-medium text-white/90">
            <span className="truncate">{balanceLabel}</span>
            <Eye aria-hidden className="h-[1.2em] w-[1.2em] shrink-0" strokeWidth={2} />
          </p>
          {/* Satu baris: saldo 16 huruf yang realistis (mis. "Rp 12.500.000,00") paling lebar ±4px masuk padding kartu */}
          {balance && <p className={`mt-[0.2em] whitespace-nowrap text-[1.6em] font-bold leading-tight tracking-[-0.02em] tabular-nums ${DISPLAY}`}>{<CountUp value={balance} duration={1400} />}</p>}
        </div>
      )}
      {m.actions.length > 0 && (
        <ul className="mt-[1em] grid grid-cols-4 gap-[0.4em]">
          {m.actions.map((item, i) => {
            const label = field(item, 'label');
            return (
              <li key={`${label}-${i}`} className="flex min-w-0 flex-col items-center gap-[0.35em]">
                <span aria-hidden className="flex h-[2.75em] w-[2.75em] items-center justify-center rounded-[0.9em] bg-white text-(--pn-ink) ring-1 ring-inset ring-[#0E0F2C]/[0.07]">
                  <AutoIcon name={paymentIcon(label)} className="h-[1.3em] w-[1.3em]" strokeWidth={2} />
                </span>
                <span className={`max-w-full truncate text-[0.68em] font-semibold ${C.ink}`}>{label}</span>
              </li>
            );
          })}
        </ul>
      )}
      {m.transactions.length > 0 && (
        <div data-pn-list="" className="mt-[1.1em] rounded-[1.1em] bg-white px-[0.9em] py-[0.5em] ring-1 ring-inset ring-[#0E0F2C]/[0.06]">
          {listTitle && <p className={`truncate pb-[0.2em] pt-[0.35em] text-[0.7em] font-semibold ${C.muted}`}>{listTitle}</p>}
          <ul className="divide-y divide-[#0E0F2C]/[0.07]">
            {m.transactions.map((item, i) => {
              const title = field(item, 'title');
              const amount = field(item, 'amount');
              return (
                <li key={`${title}-${i}`} className="flex items-center gap-[0.6em] py-[0.55em]">
                  <span aria-hidden className="flex h-[2.1em] w-[2.1em] shrink-0 items-center justify-center rounded-full bg-(--pn-mist) text-(--pn-ink)">
                    <AutoIcon name={paymentIcon(`${title} ${field(item, 'meta')}`)} className="h-[1.05em] w-[1.05em]" strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-[0.74em] font-semibold ${C.ink}`}>{title}</span>
                    <span className={`block truncate text-[0.64em] ${C.muted}`}>{field(item, 'meta')}</span>
                  </span>
                  {amount && <span className={`shrink-0 text-[0.74em] font-semibold tabular-nums ${isCredit(amount) ? C.plus : C.ink}`}>{amount}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {/* Bilah navigasi bawah aplikasi: ikon saja (dekoratif), tombol pindai bergradasi di tengah */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 flex h-[3.9em] items-center justify-around border-t border-[#0E0F2C]/[0.07] bg-white px-[0.6em] pb-[0.3em]">
        {TAB_ICONS.map((Icon, i) =>
          i === 2 ? (
            <span key={i} className="pn-grad -mt-[1.4em] flex h-[3em] w-[3em] items-center justify-center rounded-full text-white ring-[0.3em] ring-white">
              <Icon className="h-[1.35em] w-[1.35em]" strokeWidth={2} />
            </span>
          ) : (
            <Icon key={i} className={`h-[1.25em] w-[1.25em] ${i === 0 ? 'text-(--pn-ink)' : 'text-[#0E0F2C]/45'}`} strokeWidth={2} />
          ),
        )}
      </div>
    </div>
  );
}

function Notifications({ m }: { m: PaynowModel }) {
  if (m.notifications.length === 0) return null;
  return (
    <ul aria-label="Contoh notifikasi" className="pointer-events-none absolute inset-0">
      {m.notifications.map((item, i) => (
        <li
          key={`${field(item, 'title')}-${i}`}
          data-pn-notif=""
          style={{ '--pn-at': `${NOTIF_DELAYS[i]}s` } as CSSProperties}
          className={`pn-notif absolute z-10 ${NOTIF_POS[i]}`}
        >
          {/* Putih pekat + ring tinta 1px (tanpa bayangan): kartu menumpuk di atas baris transaksi mockup, teks di belakangnya
              tidak boleh tembus dan tepinya tetap terlihat di atas panel putih. Ukuran isi dalam px seperti teksnya (tidak ikut
              ukuran huruf peramban). Wadah sempit: tinggi minimum dari mockup (--pn-note-h), teks satu baris, padding atas-bawah
              10px agar tanpa judul daftar kartu tetap muat menutup satu baris. Layar lebar: judul & keterangan maks. dua baris,
              jadi kartu paling tinggi ±96px dan tidak menumpuk ke kartu di bawahnya */}
          <div className="flex min-h-[var(--pn-note-h,5.5em)] items-center gap-[10px] rounded-[18px] bg-white px-[12px] py-[10px] ring-1 ring-inset ring-[#0E0F2C]/[0.12] @5xl:min-h-0 @5xl:items-start @5xl:py-[12px]">
            <span aria-hidden className="pn-grad flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full text-white">
              <CircleCheck className="h-[16px] w-[16px]" strokeWidth={2.4} />
            </span>
            <span className="min-w-0">
              <span className={`block text-[13px] font-semibold leading-snug @max-5xl:truncate @5xl:line-clamp-2 ${C.ink}`}>{field(item, 'title')}</span>
              {field(item, 'text') && <span className={`mt-[2px] block text-[12.5px] leading-snug @max-5xl:truncate @5xl:line-clamp-2 ${C.muted}`}>{field(item, 'text')}</span>}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Hero({ m }: { m: PaynowModel }) {
  const { hero } = m;
  const eyebrow = text(hero, 'eyebrow');
  const title = text(hero, 'title') || m.companyName;
  const subtitle = text(hero, 'subtitle');
  const image = text(hero, 'image');
  const primaryLabel = m.primaryAction ? text(hero, 'primary_label') : '';
  const secondaryLabel = m.secondaryAction ? text(hero, 'secondary_label') : '';
  const phoneBox = useRef<HTMLDivElement>(null);
  const slot = useNoteSlot(phoneBox);

  return (
    <TemplateSection sectionKey="hero" data-hero-layout="wallet" data-tpl-tone="inverse" className="relative isolate overflow-hidden bg-(--pn-night) text-white">
      <KitPhoto
        src={image}
        alt={PAYNOW_PHOTOS.alt(image, `Suasana pembayaran digital dengan ${m.companyName}`)}
        priority
        fallback="none"
        sizes="100vw"
        className="absolute inset-0"
        imgClassName="object-[62%_50%]"
      />
      <div aria-hidden className="pn-hero-scrim absolute inset-0" />
      <div aria-hidden className="pn-sheen absolute inset-0" />

      <div className={`${CONTAINER} relative`}>
        <div className="grid pt-[104px] @3xl:pt-[120px] @5xl:min-h-[max(680px,min(92svh,860px))] @5xl:grid-cols-12 @5xl:items-center @5xl:gap-x-8 @5xl:pb-16 @5xl:pt-[128px]">
          <div className="min-w-0 @5xl:col-span-6 @7xl:col-span-6">
            {eyebrow && (
              <Reveal as="p" className="inline-flex h-9 max-w-full items-center gap-2.5 rounded-full bg-white/[0.08] px-3.5 text-[13.5px] font-semibold text-white ring-1 ring-inset ring-white/20 backdrop-blur-md">
                <span aria-hidden className="pn-grad h-2 w-2 shrink-0 rounded-full ring-2 ring-white/25" />
                <span className="truncate">{eyebrow}</span>
              </Reveal>
            )}
            <Reveal as="h1" delay={80} className={`${eyebrow ? 'mt-6' : ''} max-w-[14ch] text-white ${TYPE.h1}`}>
              <Highlighted title={title} highlight={text(hero, 'highlight')} tone="dark" />
            </Reveal>
            {subtitle && (
              <Reveal as="p" delay={160} className={`mt-5 max-w-[46ch] text-pretty text-white/[0.82] ${TYPE.lead}`}>
                {subtitle}
              </Reveal>
            )}
            {(primaryLabel || secondaryLabel) && (
              <Reveal delay={240} className="mt-8 flex flex-col gap-3 @xl:flex-row @xl:flex-wrap @xl:items-center">
                <ButtonLink action={m.primaryAction} label={primaryLabel} variant="light" icon={<Download aria-hidden className="h-[18px] w-[18px] shrink-0" />} />
                <ButtonLink action={m.secondaryAction} label={secondaryLabel} variant="ghost" icon={<Store aria-hidden className="h-[18px] w-[18px] shrink-0" />} />
              </Reveal>
            )}
            {m.chips.length > 0 && (
              <Reveal as="ul" delay={320} className="mt-7 flex flex-wrap gap-2">
                {m.chips.map((item, i) => (
                  <li key={`${field(item, 'label')}-${i}`} className="inline-flex h-9 items-center gap-2 rounded-full bg-white/[0.06] px-3.5 text-[13.5px] text-white/85 ring-1 ring-inset ring-white/15">
                    <CircleCheck aria-hidden className="h-4 w-4 shrink-0 text-(--pn-glow)" strokeWidth={2.2} />
                    {field(item, 'label')}
                  </li>
                ))}
              </Reveal>
            )}
          </div>

          <div className="mt-12 min-w-0 @5xl:col-span-6 @5xl:mt-0 @7xl:col-span-5 @7xl:col-start-8">
            {/* Kotak HP = acuan posisi notifikasi (kotak kartu HP dari ukuran mockup). HP: terpotong tepi bawah hero; layar
                lebar: utuh, rata kanan */}
            <div
              ref={phoneBox}
              data-pn-phone="hero"
              style={slot ? ({ '--pn-note-top': `${slot.top.toFixed(2)}px`, '--pn-note-h': `${slot.height.toFixed(2)}px` } as CSSProperties) : undefined}
              className="pn-phone-in relative mx-auto w-max text-[13.2px] @3xl:text-[15px] @5xl:ml-auto @5xl:mr-2 @5xl:text-[14.5px] @7xl:text-[16px]"
            >
              <div className="h-[390px] overflow-hidden @3xl:h-[470px] @5xl:h-auto @5xl:overflow-visible">
                <PhoneFrame label="Contoh tampilan aplikasi">
                  <AppHome m={m} />
                </PhoneFrame>
              </div>
              <Notifications m={m} />
            </div>
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}
