// Pasar (kunci `markets`) + Proses kerja (kunci `process`).
// Pasar: SATU-SATUNYA pita penuh warna tema di halaman (data-tpl-tone="inverse"). Kiri (kolom 1-5): label, H2,
// deskripsi, label Incoterm bergaris tipis, dan foto kapal 3:2 opsional. Kanan (kolom 7-12): tabel kawasan — nama
// kawasan besar, pelabuhan mono di bawahnya, jumlah negara mono + pin persegi di kanan. Tanpa foto: judul kolom 1-7,
// Incoterm kolom 9-12, tabel selebar wadah. HP: label → H2 → deskripsi → foto → tabel → Incoterm.
// Proses: tabel manifest dengan garis tinta tegas di atas; tiap baris nomor mono, H3, penjelasan, dan chip dokumen
// keluaran rata kanan. HP: nomor + H3 sebaris, penjelasan, lalu chip.
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { pad2, splitTags, type DermagaModel } from './model';
import { DERMAGA_PHOTOS } from './photos';
import { C, DISPLAY, GRID_GAP, MONO_LABEL, MONO_VALUE, SECTION_PAD, TYPE_D } from './styles';
import { DotList, SectionHead } from './ui';

export function Markets({ m }: { m: DermagaModel }) {
  const { markets } = m;
  const regions = m.items('markets');
  const image = text(markets, 'image');
  const withPhoto = hasImage(image);
  const terms = splitTags(text(markets, 'terms'));
  const termsLabel = text(markets, 'terms_label');

  const head = (
    <SectionHead
      layout="stack"
      tone="dark"
      eyebrow={text(markets, 'eyebrow')}
      number={m.number('markets')}
      title={text(markets, 'title')}
      subtitle={text(markets, 'subtitle')}
      srTitle={text(markets, 'eyebrow') || 'Pasar & rute'}
    />
  );
  const termBlock = terms.length > 0 && (
    <Reveal delay={200}>
      {termsLabel && <p className={`${MONO_LABEL} text-white/80`}>{termsLabel}</p>}
      <ul aria-label={termsLabel || 'Incoterm'} className={`flex flex-wrap gap-2 ${termsLabel ? 'mt-4' : ''}`}>
        {terms.map((term, j) => (
          <li key={`${term}-${j}`} className="inline-flex h-8 items-center rounded-[2px] px-2.5 font-mono text-[12.5px] font-medium text-white ring-1 ring-inset ring-white/30">
            {term}
          </li>
        ))}
      </ul>
    </Reveal>
  );
  // Dengan foto (layar lebar): tabel mengisi tinggi kolom kiri — baris dibagi rata, isi di tengah — supaya dasar tabel
  // sejajar dengan dasar foto, bukan menyisakan blok kosong di kanan bawah.
  const table = (
    <ul className={`border-t border-white/25 ${withPhoto ? '@5xl:flex @5xl:h-full @5xl:flex-col' : ''}`}>
      {regions.map((item, i) => (
        <Reveal
          as="li"
          variant="left"
          key={`${field(item, 'name')}-${i}`}
          delay={stagger(i)}
          className={`grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-6 border-b border-white/15 py-5 @3xl:py-6 ${withPhoto ? '@5xl:flex-1 @5xl:content-center' : ''}`}
        >
          <div className="min-w-0">
            <h3 className={`${DISPLAY} text-[22px] font-medium leading-tight tracking-[-0.025em] text-white @3xl:text-[26px]`}>{field(item, 'name')}</h3>
            <DotList
              items={splitTags(field(item, 'ports'))}
              label={`Pelabuhan ${field(item, 'name')}`.trim()}
              className={`mt-2 ${MONO_VALUE} leading-relaxed text-(--dm-bright)`}
            />
          </div>
          {field(item, 'count') && (
            <p className={`flex items-center gap-2.5 pt-1.5 ${MONO_VALUE} whitespace-nowrap text-white @3xl:pt-2.5`}>
              {field(item, 'count')}
              <span aria-hidden className="h-1.5 w-1.5 bg-(--dm-bright)" />
            </p>
          )}
        </Reveal>
      ))}
    </ul>
  );
  const photo = withPhoto && (
    <Reveal variant="fade">
      <KitPhoto
        src={image}
        alt={DERMAGA_PHOTOS.alt(image, `Kapal kontainer rute ${m.companyName}`)}
        fallback="none"
        zoom
        sizes="(min-width: 1024px) 40vw, 100vw"
        className="aspect-[3/2] ring-1 ring-white/15"
      />
    </Reveal>
  );

  return (
    <TemplateSection sectionKey="markets" data-tpl-tone="inverse" className={`bg-(--dm-band) text-white ${SECTION_PAD}`}>
      {withPhoto ? (
        <div className={`${CONTAINER} grid grid-cols-1 @5xl:grid-cols-12 @5xl:grid-rows-[auto_auto_1fr] ${GRID_GAP}`}>
          <div className="order-1 min-w-0 @5xl:order-none @5xl:col-span-5 @5xl:row-start-1">{head}</div>
          {termBlock && <div className="order-4 mt-10 min-w-0 @5xl:order-none @5xl:col-span-5 @5xl:row-start-2">{termBlock}</div>}
          <div className="order-2 mt-10 min-w-0 @5xl:order-none @5xl:col-span-5 @5xl:row-start-3 @5xl:self-end">{photo}</div>
          <div className="order-3 mt-10 min-w-0 @5xl:order-none @5xl:col-span-6 @5xl:col-start-7 @5xl:row-span-3 @5xl:row-start-1 @5xl:mt-0">{table}</div>
        </div>
      ) : (
        <div className={`${CONTAINER} grid grid-cols-1 @5xl:grid-cols-12 ${GRID_GAP}`}>
          <div className="min-w-0 @5xl:col-span-7">{head}</div>
          {termBlock && <div className="order-last mt-10 min-w-0 @5xl:order-none @5xl:col-span-4 @5xl:col-start-9 @5xl:self-end">{termBlock}</div>}
          <div className="mt-10 min-w-0 @5xl:col-span-12 @3xl:mt-14">{table}</div>
        </div>
      )}
    </TemplateSection>
  );
}

