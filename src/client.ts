import { paths } from "./types/appshare-openapi.ts";
import { createOpenapiClient } from "./deps.ts";
import { env, auth } from "./utils.ts";

if (!env.APPSHARE_BACKEND_URL) {
  throw new Error("APPSHARE_BACKEND_URL is not set in .env file");
}

// declare fetcher for paths
export const client = createOpenapiClient<paths>({
  baseUrl: env.APPSHARE_BACKEND_URL,
  middlewares: [
    (URL, init, next) => {
      const headers = new Headers(init.headers);

      if (!headers.get("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
      if (!headers.get("Accept")) headers.set("Accept", "application/json");
      if (!headers.get("Authorization")) {
        const accessToken = auth.getAccessToken();
        if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
      }
      if (!headers.get("X-Hasura-Role")) {
        const role = env.DEFAULT_CLIENT_ROLE ? env.DEFAULT_CLIENT_ROLE : "user";
        headers.set("X-Hasura-Role", role);
      }

      init.headers = headers;
      return next(URL, init);
    },
  ],
});
