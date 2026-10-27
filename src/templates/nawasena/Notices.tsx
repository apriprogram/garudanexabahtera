// Pita navy kedua halaman: pengumuman (kunci `announcements`, anchor #pengumuman) + agenda (kunci `agenda`, #agenda),
// masing-masing section sendiri dengan satu H2. Layar lebar: pengumuman 7 kolom | agenda 5 kolom; satu saja tampil →
// selebar penuh (pengumuman 2 kolom kartu). Bentuk data SAMA dengan Bestari/Cakrawala/Madani.
// Pengumuman: kartu putih 5% bergaris putih 10% berisi kolom tanggal (hari serif besar + bulan & tahun mono), garis tegak,
// label ("Penting" merah lembut), judul, isi singkat, dan tautan lampiran. Fitur Berita & Pengumuman aktif →
// ProAnnouncementsSection (shared/posts/pro) dengan tema navy.
// Agenda: linimasa tegak (garis tipis yang tergambar sekali saat muncul, titik warna terang tema), tanggal dengan hari
// ("Rab, 25 Nov 2026"), judul serif, waktu & tempat; di layar lebar kolomnya menempel saat pengumuman digulir. Agenda
// bertanggal ISO yang sudah lewat → label "Selesai" dan pindah ke bawah.
import { Clock, MapPin, Paperclip } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { usePostsEnabled, useSitePosts } from '../shared/posts/hooks';
import { POST_PATH_KEY } from '../shared/posts/model';
import { ProAnnouncementsSection } from '../shared/posts/pro';
import { TemplateSection } from '../shared/Shell';
import { SiteLink } from '../shared/SiteLink';
import { field, safeUrl, text } from '../shared/utils';
import { agendaEntries, isUrgent, parseSchoolDate, type NawasenaModel } from './model';
import { CARD, DISPLAY, POST_THEME_NAVY, TYPE_N } from './styles';
import { SectionHead, TextLink } from './ui';

const TAG = 'inline-flex max-w-full items-center rounded-[4px] px-2 text-[11.5px] font-semibold uppercase tracking-[0.06em]';
/** Jarak atas pita ada di section-nya sendiri (bukan di pembungkus pita): judul yang dituju lewat menu "#agenda" /
 *  "#pengumuman" mendapat ruang 64–112px di bawah header lengket, sama dengan section lain. */
const BAND_TOP = 'pt-16 @3xl:pt-24 @5xl:pt-28';

function Announcements({ m, wide }: { m: NawasenaModel; wide: boolean }) {
  const { announcements } = m;
  const items = m.items('announcements');
  const pro = usePostsEnabled();
  const posts = useSitePosts('pengumuman');
  const head = (
    <SectionHead
      layout="stack"
      size="md"
      tone="navy"
      eyebrow={text(announcements, 'eyebrow')}
      number={m.number('announcements')}
      title={text(announcements, 'title') || 'Pengumuman'}
    />
  );
  if (pro) return <ProAnnouncementsSection section={announcements} theme={POST_THEME_NAVY} head={head} className={BAND_TOP} />;
  return (
    <TemplateSection sectionKey="announcements" className={`min-w-0 ${BAND_TOP}`}>
      {head}
      <ul className={`mt-8 grid gap-3 ${wide ? '@6xl:grid-cols-2' : ''}`}>
        {items.map((item, i) => {
          const raw = field(item, 'date');
          const date = parseSchoolDate(raw);
          const badge = field(item, 'badge');
          const path = field(item, POST_PATH_KEY);
          const href = path ? null : safeUrl(field(item, 'url'));
          return (
            <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i, 60)} className={`flex gap-4 p-5 @3xl:gap-5 @3xl:p-6 ${CARD.navy}`}>
              {raw && (
                <>
                  {date ? (
                    <time dateTime={date.iso} className="flex w-14 shrink-0 flex-col @3xl:w-16">
                      <span className={`text-[30px] leading-none text-white ${DISPLAY} font-normal`}>{date.day}</span>
                      <span className="mt-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-white/[0.72]">
                        {date.month} {date.year}
                      </span>
                    </time>
                  ) : (
                    <span className={`w-14 shrink-0 text-white/[0.72] @3xl:w-16 ${TYPE_N.mono}`}>{raw}</span>
                  )}
                  <span aria-hidden className="w-px shrink-0 self-stretch bg-white/10" />
                </>
              )}
              <div className="min-w-0 flex-1">
                {badge && (
                  <p className="mb-2">
                    <span className={`${TAG} h-6 ${isUrgent(badge) ? 'bg-[#FEE4E2] text-[#9B1C1C]' : 'bg-white/10 text-white'}`}>{badge}</span>
                  </p>
                )}
                <h3 className="text-[16.5px] font-semibold leading-snug text-white @3xl:text-[17px]">
                  {path ? (
                    <SiteLink path={path} className="underline-offset-4 hover:underline">
                      {field(item, 'title')}
                    </SiteLink>
                  ) : (
                    field(item, 'title')
                  )}
                </h3>
                {field(item, 'text') && <p className="mt-1.5 text-[15px] leading-relaxed text-white/[0.72]">{field(item, 'text')}</p>}
                {href && (
                  <TextLink
                    action={{ kind: 'external', href }}
                    label="Lampiran"
                    tone="navy"
                    ariaLabel={`Lampiran: ${field(item, 'title')}`}
                    icon={<Paperclip aria-hidden className="h-4 w-4 shrink-0" />}
                    className="mt-1"
                  />
                )}
              </div>
            </Reveal>
          );
        })}
      </ul>
      {posts && <TextLink action={{ kind: 'site', path: '/pengumuman' }} label="Lihat semua pengumuman" tone="navy" className="mt-5" />}
    </TemplateSection>
  );
}

