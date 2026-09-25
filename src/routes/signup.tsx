import { createFileRoute } from "@tanstack/react-router";

import { AuthForm } from "@/components/site/auth-form";
import { meta } from "@/components/site/page-shell";

export const Route = createFileRoute("/signup")({
  head: () => meta("Start free — LeadPilot", "Create your free LeadPilot account and start booking more meetings."),
  component: () => <AuthForm mode="signup" />,
});
