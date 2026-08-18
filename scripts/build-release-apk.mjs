import { spawnSync } from "node:child_process";
import { X509Certificate } from "node:crypto";
import { existsSync, readdirSync } from "node:fs";
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
const apkPath = resolve(androidRoot, "app/build/outputs/apk/release/app-release.apk");
const keystorePath = process.env.ANDROID_KEYSTORE_PATH;
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

if (process.env.CI && !keystorePath) {
  throw new Error("ANDROID_KEYSTORE_PATH is required for CI release builds");
}

run("npm", ["run", "android:sync"], repositoryRoot);
run(process.platform === "win32" ? "gradlew.bat" : "./gradlew", ["assembleRelease"], androidRoot);

if (keystorePath) {
  if (!existsSync(keystorePath)) throw new Error("Android signing keystore was not found");
  const androidHome = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
  if (!androidHome) throw new Error("ANDROID_HOME is required to verify the APK signature");
  const buildToolsRoot = resolve(androidHome, "build-tools");
  const buildToolsVersion = readdirSync(buildToolsRoot)
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
    .at(-1);
  if (!buildToolsVersion) throw new Error("Android build-tools were not found");
  const apksigner = resolve(
    buildToolsRoot,
    buildToolsVersion,
    process.platform === "win32" ? "apksigner.bat" : "apksigner",
  );
  const verification = spawnSync(apksigner, ["verify", "--print-certs", apkPath], {
    cwd: repositoryRoot,
    env: environment,
    encoding: "utf8",
  });
  if (verification.error) throw verification.error;
  if (verification.status !== 0) {
    process.stderr.write(verification.stderr);
    throw new Error("APK signature verification failed");
  }
  const keytool = spawnSync(
    "keytool",
    [
      "-exportcert",
      "-keystore",
      keystorePath,
      "-storepass",
      process.env.ANDROID_KEYSTORE_PASSWORD ?? "android",
      "-alias",
      process.env.ANDROID_KEY_ALIAS ?? "androiddebugkey",
    ],
    { cwd: repositoryRoot, env: environment },
  );
  if (keytool.error) throw keytool.error;
  if (keytool.status !== 0) throw new Error("Could not read the Android signing certificate");
  const keystoreDigest = new X509Certificate(keytool.stdout)
    .fingerprint256.replaceAll(":", "")
    .toLowerCase();
  const apkDigest = /certificate SHA-256 digest:\s*([a-f0-9]+)/i.exec(
    verification.stdout,
  )?.[1]?.toLowerCase();
  if (!apkDigest || apkDigest !== keystoreDigest) {
    throw new Error("APK was not signed with ANDROID_KEYSTORE_PATH");
  }
  process.stdout.write(verification.stdout);
}

process.stdout.write(`Built Android ${version} (${versionCode})\n`);
