import { client } from "./client.ts";
import { projectConfig } from "./config.ts";
import { bundle, Command, Confirm, EnumType, Secret, Select } from "./deps.ts";
import {
  auth,
  exitWithMessage,
  getFileStat,
  getInitializedProjectConfig,
  getLoggedInUser,
  isProjectInitialized,
} from "./utils.ts";
import { paths } from "./types/appshare-openapi.ts";
import { fetchUpload } from "./libs/upload.ts";
import { ValidationError } from "https://deno.land/x/cliffy@v1.0.0-rc.2/command/mod.ts";

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
  // Command: login
  .command("login", "Login to AppShare")
  .arguments("<email:string>")
  .action(async (_, email) => {
    const password: string = await Secret.prompt({
      message: `Password for ${email}: `,
      hidden: true,
    });
    const resp = await auth.signIn({
      email,
      password,
    });

    if (resp.error) {
      throw new ValidationError(resp.error.message);
    }

    exitWithMessage("Login successful!", 0);
  })
  // Command: logout
  .command("logout", "Logout from AppShare")
  .action(async (_) => {
    await auth.signOut();
    exitWithMessage("Logout successful!", 0);
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
      if (!confirmed) return exitWithMessage("Aborting...", 0);
    }

    const resp = await client.endpoint(`/api/rest/user/{id}/apps`).method(
      "get",
    )({
      path: {
        id: user.id,
      },
    });
    if (!resp.ok) exitWithMessage("Error fetching apps, try re-login");

    const { apps } = resp.data;

    if (!apps || apps.length === 0) {
      return exitWithMessage("You don't have any apps, create one first");
    }

    const app = await Select.prompt<typeof apps[0]>({
      message: "Select an app",
      options: apps.map((app) => ({
        name: app.name + " (" + app.id?.slice(0, 8) + ")",
        value: app,
      })),
    });

    if (!app.codebases || app.codebases.length === 0) {
      return exitWithMessage("You don't have any codebases, create one first");
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

    exitWithMessage("Project initialized!", 0);
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
    if (!fileStat) return exitWithMessage("Entrypoint file not found");

    console.log("Bundling codebase...");
    const bundleResult = await bundle(entrypoint, {
      compilerOptions: {
        inlineSourceMap: true,
      },
    }).catch((err) => {
      console.error(err);
      exitWithMessage(
        "Make sure you are using pure deno libs (no npm libs) and you have a valid entrypoint file",
      );
    });
    if (!bundleResult) return exitWithMessage("Error bundling codebase");

    // Uploading bundle to server
    const file = new File([bundleResult.code], "bundle.js", {
      type: "application/javascript",
    });
    console.log("Uploading bundle to server...");
    const uploadResp = await fetchUpload(file);

    if (!uploadResp || uploadResp.error) {
      console.error(uploadResp?.error);
      return exitWithMessage("Error uploading bundle to server");
    }

    // Updating app codebase
    console.log("Updating codebase code...");
    const req: paths["/api/rest/code-files/{id}"]["patch"]["parameters"] = {
      path: {
        id: projectConfig.codeFileId as string,
      },
      query: {
        fileFid: uploadResp.fileMetadata.id,
      },
    };
    const resp = await client.endpoint(`/api/rest/code-files/{id}`)
      .method("patch")(req);
    if (!resp.ok) return exitWithMessage("Error updating codebase code");

    exitWithMessage("Codebase deployed!", 0);
  })
  .parse(Deno.args);
