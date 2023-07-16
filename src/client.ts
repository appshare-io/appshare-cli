import { paths } from "./types/appshare-openapi.ts";
import { createOpenapiClient, OpenapiClient } from "./deps.ts";
import { getAuthClient } from "./utils.ts";
import { env } from "./env.ts";

if (!env.APPSHARE_BACKEND_URL) {
  throw new Error("APPSHARE_BACKEND_URL is not set in env");
}

let client: OpenapiClient<paths>;

// declare fetcher for paths
export const getClient = () => {
  if (client) return client;
  client = createOpenapiClient<paths>({
    baseUrl: env.APPSHARE_BACKEND_URL as string,
    middlewares: [
      (URL, init, next) => {
        const headers = new Headers(init.headers);

        if (!headers.get("Content-Type")) {
          headers.set("Content-Type", "application/json");
        }
        if (!headers.get("Accept")) headers.set("Accept", "application/json");
        if (!headers.get("Authorization")) {
          const accessToken = getAuthClient().getAccessToken();
          if (accessToken) {
            headers.set("Authorization", `Bearer ${accessToken}`);
          }
        }
        if (!headers.get("X-Hasura-Role")) {
          const role = env.APPSHARE_CLIENT_ROLE
            ? env.APPSHARE_CLIENT_ROLE
            : "user";
          headers.set("X-Hasura-Role", role);
        }

        init.headers = headers;
        return next(URL, init);
      },
    ],
  });
  return client;
};
