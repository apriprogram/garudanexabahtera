# tech

Without JavaScript, garudanexa.com shows crawlers almost nothing. Every URL (/, /template/corporate-nexa, /pesan-custom, unknown paths, /llms.txt and /favicon.ico) returns the same 1,537-byte HTML shell with status 200: 0 words, 0 links, one generic title and description, no canonical and no JSON-LD. AI answer engines don't run JS, so ChatGPT, Perplexity and Claude see no products, prices or custom-service page. Google is also hurt: robots.txt `Disallow: /api.php` stops Google's renderer from loading `get_templates`, `get_template` and `get_settings`, which the catalog and every /template page depend on. The sitemap has 5 URLs and none of them are template pages.

Bots are also blocked at two layers. Cloudflare blocks GPTBot, ClaudeBot, Bytespider and Amazonbot at its edge. The origin LiteSpeed server returned 403 to spoofed Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User and PerplexityBot user agents and then blocked the test IP for about 10 minutes, so the owner must check that real crawlers from verified IPs get through. Other gaps: www.garudanexa.com serves a duplicate copy with status 200, there are no canonical, OG image or structured-data tags, and /demo pages with made-up company text can be indexed.

PageSpeed (lab only, no real-user data yet):
- Mobile: LCP 4.5 s on the home page and 4.4 s on the template page.
- Desktop: LCP 0.9 s on both, but CLS 0.156 on the template page.
- Main JS file: 1,487,086 B raw (~401 KiB compressed in transfer), with admin pages loaded eagerly. Browsers only cache it for 4 hours because of a MIME-type mismatch in .htaccess.

Recommended fix:
- Pre-render all public pages to HTML at deploy time inside deploy-cpanel.mjs, using a Vite SSR build with React 19 prerenderToNodeStream and data fetched from the API at build time.
- Add a small PHP fallback (seo.php) for templates published after a deploy.
- Rewrite the .htaccess routing to scope this to the main host only, so buyer domains are not affected. It should also 301 www to the apex domain, return real 404s and serve noindex for app routes (/akun, /admin, /pesan, /demo and others).
- Fix robots.txt, generate the sitemap from the database and add JSON-LD.
- Set up Search Console, Bing Webmaster Tools and IndexNow.

No ranking can be guaranteed. These fixes make the site eligible to be crawled, understood and cited.

