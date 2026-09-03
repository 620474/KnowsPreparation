import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import process from "node:process";

const directory = fileURLToPath(new URL("../apps/client/dist/", import.meta.url));
const files = await readdir(directory, { recursive: true });
const sizes = await Promise.all(files.map(async (file) => {
  const path = join(directory, file);
  const details = await stat(path);
  return details.isFile() ? details.size : 0;
}));
const totalBytes = sizes.reduce((sum, size) => sum + size, 0);
const limitBytes = 2_750_000;
if (totalBytes > limitBytes) {
  throw new Error(`Client bundle ${totalBytes} bytes exceeds ${limitBytes} byte budget`);
}
process.stdout.write(`Client bundle: ${totalBytes} / ${limitBytes} bytes\n`);
