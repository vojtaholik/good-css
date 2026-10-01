import { Button } from "../components/Button";
import { FeatureCard } from "../components/FeatureCard";

const features = [
  { icon: "↗", title: "Faster reviews", text: "Every change gets a preview link before anyone opens the diff." },
  { icon: "◎", title: "One source of truth", text: "Designs, copy and code point at the same record." },
  { icon: "✓", title: "Checks that run", text: "A change that breaks a rule fails before it merges." },
];

export function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4 md:px-8">
      <section className="py-12 text-center md:py-20">
        <h1 className="text-3xl font-bold text-ink md:text-5xl">Ship the change you meant to ship</h1>
        <p className="mx-auto mt-4 max-w-xl text-ink-muted">Acme keeps what you designed and what you deployed in step.</p>
        <Button className="mt-6">Start free</Button>
      </section>

      <section className="grid grid-cols-1 gap-4 pb-12 md:grid-cols-3 md:gap-6">
        {features.map((feature) => (
          <FeatureCard key={feature.title} icon={feature.icon} title={feature.title}>
            {feature.text}
          </FeatureCard>
        ))}
      </section>
    </main>
  );
}
