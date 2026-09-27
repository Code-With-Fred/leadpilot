import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { AuthCard, FormAlert } from "@/components/site/auth-card";
import { meta } from "@/components/site/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => meta("Set a new password — LeadPilot", "Choose a new password for your LeadPilot account."),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState<"checking" | "ok" | "invalid">("checking");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (/error/.test(hash)) return setReady("invalid");
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady("ok");
    });
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      setReady((r) => (r === "ok" ? r : data.session && /type=recovery/.test(hash) ? "ok" : data.session ? "ok" : "invalid"));
    }, 1200);
    return () => { sub.subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password") ?? "");
    const confirm = String(f.get("confirm") ?? "");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("The two passwords don't match.");
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(/weak|pwned|leaked/i.test(error.message) ? "That password is too easy to guess. Please choose a stronger one." : /same/i.test(error.message) ? "Please choose a password you haven't used before." : "Couldn't update your password. Please request a new link.");
      return;
    }
    setDone(true);
    setTimeout(() => navigate({ to: "/app" }), 1500);
  }

  return (
    <AuthCard
      title="Set a new password"
      description="Choose a strong password you don't use anywhere else."
      footer={<Link to="/login" className="font-medium text-primary hover:underline">Back to log in</Link>}
    >
      {ready === "checking" ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Checking your link…</div>
      ) : ready === "invalid" ? (
        <div className="mt-6 space-y-4">
          <FormAlert kind="error">This reset link is invalid or has expired.</FormAlert>
          <Button asChild variant="cta" size="xl" className="w-full"><Link to="/forgot-password">Request a new link</Link></Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">New password</Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm new password</Label>
            <Input id="confirm" name="confirm" type="password" autoComplete="new-password" />
          </div>
          {error ? <FormAlert kind="error">{error}</FormAlert> : null}
          {done ? <FormAlert kind="success">Password updated! Taking you to your workspace…</FormAlert> : null}
          <Button type="submit" variant="cta" size="xl" className="w-full" disabled={loading || done}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : null} Update password
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
