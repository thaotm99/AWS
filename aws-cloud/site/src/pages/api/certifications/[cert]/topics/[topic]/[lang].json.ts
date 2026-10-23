import type { APIRoute, GetStaticPaths } from "astro";
import { PracticeCatalog, practiceCatalog } from "../../../../../../modules/practice/content/PracticeCatalog";
import type { ContentLocale } from "../../../../../../modules/practice/domain/types";
import { withLearnLinks } from "../../../../../../data/question-lessons";

// GET /certifications/:cert/topics/:topic/:lang  every question about one service (lang: vi | en)
export const getStaticPaths = (() =>
  practiceCatalog.topicContentPaths().map((params) => ({ params }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ params }) => {
  const lang = params.lang as ContentLocale;
  if (!PracticeCatalog.LOCALES.includes(lang)) return new Response("Unsupported language", { status: 404 });
  return Response.json(withLearnLinks(practiceCatalog.getTopic(params.cert!, params.topic!, lang)));
};
