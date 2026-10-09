// Gmail + Microsoft 365 (Graph) adapters: OAuth, sending into a thread, and reading replies.
import { b64std, b64urlToUtf8, utf8ToB64url } from "./crypto.server";

export type Provider = "google" | "microsoft";
export const PROVIDERS: Provider[] = ["google", "microsoft"];

export class ProviderError extends Error {
  readonly status: number;
  readonly auth: boolean;
  constructor(message: string, status: number, auth = false) {
    super(message);
    this.status = status;
    this.auth = auth;
  }
}

type Tokens = { accessToken: string; refreshToken: string | null; expiresIn: number };
export type Address = { email: string; name?: string | null | undefined };
export type OutgoingEmail = {
  from: Address;
  to: Address;
  subject: string;
  text: string;
  unsubscribeUrl?: string | undefined;
  /** Present for a follow-up in an existing conversation. */
  thread?: { threadId: string; ref: string | null } | undefined;
};
export type SentEmail = { messageId: string; threadId: string; ref: string | null };
export type InboundEmail = { id: string; threadId: string; fromEmail: string; subject: string; text: string; receivedAt: string; ref: string | null };

const CFG = {
  google: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "openid email profile https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly",
    id: () => process.env["GOOGLE_OAUTH_CLIENT_ID"],
    secret: () => process.env["GOOGLE_OAUTH_CLIENT_SECRET"],
  },
  microsoft: {
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scope: "openid email profile offline_access User.Read Mail.Send Mail.ReadWrite",
    id: () => process.env["MICROSOFT_OAUTH_CLIENT_ID"],
    secret: () => process.env["MICROSOFT_OAUTH_CLIENT_SECRET"],
  },
} as const;

export const providerConfigured = (p: Provider) => !!(CFG[p].id() && CFG[p].secret());

export function authorizeUrl(p: Provider, redirectUri: string, state: string, loginHint?: string): string {
  const c = CFG[p];
  const q = new URLSearchParams({ client_id: c.id()!, redirect_uri: redirectUri, response_type: "code", scope: c.scope, state });
  if (p === "google") {
    q.set("access_type", "offline");
    q.set("prompt", "consent");
    q.set("include_granted_scopes", "true");
  } else {
    q.set("prompt", "select_account");
    q.set("response_mode", "query");
  }
  if (loginHint) q.set("login_hint", loginHint);
  return `${c.authUrl}?${q}`;
}

