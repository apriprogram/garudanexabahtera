// Tujuan favorit (kunci `routes`), putih: kepala section, lalu kartu tujuan radius 10 bergaris rambut — foto tegak 4:5
// (zoom pelan saat disorot), nama Unbounded, "2 hari · dari Semarang", garis lajur putus-putus, "Mulai Rp6.800.000 /
// bus", dan tautan WhatsApp "Tanya rute ini". Kisi 4 kolom (@5xl), 8 kolom satu baris di layar sangat lebar
// (@min-[150rem]), 2 kolom (@2xl), rel geser di HP (kartu 78%, menembus tepi layar). Reveal membungkus relnya.
import { Clock } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { WhatsAppIcon } from '../shared/icons';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { NBSP, formatRupiah, routeMessage, routeMeta, type LajurModel, type Route } from './model';
import { LAJUR_PHOTOS } from './photos';
import { C, DISPLAY, LABEL_SM, SECTION_PAD, TYPE, WRAP } from './styles';
import { SectionHead } from './ui';

function RouteCard({ m, route, origin, unit, ask }: { m: LajurModel; route: Route; origin: string; unit: string; ask: string }) {
  const action = ask ? m.waWith(routeMessage(route, origin, m.companyName)) : null;
  const meta = routeMeta(route, origin);
  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-[10px] bg-white ring-1 ring-inset ring-[#14161A]/10">
      <KitPhoto
        src={route.image}
        alt={LAJUR_PHOTOS.alt(route.image, `Foto tujuan ${route.name}`)}
        sizes="(min-width: 1024px) 25vw, (min-width: 672px) 50vw, 78vw"
        className="aspect-[4/5]"
        imgClassName="transition-[scale] duration-700 group-hover:scale-[1.04]"
      />
      <div className="flex flex-1 flex-col px-4 pb-3 pt-4 @3xl:px-5 @3xl:pt-5">
        {/* flex-1: bila keterangan satu kartu turun dua baris (kolom sempit), garis jalur & harga semua kartu tetap sejajar */}
        <div className="flex-1">
          <h3 className={`${TYPE.h3} ${C.ink}`}>{route.name}</h3>
          {meta && (
            <p className={`mt-1.5 flex items-center gap-1.5 text-[14px] ${C.muted}`}>
              <Clock aria-hidden className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              {meta}
            </p>
          )}
        </div>
        <span aria-hidden className="lj-lane-line mt-4 block h-[2px]" />
        {/* 8 kolom (@min-[150rem], kartu ±263px): baris harga tidak boleh patah (angka 15px) — garis jalur & harga sebaris di semua kartu */}
        <p className={`mt-4 flex flex-wrap items-baseline gap-x-1.5 @min-[150rem]:flex-nowrap @min-[150rem]:gap-x-1 ${C.ink}`}>
          {route.price > 0 ? (
            <>
              <span className={`${LABEL_SM} ${C.muted}`}>Mulai</span>
              <span className={`${DISPLAY} text-[16px] font-bold tabular-nums tracking-[-0.01em] @3xl:text-[17px] @min-[150rem]:text-[15px]`}>{formatRupiah(route.price)}</span>
              {unit && <span className={`text-[14px] ${C.muted}`}>{unit.split(' ').join(NBSP)}</span>}
            </>
          ) : (
            <span className={`text-[15px] font-medium ${C.muted}`}>Harga menyusul</span>
          )}
        </p>
        {action && (
          <ActionLink
            action={action}
            aria-label={`${ask}: ${route.name} (WhatsApp)`}
            className="mt-auto inline-flex min-h-11 items-center gap-2 self-start pt-2 text-[14px] font-semibold text-[#14161A] underline decoration-[#14161A]/30 underline-offset-[5px] transition-colors hover:decoration-(--tpl-accent) hover:decoration-2"
          >
            <WhatsAppIcon className="h-4 w-4 shrink-0 text-[#14161A]" />
            {ask}
          </ActionLink>
        )}
      </div>
    </article>
  );
}

export function Routes({ m }: { m: LajurModel }) {
  const section = m.routesSection;
  const routes = m.routes;
  const origin = text(section, 'origin');
  const unit = text(section, 'price_unit');
  const ask = text(section, 'ask_label');
  return (
    <TemplateSection sectionKey="routes" className={`${SECTION_PAD} ${C.white}`}>
      <div className={WRAP}>
        <SectionHead eyebrow={text(section, 'eyebrow')} index={m.numbers.routes} title={text(section, 'title')} subtitle={text(section, 'subtitle')} srTitle="Tujuan favorit" />
        <Reveal className="mt-10 @3xl:mt-12">
          <ul
            aria-label="Tujuan favorit"
            className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:thin] @2xl:mx-0 @2xl:grid @2xl:grid-cols-2 @2xl:gap-5 @2xl:overflow-visible @2xl:px-0 @2xl:pb-0 @5xl:grid-cols-4 @5xl:gap-6 @min-[150rem]:grid-cols-8"
          >
            {routes.map((route) => (
              <li key={route.index} className="w-[78%] min-w-0 shrink-0 snap-start @2xl:w-auto">
                <RouteCard m={m} route={route} origin={origin} unit={unit} ask={ask} />
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </TemplateSection>
  );
}
