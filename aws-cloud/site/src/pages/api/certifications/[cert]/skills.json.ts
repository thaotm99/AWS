import type { APIRoute, GetStaticPaths } from "astro";
import { practiceCatalog } from "../../../../modules/practice/content/PracticeCatalog";

// GET /certifications/:cert/skills  the exam domain and lesson topic of every question (no question text)
export const getStaticPaths = (() => practiceCatalog.listCertifications().map((c) => ({ params: { cert: c.id } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ params }) => Response.json(practiceCatalog.skillMap(params.cert!));
