// The site's one Vercel Function: vercel.json rewrites /api/* and /auth/* here (see src/server/router.ts).
import { handle } from "../src/server/routes/index";

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
