import type { APIRoute, GetStaticPaths } from "astro";
import { practiceCatalog } from "../../../data/practice/PracticeCatalog";

// GET /certifications/:cert
export const getStaticPaths = (() =>
  practiceCatalog.listCertifications().map((c) => ({ params: { cert: c.id } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ params }) => Response.json(practiceCatalog.getCertification(params.cert!));
