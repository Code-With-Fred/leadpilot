import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { DashboardPreview } from "@/components/product/dashboard-preview";
import { motion } from "@/components/site/motion-primitives";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div aria-hidden className="pointer-events-none absolute inset-0 grid-backdrop opacity-60" />
      <div className="container-page relative grid gap-12 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center lg:gap-14 lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="eyebrow">AI sales automation</p>
          <h1 className="mt-4 text-[2.5rem] font-semibold leading-[1.06] sm:text-[3.25rem] lg:text-[3.5rem]">
            Turn more leads into customers.{" "}
            <span className="text-primary">Automatically.</span>
          </h1>
          <p className="mt-5 max-w-xl text-[1.0625rem] leading-relaxed text-muted-foreground">
            LeadPilot researches prospects, creates personalized outreach, manages follow ups, and
            helps your team focus on the conversations most likely to become revenue.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="cta" size="xl">
              <Link to="/signup">Start free</Link>
            </Button>
            <Button asChild variant="quiet" size="xl">
              <Link to="/product" hash="how-it-works">
                See how it works <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            No credit card required · Set up in minutes
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <DashboardPreview />
        </motion.div>
      </div>
    </section>
  );
}
