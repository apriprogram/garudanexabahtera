import {
  displayPhone,
  getContactEmail,
  getWhatsappNumber,
  useSiteSettings,
  whatsappUrl,
} from '../../../hooks/useSiteSettings';
import { LEGAL_LABELS, type LegalPageKey } from '../../../lib/legal';

export interface LegalContact {
  email: string;
  /** Nomor WhatsApp untuk ditampilkan, mis. "0851-8800-9152". */
  whatsappLabel: string;
  /** wa.me dengan pesan pembuka tentang dokumen yang sedang dibaca. */
  whatsappHref: string;
}

/** Kanal kontak (dari Pengaturan website) yang disebut di isi halaman legal. */
export const useLegalContact = (page: LegalPageKey): LegalContact => {
  const { settings } = useSiteSettings();
  const number = getWhatsappNumber(settings);
  return {
    email: getContactEmail(settings),
    whatsappLabel: displayPhone(number),
    whatsappHref: whatsappUrl(number, `Halo Admin, saya ingin bertanya tentang ${LEGAL_LABELS[page]} Garuda Nexa.`),
  };
};

/** "2026-10-21" → "21 Oktober 2026" (dibaca sebagai tanggal UTC agar tidak bergeser zona waktu). */
export const formatLegalDate = (iso: string): string => {
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
};
