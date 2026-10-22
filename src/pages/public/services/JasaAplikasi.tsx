// /jasa-pembuatan-aplikasi-mobile (docs/platform/SEO-PLAN.md §5.6 langkah 5). Isi: src/content/services.ts (MOBILE_SERVICE).
import { MOBILE_SERVICE } from '../../../content/services';
import { ServicePage } from './ServicePage';

export default function JasaAplikasi() {
  return <ServicePage service={MOBILE_SERVICE} />;
}
