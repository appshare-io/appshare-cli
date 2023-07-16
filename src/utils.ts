import { projectConfig } from "./config.ts";
import { HasuraAuthClient } from "npm:@nhost/hasura-auth-js";
import { env } from "./env.ts";

export const AppshareStorageUrl = `${env.APPSHARE_BACKEND_URL}/v1/storage`;

let authClient: HasuraAuthClient;
export const getAuthClient = () => {
  if (authClient) return authClient;
  authClient = new HasuraAuthClient({
    url: `${env.APPSHARE_BACKEND_URL}/v1/auth`,
    autoRefreshToken: true,
    autoSignIn: true,
    clientStorageType: "custom",
    clientStorage: {
      getItem: localStorage.getItem.bind(localStorage),
      setItem: localStorage.setItem.bind(localStorage),
      removeItem: localStorage.removeItem.bind(localStorage),
    },
  });
  return authClient;
};

export const getLoggedInUser = async () => {
  await getAuthClient().refreshSession();
  const user = getAuthClient().getUser();
  if (!user || !getAuthClient().isAuthenticated()) {
    console.error(
      "You are not logged in!, please login first (appshare login)",
    );
    Deno.exit(1);
  }
  return user;
};

export const isProjectInitialized = () => {
  return !!projectConfig.get("codebaseId") || !!projectConfig.get("appId");
};

export const getInitializedProjectConfig = () => {
  if (!isProjectInitialized()) {
    console.error("Project is not initialized, please run (appshare init)");
    Deno.exit(1);
  }
  return projectConfig.getRaw();
};

export const getFileStat = async (path: string) => {
  try {
    return await Deno.stat(path);
  } catch (_) {
    return null;
  }
};

export const exitWithMessage = (message: string, exitCode = 1) => {
  const m = `\n\n${message}\n\n`;
  if (exitCode === 0) console.log(m);
  else console.error(m);
  Deno.exit(exitCode);
};
