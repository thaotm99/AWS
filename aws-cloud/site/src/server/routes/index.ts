// Every server route. Feature modules add theirs here.
import { createRouter } from "../router";
import { attemptRoutes } from "./attempts";
import { authRoutes } from "./auth";
import { meRoutes } from "./me";
import { practiceRoutes } from "./practice";

export const handle = createRouter([...authRoutes, ...meRoutes, ...practiceRoutes, ...attemptRoutes]);
