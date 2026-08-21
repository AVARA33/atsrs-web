import { cp, mkdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const androidRoot = path.resolve(scriptDirectory, "..");
const projectRoot = path.resolve(androidRoot, "..", "..");
const source = path.join(projectRoot, "dist");
const destination = path.join(androidRoot, "www");
const nodeExecutable = process.execPath;

function runBuild() {
  return new Promise((resolve, reject) => {
    const child = spawn(nodeExecutable, [path.join(projectRoot, "scripts", "build-cloudflare-pages.mjs")], {
      cwd: projectRoot,
      stdio: "inherit"
    });
    child.once("error", reject);
    child.once("exit", code => code === 0 ? resolve() : reject(new Error(`Web build exited with ${code}`)));
  });
}

await runBuild();
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true, force: true });

for (const publicOnlyFile of ["_headers", "robots.txt", "sitemap.xml", "llms.txt"]) {
  await unlink(path.join(destination, publicOnlyFile)).catch(error => {
    if (error.code !== "ENOENT") throw error;
  });
}

const indexPath = path.join(destination, "index.html");
const originalIndex = await readFile(indexPath, "utf8");
const marker = '<script src="js/atsrs-mobile-runtime.js"></script>';
if (!originalIndex.includes("</body>")) throw new Error("Android web bundle index is missing </body>");
const mobileIndex = originalIndex.includes(marker)
  ? originalIndex
  : originalIndex.replace("</body>", `${marker}\n</body>`);
await writeFile(indexPath, mobileIndex, "utf8");

await cp(path.join(androidRoot, "src", "atsrs-mobile-runtime.js"), path.join(destination, "js", "atsrs-mobile-runtime.js"));
console.log(`ATSRS Android web assets ready in ${destination}`);
