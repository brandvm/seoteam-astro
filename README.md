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

The visual direction follows the supplied references: a pale hero with stacked result cards, client marks, a large workplace image beside the agency introduction, a featured client project, and a research image. All differentiator content is displayed openly. A native `details` element implements the mobile menu. The testimonial carousel has manual previous/next buttons and direct slide selection. All testimonials remain readable when JavaScript is disabled. Contact buttons use the existing contact page, email address, and telephone number.

## Why a fresh Astro project

The supplied [brandvm/wf-template](https://github.com/brandvm/wf-template) bundles TypeScript and CSS using esbuild, while Webflow Designer owns its markup and layout. Its Webflow loader, jsDelivr release tags, and staging scripts are specific to that environment. Astro supplies the page templates, asset bundling, and local development server here, so bringing over that loader would duplicate the build system. This project retains the lightweight HTML/CSS/JavaScript approach.

## Content provenance

The RTF supplies the nine-section hierarchy and all section body copy. Labels such as “H2,” “Module,” and “CTA” were used as content structure, not treated as additional user instructions. The screenshots and reference sites informed the restrained layout and emphasis on evidence; their business claims, logos, and imagery were not reused.

Case-study metrics and quotes come from SEO Team Toronto’s published pages, retrieved September 10, 2026:

- [Enterprise retail-tech](https://www.seoteamtoronto.ca/case-studies/enterprise-retail-tech-technical-seo): +128% B2B search impressions; Core Web Vitals pass rate 62% → 94%; Daniel Reyes quote.
- [Personal injury law](https://www.seoteamtoronto.ca/case-studies/personal-injury-law-local-seo-toronto): +117% qualified organic leads; +168% non-brand organic traffic; Adrian Cole quote.
- [Custom home builder](https://www.seoteamtoronto.ca/case-studies/custom-home-builder-seo-ppc-toronto): +210% qualified consultation requests from organic and paid channels; 3.1× Google Business Profile calls/directions; Arman Daryani quote.
- [Career empowerment nonprofit](https://www.seoteamtoronto.ca/case-studies/nonprofit-seo-toronto): +120% donation submissions; +150% organic traffic; Karen Mitchell quote.
- [About SEO Team Toronto](https://www.seoteamtoronto.ca/about-us): 10+ years of experience.
- [Current blog](https://www.seoteamtoronto.ca/blog): the three linked article titles and descriptions.

The hero highlights three named engagements. Case-card bar comparisons normalize each baseline to 100 and compute the outcome from the published percentage increase; the visible caption identifies this normalization. These are before/after comparisons, not time series or absolute traffic counts. Results belong to specific engagements; no average or guarantee is implied.

Downloaded image assets are documented in `docs/image-sources.json`. The workplace image uses only the top photograph panel of the original composition through CSS clipping; its people are not identified as agency staff. The Toronique project graphic and SEO timeline editorial image have responsive WebP variants. Large below-the-fold images and badges use native lazy loading, and every image has explicit dimensions. Client marks come from the existing homepage; its white artwork is displayed monochrome on the light logo strip. The original 2025 Clutch badge date is retained. No generated photography or remotely hosted image dependencies were introduced.

## Review status and production integration

The homepage is a review implementation published on GitHub Pages. Supporting service, case-study, article, and contact links currently open the corresponding pages on the existing site. This project does not migrate those pages or connect a new lead-capture backend. “Explore Industries” opens the current case-study collection because the supplied site has no verified standalone industry index.

The review page intentionally includes `noindex,nofollow`. When the redesign is approved for the real domain, remove that review directive, configure the canonical production origin and sitemap, and map internal links to any migrated routes. Keep the published page URLs or supply redirects if those pages are migrated.

Validation performed: root and GitHub Pages production builds, all 37 supplied body/intro/heading text blocks, unique IDs and valid section anchors, local asset and responsive-source existence, explicit image dimensions and alt attributes, client JavaScript syntax, and arithmetic checks on the bar comparisons. All 18 external destination URLs returned HTTP 200 during the initial implementation. Browser interaction, visual QA, and Lighthouse measurement have not been run; the responsive rules are implemented but no measured performance score is claimed.

Reference documentation: [Astro components](https://docs.astro.build/en/basics/astro-components/) and [client scripts](https://docs.astro.build/en/guides/client-side-scripts/).


## Shared comment mode

Open `https://brandvm.github.io/seoteam-astro/?view=comment`. Normal visits load neither the review module nor its styles. In review mode, visitors can enter a display name, pin a thread to a page element, leave a general page comment, reply, react with thumbs up/heart/eyes, and resolve or reopen any thread. Resolved threads remain readable through the filter. “Copy link” includes the thread ID in the URL. Threads and replies paginate; the interface refreshes shared data every 15 seconds while the tab is visible.

Comments are public and anonymous; display names are self-selected, not verified identities. The comment API uses the existing Sites deployment at `https://seo-team-toronto-redesign.brandvision.chatgpt.site/api/review`, backed by D1. Its root redirects to the GitHub Pages homepage. Browser storage remembers only a display name and an anonymous reaction identifier. Comment records are never stored only in the browser. No GitHub token, database credential, or privileged API secret is shipped to visitors.

- `server/review-api.mjs`: public JSON endpoints, validation, bounded payloads, rate limiting, and CORS allowlist.
- `db/schema.ts` and `drizzle/`: schema and generated, append-only migrations.
- `src/scripts/review.ts` and `src/styles/review.css`: query-gated review panel and element-relative pins.
- `tests/review-api.test.mjs`: independent visitor workflows, idempotency, pagination, validation, and spam limits using the actual migration and a SQLite-backed D1 adapter.

The frontend and backend are separate deployments. GitHub Actions updates the static frontend on pushes to main. Backend changes also require publishing the exact built Worker and migrations to the existing Sites project. Deploying to GitHub Pages alone does not update the API.

For a local comment preview, run `npm run dev:comments`, then run `PUBLIC_REVIEW_API=http://127.0.0.1:8787/api/review npm run dev` in a second terminal. Visit `http://127.0.0.1:4321/?view=comment`. The local server uses an ignored SQLite file; set `REVIEW_LOCAL_DB` to choose another local file. Production builds use the public API default; `PUBLIC_REVIEW_API` is an optional public endpoint override, never a secret.

Run `npm test` and `npm run check:comments` before deployment. Publishing applies the D1 migration before the Worker is uploaded. Do not edit an applied migration. Keep the stable section IDs when redesigning the page so existing pins can fall back to their section if an individual element changes.
