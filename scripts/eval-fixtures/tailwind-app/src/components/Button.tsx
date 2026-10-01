import type { ComponentProps } from "react";

type ButtonProps = ComponentProps<"button"> & { variant?: "primary" | "ghost" };

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const look =
    variant === "primary" ? "bg-brand text-white hover:bg-brand-hover" : "text-ink hover:bg-surface-raised";

  return (
    <button
      className={`rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${look} ${className}`}
      {...props}
    />
  );
}
