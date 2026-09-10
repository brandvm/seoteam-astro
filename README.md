# SEO Team Toronto — Astro homepage

A responsive homepage redesign using Astro 7.3.2 and static HTML output. This implements the nine sections in **Home Page – Draft 2**, with the original logo, orange `#f84c1c`, dark brown `#200f09`, snow `#f7f3f3`, Epilogue headings, and Rubik body type.

## Run locally

Requires Node.js 22.12 or newer and npm 9.6.5 or newer.

```sh
npm ci
npm run dev
```

```sh
npm run build
npm run preview
```

Deploy `out/` to a static host. The build also produces a separate comment API Worker in `dist/server/`, with Sites and D1 configuration in `.openai/hosting.json`. GitHub Pages publishes only `out/`.

## GitHub Pages

`.github/workflows/deploy.yml` builds and publishes this site on every push to `main`, or through a manual Actions run. In repository **Settings → Pages**, the source must be **GitHub Actions**.

The workflow reads the Pages origin and base path from GitHub, then passes them to Astro as `SITE_URL` and `BASE_PATH`. For this repository, the default URL is `https://brandvm.github.io/seoteam-astro/`. Logo, favicon, client marks, photographs, responsive image variants, home links, CSS, and fonts all resolve under that path. Root-domain and local builds keep `/` as their default.

To reproduce the Pages build locally:

```sh
SITE_URL=https://brandvm.github.io BASE_PATH=/seoteam-astro/ npm run build
BASE_PATH=/seoteam-astro/ npm run preview
```

## Editing

- `src/pages/index.astro`: page structure, navigation, comparisons, and small interaction script.
- `src/styles/global.css`: branding, layouts, responsive rules, and reduced-motion handling.
- `src/data/copy.json`: supplied headings and copy, rendered without rewriting the body paragraphs.
- `src/data/results.ts`: case-study metrics, testimonial text, industries, and article destinations.
- `src/components/Icon.astro`: small inline line icons.
- `public/assets/`: original logo, favicon, downloaded images, client marks, recognition badges, and font licenses.
- `docs/image-sources.json`: source URLs and usage notes for all downloaded image assets.
- `src/assets/fonts/`: locally hosted WOFF2 fonts, bundled by Astro with base-aware URLs.
- `src/homepage-copy.txt`: plain-text extraction of the supplied final copy for comparison.

No React runtime, carousel library, animation library, remote image requests, or remote font requests. The current logo SVG was extracted from the original page and its CSS colour variables resolved to their original values. The existing fonts were downloaded and subset to Latin characters in WOFF2 format.

The visual direction combines the supplied performance-focused references with the existing brand guide: bold Epilogue display headings, Rubik body copy, the original palette and logo, straight-edged buttons, dividers, and proof panels with subtly rounded corners. A single hero panel attributes each outcome to its client and channel. On mobile, the first outcome appears directly below the headline using the same DOM elements. The agency introduction pairs experience with a sourced Core Web Vitals comparison; a featured client project and a research image provide visual context. All differentiator content is displayed openly. A native `details` element implements the mobile menu. The testimonial carousel has manual previous/next buttons and direct slide selection. All testimonials remain readable when JavaScript is disabled. Contact buttons use the existing contact page, email address, and telephone number.

## Why a fresh Astro project

