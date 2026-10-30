// Hero Lajur — "Coach" (data-hero-layout="coach"): foto jalan pegunungan selebar layar SEBAGAI LATAR, lapisan tinta dari
// kiri (86% → 0 di ±72% lebar) + bawah, lalu di kolom kiri: chip kaca gelap berisi fakta (garasi · wilayah, bukan
// pengulangan judul), H1 Unbounded tebal (bagian sorotan warna tema yang dicerahkan, --lj-hero), kalimat singkat dua
// baris, tombol amber "Cek armada & harga" + tombol garis putih WhatsApp. BILAH MINTA PENAWARAN menempel di tepi bawah
// foto (separuh di foto, separuh di putih), selebar wadah; di laptop pendek (1366×768) barisnya tetap terlihat.
// HP: foto terlihat di atas, teks di atas gradasi tinta di bagian bawah foto, bilah bertumpuk 2×2 di bawahnya.
// Gerak: teks muncul 0/80/160/240 ms, bilah naik di 240 ms; foto (LCP) tidak pernah disembunyikan & tanpa Ken Burns.
import { Reveal } from '../shared/Animated';
import { WhatsAppIcon } from '../shared/icons';
import { TemplateSection } from '../shared/Shell';
import { splitHighlight, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { LajurModel, QuoteForm } from './model';
import { LAJUR_PHOTOS } from './photos';
import { QuoteBar } from './Quote';
import { TYPE, WRAP } from './styles';
import { ButtonLink, LiveryBars } from './ui';

export function Hero({
  m,
  form,
  setForm,
  preferred,
  setPreferred,
  focusSignal,
}: {
  m: LajurModel;
  form: QuoteForm;
  setForm: (next: QuoteForm) => void;
  preferred: number | null;
  setPreferred: (index: number | null) => void;
  focusSignal: number;
}) {
  const { hero } = m;
  const eyebrow = text(hero, 'eyebrow');
  const title = text(hero, 'title') || m.companyName;
  const parts = splitHighlight(title, text(hero, 'highlight'));
  const subtitle = text(hero, 'subtitle');
  const image = text(hero, 'image');
  const primary = m.sectionAction('fleet') ?? m.sectionAction('routes') ?? m.sectionAction('contact');
  const secondary = m.waAction;

  return (
    <TemplateSection sectionKey="hero" data-hero-layout="coach" className="relative isolate bg-white">
      <div data-tpl-tone="inverse" className="relative isolate overflow-hidden bg-[#14161A] text-white">
        <div className="absolute inset-0">
          <KitPhoto
            src={image}
            alt={LAJUR_PHOTOS.alt(image, `Perjalanan rombongan bersama ${m.companyName}`)}
            priority
            fallback="none"
            // HP: foto 16:9 menutupi kotak tegak (±2,3× lebar layar) lalu dipotong diam 1,25× dari bawah, supaya pita
            // atas yang tidak bertinta menampilkan punggung bukit hijau, bukan langit mendung (tanpa animasi)
            sizes="(max-width: 767px) 290vw, 100vw"
            className="absolute inset-0"
            imgClassName="origin-[30%_100%] scale-[1.25] object-[34%_50%] @3xl:scale-100 @3xl:object-[50%_55%]"
          />
        </div>
        <div aria-hidden className="lj-hero-scrim absolute inset-0" />

        <div
          // Layar lebar (@5xl, bilah satu baris): hero 40px lebih pendek dari layar dikurangi header & bilah, jadi baris isian
          // + tombol "Minta penawaran" selesai ≥ 16px di atas tombol WhatsApp melayang (situs: 56px @ 32px dari tepi) di
          // laptop pendek 1024×768–1440×900; dulu tombol itu menutupi sudut kanan-bawah tombol bilah. Layar ≥ 1080px:
          // tetap dibatasi 820px.
          className={`${WRAP} relative flex min-h-[max(600px,calc(100svh-var(--tpl-sticky-top,0px)-68px))] flex-col justify-end pb-[88px] pt-28 @3xl:min-h-[max(520px,min(calc(100svh-var(--tpl-sticky-top,0px)-76px-72px),820px))] @3xl:pb-[124px] @5xl:min-h-[max(520px,min(calc(100svh-var(--tpl-sticky-top,0px)-76px-112px),820px))] @5xl:justify-center @5xl:pb-[112px] @5xl:pt-10`}
        >
          {/* HP (< 48rem): lajur kanan --lj-lane dibiarkan kosong sampai 8px di kiri tombol WhatsApp melayang Shell (demo &
              layar < 640px 48px @ 16px dari tepi; situs ≥ 640px 56px @ 32px): kalimat & tombol hero berhenti di kirinya. Di
              HP pendek (tinggi < ±720px) hero lebih tinggi dari layar (min. 600px), jadi ujung kalimat dan tombol jatuh
              tepat di baris tombol itu pada layar pertama (320×568: "lalu minta harga" tertutup). Tablet & layar lebar:
              kolom teks maks. 640px / 50%, sudah ≥ 96px dari tepi kanan. */}
          <div className="max-w-[640px] [--lj-lane:3.25rem] @xl:[--lj-lane:4.75rem] @2xl:[--lj-lane:4rem] @3xl:[--lj-lane:0px] @5xl:max-w-[50%] @7xl:max-w-[46%]">
            {eyebrow && (
              <Reveal
                as="p"
                variant="fade"
                className="inline-flex max-w-full items-center gap-2.5 rounded-[6px] bg-[#14161A]/55 px-3 py-2 text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-white ring-1 ring-inset ring-white/15 backdrop-blur-md"
              >
                <LiveryBars className="h-2.5 w-[18px]" fill="fill-(--lj-bright)" />
                <span className="min-w-0 truncate">{eyebrow}</span>
              </Reveal>
            )}
            <Reveal as="h1" delay={80} className={`${eyebrow ? 'mt-5 @3xl:mt-6' : ''} max-w-[13ch] text-white ${TYPE.h1}`}>
              {parts ? (
                <>
                  {parts[0]}
                  <span className="text-(--lj-hero)">{parts[1]}</span>
                  {parts[2]}
                </>
              ) : (
                title
              )}
            </Reveal>
            {subtitle && (
              // Layar lebar: lebar baris mengikuti kolom tapi dibatasi 52ch (± 68 huruf) → kalimat 120–140 huruf tetap dua
              // baris di 1366–2560px, tidak menjadi satu baris panjang di layar sangat lebar
              <Reveal as="p" delay={160} className={`mt-5 max-w-[min(46ch,calc(100%-var(--lj-lane)))] text-pretty text-white/90 @5xl:max-w-[52ch] ${TYPE.lead}`}>
                {subtitle}
              </Reveal>
            )}
            {(primary || secondary) && (
              <Reveal delay={240} className="mt-7 flex flex-col gap-3 pr-(--lj-lane) @xl:flex-row @xl:flex-wrap">
                <ButtonLink action={primary} label={text(hero, 'primary_label')} />
                <ButtonLink
                  action={secondary}
                  label={text(hero, 'secondary_label')}
                  variant="ghostLight"
                  arrow={false}
                  icon={<WhatsAppIcon className="h-[18px] w-[18px] shrink-0" />}
                />
              </Reveal>
            )}
          </div>
        </div>
      </div>

      {/* Bilah minta penawaran: separuh menumpang di tepi bawah foto */}
      <div className={`${WRAP} relative z-10 -mt-[56px] @3xl:-mt-[72px]`}>
        <Reveal delay={240}>
          <QuoteBar m={m} form={form} setForm={setForm} preferred={preferred} setPreferred={setPreferred} focusSignal={focusSignal} />
        </Reveal>
      </div>
    </TemplateSection>
  );
}
