import type { APIRoute, GetStaticPaths } from "astro";
import { PracticeCatalog, practiceCatalog } from "../../../../../../modules/practice/content/PracticeCatalog";
import type { ContentLocale } from "../../../../../../modules/practice/domain/types";
import { withLearnLinks } from "../../../../../../data/question-lessons";

// GET /certifications/:cert/exams/:exam/:lang  (lang: vi = Vietnamese translation, en = original)
export const getStaticPaths = (() =>
  practiceCatalog.examContentPaths().map((params) => ({ params }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ params }) => {
  const lang = params.lang as ContentLocale;
  if (!PracticeCatalog.LOCALES.includes(lang)) return new Response("Unsupported language", { status: 404 });
  return Response.json(withLearnLinks(practiceCatalog.getExam(params.cert!, params.exam!, lang)));
};
