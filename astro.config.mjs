import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://andronasef.com',
  redirects: { '/flutter-cv': 'https://andronasef.github.io/links/20' },
  integrations: [sitemap()],
});
