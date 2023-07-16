// This is deno (typescript) file for a cli
// This file is used to load config file from cwd (.appshare.yaml) and save it to the config object
// the output should return a config object with methods to get, set, delete, and clear
// The config should also accept a file path to load and save to
import { parse, stringify } from "https://deno.land/std@0.194.0/yaml/mod.ts";

class Config<T extends Record<string, unknown>> {
  private config: T = {} as T;
  constructor(private readonly path: string) {
    // load config from path
    this.loadConfig();
  }

  private loadConfig() {
    // loading config from yaml file (Deno)
    try {
      const config = Deno.readTextFileSync(this.path);
      this.config = config ? parse(config) as T : {} as T;
    } catch (_) {
      this.config = {} as T;
    }
  }

  private saveConfig() {
    // saving config to yaml file (Deno)
    const config = stringify(this.config);
    Deno.writeTextFileSync(this.path, config);
  }

  get<K extends keyof T>(key: K): T[K] {
    return this.config[key];
  }

  set<K extends keyof T>(key: K, value: T[K]) {
    this.config[key] = value;
    this.saveConfig();
  }

  delete<K extends keyof T>(key: K) {
    delete this.config[key];
    this.saveConfig();
  }

  clear() {
    this.config = {} as T;
    this.saveConfig();
  }

  getRaw() {
    return this.config;
  }

  setRaw(config: T) {
    this.config = config;
    this.saveConfig();
  }
}

export const projectConfig = new Config<{
  appId?: string;
  codebaseId?: string;
  codeFileId?: string;
}>(".appshare.yaml");
