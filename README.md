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

Deploy the generated `dist/` directory to any static host. The private Sites review deployment is configured in `.openai/hosting.json`.

## GitHub Pages

`.github/workflows/deploy.yml` builds and publishes this site on every push to `main`, or through a manual Actions run. In repository **Settings → Pages**, the source must be **GitHub Actions**.

The workflow reads the Pages origin and base path from GitHub, then passes them to Astro as `SITE_URL` and `BASE_PATH`. For this repository, the default URL is `https://brandvm.github.io/seoteam-astro/`. Logo, favicon, home links, CSS, and fonts all resolve under that path. Root-domain and local builds keep `/` as their default.

To reproduce the Pages build locally:

```sh
SITE_URL=https://brandvm.github.io BASE_PATH=/seoteam-astro/ npm run build
BASE_PATH=/seoteam-astro/ npm run preview
```

## Editing

- `src/pages/index.astro`: page structure, navigation, chart, and small interaction script.
- `src/styles/global.css`: branding, layouts, responsive rules, and reduced-motion handling.
- `src/data/copy.json`: supplied headings and copy, rendered without rewriting the body paragraphs.
- `src/data/results.ts`: case-study metrics, testimonial text, industries, and article destinations.
- `src/components/Icon.astro`: small inline line icons.
- `public/assets/`: original logo and favicon, plus font licenses.
- `src/assets/fonts/`: locally hosted WOFF2 fonts, bundled by Astro with base-aware URLs.
- `src/homepage-copy.txt`: plain-text extraction of the supplied final copy for comparison.

No React runtime, carousel library, animation library, remote image requests, or remote font requests. The current logo SVG was extracted from the original page and its CSS colour variables resolved to their original values. The existing fonts were downloaded and subset to Latin characters in WOFF2 format.

Native `details` elements implement the differentiator panels and mobile menu. The testimonial carousel has manual previous/next buttons and direct slide selection. All testimonials remain readable when JavaScript is disabled. Contact buttons use the existing contact page, email address, and telephone number.

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

The hero chart normalizes impressions to a baseline of 100 and an outcome of 228. It does not represent a time series or absolute traffic counts. Case-card mini charts compare the same normalized baseline with each published percentage increase. Results belong to specific engagements; no average or guarantee is implied.

## Review status and production integration

The homepage is complete as a private review implementation. Supporting service, case-study, article, and contact links currently open the corresponding pages on the existing site. This project does not migrate those pages or connect a new lead-capture backend. “Explore Industries” opens the current case-study collection because the supplied site has no verified standalone industry index.

The review page intentionally includes `noindex,nofollow`. When the redesign is approved for the real domain, remove that review directive, configure the canonical production origin and sitemap, and map internal links to any migrated routes. Keep the published page URLs or supply redirects if those pages are migrated.

Validation performed: production build, full supplied-copy comparison, unique IDs and valid section anchors, local asset existence, client JavaScript syntax, all 18 external destination URLs returning HTTP 200, and arithmetic checks on the chart values. Browser interaction, visual QA, and Lighthouse measurement have not been run; the responsive rules are implemented but no measured performance score is claimed.

Reference documentation: [Astro components](https://docs.astro.build/en/basics/astro-components/) and [client scripts](https://docs.astro.build/en/guides/client-side-scripts/).