function Agenda({ m }: { m: NawasenaModel }) {
  const { agenda } = m;
  const entries = agendaEntries(m.items('agenda'));
  return (
    // Butir linimasa berjarak tetap 32px (ritme sendiri, tidak direntangkan mengikuti tinggi kolom pengumuman). Di layar
    // lebar kolom agenda menempel (sticky, lihat Notices) selama daftar pengumuman yang lebih panjang digulir.
    <TemplateSection sectionKey="agenda" className={`min-w-0 ${BAND_TOP}`}>
      <SectionHead layout="stack" size="md" tone="navy" eyebrow={text(agenda, 'eyebrow')} number={m.number('agenda')} title={text(agenda, 'title') || 'Agenda'} />
      <Reveal variant="fade" className="nw-timeline mt-8">
        <div className="relative">
          <span aria-hidden className="nw-timeline-line absolute bottom-3 left-[3.5px] top-2 w-px bg-white/15" />
          <ol className="flex flex-col gap-8">
            {entries.map(({ item, date, past }, i) => {
              const raw = field(item, 'date');
              const time = field(item, 'time');
              const place = field(item, 'place');
              return (
                <li key={`${field(item, 'title')}-${i}`} className="relative pl-8">
                  <span aria-hidden className={`absolute left-0 top-[5px] h-2 w-2 rounded-full ring-4 ring-(--nw-navy) ${past ? 'bg-white/40' : 'bg-(--nw-bright)'}`} />
                  {(raw || past) && (
                    <p className="flex flex-wrap items-center gap-2">
                      {date ? (
                        <time dateTime={date.iso} className="font-mono text-[12.5px] font-medium tracking-[0.04em] text-(--nw-bright)">
                          {date.long}
                        </time>
                      ) : (
                        raw && <span className="font-mono text-[12.5px] font-medium tracking-[0.04em] text-(--nw-bright)">{raw}</span>
                      )}
                      {past && <span className={`${TAG} h-5 bg-white/10 text-white`}>Selesai</span>}
                    </p>
                  )}
                  <h3 className={`mt-1.5 text-[21px] leading-snug ${past ? 'text-white/[0.72]' : 'text-white'} ${DISPLAY} font-normal`}>{field(item, 'title')}</h3>
                  {(time || place) && (
                    <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[14px] text-white/[0.72]">
                      {time && (
                        <span className="inline-flex items-center gap-1.5">
                          <Clock aria-hidden className="h-3.5 w-3.5 shrink-0" />
                          {time}
                        </span>
                      )}
                      {place && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin aria-hidden className="h-3.5 w-3.5 shrink-0" />
                          {place}
                        </span>
                      )}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </Reveal>
    </TemplateSection>
  );
}

/** Pita navy pengumuman & agenda; tidak dirender bila keduanya tersembunyi/kosong. */
export function Notices({ m }: { m: NawasenaModel }) {
  const showAnnouncements = m.shown('announcements');
  const showAgenda = m.shown('agenda');
  if (!showAnnouncements && !showAgenda) return null;
  const both = showAnnouncements && showAgenda;
  return (
    // Jarak atas ada di tiap section (BAND_TOP), jarak bawah di pita; di HP kedua section bertumpuk berjarak 64px
    <div data-tpl-tone="inverse" className="bg-(--nw-navy) pb-16 text-white @3xl:pb-24 @5xl:pb-28">
      <div className={`${CONTAINER} grid ${both ? '@5xl:grid-cols-12 @5xl:gap-x-8 @7xl:gap-x-12' : ''}`}>
        {showAnnouncements && (
          <div className={`min-w-0 ${both ? '@5xl:col-span-7' : ''}`}>
            <Announcements m={m} wide={!both} />
          </div>
        )}
        {showAgenda && (
          // Layar lebar: kolom agenda menempel (judul ± 32px di bawah header) selama daftar pengumuman digulir
          <div className={`min-w-0 ${both ? '@5xl:sticky @5xl:top-[calc(var(--tpl-sticky-top,0px)-8px)] @5xl:col-span-5 @5xl:self-start @6xl:pl-6' : ''}`}>
            <Agenda m={m} />
          </div>
        )}
      </div>
    </div>
  );
}
