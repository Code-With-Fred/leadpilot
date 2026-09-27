import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";

import { AuthCard, FormAlert } from "@/components/site/auth-card";
import { meta } from "@/components/site/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => meta("Reset your password — LeadPilot", "Get a secure link to reset your LeadPilot password."),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Please enter a valid email.");
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setLoading(false);
    if (error) {
      setError(/rate|too many/i.test(error.message) ? "Too many attempts. Please wait a minute and try again." : "Couldn't send the reset link. Please try again.");
      return;
    }
    setSent(`If an account exists for ${email}, a reset link is on its way. Check your inbox.`);
  }

  return (
    <AuthCard
      title="Forgot your password?"
      description="Enter your email and we'll send you a link to set a new one."
      footer={<>Remembered it? <Link to="/login" className="font-medium text-primary hover:underline">Back to log in</Link></>}
    >
      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" />
        </div>
        {error ? <FormAlert kind="error">{error}</FormAlert> : null}
        {sent ? <FormAlert kind="success">{sent}</FormAlert> : null}
        <Button type="submit" variant="cta" size="xl" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : null} Send reset link
        </Button>
      </form>
    </AuthCard>
  );
}
