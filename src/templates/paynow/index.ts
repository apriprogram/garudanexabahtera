import type { TemplateDefinition } from '../types';
import PayNow from './PayNow';
import { paynowContent } from './defaultContent';
import { paynowSections } from './schema';

/** PayNow — landing page dompet digital & payment gateway: hero foto latar di bawah gradasi indigo dengan mockup HP & notifikasi, fitur bertab, simulasi biaya (contoh tarif), keamanan, developer & API, angka, cerita merchant, unduh aplikasi, dan formulir pendaftaran merchant ke WhatsApp (demo: PayNow, merek fiktif, Jakarta). */
export const paynow: TemplateDefinition = {
  code: 'paynow',
  name: 'PayNow',
  sections: paynowSections,
  defaultContent: paynowContent,
  Component: PayNow,
};
