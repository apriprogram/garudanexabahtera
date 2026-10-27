// Sambutan kepala sekolah (kunci `welcome`), pita putih. Layar lebar: kiri 5 kolom foto tegak 4:5 dengan papan nama navy
// yang menempel di bawahnya (nama serif + jabatan mono); kanan 7 kolom label "/01 — Sambutan", H2, tanda kutip serif
// besar warna tema, kutipan miring besar, isi sambutan, dan tautan opsional. HP: label + H2, foto, papan nama, kutipan,
// isi.
// TANPA foto (demo sengaja begitu: nama kepala sekolah fiktif tidak ditempel pada wajah foto stok, sama dengan kartu guru
// dan alumni yang memakai inisial) → papan monogram navy: layar lebar panel 4:5 dengan logo sekolah di kotak putih,
// inisial serif besar, garis pendek warna terang tema, nama, dan jabatan; HP baris ringkas (kotak inisial + nama +
// jabatan). Tanpa foto dan tanpa nama/jabatan → tanpa kolom kiri; judul & isi selebar penuh.
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { TemplateSection } from '../shared/Shell';
import { hasImage, initials, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { LogoChip } from './Header';
import { paragraphsOf, type NawasenaModel } from './model';
import { NAWASENA_PHOTOS } from './photos';
import { C, DISPLAY, SECTION_PAD, TYPE_N } from './styles';
import { SectionHead, TextLink } from './ui';

/** Inisial tanpa gelar akademik di depan (Dra., Drs., Dr., Ir., H., Hj.) dan di belakang koma (", M.Pd."). */
const nameInitials = (name: string) => initials(name.replace(/^((dra?s?|dr|ir|hj?|prof)\.?\s+)+/i, '').replace(/,.*$/, ''), '');

/** Papan monogram navy (tanpa foto). Inisial dekoratif (aria-hidden): nama ditulis lengkap di bawahnya. */
function MonogramPlate({ m, name, role }: { m: NawasenaModel; name: string; role: string }) {
  const letters = name ? nameInitials(name) : '';
  return (
    <div
      data-tpl-tone="inverse"
      data-nw-plate
      className="nw-hero-fallback relative isolate flex items-center gap-4 overflow-hidden rounded-[8px] p-5 text-white @3xl:p-7 @5xl:aspect-[4/5] @5xl:flex-col @5xl:items-start @5xl:justify-between @5xl:p-10"
    >
      <span aria-hidden className="hidden @5xl:block">
        <LogoChip logo={m.logo} className="h-12 w-12" />
      </span>
      <div className="flex min-w-0 items-center gap-4 @5xl:block">
        {letters && (
          <span
            aria-hidden
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[6px] text-[24px] leading-none ring-1 ring-inset ring-white/15 @5xl:h-auto @5xl:w-auto @5xl:justify-start @5xl:rounded-none @5xl:text-[112px] @5xl:ring-0 ${DISPLAY} font-normal`}
          >
            {letters}
          </span>
        )}
        <span aria-hidden className="mt-6 hidden h-px w-10 bg-(--nw-bright) @5xl:block" />
        <div className="min-w-0 @5xl:mt-6">
          {name && <p className={`text-[19px] leading-tight text-white @3xl:text-[21px] @5xl:text-[26px] ${DISPLAY} font-normal`}>{name}</p>}
          {role && <p className={`mt-1.5 text-white/[0.72] ${TYPE_N.mono}`}>{role}</p>}
        </div>
      </div>
    </div>
  );
}

export function Welcome({ m }: { m: NawasenaModel }) {
  const { welcome } = m;
  const quote = text(welcome, 'quote');
  const body = paragraphsOf(text(welcome, 'body'));
  const name = text(welcome, 'name');
  const role = text(welcome, 'role');
  const photo = text(welcome, 'photo');
  const withPhoto = hasImage(photo);
  const plate = !!(name || role);
  // Kolom kiri: foto (dengan/tanpa papan nama) atau papan monogram; tanpa keduanya → judul & isi selebar penuh
  const side = withPhoto || plate;
  const right = side ? '@5xl:col-span-7 @5xl:col-start-6' : '@5xl:col-span-12';
  const action = m.linkOr(text(welcome, 'button_url'), null);
  return (
    <TemplateSection sectionKey="welcome" className={`bg-white ${SECTION_PAD}`}>
      {/* Baris kedua (kutipan + isi) mengambil sisa tinggi foto, jadi kutipan langsung di bawah judul */}
      <div className={`${CONTAINER} grid gap-10 @5xl:grid-cols-12 @5xl:grid-rows-[auto_1fr] @5xl:items-start @5xl:gap-x-12 @5xl:gap-y-10 @7xl:gap-x-16`}>
        <SectionHead
          layout="stack"
          eyebrow={text(welcome, 'eyebrow')}
          number={m.number('welcome')}
          title={text(welcome, 'title') || 'Sambutan kepala sekolah'}
          className={`min-w-0 @5xl:row-start-1 ${right}`}
        />
        {withPhoto ? (
          <Reveal as="figure" className="w-full max-w-[460px] @5xl:col-span-5 @5xl:col-start-1 @5xl:row-span-2 @5xl:row-start-1 @5xl:max-w-none">
            <KitPhoto
              src={photo}
              alt={NAWASENA_PHOTOS.alt(photo, name ? `Foto ${name}, kepala sekolah` : `Kepala ${m.companyName}`)}
              sizes="(min-width: 1024px) 40vw, (min-width: 576px) 460px, 92vw"
              className={`aspect-[4/5] ${plate ? 'rounded-t-[8px]' : 'rounded-[8px]'}`}
            />
            {plate && (
              <figcaption data-tpl-tone="inverse" className="rounded-b-[8px] bg-(--nw-navy) px-5 py-4 @3xl:px-6 @3xl:py-5">
                {name && <span className={`block text-[20px] leading-tight text-white ${DISPLAY} font-normal`}>{name}</span>}
                {role && <span className={`mt-1.5 block text-white/[0.72] ${TYPE_N.mono}`}>{role}</span>}
              </figcaption>
            )}
          </Reveal>
        ) : (
          plate && (
            <Reveal className="w-full max-w-[460px] @5xl:col-span-5 @5xl:col-start-1 @5xl:row-span-2 @5xl:row-start-1 @5xl:max-w-none">
              <MonogramPlate m={m} name={name} role={role} />
            </Reveal>
          )
        )}
        <div className={`min-w-0 @5xl:row-start-2 ${right}`}>
          {quote && (
            <Reveal as="blockquote" delay={120}>
              <span aria-hidden className={`block h-12 text-[96px] leading-none text-(--nw-ink) ${DISPLAY} font-normal`}>
                “
              </span>
              <p className={`mt-2 max-w-[30ch] text-balance ${C.navy} ${TYPE_N.quote}`}>{quote}</p>
            </Reveal>
          )}
          {body.length > 0 && (
            <Reveal delay={200} className={`max-w-[62ch] space-y-4 text-[16.5px] leading-[1.7] @3xl:text-[17px] ${C.body} ${quote ? 'mt-8' : ''}`}>
              {body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </Reveal>
          )}
          <TextLink action={action} label={text(welcome, 'button_label')} className="mt-6" />
        </div>
      </div>
    </TemplateSection>
  );
}
