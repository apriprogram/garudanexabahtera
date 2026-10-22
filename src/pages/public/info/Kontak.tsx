// /kontak. STUB WP1 (head noindex di Kontak.seo.ts); isinya dibuat WP6. Kontak dari Pengaturan website (bawaan =
// COMPANY_FACTS). Alamat dan jam layanan belum ada (null), jadi tidak ditampilkan.
import PageStub from '../../../components/layout/PageStub';
import { displayPhone, getContactEmail, getWhatsappNumber, telHref, useSiteSettings } from '../../../hooks/useSiteSettings';

export default function Kontak() {
  const { settings } = useSiteSettings();
  const whatsapp = getWhatsappNumber(settings);
  const email = getContactEmail(settings);

  return (
    <PageStub
      badge="Kontak"
      title="Hubungi Garuda Nexa"
      documentTitle="Kontak"
      crumb="Kontak"
      intro="Untuk pertanyaan tentang template, website custom, atau aplikasi mobile, hubungi kami lewat WhatsApp atau email."
      whatsappMessage="Halo Admin, saya ingin bertanya ke Garuda Nexa."
    >
      <dl className="card-flat grid gap-4 p-5 text-sm sm:grid-cols-2 sm:p-7 sm:text-[15px]">
        <div className="min-w-0">
          <dt className="eyebrow">WhatsApp & telepon</dt>
          <dd className="mt-1.5">
            <a href={telHref(whatsapp)} className="link-site font-medium tabular-nums">
              {displayPhone(whatsapp)}
            </a>
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="eyebrow">Email</dt>
          <dd className="mt-1.5 truncate">
            <a href={`mailto:${email}`} className="link-site font-medium">
              {email}
            </a>
          </dd>
        </div>
      </dl>
    </PageStub>
  );
}
