import type { APIRoute, GetStaticPaths } from "astro";
import { PracticeCatalog, practiceCatalog } from "../../../../../../modules/practice/content/PracticeCatalog";
import type { ContentLocale } from "../../../../../../modules/practice/domain/types";
import { learnLinks } from "../../../../../../data/question-lessons";

// GET /certifications/:cert/questions/:question/:lang  one question (lang: vi | en), for the review set
export const getStaticPaths = (() =>
  practiceCatalog.questionContentPaths().map((params) => ({ params }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ params }) => {
  const lang = params.lang as ContentLocale;
  if (!PracticeCatalog.LOCALES.includes(lang)) return new Response("Unsupported language", { status: 404 });
  const question = practiceCatalog.getQuestion(params.cert!, params.question!, lang);
  return Response.json({ ...question, learn: learnLinks(question.id) });
};
