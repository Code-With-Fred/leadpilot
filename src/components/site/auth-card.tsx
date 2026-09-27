import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Logo } from "@/components/site/logo";

export function AuthCard({ title, description, children, footer }: { title: string; description: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-surface-muted px-4 py-10 sm:py-16">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex justify-center"><Logo /></Link>
        <div className="rounded-2xl border border-border bg-background p-6 shadow-raised sm:p-8">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          {children}
        </div>
        {footer ? <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p> : null}
      </div>
    </div>
  );
}

export function FormAlert({ kind, children }: { kind: "error" | "success"; children: ReactNode }) {
  return kind === "error" ? (
    <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{children}</p>
  ) : (
    <p role="status" className="rounded-md border border-success/30 bg-success-soft px-3 py-2 text-sm text-success">{children}</p>
  );
}
