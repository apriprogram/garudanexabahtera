import React from 'react';
import { MessageCircle } from 'lucide-react';
import { SectionHeading } from '../ui/SectionHeading';
import { getWhatsappNumber, useSiteSettings, whatsappUrl } from '../../hooks/useSiteSettings';
import { usePublishedTemplates } from '../../hooks/usePublishedTemplates';
import { faqContext, homeFaqs } from '../../content/faq';
import { FaqAccordion } from './faq/FaqAccordion';

/**
 * Section FAQ beranda (#faq), gaya BELAJAR CPNS: judul sticky di kiri, accordion bernomor di kanan.
 * Isi dari src/content/faq.ts (homeFaqs): FAQ marketplace (satu jawaban yang sama di beranda, /harga, halaman template
 * dan llms-full.txt), lalu FAQ tambahan dari admin (`faq_data`) yang pertanyaannya belum dijawab di sana. Rentang harga
 * di jawaban dihitung dari daftar template (data preload saat prerender). JSON-LD FAQPage beranda memakai daftar yang sama.
 */
const FAQ: React.FC<{ alt?: boolean; number?: string }> = ({ alt, number = '04' }) => {
  const { settings } = useSiteSettings();
  const { templates } = usePublishedTemplates();
  const faqs = homeFaqs(settings, faqContext(templates));
  const whatsapp = getWhatsappNumber(settings);

  return (
    <section id="faq" aria-labelledby="faq-title" className={`section-screen ${alt ? 'bg-alt' : 'bg-canvas'}`}>
      <div className="container-site grid w-full gap-8 sm:gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
        {/* Kiri: judul (sticky di desktop) */}
        <div className="relative z-10 lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            layout="stack"
            index={number}
            label="FAQ"
            titleId="faq-title"
            title="Pertanyaan seputar"
            accent="template website & jasa custom"
            action={
              <a
                href={whatsappUrl(whatsapp, 'Halo Admin, saya punya pertanyaan tentang layanan Garuda Nexa.')}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                Tanya tim kami
              </a>
            }
          />
        </div>

        {/* Kanan: accordion bernomor (satu terbuka sekaligus) */}
        <FaqAccordion items={faqs} alt={alt} />
      </div>
    </section>
  );
};

export default FAQ;
