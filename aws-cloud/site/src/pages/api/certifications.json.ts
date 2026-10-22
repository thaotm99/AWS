import type { APIRoute } from "astro";
import { practiceCatalog } from "../../modules/practice/content/PracticeCatalog";

// GET /certifications
export const GET: APIRoute = () => Response.json(practiceCatalog.listCertifications());
