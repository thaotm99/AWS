import type { APIRoute, GetStaticPaths } from "astro";
import { searchIndex } from "../../data/search-index";

// GET /search-index/:lang.json: what the site search dialog searches in one language (see data/search-index.ts).
export const getStaticPaths = (() => [{ params: { lang: "vi" } }, { params: { lang: "en" } }]) satisfies GetStaticPaths;

export const GET: APIRoute = ({ params }) => {
  const lang = params.lang as "vi" | "en";
  return Response.json(
    searchIndex().map((e) => ({ kind: e.kind, url: e.url, title: e.title[lang], context: e.context[lang], text: e.text[lang] })),
  );
};