## Findings
### TECH-01 [P0|L|owner=False] Every public URL serves an empty SPA shell: 0 words, 0 links, one generic title and description (invisible to AI crawlers, delayed for Google)
Evidence: curl https://garudanexa.com/ returned 1,537 bytes: <div id="root"></div> plus a module script. The same 1,537-byte file comes back for /template/corporate-nexa, /pesan-custom, /demo/corporate-nexa, /akun and unknown paths, because the .htaccess SPA fallback sends every route to index.html. Raw HTML for all three key routes: 0 visible words, 0 <a href>, 0 h1, 0 JSON-LD, no canonical, and the same title and description. Rendered in a browser: / has 730 words, 56 links and h1 'Website profesional, siap online tanpa ribet.'; /template/corporate-nexa has 265 words, 45 links, h1 'Corporate Nexa' and price 'Rp 1.500.000'; /pesan-custom has 269 words, 37 links and 1 form. Vercel's crawler study (https://vercel.com/blog/the-rise-of-the-ai-crawler) found that GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot and PerplexityBot fetch HTML but do not execute JS, so ChatGPT search, Perplexity and Claude currently see only the static title and description. Google says server-side or pre-rendering 'is still a great idea' because not all bots run JS (https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics) and calls dynamic rendering 'a workaround and not a recommended solution' (https://developers.google.com/search/docs/crawling-indexing/javascript/dynamic-rendering). src/main.tsx uses createRoot (client-only) and every page fetches its data in useEffect.
Rec: Pre-render all indexable public routes at deploy time and keep the SPA for app-only routes. Full plan, file by file, is in data §6:
(1) Add src/entry-server.tsx: render(url, preload) wraps <StaticRouter location={url}><App/></StaticRouter> (from 'react-router') with react-dom/static prerenderToNodeStream, which waits for React.lazy and Suspense.
(2) Add src/lib/preload.ts. Prime the module caches before render, on the server and from window.__GN_PRELOAD__ on the client: sharedGets in src/lib/api.ts, the cache Map in src/hooks/useCachedJson.ts, and a template-by-slug cache. Make Templates.tsx, Projects.tsx and useTemplateBySlug.ts read primed data synchronously in their useState initializers. React's prerender does not include data fetched in effects.
(3) Add src/seo/routes.ts, the single source for title, description, canonical, robots, OG and JSON-LD per route. Replace useDocumentTitle with a useSeo() hook that updates <head> on SPA navigation.
(4) Add scripts/prerender.mjs, called from scripts/deploy-cpanel.mjs after the client build. It runs vite build --ssr, fetches get_settings, get_navbar_menus, get_templates and get_public_projects from https://garudanexa.com/api.php, and renders /, /pesan-custom, the legal pages and every /template/{slug}. It injects head tags, the app HTML and the preload JSON into the built index.html and writes _pre/<route>.html. It also writes app.html (shell with a noindex meta), 404.html, sitemap.xml and llms.txt.
(5) In src/main.tsx, use hydrateRoot when #root has children, otherwise createRoot. If hydration mismatches are too costly in a first iteration, keep createRoot, which simply replaces the identical markup.
(6) Add backend/seo.php as a runtime fallback for templates published after the last deploy: it injects head tags, JSON-LD and basic HTML from the DB, and returns 404 with noindex for unknown slugs.
Longer-term alternative: migrate to React Router v7 framework mode with ssr:false and prerender:[...] (https://reactrouter.com/how-to/pre-rendering).
Files: src/main.tsx, src/App.tsx, src/lib/api.ts, src/hooks/useCachedJson.ts, src/components/sections/Templates.tsx, src/components/sections/Projects.tsx, src/pages/public/template/useTemplateBySlug.ts, src/pages/public/template/useDocumentTitle.ts, scripts/deploy-cpanel.mjs, index.html, deploy/cpanel/htaccess, backend/modules/templates.php

### TECH-02 [P0|S|owner=False] robots.txt `Disallow: /api.php` stops Google's renderer from loading templates, settings and template detail data
Evidence: The live robots.txt (same as public/robots.txt) has 'Disallow: /api.php'. All public data loads from /api.php?action=...: get_templates (catalog, OtherTemplates), get_template&slug= (TemplateDetail, TemplateDemo), get_settings and get_navbar_menus (useCachedJson), and get_public_projects. Google: if missing resources make a page harder to understand, 'don't block them' (https://developers.google.com/search/docs/crawling-indexing/robots/intro). When the fetch fails, the code shows an error state: Templates.tsx shows 'Terjadi kendala…' with no template cards, so no <a href=/template/...> links appear, and TemplateDetail renders ErrorState, keeping the generic home title and description. Google's rendered home page therefore probably has no catalog, and the /template pages are likely seen as empty or soft-404. Lighthouse SEO scores 100 because Lighthouse ignores robots.txt for subresources.
Rec: Edit public/robots.txt to allow the public read actions while keeping the rest of the API blocked. The longest matching rule wins:
Allow: /api.php?action=get_settings
Allow: /api.php?action=get_navbar_menus
Allow: /api.php?action=get_templates
Allow: /api.php?action=get_template&
Allow: /api.php?action=get_public_projects
Disallow: /api.php
In backend/api.php, add the header 'X-Robots-Tag: noindex' to JSON responses so API URLs never appear in search results. Then run Search Console URL Inspection > Test live URL on / and /template/corporate-nexa and check 'Page resources' and the rendered HTML. This is a one-line fix that helps right away, even before prerendering ships.
Files: public/robots.txt, backend/api.php

### TECH-03 [P0|S|owner=True] Bots are blocked at two layers: Cloudflare blocks AI training crawlers, and the origin WAF rejects or drops crawler user agents and blocks the IP for about 10 minutes
Evidence: Tested 2026-10-23 at 02:34 WIB from one Indonesian IP with spoofed user agents.
- GPTBot, ClaudeBot, Bytespider, Amazonbot: 403 'Your request was blocked.' (25 B text/plain), served by Cloudflare with no x-turbo-charged-by header, so it never reached the origin. This matches Cloudflare's 'Block AI bots' setting for training crawlers (https://developers.cloudflare.com/bots/additional-configurations/block-ai-bots/).
- Googlebot smartphone user agent: 403 from LiteSpeed at the origin on the first request.
- After that, Bingbot, OAI-SearchBot, ChatGPT-User and PerplexityBot all got 403, and so did a plain Chrome user agent, for about 10 minutes. robots.txt stayed 200.
- Clean retest after the block lifted: OAI-SearchBot got Cloudflare 520 (origin dropped the connection) and the IP was blocked again.
PageSpeed (Google IPs) loaded the site fine. Spoofed user agents from a non-crawler IP do not prove that real crawlers from verified IPs are blocked. However, the origin is clearly configured to drop OAI-SearchBot-style traffic, and OAI-SearchBot is the crawler that controls ChatGPT search visibility (https://developers.openai.com/api/docs/bots). PerplexityBot is Perplexity's indexer (https://docs.perplexity.ai/docs/resources/perplexity-crawlers.md). Claude-SearchBot and Claude-User serve Claude search (https://support.claude.com/en/articles/8896518).
Rec: Owner actions:
(a) Cloudflare > AI Crawl Control / Bots: allow the search and user-fetch crawlers (OAI-SearchBot, ChatGPT-User, PerplexityBot, Perplexity-User, Claude-SearchBot, Claude-User, Applebot, DuckAssistBot) and verified search engines. Deciding on training crawlers (GPTBot, ClaudeBot, CCBot, Google-Extended) is a business choice: allowing them makes it more likely models know the brand. Keep robots.txt consistent with that choice.
(b) In cPanel, check Imunify360, ModSecurity and LiteSpeed bot protection: look at incidents and the Raw Access log (grep -E 'Googlebot|bingbot|OAI-SearchBot|ChatGPT-User|PerplexityBot|Claude' and status 403/444). Whitelist verified crawler IP ranges (OpenAI publishes searchbot.json and chatgpt-user.json; Google and Bing publish theirs). Make sure the origin restores the real client IP from Cloudflare (CF-Connecting-IP, trusted only from Cloudflare ranges) so a block never hits a Cloudflare edge IP.
(c) Verify with Search Console Crawl stats and URL Inspection live test, and with Bing Webmaster URL Inspection. Re-test after each WAF change.
Files: deploy/cpanel/htaccess, public/robots.txt

### TECH-04 [P0|S|owner=False] sitemap.xml has no template (product) URLs and its lastmod dates are written by hand
Evidence: The live sitemap.xml (same as public/sitemap.xml) lists 5 URLs: /, /pesan-custom and 3 legal pages, with lastmod 2026-10-21/22 hand-written. None of the /template/{slug} pages are listed. The API currently publishes 2 templates: corporate-nexa (Rp 1.500.000) and startup-clean (Rp 990.000), both Company Profile, updated_at 2026-10-20. Arena Club, Aura Studio and Finova are being added. Together with TECH-01 and TECH-02, the product pages have no reliable discovery path for any crawler.
Rec: Generate the sitemap from data instead of keeping a static file.
- Option A, at deploy: scripts/prerender.mjs writes OUT/sitemap.xml from get_templates (lastmod = updated_at) plus the static routes with the build date, with an image:image entry per preview image. Remove public/sitemap.xml so it isn't copied over.
- Option B, always fresh: backend/sitemap.php queries 'templates WHERE status=published', and .htaccess adds RewriteRule ^sitemap\.xml$ sitemap.php [L].
Drop changefreq and priority (Google ignores them). Include only canonical, indexable 200 URLs: no /demo, /pesan or ?layanan= variants. Submit the sitemap in Search Console and Bing Webmaster Tools, and ping IndexNow when a template is published.
Files: public/sitemap.xml, scripts/deploy-cpanel.mjs, backend/modules/templates.php, deploy/cpanel/htaccess

### TECH-05 [P1|M|owner=False] No per-route meta in HTML: description and OG are the same everywhere, titles are set only by JS, and there is no canonical, og:image, og:url or twitter card
Evidence: Rendered DOM:
- /template/corporate-nexa: title is 'Corporate Nexa · Template Company Profile | Garuda Nexa', but meta description and og:title are still the home page's.
- /pesan-custom: title is set in a useEffect (CustomOrder.tsx line 60); the description is the home page's.
- All routes: canonical, og:image, og:url, og:locale and twitter:card are null, and there are 0 hreflang links. <html lang="id"> is present.
WhatsApp, Facebook and LinkedIn link previews show no image. WhatsApp is the main sharing channel for Indonesian buyers.
Rec: Create src/seo/routes.ts and render its tags into each prerendered file's <head>, with useSeo() keeping them in sync on SPA navigation. Each page needs:
- a unique <title> (≤60 chars) and meta description (≤155 chars)
- <link rel=canonical> pointing to the https://garudanexa.com/ version, with query strings like ?layanan= stripped
- og:type, og:url, og:title, og:description, og:image (1200×630 JPG/PNG; generate one per template from the preview at build time, because OG scrapers don't render SVG), og:locale=id_ID and twitter:card=summary_large_image
Suggested values are in the data §5 table. hreflang is unnecessary for a single-language site; keep lang="id" and optionally add a self-referencing hreflang="id-ID".
Files: index.html, src/pages/public/TemplateDetail.tsx, src/pages/public/CustomOrder.tsx, src/pages/public/legal/LegalPage.tsx, src/pages/public/template/useDocumentTitle.ts

### TECH-06 [P1|M|owner=False] Soft 404s everywhere and duplicate URLs (www host, /index.html, trailing slash, query variants)
Evidence: These all return 200 text/html with the 1,537 B shell: /this-page-does-not-exist-xyz, /template/tidak-ada-xyz, /llms.txt, /favicon.ico and /manifest.webmanifest. Lighthouse 'Agentic Browsing' (2/4) flags llms.txt as 'missing H1 / no links' because it receives HTML. NotFound.tsx adds noindex only through JS. Google warns that JS changes to noindex 'may not work as expected' (javascript-seo-basics).
Duplicate URLs:
- https://www.garudanexa.com/ returns 200 with identical content (no redirect to the apex).
- http://www returns 301 to https://www (two hops to the canonical).
- /index.html returns 200.
- /template/corporate-nexa/ returns 200 (React Router matches the trailing slash).
- Internal links use /pesan-custom?layanan=website and ?layanan=mobile.
The origin http to https redirect works (301 to https://garudanexa.com/).
Rec: In deploy/cpanel/htaccess (full block in data §7):
- 301 www.garudanexa.com to https://garudanexa.com in one hop, placed before the HTTPS rule or combined with it
- 301 /index.html to /
- 301 trailing slashes to the no-slash form
- serve a real 404 for unknown paths on the main host (RewriteRule ^ - [R=404,L] plus ErrorDocument 404 /404.html, a prerendered page with noindex)
- send the SPA shell only for known app prefixes
- for /template/{unknown}, have seo.php return 404
Add a canonical tag to every page (TECH-05).
Files: deploy/cpanel/htaccess, src/pages/public/NotFound.tsx, scripts/deploy-cpanel.mjs

### TECH-07 [P1|M|owner=False] No structured data at all (0 JSON-LD on every route)
Evidence: There are 0 script[type=application/ld+json] in the raw or rendered HTML of /, /template/corporate-nexa and /pesan-custom, and grep finds no 'ld+json' in src/ outside the buyer templates. The facts needed for Organization, Product/Offer (IDR prices) and Service schema already exist in the API and settings. The footer has no physical address (the footer_address default is a tagline), so LocalBusiness can't be built yet.
Rec: Emit JSON-LD from src/seo/routes.ts into the prerendered HTML (examples in data §8):
- every page: Organization with @id #organization (PT Garuda Nexa Bahtera, alternateName Garuda Nexa, logo PNG ≥112px, email, contactPoint with the sales WhatsApp, areaServed ID, sameAs social URLs) and WebSite (name 'Garuda Nexa', for the Google site name). Skip SearchAction: Google retired the sitelinks search box.
- /template/{slug}: Product + Offer (priceCurrency IDR, price, availability InStock, url, seller=#organization, image) and BreadcrumbList. Do not add aggregateRating without real reviews.
- /pesan-custom and future service pages: Service ('Jasa pembuatan website', 'Jasa pembuatan aplikasi mobile Android/iOS', provider=#organization, areaServed ID) and BreadcrumbList.
- home: ItemList of the template URLs, plus FAQPage mirroring the visible FAQ. This gives no Google rich result (FAQ rich results were deprecated) but helps AI engines.
- LocalBusiness only after the owner adds a real address and a Google Business Profile.
Validate with the Rich Results Test and validator.schema.org.
Files: src/seo/routes.ts (new), src/components/sections/FAQ.tsx, src/hooks/useSiteSettings.ts, scripts/deploy-cpanel.mjs

### TECH-08 [P1|S|owner=False] Transactional, account and demo routes can be indexed; /demo pages show 621 words of made-up company content
Evidence: These routes all return 200 with no noindex and no X-Robots-Tag: /akun, /pesan/:slug, /masuk, /daftar, /situs/:id, /demo/:slug. robots.txt only disallows /admin, /login, /auth and /api.php. The rendered /demo/corporate-nexa has the title 'Demo Corporate Nexa | Garuda Nexa', h1 'Membangun ruang usaha yang kokoh…' and invented claims ('PT Samudra Karya Persada', 'Dipercaya 200+ perusahaan sejak 2009'). This is thin, duplicated content that search engines or AI engines could attribute to Garuda Nexa.
Rec: Serve these routes from app.html, a shell with <meta name="robots" content="noindex,follow"> built by the prerender script. Route them in .htaccess: RewriteRule ^(akun|admin|pesan|demo|situs|masuk|daftar|login|auth)(/.*)?$ app.html [L]. Note the pattern ^pesan(/|$) does not catch pesan-custom. On /demo/:slug, also set canonical to /template/:slug. Do not add these paths to robots.txt Disallow, or crawlers can't see the noindex; keep the existing /admin disallow. Keep /masuk and /daftar out of the sitemap.
Files: deploy/cpanel/htaccess, public/robots.txt, src/pages/public/TemplateDemo.tsx, scripts/deploy-cpanel.mjs

### TECH-09 [P1|S|owner=False] Entry JS is 1.49 MB raw (~401 KiB transferred) because the admin panel is imported eagerly; mobile LCP is 4.4–4.5 s
Evidence: Entry chunk index-BRiQkxTJ.js: 1,487,086 B raw (from ../.garudanexa-deploy/build), 410,631 B with br, 400.8 KiB transferred per PageSpeed. PageSpeed reports 'Reduce unused JavaScript' savings of 277 KiB on / and 300 KiB on /template/corporate-nexa. src/App.tsx statically imports Auth and adminRoutes. src/pages/admin/routes.tsx statically imports 22 admin pages (Dashboard, ProductManager, project-docs, template-orders…), and admin strings ('Order Masuk', 'Input Domain', 'Kelola Template') are present in the entry chunk. PageSpeed mobile on the home page: Performance 66, FCP 4.4 s, LCP 4.5 s, TBT 130 ms, SI 8.0 s, JS execution 2.7 s; on the template page: Performance 74, LCP 4.4 s. No real-user (CrUX) data exists for the URL or the origin, so INP is not measurable yet.
Rec: In src/pages/admin/routes.tsx, convert every page import to React.lazy and wrap the elements in Suspense, the same way as lazyPage in App.tsx. Lazy-load Auth (/login, /auth) in src/App.tsx. Make sure the zustand store, framer-motion and any admin-only libraries aren't pulled into the public entry. Expected result: well under 150 KiB transferred on public pages. Check with 'vite build' plus rollup-plugin-visualizer, or the PageSpeed treemap. Combined with prerendering, mobile FCP and LCP should drop sharply, since text and the hero image will paint before any JS runs.
Files: src/App.tsx, src/pages/admin/routes.tsx, vite.config.ts

### TECH-10 [P2|M|owner=False] Rendering performance: the mobile LCP image is lazy-loaded, fonts block rendering, continuous animations, and the footer shifts (CLS 0.156)
Evidence: PageSpeed mobile on the home page:
- LCP element: <img loading="lazy" aria-hidden src=/assets/templates/startup-clean-preview.svg>, a rotating hero showcase slide (HeroShowcase.tsx line 311 sets loading to lazy when the slide is inactive). Flags: 'should not use loading=lazy', 'fetchpriority=high should be applied', 'not discoverable in initial document'.
- Render-blocking requests: index CSS 28 KiB plus Google Fonts CSS (Inter 300–800 and JetBrains Mono 500/600), estimated saving 1,200 ms on mobile.
- Main-thread work: 23.8 s ('Other' 18.5 s) and 7 non-composited animations (logo ticker, hero background, step pills).
- DOM: 941 elements.
CLS: home mobile 0.065; template page desktop 0.156 (footer and nav shift when API content arrives).
Rec: - In the prerendered HTML, add <link rel=preload as=image fetchpriority=high> for the first hero showcase image. Use loading=eager for the first two slides and keep the first slide's img in the static markup.
- Self-host Inter as a woff2 subset with only the weights you use (e.g. 400/500/600/700), preload one file and use font-display: swap. Drop JetBrains Mono from the critical path.
- Pause the ticker and hero canvas when off-screen (IntersectionObserver) and respect prefers-reduced-motion. Animate only transform and opacity.
- Reserve space with min-height skeletons. Prerendering removes most CLS because the content no longer arrives late.
Files: src/components/sections/hero/HeroShowcase.tsx, src/components/sections/hero/HeroBackground.tsx, src/components/sections/LogoTicker.tsx, index.html, src/index.css

### TECH-11 [P2|S|owner=False] Hashed JS bundles are cached for only 4 hours because of a MIME-type mismatch in .htaccess
Evidence: /assets/index-BRiQkxTJ.js is served as Content-Type: text/javascript with Cache-Control: max-age=14400 (Cloudflare's default browser TTL). The .htaccess rule is ExpiresByType application/javascript, which never matches text/javascript. CSS gets max-age=31536000 and SVG gets 2592000. PageSpeed: 'Use efficient cache lifetimes', estimated saving 277–286 KiB on repeat visits. HTML is no-cache and Cloudflare reports cf-cache-status DYNAMIC.
Rec: In deploy/cpanel/htaccess, add 'ExpiresByType text/javascript "access plus 1 year"'. Better, add <FilesMatch "-[A-Za-z0-9_-]{8}\.(js|css)$"> with Header set Cache-Control "public, max-age=31536000, immutable". Change the HTML rule from index.html only to all *.html (_pre/*.html, app.html, 404.html) with no-cache. Optionally add a Cloudflare Cache Rule to cache /_pre HTML at the edge for 5–10 minutes, and purge on deploy.
Files: deploy/cpanel/htaccess

### TECH-12 [P1|M|owner=False] No crawlable landing or category URLs for the money keywords; navigation is #anchors and button filters
Evidence: Rendered internal links on the home page: 19 unique, of which 6 are #anchors (navbar: #templates, #process, #faq, #kontak). The category tabs and 'Populer' chips in Templates.tsx are <button>s, not URLs. 'Tampilkan lebih banyak' is a button (PAGE_SIZE=12), so once there are more than 12 templates the rest have no link from any page. Demo links open in target=_blank. There is no URL for 'template website' (catalog), 'template website company profile/olahraga/kecantikan/keuangan', 'jasa pembuatan website' or 'jasa pembuatan aplikasi android/iOS'. The only service URL is the order form /pesan-custom, which has 269 words.
Rec: Add prerendered, linked routes in App.tsx and src/seo/routes.ts:
- /template: the full catalog with every card as <a href>, and pagination via ?page= links or by rendering all cards
- /template/kategori/{slug}: one per category from the API
- /jasa-pembuatan-website and /jasa-pembuatan-aplikasi-mobile: content pages that link to /pesan-custom
Link these from the Navbar and Footer with real hrefs (keep the #anchors as secondary), add breadcrumbs as <a> links, and include them in the sitemap. The Content area defines the copy; this finding only ensures the URLs exist, are crawlable and are prerendered.
Files: src/App.tsx, src/components/layout/Navbar.tsx, src/components/layout/Footer.tsx, src/components/sections/Templates.tsx, src/pages/public/TemplateDetail.tsx

### TECH-13 [P1|S|owner=False] Buyer domains share index.html: prerendering and canonicals must apply to the main host only; buyer sites are client-rendered too
Evidence: SiteHostGate.tsx renders the buyer's site on any host that isn't a main host, using the same index.html. If the prerendered garudanexa.com HTML, canonical or JSON-LD were served to buyer domains, a canonical pointing to garudanexa.com would tell Google to drop the buyer's site from its index. MAIN_HOSTS in siteHosts.ts includes garudanexabahtera.web.id, which currently fails DNS (could not resolve). Buyer sites get an empty shell too: siteHead.ts sets title and description only via JS, with no canonical, sitemap or robots per buyer domain. That weakens the 'website siap online' value for buyers.
Rec: Put a RewriteCond %{HTTP_HOST} ^garudanexa\.com$ [NC] on every prerender, app.html and 404 rule. Other hosts keep today's behaviour of index.html for any non-file path. Keep index.html as a neutral shell with no garudanexa canonical or JSON-LD, and put the Garuda Nexa head tags only in _pre/*.html. If garudanexabahtera.web.id is reactivated, 301 it to https://garudanexa.com. Later product improvement: a PHP head renderer for buyer domains (seo.php keyed on HTTP_HOST, using template_sites.content) plus a per-domain robots.txt and sitemap.
Files: deploy/cpanel/htaccess, src/templates/SiteHostGate.tsx, src/templates/siteHosts.ts, src/templates/siteHead.ts

### TECH-14 [P1|S|owner=True] No sign of Search Console, Bing Webmaster Tools or IndexNow setup; the brand is missing from the web search index tested
Evidence: No google-site-verification or msvalidate meta and no IndexNow key file exists in the repo or the live HTML (DNS verification can't be seen from here). WebSearch (a US index) for site:garudanexa.com, "garudanexa.com" and "Garuda Nexa Bahtera" returned no pages from the domain. PageSpeed shows 'No Data' for real-user experience, meaning very low Chrome traffic so far. Copilot draws on Bing's index, and AI Overviews and Gemini draw on Google's index.
Rec: Owner actions:
- Search Console: create a Domain property for garudanexa.com (DNS TXT via Cloudflare), submit the sitemap and request indexing of / and the /template/* pages after the fix ships.
- Bing Webmaster Tools: import from Search Console, submit the sitemap and enable IndexNow. Alternatively, turn on Cloudflare 'Crawler Hints', which sends IndexNow signals automatically.
- Monitor the Page indexing report (soft 404 and duplicate counts), Crawl stats (403/5xx to Googlebot) and Core Web Vitals once CrUX data appears.
Files: scripts/deploy-cpanel.mjs

### TECH-15 [P2|S|owner=False] Missing share and app icons: no og:image, no apple-touch-icon or manifest, and /favicon.ico returns HTML
Evidence: index.html only has <link rel=icon type=image/svg+xml href=/favicon.svg?v=2>. There is no apple-touch-icon and no manifest. /favicon.ico and /manifest.webmanifest return 200 text/html (the SPA shell). There is no og:image (TECH-05). Template preview images are SVG (8–14 KB), which link-preview scrapers can't use.
Rec: Add public/favicon.ico (48×48), public/apple-touch-icon.png (180×180), public/site.webmanifest (name, short_name, icons 192/512, theme_color) and the matching <link> tags in index.html. At deploy, rasterize each template preview to /og/{slug}.jpg (1200×630), e.g. with sharp or resvg-js in scripts/prerender.mjs, and add a default /og/garudanexa.jpg. The Organization logo should be a PNG of at least 112×112.
Files: index.html, public/, scripts/deploy-cpanel.mjs

### TECH-16 [P2|S|owner=False] Home H1 has no target keyword; the hero heading changes with the rotating tabs and is split into per-word spans
Evidence: The rendered h1 on / is 'Website profesional, siap online tanpa ribet.' (HeroIntro.tsx, SplitText as='h1' on the active panel only; inactive panels render <p>). Neither 'template website' nor 'jasa pembuatan website/aplikasi' appears in the h1. Section h2s: 'Pilih Template', 'Cara kerja kami', 'Pertanyaan yang sering ditanyakan', and a CTA. The Projects section h2 is not rendered at the moment.
Rec: Keep exactly one static h1 per page that contains the main intent, e.g. 'Template Website Siap Pakai & Jasa Pembuatan Website / Aplikasi'. Keep the rotating hero text as a styled <p> or span. Make sure SplitText keeps real spaces between words so text extractors don't join them. Use keyword-bearing h2s: 'Template website company profile siap pakai', 'Jasa pembuatan website & aplikasi mobile custom'. The Content area owns the exact copy.
Files: src/components/sections/hero/HeroIntro.tsx, src/components/ui/SplitText.tsx, src/components/ui/SectionHeading.tsx

### TECH-17 [P3|S|owner=False] AI discovery files: /llms.txt is missing (soft-404 HTML) and Lighthouse 'Agentic Browsing' scores 2/4
Evidence: PageSpeed 'Agentic Browsing' is 2/4 on / and 1/4 on the template page on desktop. Failures: 'llms.txt does not follow recommendations' (missing H1, no links) and 'ai-catalog.json schema is invalid'. Both happen because those paths return the HTML shell with status 200. llms.txt is a proposed convention, not a ranking factor.
Rec: Once real 404s work (TECH-06), generate /llms.txt at deploy from the same data: an H1 brand line, a one-paragraph summary (what is sold, prices include setup, domain, hosting and SSL for year 1, Midtrans payment, CMS, custom web and mobile apps, Indonesia), and Markdown links to /template/{slug} with prices, /pesan-custom and the policy pages. Template in data §9. Low effort and low priority; the real AI-visibility gains come from TECH-01 to TECH-03.
Files: scripts/deploy-cpanel.mjs, public/


## Data
## 1. What crawlers receive (live tests, 2026-10-23 02:34–02:55 WIB, Indonesian IP)

| User agent (spoofed) | robots.txt rule | Response | Layer / note |
|---|---|---|---|
| Googlebot smartphone | allowed (`User-agent: *`) | **403** LiteSpeed 'Forbidden' (1,242 B) | Origin; non-Google IP, so likely a fake-bot check. The IP was then **greylisted ~10 min** |
| Bingbot | allowed | 403 (origin) | Inconclusive: IP already greylisted |
| GPTBot | allowed | **403 'Your request was blocked.'** 25 B text/plain | **Cloudflare edge** (no `x-turbo-charged-by`); 'Block AI bots' for training crawlers |
| ClaudeBot, Bytespider, Amazonbot | allowed | same 25 B Cloudflare block | Cloudflare edge |
| OAI-SearchBot | allowed | first run 403 (greylist); clean retest **520** (origin dropped the connection), then the IP was blocked again | Origin WAF |
| ChatGPT-User, PerplexityBot, `Google-Extended` (robots token only, not a fetcher) | allowed | 403 origin | Inconclusive (greylisted) |
| Normal Chrome after the tests | n/a | 403 for ~10 min; `/robots.txt` stayed 200 | Origin per-IP block |
| PageSpeed Lighthouse (Google IPs) | n/a | 200, renders | OK |

Caveat: these are spoofed user agents from a non-crawler IP. Real crawlers from verified IPs must be checked in the Cloudflare Security Events / AI Crawl Control dashboard, the cPanel Imunify/ModSecurity logs and the Raw Access log, plus Search Console and Bing URL Inspection.

## 2. Raw HTML vs rendered DOM

| Metric | / raw | / rendered | /template/corporate-nexa raw | rendered | /pesan-custom raw | rendered |
|---|---|---|---|---|---|---|
| HTML bytes | 1,537 | n/a | 1,537 (identical file) | n/a | 1,537 | n/a |
| Visible words | **0** | 730 | **0** | 265 | **0** | 269 |
| `<a href>` (unique internal) | **0** | 56 (19) | **0** | 45 (17) | **0** | 37 (14) |
| `<title>` | generic home | generic home | generic home | 'Corporate Nexa · Template Company Profile \| Garuda Nexa' (JS) | generic | 'Pesan Website / Aplikasi Mobile Custom \| Garuda Nexa' (JS) |
| meta description | generic | generic | generic | **generic (home)** | generic | **generic (home)** |
| canonical / og:image / twitter | none | none | none | none | none | none |
| h1 | none | 'Website profesional, siap online tanpa ribet.' | none | 'Corporate Nexa' | none | 'Pesan Website / Aplikasi Mobile Custom' |
| JSON-LD | 0 | 0 | 0 | 0 | 0 | 0 |
| Price visible | no | in cards | no | Rp 1.500.000 | n/a | n/a |

What AI engines (no JS) see today: only the static title 'Garuda Nexa | Template Website Siap Pakai & Jasa Website / Aplikasi Mobile Custom' and the description, the same on every URL.

## 3. Status codes, redirects, duplicates

| URL | Result |
|---|---|
| /this-page-does-not-exist-xyz, /template/tidak-ada-xyz | 200 shell (**soft 404**) |
| /llms.txt, /favicon.ico, /manifest.webmanifest | 200 text/html shell |
| /index.html, /template/corporate-nexa/ (trailing slash) | 200 (duplicates) |
| https://www.garudanexa.com/ | **200 duplicate host** (no 301 to the apex) |
| http://garudanexa.com/ | 301 to https://garudanexa.com/ (OK) |
| http://www.garudanexa.com/ | 301 to https://www… (should go straight to the apex) |
| /demo/corporate-nexa | 200, 621 words of made-up company content, no noindex |
| /akun, /pesan/:slug, /masuk, /daftar | 200, indexable |
| /api.php?action=get_templates | 200 JSON, no-store. Live: **2 templates** (corporate-nexa Rp1.500.000, startup-clean Rp990.000), 1 category 'Company Profile' |
| garudanexabahtera.web.id (in MAIN_HOSTS) | NXDOMAIN |
| robots.txt | allows all, disallows /admin, /login, /auth, **/api.php** |
| sitemap.xml | 5 URLs, **0 /template/** |

## 4. Performance (PageSpeed Insights, Lighthouse 13.5, 2026-10-23; real-user CrUX data: **No Data**)

| URL | Device | Perf | FCP | LCP | TBT | CLS | SI | SEO | Agentic |
|---|---|---|---|---|---|---|---|---|---|
| / | mobile | 66 | 4.4 s | **4.5 s** | 130 ms | 0.065 | 8.0 s | 100 | 2/4 |
| / | desktop | 89 | 0.9 s | 0.9 s | 10 ms | 0 | 4.8 s | 100 | 2/4 |
| /template/corporate-nexa | mobile | 74 | 4.3 s | **4.4 s** | 0 ms | 0 | 4.3 s | 100 | 2/4 |
| /template/corporate-nexa | desktop | 92 | 0.9 s | 0.9 s | 0 ms | **0.156** | 0.9 s | 100 | 1/4 |

- Entry `index-BRiQkxTJ.js`: **1,487,086 B raw / 410,631 B br / 400.8 KiB transferred**; unused 277 KiB (home) and 300 KiB (template page). Admin pages are imported eagerly via `src/pages/admin/routes.tsx`, which is imported statically in `src/App.tsx`.
- Caching: JS `text/javascript` max-age=14400 (Cloudflare default; .htaccess only matches `application/javascript`), CSS 1 year, SVG 30 days, HTML no-cache.
- Render-blocking: CSS 28 KiB plus Google Fonts (Inter 300–800 and JetBrains Mono); estimated saving 1,200 ms on mobile.
- LCP element (mobile home): lazy-loaded hero showcase SVG with no fetchpriority, not in the initial HTML. Template page: gallery image, ~1 s resource-load delay.
- Main thread on mobile home: 23.8 s, 7 non-composited animations, 941 DOM nodes. CLS culprit: the footer shifting when API content arrives.
- Server response: fast (Cloudflare SIN, observed TTFB about 1 ms on the cached document).
- Lighthouse SEO 100 is misleading: it audits the rendered DOM and ignores robots-blocked XHR, canonical presence, sitemap and structured data.

## 5. Per-route meta and indexing plan (src/seo/routes.ts)

| Route | Title (≤60) | Description (≤155) | Canonical | Robots | JSON-LD |
|---|---|---|---|---|---|
| / | Template Website Siap Pakai & Jasa Pembuatan Website \| Garuda Nexa | Beli template website company profile siap online: harga sudah termasuk domain, hosting & SSL tahun pertama, bayar via Midtrans. Juga jasa website & aplikasi custom. | https://garudanexa.com/ | index,follow | Organization, WebSite, ItemList, FAQPage |
| /template | Template Website Siap Pakai – Katalog Lengkap \| Garuda Nexa | (catalog summary + price range) | self | index | ItemList, BreadcrumbList |
| /template/kategori/{cat} | Template Website {Kategori} Siap Pakai \| Garuda Nexa | … | self | index | ItemList, BreadcrumbList |
| /template/{slug} | {Nama} – Template Website {Kategori} \| Garuda Nexa | {short_description} Harga Rp{harga}, termasuk domain, hosting & SSL tahun pertama. | self | index | Product+Offer (IDR), BreadcrumbList |
| /jasa-pembuatan-website, /jasa-pembuatan-aplikasi-mobile | Jasa Pembuatan Website/Aplikasi … \| Garuda Nexa | … | self | index | Service, BreadcrumbList |
| /pesan-custom (?layanan= stripped) | Pesan Website / Aplikasi Mobile Custom \| Garuda Nexa | … | https://garudanexa.com/pesan-custom | index | Service, BreadcrumbList |
| legal (3) | {Judul} \| Garuda Nexa | … | self | index,follow | WebPage |
| /demo/{slug} | Demo {Nama} \| Garuda Nexa | … | /template/{slug} | **noindex,follow** | none |
| /pesan/*, /akun*, /masuk, /daftar, /situs/*, /admin*, /login, /auth | as today | n/a | n/a | **noindex** (app.html) | none |
| unknown | Halaman tidak ditemukan | n/a | n/a | **404 + noindex** | none |

All indexable routes also get og:type, og:url, og:title, og:description, og:image (1200×630 JPG), og:locale=id_ID and twitter:card=summary_large_image. Keep `<html lang="id">`; hreflang is optional (single language).

## 6. Rendering fix for cPanel static hosting + PHP (no Node at runtime)

**Recommended:** build-time SSG using a Vite SSR build and React 19 `prerenderToNodeStream`, run locally inside `scripts/deploy-cpanel.mjs`, plus a PHP fallback for freshness.

| Option | Pros | Cons |
|---|---|---|
| **A. Vite SSR + custom prerender script (recommended now)** | Keeps library-mode React Router; data from the prod API at build time; deterministic; no Chromium | Must prime caches so first render ≠ loading; guard window/localStorage use during render |
| B. React Router v7 framework mode `ssr:false` + `prerender:[…]` | Official SSG, per-route meta/loader, hydration built in | Larger routing migration; outputs `/x/index.html` (needs .htaccess slash handling) |
| C. Headless Chromium snapshot at deploy | Least code change | Heavy, brittle (captures animation states), no hydration |

Steps for A:
1. `src/entry-server.tsx`: `export async function render(url, preload)` → `primePreload(preload)` → `prerenderToNodeStream(<StaticRouter location={url}><App/></StaticRouter>)` → string. SiteHostGate sees hostname '' on the server, so isMainHost('') is true and the main app renders, which is correct.
2. `src/lib/preload.ts`: `primePreload({settings, navbar, templates, projects, templateBySlug})` fills `sharedGets` (src/lib/api.ts), the `cache` Map (src/hooks/useCachedJson.ts, keyed '/api.php?action=get_settings' etc.) and a slug cache. On the client, read `<script id="gn-preload" type="application/json">` before rendering.
3. Read primed data synchronously in the `useState` initializer in Templates.tsx (LoadState 'ready'), Projects.tsx and useTemplateBySlug.ts. Effects still refetch for freshness.
4. `src/seo/routes.ts` + `useSeo()` replace useDocumentTitle and the manual document.title calls (CustomOrder.tsx, LegalPage.tsx, TemplateDetail.tsx, TemplateDemo.tsx, NotFound.tsx).
5. `src/main.tsx`: `root.hasChildNodes() ? hydrateRoot(root, app) : createRoot(root).render(app)`. Fallback for phase 1: always createRoot, which replaces the identical markup.
6. `scripts/prerender.mjs`, called from deploy-cpanel.mjs after `build()`:
   - `await build({ build: { ssr: 'src/entry-server.tsx', outDir: OUT_SSR } })`
   - `fetch('https://garudanexa.com/api.php?action=get_templates' | get_settings | get_navbar_menus | get_public_projects)`
   - routes = ['/', '/pesan-custom', '/syarat-ketentuan', '/kebijakan-privasi', '/kebijakan-pengembalian-dana', ...templates.map(t => `/template/${t.slug}`)] (+ /template, categories, service pages)
   - for each route: `html = shell.replace('</head>', headTags + '</head>').replace('<div id="root"></div>', `<div id="root">${app}</div><script id="gn-preload" type="application/json">${json}</script>`)`; write `OUT/_pre/{route || 'index'}.html`
   - write `OUT/app.html` (shell + `<meta name="robots" content="noindex,follow">`), `OUT/404.html` (prerendered NotFound, noindex), `OUT/sitemap.xml` (lastmod = updated_at), `OUT/llms.txt` and `OUT/og/{slug}.jpg` (rasterized preview)
   - copy `backend/seo.php` to `OUT/seo.php`
7. `backend/seo.php`: for `/template/{slug}` with no `_pre` file, load the template from the DB (reuse `pf_template_out`). If missing or unpublished, return `http_response_code(404)` plus 404.html. Otherwise read index.html, inject title, description, canonical, OG and Product JSON-LD and a simple server HTML block (name, description, features, price, links), and echo it.
8. Keep `index.html` neutral for buyer domains (no garudanexa canonical or JSON-LD).
9. Remove `public/sitemap.xml`, or let the generated one overwrite it.

## 7. Proposed .htaccess routing (deploy/cpanel/htaccess; replaces the current SPA block; test each rule with curl -I on LiteSpeed)
```apache
RewriteEngine On
RewriteBase /
# www to apex in one hop (place before/with the HTTPS rule)
RewriteCond %{HTTP_HOST} ^www\.garudanexa\.com$ [NC]
RewriteRule ^ https://garudanexa.com%{REQUEST_URI} [R=301,L]
# (existing HTTPS + sensitive-file rules here)
# internal files are not directly reachable
RewriteCond %{ENV:REDIRECT_STATUS} ^$
RewriteRule ^(_pre/|app\.html$) - [R=404,L]
RewriteCond %{ENV:REDIRECT_STATUS} ^$
RewriteRule ^index\.html$ / [R=301,L]
# trailing slash to no slash (not real dirs)
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.+)/$ /$1 [R=301,L]
RewriteRule ^api/ai-chat/?$ api.php?action=ai_chat [QSA,L]
# MAIN HOST: prerendered pages
RewriteCond %{HTTP_HOST} ^garudanexa\.com$ [NC]
RewriteRule ^$ _pre/index.html [L]
RewriteCond %{HTTP_HOST} ^garudanexa\.com$ [NC]
RewriteCond %{DOCUMENT_ROOT}/_pre/$1.html -f
RewriteRule ^([a-z0-9/-]+)$ _pre/$1.html [L]
# MAIN HOST: template published after the last deploy, rendered by PHP (404 if unknown)
RewriteCond %{HTTP_HOST} ^garudanexa\.com$ [NC]
RewriteRule ^template/([a-z0-9-]+)$ seo.php?slug=$1 [L,QSA]
# MAIN HOST: app-only routes get the noindex shell
RewriteCond %{HTTP_HOST} ^garudanexa\.com$ [NC]
RewriteRule ^(akun|admin|pesan|demo|situs|masuk|daftar|login|auth)(/.*)?$ app.html [L]
# BUYER DOMAINS: unchanged SPA behaviour
RewriteCond %{HTTP_HOST} !^garudanexa\.com$ [NC]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]
# MAIN HOST: anything else is a real 404
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ - [R=404,L]
ErrorDocument 404 /404.html
# caching
ExpiresByType text/javascript "access plus 1 year"
<FilesMatch "-[A-Za-z0-9_-]{8}\.(js|css)$">
  Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>
<FilesMatch "\.html$">
  Header set Cache-Control "no-cache"
</FilesMatch>
```

## 8. robots.txt and JSON-LD
```
User-agent: *
Allow: /
Allow: /api.php?action=get_settings
Allow: /api.php?action=get_navbar_menus
Allow: /api.php?action=get_templates
Allow: /api.php?action=get_template&
Allow: /api.php?action=get_public_projects
Disallow: /api.php
Disallow: /admin
Disallow: /login
Disallow: /auth
Sitemap: https://garudanexa.com/sitemap.xml
```
(No Disallow for /akun, /pesan or /demo: they use noindex instead. Configure AI crawler policy in Cloudflare and keep it consistent with this file.)

Product (per template):
```json
{"@context":"https://schema.org","@type":"Product","@id":"https://garudanexa.com/template/corporate-nexa#product","name":"Corporate Nexa – Template Website Company Profile","description":"Company profile elegan untuk perusahaan …","image":["https://garudanexa.com/og/corporate-nexa.jpg"],"sku":"corporate-nexa","category":"Template Website Company Profile","brand":{"@type":"Brand","name":"Garuda Nexa"},"offers":{"@type":"Offer","url":"https://garudanexa.com/template/corporate-nexa","priceCurrency":"IDR","price":"1500000","availability":"https://schema.org/InStock","seller":{"@id":"https://garudanexa.com/#organization"}}}
```
Organization (every page): `{"@type":"Organization","@id":"https://garudanexa.com/#organization","name":"PT Garuda Nexa Bahtera","alternateName":"Garuda Nexa","url":"https://garudanexa.com/","logo":"https://garudanexa.com/brand/logo-512.png","email":"info@garudanexa.com","contactPoint":{"@type":"ContactPoint","contactType":"sales","telephone":"<WhatsApp sales number, +62 format>","areaServed":"ID","availableLanguage":["id"]},"sameAs":["<Instagram>","<LinkedIn>","<TikTok>"]}`.
Plus WebSite (name/url, no SearchAction), Service for custom web and mobile (provider #organization, areaServed ID), BreadcrumbList, ItemList on catalog pages, and FAQPage mirroring the visible FAQ.

## 9. llms.txt skeleton (generated at deploy)
```
# Garuda Nexa (PT Garuda Nexa Bahtera)
> Template website siap pakai untuk bisnis di Indonesia (harga sudah termasuk setup, domain, hosting & SSL tahun pertama; bayar online via Midtrans; isi dikelola sendiri lewat CMS) dan jasa pembuatan website & aplikasi mobile (Android/iOS) custom.
## Template
- [Corporate Nexa – Company Profile, Rp1.500.000](https://garudanexa.com/template/corporate-nexa)
- [Startup Clean – Company Profile, Rp990.000](https://garudanexa.com/template/startup-clean)
## Jasa custom
- [Pesan website / aplikasi mobile custom](https://garudanexa.com/pesan-custom)
## Kebijakan
- [Syarat & ketentuan](https://garudanexa.com/syarat-ketentuan) · [Kebijakan privasi](https://garudanexa.com/kebijakan-privasi) · [Pengembalian dana](https://garudanexa.com/kebijakan-pengembalian-dana)
```

## 10. Owner checklist (in order)
1. Cloudflare: allow AI search and user crawlers, decide on training crawlers, review Security Events for Googlebot/bingbot.
2. Origin WAF (Imunify/ModSecurity/LiteSpeed): whitelist verified crawlers, real-IP restore from Cloudflare.
3. Search Console Domain property + sitemap + URL Inspection live test.
4. Bing Webmaster Tools + IndexNow (or Cloudflare Crawler Hints).
5. Real business address + Google Business Profile (needed for LocalBusiness).
6. Social profile URLs for sameAs.

## Sources
- https://vercel.com/blog/the-rise-of-the-ai-crawler
- https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- https://developers.google.com/search/docs/crawling-indexing/javascript/dynamic-rendering
- https://developers.google.com/search/docs/crawling-indexing/javascript/fix-search-javascript
- https://developers.google.com/search/docs/crawling-indexing/robots/intro
- https://developers.openai.com/api/docs/bots
- https://docs.perplexity.ai/docs/resources/perplexity-crawlers.md
- https://support.claude.com/en/articles/8896518
- https://developers.cloudflare.com/bots/additional-configurations/block-ai-bots/
- https://www.searchenginejournal.com/google-drops-faq-rich-results/574429/
- https://developers.google.com/search/blog/2023/08/howto-faq-changes
- https://vite.dev/guide/ssr
- https://react.dev/reference/react-dom/static/prerender
- https://reactrouter.com/how-to/pre-rendering
- https://www.indexnow.org/faq
- PageSpeed reports: https://pagespeed.web.dev/analysis/https-garudanexa-com/r1gtf7lspy and https://pagespeed.web.dev/analysis/https-garudanexa-com-template-corporate-nexa/4ddspieli3