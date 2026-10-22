// /jasa-pembuatan-website (docs/platform/SEO-PLAN.md §5.6 langkah 5). Isi: src/content/services.ts (WEB_SERVICE).
import { WEB_SERVICE } from '../../../content/services';
import { ServicePage } from './ServicePage';

export default function JasaWebsite() {
  return <ServicePage service={WEB_SERVICE} />;
}
