import type { TemplateDefinition } from '../types';
import HealthLink from './HealthLink';
import { healthlinkContent } from './defaultContent';
import { healthlinkSections } from './schema';

/** HealthLink — landing page telemedicine "app home" yang dirancang dari HP dulu: hero kartu aplikasi di atas foto (cari dokter + empat ubin layanan), layanan, cara konsultasi, dokter online dengan cari & saring, resep & tebus obat, ilustrasi rekam medis, pengingat kontrol (.ics/Google Calendar di perangkat), RS mitra, biaya, unduh aplikasi, FAQ, dan bantuan + kartu darurat 119 (demo: HealthLink, Yogyakarta, fiktif). */
export const healthlink: TemplateDefinition = {
  code: 'healthlink',
  name: 'HealthLink',
  sections: healthlinkSections,
  defaultContent: healthlinkContent,
  Component: HealthLink,
};
