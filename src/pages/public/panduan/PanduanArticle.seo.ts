// /panduan/{slug} (STUB WP1, noindex sampai WP8 mengisi halamannya). Slug tanpa file .md → head null → kepala 404.
import { getArticle } from '../../../content/panduan';
import { stubHead, TITLE_SUFFIX } from '../../../seo/defaults';
import { GUIDE_PREFIX } from '../../../seo/paths';
import type { PageSeo } from '../../../seo/types';

const PATTERN = /^\/panduan\/([^/]+)$/;

const seo: PageSeo = {
  match: (pathname) => pathname.startsWith(GUIDE_PREFIX) && PATTERN.test(pathname),
  head: (pathname) => {
    const article = getArticle(pathname.match(PATTERN)?.[1] ?? '');
    return article ? stubHead({ title: `${article.title}${TITLE_SUFFIX}`, description: article.description }) : null;
  },
};

export default seo;
