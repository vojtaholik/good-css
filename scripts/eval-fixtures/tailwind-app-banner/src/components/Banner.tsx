import { useState } from "react";

type BannerProps = { message: string; href: string; linkLabel: string };

export function Banner({ message, href, linkLabel }: BannerProps) {
  const [open, setOpen] = useState(true);

  if (!open) return null;

  return (
    <div className="flex flex-col items-center gap-2 bg-brand px-4 py-2 text-sm text-white md:flex-row md:justify-center">
      <p>{message}</p>
      <a href={href} className="ml-2 font-semibold underline transition-all hover:opacity-80">
        {linkLabel}
      </a>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="ml-4 h-4 w-4 outline-none transition-all hover:opacity-80"
      >
        <svg viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2}>
          <path d="M3 3l10 10M13 3L3 13" />
        </svg>
      </button>
    </div>
  );
}
