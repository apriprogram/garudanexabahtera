// Fasilitas di kabin (kunci `onboard`, pita #F2F4FA) + Cara pesan tiket (kunci `steps`, putih).
// Fasilitas: susunan BENTO selebar wadah — layar lebar 4 kolom: foto kabin besar 2×2 (keterangan kaca), empat ubin ikon,
// dua foto kecil di bawah foto besar, lalu sisa ubin; tablet 2 kolom, HP 1 kolom. Ubin putih radius 18: ikon otomatis
// dari nama (lingkaran tint warna tema), judul, satu kalimat.
// Cara pesan: tiga "sobekan tiket" (pita, radius 18, takik setengah lingkaran di kiri-kanan, garis putus-putus) dengan
// nomor mono besar 01/02/03 dan panah di antaranya (layar lebar), plus catatan jujur: pemesanan hanya menyusun pesan
// WhatsApp; tidak ada pembayaran online, e-tiket, atau pilihan kursi real-time.
import { ArrowDown, ArrowRight } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, list, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { pad2, type NusalineModel } from './model';
import { NUSALINE_PHOTOS } from './photos';
import { C, CARD, DISPLAY, LABEL_SM, MONO, SECTION_PAD, TYPE, WRAP } from './styles';
import { FeatureIcon, SectionHead } from './ui';

// Keterangan kaca di atas foto: di HP (foto kecil ± 170px) boleh dua baris, tidak terpotong "…"; layar lebar satu baris pill
const CAPTION = `absolute bottom-3 left-3 max-w-[calc(100%-24px)] rounded-[10px] bg-[#0B1026]/70 px-3 py-1.5 leading-[1.35] text-white backdrop-blur-md @3xl:truncate @3xl:rounded-full ${LABEL_SM}`;

function Tile({ title, body, index }: { title: string; body: string; index: number }) {
  return (
    <Reveal as="li" delay={stagger(index, 60)} className={`flex min-w-0 flex-col ${CARD} p-4 @3xl:p-6`}>
      <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-full bg-(--tpl-accent-50) text-(--nl-ink) ring-1 ring-inset ring-(--tpl-accent-100)">
        <FeatureIcon title={title} className="h-5 w-5" />
      </span>
      <h3 className={`mt-3 text-[17px] ${DISPLAY} font-bold leading-tight ${C.ink} @3xl:mt-4 @3xl:text-[20px]`}>{title}</h3>
      {body && <p className={`mt-1.5 text-[13.5px] leading-snug ${C.muted} @3xl:text-[14.5px]`}>{body}</p>}
    </Reveal>
  );
}

export function Onboard({ m }: { m: NusalineModel }) {
  const { onboard } = m;
  const items = m.items('onboard');
  const image = text(onboard, 'image');
  const caption = text(onboard, 'caption');
  const photos = list(onboard, 'photos', 2).filter((p) => hasImage(field(p, 'image')));
  const big = hasImage(image);
  // Urutan DOM = urutan bento: foto besar, 4 ubin, foto kecil (di bawah foto besar), sisa ubin
  const head = items.slice(0, big ? 4 : items.length);
  const rest = big ? items.slice(4) : [];

  return (
    <TemplateSection sectionKey="onboard" className={`${C.band} ${SECTION_PAD}`}>
      <div className={WRAP}>
        <SectionHead eyebrow={text(onboard, 'eyebrow')} title={text(onboard, 'title')} subtitle={text(onboard, 'subtitle')} srTitle="Fasilitas di kabin" />
        <ul className="mt-10 grid grid-cols-2 gap-3 @3xl:mt-12 @5xl:grid-cols-4 @5xl:gap-4">
          {big && (
            <Reveal as="li" className="col-span-2 min-w-0 @5xl:row-span-2">
              <KitPhoto
                src={image}
                alt={NUSALINE_PHOTOS.alt(image, caption || 'Kabin bus malam')}
                sizes="(min-width: 1024px) 50vw, 100vw"
                parallax
                className="aspect-[3/2] h-full w-full rounded-[18px] @5xl:aspect-auto @5xl:min-h-[360px]"
              >
                {caption && <span className={CAPTION}>{caption}</span>}
              </KitPhoto>
            </Reveal>
          )}
          {head.map((item, i) => (
            <Tile key={`${field(item, 'title')}-${i}`} title={field(item, 'title')} body={field(item, 'text')} index={i} />
          ))}
          {photos.map((p, i) => (
            <Reveal as="li" key={`${field(p, 'image')}-${i}`} delay={stagger(i, 80)} className="min-w-0">
              <KitPhoto
                src={field(p, 'image')}
                alt={NUSALINE_PHOTOS.alt(field(p, 'image'), field(p, 'caption') || 'Foto perjalanan')}
                sizes="(min-width: 1024px) 25vw, (min-width: 672px) 50vw, 100vw"
                zoom
                className="aspect-[4/3] h-full w-full rounded-[18px] @5xl:aspect-auto @5xl:min-h-[220px]"
              >
                {field(p, 'caption') && <span className={CAPTION}>{field(p, 'caption')}</span>}
              </KitPhoto>
            </Reveal>
          ))}
          {rest.map((item, i) => (
            <Tile key={`${field(item, 'title')}-r${i}`} title={field(item, 'title')} body={field(item, 'text')} index={i + 4} />
          ))}
        </ul>
      </div>
    </TemplateSection>
  );
}

