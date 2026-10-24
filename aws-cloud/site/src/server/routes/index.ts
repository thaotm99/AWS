// Every server route. Feature modules add theirs here.
import { accountsEnabled } from "../config";
import { HttpError } from "../http";
import { createRouter, type Route } from "../router";
import { authRoutes } from "./auth";
import { dataRoutes } from "./data";
import { meRoutes } from "./me";

/**
 * Account routes answer 404 while accounts are off (Basic auth mode, previews without a database), so
 * the browser knows to keep learner data in localStorage instead of being sent to a login page.
 */
function accountsOnly(routes: Route[]): Route[] {
  return routes.map((r) => ({
    ...r,
    handler: async (ctx) => {
      if (!accountsEnabled()) throw new HttpError(404, "accounts_off", "Accounts are not enabled on this deployment");
      return r.handler(ctx);
    },
  }));
}

export const handle = createRouter([...authRoutes, ...accountsOnly([...meRoutes, ...dataRoutes])]);
