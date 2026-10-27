// Profil, visi & misi (kunci `about`) + sambutan kepala sekolah (kunci `welcome`).
// Profil: kiri 7 kolom label + H2 + profil singkat, lalu Visi (kartu langit, kalimat besar) dan Misi (daftar bernomor
// bergaris tipis); kanan 5 kolom foto tegak 4:5 + data ringkas 2×2; di bawahnya "Nilai yang kami tumbuhkan" (hingga
// 8 butir daftar ikon bergaris tipis, ikon dari teks). HP: label, judul, profil, foto, data, visi, misi, nilai.
// Sambutan: pita langit, foto kepala sekolah 4:5 kiri, kanan label + H2 + kutipan besar + paragraf + nama & jabatan +
// tombol (bawaan ke bagian Guru). Tanpa foto (demo: nama fiktif tidak ditempel pada wajah orang sungguhan) → papan nama
// datar berlogo + inisial besar + nama & jabatan di kolom kiri; tanpa foto dan tanpa nama → teks selebar penuh.
import { Quote } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, list, safeImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { paragraphsOf, type PradiptaModel } from './model';
import { PRADIPTA_PHOTOS } from './photos';
import { BAND, C, CARD, DISPLAY, SECTION_PAD, TYPE_P, cardOn, type Tone } from './styles';
import { Head, Initials, PillLink, TitleIcon } from './ui';

