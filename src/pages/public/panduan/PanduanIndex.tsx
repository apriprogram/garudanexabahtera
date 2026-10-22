// /panduan. STUB WP1 (head noindex di PanduanIndex.seo.ts); isinya dibuat WP8. Artikel dari src/content/panduan.
import { Link } from 'react-router-dom';
import PageStub from '../../../components/layout/PageStub';
import { listArticles } from '../../../content/panduan';
import { articlePath } from '../../../seo/paths';

export default function PanduanIndex() {
  const articles = listArticles();

  return (
    <PageStub
      badge="Panduan"
      title="Panduan website untuk bisnis"
      documentTitle="Panduan"
      crumb="Panduan"
      intro="Artikel panduan membuat website untuk bisnis sedang kami tulis."
      whatsappMessage="Halo Admin, saya ingin bertanya tentang membuat website untuk bisnis."
    >
      {articles.length > 0 && (
        <ul className="space-y-3">
          {articles.map((article) => (
            <li key={article.slug}>
              <Link to={articlePath(article.slug)} className="card-flat lift block p-4 sm:p-6">
                <span className="block text-base font-semibold text-fg sm:text-xl">{article.title}</span>
                <span className="mt-1 block text-sm leading-relaxed text-muted sm:text-[15px]">{article.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageStub>
  );
}
