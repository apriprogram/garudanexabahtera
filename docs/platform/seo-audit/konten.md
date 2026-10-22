# content

garudanexa.com is not ready to rank for buyer queries or to be cited by AI search engines yet. The main blocker is rendering. Every URL returns the same empty `<div id="root">` shell with the homepage title and description, so crawlers that don't run JavaScript (OAI-SearchBot, ClaudeBot, PerplexityBot) see no prices, FAQ, templates or services. Template pages also reuse the homepage meta description and OG tags.

**What exists today:**
- Indexable pages that sell something: only `/`, the `/template/:slug` pages and `/pesan-custom`.
- The template catalog only lives at the `/#templates` anchor.
- The live sitemap has 5 URLs and no template pages.
- There are no service pages, no pricing page, no about or contact page, and no guides.

**Trust signals are weak:**
- The Projects section is turned off (`disabled_sections=["pricing","projects"]`) and `get_public_projects` returns `[]`.
- There are no testimonials, no physical address (the `footer_address` setting holds a tagline), and every social link is `#`.
- There is no JSON-LD and no `og:image`.

**Facts contradict each other, which AI answers would quote:**
- A stale FAQ (rewritten by the 2026-10-19 migration) does not say hosting is included.
- The pricing box says domain, hosting and SSL for year 1 are included.
- The public settings API still exposes a placeholder WhatsApp number.

**Live checks:**
- On 2026-10-22 around 19:47 UTC every path returned LiteSpeed 403 Forbidden, both from this machine and through WebFetch. robots.txt still answered because Cloudflare served it from cache. The site was back to 200 a few minutes later.
- `www` serves 200 instead of redirecting, and there is no canonical tag.
- `/llms.txt` and any unknown URL return the SPA shell with status 200.
- Demo pages with made-up businesses and testimonials can be indexed.

**Keywords:** Indonesian Google autocomplete (hl=id, gl=id) shows that "template website" mostly means free or HTML templates. The intent that leads to a purchase is "website company profile siap pakai", "jasa/harga pembuatan website company profile", "jasa pembuatan aplikasi android dan ios", plus niche queries such as "contoh website klinik kecantikan" and "website booking lapangan padel".

**Plan:**
- First, prerender every public route to static HTML at build time, with its own title, meta, canonical, OG and JSON-LD.
- Then build the page structure in `data`: /template, category pages, richer template pages, /jasa-pembuatan-website, /jasa-pembuatan-aplikasi-mobile, /harga, /portofolio, /tentang, /kontak and /panduan with 12 articles.
- Put one set of company facts behind the FAQ, llms.txt, JSON-LD and footer.
- Check that AI search crawlers are allowed through Cloudflare, and verify the site in Google Search Console and Bing Webmaster Tools.
- The owner needs to supply the address, registration numbers (NIB/PSE), a real portfolio and testimonials. They also need to decide whether custom services show a starting price.

Google says AI Overviews need no special files (llms.txt is optional) and that FAQ rich results were deprecated in 2026. So what matters is crawlable, consistent, specific text. No ranking is guaranteed.

