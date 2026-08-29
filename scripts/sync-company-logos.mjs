import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const linksSource = await readFile(path.join(root, "js", "company-directory-links.js"), "utf8");
const context = { window: {} };
vm.runInNewContext(linksSource, context);
const companies = context.window.atsrsCompanyDirectoryLinks || {};
const outputDir = path.join(root, "assets", "company-logos", "official");
await mkdir(outputDir, { recursive: true });

const timeoutMs = 9000;
const headers = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36",
  accept: "text/html,application/xhtml+xml,image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
};

function safeName(hostname) {
  return hostname.replace(/^www\./, "").replace(/[^a-z0-9.-]+/gi, "-").toLowerCase();
}

function extension(contentType, url) {
  const type = String(contentType || "").toLowerCase();
  if (type.includes("svg")) return ".svg";
  if (type.includes("png")) return ".png";
  if (type.includes("webp")) return ".webp";
  if (type.includes("jpeg") || type.includes("jpg")) return ".jpg";
  if (type.includes("icon") || type.includes("ico")) return ".ico";
  const match = new URL(url).pathname.match(/\.(svg|png|webp|jpe?g|ico)$/i);
  return match ? "." + match[1].toLowerCase().replace("jpeg", "jpg") : ".ico";
}

async function request(url, acceptHtml = false) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { redirect: "follow", headers, signal: controller.signal });
    if (!response.ok) throw new Error(String(response.status));
    if (acceptHtml) return { response, body: await response.text() };
    const contentType = response.headers.get("content-type") || "";
    const body = Buffer.from(await response.arrayBuffer());
    if (!body.length || body.length > 2_000_000) throw new Error("invalid image size");
    if (!/^image\//i.test(contentType) && !/\.(svg|png|webp|jpe?g|ico)(?:$|\?)/i.test(response.url)) {
      throw new Error("not an image");
    }
    return { response, body, contentType };
  } finally {
    clearTimeout(timer);
  }
}

function iconCandidates(html, pageUrl) {
  const candidates = [];
  for (const tag of String(html).match(/<link\b[^>]*>/gi) || []) {
    const rel = (tag.match(/\brel\s*=\s*["']([^"']+)["']/i) || [])[1] || "";
    const href = (tag.match(/\bhref\s*=\s*["']([^"']+)["']/i) || [])[1] || "";
    if (!/icon/i.test(rel) || !href || /^data:/i.test(href)) continue;
    try {
      const url = new URL(href, pageUrl).href;
      const sizes = (tag.match(/\bsizes\s*=\s*["']([^"']+)["']/i) || [])[1] || "";
      const numericSize = Math.max(0, ...Array.from(sizes.matchAll(/(\d+)x\d+/gi), match => Number(match[1])));
      const score = numericSize + (/apple-touch/i.test(rel) ? 80 : 0) + (/\.svg(?:$|\?)/i.test(url) ? 120 : 0) + (/\.png(?:$|\?)/i.test(url) ? 50 : 0);
      candidates.push({ url, score });
    } catch {}
  }
  return candidates.sort((a, b) => b.score - a.score).map(item => item.url);
}

async function fetchDomainLogo(website) {
  const start = new URL(website);
  let page = null;
  try {
    page = await request(start.href, true);
  } catch {}
  const finalUrl = page ? page.response.url : start.href;
  const candidates = [...new Set([
    ...iconCandidates(page && page.body, finalUrl),
    new URL("/favicon.ico", finalUrl).href,
  ])];
  let lastError;
  for (const candidate of candidates.slice(0, 8)) {
    try {
      const image = await request(candidate);
      return { ...image, url: image.response.url, host: new URL(finalUrl).hostname };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("no official icon");
}

const groups = new Map();
for (const [name, entry] of Object.entries(companies)) {
  try {
    const website = new URL(entry.website).href;
    const key = new URL(website).hostname.replace(/^www\./, "").toLowerCase();
    if (!groups.has(key)) groups.set(key, { website, names: [] });
    groups.get(key).names.push(name);
  } catch {}
}

const queue = Array.from(groups.entries());
const assets = {};
const failures = [];
let cursor = 0;

async function worker() {
  while (cursor < queue.length) {
    const [key, group] = queue[cursor++];
    try {
      const logo = await fetchDomainLogo(group.website);
      const fileExtension = extension(logo.contentType, logo.url);
      const file = safeName(key) + fileExtension;
      const body = fileExtension === ".svg"
        ? Buffer.from(logo.body.toString("utf8").replace(/[ \t]+$/gm, "").replace(/\r\n/g, "\n"))
        : logo.body;
      await writeFile(path.join(outputDir, file), body);
      const publicPath = "assets/company-logos/official/" + file;
      group.names.forEach(name => { assets[name] = publicPath; });
      process.stdout.write(".");
    } catch (error) {
      failures.push({ domain: key, companies: group.names, error: String(error && error.message || error) });
      process.stdout.write("x");
    }
  }
}

await Promise.all(Array.from({ length: 8 }, worker));
const ordered = Object.fromEntries(Object.entries(assets).sort(([a], [b]) => a.localeCompare(b)));
await writeFile(
  path.join(root, "js", "company-logo-assets.js"),
  "(function(){window.atsrsCompanyLogoAssets=" + JSON.stringify(ordered, null, 2) + ";})();\n",
);
await writeFile(
  path.join(outputDir, "sync-report.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), companies: Object.keys(companies).length, mapped: Object.keys(ordered).length, failedDomains: failures }, null, 2) + "\n",
);
console.log(`\nMapped ${Object.keys(ordered).length}/${Object.keys(companies).length} companies across ${groups.size - failures.length}/${groups.size} official domains.`);
