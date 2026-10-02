import { Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Logo } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

function friendly(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "That email and password don't match. Please try again.";
  if (m.includes("email not confirmed")) return "Please confirm your email first — check your inbox for the link.";
  if (m.includes("already registered")) return "An account with this email already exists. Try logging in.";
  if (m.includes("rate limit")) return "Too many attempts. Please wait a minute and try again.";
  return message;
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const signup = mode === "signup";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const fullName = String(data.get("name") ?? "").trim();
    const company = String(data.get("company") ?? "").trim();
    setSuccess("");
    if (signup && !fullName) return setError("Please enter your full name.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Please enter a valid email.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    setError("");
    setLoading(true);
    // Same-origin relative return path (e.g. an assistant connection approval).
    const rawNext = new URLSearchParams(window.location.search).get("next") ?? "";
    const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "";
    const go = () => (next ? void (window.location.href = next) : navigate({ to: "/app" }));
    try {
      if (signup) {
        const { data: res, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}${next || "/app"}`, data: { full_name: fullName, company } },
        });
        if (error) return setError(friendly(error.message));
        if (res.user && res.user.identities?.length === 0)
          return setError("An account with this email already exists. Try logging in.");
        if (res.session) return go();
        setSuccess(`Account created! We sent a confirmation link to ${email}. Click it to finish signing up.`);
        e.currentTarget?.reset?.();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return setError(friendly(error.message));
        setSuccess("Logged in! Taking you to your workspace…");
        go();
      }
    } catch {
      setError("Something went wrong. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-surface-muted px-4 py-10 sm:py-16">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex justify-center">
          <Logo />
        </Link>
        <div className="rounded-2xl border border-border bg-background p-6 shadow-raised sm:p-8">
          <h1 className="text-2xl font-semibold">{signup ? "Create your account" : "Welcome back"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {signup ? "Start free. No credit card required." : "Log in to your LeadPilot workspace."}
          </p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            {signup ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" name="name" autoComplete="name" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="company">Company <span className="text-muted-foreground">(optional)</span></Label>
                  <Input id="company" name="company" autoComplete="organization" />
                </div>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {!signup ? <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">Forgot password?</Link> : null}
              </div>
              <Input id="password" name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} />
            </div>
            {error ? (
              <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>
            ) : null}
            {success ? (
              <p role="status" className="flex gap-2 rounded-md border border-success/30 bg-success-soft px-3 py-2 text-sm text-success">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> {success}
              </p>
            ) : null}
            <Button type="submit" variant="cta" size="xl" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              {signup ? "Create account" : "Log in"}
            </Button>
          </form>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {signup ? "Already have an account? " : "New to LeadPilot? "}
          <Link to={signup ? "/login" : "/signup"} className="font-medium text-primary hover:underline">
            {signup ? "Log in" : "Start free"}
          </Link>
        </p>
      </div>
    </div>
  );
}
