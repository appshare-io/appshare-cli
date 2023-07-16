interface Env extends Record<string, unknown> {
  APPSHARE_BACKEND_URL?: string;
  APPSHARE_CLIENT_ROLE?: string;
}

const defaultEnv: Env = {
  APPSHARE_BACKEND_URL: "https://api.appshare.io",
  APPSHARE_CLIENT_ROLE: "me",
};

const { state: envState } = await Deno.permissions.query({
  name: "env",
});

export const env: Env = envState === "granted"
  ? {
    APPSHARE_BACKEND_URL: Deno.env.get("APPSHARE_BACKEND_URL") || defaultEnv.APPSHARE_BACKEND_URL,
    APPSHARE_CLIENT_ROLE: Deno.env.get("APPSHARE_CLIENT_ROLE") || defaultEnv.APPSHARE_CLIENT_ROLE,
  }
  : defaultEnv;
