// Klinik laktasi (kunci `lactation`): kiri foto tegak 4:5 dalam bentuk GUMPALAN lembut (radius organik) dengan parallax
// ringan — satu-satunya parallax di halaman — dan doodle tetes ASI kecil di sudutnya; kanan kepala section rata kiri,
// layanan 2 kolom (doodle di gumpalan pastel + judul + satu baris), kartu jadwal klinik (hari kiri, jam kanan, garis
// putih), dan tombol daftar → WhatsApp. Tanpa foto → isi selebar wadah. HP: foto → teks.
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, list, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { Doodle } from './art';
import { rotateDoodle } from './icons';
import { lactationMessage, type MomkidModel } from './model';
import { MOMKID_PHOTOS } from './photos';
import { BG, C, DISPLAY, GRID_GAP, SECTION_PAD, TONE_BG } from './styles';
import { ButtonLink, SectionHead } from './ui';

const BLOBS = ['fill-(--mk-peach)', 'fill-[#DDF3EA]', 'fill-[#FFF1DA]'];

export function Lactation({ m }: { m: MomkidModel }) {
  const { lactation } = m;
  const image = text(lactation, 'image');
  const photo = hasImage(image);
  const services = list(lactation, 'services', 6).filter((item) => field(item, 'title'));
  const schedule = list(lactation, 'schedule', 4).filter((item) => field(item, 'day') || field(item, 'hours'));
  const action = m.linkOr(text(lactation, 'button_url'), m.waWith(lactationMessage(m.companyName)) ?? m.visitAction);

  return (
    <TemplateSection sectionKey="lactation" className={`${TONE_BG[m.tone('lactation')]} ${SECTION_PAD}`}>
      <div className={`${CONTAINER} grid gap-y-10 @4xl:grid-cols-12 @4xl:items-center ${GRID_GAP}`}>
        {photo && (
          <Reveal variant="scale" className="relative mx-auto w-full max-w-[340px] @xl:max-w-[440px] @4xl:col-span-5 @4xl:max-w-none">
            <KitPhoto
              src={image}
              alt={MOMKID_PHOTOS.alt(image, `Klinik laktasi ${m.companyName}`)}
              parallax={4}
              fallback="none"
              sizes="(min-width: 896px) 40vw, 92vw"
              className="aspect-square rounded-[46%_54%_44%_56%/38%_40%_60%_62%] @xl:aspect-[4/5]"
            />
            <Doodle name="drop" blob="fill-(--mk-peach)" className="absolute -right-1 top-6 h-16 w-16 text-[#2E2228] @3xl:h-20 @3xl:w-20" />
            <Doodle name="heart" blob="fill-[#DDF3EA]" className="absolute -left-2 bottom-10 h-14 w-14 text-[#2E2228] @3xl:h-16 @3xl:w-16" />
          </Reveal>
        )}
        <div className={`min-w-0 ${photo ? '@4xl:col-span-7 @6xl:col-span-6 @6xl:col-start-7' : '@4xl:col-span-12'}`}>
          <SectionHead align="left" eyebrow={text(lactation, 'eyebrow')} doodle="drop" title={text(lactation, 'title')} subtitle={text(lactation, 'subtitle')} srTitle="Klinik laktasi" />
          {services.length > 0 && (
            <ul className="mt-7 grid gap-x-6 gap-y-5 @xl:grid-cols-2 @xl:gap-y-6">
              {services.map((item, i) => (
                <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i)} className="flex min-w-0 items-start gap-3.5">
                  <Doodle name={rotateDoodle(i)} blob={BLOBS[i % BLOBS.length]} className={`h-12 w-12 shrink-0 ${C.ink}`} />
                  <div className="min-w-0 pt-1">
                    <h3 className={`${DISPLAY} text-[17px] font-extrabold leading-snug ${C.ink}`}>{field(item, 'title')}</h3>
                    {field(item, 'text') && <p className={`mt-1 text-[14.5px] leading-snug ${C.muted}`}>{field(item, 'text')}</p>}
                  </div>
                </Reveal>
              ))}
            </ul>
          )}
          {(schedule.length > 0 || action) && (
            <Reveal delay={160} className="mt-8 flex flex-col gap-5 @xl:flex-row @xl:items-end">
              {schedule.length > 0 && (
                <dl className={`min-w-0 flex-1 rounded-[28px] px-5 py-2 ${BG.peachSoft}`}>
                  {schedule.map((item, i) => (
                    <div key={`${field(item, 'day')}-${i}`} className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-3 ${i > 0 ? 'border-t-2 border-white' : ''}`}>
                      <dt className={`${DISPLAY} text-[15px] font-extrabold ${C.ink}`}>{field(item, 'day')}</dt>
                      <dd className={`text-[15px] font-medium tabular-nums ${C.ink}`}>{field(item, 'hours')}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <ButtonLink action={action} label={text(lactation, 'button_label')} className="w-full @xl:w-auto" />
            </Reveal>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}
