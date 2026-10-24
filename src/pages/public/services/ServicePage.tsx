// Halaman jasa custom (/jasa-pembuatan-website, /jasa-pembuatan-aplikasi-mobile), isi dari src/content/services.ts.
// FAQ dari src/content/faq.ts (teks sama dengan JSON-LD FAQPage di *.seo.ts). Tanpa angka harga (design.md).
import React from 'react';
import { Check, ClipboardList, FileText, MessageCircle, MessagesSquare, Rocket } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FaqAccordion } from '../../../components/sections/faq/FaqAccordion';
import { faqItems } from '../../../content/faq';
import { CUSTOM_COST_FACTORS } from '../../../content/pricing';
import { SERVICES, type ServiceContent, type ServiceGuide } from '../../../content/services';
import { useGuides } from '../../../hooks/useGuides';
import { getWhatsappNumber, useSiteSettings, whatsappUrl } from '../../../hooks/useSiteSettings';
import { HUB_PATHS } from '../../../seo/paths';
import { guideLink } from '../catalog/guideLink';
import { InfoPage, InfoSection, Prose } from '../info/InfoPage';

const STEP_ICONS = [MessagesSquare, FileText, ClipboardList, Rocket] as const;

/** Tautan teks biasa di dalam paragraf. */
const TextLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => (
  <Link to={to} className="link-site font-medium">
    {children}
  </Link>
);

/** " {lead} {tautan}." ke artikel panduan, atau tidak ada apa-apa selama artikelnya belum terbit. */
const GuideSentence: React.FC<{ guide?: ServiceGuide }> = ({ guide }) => {
  const { articles } = useGuides();
  const link = guide ? guideLink([guide.slug], articles) : null;
  if (!guide || !link?.article) return null;
  return (
    <>
      {' '}
      {guide.lead} <TextLink to={link.href}>{guide.anchor}</TextLink>.
    </>
  );
};

export const ServicePage: React.FC<{ service: ServiceContent }> = ({ service }) => {
  const { settings } = useSiteSettings();
  const whatsapp = whatsappUrl(getWhatsappNumber(settings), service.whatsappMessage);
  const orderHref = `${HUB_PATHS.customOrder}?layanan=${service.orderParam}`;
  const other = service.key === 'website' ? SERVICES.mobile : SERVICES.website;
  const faqs = faqItems(service.faqIds);

  const actions = (
    <>
      <Link to={orderHref} className="btn btn-primary btn-lg max-sm:flex-1">
        Pesan Custom
      </Link>
      <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-lg max-sm:flex-1">
        <MessageCircle className="h-4 w-4" aria-hidden />
        Konsultasi Gratis
        <span className="sr-only">(tab baru)</span>
      </a>
    </>
  );

  return (
    <InfoPage crumb={service.crumb} badge={service.badge} title={service.h1} lead={<p>{service.lead}</p>} actions={actions}>
      <InfoSection id="jenis" title={service.kinds.title} intro={<p>{service.kinds.intro}</p>}>
        <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {service.kinds.cards.map((card) => (
            <li key={card.title} className="card-flat flex flex-col p-5 sm:p-6">
              <h3 className="text-base font-semibold text-fg sm:text-xl">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted sm:text-[15px]">{card.text}</p>
              <ul className="mt-4 space-y-2 border-t border-line pt-4">
                {card.points.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm text-fg sm:text-[15px]">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-primary">
                      <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </InfoSection>

      {service.sections.map((section, index) => (
        <InfoSection key={section.title} id={`tentang-${index + 1}`} title={section.title}>
          <Prose paragraphs={section.paragraphs} />
          {index === 0 && (
            <p className="mt-5 max-w-3xl text-[14px] leading-relaxed text-muted sm:text-[17px]">
              {service.key === 'website' ? (
                <>
                  Lihat dulu <TextLink to={HUB_PATHS.catalog}>template website siap pakai</TextLink> beserta harganya, atau bandingkan
                  biayanya di halaman <TextLink to={HUB_PATHS.pricing}>Harga</TextLink>.
                  <GuideSentence guide={service.guides.about} />
                </>
              ) : (
                <>
                  Butuh website juga? Lihat <TextLink to={HUB_PATHS.webService}>jasa pembuatan website</TextLink> atau{' '}
                  <TextLink to={HUB_PATHS.catalog}>template website siap pakai</TextLink>.
                  <GuideSentence guide={service.guides.about} />
                </>
              )}
            </p>
          )}
        </InfoSection>
      ))}

      <InfoSection id="proses" title={service.process.title} intro={<p>{service.process.intro}</p>}>
        <ol className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {service.process.steps.map((step, index) => {
            const Icon = STEP_ICONS[index] ?? Rocket;
            return (
              <li key={step.title} className="rounded-[24px] bg-alt p-5 ring-1 ring-inset ring-line sm:p-6">
                <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-surface text-primary ring-1 ring-inset ring-line">
                  <Icon className="h-[18px] w-[18px]" aria-hidden />
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] font-semibold text-white">
                    {index + 1}
                  </span>
                </span>
                <h3 className="mt-4 text-base font-semibold text-fg sm:text-lg">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted sm:text-[15px]">{step.text}</p>
              </li>
            );
          })}
        </ol>
        <div className="mt-4 flex flex-col gap-4 rounded-[24px] bg-surface p-5 ring-1 ring-inset ring-line sm:mt-6 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-fg sm:text-[17px]">{service.cta.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted sm:text-[15px]">{service.cta.text}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>
        </div>
      </InfoSection>

      <InfoSection id="hasil" title={service.deliverables.title} intro={<p>{service.deliverables.intro}</p>}>
        <ul className="grid max-w-4xl gap-3 sm:grid-cols-2 sm:gap-4">
          {service.deliverables.items.map((item) => (
            <li key={item} className="flex items-start gap-3 rounded-[20px] bg-surface p-4 text-sm leading-relaxed text-fg ring-1 ring-inset ring-line sm:p-5 sm:text-[15px]">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </InfoSection>

      <InfoSection
        id="biaya"
        title={service.costTitle}
        intro={
          <p>
            {service.costIntro} Harga template siap pakai, sebaliknya, tertera jelas di halaman{' '}
            <TextLink to={HUB_PATHS.pricing}>Harga</TextLink>.
            <GuideSentence guide={service.guides.cost} />
          </p>
        }
      >
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          {CUSTOM_COST_FACTORS.map((factor, index) => (
            <div key={factor.title} className="border-t border-line pt-4">
              <dt className="flex items-baseline gap-2 text-sm font-semibold text-fg sm:text-base">
                <span className="font-mono text-xs tabular-nums text-subtle">{String(index + 1).padStart(2, '0')}</span>
                {factor.title}
              </dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-muted sm:text-[15px]">{factor.text}</dd>
            </div>
          ))}
        </dl>
      </InfoSection>

      <InfoSection
        id="faq"
        title={service.faqTitle}
        intro={
          <p>
            Belum terjawab? Kirim pertanyaan Anda lewat <TextLink to={orderHref}>formulir Pesan Custom</TextLink> atau baca{' '}
            <TextLink to={other.path}>{other.crumb.toLowerCase()}</TextLink>.
          </p>
        }
      >
        <FaqAccordion items={faqs} className="max-w-4xl" />
      </InfoSection>
    </InfoPage>
  );
};

export default ServicePage;
