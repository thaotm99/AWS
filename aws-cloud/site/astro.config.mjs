import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";

export default defineConfig({
  // Pages are emitted as /concepts/<id>/index.html; a CloudFront Function maps
  // /concepts/<id>/ to that file (see infra/lib/static-site-stack.ts).
  build: { format: "directory" },
  trailingSlash: "ignore",
  integrations: [mdx(), react()],
});
