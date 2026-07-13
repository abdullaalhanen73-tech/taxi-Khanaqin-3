import type { InputHTMLAttributes } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
}

export function Field({ label, icon, className = "", ...props }: FieldProps) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-txt-sub mb-1.5">
        {label}
      </span>
      <div className="relative">
        {icon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-muted">
            {icon}
          </span>
        )}
        <input
          className={`w-full px-4 py-3 rounded-card border border-ink-border bg-ink-card text-txt placeholder:text-txt-muted focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition ${icon ? "pr-10" : ""} ${className}`}
          {...props}
        />
      </div>
    </label>
  );
}
