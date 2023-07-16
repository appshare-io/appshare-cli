import { load } from "https://deno.land/std/dotenv/mod.ts";
import { projectConfig } from "./config.ts";
import {
  NhostClient,
  type StorageUploadFileParams,
  type StorageUploadFileResponse,
} from "npm:@nhost/nhost-js";
import { fetchUpload } from "./libs/upload.ts";

interface Env extends Record<string, unknown> {
  APPSHARE_BACKEND_URL?: string;
  APPSHARE_CLI_REPO?: string;
  DEFAULT_CLIENT_ROLE?: string;
}

export const env: Env = await load({
  envPath: "./.env",
  defaultsPath: "./.env.defaults",
});

export const nhost = new NhostClient({
    authUrl: `${env.APPSHARE_BACKEND_URL}/v1/auth`,
  storageUrl: `${env.APPSHARE_BACKEND_URL}/v1/storage`,
  graphqlUrl: `${env.APPSHARE_BACKEND_URL}/v1/graphql`,
  functionsUrl: `${env.APPSHARE_BACKEND_URL}/v1/functions`,
  clientStorageType: "custom",
  clientStorage: {
    getItem: localStorage.getItem.bind(localStorage),
    setItem: localStorage.setItem.bind(localStorage),
    removeItem: localStorage.removeItem.bind(localStorage),
  },
});

export const getLoggedInUser = async () => {
  await nhost.auth.refreshSession();
  const user = nhost.auth.getUser();
  if (!user || !nhost.auth.isAuthenticated()) {
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