async function tokenRequest(p: Provider, params: Record<string, string>): Promise<Tokens> {
  const c = CFG[p];
  const body = new URLSearchParams({ client_id: c.id()!, client_secret: c.secret()!, ...params });
  if (p === "microsoft") body.set("scope", c.scope);
  const res = await fetch(c.tokenUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  const json = (await res.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; expires_in?: number; error?: string; error_description?: string };
  if (!res.ok || !json.access_token) {
    const auth = json.error === "invalid_grant" || res.status === 400 || res.status === 401;
    throw new ProviderError(json.error_description || json.error || `Token request failed (${res.status})`, res.status, auth);
  }
  return { accessToken: json.access_token, refreshToken: json.refresh_token ?? null, expiresIn: json.expires_in ?? 3600 };
}

export const exchangeCode = (p: Provider, code: string, redirectUri: string) =>
  tokenRequest(p, { grant_type: "authorization_code", code, redirect_uri: redirectUri });
export const refreshAccess = (p: Provider, refreshToken: string) => tokenRequest(p, { grant_type: "refresh_token", refresh_token: refreshToken });

async function api<T>(url: string, token: string, init: RequestInit & { extraHeaders?: Record<string, string> } = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.extraHeaders },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let msg = text.slice(0, 300);
    try {
      const j = JSON.parse(text) as { error?: { message?: string } | string };
      msg = typeof j.error === "string" ? j.error : j.error?.message ?? msg;
    } catch {
      /* keep text */
    }
    throw new ProviderError(msg || `Request failed (${res.status})`, res.status, res.status === 401);
  }
  if (res.status === 202 || res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ---------- identity ----------

export async function fetchIdentity(p: Provider, token: string): Promise<{ email: string; name: string | null }> {
  if (p === "google") {
    const u = await api<{ email?: string; name?: string }>("https://openidconnect.googleapis.com/v1/userinfo", token);
    if (!u.email) throw new ProviderError("Google did not return an email address", 400);
    return { email: u.email.toLowerCase(), name: u.name ?? null };
  }
  const u = await api<{ mail?: string | null; userPrincipalName?: string; displayName?: string }>(
    "https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName,displayName",
    token,
  );
  const email = (u.mail || u.userPrincipalName || "").toLowerCase();
  if (!email.includes("@")) throw new ProviderError("Microsoft did not return an email address", 400);
  return { email, name: u.displayName ?? null };
}

/** Where reply syncing starts for a freshly connected inbox. */
export async function initialCursor(p: Provider, token: string): Promise<string> {
  if (p === "google") {
    const prof = await api<{ historyId: string }>("https://gmail.googleapis.com/gmail/v1/users/me/profile", token);
    return prof.historyId;
  }
  return new Date().toISOString();
}

// ---------- sending ----------

const isAscii = (v: string) => /^[\x20-\x7e]*$/.test(v);
const encodeHeader = (v: string) => (isAscii(v) ? v : `=?UTF-8?B?${b64std(new TextEncoder().encode(v))}?=`);
function formatAddress(a: Address): string {
  const name = (a.name ?? "").replace(/["\\\r\n<>]/g, "").trim();
  if (!name) return a.email;
  return `${isAscii(name) ? `"${name}"` : encodeHeader(name)} <${a.email}>`;
}
const clean = (v: string) => v.replace(/[\r\n]+/g, " ").trim();
export const replySubject = (s: string) => (/^re:/i.test(s.trim()) ? s.trim() : `Re: ${s.trim()}`);

function buildMime(m: OutgoingEmail, subject: string): string {
  const bodyB64 = b64std(new TextEncoder().encode(m.text)).replace(/.{76}/g, "$&\r\n");
  const headers = [
    `From: ${formatAddress(m.from)}`,
    `To: ${formatAddress(m.to)}`,
    `Subject: ${encodeHeader(clean(subject))}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
  ];
  if (m.thread?.ref) headers.push(`In-Reply-To: ${m.thread.ref}`, `References: ${m.thread.ref}`);
  if (m.unsubscribeUrl) headers.push(`List-Unsubscribe: <${m.unsubscribeUrl}>`, "List-Unsubscribe-Post: List-Unsubscribe=One-Click");
  return `${headers.join("\r\n")}\r\n\r\n${bodyB64}`;
}

const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";
const GRAPH = "https://graph.microsoft.com/v1.0/me";
// Immutable ids survive the move from Drafts to Sent Items, so we can reply to them later.
const GRAPH_HEADERS = { Prefer: 'IdType="ImmutableId", outlook.body-content-type="text"' };

export async function sendEmail(p: Provider, token: string, m: OutgoingEmail, threadSubject: string): Promise<SentEmail> {
  const subject = m.thread ? replySubject(threadSubject) : m.subject;
  if (p === "google") {
    const raw = utf8ToB64url(buildMime(m, subject));
    const sent = await api<{ id: string; threadId: string }>(`${GMAIL}/messages/send`, token, {
      method: "POST",
      body: JSON.stringify(m.thread ? { raw, threadId: m.thread.threadId } : { raw }),
    });
    const meta = await api<{ payload?: { headers?: { name: string; value: string }[] } }>(
      `${GMAIL}/messages/${sent.id}?format=metadata&metadataHeaders=Message-ID`,
      token,
    ).catch(() => null);
    const ref = meta?.payload?.headers?.find((h) => h.name.toLowerCase() === "message-id")?.value ?? null;
    return { messageId: sent.id, threadId: sent.threadId, ref };
  }

  const to = [{ emailAddress: { address: m.to.email, name: m.to.name ?? m.to.email } }];
  const body = { contentType: "Text", content: m.text };
  let draft: { id: string; conversationId: string };
  if (m.thread?.ref) {
    // Reply on the last message so Outlook and the lead's client keep one conversation.
    draft = await api(`${GRAPH}/messages/${encodeURIComponent(m.thread.ref)}/createReply`, token, { method: "POST", body: "{}", extraHeaders: GRAPH_HEADERS });
    await api(`${GRAPH}/messages/${encodeURIComponent(draft.id)}`, token, {
      method: "PATCH",
      body: JSON.stringify({ body, toRecipients: to, subject }),
      extraHeaders: GRAPH_HEADERS,
    });
  } else {
    draft = await api(`${GRAPH}/messages`, token, {
      method: "POST",
      body: JSON.stringify({ subject, body, toRecipients: to }),
      extraHeaders: GRAPH_HEADERS,
    });
  }
  await api(`${GRAPH}/messages/${encodeURIComponent(draft.id)}/send`, token, { method: "POST", body: "{}", extraHeaders: GRAPH_HEADERS });
  return { messageId: draft.id, threadId: draft.conversationId, ref: draft.id };
}

// ---------- reading replies ----------

type GmailPart = { mimeType?: string; body?: { data?: string }; parts?: GmailPart[]; headers?: { name: string; value: string }[] };

function gmailText(part: GmailPart | undefined): string {
  if (!part) return "";
  if (part.mimeType === "text/plain" && part.body?.data) return b64urlToUtf8(part.body.data);
  for (const p of part.parts ?? []) {
    const t = gmailText(p);
    if (t) return t;
  }
  if (part.mimeType === "text/html" && part.body?.data) return b64urlToUtf8(part.body.data).replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ");
  return "";
}

/** Keep only the new part of a reply: drop the quoted history and signature separators. */
export function stripQuoted(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (/^On .+wrote:$/.test(t) || /^-{2,}\s*Original Message/i.test(t) || (/^From: .+/.test(t) && out.length > 0)) break;
    if (line.startsWith(">")) continue;
    out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

const emailFrom = (v: string) => (v.match(/<([^>]+)>/)?.[1] ?? v).trim().toLowerCase();

export async function fetchReplies(
  p: Provider,
  token: string,
  cursor: string | null,
  threadIds: Set<string>,
): Promise<{ cursor: string; messages: InboundEmail[] }> {
  if (p === "google") {
    if (!cursor) return { cursor: await initialCursor(p, token), messages: [] };
    const ids = new Map<string, string>();
    let pageToken: string | undefined;
    let latest = cursor;
    try {
      do {
        const q = new URLSearchParams({ startHistoryId: cursor, historyTypes: "messageAdded", labelId: "INBOX", maxResults: "200" });
        if (pageToken) q.set("pageToken", pageToken);
        const h = await api<{ history?: { messagesAdded?: { message: { id: string; threadId: string } }[] }[]; historyId?: string; nextPageToken?: string }>(
          `${GMAIL}/history?${q}`,
          token,
        );
        for (const rec of h.history ?? []) for (const a of rec.messagesAdded ?? []) if (threadIds.has(a.message.threadId)) ids.set(a.message.id, a.message.threadId);
        if (h.historyId) latest = h.historyId;
        pageToken = h.nextPageToken;
      } while (pageToken);
    } catch (e) {
      // History older than ~a week expires; restart from now rather than failing forever.
      if (e instanceof ProviderError && e.status === 404) return { cursor: await initialCursor(p, token), messages: [] };
      throw e;
    }
    const messages: InboundEmail[] = [];
    for (const [id, threadId] of ids) {
      const m = await api<{ id: string; internalDate: string; payload: GmailPart }>(`${GMAIL}/messages/${id}?format=full`, token);
      const header = (n: string) => m.payload.headers?.find((x) => x.name.toLowerCase() === n)?.value ?? "";
      messages.push({
        id,
        threadId,
        fromEmail: emailFrom(header("from")),
        subject: header("subject"),
        text: stripQuoted(gmailText(m.payload)),
        receivedAt: new Date(Number(m.internalDate)).toISOString(),
        ref: header("message-id") || null,
      });
    }
    return { cursor: latest, messages };
  }

  const since = cursor ?? new Date().toISOString();
  const q = new URLSearchParams({
    $filter: `receivedDateTime gt ${since}`,
    $orderby: "receivedDateTime asc",
    $top: "50",
    $select: "id,conversationId,from,subject,uniqueBody,receivedDateTime",
  });
  const r = await api<{ value: { id: string; conversationId: string; from?: { emailAddress?: { address?: string } }; subject?: string; uniqueBody?: { content?: string }; receivedDateTime: string }[] }>(
    `${GRAPH}/mailFolders/inbox/messages?${q}`,
    token,
    { extraHeaders: GRAPH_HEADERS },
  );
  let latest = since;
  const messages: InboundEmail[] = [];
  for (const m of r.value) {
    latest = m.receivedDateTime;
    if (!threadIds.has(m.conversationId)) continue;
    messages.push({
      id: m.id,
      threadId: m.conversationId,
      fromEmail: (m.from?.emailAddress?.address ?? "").toLowerCase(),
      subject: m.subject ?? "",
      text: stripQuoted(m.uniqueBody?.content ?? ""),
      receivedAt: m.receivedDateTime,
      ref: m.id,
    });
  }
  return { cursor: latest, messages };
}
