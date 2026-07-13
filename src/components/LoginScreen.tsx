import { useState } from "react";
import {
  Phone,
  User,
  Car,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Clock,
  UserPlus,
} from "lucide-react";
import { Button } from "./Button";
import { DriverRegistration } from "./DriverRegistration";
import { findDriverByPhone, upsertUserByPhone } from "../lib/firestore";
import type { Driver } from "../lib/types";

type Role = "rider" | "driver";
type View = "login" | "register";

interface LoginScreenProps {
  onLogin: (phone: string, role: Role, driverDoc?: Driver) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [view, setView] = useState<View>("login");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("rider");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const valid = phone.replace(/\D/g, "").length >= 9;
  const fullPhone = `+964${phone.replace(/\D/g, "")}`;

  async function handleContinue() {
    if (!valid) return;
    setLoading(true);
    setError("");

    try {
      if (role === "driver") {
        const driver = await findDriverByPhone(fullPhone);
        if (!driver) {
          setError("❌ رقمك غير مسجل، يرجى التسجيل أولاً");
          setLoading(false);
          return;
        }
        if (driver.status === "pending") {
          setError("⏳ طلبك قيد المراجعة، سنتواصل معك قريباً");
          setLoading(false);
          return;
        }
        if (driver.status === "rejected") {
          setError("❌ تم رفض طلبك. يرجى التواصل مع الإدارة");
          setLoading(false);
          return;
        }
        if (driver.status === "approved") {
          onLogin(fullPhone, "driver", driver);
          return;
        }
      } else {
        await upsertUserByPhone(fullPhone);
        onLogin(fullPhone, "rider");
        return;
      }
    } catch (e) {
      setError("حدث خطأ أثناء تسجيل الدخول. حاول مرة أخرى.");
      setLoading(false);
    }
  }

  if (view === "register") {
    return (
      <DriverRegistration
        onBack={() => setView("login")}
        onDone={() => setView("login")}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-ink-bg px-6 py-10 animate-fade-in">
      <div className="flex flex-col items-center mt-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-b from-gold-light to-gold-dark flex items-center justify-center text-4xl shadow-xl shadow-gold/20">
          🚕
        </div>
        <h1 className="mt-5 text-2xl font-extrabold text-txt">تكسي خانقين</h1>
        <p className="mt-1 text-sm text-txt-muted">سجّل دخولك للمتابعة</p>
      </div>

      <div className="mt-10">
        <p className="text-xs font-semibold text-txt-sub mb-2">اختر نوع الحساب</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => { setRole("rider"); setError(""); }}
            className={`flex flex-col items-center gap-2 py-5 rounded-card border-2 transition-all ${
              role === "rider"
                ? "border-gold bg-gold/10"
                : "border-ink-border bg-ink-card"
            }`}
          >
            <User
              size={26}
              className={role === "rider" ? "text-gold" : "text-txt-muted"}
            />
            <span
              className={`text-sm font-bold ${
                role === "rider" ? "text-gold" : "text-txt-sub"
              }`}
            >
              راكب
            </span>
          </button>
          <button
            onClick={() => { setRole("driver"); setError(""); }}
            className={`flex flex-col items-center gap-2 py-5 rounded-card border-2 transition-all ${
              role === "driver"
                ? "border-gold bg-gold/10"
                : "border-ink-border bg-ink-card"
            }`}
          >
            <Car
              size={26}
              className={role === "driver" ? "text-gold" : "text-txt-muted"}
            />
            <span
              className={`text-sm font-bold ${
                role === "driver" ? "text-gold" : "text-txt-sub"
              }`}
            >
              سائق
            </span>
          </button>
        </div>
      </div>

      <div className="mt-8">
        <p className="text-xs font-semibold text-txt-sub mb-2">رقم الهاتف</p>
        <div className="flex items-stretch gap-2">
          <div className="flex items-center px-4 rounded-card border border-ink-border bg-ink-card text-txt-sub text-sm font-bold">
            +964
          </div>
          <div className="relative flex-1">
            <Phone
              size={18}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-muted"
            />
            <input
              type="tel"
              inputMode="numeric"
              placeholder="7XX XXX XXXX"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setError(""); }}
              className="w-full pr-10 pl-4 py-3 rounded-card border border-ink-border bg-ink-card text-txt placeholder:text-txt-muted focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition"
            />
          </div>
        </div>
      </div>

      {/* Error / status messages */}
      {error && (
        <div className="mt-4 flex items-start gap-2 px-4 py-3 rounded-card bg-ink-card border border-ink-border animate-slide-up-sm">
          {error.startsWith("⏳") ? (
            <Clock size={18} className="text-gold flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={18} className="text-danger flex-shrink-0 mt-0.5" />
          )}
          <span className={`text-sm ${error.startsWith("⏳") ? "text-gold" : "text-danger"}`}>
            {error}
          </span>
        </div>
      )}

      <div className="mt-auto pt-10 space-y-3">
        <Button
          className="w-full py-4 text-base"
          disabled={!valid || loading}
          onClick={handleContinue}
        >
          {loading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              جاري التحقق...
            </>
          ) : (
            <>
              متابعة
              <ChevronLeft size={20} />
            </>
          )}
        </Button>

        {role === "driver" && (
          <button
            onClick={() => setView("register")}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-gold hover:text-gold-light transition"
          >
            <UserPlus size={18} />
            تسجيل كسائق جديد
          </button>
        )}

        <p className="text-center text-xs text-txt-muted">
          بتسجيلك الدخول، أنت توافق على شروط الاستخدام وسياسة الخصوصية
        </p>
      </div>
    </div>
  );
}
