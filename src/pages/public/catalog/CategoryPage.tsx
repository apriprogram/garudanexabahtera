// /template/kategori/:category. STUB WP1 (head noindex di CategoryPage.seo.ts); isinya dibuat WP5.
// Slug di luar 4 kategori → halaman 404.
import { useParams } from 'react-router-dom';
import PageStub from '../../../components/layout/PageStub';
import { HUB_PATHS, isCategorySlug } from '../../../seo/paths';
import NotFound from '../NotFound';
import { CATEGORY_STUBS } from './categoryStub';

export default function CategoryPage() {
  const { category = '' } = useParams();
  if (!isCategorySlug(category)) return <NotFound />;
  const stub = CATEGORY_STUBS[category];

  return (
    <PageStub
      badge="Kategori template"
      title={stub.heading}
      documentTitle={stub.heading}
      crumb={stub.name}
      parents={[{ label: 'Template', to: HUB_PATHS.catalog }]}
      intro="Daftar template untuk kategori ini sedang kami siapkan di halaman ini. Sementara itu, semua template beserta harga dan demonya bisa Anda lihat di beranda."
      whatsappMessage={`Halo Admin, saya ingin bertanya tentang ${stub.heading.toLowerCase()} di Garuda Nexa.`}
    />
  );
}
