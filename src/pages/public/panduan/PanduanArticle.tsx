// /panduan/:slug. STUB WP1 (head noindex di PanduanArticle.seo.ts); halaman artikel dibuat WP8.
// Slug tanpa file .md di src/content/panduan → halaman 404.
import { useParams } from 'react-router-dom';
import PageStub from '../../../components/layout/PageStub';
import { getArticle } from '../../../content/panduan';
import { HUB_PATHS } from '../../../seo/paths';
import NotFound from '../NotFound';

export default function PanduanArticle() {
  const { slug = '' } = useParams();
  const article = getArticle(slug);
  if (!article) return <NotFound />;

  return (
    <PageStub
      badge="Panduan"
      title={article.title}
      parents={[{ label: 'Panduan', to: HUB_PATHS.guides }]}
      intro={article.description}
      whatsappMessage={`Halo Admin, saya ingin bertanya tentang panduan "${article.title}".`}
    />
  );
}
