# kw

Research snapshot taken 2026-10-23 from google.co.id (hl=id, gl=id, desktop; the browser's location showed as Lampung) and bing.com (cc=id). I stopped using Google after about 20 queries because Google started showing its rate-limit ("sorry") page; I did not try to get past it. No search-volume tool was available, so difficulty and demand are my qualitative estimates. The owner should check volumes in Google Keyword Planner and in GSC.

Main results:
(1) Bing has almost nothing from garudanexa.com in its index. It has only https://garudanexa.com/auth?type=login and https://garudanexa.com/cgi-bin/, both under an old English title, "Garuda Nexa Bahtera - Modern Digital Solutions". The homepage and template pages are not in Bing. That hurts visibility in Copilot and in ChatGPT search, which has historically relied on Bing.
(2) The brand search is contested. For the query "garuda nexa", garudanexa.id ("Garuda Nexa Indonesia — Direktori Universitas Indonesia") ranks #1. Google's AI Overview mixes PT Garuda Nexa Bahtera with that education brand. Google has also indexed both www and non-www and the /akun login page.
(3) The site is a client-side rendered SPA with one static title and description for every route, and the sitemap has only 5 URLs. No page exists that could rank for any industry or service keyword, and crawlers that do not run JavaScript (OAI-SearchBot, PerplexityBot and others) see only the shell.
(4) Opportunity: Google results for "template website <industri>" queries (klinik kecantikan, futsal, fintech) show only global marketplaces and design-inspiration sites (Wix, ThemeForest, Dribbble, Canva, Figma). No Indonesian done-for-you offer is visible. Garuda Nexa's bundle (fixed price, domain + hosting + SSL for year 1, CMS, Midtrans checkout, live demo) fits these queries well. These are the fastest realistic wins.
(5) The head terms ("jasa pembuatan website", "jasa pembuatan aplikasi android/mobile", city terms) are held by Fastwork, Sribu, hosting companies (Rumahweb, IDwebhost, Jagoan Hosting, Biznet Gio) and agencies with programmatic pages (Resolusiweb, Webnesia, Badoystudio, Solusitech). These are 12+ month targets. Marketplaces are a channel the owner can use in the meantime.
(6) AI Overviews appeared on most commercial queries. They quote providers that publish explicit Rp price tables (Fastwork, Resolusiweb, Solusitech, Sribu, Biznet Gio). People Also Ask questions are almost all about price.

Side effect of my testing: after about 40 curl requests that used AI-crawler user agents, the LiteSpeed origin started returning 403 to this machine's public IP, for both curl and the browser pane. www.garudanexa.com still returned 200. The block will probably expire. If the owner sees 403 from this network, this is the cause, and the IP can be whitelisted in cPanel (Imunify360/LiteSpeed). Because the block came from spoofed bot user agents on a non-verified IP, it does not prove that real OAI-SearchBot or PerplexityBot are blocked. The owner should check the WAF logs and settings anyway (KW-11).

Relevant files: E:/_____________/WEBSITE/GARUDANEXA/Garuda Nexa/index.html, public/sitemap.xml, public/robots.txt, src/App.tsx, database/seed.templates.sql (prices), src/components/sections/FAQ.tsx, src/pages/public/legal/SyaratKetentuan.tsx (renewal price not published).

## Findings
### KW-01 [P0|L|owner=False] Keyword content is invisible to non-JS crawlers: every route serves the same CSR shell and title
Evidence: index.html has <div id="root"> plus one static <title>/description, and there is no canonical or JSON-LD. Routes /, /template/:slug, /demo/:slug and /pesan-custom are all rendered client-side (src/App.tsx). curl of https://www.garudanexa.com/ returns only the shell title. Google: server-side or pre-rendering 'is still a great idea' and not all bots run JS (https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics). OpenAI and Perplexity search depend on their own crawlers, OAI-SearchBot and PerplexityBot (https://developers.openai.com/api/docs/bots, https://docs.perplexity.ai/guides/bots). The Bing index holds only /auth and /cgi-bin/ with an old title (see KW-02).
Rec: Prerequisite for every keyword target: prerender or SSG each public route at build time (home, a catalog hub, each /template/:slug, new landing and guide pages, /pesan-custom, legal pages). Each route needs a unique <title>, meta description, canonical, OG tags, H1, body copy and JSON-LD (Organization, Product/Offer per template with priceCurrency IDR, FAQPage, BreadcrumbList) present in the initial HTML. Generate the template pages from the DB catalog at deploy time (scripts/deploy-cpanel.mjs) so prices stay in sync.
Files: index.html, src/App.tsx, scripts/deploy-cpanel.mjs, src/pages/public/TemplateDetail.tsx, src/pages/public/Home.tsx

### KW-02 [P0|S|owner=True] Bing (Copilot, and historically ChatGPT search) has only stale junk URLs from garudanexa.com
Evidence: bing.com 'Garuda Nexa Bahtera' (cc=id) returns only https://garudanexa.com/auth?type=login and https://garudanexa.com/cgi-bin/, both titled 'Garuda Nexa Bahtera - Modern Digital Solutions' with an English snippet. 'site:garudanexa.com' and '"garudanexa.com"' return unrelated sites. ChatGPT search's reliance on Bing is widely reported but disputed (https://eseospace.com/blog/bing-webmaster-tools-indexnow-ai-search/). Bing Webmaster Tools has had an AI Performance report covering Copilot citations since Feb 2026 (https://searchengineland.com/bing-webmaster-tools-testing-new-ai-performance-report-468039).
Rec: Owner: verify garudanexa.com in Bing Webmaster Tools (import from GSC), submit the sitemap, enable IndexNow (Cloudflare Crawler Hints, or the api.indexnow.org key file per https://www.bing.com/indexnow/getstarted), use URL Inspection and request indexing for the home and template pages, block or remove /cgi-bin/ and /auth* with the Bing removal tools, then watch the AI Performance report monthly. Ping IndexNow on each deploy.
Files: public/sitemap.xml, public/robots.txt

### KW-03 [P1|M|owner=True] Brand SERP conflict: garudanexa.id (education) ranks #1 for 'garuda nexa' and AI Overview conflates the two
Evidence: google.co.id 'garuda nexa': #1 is garudanexa.id 'Garuda Nexa Indonesia — Direktori Universitas Indonesia'. The AI Overview says Garuda Nexa is run by 'PT Garuda Nexa Bahtera dan Garuda Nexa Indonesia ... solusi digital dan platform pendidikan'. Instagram @garudanexa (Bandung) is the education business. garudanexa.com/akun ('Masuk | Garuda Nexa') is indexed, and two www.garudanexa.com results show different titles. Bing also shows instagram.com/garudanexabahtera. Ahrefs found branded web mentions are the strongest correlate of AI Overview visibility (0.664) (https://ahrefs.com/blog/ai-overview-brand-correlation/).
Rec: Owner decides how the two brands relate. If they are one group: cross-link with clear roles and add Organization JSON-LD (legalName 'PT Garuda Nexa Bahtera', parentOrganization/subOrganization, sameAs). If they are unrelated: always say 'Garuda Nexa Bahtera' in titles, bios and directories. Add an indexable /tentang page with entity facts (legal name, NIB if public, address/city, founding year, products, contact, social links). Use one name and one NAP everywhere. Point Instagram @garudanexabahtera and LinkedIn to garudanexa.com.
Files: index.html, src/pages/public/Home.tsx

### KW-04 [P1|L|owner=False] No pages exist that can rank for the target clusters (sitemap has 5 URLs, no catalog, industry or service pages)
Evidence: public/sitemap.xml lists /, /pesan-custom and 3 legal pages. No /template/:slug, no catalog hub, no industry or service landing pages. The ranking pages are dedicated per-intent pages, e.g. resolusiweb.com/jasa-pembuatan-website-klinik-kecantikan/ (H1 = keyword, 14-tier price table, 5 FAQs, portfolio, about 2,000 words), fastwork.id category pages and webnesia per-niche pages.
Rec: Build the page set in the keyword map (data, section 4): catalog hub /template-website, 5 template pages each optimized as an industry landing page, 2 custom service pages (/jasa-pembuatan-website, /jasa-pembuatan-aplikasi-mobile), 2 vertical custom pages backed by real portfolio (sekolah/pesantren, klinik), and 3 guides (harga website company profile 2026, biaya aplikasi android 2026, template vs jasa custom). Use Indonesian keyword slugs and add every page to the sitemap with real lastmod. Do not mass-generate thin variants (Google scaled-content and doorway policies: https://developers.google.com/search/docs/essentials/spam-policies).
Files: public/sitemap.xml, src/App.tsx, src/pages/public/**

### KW-05 [P1|S|owner=False] Titles and descriptions lack the price anchor and bundle that win SERP clicks
Evidence: Top results almost all lead with a price: 'Jasa Pembuatan Website Terbaik, Mulai Rp500.000' (fastwork.id), 'Mulai dari Rp 49.000/bulan' (rumahweb), 'Mulai Rp99.000' (sribu), 'Mulai Rp 300.000' (resolusiweb), 'Rp34.900/bln' (idwebhost). The current site title has no price, no industry and no 'domain + hosting'. Catalog prices: Startup Clean Rp990.000, Arena Club Rp1.290.000, Aura Studio Rp1.390.000, Corporate Nexa Rp1.500.000, Finova Rp1.790.000 (database/seed.templates.sql).
Rec: Title formula: '<Keyword> – Mulai Rp<harga> | Garuda Nexa'. Meta description: '<benefit>. Sudah termasuk domain, hosting & SSL tahun pertama, edit sendiri lewat CMS, bayar aman via Midtrans. Lihat demo langsung.' Fill these from the DB price at prerender time. Concrete titles are in data, section 4.
Files: index.html, src/pages/public/template/useDocumentTitle.ts, database/seed.templates.sql

### KW-06 [P1|S|owner=True] Renewal price is unpublished, but AI Overviews quote providers that list full price tables
Evidence: AI Overviews for 'jasa website company profile murah' and 'harga pembuatan website company profile' quote Fastwork (Rp200rb–3,5jt), Solusitech (Rp899rb / Rp1.999.000 incl .COM), Resolusiweb (Rp300rb, renewal Rp250rb/yr) and Biznet Gio. The terms page says 'Nominal perpanjangan kami informasikan' (src/pages/public/legal/SyaratKetentuan.tsx:111), so there is no public year-2 price. GEO research found that adding statistics and citations raised visibility in generative answers by up to 40% (37% on Perplexity) (https://arxiv.org/abs/2311.09735).
Rec: Owner: decide on and publish the year-2 renewal price (domain + hosting) and the custom starting prices ('Website custom mulai Rp…', 'Aplikasi Android mulai Rp…', even as a range). Then show one visible HTML comparison table (template, price, inclusions, renewal, delivery time) on the catalog and pricing pages, mirrored in Offer JSON-LD.
Files: src/pages/public/legal/SyaratKetentuan.tsx, src/components/sections/FAQ.tsx

### KW-07 [P1|M|owner=False] Fastest wins: industry 'template website <industri>' SERPs have no Indonesian done-for-you competitor
Evidence: 'template website klinik kecantikan': id.wix.com, dribbble, canva, themeforest, pinterest, figma, webflow, themehunk (AI Overview lists ThemeForest themes). 'template website futsal': canva and postermywall posters, dribbble, behance. 'template website fintech': envato, themeforest, dribbble, webflow, figma, framer. Even 'website company profile siap pakai' shows shopee, gramedia blog, canva, tokopedia, badoystudio and pinterest. No result offers a ready Indonesian website with domain, hosting and CMS.
Rec: Make each template detail page a full industry landing page: H1 '<Template Website Klinik Kecantikan & Salon Siap Pakai>', 600–1,000 words of unique copy (who it fits, sections, what the CMS can edit, inclusions, timeline), price table, 4–6 FAQs, link to the live demo as 'contoh website klinik kecantikan', and real screenshots with descriptive alt text. Upload the same designs to Dribbble, Behance and Pinterest with a link back, since those sites rank on these queries.
Files: src/pages/public/TemplateDetail.tsx, src/pages/public/TemplateDemo.tsx, database/seed.templates.sql

### KW-08 [P1|M|owner=True] Head terms are held by marketplaces, hosts and large agencies; use marketplaces as a channel now
Evidence: 'jasa pembuatan website': fastwork, rumahweb, zarata, Instagram @webcare.idn, idwebhost, velocitydeveloper, sribu, akubi (local ads present). 'jasa pembuatan aplikasi android': fastwork, teknodigital, Instagram @appdev.id, sribu, shopee, codeinspira, majapahit, vodjo (local pack plus an AI Overview with Rp30–150 juta MVP tiers). 'jasa website company profile murah' includes shopee.co.id and padiumkm.id listings. AI Overviews cite Fastwork first on 6 of the commercial queries checked.
Rec: Treat the heads as 12+ month goals. Owner: create seller profiles on Fastwork.id and Sribu (template setup gig + custom website/app gigs), a Shopee or Tokopedia service listing, and a PaDi UMKM vendor listing, each with the brand name and a link to garudanexa.com where the platform allows. Marketplace pages rank and get cited in AI Overviews today, and their reviews also count as brand mentions.
Files: 

### KW-09 [P1|S|owner=True] Local pack appears on service queries; a Google Business Profile is needed if eligible
Evidence: Local pack seen for 'jasa pembuatan website company profile', 'jasa pembuatan aplikasi android' and 'jasa pembuatan website jakarta'. The AI Overview for the Jakarta query names local agencies (Nectar, RUBICWEB). Google lets a service-area business have a profile only with a real, staffed location or customer visits. Virtual offices are not eligible (https://support.google.com/business/answer/3038177?hl=id). Google also says to keep Business Profile up to date for AI features (https://developers.google.com/search/docs/appearance/ai-features).
Rec: Owner: if eligible, create or claim a GBP for PT Garuda Nexa Bahtera. Primary category: Website designer / Perusahaan software. Add services (template website, website custom, aplikasi Android/iOS) with prices, the service area, photos and the site link, and ask every real customer for a review. Import it into Bing Places. Use the exact same NAP on the site footer, /tentang and directories.
Files: 

### KW-10 [P1|M|owner=False] FAQ and guide content does not answer the price questions that dominate PAA and AI answers
Evidence: PAA questions seen: 'Berapa tarif jasa pembuatan website?', 'Berapa harga 1 website?', 'Berapa biaya jasa membuat website company profile?', 'Berapa biaya jasa maintenance website?', 'Bikin website apakah bayar?', 'Berapa biaya bikin aplikasi Android?', 'Berapa biaya membuat website sekolah?'. The current FAQ (src/components/sections/FAQ.tsx) covers ordering, Midtrans, domain, CMS and template vs custom, but gives no numbers and sits only on the home page, rendered by JS.
Rec: Add direct 40–60 word answers with Rp figures to the relevant pages: price, renewal, maintenance, delivery time, what the buyer must prepare, ownership, refund, template vs custom. Publish 2–3 guides with dated pricing tables and sources, for example 'Harga Pembuatan Website Company Profile 2026', 'Biaya Pembuatan Aplikasi Android 2026' and 'Template vs Jasa Website Custom'. Mark them up with FAQPage that matches the visible text, and update them quarterly.
Files: src/components/sections/FAQ.tsx, src/pages/public/**

### KW-11 [P1|S|owner=True] WAF/bot access must be verified for search and AI crawlers (aggressive origin blocking observed)
Evidence: The first requests from this machine returned 200 for Chrome, Googlebot and bingbot user agents. Requests with the OAI-SearchBot user agent then got 520/403, the PerplexityBot user agent got 403, and after about 40 requests every request from this IP (curl and the browser) got a LiteSpeed '403 Forbidden' page from the origin. robots.txt has no AI-bot rules and .htaccess (deploy/cpanel/htaccess) has no bot rules, so the block comes from the host (Imunify360, ModSecurity or LiteSpeed) or from Cloudflare. OpenAI: sites opted out of OAI-SearchBot are not shown in ChatGPT search answers; Perplexity asks sites to allow its published IP ranges in the WAF.
Rec: Owner: in cPanel (Imunify360/ModSecurity/LiteSpeed bot protection) and in Cloudflare (Security > Bots / AI Crawl Control), confirm that verified Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, PerplexityBot, Perplexity-User and Claude-SearchBot are allowed, matching by user agent plus published IP lists (openai.com/searchbot.json, perplexity.com/perplexitybot.json). Decide on training crawlers (GPTBot, ClaudeBot, Google-Extended) separately. Review 403 logs for those agents. Unblock or whitelist this office IP if it is still blocked.
Files: deploy/cpanel/htaccess, public/robots.txt

### KW-12 [P2|S|owner=False] Duplicate host and junk URLs dilute the index (www duplicate, soft 404s, login and account pages indexed)
Evidence: https://www.garudanexa.com/ returns 200 with the same HTML and no redirect or canonical, and Google shows both www and apex results. https://www.garudanexa.com/halaman-tidak-ada-xyz returns 200 (SPA fallback), and Bing indexed /cgi-bin/ and /auth?type=login. Google indexed garudanexa.com/akun. robots.txt disallows /login and /auth but not /masuk, /daftar, /akun, /pesan/, /situs/ (src/App.tsx routes).
Rec: 301 www to the apex at Cloudflare, put a self-referencing canonical in the prerendered HTML, return a real 404 for unknown paths (or a JS-added noindex per Google's SPA guidance), and add noindex (meta, or X-Robots-Tag via .htaccess) on /masuk, /daftar, /akun*, /pesan/*, /situs/*, /login, /auth. Do not rely on robots Disallow alone. Afterwards, remove the stale URLs in GSC and Bing.
Files: deploy/cpanel/htaccess, public/robots.txt, src/App.tsx, src/pages/public/NotFound.tsx

### KW-13 [P2|L|owner=True] Off-site mentions, directories and PR plan (brand mentions drive AI citations)
Evidence: Ahrefs (75K brands): branded web mentions 0.664, branded anchors 0.527 and branded search volume 0.392 correlation with AI Overview visibility. Indonesian listicles rank and are summarized by AI Overviews ('5 Rekomendasi Jasa Pembuatan Website Terbaik', akubi.co.id; thrive.co.id; productnation.co). Clutch keeps an Indonesia web-developer ranking (https://clutch.co/id/web-developers). Google treats keyword-rich links widely distributed in site footers or templates as link spam.
Rec: Owner checklist (data, section 6): directories (Clutch, GoodFirms, Sortlist, LinkedIn company page, Indotrading/Indonetwork, Crunchbase), social profiles (IG, TikTok, YouTube template walkthroughs, Pinterest, Dribbble, Behance), outreach to Indonesian 'rekomendasi jasa website' listicles (sponsored placements disclosed and rel=sponsored), a data PR piece ('Survei harga jasa website Indonesia 2026'), and partnerships (pesantren and school networks, sports communities, beauty associations, UMKM digitalization programs). Customer sites may carry an opt-in branded 'Dibuat oleh Garuda Nexa' credit, nofollow, with no keyword anchors. Never use fake reviews.
Files: 

### KW-14 [P2|S|owner=True] City pages only where the company is really present; avoid doorway pages
Evidence: City SERPs ('jasa pembuatan website jakarta' and '... bandung') are dense: codeinspira, juraganweb, webnesia, doit, badoystudio, visionic, resolusiweb, webesia, solusiwebsitebandung, sekawanmedia. Google: 'pages targeted at specific regions or cities that funnel users to one page' are doorway abuse (https://developers.google.com/search/docs/essentials/spam-policies). Garuda Nexa sells nationally online.
Rec: Skip city doorway pages. Instead, rank nationally on 'online' and 'seluruh Indonesia' angles. Create at most one city page for the real office city (confirm whether that is Bandung), with local proof such as client logos, case studies and a map. Add more cities only when there are real local projects to show.
Files: 

### KW-15 [P2|S|owner=True] Measurement: GSC, Bing AI Performance, rank tracking and a monthly AI prompt panel
Evidence: There is no visibility baseline: the site is absent from Bing and its Google brand query is shared with another business. Bing's AI Performance report (public preview since Feb 2026) shows Copilot and Bing AI-summary citations, but not ChatGPT.
Rec: Owner: GSC domain property (DNS TXT via Cloudflare) plus sitemap. Track the 15 primary keywords monthly. Run the prompt panel in data, section 7 each month in ChatGPT (search on), Perplexity, Gemini and Copilot and log whether garudanexa.com is mentioned or cited. Pull search volumes from Keyword Planner once Ads is set up. Never promise a #1 ranking: results depend on competition and on Google, Bing and the AI vendors.
Files: 


## Data
# KW: Keywords, SERP & Competitors (Indonesia), snapshot 2026-10-23

Method: google.co.id (hl=id, gl=id, desktop browser; the detected location was Lampung, so local packs showed Lampung businesses) and bing.com (cc=id). Google started showing its rate-limit page after about 20 queries, so later checks used Bing. No volume tool was available: "Demand" is a qualitative estimate (H/M/L) and should be checked in Keyword Planner or GSC. "Diff" = estimated difficulty for a new domain. AIO = Google AI Overview present. PAA = People Also Ask.

## 1. SERP snapshot: who ranks (top results)

| Query | Top results (in order) | Features | Page type that wins | Diff |
|---|---|---|---|---|
| template website company profile | jagoanhosting (listicle), elements.envato, github, themewagon, pinterest, qwords (listicle), themeforest, nore.web.id, dribbble, exabytes | Ads (Hostinger); related searches lean to "free/github/bootstrap" | Hosting-company listicles + global marketplaces | M-H (mixed intent) |
| beli template website | makewebeasy, tokopedia, oketheme, facebook group, toco.id, beritaxx, shopee, projects.co.id, jagoanhosting | AIO | Marketplaces / catalogs | M |
| website siap pakai | makewebeasy "Paket Website Siap Pakai", canva, rumahweb, velocitydeveloper (Rp390rb–1,2jt), godaddy, figma, jagoanhosting, hostinger AI builder, openai | PAA: "Berapa harga 1 website?" | Builders + package pages | M-H |
| website company profile siap pakai | shopee, gramedia blog, canva, tokopedia, badoystudio, pinterest, resolusiweb, jagoanhosting | none | Marketplace listings | M (best head-term fit) |
| beli website jadi siap pakai (Bing) | digiwork.web.id, makewebeasy, zarata, jagoweb, gudangcloud, idwebhost | n/a | Package pages | L-M |
| template website klinik kecantikan | id.wix, dribbble, canva, themeforest, pinterest, figma, webflow, themehunk | AIO (lists ThemeForest themes) | Global template sites only | L-M (opportunity) |
| jasa pembuatan website klinik kecantikan | resolusiweb, (1 forum/IG), nambahin, fixit.co.id, getfound, badoystudio, webnesia, webside | PAA | Agency niche pages | M |
| template website futsal | canva, postermywall x2, dribbble, magnific, pinterest, behance, pippit | AIO (Figma UI kits) | Poster/design templates (intent mismatch) | L |
| website klub padel | padelclub.id, padelpro.id, ayo.co.id, reclub, thegoodpadelclub, courtside, padelist, padelmesh | AIO | Navigational (clubs/booking) | n/a, not a target |
| jasa pembuatan website gym fitness futsal (Bing) | fixit.co.id, sali.co.id, aksarakarya, solusitech, bololabs, fastwork | n/a | Agency niche pages | L-M |
| template website fintech | envato, themeforest, dribbble, webflow, figma, framer, behance | AIO | Global template sites | L (low local demand) |
| jasa pembuatan website koperasi | dickyibrohim, solusitech, dcn-indonesia, idmetafora, trijayasolution, cahayainfotama | AIO, PAA | Small agency pages | L-M |
| jasa pembuatan website umkm | resolusiweb (Rp300rb), fastwork (Rp200rb), sribu (Rp99rb), idwebhost, webekspor, thrive.co.id (listicle), layana, smesta.umkm.go.id | AIO (cites Sribu, Resolusiweb) | Marketplaces + agencies | M-H |
| jasa pembuatan website | fastwork, rumahweb, zarata, IG @webcare.idn, idwebhost, velocitydeveloper, sribu, akubi (listicle) | Ads (local), PAA | Marketplaces + hosts | H |
| jasa pembuatan website company profile | fastwork, webnesia, ascendweb, biznetgio (guide), IG @jasacompanyprofile.id, nusatama, juraganweb, transisimedia | AIO, PAA, Local pack | Agencies + marketplace | H |
| jasa website company profile murah | fastwork x2, webnesia, solusitech, resolusiweb, rumahweb, shopee, padiumkm.id, sribu | AIO (Rp price lists) | Marketplaces + agencies with price tables | H |
| harga pembuatan website company profile | biznetgio (2026 guide), resolusiweb, jagoanhosting (2024), badoystudio (blog), fastwork, ciptareka, 4visionmedia, sribu | AIO (cites Biznet Gio, Resolusiweb), PAA | Price guides | M-H (best AIO-citation play) |
| jasa pembuatan aplikasi android | fastwork, teknodigital, IG @appdev.id, sribu, shopee, codeinspira, majapahit, fastwork, vodjo | AIO (MVP Rp30–150jt), PAA, Local pack | Marketplaces + software houses | H |
| jasa pembuatan aplikasi mobile | fastwork, sribu, teknodigital, IG @appdev.id, majapahit, codeinspira, wesclic, mediatechindo | AIO, PAA | same | H |
| biaya pembuatan aplikasi android | fastwork, layana (blog), jagel (blog), sribu, technbrains x2, albatech (2026 guide), appdev | AIO, PAA | Cost guides | M |
| jasa pembuatan website sekolah | resolusiweb, fastwork, mysch.id, webnesia, jasawebsekolah.id, websekolah.co.id, badoystudio, arrazyinovasi, naevaweb | AIO (PPDB online) | Niche specialists | M-H |
| jasa pembuatan website pesantren | palimodigital, vlobs (Rp650rb), digital.muslim.or.id, arrazyinovasi (5jt), kodingin, sip3.bekasikota.go.id, shopee, solusitech, barizaloka | AIO (profil, PPDB, donasi) | Small specialists (fragmented) | M (realistic) |
| jasa pembuatan website jakarta | codeinspira, juraganweb, webnesia, doit, fastwork, badoystudio, rumahweb, visionic | AIO, Local pack | City pages | H |
| jasa pembuatan website bandung (Bing) | resolusiweb, webesia, solusiwebsitebandung, webnesia, sekawanmedia, sitespirit, weblokal | n/a | City pages | M-H |
| garuda nexa (brand) | **garudanexa.id (university directory)**, www.garudanexa.com, IG post (education), garudanexa.com/akun (login), IG @garudanexa (Bandung, education), www.garudanexa.com (2nd title) | AIO conflates the two companies | n/a | Must win |

Common PAA questions (FAQ material): Berapa tarif jasa pembuatan website? · Berapa harga 1 website? · Berapa biaya jasa membuat website company profile? · Berapa jasa bikin website company profile? · Berapa biaya untuk membuat website? · Berapa biaya jasa maintenance website? · Bikin website apakah bayar? · Website gratis pakai apa? · Berapa harga joki website? · Berapa biaya pembuatan website desa? · Berapa biaya membuat website sekolah? · Berapa biaya bikin aplikasi Android? · Berapa harga jasa pembuatan program aplikasi? · Bikin aplikasi Android pakai apa? · Apa jasa pembuatan website terbaik di Indonesia?

Patterns:
- Almost every commercial title has a price anchor ("Mulai Rp…").
- AI Overviews quote named providers with explicit Rp tables: Fastwork (Rp200rb–3,5jt), Resolusiweb (Rp300rb … Rp19jt, with renewal prices), Solusitech (LP Rp899rb, Compro Rp1.999.000 incl .COM), Sribu (Rp99rb), Biznet Gio.
- Instagram profiles, Shopee/Tokopedia listings and padiumkm.id rank on page 1.
- Competitors sell by WhatsApp quote. **Almost none offers a fixed price with online checkout, domain + hosting + SSL, CMS and a live demo.** This is Garuda Nexa's angle.

Competitor offer reference: resolusiweb.com/jasa-pembuatan-website-klinik-kecantikan/ has H1 = keyword, 14 packages from Rp300.000 (renewal Rp250.000/yr) to Rp19.000.000, inclusions per tier (domain .my.id/.com, hosting, SSL), 6-step process, portfolio of 5 clinics, 4 testimonials, 5 FAQs, media logos, WhatsApp CTAs, about 2,000–2,500 words. Duaja.com sells templates by industry (kontraktor, distributor, konsultan, klinik…) as a subscription with no upfront payment. MakeWebEasy offers "ratusan template siap pakai".

## 2. Keyword map

### Intent A: buy a ready website/template online (transactional)
| Keyword (and variants) | Demand | Diff | Priority | Target page |
|---|---|---|---|---|
| website company profile siap pakai / template website company profile siap pakai | M | M | **Primary** | /template-website (catalog hub) |
| template website company profile (+ "murah", "+ domain hosting", "bisa edit sendiri") | H | M-H | **Primary** (modifier long-tail first) | /template-website + /template/corporate-nexa |
| beli template website / beli website jadi / jual website jadi siap pakai | M | M | **Primary** | /template-website |
| website siap pakai untuk bisnis / website instan | M-H | M-H | Secondary | Home |
| template website klinik kecantikan / website klinik kecantikan / template website salon, spa, barbershop, nail art | M | L-M | **Primary** | /template/aura-studio |
| template website klub olahraga / website lapangan padel / website futsal / website gym membership | L-M | L | **Primary** | /template/arena-club |
| template website startup / fintech (+ "koperasi" only if the copy fits) | L | L | Primary (low volume) | /template/finova |
| template website UMKM / website UMKM murah | M | M | **Primary** | /template/startup-clean |
| template website kontraktor / konsultan / distributor / perusahaan jasa | L-M | L-M | Long-tail | /template/corporate-nexa |
| contoh website company profile / contoh website klinik kecantikan | H (info) | M | Supporting | /demo/:slug linked as "contoh" |

### Intent B: custom development (commercial)
| Keyword | Demand | Diff | Priority | Target page |
|---|---|---|---|---|
| jasa pembuatan website pesantren / sekolah (+ PPDB online) | M | M / M-H | **Primary** (if real portfolio, e.g. i-Santri / i-School) | /jasa-pembuatan-website-sekolah-pesantren |
| jasa pembuatan website klinik kecantikan / klinik | L-M | M | **Primary** | /jasa-pembuatan-website-klinik (or a section on aura-studio) |
| jasa pembuatan website koperasi | L | L-M | Primary | /jasa-pembuatan-website-koperasi (only with proof) |
| harga pembuatan website company profile (2026) | H | M-H | **Primary (guide)** | /harga-pembuatan-website-company-profile |
| biaya pembuatan aplikasi android / mobile (2026) | M-H | M | **Primary (guide)** | /biaya-pembuatan-aplikasi-android |
| jasa pembuatan aplikasi android / mobile / iOS | H | H | Long-term | /jasa-pembuatan-aplikasi-mobile |
| jasa pembuatan website / company profile / murah | H | H | Long-term | /jasa-pembuatan-website |
| jasa pembuatan website umkm | M | M-H | Long-term | /jasa-pembuatan-website + startup-clean |
| jasa pembuatan website <kota> | M each | H | Only the real office city | /jasa-pembuatan-website-<kota> |
| Brand: garuda nexa, garuda nexa bahtera, garudanexa | L | L-M (shared with garudanexa.id) | **Primary** | Home + /tentang |
| Optional products if they are real offers: aplikasi absensi digital, aplikasi kasir POS, undangan digital, aplikasi sekolah, aplikasi pesantren | M | M | Later | product pages (named in LogoTicker) |

### 15 primary targets (realistic for a new domain in about 6–12 months, not guaranteed)
1. garuda nexa / garuda nexa bahtera (brand)
2. website company profile siap pakai
3. template website company profile siap pakai / + domain dan hosting
4. beli template website / beli website jadi
5. template website klinik kecantikan
6. template website salon / spa / barbershop
7. template website klub olahraga / padel / futsal / gym
8. template website UMKM
9. template website kontraktor / konsultan / distributor
10. jasa pembuatan website pesantren (+ PPDB online)
11. jasa pembuatan website sekolah
12. jasa pembuatan website klinik kecantikan
13. harga pembuatan website company profile 2026
14. biaya pembuatan aplikasi android 2026
15. jasa pembuatan website koperasi

### Long-tail to cover inside pages and FAQs
website company profile murah sudah termasuk domain dan hosting · website company profile bisa edit sendiri (CMS) · beli website bayar online / pakai Midtrans · website company profile 1 jutaan · berapa biaya perpanjangan domain dan hosting website · website jadi berapa hari · beda template website dan jasa website custom · website klinik kecantikan dengan reservasi WhatsApp · website salon kecantikan murah · website barbershop · website membership gym · website sewa lapangan futsal/padel · website akademi olahraga anak · website startup fintech · website koperasi simpan pinjam (company profile only) · jasa website PPDB online · jasa pembuatan aplikasi android untuk UMKM · jasa pembuatan aplikasi iOS · jasa maintenance website · redesign website company profile.

## 3. How AI answer engines pick sources (with sources)
- **Google AI Overviews / AI Mode**: a page must be "indexed and eligible to be shown in Google Search with a snippet". There are "no additional requirements" and no special schema or AI files. Best practices: allow crawling in robots and in the CDN or host, use internal links, keep important content as text, make structured data match the visible text, and keep Business Profile up to date. https://developers.google.com/search/docs/appearance/ai-features
- **ChatGPT search**: requires OAI-SearchBot to be allowed in robots.txt and at the WAF (IP list https://openai.com/searchbot.json). Sites opted out of OAI-SearchBot are not shown in ChatGPT search answers. GPTBot (training) is a separate setting. https://developers.openai.com/api/docs/bots. ChatGPT's use of the Bing index is widely reported but disputed (https://eseospace.com/blog/bing-webmaster-tools-indexnow-ai-search/), so treat Bing indexing as baseline hygiene.
- **Perplexity**: allow PerplexityBot in robots.txt and allow its IP ranges in the WAF (perplexity.com/perplexitybot.json). Perplexity-User fetches pages for user questions. https://docs.perplexity.ai/guides/bots
- **Copilot/Bing**: the Bing index plus IndexNow (https://www.bing.com/indexnow/getstarted). Bing Webmaster AI Performance report (preview since Feb 2026) shows Copilot and AI-summary citations. https://searchengineland.com/bing-webmaster-tools-testing-new-ai-performance-report-468039
- **What gets cited**: in the GEO study, adding statistics, citations and quotations raised visibility by up to 40% (37% on Perplexity). https://arxiv.org/abs/2311.09735. Ahrefs (75K brands) found branded web mentions (0.664) correlate more with AI Overview visibility than links or DR. https://ahrefs.com/blog/ai-overview-brand-correlation/
- **Observed in Indonesian AI Overviews (this snapshot)**: they cite pages with explicit Rp price ranges and package lists (Fastwork, Resolusiweb, Solusitech, Sribu, Biznet Gio), "rekomendasi" listicles, and dated guides ("2026"). Format to copy: clear entity facts, a visible price table with inclusions and renewal, a short direct answer under each question heading, a "Terakhir diperbarui" date, and a comparison table (template vs custom vs freelancer vs DIY builder).
- **CSR caveat**: Google renders JS, but many AI fetchers do not. Without prerender they see only the static shell title "Garuda Nexa | Template Website Siap Pakai…" on every URL.

## 4. Page plan and on-page targets (for the dev team)
| URL (proposed) | Title (≤60 to 65 chars) | H1 | Must contain |
|---|---|---|---|
| / | Template Website Siap Pakai & Jasa Website/Aplikasi \| Garuda Nexa | Website bisnis siap online: pilih template atau custom | Value prop, price-from, inclusions, catalog, custom CTA, entity facts, FAQ |
| /template-website | Template Website Company Profile Siap Pakai – Mulai Rp990rb | Template Website Siap Pakai untuk Bisnis Indonesia | Filter by industry, price table (price, inclusions, renewal), how buying works (Midtrans), FAQ |
| /template/startup-clean | Template Website UMKM & Startup Siap Pakai – Rp990 Ribu | … | Industry copy 600–1,000 words, demo link, FAQ, Product+Offer JSON-LD |
| /template/corporate-nexa | Template Website Company Profile Perusahaan – Rp1,5 Juta | … | kontraktor/konsultan/distributor/jasa |
| /template/aura-studio | Template Website Klinik Kecantikan & Salon – Rp1,39 Juta | … | klinik, salon, spa, nail, lash, barbershop; WhatsApp reservation |
| /template/arena-club | Template Website Klub Olahraga, Padel & Futsal – Rp1,29 Juta | … | padel, tenis, futsal, badminton, gym, akademi. Do not claim a booking system (it is a WhatsApp CTA) |
| /template/finova | Template Website Fintech & Startup – Rp1,79 Juta | … | Avoid regulated claims (OJK) |
| /jasa-pembuatan-website | Jasa Pembuatan Website Custom untuk Bisnis \| Garuda Nexa | … | Process, starting price/range, portfolio, case studies, FAQ |
| /jasa-pembuatan-aplikasi-mobile | Jasa Pembuatan Aplikasi Android & iOS \| Garuda Nexa | … | Stack, price ranges, timeline, portfolio |
| /jasa-pembuatan-website-sekolah-pesantren | Jasa Pembuatan Website Sekolah & Pesantren + PPDB Online | … | Features (profil, PPDB, berita, donasi), i-School/i-Santri proof |
| /harga-pembuatan-website-company-profile | Harga Pembuatan Website Company Profile 2026 (Rincian) | … | Market price table with sources, where Garuda Nexa fits, FAQ |
| /biaya-pembuatan-aplikasi-android | Biaya Pembuatan Aplikasi Android 2026: Rincian & Contoh | … | Cost drivers, ranges, timeline |
| /template-vs-jasa-website-custom | Template Website vs Jasa Custom: Mana yang Tepat? | … | Comparison table |
| /tentang | Tentang Garuda Nexa (PT Garuda Nexa Bahtera) | … | Legal name, address, contact, founders, sameAs, relationship to garudanexa.id |
Meta description formula: "<Benefit utama>. Sudah termasuk domain, hosting & SSL tahun pertama, edit sendiri lewat CMS, bayar aman via Midtrans. Lihat demo langsung."
Internal links: home → hub → templates → demo / pesan; guides → hub and service pages; every template page links "Butuh fitur khusus? Jasa custom".

## 5. Brand and index hygiene observed
- Google: www and apex both indexed; garudanexa.com/akun indexed; the homepage snippet lists "i-School, i-Santri, Kasir POS, Absensi Digital, Digital Invitation".
- Bing: only /auth?type=login and /cgi-bin/ under the old title "Garuda Nexa Bahtera - Modern Digital Solutions".
- www.garudanexa.com returns 200 with no redirect; unknown paths return 200 (soft 404).
- Instagram @garudanexabahtera exists (Bing). @garudanexa is the education business in Bandung.

## 6. Off-site plan for the owner (ownerAction)
Week 1:
- GSC domain property (DNS TXT) and sitemap.
- Bing Webmaster Tools (import from GSC), sitemap, IndexNow (Cloudflare Crawler Hints or key file), removal of /cgi-bin/ and /auth.
- Check Cloudflare AI Crawl Control / Bot settings and cPanel Imunify360/ModSecurity: allow verified Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, PerplexityBot, Perplexity-User and Claude-SearchBot by UA plus IP list. Whitelist the office IP.

Weeks 1–2:
- Google Business Profile, if eligible: categories Website designer / Software company, services with prices, service area, photos. Then Bing Places.
- One NAP everywhere.
- Decide the brand relationship with garudanexa.id and write the /tentang facts.

Weeks 2–4 (marketplaces that rank and get cited today):
- Fastwork.id and Sribu seller profiles (template setup + custom website + Android app gigs).
- Shopee or Tokopedia service listing.
- PaDi UMKM vendor listing.
- SMEsta (smesta.umkm.go.id) if a provider route exists.
- projects.co.id.

Directories and profiles:
- Clutch (Indonesia web-developer list), GoodFirms, Sortlist, DesignRush.
- LinkedIn company page, Crunchbase, Indotrading/Indonetwork.
- Instagram @garudanexabahtera (bio: "Template Website Siap Pakai & Jasa Website/Aplikasi", plus link), TikTok, YouTube (2–3 minute walkthrough per template: "Contoh website klinik kecantikan").
- Pinterest, Dribbble and Behance uploads of each template with a link back (these sites rank on the "template website <industri>" SERPs).

Reviews:
- Ask every launched customer for a Google review and a Fastwork/Clutch review. Real reviews only.

PR and backlinks:
- (a) Outreach to Indonesian "rekomendasi jasa pembuatan website / template website" listicles (akubi.co.id, thrive.co.id, productnation.co, hosting blogs). Sponsored placements must be disclosed and use rel=sponsored.
- (b) Data piece: "Survei Harga Jasa Website & Aplikasi di Indonesia 2026", built from public price pages; pitch it to tech and UMKM media.
- (c) Partnerships: pesantren and school networks (i-Santri/i-School), padel, futsal and gym communities, beauty clinic associations, Dinas Koperasi & UKM digitalization programs, Midtrans and hosting partner directories.
- (d) Customer sites: optional branded credit "Dibuat oleh Garuda Nexa", nofollow, no keyword anchor. Google lists widely distributed footer/template links as link spam.

Optional: a small Google Ads test on "website company profile siap pakai" / "template website klinik" to measure conversion before investing in content.

## 7. Monthly AI prompt panel (track mention or citation of garudanexa.com)
Run in ChatGPT (search), Perplexity, Gemini, Copilot and Google AI Mode:
1. "Rekomendasi template website company profile siap pakai yang sudah termasuk domain dan hosting"
2. "Di mana beli website klinik kecantikan yang bisa diedit sendiri?"
3. "Website untuk klub padel/futsal yang murah dan cepat jadi"
4. "Berapa harga pembuatan website company profile 2026?"
5. "Jasa pembuatan website pesantren dengan PPDB online"
6. "Jasa pembuatan aplikasi android untuk UMKM yang terpercaya"
7. "Apa itu Garuda Nexa / PT Garuda Nexa Bahtera?"
8. "Beli website jadi bayar online pakai Midtrans"
9. "Template website UMKM murah Indonesia"
10. "Bedanya beli template website dan jasa website custom"

## 8. Sources
Google AI features: https://developers.google.com/search/docs/appearance/ai-features · Google JS SEO: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics · Google spam policies: https://developers.google.com/search/docs/essentials/spam-policies · GBP eligibility: https://support.google.com/business/answer/3038177?hl=id · OpenAI bots: https://developers.openai.com/api/docs/bots · Perplexity bots: https://docs.perplexity.ai/guides/bots · IndexNow: https://www.bing.com/indexnow/getstarted · Bing AI Performance: https://searchengineland.com/bing-webmaster-tools-testing-new-ai-performance-report-468039 · ChatGPT/Bing debate: https://eseospace.com/blog/bing-webmaster-tools-indexnow-ai-search/ · GEO paper: https://arxiv.org/abs/2311.09735 · Ahrefs brand study: https://ahrefs.com/blog/ai-overview-brand-correlation/ · Clutch ID: https://clutch.co/id/web-developers · Competitor page: https://resolusiweb.com/jasa-pembuatan-website-klinik-kecantikan/ · https://duaja.com/ · https://www.makewebeasy.com/id/ · SERPs: google.co.id and bing.com queries listed in section 1 (2026-10-23).