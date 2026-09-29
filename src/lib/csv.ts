/** Minimal RFC 4180 CSV parser (quotes, escaped quotes, newlines in quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; } else q = false;
      } else cell += c;
    } else if (c === '"') q = true;
    else if (c === "," || c === ";" || c === "\t") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim()));
}

export const LEAD_FIELDS = ["company", "contact_name", "contact_email", "role", "industry", "location", "website", "notes", "stage"] as const;
export type LeadField = (typeof LEAD_FIELDS)[number];

const ALIASES: Record<LeadField, string[]> = {
  company: ["company", "company name", "organization", "organisation", "account", "business"],
  contact_name: ["contact", "contact name", "name", "full name", "first name", "person"],
  contact_email: ["email", "e-mail", "contact email", "email address"],
  role: ["role", "title", "job title", "position"],
  industry: ["industry", "sector", "vertical"],
  location: ["location", "city", "country", "region", "address"],
  website: ["website", "url", "domain", "site", "web"],
  notes: ["notes", "note", "comments", "description"],
  stage: ["stage", "status", "pipeline stage", "lead status"],
};

export function guessMapping(headers: string[]): Record<LeadField, number> {
  const norm = headers.map((h) => h.trim().toLowerCase().replace(/[_-]+/g, " "));
  const out = {} as Record<LeadField, number>;
  for (const f of LEAD_FIELDS) out[f] = norm.findIndex((h) => ALIASES[f].includes(h));
  return out;
}
