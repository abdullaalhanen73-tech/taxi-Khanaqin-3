import { Home, Clock, User, Car } from "lucide-react";

export type TabId = "home" | "history" | "profile";

interface BottomNavProps {
  active: TabId;
  role: "rider" | "driver";
  onChange: (tab: TabId) => void;
}

export function BottomNav({ active, role, onChange }: BottomNavProps) {
  const tabs = [
    {
      id: "home" as TabId,
      label: role === "driver" ? "الرئيسية" : "الرئيسية",
      icon: role === "driver" ? Car : Home,
    },
    {
      id: "history" as TabId,
      label: "الرحلات",
      icon: Clock,
    },
    {
      id: "profile" as TabId,
      label: "حسابي",
      icon: User,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] z-40">
      <div className="bg-ink-surface/95 backdrop-blur-md border-t border-ink-border px-4 py-2">
        <div className="flex items-center justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                className="flex flex-col items-center gap-1 px-4 py-2 transition"
              >
                <Icon
                  size={22}
                  className={isActive ? "text-gold" : "text-txt-muted"}
                />
                <span
                  className={`text-[10px] font-semibold ${
                    isActive ? "text-gold" : "text-txt-muted"
                  }`}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <span className="absolute -top-px w-8 h-0.5 bg-gold rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