export function Process({ m }: { m: DermagaModel }) {
  const { process } = m;
  const steps = m.items('process');
  return (
    <TemplateSection sectionKey="process" className={SECTION_PAD}>
      <div className={CONTAINER}>
        <SectionHead
          eyebrow={text(process, 'eyebrow')}
          number={m.number('process')}
          title={text(process, 'title')}
          subtitle={text(process, 'subtitle')}
          srTitle={text(process, 'eyebrow') || 'Proses kerja'}
        />
        <ol className="mt-10 border-t border-[#0F1D20] @3xl:mt-14">
          {steps.map((item, i) => (
            <Reveal
              as="li"
              key={`${field(item, 'title')}-${i}`}
              delay={stagger(i)}
              className={`grid grid-cols-[2rem_minmax(0,1fr)] gap-y-3 border-b py-6 ${C.line} @5xl:grid-cols-12 @5xl:items-baseline @5xl:py-7 ${GRID_GAP}`}
            >
              <span aria-hidden className="font-mono text-[13px] font-medium tabular-nums text-(--tpl-accent-ink) @5xl:col-span-1">
                {pad2(i + 1)}
              </span>
              <h3 className={`${TYPE_D.h3} ${C.ink} @5xl:col-span-4`}>{field(item, 'title')}</h3>
              {field(item, 'text') && (
                <p className={`col-start-2 max-w-[56ch] ${TYPE_D.body} ${C.muted} @5xl:col-span-4 @5xl:col-start-6`}>{field(item, 'text')}</p>
              )}
              {field(item, 'output') && (
                <p className="col-start-2 @5xl:col-span-3 @5xl:col-start-10 @5xl:flex @5xl:justify-end">
                  <span className={`inline-flex min-h-8 items-center rounded-[2px] px-2.5 py-1 font-mono text-[12.5px] font-medium ring-1 ring-inset ring-[#0F1D20]/20 ${C.ink}`}>
                    <span className="sr-only">Hasil: </span>
                    {field(item, 'output')}
                  </span>
                </p>
              )}
            </Reveal>
          ))}
        </ol>
      </div>
    </TemplateSection>
  );
}
