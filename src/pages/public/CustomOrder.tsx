// /pesan-custom: formulir jasa pembuatan website / aplikasi mobile custom (tombol kedua di Hero).
// Tanpa harga: biaya dibahas lewat penawaran (SPEC §8). Kirim → submit_custom_order → layar sukses + nomor referensi.
// Ringkas (pemilik 2026-10-24: "terlalu ribet, terlalu banyak kalimat"): satu kalimat pengantar, 4 langkah pendek, dan
// SATU tombol WhatsApp (banner ajakan footer tidak dipasang di halaman ini; layar sukses punya tombol WhatsApp sendiri).
import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import { getWhatsappNumber, useSiteSettings, whatsappUrl } from '../../hooks/useSiteSettings';
import { getCurrentUser } from '../../lib/auth';
import { HUB_PATHS } from '../../seo/paths';
import { useHydrated } from '../../lib/preload';
import { AccountOffer } from './custom-order/AccountOffer';
import { CustomOrderForm, type CustomOrderResult } from './custom-order/CustomOrderForm';
import { SuccessPanel } from './custom-order/SuccessPanel';
import { WhatsAppIcon } from './custom-order/WhatsAppIcon';
import type { CustomOrderValues } from './custom-order/validation';

const STEPS = [
  { title: 'Kirim kebutuhan', text: 'Isi form, cukup beberapa menit.' },
  { title: 'Diskusi & penawaran', text: 'Kami kirim biaya dan jadwal.' },
  { title: 'Persetujuan', text: 'Pengerjaan dimulai setelah Anda setuju.' },
  { title: 'Pengerjaan & peluncuran', text: 'Diuji bersama Anda, lalu dirilis.' },
];

export default function CustomOrder() {
  const { settings } = useSiteSettings();
  // Sudah berkode negara ("0812…" dari setting admin → "62812…"), siap untuk wa.me
  const whatsapp = getWhatsappNumber(settings);
  const [result, setResult] = useState<CustomOrderResult | null>(null);
  const [formKey, setFormKey] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  // Pembeli yang sudah login: nama, email, dan nomor terisi otomatis. Sesi ada di localStorage, jadi baru dibaca
  // setelah hidrasi (HTML prerender = tamu); form dipasang ulang lewat key bila isian awalnya berubah.
  const hydrated = useHydrated();
  const initialValues = useMemo<Partial<CustomOrderValues>>(() => {
    if (!hydrated) return {};
    const user = getCurrentUser();
    if (!user || user.role !== 'customer') return {};
    return {
      name: typeof user.name === 'string' ? user.name : '',
      email: typeof user.email === 'string' ? user.email : '',
      phone: typeof user.phone === 'string' ? user.phone : '',
    };
  }, [hydrated]);

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
              {/* Pengantar: satu kalimat (tautan ke halaman jasa tetap ada di dalamnya) */}
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
                <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted sm:mt-5 sm:text-lg">
                  Ceritakan kebutuhan{' '}
                  <Link to={HUB_PATHS.webService} className="link-site font-medium">
                    website
                  </Link>{' '}
                  atau{' '}
                  <Link to={HUB_PATHS.mobileService} className="link-site font-medium">
                    aplikasi mobile
                  </Link>{' '}
                  Anda. Kami kirim penawaran biaya dan jadwal, konsultasinya gratis.
                </p>
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
                      <h2 className="mb-6 text-lg font-semibold tracking-[-0.01em] text-fg sm:text-xl">Ceritakan kebutuhan Anda</h2>
                      <CustomOrderForm
                        key={`${formKey}-${initialValues.email ?? ''}`}
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

              {/* Alur kerja (garis waktu bernomor) + satu tombol WhatsApp + tautan template/akun */}
              <div className="lg:col-start-1 lg:row-start-2 lg:max-w-lg">
                <section aria-labelledby="alur-custom">
                  <h2 id="alur-custom" className="text-[13px] font-semibold uppercase tracking-[0.08em] text-subtle">
                    Cara kerjanya
                  </h2>
                  {/* Garis tipis menyambung nomor langkah; cincin warna latar memutus garis di sekitar nomor */}
                  <ol className="relative mt-5 space-y-5 before:absolute before:bottom-4 before:left-4 before:top-4 before:w-px before:-translate-x-1/2 before:bg-line">
                    {STEPS.map(({ title, text }, index) => (
                      <li key={title} className="relative flex items-start gap-4">
                        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-semibold tabular-nums text-white ring-4 ring-canvas">
                          {index + 1}
                        </span>
                        <div className="min-w-0 pt-1">
                          <p className="text-[15px] font-semibold leading-snug text-fg">{title}</p>
                          <p className="mt-0.5 text-sm text-muted">{text}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>

                {/* Satu-satunya tombol WhatsApp di halaman (layar sukses memakai tombolnya sendiri) */}
                {!result && (
                  <div className="mt-8 flex items-center gap-3.5 rounded-2xl bg-surface p-4 ring-1 ring-inset ring-line sm:gap-4 sm:p-5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-whatsapp/10" aria-hidden>
                      <WhatsAppIcon className="h-5 w-5 text-whatsapp" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-fg sm:text-[15px]">Lebih suka chat?</p>
                      <p className="mt-0.5 text-[13px] text-muted sm:text-sm">Konsultasi gratis di WhatsApp.</p>
                    </div>
                    <a
                      href={whatsappUrl(whatsapp, 'Halo Garuda Nexa, saya ingin konsultasi tentang pembuatan website / aplikasi mobile custom.')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline btn-sm shrink-0"
                    >
                      Chat WhatsApp
                      <span className="sr-only"> (tab baru)</span>
                    </a>
                  </div>
                )}

                {!result && <AccountOffer className="mt-5" />}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer cta={false} />
    </>
  );
}
