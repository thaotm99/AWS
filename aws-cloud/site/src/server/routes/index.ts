// Every server route. Feature modules add theirs here.
import { createRouter } from "../router";
import { authRoutes } from "./auth";
import { meRoutes } from "./me";

export const handle = createRouter([...authRoutes, ...meRoutes]);
