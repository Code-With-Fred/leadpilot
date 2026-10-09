// Token encryption (AES-GCM) and signed OAuth state (HMAC-SHA256), Web Crypto only so it
// runs on the Cloudflare worker runtime.
const enc = new TextEncoder();
const dec = new TextDecoder();

export function b64std(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export const b64url = (bytes: Uint8Array) => b64std(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}

export const utf8ToB64url = (s: string) => b64url(enc.encode(s));
export const b64urlToUtf8 = (s: string) => dec.decode(fromB64url(s));

function secretBytes(): Uint8Array<ArrayBuffer> {
  const raw = process.env["EMAIL_TOKEN_KEY"];
  if (!raw) throw new Error("EMAIL_TOKEN_KEY is not set");
  const bytes = fromB64url(raw.trim());
  if (bytes.length !== 32) throw new Error("EMAIL_TOKEN_KEY must be 32 bytes, base64 encoded");
  return bytes;
}

export const emailCryptoConfigured = () => {
  try {
    secretBytes();
    return true;
  } catch {
    return false;
  }
};

const aesKey = () => crypto.subtle.importKey("raw", secretBytes(), "AES-GCM", false, ["encrypt", "decrypt"]);
const hmacKey = async () => {
  // Derive a separate key for signing so the encryption key is never used twice.
  const base = await crypto.subtle.importKey("raw", secretBytes(), "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info: enc.encode("leadpilot-oauth-state") },
    base,
    { name: "HMAC", hash: "SHA-256", length: 256 },
    false,
    ["sign", "verify"],
  );
};

export async function encryptSecret(plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(), enc.encode(plain)));
  return `v1.${b64url(iv)}.${b64url(ct)}`;
}

export async function decryptSecret(value: string): Promise<string> {
  const [v, iv, ct] = value.split(".");
  if (v !== "v1" || !iv || !ct) throw new Error("Unknown token format");
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64url(iv) }, await aesKey(), fromB64url(ct));
  return dec.decode(pt);
}

export async function signState(payload: object): Promise<string> {
  const body = utf8ToB64url(JSON.stringify(payload));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(), enc.encode(body)));
  return `${body}.${b64url(sig)}`;
}

export async function verifyState<T>(state: string): Promise<T | null> {
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const ok = await crypto.subtle.verify("HMAC", await hmacKey(), fromB64url(sig), enc.encode(body));
  if (!ok) return null;
  try {
    return JSON.parse(b64urlToUtf8(body)) as T;
  } catch {
    return null;
  }
}
