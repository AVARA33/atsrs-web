import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "jsr:@supabase/supabase-js@2/cors";

const OPENAI_MODEL = "gpt-5-mini";
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type ScanRequest = {
  filename?: unknown;
  mime_type?: unknown;
  file_data?: unknown;
  consent_accepted?: unknown;
  consent_version?: unknown;
};

type OpenAIResponse = {
  status?: string;
  incomplete_details?: { reason?: string };
  output_text?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string; refusal?: string }>;
  }>;
  error?: { message?: string };
};

type ScanQuota = {
  plan: "free" | "bronze" | "silver" | "titan" | "gold";
  used: number;
  scan_limit: number;
  remaining: number;
  allowed: boolean;
  reason: "reserved" | "monthly_limit" | "cooldown";
};

const extractionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    document_type: { type: "string" },
    document_number: { type: "string" },
    country_authority: { type: "string" },
    provider: { type: "string" },
    issue_date: { type: "string" },
    expiry_date: { type: "string" },
    expiry_not_applicable: { type: "boolean" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: [
    "document_type",
    "document_number",
    "country_authority",
    "provider",
    "issue_date",
    "expiry_date",
    "expiry_not_applicable",
    "confidence",
    "warnings",
  ],
} as const;

function allowedOrigin(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  if (origin === "https://atsrs.com" || origin === "https://www.atsrs.com") return origin;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return "https://atsrs.com";
}

function responseHeaders(req: Request) {
  return {
    ...corsHeaders,
    "Access-Control-Allow-Origin": allowedOrigin(req),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin",
  };
}

function json(req: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders(req) });
}

function getPublishableKey() {
  const keys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (keys) {
    try {
      const parsed = JSON.parse(keys) as Record<string, string>;
      if (parsed.default) return parsed.default;
    } catch {
      // Fall back to the legacy key while existing projects migrate.
    }
  }
  return Deno.env.get("SUPABASE_ANON_KEY") ?? "";
}

function estimatedBytes(dataUrl: string) {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return Number.POSITIVE_INFINITY;
  const base64 = dataUrl.slice(comma + 1).replace(/\s/g, "");
  return Math.floor((base64.length * 3) / 4);
}

