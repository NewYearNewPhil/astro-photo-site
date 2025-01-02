import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  //https://github.com/withastro/roadmap/pull/901
  prefetch: true,
  trailingSlash: 'always',
  redirects: {
    "/": "/1/"
  },
  devToolbar: {
    enabled: false
  },
  integrations: [tailwind({
    applyBaseStyles: false
  })]
});