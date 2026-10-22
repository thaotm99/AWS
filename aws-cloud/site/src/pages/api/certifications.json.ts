import type { APIRoute } from "astro";
import { practiceCatalog } from "../../data/practice/PracticeCatalog";

// GET /certifications
export const GET: APIRoute = () => Response.json(practiceCatalog.listCertifications());
