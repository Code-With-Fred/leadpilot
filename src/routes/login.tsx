import { createFileRoute } from "@tanstack/react-router";

import { AuthForm } from "@/components/site/auth-form";
import { meta } from "@/components/site/page-shell";

export const Route = createFileRoute("/login")({
  head: () => meta("Log in — LeadPilot", "Log in to your LeadPilot sales workspace."),
  validateSearch: (s: Record<string, unknown>) => (typeof s.next === "string" ? { next: s.next } : {}) as { next?: string },
  component: () => <AuthForm mode="login" />,
});
