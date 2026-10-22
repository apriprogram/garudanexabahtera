// /pesan-custom: formulir jasa pembuatan website / aplikasi mobile custom (tombol kedua di Hero).
// Tanpa harga: biaya dibahas lewat penawaran (SPEC §8). Kirim → submit_custom_order → layar sukses + nomor referensi.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, ClipboardList, FileText, MessagesSquare, Rocket } from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import { getWhatsappNumber, useSiteSettings, whatsappUrl } from '../../hooks/useSiteSettings';
import { getCurrentUser } from '../../lib/auth';
import { AccountOffer } from './custom-order/AccountOffer';
import { CustomOrderForm, type CustomOrderResult } from './custom-order/CustomOrderForm';
import { SuccessPanel } from './custom-order/SuccessPanel';
import { WhatsAppIcon } from './custom-order/WhatsAppIcon';
import type { CustomOrderValues } from './custom-order/validation';

const STEPS = [
  {
    Icon: ClipboardList,
    title: 'Kirim kebutuhan',
    text: 'Isi formulir ini dengan gambaran proyek Anda. Cukup beberapa menit.',
  },
  {
    Icon: MessagesSquare,
    title: 'Diskusi & penawaran',
    text: 'Tim kami menghubungi Anda untuk memperjelas kebutuhan, lalu mengirim penawaran berisi biaya dan jadwal.',
  },
  {
    Icon: FileText,
    title: 'Persetujuan',
    text: 'Anda meninjau penawaran terlebih dulu. Pengerjaan baru dimulai setelah Anda menyetujuinya.',
  },
  {
    Icon: Rocket,
    title: 'Pengerjaan & peluncuran',
    text: 'Kami membangun, menguji bersama Anda, lalu meluncurkan website atau aplikasi Anda.',
  },
];

