import { Reveal } from "@/components/site/motion-primitives";

const categories = [
  "Solar",
  "Real Estate",
  "Home Services",
  "Agencies",
  "Professional Services",
  "Local Businesses",
];

export function TrustStrip() {
  return (
    <section className="border-b border-border bg-surface py-12">
      <div className="container-page">
        <Reveal className="text-center">
          <h2 className="text-lg font-medium text-muted-foreground">
            Built for teams that cannot afford to lose good leads.
          </h2>
        </Reveal>
        <Reveal delay={0.08}>
          <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-3 gap-y-3">
            {categories.map((c) => (
              <li
                key={c}
                className="rounded-full border border-border bg-background px-4 py-1.5 text-sm font-medium text-foreground/80"
              >
                {c}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
