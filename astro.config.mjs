import { defineConfig } from 'astro/config';

// Pages supplies these at build time; local and root-domain builds retain '/'.
export default defineConfig({
  output: 'static',
  outDir: './out',
  site: process.env.SITE_URL,
  base: process.env.BASE_PATH || '/',
  devToolbar: { enabled: false },
});
