import { cp, mkdir, readFile, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const outputDirectory = path.resolve(projectRoot, "dist");

const publicFiles = [
  "_headers",
  "index.html",
  "contact.html",
  "qr-upload.html",
  "pricing.html",
  "billing-terms.html",
  "refund-policy.html",
  "data-protection.html",
  "terms.html",
  "privacy.html",
  "data-deletion.html",
  "security.html",
  "robots.txt",
  "llms.txt",
  "sitemap.xml"
];

const publicDirectories = ["assets", "css", "download", "js", "vendor"];
const forbiddenOutputEntries = [
  ".git",
  ".github",
  "CNAME",
  "docs",
  "scripts",
  "supabase",
  "tests"
];

const oauthProductionContract = Object.freeze({
  canonicalOrigin: "https://atsrs.com",
  supabaseOrigin: "https://hwtjuqyxzivymofamwxl.supabase.co",
  googleCallback: "https://hwtjuqyxzivymofamwxl.supabase.co/auth/v1/callback",
  privacyUrl: "https://atsrs.com/privacy.html",
  termsUrl: "https://atsrs.com/terms.html"
});

function assertSafeOutputDirectory() {
  const relativeOutput = path.relative(projectRoot, outputDirectory);
  if (relativeOutput !== "dist" || relativeOutput.startsWith("..") || path.isAbsolute(relativeOutput)) {
    throw new Error(`Refusing to replace unsafe output directory: ${outputDirectory}`);
  }
}

async function assertSourceExists(relativePath) {
  const sourcePath = path.resolve(projectRoot, relativePath);
  const relativeSource = path.relative(projectRoot, sourcePath);
  if (relativeSource.startsWith("..") || path.isAbsolute(relativeSource)) {
    throw new Error(`Source escaped the project root: ${relativePath}`);
  }
  await stat(sourcePath);
  return sourcePath;
}

async function copyPublicEntry(relativePath) {
  const sourcePath = await assertSourceExists(relativePath);
  const destinationPath = path.resolve(outputDirectory, relativePath);
  await cp(sourcePath, destinationPath, { recursive: true, force: true });
}

async function validateOAuthProductionSource() {
  const storage = await readFile(path.join(projectRoot, "js", "storage.js"), "utf8");
  const cname = (await readFile(path.join(projectRoot, "CNAME"), "utf8")).trim();
  const privacy = await readFile(path.join(projectRoot, "privacy.html"), "utf8");
  const terms = await readFile(path.join(projectRoot, "terms.html"), "utf8");

  const requiredSourceFragments = [
    `const SUPABASE_URL="${oauthProductionContract.supabaseOrigin}"`,
    `const APP_URL="${oauthProductionContract.canonicalOrigin}/"`,
    "provider:'google'",
    "prompt:'select_account'"
  ];
  for (const fragment of requiredSourceFragments) {
    if (!storage.includes(fragment)) {
      throw new Error(`OAuth production contract changed or is missing: ${fragment}`);
    }
  }
  if (cname !== "atsrs.com") {
    throw new Error(`OAuth production contract requires CNAME atsrs.com, received: ${cname || "empty"}`);
  }
  if (!/<h1>Privacy Notice<\/h1>/i.test(privacy)) {
    throw new Error(`Google OAuth privacy URL is no longer backed by the expected public page: ${oauthProductionContract.privacyUrl}`);
  }
  if (!/<h1>Terms of Use<\/h1>/i.test(terms)) {
    throw new Error(`Google OAuth terms URL is no longer backed by the expected public page: ${oauthProductionContract.termsUrl}`);
  }
  if (storage.includes("hwtjuqyxziyvmofamwxl.supabase.co")) {
    throw new Error("Deprecated mistyped Supabase OAuth domain reintroduced");
  }
}

async function listFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = path.join(prefix, entry.name);
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(absolutePath, relativePath));
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }
  return files;
}

async function validateOutput() {
  const topLevelEntries = await readdir(outputDirectory);
  for (const forbiddenEntry of forbiddenOutputEntries) {
    if (topLevelEntries.includes(forbiddenEntry)) {
      throw new Error(`Forbidden deployment entry detected: ${forbiddenEntry}`);
    }
  }

  const outputFiles = await listFiles(outputDirectory);
  if (!outputFiles.includes("index.html")) {
    throw new Error("Cloudflare output is missing index.html");
  }
  if (!outputFiles.includes("contact.html")) {
    throw new Error("Cloudflare output is missing contact.html");
  }

  const secretPattern = /(?:service[_-]?role|supabase[_-]?service|BEGIN [A-Z ]*PRIVATE KEY)/i;
  for (const relativePath of outputFiles) {
    if (!/\.(?:html|css|js|json|txt)$/i.test(relativePath)) continue;
    const contents = await readFile(path.join(outputDirectory, relativePath), "utf8");
    if (secretPattern.test(contents)) {
      throw new Error(`Potential server secret found in deployment output: ${relativePath}`);
    }
  }

  return outputFiles;
}

async function build() {
  assertSafeOutputDirectory();
  await validateOAuthProductionSource();
  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });

  for (const publicFile of publicFiles) await copyPublicEntry(publicFile);
  for (const publicDirectory of publicDirectories) await copyPublicEntry(publicDirectory);

  const outputFiles = await validateOutput();
  console.log(`Cloudflare Pages output ready: ${outputFiles.length} files in ${outputDirectory}`);
}

await build();
