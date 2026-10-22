import type { APIRoute, GetStaticPaths } from "astro";
import { practiceCatalog } from "../../../../../modules/practice/content/PracticeCatalog";

// GET /certifications/:cert/exams/:exam
export const getStaticPaths = (() =>
  practiceCatalog.examPaths().map((params) => ({ params }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ params }) => Response.json(practiceCatalog.getExam(params.cert!, params.exam!));