function outputText(value: OpenAIResponse) {
  if (typeof value.output_text === "string" && value.output_text.trim()) return value.output_text;
  for (const item of value.output ?? []) {
    if (item.type !== "message") continue;
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  return "";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: responseHeaders(req) });
  if (req.method !== "POST") return json(req, 405, { error: "Method not allowed." });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const publishableKey = getPublishableKey();
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const openAiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
  if (!supabaseUrl || !publishableKey || !serviceRoleKey || !openAiKey) {
    return json(req, 500, { error: "Server configuration is incomplete." });
  }

  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) return json(req, 401, { error: "Sign in before scanning a document." });

  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return json(req, 401, { error: "Your session is no longer valid. Sign in again." });

  let body: ScanRequest;
  try {
    body = await req.json() as ScanRequest;
  } catch {
    return json(req, 400, { error: "Invalid request body." });
  }

  const filename = typeof body.filename === "string" ? body.filename.slice(0, 180) : "document";
  const mimeType = typeof body.mime_type === "string" ? body.mime_type.toLowerCase() : "";
  const fileData = typeof body.file_data === "string" ? body.file_data : "";
  if (body.consent_accepted !== true || body.consent_version !== "2026-07-21") {
    return json(req, 400, { error: "Confirm the AI document-processing notice before scanning." });
  }
  if (!ALLOWED_MIME_TYPES.has(mimeType)) return json(req, 415, { error: "Use a PDF, JPG, PNG, or WebP file." });
  if (!fileData.startsWith(`data:${mimeType};base64,`)) return json(req, 400, { error: "The document data is invalid." });
  if (estimatedBytes(fileData) > MAX_FILE_BYTES) return json(req, 413, { error: "The document is larger than 15 MB." });

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: quotaRows, error: quotaError } = await supabaseAdmin.rpc("atsrs_reserve_ai_scan", {
    p_user_id: authData.user.id,
  });
  const quota = Array.isArray(quotaRows) ? quotaRows[0] as ScanQuota | undefined : undefined;
  if (quotaError || !quota) {
    console.error("ATSRS AI quota reservation failed", { requestUser: authData.user.id, quotaError });
    return json(req, 500, { error: "Your AI Scan allowance could not be checked. Try again." });
  }
  if (!quota.allowed) {
    if (quota.reason === "cooldown") {
      return json(req, 429, {
        error: "Please wait a few seconds before starting another AI Scan.",
        quota,
      });
    }
    return json(req, 429, {
      error: `Your ${quota.plan.toUpperCase()} plan includes ${quota.scan_limit} AI scans per month. The monthly limit has been reached.`,
      quota,
    });
  }

  const fileContent = mimeType === "application/pdf"
    ? { type: "input_file", filename, file_data: fileData }
    : { type: "input_image", image_url: fileData, detail: "high" };

  const prompt = [
    "Extract document metadata for a professional compliance document.",
    "Read only information visibly present in the supplied file. Never guess or invent values.",
    "Use the exact certificate or document title where possible.",
    "Return dates as YYYY-MM-DD. If a date cannot be read confidently, return an empty string.",
    "issue_date means awarded, issued, completed, or valid-from date.",
    "expiry_date means expires, expiry, valid-until, or valid-to date. Do not swap issue and expiry dates.",
    "Set expiry_not_applicable true only when the document explicitly has no expiry or lifetime validity.",
    "Put uncertainty, conflicting dates, unreadable text, or suspected OCR problems in warnings.",
  ].join(" ");

  let aiResponse: Response;
  try {
    aiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            fileContent,
          ],
        }],
        text: {
          format: {
            type: "json_schema",
            name: "atsrs_document_metadata",
            strict: true,
            schema: extractionSchema,
          },
        },
        store: false,
        reasoning: { effort: "minimal" },
        max_output_tokens: 2500,
      }),
    });
  } catch {
    return json(req, 502, { error: "The AI service could not be reached. Try again." });
  }

  let aiBody: OpenAIResponse;
  try {
    aiBody = await aiResponse.json() as OpenAIResponse;
  } catch {
    return json(req, 502, { error: "The AI service returned an unreadable response." });
  }
  if (!aiResponse.ok) {
    const message = aiResponse.status === 429
      ? "The AI scan limit was reached. Try again shortly."
      : "The AI service could not process this document.";
    console.error("OpenAI scan request failed", { status: aiResponse.status, requestUser: authData.user.id, providerMessage: aiBody.error?.message?.slice(0, 160) });
    return json(req, 502, { error: message });
  }

  const inputTokens = Math.max(0, Number(aiBody.usage?.input_tokens ?? 0));
  const outputTokens = Math.max(0, Number(aiBody.usage?.output_tokens ?? 0));
  const estimatedCostUsd = (inputTokens * 0.25 / 1_000_000) +
    (outputTokens * 2.00 / 1_000_000);
  const { error: usageError } = await supabaseAdmin
    .from("atsrs_ai_usage")
    .insert({
      user_id: authData.user.id,
      event_type: "scan_document",
      model: OPENAI_MODEL,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost_usd: estimatedCostUsd,
    });
  if (usageError) {
    console.error("ATSRS AI usage metric could not be stored", {
      requestUser: authData.user.id,
      usageError,
    });
  }

  const text = outputText(aiBody);
  if (!text && aiBody.status === "incomplete") {
    console.error("OpenAI scan response incomplete", {
      requestUser: authData.user.id,
      reason: aiBody.incomplete_details?.reason ?? "unknown",
    });
    return json(req, 502, { error: "The AI scan did not finish. Please try once more." });
  }
  try {
    const extracted = JSON.parse(text) as Record<string, unknown>;
    return json(req, 200, { document: extracted, model: OPENAI_MODEL, quota });
  } catch {
    return json(req, 502, { error: "The AI result could not be validated. Try scanning again." });
  }
});
