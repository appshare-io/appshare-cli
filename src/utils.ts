import { load } from "https://deno.land/std@0.194.0/dotenv/mod.ts";
import { projectConfig } from "./config.ts";
import { HasuraAuthClient } from "npm:@nhost/hasura-auth-js";

interface Env extends Record<string, unknown> {
  APPSHARE_BACKEND_URL?: string;
  APPSHARE_CLI_REPO?: string;
  DEFAULT_CLIENT_ROLE?: string;
}

export const env: Env = await load({
  envPath: "./.env",
  defaultsPath: "./.env.defaults",
});
export const AppshareStorageUrl = `${env.APPSHARE_BACKEND_URL}/v1/storage`;

export const auth = new HasuraAuthClient({
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

export const getLoggedInUser = async () => {
  await auth.refreshSession();
  const user = auth.getUser();
  if (!user || !auth.isAuthenticated()) {
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
