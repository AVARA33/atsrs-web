export const LOW_RISK_PATHS = [
  /^css\/(?:jobs-prototype|talent-directory|projects|documents|references|dashboard|account|cv-generator)\.css$/,
  /^tests\/fixtures\/(?:jobs-prototype|personal-workspace-surface|workspace-control-v522|workspace-surface-v519)-harness\.html$/,
  /^tests\/(?:jobs-prototype|jobs-pagination|projects-workflow|references-visual-regression|workspace-control-standard-v522|workspace-surface-standard-v519)\.test\.cjs$/,
];

export const OWNER_APPROVAL_PATHS = [
  /^js\/(?:jobs-prototype|talent-directory|projects|documents|references|dashboard|account|cv-generator)\.js$/,
  /^index\.html$/,
];

export const PROTECTED_PATHS = [
  /^\.env(?:\.|$)/,
  /^\.github\//,
  /^supabase\//,
  /^scripts\//,
  /^docs\//,
  /^vendor\//,
  /^assets\//,
  /^package(?:-lock)?\.json$/,
  /^_headers$/,
  /^CNAME$/,
  /^js\/(?:auth|storage|server-data|login|maintenance-guard|account-security-live|normalized-.+|stable-.+|workspace-command-policy|billing-.+)\.js$/,
  /^css\/(?:base|theme|theme-palette-v508|shell-polish|workspace-.+|account-security-live|maintenance)\.css$/,
  /(?:secret|credential|private[-_]?key|service[-_]?role)/i,
];

export const SAFE_PREVIEW_ENTRIES = new Set([
  "tests/fixtures/jobs-prototype-harness.html",
  "tests/fixtures/personal-workspace-surface-harness.html",
  "tests/fixtures/workspace-control-v522-harness.html",
  "tests/fixtures/workspace-surface-v519-harness.html",
]);

export type PathClass = "LOW_RISK_MINOR_FIX" | "OWNER_APPROVAL_REQUIRED" | "DENIED";

export function normalizeRepoPath(input: unknown): string {
  const value = String(input ?? "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!value || value.length > 240 || value.includes("\0") || value.split("/").some((part) => part === ".." || part === ".")) {
    return "";
  }
  return value;
}

export function classifyPath(input: unknown): PathClass {
  const path = normalizeRepoPath(input);
  if (!path || PROTECTED_PATHS.some((rule) => rule.test(path))) return "DENIED";
  if (LOW_RISK_PATHS.some((rule) => rule.test(path))) return "LOW_RISK_MINOR_FIX";
  if (OWNER_APPROVAL_PATHS.some((rule) => rule.test(path))) return "OWNER_APPROVAL_REQUIRED";
  return "DENIED";
}

export function classifyFiles(files: unknown[]): PathClass {
  let result: PathClass = "LOW_RISK_MINOR_FIX";
  for (const file of files) {
    const classification = classifyPath(file);
    if (classification === "DENIED") return "DENIED";
    if (classification === "OWNER_APPROVAL_REQUIRED") result = classification;
  }
  return result;
}

export function isDeveloperBranch(value: unknown): boolean {
  return /^developer-editor\/[a-z0-9][a-z0-9._/-]{2,180}$/.test(String(value ?? ""));
}

export function publicPolicy() {
  return {
    low_risk: [
      "css/{jobs-prototype,talent-directory,projects,documents,references,dashboard,account,cv-generator}.css",
      "approved tests/fixtures only",
      "approved focused *.test.cjs only",
    ],
    owner_approval: [
      "js/{jobs-prototype,talent-directory,projects,documents,references,dashboard,account,cv-generator}.js",
      "index.html",
    ],
    protected: [
      ".env*", ".github/**", "supabase/**", "scripts/**", "docs/**", "vendor/**", "assets/**",
      "package*.json", "_headers", "CNAME", "auth/storage/server/security JS", "global/base/theme/workspace CSS",
      "any path containing secret/credential/private-key/service-role",
    ],
  };
}
