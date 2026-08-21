export type DateEvidence = {
  field: "issue_date" | "expiry_date";
  source_label: string;
  raw_text: string;
  normalized_value: string;
  model_normalized_value?: string;
};

type ExtractedDocument = Record<string, unknown> & {
  issue_date?: unknown;
  expiry_date?: unknown;
  expiry_not_applicable?: unknown;
  warnings?: unknown;
  date_evidence?: unknown;
  validity_duration?: unknown;
};

const pad = (value: number) => String(value).padStart(2, "0");
const iso = (year: number, month: number, day: number) => `${String(year).padStart(4, "0")}-${pad(month)}-${pad(day)}`;
const validDate = (year: number, month: number, day: number) => {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

export function normalizeIso(value: unknown) {
  const match = String(value ?? "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return validDate(year, month, day) ? iso(year, month, day) : "";
}

export function parseRawDate(value: unknown) {
  const raw = String(value ?? "").trim();
  const normalized = normalizeIso(raw);
  if (normalized) return { raw, normalized, ambiguous: false, candidates: [normalized] };
  const match = raw.match(/(?:^|\D)(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})(?:\D|$)/);
  if (!match) return { raw, normalized: "", ambiguous: false, candidates: [] as string[] };
  const first = Number(match[1]);
  const second = Number(match[2]);
  const year = Number(match[3]);
  const candidates: string[] = [];
  if (validDate(year, second, first)) candidates.push(iso(year, second, first));
  if (validDate(year, first, second)) {
    const monthFirst = iso(year, first, second);
    if (!candidates.includes(monthFirst)) candidates.push(monthFirst);
  }
  return { raw, normalized: candidates.length === 1 ? candidates[0] : "", ambiguous: candidates.length > 1, candidates };
}

export function addDuration(issue: unknown, value: unknown, unit: unknown) {
  const normalized = normalizeIso(issue);
  const amount = Number(value);
  const kind = String(unit ?? "").toLowerCase();
  if (!normalized || !Number.isInteger(amount) || amount < 0 || !["days", "months", "years"].includes(kind)) return "";
  const parts = normalized.split("-").map(Number);
  if (kind === "days") {
    const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + amount));
    return iso(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  }
  const months = kind === "years" ? amount * 12 : amount;
  const absolute = parts[0] * 12 + parts[1] - 1 + months;
  const targetYear = Math.floor(absolute / 12);
  const targetMonth = absolute % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return iso(targetYear, targetMonth + 1, Math.min(parts[2], lastDay));
}

export function validateExtractedDocumentDates(source: ExtractedDocument) {
  const output: ExtractedDocument = { ...source };
  const warnings = Array.isArray(source.warnings) ? source.warnings.filter(Boolean).map(String) : [];
  const evidence: DateEvidence[] = Array.isArray(source.date_evidence)
    ? source.date_evidence.filter((item): item is Record<string, unknown> => !!item && typeof item === "object").map((item) => ({
      field: String(item.field ?? "") as DateEvidence["field"],
      source_label: String(item.source_label ?? ""),
      raw_text: String(item.raw_text ?? ""),
      normalized_value: String(item.normalized_value ?? ""),
      model_normalized_value: String(item.model_normalized_value ?? ""),
    }))
    : [];
  const issues: Array<Record<string, unknown>> = [];
  const conflicts: Array<Record<string, unknown>> = [];
  const blocked: string[] = [];
  const priorValidation = source.date_validation && typeof source.date_validation === "object" ? source.date_validation as Record<string, unknown> : null;
  const priorBlocked = priorValidation && Array.isArray(priorValidation.blocked_fields) ? priorValidation.blocked_fields.map(String) : [];
  if (priorValidation && Array.isArray(priorValidation.issues)) issues.push(...priorValidation.issues as Array<Record<string, unknown>>);
  if (priorValidation && Array.isArray(priorValidation.conflicts)) conflicts.push(...priorValidation.conflicts as Array<Record<string, unknown>>);
  output.issue_date = normalizeIso(source.issue_date);
  output.expiry_date = normalizeIso(source.expiry_date);
  for (const field of ["issue_date", "expiry_date"] as const) {
    if (source[field] && !output[field]) issues.push({ field, code: "invalid_date", message: `The ${field.replace("_", " ")} is not a valid ISO calendar date.` });
  }
  for (const item of evidence) {
    if (item.field !== "issue_date" && item.field !== "expiry_date") continue;
    const parsed = parseRawDate(item.raw_text);
    const claimed = normalizeIso(item.model_normalized_value || item.normalized_value);
    item.model_normalized_value = claimed;
    item.normalized_value = parsed.normalized;
    if (parsed.ambiguous) issues.push({ field: item.field, code: "ambiguous_numeric_date", raw_text: item.raw_text, candidates: parsed.candidates, message: "Numeric date evidence can be read as either DD.MM.YYYY or MM.DD.YYYY." });
    if (claimed && parsed.candidates.length && !parsed.candidates.includes(claimed)) conflicts.push({ field: item.field, code: "evidence_normalization_conflict", model_value: claimed, raw_text: item.raw_text, candidates: parsed.candidates });
  }
  for (const field of ["issue_date", "expiry_date"] as const) {
    const values = [...new Set(evidence.filter((item) => item.field === field && item.normalized_value).map((item) => item.normalized_value))];
    if (values.length > 1) conflicts.push({ field, code: `conflicting_${field}_evidence`, model_value: output[field], evidence_values: values });
    else if (values.length === 1 && output[field] && output[field] !== values[0]) conflicts.push({ field, code: "explicit_evidence_conflict", model_value: output[field], evidence_value: values[0] });
    else if (values.length === 1 && !output[field]) output[field] = values[0];
  }
  const durationValue = source.validity_duration && typeof source.validity_duration === "object" ? source.validity_duration as Record<string, unknown> : null;
  const duration = durationValue ? { value: Number(durationValue.value), unit: String(durationValue.unit ?? "").toLowerCase(), raw_text: String(durationValue.raw_text ?? "") } : null;
  const derived = duration ? addDuration(output.issue_date, duration.value, duration.unit) : "";
  if (derived && !priorBlocked.includes("expiry_date")) {
    if (output.expiry_date && output.expiry_date !== derived) conflicts.push({ field: "expiry_date", code: "duration_conflict", model_value: output.expiry_date, expected_value: derived, raw_text: duration?.raw_text });
    else if (!output.expiry_date) output.expiry_date = derived;
  }
  if (issues.some((item) => item.field === "expiry_date" && item.code === "ambiguous_numeric_date") && !derived) blocked.push("expiry_date");
  for (const field of priorBlocked) if (!blocked.includes(field)) blocked.push(field);
  for (const conflict of conflicts) if (!blocked.includes(String(conflict.field))) blocked.push(String(conflict.field));
  if (blocked.includes("expiry_date")) {
    output.expiry_date = "";
    output.expiry_not_applicable = false;
  }
  if (blocked.includes("issue_date")) output.issue_date = "";
  if (issues.length || conflicts.length) warnings.push("Date evidence needs manual review. Conflicting or ambiguous dates were not autofilled.");
  output.warnings = [...new Set(warnings)];
  output.date_evidence = evidence;
  output.date_validation = { status: blocked.length ? "review_required" : issues.length ? "review_recommended" : "accepted", blocked_fields: blocked, issues, conflicts, derived_expiry_date: derived, original_values: { issue_date: String(source.issue_date ?? ""), expiry_date: String(source.expiry_date ?? "") } };
  return output;
}