export function About({ m }: { m: PradiptaModel }) {
  const { about } = m;
  const tone = m.tone('about');
  const image = text(about, 'image');
  const facts = list(about, 'facts', 4).filter((item) => field(item, 'label') || field(item, 'value'));
  const vision = text(about, 'vision');
  const mission = list(about, 'mission', 6).filter((item) => field(item, 'text'));
  const values = list(about, 'values', 8).filter((item) => field(item, 'title'));
  const valuesTitle = text(about, 'values_title');
  const body = text(about, 'body');
  return (
    <TemplateSection sectionKey="about" className={`${SECTION_PAD} ${BAND[tone]}`}>
      <div className={CONTAINER}>
        <div className="grid items-start gap-10 @5xl:grid-cols-12 @5xl:grid-rows-[auto_1fr] @5xl:gap-x-12 @5xl:gap-y-10">
          <div className="min-w-0 @5xl:col-span-7 @5xl:row-start-1">
            <Head sectionKey="about" layout="stack" eyebrow={text(about, 'eyebrow')} title={text(about, 'title')} fallback="Profil sekolah" tone={tone} />
            {body && (
              <Reveal as="p" delay={120} className={`mt-5 max-w-[64ch] text-pretty ${C.body} ${TYPE_P.lead}`}>
                {body}
              </Reveal>
            )}
          </div>

          <Reveal delay={120} className="min-w-0 @5xl:col-span-5 @5xl:col-start-8 @5xl:row-span-2 @5xl:row-start-1">
            <KitPhoto
              src={image}
              alt={PRADIPTA_PHOTOS.alt(image, `Suasana ${m.companyName}`)}
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="aspect-[4/5] rounded-[24px]"
            />
            {facts.length > 0 && (
              <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5">
                {facts.map((item, i) => (
                  <div key={`${field(item, 'label')}-${i}`} className="min-w-0 border-t border-(--pd-ring) pt-3">
                    <dt className={`text-[12.5px] font-medium ${C.muted}`}>{field(item, 'label')}</dt>
                    <dd className={`mt-1 text-[15px] font-semibold leading-snug ${C.ink}`}>{field(item, 'value')}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Reveal>

          {(vision || mission.length > 0) && (
            // Visi = kartu langit selebar kolom (kalimat besar), misi di bawahnya: daftar bernomor dua kolom bergaris tipis
            <div className="grid min-w-0 gap-8 @5xl:col-span-7 @5xl:row-start-2">
              {vision && (
                <Reveal className={`${CARD.sky} flex flex-col gap-3 p-6 @3xl:flex-row @3xl:gap-8 @3xl:p-8`}>
                  <h3 className={`shrink-0 @3xl:w-24 ${C.ink} ${TYPE_P.h3}`}>{text(about, 'vision_title') || 'Visi'}</h3>
                  <p className={`text-balance ${DISPLAY} text-[19px] font-medium leading-[1.45] tracking-[-0.01em] @3xl:text-[21px] ${C.ink}`}>{vision}</p>
                </Reveal>
              )}
              {mission.length > 0 && (
                <Reveal delay={80} className="min-w-0">
                  <h3 className={`${C.ink} ${TYPE_P.h3}`}>{text(about, 'mission_title') || 'Misi'}</h3>
                  <ol className="mt-4 grid gap-x-8 @3xl:grid-cols-2">
                    {mission.map((item, i) => (
                      <li key={`${field(item, 'text')}-${i}`} className="flex gap-4 border-t border-(--pd-ring) py-3.5">
                        <span aria-hidden className={`${DISPLAY} w-6 shrink-0 text-[14px] font-medium leading-[1.6] tabular-nums text-(--pd-ink)`}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className={`text-pretty text-[15px] leading-relaxed ${C.body}`}>{field(item, 'text')}</span>
                      </li>
                    ))}
                  </ol>
                </Reveal>
              )}
            </div>
          )}
        </div>

        {values.length > 0 && (
          <div className="mt-14 @5xl:mt-20">
            {valuesTitle && <h3 className={`${C.ink} ${TYPE_P.h3} @3xl:text-[22px]`}>{valuesTitle}</h3>}
            {/* Daftar ikon ringkas bergaris tipis (BUKAN ubin kartu: kartu ikon sudah dipakai akses cepat & ekskul):
                1 kolom di HP, 2 kolom di tablet, 4 kolom di layar lebar */}
            <ul className={`grid gap-x-8 @xl:grid-cols-2 @6xl:grid-cols-4 ${valuesTitle ? 'mt-4' : ''}`}>
              {values.map((item, i) => (
                <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i, 50)} className="flex min-w-0 items-start gap-3.5 border-t border-(--pd-ring) py-4">
                  <span aria-hidden className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-(--pd-ink) ${tone === 'sky' ? 'bg-white' : 'bg-(--pd-sky2)'}`}>
                    <TitleIcon title={field(item, 'title')} index={i} className="h-[17px] w-[17px]" />
                  </span>
                  <div className="min-w-0 [overflow-wrap:anywhere]">
                    <p className={`text-[15px] font-semibold leading-snug ${C.ink}`}>{field(item, 'title')}</p>
                    {field(item, 'text') && <p className={`mt-0.5 text-pretty text-[13.5px] leading-relaxed @3xl:text-[14px] ${C.muted}`}>{field(item, 'text')}</p>}
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        )}
      </div>
    </TemplateSection>
  );
}

/**
 * Papan nama kepala sekolah tanpa foto: kartu datar (putih di pita langit, putih bercincin di pita putih) berisi logo
 * sekolah (dekoratif), bulatan inisial besar, nama, dan jabatan. Bukan kotak "foto" kosong. HP/tablet: baris ringkas
 * (inisial + nama & jabatan) seperti tanda tangan di AKHIR sambutan; layar lebar: panel tegak di kolom kiri.
 */
function NamePlate({ m, name, role, tone }: { m: PradiptaModel; name: string; role: string; tone: Tone }) {
  const logo = safeImage(m.logo);
  return (
    // Layar lebar: setinggi foto 4:5 yang digantikannya (kolom kiri seimbang dengan teks sambutan)
    <div
      data-pd-plate
      className={`flex items-center gap-4 p-5 @3xl:p-6 @5xl:aspect-[4/5] @5xl:flex-col @5xl:justify-center @5xl:gap-0 @5xl:p-10 @5xl:text-center ${cardOn(tone)}`}
    >
      {logo && <img src={logo} alt="" className="mb-6 hidden h-12 w-auto max-w-[160px] object-contain @5xl:block" />}
      <Initials name={name || role} className="h-16 w-16 bg-(--pd-sky2) text-[22px] @5xl:h-28 @5xl:w-28 @5xl:text-[36px]" />
      <div className="min-w-0 @5xl:mt-6">
        {name && <p className={`text-balance ${DISPLAY} text-[17px] font-semibold leading-snug @5xl:text-[19px] ${C.ink}`}>{name}</p>}
        {role && <p className={`mt-1 text-balance text-[14px] leading-snug ${C.muted}`}>{role}</p>}
      </div>
    </div>
  );
}

export function Welcome({ m }: { m: PradiptaModel }) {
  const { welcome } = m;
  const tone = m.tone('welcome');
  const photo = text(welcome, 'photo');
  const quote = text(welcome, 'quote');
  const body = paragraphsOf(text(welcome, 'body'));
  const name = text(welcome, 'name');
  const role = text(welcome, 'role');
  const action = m.linkOr(text(welcome, 'button_url'), m.sectionAction('teachers') ?? m.startAction);
  const withPhoto = hasImage(photo);
  // Tanpa foto: papan nama (nama & jabatan pindah ke sana); tanpa foto dan tanpa nama/jabatan → teks selebar penuh
  const plate = !withPhoto && !!(name || role);
  const side = withPhoto || plate;
  return (
    <TemplateSection sectionKey="welcome" className={`${SECTION_PAD} ${BAND[tone]}`}>
      <div className={`${CONTAINER} grid items-center gap-10 @5xl:gap-14 ${side ? '@5xl:grid-cols-12' : ''}`}>
        {side && (
          // Papan nama (tanpa foto) di HP turun ke akhir sambutan, seperti tanda tangan; foto tetap di atas
          <Reveal className={`min-w-0 @5xl:col-span-5 ${withPhoto ? '' : 'order-last @5xl:order-none'}`}>
            {withPhoto ? (
              <KitPhoto
                src={photo}
                alt={PRADIPTA_PHOTOS.alt(photo, name ? `Foto ${name}` : `Kepala ${m.companyName}`)}
                sizes="(min-width: 1024px) 40vw, 100vw"
                position="50% 30%"
                className="aspect-[4/5] rounded-[24px]"
              />
            ) : (
              <NamePlate m={m} name={name} role={role} tone={tone} />
            )}
          </Reveal>
        )}
        <div className={`min-w-0 ${side ? '@5xl:col-span-7' : 'max-w-[64rem]'}`}>
          <Head sectionKey="welcome" layout="stack" eyebrow={text(welcome, 'eyebrow')} title={text(welcome, 'title')} fallback="Sambutan kepala sekolah" tone={tone} />
          {quote && (
            <Reveal as="figure" delay={120} className="mt-8">
              <Quote aria-hidden className="h-7 w-7 text-(--pd-ink)" strokeWidth={1.8} />
              <blockquote className={`mt-3 max-w-[32ch] text-balance ${DISPLAY} text-[22px] font-medium leading-[1.35] tracking-[-0.01em] @3xl:text-[26px] ${C.ink}`}>
                {quote}
              </blockquote>
            </Reveal>
          )}
          {body.length > 0 && (
            <Reveal delay={160} className={`mt-6 max-w-[64ch] space-y-4 ${C.body} ${TYPE_P.body}`}>
              {body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </Reveal>
          )}
          {withPhoto && (name || role) && (
            <Reveal delay={200} className="mt-8">
              {name && <p className={`${DISPLAY} text-[17px] font-semibold ${C.ink}`}>{name}</p>}
              {role && <p className={`mt-0.5 text-[14px] ${C.muted}`}>{role}</p>}
            </Reveal>
          )}
          <PillLink action={action} label={text(welcome, 'button_label')} variant={tone === 'sky' ? 'light' : 'soft'} className="mt-8 w-full @xl:w-auto" />
        </div>
      </div>
    </TemplateSection>
  );
}
