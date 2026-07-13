import {
  Star,
  Car,
  TrendingUp,
  LogOut,
  ChevronLeft,
  Bell,
  Shield,
  HelpCircle,
  CreditCard,
} from "lucide-react";

interface ProfileScreenProps {
  name: string;
  phone: string;
  role: "rider" | "driver";
  tripCount: number;
  earnings: number;
  rating: number;
  onLogout: () => void;
}

export function ProfileScreen({
  name,
  phone,
  role,
  tripCount,
  earnings,
  rating,
  onLogout,
}: ProfileScreenProps) {
  const menuItems = [
    { icon: Bell, label: "الإشعارات", badge: "3" },
    { icon: CreditCard, label: "طرق الدفع" },
    { icon: Shield, label: "الخصوصية والأمان" },
    { icon: HelpCircle, label: "المساعدة والدعم" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-ink-bg px-5 pt-8 pb-24 animate-fade-in">
      {/* Avatar */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-b from-gold-light to-gold-dark flex items-center justify-center text-ink-bg font-extrabold text-2xl shadow-xl shadow-gold/20">
          {name.charAt(0) || "؟"}
        </div>
        <h2 className="mt-3 text-lg font-bold text-txt">{name || "مستخدم"}</h2>
        <p className="text-sm text-txt-muted">{phone}</p>
        <span className="mt-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/30 text-xs font-bold text-gold">
          {role === "driver" ? "سائق" : "راكب"}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-ink-card rounded-card border border-ink-border p-3 text-center">
          <Car size={18} className="text-gold mx-auto mb-1.5" />
          <p className="text-lg font-extrabold text-txt">{tripCount}</p>
          <p className="text-[10px] text-txt-muted">رحلات</p>
        </div>
        <div className="bg-ink-card rounded-card border border-ink-border p-3 text-center">
          <TrendingUp size={18} className="text-gold mx-auto mb-1.5" />
          <p className="text-lg font-extrabold text-txt">
            {earnings > 0 ? earnings.toLocaleString() : "—"}
          </p>
          <p className="text-[10px] text-txt-muted">
            {role === "driver" ? "أرباع (د.ع)" : "إنفاق (د.ع)"}
          </p>
        </div>
        <div className="bg-ink-card rounded-card border border-ink-border p-3 text-center">
          <Star size={18} className="text-gold mx-auto mb-1.5" />
          <p className="text-lg font-extrabold text-txt">{rating.toFixed(1)}</p>
          <p className="text-[10px] text-txt-muted">التقييم</p>
        </div>
      </div>

      {/* Menu items */}
      <div className="bg-ink-card rounded-card border border-ink-border overflow-hidden">
        {menuItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              className={`flex items-center gap-3 w-full px-4 py-3.5 hover:bg-ink-surface transition text-right ${
                i > 0 ? "border-t border-ink-border" : ""
              }`}
            >
              <Icon size={18} className="text-txt-sub" />
              <span className="flex-1 text-sm text-txt">{item.label}</span>
              {item.badge && (
                <span className="px-2 py-0.5 rounded-full bg-gold/15 text-gold text-xs font-bold">
                  {item.badge}
                </span>
              )}
              <ChevronLeft size={16} className="text-txt-muted" />
            </button>
          );
        })}
      </div>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="mt-6 flex items-center justify-center gap-2 w-full py-3.5 rounded-card bg-danger/10 border border-danger/30 text-danger font-semibold text-sm hover:bg-danger/20 transition"
      >
        <LogOut size={18} />
        تسجيل الخروج
      </button>

      <p className="mt-6 text-center text-xs text-txt-muted">
        تكسي خانقين © {new Date().getFullYear()}
      </p>
    </div>
  );
}
