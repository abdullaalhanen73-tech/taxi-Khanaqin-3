import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-gold-light to-gold-dark text-ink-bg hover:from-gold hover:to-gold-dark shadow-lg shadow-gold/20 font-bold",
  secondary:
    "bg-ink-card text-txt border border-ink-border hover:bg-ink-surface active:bg-ink-border",
  ghost: "text-txt-sub hover:bg-ink-card active:bg-ink-border",
  danger:
    "bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25 active:bg-danger/30",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-card font-semibold text-sm transition-all duration-150 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
