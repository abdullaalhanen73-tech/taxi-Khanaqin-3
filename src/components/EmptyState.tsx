import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-ink-card border border-ink-border flex items-center justify-center text-txt-muted mb-4">
        {icon}
      </div>
      <p className="text-txt font-semibold">{title}</p>
      {subtitle && <p className="text-txt-muted text-sm mt-1">{subtitle}</p>}
    </div>
  );
}
