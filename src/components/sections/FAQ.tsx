import React, { useId, useState } from 'react';
import { MessageCircle, Plus } from 'lucide-react';
import { Reveal } from '../ui/Reveal';
import { SectionHeading } from '../ui/SectionHeading';
import { getWhatsappNumber, readList, useSiteSettings, whatsappUrl } from '../../hooks/useSiteSettings';

interface FaqItem {
  question: string;
  answer: string;
}

/**
 * FAQ marketplace template (pemesanan, Midtrans, domain, CMS). Selalu tampil di urutan teratas,
 * diikuti FAQ dari admin (`faq_data`). Pertanyaan yang sama persis (abaikan huruf besar/spasi) tidak ditampilkan dua kali;
 * versi di sini yang dipakai.
 */
const PLATFORM_FAQS: FaqItem[] = [
  {
    question: 'Bagaimana cara memesan template website?',
    answer:
      'Pilih template di bagian Template, klik Pesan, lalu masuk atau daftar akun. Isi data pemesan serta nama domain yang Anda inginkan, kemudian lanjutkan ke pembayaran. Status pesanan bisa Anda pantau kapan saja di halaman Akun Saya.',
  },
  {
    question: 'Metode pembayaran apa saja yang bisa dipakai?',
    answer:
      'Pembayaran diproses dengan aman oleh Midtrans. Anda bisa membayar lewat virtual account bank, e-wallet, QRIS, atau kartu kredit, sesuai metode yang tersedia di halaman pembayaran. Setelah pembayaran berhasil, status pesanan berubah otomatis.',
  },
  {
    question: 'Bagaimana dengan domain website saya?',
    answer:
      'Saat memesan, Anda mengisi nama domain utama dan satu domain alternatif. Setelah pembayaran dikonfirmasi dan pesanan disetujui, tim kami memproses domain tersebut sampai website Anda aktif. Bila domain utama tidak tersedia, kami memakai domain alternatif atau menghubungi Anda terlebih dahulu.',
  },
  {
    question: 'Apakah website yang dibuat bisa saya edit sendiri?',
    answer:
      'Bisa. Setelah website aktif, buka Akun Saya lalu kelola situs Anda. Lewat CMS Anda dapat mengubah teks, gambar, layanan, galeri, testimoni, dan kontak dengan pratinjau langsung, tanpa perlu keahlian coding.',
  },
  {
    question: 'Apa bedanya template dengan jasa custom?',
    answer:
      'Template memakai desain siap pakai sehingga website lebih cepat online dan harganya tertera jelas. Jasa custom dibuat khusus untuk kebutuhan Anda, baik website maupun aplikasi mobile; kebutuhan dan biayanya dibahas lewat konsultasi lalu kami kirimkan penawaran.',
  },
];

/** FAQ umum bawaan, dipakai bila admin belum mengisi `faq_data`. */
const DEFAULT_FAQS: FaqItem[] = [
  {
    question: 'Bagaimana cara memesan website atau aplikasi mobile custom?',
    answer:
      'Isi form Pesan Custom atau hubungi kami lewat WhatsApp. Tim kami akan menghubungi Anda untuk konsultasi gratis, lalu mengirimkan penawaran yang sesuai dengan kebutuhan Anda.',
  },
  {
    question: 'Bagaimana dengan sistem keamanannya?',
    answer:
      'Setiap website yang kami bangun dilengkapi sertifikat SSL (HTTPS) dan sistem keamanan standar industri untuk melindungi data Anda dan pengunjung.',
  },
  {
    question: 'Siapa pemilik konten yang saya buat?',
    answer:
      'Seluruh konten dan data pada website atau aplikasi Anda sepenuhnya milik Anda. Kami membantu proses pengembangan dan pemeliharaan sistemnya.',
  },
];

const normalizeQuestion = (question: string) => question.trim().toLowerCase().replace(/\s+/g, ' ');

/** Section FAQ (#faq), gaya BELAJAR CPNS: judul sticky di kiri, accordion bernomor di kanan. */
const FAQ: React.FC<{ alt?: boolean; number?: string }> = ({ alt, number = '04' }) => {
  const { settings } = useSiteSettings();
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const baseId = useId();
  const adminFaqs = readList<FaqItem>(settings.faq_data, DEFAULT_FAQS).filter(
    (faq) => faq && typeof faq.question === 'string' && faq.question.trim(),
  );
  const platformKeys = new Set(PLATFORM_FAQS.map((faq) => normalizeQuestion(faq.question)));
  const faqs = [...PLATFORM_FAQS, ...adminFaqs.filter((faq) => !platformKeys.has(normalizeQuestion(faq.question)))];
  const whatsapp = getWhatsappNumber(settings);

  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className={`section-screen scroll-mt-12 sm:scroll-mt-4 ${alt ? 'bg-alt' : 'bg-canvas'}`}
    >
      <div className="container-site grid w-full gap-8 sm:gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
        {/* Kiri: judul (sticky di desktop) */}
        <div className="relative z-10 lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            layout="stack"
            index={number}
            label="FAQ"
            titleId="faq-title"
            title="Pertanyaan yang"
            accent="sering ditanyakan"
            description="Seputar pemesanan template, pembayaran, domain, CMS, dan jasa custom. Belum menemukan jawabannya? Tim kami siap membantu."
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
        <ul className="space-y-2.5">
          {faqs.map((faq, index) => {
            const open = openIndex === index;
            const buttonId = `${baseId}-q${index}`;
            const panelId = `${baseId}-a${index}`;
            return (
              <li key={`${index}-${faq.question}`}>
                <Reveal delay={Math.min(index, 6) * 0.06}>
                  <div
                    className={`rounded-[20px] ring-1 ring-inset transition-colors duration-300 ${
                      open
                        ? 'bg-surface ring-line'
                        : alt
                          ? 'bg-surface/60 ring-transparent hover:bg-surface'
                          : 'bg-alt/80 ring-transparent hover:bg-alt'
                    }`}
                  >
                    <h3>
                      <button
                        id={buttonId}
                        type="button"
                        onClick={() => setOpenIndex(open ? null : index)}
                        aria-expanded={open}
                        aria-controls={panelId}
                        className="flex min-h-12 w-full items-center gap-3 rounded-[20px] px-4 py-3 text-left sm:gap-4 sm:px-6 sm:py-5"
                      >
                        <span
                          className={`w-5 shrink-0 font-mono text-xs font-semibold tabular-nums transition-colors sm:w-6 ${
                            open ? 'text-primary' : 'text-subtle'
                          }`}
                        >
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className="flex-1 text-[14px] font-semibold leading-snug text-fg sm:text-base">{faq.question}</span>
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-300 sm:h-8 sm:w-8 ${
                            open ? 'rotate-45 bg-fg text-white' : 'bg-surface text-fg ring-1 ring-inset ring-line'
                          }`}
                          aria-hidden
                        >
                          <Plus className="h-4 w-4" />
                        </span>
                      </button>
                    </h3>
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      className="grid transition-[grid-template-rows] duration-500 ease-calm"
                      style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
                    >
                      <div className="overflow-hidden" inert={!open}>
                        {/* Rata dengan teks pertanyaan: padding tombol + lebar nomor + gap */}
                        <p
                          className={`pb-5 pl-12 pr-4 text-sm leading-relaxed text-muted transition-opacity duration-500 sm:pb-6 sm:pl-[64px] sm:pr-16 sm:text-[15px] ${
                            open ? 'opacity-100' : 'opacity-0'
                          }`}
                        >
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

export default FAQ;
