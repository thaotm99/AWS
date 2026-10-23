import type { APIRoute } from "astro";
import { searchIndex } from "../data/search-index";

// GET /search-index.json: what the site search dialog searches (see data/search-index.ts).
export const GET: APIRoute = () => Response.json(searchIndex());
