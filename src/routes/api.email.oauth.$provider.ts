import { createFileRoute } from "@tanstack/react-router";

// OAuth redirect target for connecting a Gmail / Microsoft 365 sending inbox.
export const Route = createFileRoute("/api/email/oauth/$provider")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const back = (q: string) =>
          new Response(null, {
            status: 302,
            headers: {
              Location: `/app?${q}`,
              "Set-Cookie": "lp_oauth_nonce=; Path=/api/email/oauth; Max-Age=0; HttpOnly; Secure; SameSite=Lax",
            },
          });
        const fail = (reason: string) => back(`email_error=${encodeURIComponent(reason)}`);

        const provider = params.provider;
        if (provider !== "google" && provider !== "microsoft") return fail("Unknown email provider.");
        if (url.searchParams.get("error")) return fail("Connection was cancelled.");
        const code = url.searchParams.get("code");
        const rawState = url.searchParams.get("state");
        if (!code || !rawState) return fail("The sign-in response was incomplete. Please try again.");

        const { verifyState, encryptSecret } = await import("@/lib/email/crypto.server");
        const { exchangeCode, fetchIdentity, initialCursor } = await import("@/lib/email/providers.server");
        const { appUrl, INBOX_LIMITS } = await import("@/lib/email/engine.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const state = await verifyState<{ ws: string; uid: string; p: string; n: string; exp: number }>(rawState);
        const cookieNonce = /(?:^|;\s*)lp_oauth_nonce=([^;]+)/.exec(request.headers.get("cookie") ?? "")?.[1];
        if (!state || state.p !== provider || state.exp < Date.now() || !cookieNonce || cookieNonce !== state.n) {
          return fail("This connection link expired. Please try again from Settings.");
        }

        // Still a member of that workspace?
        const { data: member } = await supabaseAdmin
          .from("workspace_members")
          .select("user_id")
          .eq("workspace_id", state.ws)
          .eq("user_id", state.uid)
          .maybeSingle();
        if (!member) return fail("You're no longer a member of that workspace.");

        try {
          const redirectUri = `${appUrl(url.origin)}/api/email/oauth/${provider}`;
          const tokens = await exchangeCode(provider, code, redirectUri);
          if (!tokens.refreshToken) {
            return fail("Permission for offline access wasn't granted. Please try again and accept all permissions.");
          }
          const who = await fetchIdentity(provider, tokens.accessToken);
          const cursor = await initialCursor(provider, tokens.accessToken);

          const { data: existing } = await supabaseAdmin
            .from("email_accounts")
            .select("id")
            .eq("workspace_id", state.ws)
            .eq("email", who.email)
            .maybeSingle();
          if (!existing) {
            const [{ data: ws }, { count }] = await Promise.all([
              supabaseAdmin.from("workspaces").select("plan").eq("id", state.ws).single(),
              supabaseAdmin.from("email_accounts").select("id", { count: "exact", head: true }).eq("workspace_id", state.ws),
            ]);
            const limit = INBOX_LIMITS[ws?.plan ?? "starter"] ?? 1;
            if ((count ?? 0) >= limit) return fail(`Your plan includes ${limit} sending inbox${limit === 1 ? "" : "es"}.`);
          }

          const now = new Date().toISOString();
          const row = {
            workspace_id: state.ws,
            connected_by: state.uid,
            provider,
            email: who.email,
            display_name: who.name,
            status: "active",
            last_error: null,
            refresh_token_enc: await encryptSecret(tokens.refreshToken),
            access_token_enc: await encryptSecret(tokens.accessToken),
            access_token_expires_at: new Date(Date.now() + tokens.expiresIn * 1000).toISOString(),
            updated_at: now,
          };
          const { error } = existing
            ? await supabaseAdmin.from("email_accounts").update(row).eq("id", existing.id)
            : await supabaseAdmin.from("email_accounts").insert({ ...row, sync_cursor: cursor, last_synced_at: now });
          if (error) throw error;
          return back(`email_connected=${encodeURIComponent(who.email)}`);
        } catch (e) {
          console.error("email oauth callback failed", e);
          return fail("Couldn't connect that inbox. Please try again.");
        }
      },
    },
  },
});
