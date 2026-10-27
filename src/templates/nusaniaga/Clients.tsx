// Klien & industri (kunci `clients`): judul singkat di 5 kolom kiri, nama/logo klien di kolom 7–12 (grid 3 kolom), lalu
// strip industri SELEBAR LAYAR di antara dua garis rambut: kata-kata Manrope besar bertitik aksen yang berjalan pelan
// (satu-satunya gerak tanpa henti; berhenti saat disorot/difokus). Gerak mati → daftar statis rata tengah yang membungkus.
import { Marquee, Reveal } from '../shared/Animated';
import { ClientLogo } from '../shared/clients';
import { CONTAINER } from '../shared/layout';
import { useMotionEnabled } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import { clientItems, industryItems, type NusaNiagaModel } from './model';
import { C, DISPLAY, GRID, LINE, TYPE_N } from './styles';

/** Kata industri saat gerak mati (daftar statis): sedikit lebih kecil agar membungkus rapi. */
const STATIC_WORD = `${DISPLAY} font-bold text-[24px] leading-tight tracking-[-0.03em] @3xl:text-[30px]`;

export function Clients({ m }: { m: NusaNiagaModel }) {
  const { clients } = m;
  const title = text(clients, 'title');
  const label = text(clients, 'industries_label');
  const logos = clientItems(clients);
  const industries = industryItems(clients);
  const motion = useMotionEnabled();

  return (
    <TemplateSection sectionKey="clients" className={`bg-white pt-14 @5xl:pt-20 ${industries.length > 0 ? '' : 'pb-14 @5xl:pb-20'}`}>
      <div className={`${CONTAINER} ${GRID} gap-y-8 @5xl:items-center`}>
        <div className="min-w-0 @5xl:col-span-5">
          {title ? (
            <Reveal as="h2" className={`max-w-[24ch] ${C.ink} ${TYPE_N.h2sm}`}>
              {title}
            </Reveal>
          ) : (
            <h2 className="sr-only">Klien kami</h2>
          )}
        </div>
        {logos.length > 0 && (
          <Reveal
            as="ul"
            delay={120}
            aria-label="Klien kami"
            className={`grid min-w-0 grid-cols-2 border-l border-t @xl:grid-cols-3 @5xl:col-[7/13] ${LINE}`}
          >
            {logos.map((item, i) => (
              <li
                key={`${field(item, 'name')}-${i}`}
                className={`flex min-h-20 min-w-0 items-center justify-center border-b border-r px-3 py-5 text-center [&>span]:text-[15px] [&>span]:whitespace-normal @xl:[&>span]:text-[17px] @5xl:min-h-24 ${LINE}`}
              >
                <ClientLogo name={field(item, 'name')} logo={field(item, 'logo')} className="h-7" />
              </li>
            ))}
          </Reveal>
        )}
      </div>

      {industries.length > 0 && (
        <div className="mt-12 @5xl:mt-16">
          {label && (
            <div className={CONTAINER}>
              <p className={`text-[13px] font-medium ${C.subtle}`}>{label}</p>
            </div>
          )}
          <div className={`border-y py-5 @5xl:py-7 ${LINE} ${label ? 'mt-4' : ''}`}>
            <Marquee
              label={label || 'Industri yang kami layani'}
              duration={48}
              gap={56}
              staticClassName="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 px-5"
            >
              {industries.map((item, i) => (
                <span key={`${field(item, 'name')}-${i}`} className={`inline-flex items-center gap-4 whitespace-nowrap ${motion ? TYPE_N.marquee : STATIC_WORD} ${C.ink}`}>
                  <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full bg-(--tpl-accent)" />
                  {field(item, 'name')}
                </span>
              ))}
            </Marquee>
          </div>
        </div>
      )}
    </TemplateSection>
  );
}
