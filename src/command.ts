import { client } from "./client.ts";
import { projectConfig } from "./config.ts";
import { Command, Confirm, EnumType, Secret, Select } from "./deps.ts";
import { bundle } from "https://deno.land/x/emit@0.24.0/mod.ts";
import {
  getFileStat,
  getInitializedProjectConfig,
  getLoggedInUser,
  isProjectInitialized,
  nhost,
} from "./utils.ts";
import {
  GithubProvider,
  UpgradeCommand,
} from "https://deno.land/x/cliffy@v1.0.0-rc.2/command/upgrade/mod.ts";
import { paths } from "./types/appshare-openapi.ts";
import { fetchUpload } from "./libs/upload.ts";

const logLevelType = new EnumType(["debug", "info", "warn", "error"]);

await new Command()
  .name("appshare-cli")
  .version("0.1.0")
  .description("Command line tool for AppShare")
  // Debug
  .type("log-level", logLevelType)
  .env("DEBUG=<enable:boolean>", "Enable debug output.")
  .globalOption("-d, --debug", "Enable debug output.")
  .globalOption("-l, --log-level <level:log-level>", "Set log level.", {
    default: "info" as const,
  })
  // .command(
  //   "upgrade",
  //   new UpgradeCommand({
  //     main: "cliffy.ts",
  //     args: ["--allow-net"],
  //     provider: new GithubProvider({
  //       repository: env.APPSHARE_CLI_REPO ? env.APPSHARE_CLI_REPO : "",
  //     }),
  //   }),
  // )
  // Command: login
  .command("login", "Login to AppShare")
  .arguments("<email:string>")
  .action(async (_, email) => {
    const password: string = await Secret.prompt({
      message: `Password for ${email}: `,
      hidden: true,
    });
    const resp = await nhost.auth.signIn({
      email,
      password,
    });

    if (resp.error) {
      console.error(resp.error);
      return;
    }

    console.log("Login successful!");
  })
  // Command: logout
  .command("logout", "Logout from AppShare")
  .action(async (_) => {
    await nhost.auth.signOut();
    console.log("Logout successful!");
  })
  // Command init
  .command("init", "Initialize a AppShare project")
  .action(async (_) => {
    const user = await getLoggedInUser();

    if (isProjectInitialized()) {
      const confirmed = await Confirm.prompt({
        message:
          "You already have a project initialized, do you want to overwrite it?",
        default: false,
      });
      if (!confirmed) {
        console.log("Aborting...");
        return;
      }
    }

    const resp = await client.endpoint(`/api/rest/user/{id}/apps`).method(
      "get",
    )({
      path: {
        id: user.id,
      },
    });
    if (!resp.ok) {
      console.error("Error fetching apps, try re-login");
      return;
    }

    const { apps } = resp.data;

    if (!apps || apps.length === 0) {
      console.error("You don't have any apps, create one first");
      return;
    }

    const app = await Select.prompt<typeof apps[0]>({
      message: "Select an app",
      options: apps.map((app) => ({
        name: app.name + " (" + app.id?.slice(0, 8) + ")",
        value: app,
      })),
    });

    if (!app.codebases || app.codebases.length === 0) {
      console.error(
        "You don't have any codebases in this app, create one first",
      );
      return;
    }

    const codebase = await Select.prompt<typeof app.codebases[0]>({
      message: "Select a codebase",
      options: app.codebases.map((codebase) => ({
        name: codebase.id as string,
        value: codebase,
      })),
    });

    projectConfig.set("appId", app.id);
    projectConfig.set("codebaseId", codebase.id);
    projectConfig.set("codeFileId", codebase.codeFileId);

    console.log("Project initialized!");
  })
  // Command Deploy
  .command("deploy", "Deploy your codebase")
  .arguments("[entrypoint:string] (default: index.ts)")
  .action(async (_, entrypoint) => {
    await getLoggedInUser();
    const projectConfig = getInitializedProjectConfig();

    // Bunding deno code
    if (!entrypoint) {
      entrypoint = "index.ts";
    }

    // Check if file exsists
    const fileStat = await getFileStat(entrypoint);
    if (!fileStat) {
      console.error("Entrypoint file does not exsist");
      return;
    }

    console.log("Bundling codebase...");
    const bundleResult = await bundle(entrypoint, {
      compilerOptions: {
        inlineSourceMap: true,
      },
    }).catch((err) => {
      console.error(err);
      console.error(
        "\n\nMake sure you are using pure deno libs (no npm libs) and you have a valid entrypoint file",
      );
      return;
    });
    if (!bundleResult) return;

    // Uploading bundle to server
    const file = new File([bundleResult.code], "bundle.js", {
      type: "application/javascript",
    });
    console.log("Uploading bundle to server...");
    const uploadResp = await fetchUpload(file);

    if (!uploadResp || uploadResp.error) {
      console.error("Error uploading bundle to server");
      console.error(uploadResp?.error);
      return;
    }
    
    // Updating app codebase
    console.log("Updating codebase code...");
    const req:
      paths["/api/rest/code-files/{id}"]["patch"]["parameters"] = {
        path: {
          id: projectConfig.codeFileId as string,
        },
        query: {
          fileFid: uploadResp.fileMetadata.id,
        },
      };
    const resp = await client.endpoint(`/api/rest/code-files/{id}`)
      .method("patch")(req);
    if (!resp.ok) {
      console.error("Error updating codebase");
      return;
    }

    console.log("Codebase deployed!");
  })
  .parse(Deno.args);
