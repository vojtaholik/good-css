import type { ReactNode } from "react";

type FeatureCardProps = { icon: ReactNode; title: string; children: ReactNode };

export function FeatureCard({ icon, title, children }: FeatureCardProps) {
  return (
    <article className="rounded-lg border border-line bg-surface p-4 md:p-6">
      <div className="flex items-center">
        <span className="mr-3 text-brand">{icon}</span>
        <h3 className="text-base font-semibold text-ink md:text-lg">{title}</h3>
      </div>
      <p className="mt-2 text-sm text-ink-muted">{children}</p>
    </article>
  );
}
