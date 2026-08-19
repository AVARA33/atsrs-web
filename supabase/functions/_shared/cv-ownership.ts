export type CvIdentity = {
  full_name?: unknown;
  email?: unknown;
  phone?: unknown;
  confidence?: unknown;
};

export type AccountIdentity = {
  fullName: string;
  emails: string[];
  phones: string[];
};

export type OwnershipDecision = {
  result: "verified" | "probable" | "uncertain" | "mismatch";
  allow: boolean;
  reason: "name_and_contact_match" | "name_match" | "contact_match" | "identity_missing" | "identity_mismatch";
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeName(value: unknown) {
  return text(value)
    .toLocaleLowerCase("en-US")
    .replace(/[əә]/g, "e")
    .replace(/[ı]/g, "i")
    .replace(/[ş]/g, "s")
    .replace(/[ğ]/g, "g")
    .replace(/[ç]/g, "c")
    .replace(/[ö]/g, "o")
    .replace(/[ü]/g, "u")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function nameTokens(value: unknown) {
  return normalizeName(value).split(" ").filter(Boolean);
}

function editDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    let diagonal = previous[0];
    previous[0] = row;
    for (let column = 1; column <= right.length; column += 1) {
      const above = previous[column];
      previous[column] = Math.min(
        previous[column] + 1,
        previous[column - 1] + 1,
        diagonal + (left[row - 1] === right[column - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[right.length];
}

function tokenCompatible(left: string, right: string) {
  if (!left || !right) return false;
  if (left === right) return true;
  if ((left.length === 1 || right.length === 1) && left[0] === right[0]) return true;
  if (Math.min(left.length, right.length) < 4) return false;
  return 1 - (editDistance(left, right) / Math.max(left.length, right.length)) >= 0.8;
}

function namesCompatible(accountName: string, cvName: string) {
  const account = nameTokens(accountName);
  const cv = nameTokens(cvName);
  if (!account.length || !cv.length) return false;
  if (account.length === 1) return cv.some((token) => tokenCompatible(account[0], token));
  const required = [account[0], account[account.length - 1]];
  return required.every((token) => cv.some((candidate) => tokenCompatible(token, candidate)));
}

function anyNameOverlap(accountName: string, cvName: string) {
  const account = nameTokens(accountName);
  const cv = nameTokens(cvName);
  return account.some((token) => token.length > 1 && cv.some((candidate) => tokenCompatible(token, candidate)));
}

function normalizeEmail(value: unknown) {
  return text(value).toLocaleLowerCase("en-US").replace(/^mailto:/, "");
}

function normalizePhone(value: unknown) {
  return text(value).replace(/\D/g, "");
}

function phoneMatches(left: string, right: string) {
  if (!left || !right) return false;
  const width = Math.min(10, left.length, right.length);
  return width >= 7 && left.slice(-width) === right.slice(-width);
}

export function verifyCvOwnership(account: AccountIdentity, extracted: CvIdentity): OwnershipDecision {
  const cvName = text(extracted.full_name);
  const cvEmail = normalizeEmail(extracted.email);
  const cvPhone = normalizePhone(extracted.phone);
  const accountEmails = account.emails.map(normalizeEmail).filter(Boolean);
  const accountPhones = account.phones.map(normalizePhone).filter(Boolean);
  const nameMatch = namesCompatible(account.fullName, cvName);
  const emailMatch = !!cvEmail && accountEmails.includes(cvEmail);
  const phoneMatch = !!cvPhone && accountPhones.some((phone) => phoneMatches(phone, cvPhone));
  const contactMatch = emailMatch || phoneMatch;
  const accountHasFullName = nameTokens(account.fullName).length >= 2;

  if (nameMatch && contactMatch) {
    return { result: "verified", allow: true, reason: "name_and_contact_match" };
  }
  if (nameMatch && accountHasFullName) {
    return { result: "probable", allow: true, reason: "name_match" };
  }
  if (contactMatch && !cvName) {
    return { result: "probable", allow: true, reason: "contact_match" };
  }

  const confidence = text(extracted.confidence).toLowerCase();
  const cvHasFullName = nameTokens(cvName).length >= 2;
  const clearDifferentName = accountHasFullName && cvHasFullName && !anyNameOverlap(account.fullName, cvName);
  if (clearDifferentName && (confidence === "high" || !!cvEmail || !!cvPhone)) {
    return { result: "mismatch", allow: false, reason: "identity_mismatch" };
  }
  return { result: "uncertain", allow: false, reason: "identity_missing" };
}