export function Steps({ m }: { m: NusalineModel }) {
  const { steps } = m;
  const items = m.items('steps');
  const note = text(steps, 'note');
  const cols = ['', '', '@5xl:grid-cols-2', '@5xl:grid-cols-3', '@5xl:grid-cols-4'][items.length] ?? '@5xl:grid-cols-3';
  return (
    <TemplateSection sectionKey="steps" className={`bg-white ${SECTION_PAD}`}>
      <div className={WRAP}>
        <SectionHead eyebrow={text(steps, 'eyebrow')} title={text(steps, 'title')} subtitle={text(steps, 'subtitle')} srTitle="Cara pesan tiket" />
        <ol className={`mt-10 grid gap-4 @3xl:mt-12 @5xl:gap-8 ${cols}`}>
          {items.map((item, i) => (
            <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i, 100)} className="relative min-w-0">
              <div className="nl-ticket grid h-full grid-cols-[auto_minmax(0,1fr)] rounded-[18px] bg-[#F2F4FA]">
                <span aria-hidden className={`flex items-center border-r-2 border-dashed border-[#0E1230]/15 px-5 ${MONO} text-[36px] font-semibold tracking-[-0.04em] text-(--nl-ink) @3xl:px-7 @3xl:text-[44px]`}>
                  {pad2(i + 1)}
                </span>
                <div className="min-w-0 py-5 pl-5 pr-6 @3xl:py-7 @3xl:pl-7">
                  <h3 className={`${TYPE.h3} ${C.ink}`}>
                    <span className="sr-only">Langkah {i + 1}: </span>
                    {field(item, 'title')}
                  </h3>
                  {field(item, 'text') && <p className={`mt-1.5 text-pretty text-[15px] leading-snug ${C.muted}`}>{field(item, 'text')}</p>}
                </div>
              </div>
              {i < items.length - 1 && (
                <span
                  aria-hidden
                  // Layar lebar: tepat di tengah celah 32px antar-tiket (menutup kedua takik sama banyak)
                  className="absolute -bottom-[18px] left-[38px] z-10 flex h-8 w-8 items-center justify-center rounded-full bg-(--tpl-accent) text-(--tpl-on-accent) ring-4 ring-white @3xl:left-[46px] @5xl:-right-8 @5xl:bottom-auto @5xl:left-auto @5xl:top-1/2 @5xl:-translate-y-1/2"
                >
                  <ArrowDown className="h-4 w-4 @5xl:hidden" />
                  <ArrowRight className="hidden h-4 w-4 @5xl:block" />
                </span>
              )}
            </Reveal>
          ))}
        </ol>
        {note && <p className={`mt-8 max-w-[70ch] text-[14px] ${C.muted}`}>{note}</p>}
      </div>
    </TemplateSection>
  );
}