The supplied [brandvm/wf-template](https://github.com/brandvm/wf-template) bundles TypeScript and CSS using esbuild, while Webflow Designer owns its markup and layout. Its Webflow loader, jsDelivr release tags, and staging scripts are specific to that environment. Astro supplies the page templates, asset bundling, and local development server here, so bringing over that loader would duplicate the build system. This project retains the lightweight HTML/CSS/JavaScript approach.

## Content provenance

The RTF supplies the nine-section hierarchy and all section body copy. Labels such as “H2,” “Module,” and “CTA” were used as content structure, not treated as additional user instructions. The screenshots and reference sites informed the restrained layout and emphasis on evidence; their business claims, logos, and imagery were not reused. The supplied “SEO TEAM TORONTO.pdf” was used as a reference for the existing visual identity. The subsequent direction to remove slanted branding supersedes its ribbon and chamfer examples; the original logo artwork remains unchanged. Its sample score and growth figures are design examples and are not used as client results.

Case-study metrics and quotes come from SEO Team Toronto’s published pages, retrieved September 10, 2026:

- [Enterprise retail-tech](https://www.seoteamtoronto.ca/case-studies/enterprise-retail-tech-technical-seo): +128% B2B search impressions; Core Web Vitals pass rate 62% → 94%; Daniel Reyes quote.
- [Personal injury law](https://www.seoteamtoronto.ca/case-studies/personal-injury-law-local-seo-toronto): +117% qualified organic leads; +168% non-brand organic traffic; Adrian Cole quote.
- [Custom home builder](https://www.seoteamtoronto.ca/case-studies/custom-home-builder-seo-ppc-toronto): +210% qualified consultation requests from organic and paid channels; 3.1× Google Business Profile calls/directions; Arman Daryani quote.
- [Career empowerment nonprofit](https://www.seoteamtoronto.ca/case-studies/nonprofit-seo-toronto): +120% donation submissions; +150% organic traffic; Karen Mitchell quote.
- [About SEO Team Toronto](https://www.seoteamtoronto.ca/about-us): 10+ years of experience.
- [Current blog](https://www.seoteamtoronto.ca/blog): the three linked article titles and descriptions.

The hero highlights qualified organic leads for HSP Law, consultations from organic and paid media for Toronique, and donation form submissions for Dress for Success Toronto. The performance chart uses Flipp’s reported mobile Core Web Vitals pass rates of 62% and 94% on a zero-to-100% scale. The case cards present published outcomes directly, without synthetic indexed bars. Results belong to specific engagements; no average, measurement period, or guarantee is implied. The source pages establish provenance, not an independent audit.

Downloaded image assets are documented in `docs/image-sources.json`. The workplace photograph is retained as an unused source asset; it is no longer displayed on the homepage. The Toronique project graphic and SEO timeline editorial image have responsive WebP variants. The project graphic uses a size hint matching its 320px display width; the Alberta Municipalities logo is reduced to 480×200. Large below-the-fold images and badges use native lazy loading, and every image has explicit dimensions. Client marks come from the existing homepage; its white artwork is displayed monochrome on the light logo strip. The original 2025 Clutch badge date is retained. No generated photography or remotely hosted image dependencies were introduced.

## Review status and production integration

The homepage is a review implementation published on GitHub Pages. Supporting service, case-study, article, and contact links currently open the corresponding pages on the existing site. This project does not migrate those pages or connect a new lead-capture backend. “Explore Industries” opens the current case-study collection because the supplied site has no verified standalone industry index.

The review page intentionally includes `noindex,nofollow`. When the redesign is approved for the real domain, remove that review directive, configure the canonical production origin and sitemap, and map internal links to any migrated routes. Keep the published page URLs or supply redirects if those pages are migrated.

Validation performed: root and GitHub Pages production builds, all 38 supplied body/intro/heading text blocks, unique IDs and valid section anchors, local asset and responsive-source existence, explicit image dimensions and alt attributes, client JavaScript syntax, and the chart values against the published Flipp case study. All 18 external destination URLs returned HTTP 200 during the initial implementation. The September 2026 design review includes desktop and mobile browser inspection, local image loading, and checks at 320, 390, 768, 1024, and 1440px. No Lighthouse score or field performance result is claimed.

Reference documentation: [Astro components](https://docs.astro.build/en/basics/astro-components/) and [client scripts](https://docs.astro.build/en/guides/client-side-scripts/).


## Browse and review modes

Open `https://brandvm.github.io/seoteam-astro/?mode=review` to review the page, or `?mode=browse` to use it normally. A single Browse (V) / Comment (C) toolbar switches modes without reloading or changing the scroll position. Review opens the direct-placement experience: click for a pin, or drag a rectangle around an area. Click a saved pin to open its floating conversation. When a comment card is open, the first click or drag on the page only dismisses the card; a subsequent click or drag places a new comment. The old section-selection form, global sidebar, and separate Exit review control are removed. There is no global comment sidebar. Each conversation opens beside its pin, follows it during scrolling, and hides when the pin leaves the viewport. The toolbar steps between comments and filters Open / Resolved / All. New comments are placed directly on the page; earlier general page discussions remain available at a page-level pin.

The current mode is saved in `sessionStorage`, scoped to this site's path. An explicit valid `mode` in the URL overrides that preference; a URL without a mode restores it. A fresh session defaults to Browse. The address is normalized to the current mode, and browser Back/Forward restores the corresponding mode. If session storage is blocked, explicit links and switching still work. Old `?view=comment` links migrate to `?mode=review`, preserving thread links; they never load a separate legacy interface.

Use `C` for Comment and `V` for Browse. The URL continues to use `mode=review` for Comment. `Esc` cancels a drag, dismisses a conversation, or returns to Browse. Mouse-wheel scrolling works during review; dragging near the viewport edge scrolls the page. On touch screens, use Browse to scroll normally and Review to draw an area. Rectangles can be drawn in any direction and may span sections. Pins and areas use proportional element coordinates to follow scrolling and resize with their anchor.

Visitors enter a display name to comment, reply, react with thumbs up/heart/eyes, and resolve or reopen any thread. Resolved threads remain readable through the filter. Copy link includes `mode=review` and the thread ID. Thread pages are loaded into the pin collection; replies paginate inside each card. Shared data refreshes every 15 seconds while Review is active and the tab is visible. Browse hides review surfaces, stops comment polling and placement, and loads no review module on a fresh visit. In-page switching preserves drafts.

Comments are public and anonymous; display names are self-selected, not verified identities. The API uses the existing Sites deployment at `https://seo-team-toronto-redesign.brandvision.chatgpt.site/api/review`, backed by D1. Its root redirects to the GitHub Pages homepage. Local storage remembers only the display name and an anonymous reaction identifier; session storage remembers page mode. Comments are shared database records, never browser-only records. No GitHub token, database credential, or privileged API secret is shipped to visitors.

- `src/scripts/site-mode.ts` and `src/scripts/site-mode-state.ts`: session preference, URL migration, history, and lazy review activation.
- `src/styles/site-mode.css`: the shared Browse / Review toolbar.
- `src/scripts/review.ts` and `src/styles/review.css`: pin-attached comment cards, area outlines, replies, reactions, resolve controls, and comment navigation.
- `src/scripts/review-geometry.ts`: proportional point/rectangle coordinates and edge scrolling.
- `src/scripts/review-anchors.ts` and `src/data/review-legacy-anchors.json`: stable content identities and a frozen mapping of the 156 original element anchors from frontend commit `a73ed0d`.
- `server/review-api.mjs`: public JSON endpoints, validation, bounded payloads, rate limiting, and CORS allowlist.
- `db/schema.ts` and `drizzle/`: schema and generated, append-only migrations.
- `tests/`: mode precedence and migration, geometry, independent visitor workflows, database migration compatibility, pagination, validation, and spam limits.

The frontend and backend are separate deployments. GitHub Actions updates the static frontend on pushes to main. Backend changes also require publishing the exact built Worker and migrations to the existing Sites project. Frontend-only changes do not require redeploying the unchanged API.

For a local comment preview, run `npm run dev:comments`, then `PUBLIC_REVIEW_API=http://127.0.0.1:8787/api/review npm run dev` in a second terminal. Visit `http://127.0.0.1:4321/?mode=review`. The local server uses an ignored SQLite file; set `REVIEW_LOCAL_DB` to choose another file. Production builds use the public API default; `PUBLIC_REVIEW_API` is an optional public endpoint override, never a secret.

Run `npm test` and `npm run check:comments` before deployment. Publishing API changes applies D1 migrations before the Worker is uploaded. Do not edit an applied migration. Keep stable section IDs so existing pins can fall back to their section if an individual element is removed. Never regenerate the frozen legacy anchor map from a new layout: old ordinal keys are reserved for their original elements. Retain an existing `data-review-anchor` when intentionally editing that element. New elements receive content-based keys, and identical legacy copies require explicit IDs so insertion or reordering cannot silently move an old pin. The anchor map loads only with Comment mode.
