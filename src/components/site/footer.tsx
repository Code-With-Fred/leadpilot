import { Link } from "@tanstack/react-router";

import { Logo } from "@/components/site/logo";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Features", to: "/product", hash: "features" },
      { label: "Pricing", to: "/pricing" },
      { label: "Integrations", to: "/product", hash: "faq" },
      { label: "Changelog", to: "/product", hash: "how-it-works" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "Solar", to: "/solutions", hash: "solar" },
      { label: "Real Estate", to: "/solutions", hash: "real-estate" },
      { label: "Agencies", to: "/solutions", hash: "agencies" },
      { label: "Home Services", to: "/solutions", hash: "home-services" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", to: "/product", hash: "faq" },
      { label: "Blog", to: "/product", hash: "faq" },
      { label: "Help Center", to: "/product", hash: "faq" },
      { label: "Guides", to: "/product", hash: "how-it-works" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/product" },
      { label: "Contact", to: "/signup" },
      { label: "Privacy", to: "/product", hash: "faq" },
      { label: "Terms", to: "/product", hash: "faq" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            The sales workspace that researches your prospects, starts the conversation, and keeps
            the follow up moving.
          </p>
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h3 className="text-sm font-semibold">{col.title}</h3>
            <ul className="mt-3 space-y-2">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    {...("hash" in link ? { hash: link.hash } : {})}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 LeadPilot. All rights reserved.</p>
          <p>Usage limits may depend on the services you connect.</p>
        </div>
      </div>
    </footer>
  );
}