export default function CustomOrder() {
  const { settings } = useSiteSettings();
  // Sudah berkode negara ("0812…" dari setting admin → "62812…"), siap untuk wa.me
  const whatsapp = getWhatsappNumber(settings);
  const [result, setResult] = useState<CustomOrderResult | null>(null);
  const [formKey, setFormKey] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  // Pembeli yang sudah login: nama, email, dan nomor terisi otomatis
  const initialValues = useMemo<Partial<CustomOrderValues>>(() => {
    const user = getCurrentUser();
    if (!user || user.role !== 'customer') return {};
    return {
      name: typeof user.name === 'string' ? user.name : '',
      email: typeof user.email === 'string' ? user.email : '',
      phone: typeof user.phone === 'string' ? user.phone : '',
    };
  }, []);

  useEffect(() => {
    const previous = document.title;
    document.title = 'Pesan Website / Aplikasi Mobile Custom | Garuda Nexa';
    return () => {
      document.title = previous;
    };
  }, []);

  const scrollToPanel = () =>
    requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));

  return (
    <>
      <Navbar />
      <main className="bg-canvas pt-nav">
        <div className="relative overflow-hidden">
          {/* Aksen lembut biru brand di latar (tema terang) */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-linear-to-b from-brand-50/80 to-transparent" />

          <div className="container-site relative py-8 sm:py-14 lg:py-20">
            <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,40rem)] lg:gap-x-16 xl:gap-x-24">
              {/* Pengantar */}
              <div className="lg:col-start-1 lg:row-start-1">
                <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-[13px] text-subtle max-sm:mb-3">
                  {/* HP: area sentuh 40px tanpa mengubah ukuran teks (mobile-responsive.md §5) */}
                  <Link to="/" className="rounded transition-colors hover:text-fg max-sm:inline-flex max-sm:min-h-10 max-sm:items-center">
                    Beranda
                  </Link>
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                  <span aria-current="page" className="text-muted">
                    Pesan custom
                  </span>
                </nav>
                <span className="badge-site">Jasa pembuatan custom</span>
                <h1 className="mt-4 text-[24px] font-semibold leading-[1.2] tracking-[-0.02em] text-fg sm:text-5xl sm:leading-[1.08] sm:tracking-[-0.03em] xl:text-[56px]">
                  Pesan Website / Aplikasi Mobile <span className="text-primary">Custom</span>
                </h1>
                <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-muted sm:mt-5 sm:text-lg">
                  Punya ide yang tidak cukup dengan template? Ceritakan kebutuhan Anda. Kami akan menghubungi Anda untuk berdiskusi, lalu mengirim
                  penawaran harga dan jadwal yang sesuai dengan cakupan proyek Anda.
                </p>
                {/* HP: chip disembunyikan agar form lebih cepat terlihat; poinnya ada lagi di kartu proses & konsultasi */}
                <ul className="mt-5 flex flex-wrap gap-2 text-[13px] text-muted max-sm:hidden">
                  {['Tanpa daftar harga, biaya lewat penawaran', 'Konsultasi gratis', 'Website & aplikasi Android/iOS'].map((item) => (
                    <li key={item} className="inline-flex h-8 items-center rounded-full bg-surface px-3 ring-1 ring-inset ring-line">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Formulir / layar sukses */}
              <div ref={panelRef} id="formulir" className="scroll-mt-[calc(var(--nav-offset)+2rem)] lg:col-start-2 lg:row-span-2 lg:row-start-1">
                <div className="card-site p-5 sm:p-8">
                  {result ? (
                    <SuccessPanel
                      result={result}
                      whatsappNumber={whatsapp}
                      onReset={() => {
                        setResult(null);
                        setFormKey((k) => k + 1);
                        scrollToPanel();
                      }}
                    />
                  ) : (
                    <>
                      <div className="mb-6">
                        <h2 className="text-lg font-semibold tracking-[-0.01em] text-fg sm:text-xl">Ceritakan kebutuhan Anda</h2>
                        <p className="mt-1 text-sm text-muted">Semua isian wajib, kecuali yang bertanda opsional.</p>
                      </div>
                      <CustomOrderForm
                        key={formKey}
                        initialValues={initialValues}
                        onSuccess={(res) => {
                          setResult(res);
                          scrollToPanel();
                        }}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Alur kerja + kontak langsung + akun */}
              <div className="space-y-6 lg:col-start-1 lg:row-start-2">
                <section aria-labelledby="alur-custom" className="rounded-[24px] bg-alt p-5 ring-1 ring-inset ring-line sm:p-6">
                  <h2 id="alur-custom" className="text-base font-semibold text-fg sm:text-lg">
                    Bagaimana prosesnya
                  </h2>
                  <ol className="mt-4 space-y-4">
                    {STEPS.map(({ Icon, title, text }, index) => (
                      <li key={title} className="flex gap-3.5">
                        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-primary ring-1 ring-inset ring-line">
                          <Icon className="h-[18px] w-[18px]" aria-hidden />
                          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] font-semibold text-white">
                            {index + 1}
                          </span>
                        </span>
                        <div className="min-w-0 pt-0.5">
                          <p className="text-sm font-semibold text-fg sm:text-[15px]">{title}</p>
                          <p className="mt-0.5 text-sm leading-relaxed text-muted">{text}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>

                <div className="flex flex-col gap-4 rounded-[24px] bg-surface p-5 ring-1 ring-inset ring-line sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div>
                    <p className="text-sm font-semibold text-fg sm:text-[15px]">Lebih suka ngobrol langsung?</p>
                    <p className="mt-0.5 text-sm text-muted">Konsultasi gratis lewat WhatsApp pada jam kerja.</p>
                  </div>
                  <a
                    href={whatsappUrl(whatsapp, 'Halo Garuda Nexa, saya ingin konsultasi tentang pembuatan website / aplikasi mobile custom.')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline shrink-0"
                  >
                    <WhatsAppIcon className="h-[18px] w-[18px] text-whatsapp" />
                    Konsultasi Gratis
                  </a>
                </div>

                {!result && <AccountOffer />}

                <p className="text-sm text-muted">
                  Butuh website cepat dengan harga pasti?{' '}
                  <Link to="/#templates" className="link-site inline-flex items-center gap-1">
                    Lihat template siap pakai
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
