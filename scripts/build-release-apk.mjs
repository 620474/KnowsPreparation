import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const version = process.argv[2];
const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(version ?? "");

if (!match) {
  throw new Error("Expected a stable semantic version, for example 1.2.3");
}

const [, major, minor, patch] = match.map(Number);
if (minor > 999 || patch > 999) {
  throw new Error("Android versionCode supports minor and patch values up to 999");
}

const versionCode = major * 1_000_000 + minor * 1_000 + patch;
if (versionCode < 1 || versionCode > 2_100_000_000) {
  throw new Error("Semantic version cannot be represented as an Android versionCode");
}

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const androidRoot = resolve(repositoryRoot, "apps/client/android");
const environment = {
  ...process.env,
  APP_VERSION_CODE: String(versionCode),
  APP_VERSION_NAME: version,
};

const run = (command, args, cwd) => {
  const result = spawnSync(command, args, {
    cwd,
    env: environment,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} exited with code ${result.status ?? "unknown"}`);
  }
};

run("npm", ["run", "android:sync"], repositoryRoot);
run(process.platform === "win32" ? "gradlew.bat" : "./gradlew", ["assembleDebug"], androidRoot);

process.stdout.write(`Built Android ${version} (${versionCode})\n`);