## Findings
### CONTENT-01 [P0|L|owner=False] Every URL serves an empty client-rendered shell with the homepage meta, so AI crawlers see no content and template pages duplicate the homepage meta
Evidence: Raw HTML of https://garudanexa.com/ (curl, 2026-10-23) is index.html with `<div id="root"></div>` and one static title and description. After JS renders, https://garudanexa.com/template/corporate-nexa has document.title 'Corporate Nexa · Template Company Profile | Garuda Nexa', but meta description and og:title are still the homepage ones ('Pilih template website Company Profile siap pakai...'). useDocumentTitle only sets document.title (src/pages/public/template/useDocumentTitle.ts). No canonical, og:url, og:image or JSON-LD on any page (checked in the browser: canonical null, jsonld 0). Vercel's crawler study found OAI-SearchBot, ChatGPT-User, GPTBot and ClaudeBot do not execute JavaScript (https://vercel.com/blog/the-rise-of-the-ai-crawler). Google says AI features need the page to be indexable with important content in text (https://developers.google.com/search/docs/appearance/ai-features).
Rec: Pre-render each public route to static HTML at build time: /, /template, /template/kategori/*, /template/<slug>, /jasa-*, /harga, /portofolio, /tentang, /kontak, /panduan/*, the legal pages and /pesan-custom. Fetch template data from the API (get_templates) during build/deploy. Write dist/<route>/index.html with full body text plus per-route <title>, meta description, canonical, og:title/description/url/image, twitter:card and JSON-LD. The .htaccess already serves existing files and folders before the SPA fallback, so pre-rendered folders work. Add a small head manager (e.g. a useSeo hook) so client navigation keeps title, meta and canonical in sync. Every content recommendation in this report depends on this step.
Files: index.html, src/main.tsx, src/App.tsx, src/pages/public/template/useDocumentTitle.ts, src/pages/public/TemplateDetail.tsx, scripts/deploy-cpanel.mjs, vite.config.ts, deploy/cpanel/htaccess

### CONTENT-02 [P1|S|owner=True] Whole site briefly returned 403 Forbidden to browsers, Googlebot UA and an external fetcher
Evidence: At Date 'Thu, 22 Oct 2026 19:47:21 GMT' (CF-RAY ...-SIN), every path (/, /sitemap.xml, /favicon.svg, /template/finova, /api.php) returned the LiteSpeed '403 Forbidden' page for Chrome, Googlebot, GPTBot and curl user agents, in the built-in browser, and through WebFetch from a different network. Only robots.txt answered 200, as a Cloudflare cache HIT (Age 816). A few minutes later / returned 200 with index.html last-modified 11:26 UTC, so the outage was not a fresh deploy.
Rec: Owner/hosting: check the cPanel/LiteSpeed error log, Imunify360/ModSecurity and LiteSpeed anti-bot settings, and Cloudflare Security Events for that time window. Add uptime monitoring (e.g. UptimeRobot on /, /sitemap.xml and one /template URL) and watch Search Console Crawl Stats for 403/5xx. Repeated 403s shown to Googlebot or AI crawlers slow crawling and can drop pages from the index.
Files: deploy/cpanel/htaccess, scripts/deploy-cpanel.mjs

### CONTENT-03 [P1|L|owner=False] No crawlable page structure: catalog is only a #fragment, sitemap has no template URLs, no service, pricing, about, contact or guide pages
Evidence: Routes in src/App.tsx: /, /template/:slug, /demo/:slug, /pesan/:slug, /pesan-custom, /masuk, /daftar and the legal pages. The catalog exists only as /#templates. Navbar and footer 'Jelajahi' links are hash anchors (/#templates, /#process, /#faq). The live sitemap.xml has 5 URLs (/, /pesan-custom, 3 legal pages) with no /template/<slug>. Breadcrumbs and 'Lihat Semua Template' point to /#templates. There is no page that can rank for 'jasa pembuatan website', 'jasa pembuatan aplikasi android', 'harga pembuatan website company profile' or any niche.
Rec: Build the page structure in data §3–§4: /template (catalog), /template/kategori/<kategori>, enriched /template/<slug>, /jasa-pembuatan-website, /jasa-pembuatan-aplikasi-mobile, /harga, /portofolio (real items only), /tentang, /kontak, /panduan plus articles. Use real <a href> links in the navbar (Template, Jasa ▾, Harga, Projects→/portofolio, Panduan) and footer, plus breadcrumbs on every page. Generate sitemap.xml at build from routes and templates, with lastmod taken from templates.updated_at.
Files: src/App.tsx, public/sitemap.xml, src/components/layout/Navbar.tsx, src/components/layout/Footer.tsx, src/pages/public/TemplateDetail.tsx, src/components/sections/Templates.tsx

### CONTENT-04 [P1|M|owner=False] Template detail pages are thin (~265 words), share homepage meta and do not target 'contoh website <niche>' queries
Evidence: Rendered /template/corporate-nexa main text is about 265 words: one paragraph of description, a feature list, the generic 3-step flow and the price box. Meta description and OG are the homepage's, with no og:image and no Product schema. The H1 is just the product name ('Corporate Nexa'), so the niche keyword is missing. Google autocomplete hl=id shows 'contoh website klinik kecantikan' and 'website booking lapangan padel', which the new Aura Studio and Arena Club pages could answer.
Rec: Use the template-page outline in data §4.3. H1 '{Nama}: Template Website {Niche}'. Add H2 sections: Cocok untuk; Halaman & bagian yang Anda dapatkan (from the template's CMS sections); Yang bisa Anda ubah sendiri; Sudah termasuk + biaya tahun ke-2; Cara memesan & berapa lama aktif; Contoh tampilan (desktop/HP screenshots with descriptive alt); 4–6 FAQs; related templates, category and guide links. Aim for 600–900 unique words, plus Product+Offer+BreadcrumbList JSON-LD and a 1200x630 OG image made from the WebP preview. Keep claims honest: Arena Club books courts via WhatsApp, it has no booking system.
Files: src/pages/public/TemplateDetail.tsx, src/pages/public/template/OtherTemplates.tsx, database/seed.templates.sql, database/migrations/2026-10-22_008_new_templates.sql

### CONTENT-05 [P1|S|owner=False] Homepage title, H1 and visible copy miss the buyer keywords
Evidence: The live H1 is 'Website profesional, siap online tanpa ribet.' (HeroIntro.tsx:156, keys home-hero-template-lead/accent in src/hooks/useTranslation.ts). None of 'template website', 'company profile', 'jasa pembuatan website' or 'aplikasi Android/iOS' appears in an H1 or H2. The H2s are 'Pilih Template', 'Cara kerja kami', 'Pertanyaan yang sering ditanyakan' and 'Siap Membangun Sistem Digital?...'. The static <title> is 83 characters (over the ~60 shown) and the description is 186 characters. The rendered page has about 950 words (5,951 characters), most of it FAQ.
Rec: Title 'Template Website Siap Pakai & Jasa Website | Garuda Nexa' (56). Meta per data §4.1 (148). H1 in template mode: 'Template website siap pakai,' + accent 'termasuk domain & hosting.' Custom mode: 'Jasa pembuatan website' + accent '& aplikasi mobile custom.' Add a crawlable 2-sentence intro naming PT Garuda Nexa Bahtera, the template niches, the price range and what is included. Add a 'Sudah termasuk' strip, category tiles that link to category pages, a template-vs-custom table and 3 latest guides. Make the CTA H2 more specific (e.g. 'Konsultasi gratis untuk website atau aplikasi Anda').
Files: index.html, src/hooks/useTranslation.ts, src/components/sections/hero/HeroIntro.tsx, src/pages/public/Home.tsx, src/components/layout/Footer.tsx

### CONTENT-06 [P1|M|owner=True] Missing trust signals: no portfolio, no testimonials, no address, empty social profiles, no about page
Evidence: The public settings API shows disabled_sections=["pricing","projects"] and get_public_projects returns {"projects":[]}. The old portfolio_data entries are placeholders ('Web App Dashboard SAAS / FINANCE', with an image that does not match the label). footer_address holds the tagline 'Mitra terpercaya untuk inovasi digital...', not an address. footer_instagram, facebook, linkedin, tiktok and youtube are all '#'. No physical address, NIB or team appears anywhere. The legal page sources are still marked 'DRAF ... perlu ditinjau pemilik'. products_data lists the company's own products (i-School at office.ischool.my.id, i-Santri, POS, Absensi, Undangan Digital), but none are shown as proof.
Rec: Owner supplies: (1) office address, city and postcode, used identically on the site, Google Business Profile and directories; (2) NIB and PSE (Kemkomdigi) registration if applicable (PSE registration applies to private operators offering goods/services online, see hukumonline link in data); (3) 3–6 real case studies (own products i-School/i-Santri/POS plus client sites with permission); (4) testimonials with name, business, city and consent; (5) real social profile URLs for Organization sameAs; (6) team names and roles for /tentang and article bylines. Do not re-enable the placeholder portfolio. Don't mark up own reviews as star ratings on Organization pages (Google calls these self-serving).
Files: src/components/layout/Footer.tsx, src/components/sections/Projects.tsx, src/pages/public/legal/SyaratKetentuan.tsx, src/hooks/useSiteSettings.ts

### CONTENT-07 [P1|S|owner=True] Contradictory facts AI engines would quote (hosting included?, SSL, timing) plus placeholder contact data
Evidence: The live FAQ #07 'Apakah sudah termasuk hosting dan domain?' answers only 'domain yang Anda ajukan ... kami proses' and says custom hosting is discussed in consultation. This text was set by database/migrations/2026-10-19_004_template_marketplace.sql:268, before the owner's 2026-10-21 decision. The template price box (useSiteSettings.ts TEMPLATE_PRICE_INCLUDES_DEFAULT) says domain, hosting and SSL for year 1 are included. FAQ #08 promises 'SSL (HTTPS) gratis' for every website built, including custom. FAQ #06 only says 'beberapa hari kerja'. The public settings API exposes contact_whatsapp=628123456789 (placeholder) next to footer_whatsapp=6285188009152, plus a stale English hero_title.
Rec: Create one company-facts source (e.g. src/lib/companyFacts.ts or one settings group) feeding the FAQ, JSON-LD, llms.txt, footer, /tentang and /kontak. Rewrite FAQ #07 to: 'Ya, untuk template: harga sudah termasuk template + setup, domain, hosting, dan SSL tahun pertama. Mulai tahun ke-2...'. Scope the SSL claim to templates. Owner gives a concrete go-live range (e.g. 'X–Y hari kerja'). Clear or fix contact_whatsapp and the legacy hero fields. Write answers so the first sentence answers the question, in 40–60 words.
Files: src/components/sections/FAQ.tsx, src/hooks/useSiteSettings.ts, database/migrations/2026-10-19_004_template_marketplace.sql, src/components/layout/Footer.tsx

### CONTENT-08 [P1|S|owner=True] AI-search crawler access unverified (Cloudflare AI-bot blocking) and no Bing presence for Copilot/ChatGPT
Evidence: robots.txt allows all user agents (`User-agent: * Allow: /`), but Cloudflare sits in front (server: cloudflare). Since July 2025 Cloudflare blocks known AI crawlers by default for new domains (https://www.technologyreview.com/2025/07/01/1119498/cloudflare-will-now-by-default-block-ai-bots-from-crawling-its-clients-websites/). OpenAI: 'Sites that are opted out of OAI-SearchBot will not be shown in ChatGPT search answers' (https://developers.openai.com/api/docs/bots). Perplexity recommends allowing PerplexityBot and its IP ranges (https://docs.perplexity.ai/guides/bots). The brand is not findable in web search (searching 'Garuda Nexa template website' returned only unrelated 'Nexa' templates).
Rec: Owner: in Cloudflare (Security > Bots / AI Crawl Control), allow search and answer crawlers: Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, PerplexityBot, Perplexity-User, Claude-SearchBot and Claude-User. Decide separately on training crawlers (GPTBot, Google-Extended, CCBot, ClaudeBot); blocking them does not affect search visibility. Add explicit robots.txt groups for clarity. Verify a domain property in Google Search Console, import it into Bing Webmaster Tools, submit the sitemap, and consider IndexNow on deploy. Re-run curl with each crawler's user agent after changes.
Files: public/robots.txt

### CONTENT-09 [P1|M|owner=False] No machine-readable company and product data (zero JSON-LD, no og:image or og:url)
Evidence: Browser check: 0 script[type=application/ld+json] on / and /template/corporate-nexa, no og:image, og:url, og:locale or twitter:card. index.html only has og:type, site_name, title and description. WhatsApp link previews, which matter for Indonesian sales, show no image.
Rec: Add the JSON-LD set in data §6. Sitewide: Organization (@id https://garudanexa.com/#organization: legalName PT Garuda Nexa Bahtera, url, logo, email, telephone, address once available, sameAs once real, contactPoint) and WebSite (inLanguage id-ID). Template pages: Product+Offer (IDR price, InStock, seller → org) + BreadcrumbList. Service pages: Service (provider → org, areaServed ID, no price). Articles: Article (author Person, datePublished, dateModified). Catalog: CollectionPage+ItemList. AboutPage and ContactPage. Markup must match visible text. Give every page an og:image (1200x630 JPG/PNG, small file) from the template WebP screenshots or a branded card, plus og:url, og:locale id_ID and twitter:card summary_large_image. FAQPage markup is optional: Google says FAQ rich results are no longer shown (June 2026).
Files: index.html, src/pages/public/TemplateDetail.tsx, scripts/deploy-cpanel.mjs

### CONTENT-10 [P2|S|owner=False] No llms.txt; /llms.txt and unknown URLs return the SPA shell with 200; .htaccess blocks .md files
Evidence: curl https://garudanexa.com/llms.txt gives 200 text/html (the index.html fallback). /halaman-tidak-ada-xyz also gives 200 (soft 404; NotFound.tsx adds noindex only via JS). deploy/cpanel/htaccess:26 `RewriteRule \.(sql|sh|log|ya?ml|md|lock|ini)$ - [F,L]` returns 403 for any .md file, including Markdown page versions the llms.txt proposal suggests (https://llmstxt.org/). Google states 'You don't need to create new machine readable files, AI text files, or markup to appear in these features', so llms.txt is a cheap extra, not a ranking lever.
Rec: Generate public/llms.txt and public/llms-full.txt at build from the company-facts source and template data, using the outline in data §5.2. Serve them as text/plain; charset=utf-8 and list them in the sitemap's companion docs (not required). If you publish Markdown page versions, carve an exception into the .md deny rule (e.g. allow ^llms/.*\.md$) or use .txt. Return a real 404 status for unknown paths once routes are pre-rendered (ErrorDocument 404 → a pre-rendered 404.html for paths not matching known route patterns).
Files: deploy/cpanel/htaccess, public/robots.txt, scripts/deploy-cpanel.mjs, src/pages/public/NotFound.tsx

### CONTENT-11 [P2|S|owner=False] Demo pages (fictional businesses and testimonials) and utility pages are indexable
Evidence: docs/platform/TEMPLATE-BRIEFS-2026-10.md §0.7: 'Nama orang di testimoni fiktif'. Demo companies are fictional (e.g. 'Lintang Padel & Tenis Club (fiktif), Cilandak, Jakarta Selatan'). /demo/:slug, /pesan/:slug, /masuk, /daftar and /situs/:siteId have no noindex, and robots.txt only disallows /admin, /login, /auth and /api.php. AI engines could quote fictional testimonials or businesses as real, and the demos duplicate template content.
Rec: Add <meta name=robots content='noindex,follow'> (pre-rendered and runtime) on /demo/*, /pesan/*, /masuk, /daftar, /akun/*, /situs/*. Optionally add a visible 'Konten demo (fiktif)' label in the demo bar. Make /template/<slug> the canonical target for 'contoh website <niche>' queries, with screenshots and a 'Lihat Demo' link. Don't block /demo in robots.txt (noindex must be crawlable).
Files: src/pages/public/TemplateDemo.tsx, src/pages/public/OrderTemplate.tsx, src/pages/public/CustomerLogin.tsx, src/pages/public/CustomerRegister.tsx, src/pages/public/SitePreview.tsx, public/robots.txt

### CONTENT-12 [P2|S|owner=False] Keyword targeting: 'template website' is mostly free/HTML intent; buying intent sits in company-profile, pricing and niche queries
Evidence: Google autocomplete (hl=id, gl=id, observed 2026-10-23): 'template website' gives free, portofolio gratis, html gratis, bootstrap. 'beli template website' gives wordpress, undangan, tempat beli. 'website siap pakai' gives 'template website siap pakai'. 'jasa pembuatan website' gives murah, profesional, sekolah, terdekat, toko online, company profile. 'harga pembuatan website' gives company profile, sekolah, toko online, desa, perusahaan. 'jasa pembuatan aplikasi' gives android, android dan ios, kasir, mobile. Niche: 'contoh website klinik kecantikan', 'website booking lapangan padel'. Competitor: Hostinger ID ranks template category pages selling builder plans with domain+hosting from Rp24.900/month (https://www.hostinger.com/id/templates/website/company-and-agency).
Rec: Use the keyword map in data §2. Give each cluster one page (no cannibalization). Position against DIY builders: 'dibuatkan & di-setup, bukan rakit sendiri; bayar sekali untuk tahun pertama; dukungan WhatsApp; bisa upgrade ke custom'. Check volumes in Google Keyword Planner and Search Console before scaling content (volumes were not available here).
Files: src/components/sections/templates/catalog.ts, database/seed.templates.sql

### CONTENT-13 [P2|S|owner=True] Rule against showing custom-service prices leaves AI answers on 'berapa biaya' to competitors
Evidence: design.md: 'Jangan menampilkan harga atau paket untuk jasa custom (biaya disampaikan lewat penawaran)'. The 2026-10-19 migration strips any FAQ with harga/biaya/paket. Answer engines answering 'berapa biaya jasa pembuatan website company profile' quote pages with concrete ranges, e.g. next-it.co.id's 2026 guide (Rp8–25 jt for a 5–10 page company profile, https://next-it.co.id/blog/berapa-biaya-buat-website-profesional-di-2026-panduan-lengkap-untuk-pemilik-bisnis).
Rec: Default (keeps the owner rule): /harga shows exact template prices, year-2 renewal costs (strongly recommended to publish an amount or range instead of 'diinformasikan sebelum jatuh tempo'), and a 'faktor biaya custom' explainer without numbers. Owner decision: optionally publish 'mulai dari Rp…' for custom website and app projects. This is the biggest lever for appearing in cost answers.
Files: design.md, src/components/sections/FAQ.tsx

### CONTENT-14 [P2|S|owner=True] www host serves a duplicate site with no canonical tag; extra main host configured
Evidence: curl https://www.garudanexa.com/ gives 200 (no redirect). There is no rel=canonical anywhere. src/templates/siteHosts.ts DEFAULT_MAIN_HOSTS also lists garudanexabahtera.web.id (did not resolve during the test). http correctly redirects 301 to https.
Rec: 301 redirect www → apex (Cloudflare redirect rule or .htaccess). Add a self-referencing absolute canonical on every pre-rendered page. If garudanexabahtera.web.id goes live, 301 it to garudanexa.com.
Files: deploy/cpanel/htaccess, src/templates/siteHosts.ts, index.html

### CONTENT-15 [P3|S|owner=False] Image SEO: empty alt texts, live previews still SVG mockups, no OG images
Evidence: On the live homepage 5 of 6 <img> have alt="" and the live preview_image paths are /assets/templates/*-preview.svg. Real 1600x1000 WebP screenshots exist in public/assets/templates/ (new ones untracked in git, not deployed yet).
Rec: After the templates ship, use the WebP screenshots everywhere (migration 007/008 on production). Give the primary image of each card and gallery a descriptive Indonesian alt, e.g. 'Tampilan beranda template website klinik kecantikan Aura Studio di desktop' (keep true duplicates decorative). Create 1200x630 OG images per template and category.
Files: src/components/sections/templates/TemplateShot.tsx, src/pages/public/template/TemplateGallery.tsx, database/migrations/2026-10-22_007_template_previews.sql

### CONTENT-16 [P3|S|owner=False] Weak freshness and authorship signals
Evidence: sitemap lastmod is hand-written. Prices and template pages show no 'per tanggal' date. There is no blog or author entity. Only the legal pages show 'Terakhir diperbarui' (LEGAL_UPDATED_AT in src/lib/legal.ts).
Rec: Show 'Harga berlaku per {tanggal}' on /harga and template pages. Articles get a named author (real person, role, bio, LinkedIn), 'Diperbarui {tanggal}', sources and dateModified in JSON-LD. Generate sitemap lastmod from data. Review /harga and the cost articles each quarter and update '2026' in titles every year.
Files: public/sitemap.xml, src/lib/legal.ts

### CONTENT-17 [P3|S|owner=False] Brand and product names collide with existing 'Nexa' and 'Finova' brands
Evidence: Searching 'Garuda Nexa template website' returned only unrelated Nexa templates on Webflow and Framer. The brief itself notes Finova resembles a foreign brand (TEMPLATE-BRIEFS-2026-10.md §0.2).
Rec: Always pair template names with the niche in title and H1 ('Finova: Template Website Fintech & Koperasi'). Use the full entity 'Garuda Nexa (PT Garuda Nexa Bahtera)' on /tentang, the footer and JSON-LD legalName/alternateName. Keep the brand name identical across the site, Google Business Profile and socials.
Files: src/pages/public/TemplateDetail.tsx, src/components/layout/Footer.tsx


## Data
## 1. What crawlers see today (checked 2026-10-23)

| Check | Result |
|---|---|
| Raw HTML of `/` and every route | Same shell: static title (83 chars) and description (186 chars), empty `#root`. No canonical, og:image or JSON-LD. |
| Rendered `/` | H1 "Website profesional, siap online tanpa ribet."; 2 templates live (Corporate Nexa Rp1.500.000, Startup Clean Rp990.000); 9 FAQs; Projects hidden |
| Rendered `/template/corporate-nexa` | ~265 words; title is unique, but meta description and OG are the homepage's |
| `sitemap.xml` (live) | 5 URLs, no `/template/*` |
| `robots.txt` | Allows all; disallows /admin /login /auth /api.php; no rules per AI crawler |
| `www.garudanexa.com` | 200, not redirected |
| `/llms.txt`, unknown URL | 200 text/html (SPA fallback) |
| 2026-10-22 19:47 UTC | 403 on every path (LiteSpeed page), from two networks; back to 200 minutes later |
| Public settings API | `disabled_sections=["pricing","projects"]`, socials "#", `contact_whatsapp=628123456789` (placeholder), `footer_address` = tagline |

## 2. Keyword map (Indonesian; validate volumes in Keyword Planner and Search Console)

Evidence: Google autocomplete hl=id, gl=id, observed 2026-10-23.

| Cluster | Main keyword | Supporting keywords | Intent | Page |
|---|---|---|---|---|
| Brand | garuda nexa | garudanexa, PT Garuda Nexa Bahtera | navigational | `/`, `/tentang` |
| Template purchase | template website siap pakai | website siap pakai, beli template website, jual template website + domain hosting | transactional | `/template` |
| Company profile | template website company profile | website company profile siap pakai, website company profile perusahaan/UMKM | transactional | `/template/kategori/company-profile` |
| Beauty niche | website klinik kecantikan | contoh website klinik kecantikan, website salon, website spa/barbershop | commercial | `/template/kategori/kecantikan-klinik` → `/template/aura-studio` |
| Sports niche | website klub olahraga | website lapangan padel, website booking lapangan padel*, website futsal/gym | commercial | `/template/kategori/olahraga-komunitas` → `/template/arena-club` |
| Fintech niche | website koperasi | template landing page fintech, website koperasi simpan pinjam, landing page SaaS | commercial | `/template/kategori/fintech-startup` → `/template/finova` |
| Custom website | jasa pembuatan website | jasa pembuatan website company profile, profesional, sekolah, instansi/desa, terpercaya | transactional | `/jasa-pembuatan-website` |
| Custom app | jasa pembuatan aplikasi android | jasa pembuatan aplikasi android dan ios, aplikasi mobile, aplikasi kasir, aplikasi absensi | transactional | `/jasa-pembuatan-aplikasi-mobile` |
| Price | harga pembuatan website company profile | biaya membuat website perusahaan, harga jasa pembuatan website, biaya perpanjangan domain hosting | commercial/informational | `/harga` + guide articles |
| Informational | (see §4.10) | template vs custom, domain/hosting, checklist, how long | informational | `/panduan/*` |

\* Arena Club takes court bookings via WhatsApp, not through a booking system. Say exactly that, and point real booking-system requests to the custom service.

Avoid "template website" alone as the main keyword: autocomplete shows free/HTML/bootstrap intent.

**Cannibalization rules:**
- The homepage targets the brand plus the broad "template website siap pakai & jasa website".
- Each other keyword has exactly one owner page from the table.

**City pages:** don't build them now. Google treats thin city variants as doorway pages (https://developers.google.com/search/docs/essentials/spam-policies). Autocomplete shows "...medan/bandung" demand. Add a single city page only where there is a real office or real local clients with case studies. Otherwise state "Melayani seluruh Indonesia secara online" on /jasa-* and /kontak, and use Google Business Profile for the office city.

## 3. Proposed page structure (sitemap)

```
/                                   home (brand + both paths)
/template                           catalog (CollectionPage)
/template/kategori/company-profile
/template/kategori/kecantikan-klinik
/template/kategori/olahraga-komunitas
/template/kategori/fintech-startup  (index a category only if ≥2 templates OR ≥300 words of unique niche guidance + FAQ; else noindex,follow)
/template/<slug>                    corporate-nexa, startup-clean, arena-club, aura-studio, finova (Product)
/jasa-pembuatan-website             Service
/jasa-pembuatan-aplikasi-mobile     Service
/harga                              pricing + comparison
/portofolio                         real case studies only (nav label stays "Projects" per owner)
/portofolio/<slug>                  optional, one per real case
/tentang                            AboutPage + facts block
/kontak                             ContactPage + NAP
/panduan                            guide hub
/panduan/<artikel>                  12 articles (§4.10)
/pesan-custom                       form (indexable, linked from /jasa-*)
/syarat-ketentuan, /kebijakan-privasi, /kebijakan-pengembalian-dana
noindex,follow: /demo/*, /pesan/*, /masuk, /daftar, /akun/*, /situs/*
also: /llms.txt, /llms-full.txt, sitemap generated at build
```

**Navbar:** Template · Jasa ▾ (Website custom, Aplikasi mobile) · Harga · Projects (→/portofolio) · Panduan · [Konsultasi Gratis]

**Footer:**
- Template categories
- Jasa
- Perusahaan (Tentang, Projects, Panduan, Kontak)
- Legal
- Facts line: legal name, address, WhatsApp, email

**Breadcrumbs on all pages.** Every page links to /harga and to the opposite path (template ↔ custom).

**Rollout:**
- **P0:** pre-rendering plus per-route meta; sitemap; noindex on utility pages; fix the FAQ facts.
- **P1:** /template, enriched /template/<slug>, /jasa-*, /harga, /tentang, /kontak, JSON-LD, llms.txt.
- **P2:** /portofolio (when real content exists), first 4 guides, Google Business Profile, Bing.
- **P3:** remaining guides, category pages as templates grow, monthly AI-visibility checks.

## 4. Page specs

Character counts were verified: titles ≤60, meta descriptions ≤155. Copy addresses the reader as "Anda". Action labels follow the design.md glossary (Pilih Template, Lihat Demo, Pesan Template, Pesan Custom, Konsultasi Gratis). Generate prices from the database at build time, never hard-code them.

### 4.1 `/` Beranda
- **Keyword:** template website siap pakai + jasa pembuatan website (brand)
- **Title (56):** Template Website Siap Pakai & Jasa Website | Garuda Nexa
- **Meta (148):** Beli template website company profile siap pakai, sudah termasuk domain, hosting & SSL tahun pertama. Juga jasa pembuatan website & aplikasi custom.
- **H1:**
  - Template mode: "Template website siap pakai, termasuk domain & hosting."
  - Custom mode: "Jasa pembuatan website & aplikasi mobile custom."
  - Pre-rendered HTML uses template mode.
- **Intro (new, crawlable):** "Garuda Nexa (PT Garuda Nexa Bahtera) menyediakan template website untuk company profile, klinik kecantikan, klub olahraga, dan fintech, mulai Rp990 ribu sudah termasuk domain, hosting, dan SSL tahun pertama. Butuh fitur khusus? Kami juga membuat website dan aplikasi Android/iOS custom."
- **Outline:**
  1. Hero
  2. "Sudah termasuk" strip (setup, domain, hosting, SSL tahun pertama, CMS)
  3. Kategori template (4 tiles → category pages)
  4. Pilih Template (cards → /template/<slug>; "Lihat Semua Template" → /template)
  5. Template vs custom table (§5.4)
  6. Projects (real only)
  7. Testimonials (real only)
  8. Proses
  9. FAQ (8, consistent with §5.3)
  10. 3 latest guides
  11. CTA "Konsultasi gratis untuk website atau aplikasi Anda"
  12. Footer with facts line
- **Schema:** Organization, WebSite, WebPage, ItemList (templates)

### 4.2 `/template` catalog
- **Keyword:** template website siap pakai / beli template website
- **Title (60):** Template Website Siap Pakai + Domain & Hosting | Garuda Nexa
- **Meta (148):** Katalog template website siap pakai untuk company profile, klinik, klub olahraga & fintech. Harga jelas, lihat demo, bayar online, kelola lewat CMS.
- **H1:** Template website siap pakai
- **Outline:**
  - Intro (80–120 words: what you buy, who sets it up, how long, how you edit it)
  - Category chips as real links
  - Search and sort
  - Cards with price
  - "Sudah termasuk" box + year-2 costs
  - Short comparison with DIY website builders (no competitor names)
  - FAQ (5)
  - Links to /harga, /jasa-pembuatan-website, /panduan/template-vs-custom
- **Schema:** CollectionPage, ItemList, BreadcrumbList

### 4.3 `/template/<slug>` (pattern + examples)
- **Title pattern:** `{Nama}: Template Website {Niche} | Garuda Nexa`
  - Corporate Nexa: Template Company Profile | Garuda Nexa (54)
  - Startup Clean: Template Company Profile UMKM | Garuda Nexa (58)
  - Arena Club: Template Website Klub Olahraga | Garuda Nexa (56)
  - Aura Studio: Template Website Klinik & Salon | Garuda Nexa (58)
  - Finova: Template Website Fintech & Koperasi | Garuda Nexa (57)
- **Meta example (Aura, 146):** Template website klinik kecantikan, salon & spa. Rp1.390.000 sudah termasuk domain, hosting & SSL tahun pertama. Kelola isi lewat CMS. Lihat demo.
- **H1:** "Aura Studio: Template Website Klinik Kecantikan & Salon"
- **Outline (600–900 unique words):**
  - Lead (who it's for + price + what's included)
  - Gallery (desktop + HP, descriptive alt)
  - Price box + "Harga per {tanggal}" + refund guarantee line + "Pembayaran aman via Midtrans"
  - H2 Cocok untuk
  - H2 Halaman & bagian yang Anda dapatkan (one line per CMS section)
  - H2 Yang bisa Anda ubah sendiri lewat CMS
  - H2 Sudah termasuk & biaya tahun berikutnya
  - H2 Cara memesan & kapan website aktif
  - H2 Contoh website {niche} dengan {Nama} (screenshots + Lihat Demo)
  - H2 Butuh fitur lain? (→ /jasa-pembuatan-website)
  - H2 Pertanyaan tentang {Nama} (4–6)
  - Template lainnya + category link + 1 guide link
- **FAQ examples:**
  - Aura: Apakah daftar harga perawatan bisa saya ubah sendiri? / Bisakah pelanggan reservasi online? (Ya, lewat tombol WhatsApp) / Bisakah menampilkan foto sebelum-sesudah? (owner confirm; avoid medical claims)
  - Arena: Apakah ada sistem booking lapangan otomatis? (Tidak; pesan via WhatsApp, sistem booking bisa dibuat custom) / Bisakah paket membership diubah?
  - Finova: Apakah cocok untuk koperasi? / Bisa menambahkan tautan Play Store/App Store? (no OJK/regulator claims)
- **Schema:** Product (name, description, image[], brand Garuda Nexa, category, sku=slug, offers {Offer, price, priceCurrency IDR, availability InStock, url, seller @id org, hasMerchantReturnPolicy → refund page}), BreadcrumbList. No aggregateRating until real buyer reviews exist.

### 4.4 `/template/kategori/<kategori>`

| Slug | Title | Meta | H1 |
|---|---|---|---|
| company-profile | Template Website Company Profile Siap Pakai \| Garuda Nexa (57) | Template website company profile untuk perusahaan, UMKM & startup. Mulai Rp990 rb, termasuk domain, hosting & SSL tahun pertama. Lihat demonya. (143) | Template website company profile |
| kecantikan-klinik | Template Website Klinik Kecantikan & Salon \| Garuda Nexa (56) | Contoh website klinik kecantikan, salon, spa & barbershop yang siap dipakai: daftar perawatan, harga, galeri, reservasi WhatsApp. Lihat demonya. (144) | Template website klinik kecantikan & salon |
| olahraga-komunitas | Template Website Klub Olahraga, Padel & Futsal \| Garuda Nexa (60) | Website klub olahraga siap pakai untuk padel, tenis, futsal, badminton & gym: paket membership, pelatih, jadwal, pesan lapangan via WhatsApp. (141) | Template website klub olahraga |
| fintech-startup | Template Website Fintech, Koperasi & Startup \| Garuda Nexa (58) | Template landing page untuk fintech, koperasi, aplikasi pembayaran & SaaS. Tampilan modern, FAQ, testimoni, tautan unduh aplikasi. Lihat demonya. (145) | Template website fintech & koperasi |

- **Outline:**
  - Intro
  - Template cards
  - "Apa yang perlu ada di website {niche}" (unique 300+ words, checklist)
  - FAQ (3–5)
  - Link to the niche guide article and to /jasa-pembuatan-website
- **Schema:** CollectionPage, ItemList, BreadcrumbList

### 4.5 `/jasa-pembuatan-website`
- **Keyword:** jasa pembuatan website (company profile)
- **Title (52):** Jasa Pembuatan Website Company Profile | Garuda Nexa
- **Meta (148):** Jasa pembuatan website custom untuk perusahaan, sekolah, instansi & UMKM. Konsultasi gratis, penawaran jelas sebelum mulai, didampingi sampai rilis.
- **H1:** "Jasa pembuatan website custom untuk bisnis & instansi"
- **Outline:**
  - Lead
  - H2 Jenis website yang kami buat: only real offerings, e.g. company profile custom, website sekolah/pesantren, website instansi/desa, landing page produk, sistem/web app (products_data mentions "Website sekolah/instansi, Landing Page Produk, Website Custom System")
  - H2 Kapan memilih custom vs template (→ /template)
  - H2 Proses: Konsultasi → Penawaran → Pengerjaan → Rilis (matches the Process section)
  - H2 Yang Anda terima: owner to define handover, access, CMS training, warranty or bug-fix period, domain in the client's name
  - H2 Faktor yang menentukan biaya (no numbers unless owner decides, CONTENT-13)
  - H2 Projects (real)
  - H2 FAQ
  - CTA: Pesan Custom + Konsultasi Gratis
- **FAQ:**
  - Berapa biaya jasa pembuatan website custom?
  - Berapa lama pengerjaannya?
  - Apa yang perlu saya siapkan?
  - Berapa kali revisi? (owner)
  - Apakah domain & hosting atas nama saya?
  - Apakah ada perawatan setelah rilis?
  - Bisakah dibuat toko online?
- **Schema:** Service (serviceType "Jasa pembuatan website", provider @id org, areaServed Country ID), BreadcrumbList

### 4.6 `/jasa-pembuatan-aplikasi-mobile`
- **Keyword:** jasa pembuatan aplikasi android (dan ios)
- **Title (51):** Jasa Pembuatan Aplikasi Android & iOS | Garuda Nexa
- **Meta (146):** Jasa pembuatan aplikasi mobile Android & iOS sesuai alur bisnis Anda: kasir, absensi, manajemen sekolah & lainnya. Konsultasi gratis via WhatsApp.
- **H1:** "Jasa pembuatan aplikasi Android & iOS custom"
- **Outline:**
  - Lead
  - H2 Aplikasi yang bisa kami buat (POS/kasir, absensi, i-School, i-Santri: link real products)
  - H2 Satu aplikasi untuk Android & iOS (one codebase, if that is the actual stack)
  - H2 Proses sampai rilis di Play Store & App Store (developer accounts in the client's name)
  - H2 Faktor biaya
  - H2 Portfolio
  - H2 FAQ
  - CTA
- **FAQ:**
  - Bisa Android dan iOS sekaligus?
  - Siapa pemilik source code dan akun store? (owner)
  - Berapa lama?
  - Apakah termasuk server/backend?
  - Ada maintenance?
- **Schema:** Service, BreadcrumbList

### 4.7 `/harga`
- **Keyword:** harga pembuatan website company profile
- **Title (52):** Harga Website 2026: Template vs Custom | Garuda Nexa
- **Meta (147):** Harga template website Garuda Nexa mulai Rp990 rb termasuk domain, hosting & SSL tahun pertama. Bandingkan dengan website custom & biaya per tahun.
- **H1:** "Harga template website & jasa pembuatan website"
- **Outline:**
  - "Harga berlaku per {tanggal}"
  - Table: every template (name, niche, price, link)
  - Sudah termasuk
  - Biaya tahun ke-2 (publish an amount or range)
  - Custom: "berdasarkan penawaran" + cost factors (or "mulai dari", if the owner decides)
  - Comparison table (§5.4)
  - Refund guarantee
  - Payment methods via Midtrans
  - FAQ
- **Schema:** WebPage + ItemList/OfferCatalog (Offer per template), BreadcrumbList

### 4.8 `/portofolio`, `/tentang`, `/kontak`, `/panduan`

| Page | Title | Meta | H1 | Content | Schema |
|---|---|---|---|---|---|
| /portofolio | Portofolio Website & Aplikasi \| Garuda Nexa (43) | Contoh website dan aplikasi yang kami buat untuk sekolah, pesantren, UMKM & instansi, termasuk i-School dan i-Santri. Lihat hasil & cakupannya. (143) | Projects / Portofolio kami | Per case: client (with permission), sector, city, problem, solution, features, screenshots, link, testimonial. No invented metrics. | CollectionPage (+ CreativeWork per case) |
| /tentang | Tentang PT Garuda Nexa Bahtera \| Garuda Nexa (44) | PT Garuda Nexa Bahtera: template website siap pakai serta jasa pembuatan website & aplikasi mobile custom di Indonesia. Kenali tim dan cara kerja kami. (151) | Tentang Garuda Nexa | Facts block (§5.1), story, team (names/roles/photos), how we work, guarantees, legal links, own products | AboutPage + Organization |
| /kontak | Kontak Garuda Nexa: WhatsApp, Email & Alamat (44) | Hubungi Garuda Nexa lewat WhatsApp 0851-8800-9152 atau info@garudanexa.com untuk tanya template, konsultasi website & aplikasi custom gratis. (141) | Hubungi Garuda Nexa | WhatsApp, phone, email, address + map, hours, response time, links to /pesan-custom and /template | ContactPage + Organization.contactPoint |
| /panduan | Panduan Membuat Website untuk Bisnis \| Garuda Nexa (50) | Panduan praktis membuat website bisnis: biaya, domain & hosting, template vs custom, checklist konten, dan tips agar website ditemukan di Google. (145) | Panduan website untuk bisnis | Article list by topic | CollectionPage |

`/pesan-custom` keeps "Pesan Website / Aplikasi Mobile Custom | Garuda Nexa" (52). Meta (144): "Ceritakan kebutuhan website atau aplikasi Android/iOS Anda. Konsultasi gratis, lalu kami kirim penawaran harga dan jadwal sesuai cakupan proyek."

### 4.9 Internal linking rules
- Template page → its category, /harga, 1 guide, /jasa-pembuatan-website.
- Category → its templates + niche guide.
- Guide → 1 category or template + /harga + /jasa-* (contextual anchors such as "template website klinik kecantikan", not "klik di sini").
- /jasa-* → /portofolio, /pesan-custom, /harga.
- Footer → all hubs.

### 4.10 Guides (/panduan): 12 topics

Each guide: named author (real person, role, LinkedIn), "Diperbarui {tanggal}", sources, answer-first intro (2–3 sentences), table or checklist, FAQ, CTA.

| # | Title (≤60) | Main keyword | Links to |
|---|---|---|---|
| 1 | Berapa Biaya Membuat Website Company Profile di 2026? | harga pembuatan website company profile | /harga, company-profile category |
| 2 | Template vs Jasa Website Custom: Mana yang Tepat? | template atau jasa pembuatan website | /template, /jasa-pembuatan-website |
| 3 | Cara Kerja Domain, Hosting & SSL untuk Pemula | perbedaan domain dan hosting | /harga |
| 4 | Checklist Konten Website Company Profile (Siap Isi) | isi website company profile | Corporate Nexa, Startup Clean |
| 5 | Berapa Lama Membuat Website? Template vs Custom | berapa lama membuat website | /template, /pesan-custom |
| 6 | Biaya Pembuatan Aplikasi Android & iOS: Faktor Penentunya | biaya pembuatan aplikasi android | /jasa-pembuatan-aplikasi-mobile |
| 7 | Cara Memilih Jasa Pembuatan Website yang Aman | jasa pembuatan website terpercaya | /tentang, refund policy |
| 8 | Website Klinik Kecantikan: Halaman Wajib & Contohnya | contoh website klinik kecantikan | Aura Studio |
| 9 | Website Klub Olahraga & Lapangan Padel: Yang Perlu Ada | website lapangan padel | Arena Club |
| 10 | Website vs Instagram & Google Maps untuk UMKM | apakah UMKM perlu website | Startup Clean |
| 11 | Perpanjangan Domain & Hosting: Biaya Tahun ke-2 dst. | biaya perpanjangan domain dan hosting | /harga |
| 12 | Agar Website Bisnis Muncul di Google & Jawaban AI | cara agar website muncul di google | /template (no ranking promises) |

Notes:
- #1 and #6 must follow the custom-price rule (CONTENT-13). Cite third-party ranges with links, or explain factors only.
- #3 should explain .com, .id and .co.id; check the .co.id document requirements with PANDI.
- #7 checklist: registered legal entity, written terms, domain in your name, refund policy, official payment gateway.

## 5. AI-search readiness

### 5.1 Company facts block (shown on /tentang and /kontak, condensed in the footer, also in llms.txt and JSON-LD; single source)

**Fakta Garuda Nexa** (diperbarui {tanggal})

| Fakta | Isi |
|---|---|
| Nama | Garuda Nexa; badan hukum PT Garuda Nexa Bahtera |
| Situs | https://garudanexa.com |
| Alamat | [PEMILIK ISI: jalan, kota, kode pos] (sama persis dengan Google Business Profile) |
| NIB / PSE | [PEMILIK ISI bila ada] |
| Kontak | WhatsApp/telepon 0851-8800-9152 (+62 851-8800-9152), email info@garudanexa.com, jam layanan [ISI] |
| Layanan | (1) template website siap pakai: pilih, lihat demo, pesan & bayar online via Midtrans, kelola isi lewat CMS; (2) jasa pembuatan website custom; (3) jasa pembuatan aplikasi mobile Android & iOS custom |
| Harga template | Rp990.000–Rp1.790.000 per {tanggal}; termasuk template + setup awal, domain, hosting, SSL tahun pertama |
| Tahun ke-2 | perpanjangan domain & hosting per tahun [ISI nominal/kisaran] |
| Custom | biaya lewat penawaran setelah konsultasi gratis |
| Waktu aktif template | [ISI X–Y hari kerja] setelah pembayaran dikonfirmasi & domain diproses |
| Jaminan | pesanan lunas yang ditolak (mis. domain tidak tersedia) → dana kembali penuh paling lambat 7 hari kerja; pesanan belum dibayar bisa dibatalkan tanpa biaya |
| Kepemilikan | konten & data milik pembeli |
| Area | seluruh Indonesia (online) |
| Produk sendiri | i-School, i-Santri, … [konfirmasi] |

### 5.2 llms.txt outline (generated at build, text/plain)

```
# Garuda Nexa
> Garuda Nexa (PT Garuda Nexa Bahtera, Indonesia) menjual template website siap pakai yang sudah termasuk domain, hosting, dan SSL tahun pertama, serta menerima jasa pembuatan website dan aplikasi mobile Android/iOS custom.

- Harga template: Rp990.000–Rp1.790.000 (per {tanggal}); tahun ke-2: {…}
- Bayar online via Midtrans; isi website dikelola sendiri lewat CMS
- Jaminan: pesanan lunas yang ditolak → dana kembali penuh ≤ 7 hari kerja
- Kontak: WhatsApp +62 851-8800-9152, info@garudanexa.com

## Template website
- [Katalog template](https://garudanexa.com/template): semua template, harga, kategori
- [Corporate Nexa](https://garudanexa.com/template/corporate-nexa): company profile korporat, Rp1.500.000
- [Startup Clean](…/startup-clean): company profile UMKM/startup, Rp990.000
- [Arena Club](…/arena-club): klub olahraga/padel/futsal, Rp1.290.000
- [Aura Studio](…/aura-studio): klinik kecantikan/salon/spa, Rp1.390.000
- [Finova](…/finova): fintech/koperasi/SaaS, Rp1.790.000
## Jasa custom
- [Jasa pembuatan website](…/jasa-pembuatan-website)
- [Jasa pembuatan aplikasi mobile](…/jasa-pembuatan-aplikasi-mobile)
- [Pesan custom](…/pesan-custom): formulir kebutuhan, konsultasi gratis
## Harga & kebijakan
- [Harga](…/harga) · [Syarat & Ketentuan](…/syarat-ketentuan) · [Kebijakan Pengembalian Dana](…/kebijakan-pengembalian-dana) · [Kebijakan Privasi](…/kebijakan-privasi)
## Panduan
- (12 articles with one-line summaries)
## Optional
- [Tentang](…/tentang) · [Kontak](…/kontak) · [Projects](…/portofolio)
```

**llms-full.txt:** facts block, then per template (name, niche, price, what's included, full description, features, CMS-editable items, demo URL), then service pages (scope, process, cost factors), then the consolidated FAQ, then policy summaries, then guide summaries. Each block gets "Diperbarui {tanggal}".

### 5.3 FAQ style and question bank
**Style:** first sentence answers the question; 40–60 words; concrete numbers and conditions; same wording on every page where it appears; consistent with facts §5.1.

**Bank:**
- Berapa harga template website di Garuda Nexa?
- Apa saja yang sudah termasuk?
- Berapa biaya perpanjangan tahun ke-2?
- Berapa lama website aktif setelah bayar?
- Bisakah memakai domain yang sudah saya punya? (owner)
- Bisa domain .id / .co.id? (owner)
- Apakah saya bisa mengubah isi sendiri?
- Bagaimana jika domain tidak tersedia?
- Metode pembayaran apa saja?
- Apakah website tampil baik di HP?
- Bisakah upgrade dari template ke custom?
- Siapa pemilik website & kontennya?
- Berapa biaya jasa website/aplikasi custom?
- Apakah Garuda Nexa perusahaan resmi? (legal entity + NIB)

Rewrite live FAQ #07 and #08 (CONTENT-07).

### 5.4 Comparison table (homepage short version, full version on /harga)

| | Template siap pakai | Website custom | Aplikasi mobile custom |
|---|---|---|---|
| Harga | Tertera, Rp990 rb–Rp1,79 jt (per {tanggal}) | Lewat penawaran | Lewat penawaran |
| Sudah termasuk | Setup, domain, hosting, SSL tahun pertama | Dibahas saat konsultasi | Dibahas saat konsultasi |
| Waktu online | {X–Y} hari kerja | Sesuai jadwal di penawaran | Sesuai jadwal di penawaran |
| Desain | Pilih dari katalog, ubah teks/foto/warna di CMS | Dirancang dari nol | Dirancang dari nol |
| Cocok untuk | UMKM, klinik, klub, startup yang ingin cepat online | Alur/fitur khusus, instansi | Android & iOS, kasir, absensi, dll. |
| Mulai | Pesan Template | Pesan Custom | Pesan Custom |

A second table on /harga compares DIY website builders, freelancers, agencies and a Garuda Nexa template on setup effort, cost model (monthly vs yearly), who builds it and support. Keep it generic and factual; no competitor names.

### 5.5 Trust, expertise and freshness signals
- Legal entity, address and NIB in the footer.
- Named team on /tentang.
- Article bylines with bios.
- Real case studies and testimonials (with consent).
- Google Business Profile with genuine reviews (don't mark up your own reviews as stars).
- Midtrans payment, if logo use is permitted.
- Refund guarantee next to the price.
- "Harga per {tanggal}" and "Diperbarui {tanggal}"; dateModified in JSON-LD; sitemap lastmod from data.
- Same name, address and phone everywhere: site, GBP, socials, directories.
- Fix the placeholder contact_whatsapp.

### 5.6 OG images
- 1200x630 per template (from the WebP screenshot plus name and price), per category, per service page and per article.
- Sitewide fallback: a branded card.
- og:url = canonical; og:locale id_ID; twitter:card summary_large_image.
- Keep files small for WhatsApp link previews.

## 6. JSON-LD sketch

```json
{"@context":"https://schema.org","@graph":[
 {"@type":"Organization","@id":"https://garudanexa.com/#organization","name":"Garuda Nexa","legalName":"PT Garuda Nexa Bahtera","url":"https://garudanexa.com/","logo":"https://garudanexa.com/brand/logo-mark.svg (prefer PNG ≥112px)","email":"info@garudanexa.com","telephone":"+6285188009152","address":{"@type":"PostalAddress","streetAddress":"[ISI]","addressLocality":"[ISI]","postalCode":"[ISI]","addressCountry":"ID"},"sameAs":["[real profiles only]"],"contactPoint":{"@type":"ContactPoint","contactType":"customer service","telephone":"+6285188009152","areaServed":"ID","availableLanguage":"id"}},
 {"@type":"WebSite","@id":"https://garudanexa.com/#website","url":"https://garudanexa.com/","name":"Garuda Nexa","inLanguage":"id-ID","publisher":{"@id":"https://garudanexa.com/#organization"}}]}
```

```json
{"@context":"https://schema.org","@type":"Product","name":"Aura Studio – Template Website Klinik Kecantikan","sku":"aura-studio","category":"Template website","brand":{"@type":"Brand","name":"Garuda Nexa"},"image":["https://garudanexa.com/assets/templates/aura-studio-preview.webp"],"description":"…(same as visible)…","offers":{"@type":"Offer","price":"1390000","priceCurrency":"IDR","availability":"https://schema.org/InStock","url":"https://garudanexa.com/template/aura-studio","seller":{"@id":"https://garudanexa.com/#organization"}}}
```

Use Service for /jasa-* (no price), Article for guides (author Person, datePublished, dateModified), and BreadcrumbList everywhere. FAQPage is optional: Google no longer shows FAQ rich results (2026).

## 7. Copy audit: thin, duplicate or missing
- **Duplicate:** one meta description and og:title on every route; same 3-step order flow on every template page (fine, but it is not unique content).
- **Thin:** template pages ~265 words; homepage has no intro paragraph; no service, pricing or about pages.
- **Inconsistent:** FAQ #07 (hosting) vs the price box; FAQ #08 SSL scope; "beberapa hari kerja"; placeholder contact_whatsapp; tagline in footer_address; socials "#".
- **Missing trust:** portfolio hidden or empty, no testimonials, no address or NIB, no team, legal texts still marked as drafts in source.
- **Risky:** indexable demos with fictional testimonials; CTA H2 "Siap Membangun Sistem Digital?" is generic and title-case (design.md uses sentence case).
- **Good, keep:** clear price box with "Sudah termasuk"; honest year-2 note; refund policy with a 7-working-day full refund; Indonesian-only site with lang="id"; legal pages linked in the footer.

## 8. Measurement
- Google Search Console (domain property): AI Overviews and AI Mode traffic is counted under the "Web" search type.
- Bing Webmaster Tools (import from GSC) and IndexNow.
- Track AI referrers in analytics or logs: chatgpt.com (utm_source=chatgpt.com), perplexity.ai, gemini.google.com, copilot.microsoft.com.
- Monthly manual check of 10 prompts in ChatGPT search, Perplexity, Gemini and Copilot. Record whether garudanexa.com is cited. Examples: "beli template website company profile siap pakai termasuk domain dan hosting", "template website klinik kecantikan Indonesia", "jasa pembuatan aplikasi android dan ios Indonesia", "harga pembuatan website company profile 2026".

## 9. Sources
- https://developers.google.com/search/docs/appearance/ai-features
- https://developers.google.com/search/docs/appearance/structured-data/faqpage
- https://developers.google.com/search/docs/appearance/structured-data/review-snippet
- https://developers.google.com/search/docs/essentials/spam-policies
- https://llmstxt.org/
- https://developers.openai.com/api/docs/bots
- https://docs.perplexity.ai/guides/bots
- https://vercel.com/blog/the-rise-of-the-ai-crawler
- https://www.technologyreview.com/2025/07/01/1119498/cloudflare-will-now-by-default-block-ai-bots-from-crawling-its-clients-websites/
- https://next-it.co.id/blog/berapa-biaya-buat-website-profesional-di-2026-panduan-lengkap-untuk-pemilik-bisnis
- https://www.hostinger.com/id/templates/website/company-and-agency
- https://www.hukumonline.com/klinik/a/kewajiban-penyelenggara-sistem-elektronik-melakukan-pendaftaran-lt598832e6a5643/
- Google autocomplete (suggestqueries.google.com, hl=id, gl=id), observed 2026-10-23
- Live checks of https://garudanexa.com, 2026-10-22/23