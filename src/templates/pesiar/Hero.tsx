// Hero Pesiar — "Vista" (data-hero-layout="vista"), hero PALING SEDERHANA di batch ini: foto pemandangan Bali selebar
// layar SEBAGAI LATAR seluruh hero, header transparan di atasnya, lapisan hijau tua lembut (atas untuk menu, elips di
// belakang teks, bawah untuk bilah kepercayaan), lalu di tengah: label miring Playfair bergaris kiri-kanan, H1 Playfair
// besar rata tengah, satu kalimat, dua tombol pil ("Rancang tur" warna tema, "Antar-jemput bandara" garis putih). Di
// tepi bawah: bilah kaca tipis dengan tiga keunggulan (ikon otomatis + teks pendek). Tanpa formulir, angka, atau lencana.
// HP: setinggi layar terlihat, teks di tengah, tombol bertumpuk penuh-lebar, bilah kaca menjadi tiga baris.
// Gerak (./pesiar.css): Ken Burns 1 → 1,06 selama 14 dtk SEKALI pada WADAH foto (foto/LCP tidak pernah disembunyikan),
// teks muncul bertahap 0/80/160/240/320 ms, garis petunjuk gulir tergambar sekali.
import { Reveal } from '../shared/Animated';
import { TemplateSection } from '../shared/Shell';
import { text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { textItems, type PesiarModel } from './model';
import { PESIAR_PHOTOS } from './photos';
import { SERIF, TYPE, WRAP } from './styles';
import { AutoIcon, ButtonLink } from './ui';

export function Hero({ m }: { m: PesiarModel }) {
  const { hero } = m;
  const eyebrow = text(hero, 'eyebrow');
  const title = text(hero, 'title') || m.companyName;
  const subtitle = text(hero, 'subtitle');
  const image = text(hero, 'image');
  const trust = textItems(hero, 'trust', 3);
  const primary = m.linkOr(text(hero, 'primary_url'), m.sectionAction('planner') ?? m.bookAction);
  const secondary = m.linkOr(text(hero, 'secondary_url'), m.sectionAction('transfer'));

  return (
    <TemplateSection sectionKey="hero" data-hero-layout="vista" data-tpl-tone="inverse" className="relative isolate overflow-hidden bg-[#17332B] text-white">
      <div className="absolute inset-0 overflow-hidden">
        <div className="ps-kenburns absolute inset-0">
          <KitPhoto
            src={image}
            alt={PESIAR_PHOTOS.alt(image, `Pemandangan Bali, ${m.companyName}`)}
            priority
            fallback="none"
            // HP: foto 16:9 menutupi kotak tegak (± 390 × 790) sehingga tergambar ± 2,6× lebar layar
            sizes="(max-width: 767px) 260vw, 100vw"
            className="absolute inset-0"
            imgClassName="object-[34%_50%] @3xl:object-[50%_42%]"
          />
        </div>
        <div aria-hidden className="ps-hero-scrim absolute inset-0" />
      </div>

      {/* Jarak atas = bilah menu (64/72px) + ruang napas. HP: setinggi layar terlihat (dikurangi bilah demo); jarak bawah
          80px = tombol WhatsApp melayang (16 + 48px) + 16px, jadi panel kepercayaan tidak tertutup tombol itu. */}
      <div
        className={`${WRAP} relative flex min-h-[max(600px,calc(100svh-var(--tpl-sticky-top,0px)))] flex-col pb-[80px] pt-[92px] @3xl:min-h-[max(620px,min(90svh,900px))] @3xl:pb-8 @3xl:pt-[144px]`}
      >
        <div className="flex flex-1 flex-col items-center justify-center pb-8 text-center @3xl:pb-10">
          {eyebrow && (
            <Reveal as="p" variant="fade" className={`flex max-w-full items-center justify-center gap-3.5 ${TYPE.label} text-[17px] text-white @3xl:text-[19px]`}>
              <span aria-hidden className="h-px w-8 shrink-0 bg-white/70" />
              <span className="min-w-0 text-balance">{eyebrow}</span>
              <span aria-hidden className="h-px w-8 shrink-0 bg-white/70" />
            </Reveal>
          )}
          <Reveal as="h1" delay={80} className={`${eyebrow ? 'mt-5 @3xl:mt-6' : ''} max-w-[16ch] text-white ${TYPE.h1}`}>
            {title}
          </Reveal>
          {subtitle && (
            <Reveal as="p" delay={160} className={`mt-5 max-w-[52ch] text-pretty text-white/90 ${TYPE.lead} @3xl:mt-6`}>
              {subtitle}
            </Reveal>
          )}
          {(primary || secondary) && (
            <Reveal delay={240} className="mt-8 flex w-full flex-col items-stretch gap-3 @xl:w-auto @xl:flex-row @xl:items-center @xl:justify-center @3xl:mt-9">
              <ButtonLink action={primary} label={text(hero, 'primary_label')} />
              <ButtonLink action={secondary} label={text(hero, 'secondary_label')} variant="light" />
            </Reveal>
          )}
          <span aria-hidden className="ps-cue mt-10 hidden h-12 w-px bg-white/60 @3xl:block" />
        </div>

        {trust.length > 0 && (
          <Reveal delay={320} className="flex justify-center">
            <ul
              aria-label="Keunggulan"
              className="grid w-full gap-x-6 gap-y-1 rounded-[22px] bg-white/[0.12] px-5 py-3 ring-1 ring-inset ring-white/25 backdrop-blur-md @3xl:flex @3xl:w-auto @3xl:items-center @3xl:gap-0 @3xl:rounded-full @3xl:px-3 @3xl:py-2"
            >
              {trust.map((item, i) => (
                <li
                  key={`${item}-${i}`}
                  className={`flex min-h-9 items-center gap-3 text-[14px] font-medium text-white @3xl:min-h-10 @3xl:px-5 @3xl:text-[15px] ${i > 0 ? '@3xl:border-l @3xl:border-white/25' : ''}`}
                >
                  <AutoIcon label={item} className="h-[18px] w-[18px] shrink-0 text-white" />
                  <span className={`${SERIF} italic`}>{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        )}
      </div>
    </TemplateSection>
  );
}
