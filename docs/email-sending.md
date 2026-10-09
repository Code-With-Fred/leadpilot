# Automated email sending

LeadPilot sends from each customer's own Gmail / Google Workspace or Outlook / Microsoft 365
inbox (connected with OAuth), threads every follow-up, reads replies, and pauses a lead's
sequence the moment they reply.

## How it works

- **Settings → Sending inboxes**: connect up to 1 / 3 / 10 inboxes (Starter / Growth / Scale), set a
  daily cap per inbox (default 40), and set a booking link for `{{booking_link}}`.
- **Campaigns → Send email steps automatically**: due email steps go out on their own. Optionally
  pin a campaign to one inbox; otherwise sends rotate to the inbox with the most room left today.
- **Worker** (`/api/cron/email`, every 5 minutes): syncs replies first, then sends due steps (max 3 per
  inbox per run, within the daily cap). Rows are claimed with `FOR UPDATE SKIP LOCKED`, so
  overlapping runs never double-send. A run that dies mid-send marks the step `failed` instead of retrying blind.
- **Replies** (synced or pasted into the Inbox) pause the lead's remaining steps (database trigger).
  "Resume sequence" reschedules them from tomorrow, keeping their spacing.
- **Compliance**: every email has an unsubscribe link plus `List-Unsubscribe` one-click headers (Gmail
  only — Graph can't set them). Unsubscribed leads are never emailed again.
- Merge tags: `{{first_name}}`, `{{name}}`, `{{company}}`, `{{booking_link}}`, `{{my_company}}`.

## One-time setup (app owner)

Add these secrets in Lovable Cloud:

| Secret | Value |
| --- | --- |
| `EMAIL_TOKEN_KEY` | 32 random bytes, base64 (`openssl rand -base64 32`). Encrypts OAuth tokens. Don't rotate without reconnecting inboxes. |
| `APP_URL` | Public app URL, e.g. `https://leadpilot.app` (used for OAuth redirects and unsubscribe links) |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | Google Cloud OAuth client (Web application) |
| `MICROSOFT_OAUTH_CLIENT_ID` / `MICROSOFT_OAUTH_CLIENT_SECRET` | Microsoft Entra app registration |

### Google
1. Google Cloud Console → enable the **Gmail API**.
2. OAuth consent screen: add scopes `openid`, `email`, `profile`, `gmail.send`, `gmail.readonly`.
3. Credentials → OAuth client (Web) → redirect URI `${APP_URL}/api/email/oauth/google`.
4. While unverified, only test users you add can connect (max 100). `gmail.readonly` is a
   *restricted* scope: public launch needs Google verification plus a CASA security assessment
   (plan for a few weeks).

### Microsoft
1. Entra ID → App registrations → New (accounts in any organizational directory + personal accounts).
2. Redirect URI (Web): `${APP_URL}/api/email/oauth/microsoft`.
3. API permissions (delegated): `offline_access`, `User.Read`, `Mail.Send`, `Mail.ReadWrite`.
4. Certificates & secrets → new client secret. Some customer tenants need admin consent; publisher verification removes the "unverified" warning.

### Scheduler
Schedule `POST ${APP_URL}/api/cron/email` every 5 minutes with header
`Authorization: Bearer $LOVABLE_CRON_SECRET` (a Lovable cron job, or Supabase `pg_cron` + `pg_net`).
Without it, nothing sends automatically. "Send now" and "check replies" still work by hand.
