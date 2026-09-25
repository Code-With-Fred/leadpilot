import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Logo } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Product", to: "/product" },
  { label: "How it works", to: "/product", hash: "how-it-works" },
  { label: "Solutions", to: "/solutions" },
  { label: "Pricing", to: "/pricing" },
  { label: "Resources", to: "/product", hash: "faq" },
] as const;

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b transition-all duration-200",
        scrolled
          ? "border-border bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70"
          : "border-transparent bg-background",
      )}
    >
      <nav
        aria-label="Main"
        className={cn(
          "container-page flex items-center gap-6 transition-all duration-200",
          scrolled ? "h-14" : "h-[4.5rem]",
        )}
      >
        <Link to="/" aria-label="LeadPilot home" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Logo />
        </Link>

        <ul className="ml-2 hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <li key={item.label}>
              <Link
                to={item.to}
                hash={"hash" in item ? item.hash : undefined}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                activeOptions={{ exact: true }}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">Log in</Link>
          </Button>
          <Button asChild variant="cta" size="sm">
            <Link to="/signup">Start free</Link>
          </Button>
        </div>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="ml-auto grid size-10 place-items-center rounded-md border border-border bg-surface text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {open ? (
        <div className="fixed inset-x-0 top-14 z-50 h-[calc(100dvh-3.5rem)] overflow-y-auto border-t border-border bg-background lg:hidden">
          <div className="container-page flex flex-col gap-1 py-4">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                hash={"hash" in item ? item.hash : undefined}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-3 text-base font-medium transition-colors hover:bg-surface-muted"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-4 grid gap-2">
              <Button asChild variant="quiet" size="xl">
                <Link to="/login" onClick={() => setOpen(false)}>
                  Log in
                </Link>
              </Button>
              <Button asChild variant="cta" size="xl">
                <Link to="/signup" onClick={() => setOpen(false)}>
                  Start free
                </Link>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
