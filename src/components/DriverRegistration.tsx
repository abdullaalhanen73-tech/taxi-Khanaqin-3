import { useState } from "react";
import {
  ChevronRight,
  ChevronLeft,
  User,
  Phone,
  Calendar,
  Car,
  Palette,
  Hash,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Button } from "./Button";
import { Field } from "./Field";
import { registerDriver } from "../lib/firestore";

interface DriverRegistrationProps {
  onBack: () => void;
  onDone: () => void;
}

export function DriverRegistration({ onBack, onDone }: DriverRegistrationProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [car, setCar] = useState("");
  const [color, setColor] = useState("");
  const [plate, setPlate] = useState("");
  const [year, setYear] = useState("");

  const step1Valid =
    name.trim().length >= 3 && phone.replace(/\D/g, "").length >= 9 && age.trim() !== "" && Number(age) >= 18;
  const step2Valid =
    car.trim().length >= 2 && color.trim().length >= 2 && plate.trim().length >= 2 && year.trim() !== "" && Number(year) >= 1980;

  async function handleSubmit() {
    if (!step2Valid) return;
    setSubmitting(true);
    setError("");
    try {
      await registerDriver({
        name: name.trim(),
        phone: `+964${phone.replace(/\D/g, "")}`,
        age: Number(age),
        car: car.trim(),
        color: color.trim(),
        plate: plate.trim(),
        year: Number(year),
      });
      setDone(true);
    } catch (e) {
      setError("حدث خطأ أثناء إرسال الطلب. حاول مرة أخرى.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-ink-bg px-6 text-center animate-fade-in">
        <div className="w-24 h-24 rounded-full bg-success/15 border-2 border-success/40 flex items-center justify-center mb-6 animate-scale-in">
          <CheckCircle2 size={48} className="text-success" />
        </div>
        <h2 className="text-xl font-extrabold text-txt">تم إرسال الطلب</h2>
        <p className="mt-3 text-sm text-txt-sub leading-relaxed max-w-xs">
          ✅ تم إرسال طلب التسجيل، سيتم مراجعة طلبك من قبل الإدارة وسيتم التواصل معك قريباً
        </p>
        <Button className="mt-8 w-full max-w-xs py-3.5" onClick={onDone}>
          العودة لتسجيل الدخول
          <ChevronLeft size={18} />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-ink-bg px-6 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={step === 1 ? onBack : () => setStep(1)}
          className="p-2 rounded-full bg-ink-card border border-ink-border text-txt-sub hover:text-txt transition"
        >
          <ChevronRight size={20} />
        </button>
        <h1 className="text-lg font-bold text-txt">تسجيل كسائق جديد</h1>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        <div className="flex items-center gap-2 flex-1">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition ${step >= 1 ? "bg-gold text-ink-bg" : "bg-ink-card text-txt-muted border border-ink-border"}`}>
            1
          </div>
          <span className={`text-xs font-semibold ${step >= 1 ? "text-gold" : "text-txt-muted"}`}>المعلومات الشخصية</span>
        </div>
        <div className={`h-0.5 flex-1 rounded ${step >= 2 ? "bg-gold" : "bg-ink-border"}`} />
        <div className="flex items-center gap-2 flex-1">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition ${step >= 2 ? "bg-gold text-ink-bg" : "bg-ink-card text-txt-muted border border-ink-border"}`}>
            2
          </div>
          <span className={`text-xs font-semibold ${step >= 2 ? "text-gold" : "text-txt-muted"}`}>معلومات السيارة</span>
        </div>
      </div>

      {/* Step 1 - Personal info */}
      {step === 1 && (
        <div className="space-y-4 animate-slide-up">
          <Field
            label="الاسم الكامل"
            placeholder="مثال: أحمد محمد"
            value={name}
            onChange={(e) => setName(e.target.value)}
            icon={<User size={18} />}
          />
          <div>
            <span className="block text-xs font-semibold text-txt-sub mb-1.5">رقم الهاتف</span>
            <div className="flex items-stretch gap-2">
              <div className="flex items-center px-4 rounded-card border border-ink-border bg-ink-card text-txt-sub text-sm font-bold">
                +964
              </div>
              <div className="relative flex-1">
                <Phone size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-muted" />
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="7XX XXX XXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 rounded-card border border-ink-border bg-ink-card text-txt placeholder:text-txt-muted focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition"
                />
              </div>
            </div>
          </div>
          <Field
            label="العمر"
            type="number"
            inputMode="numeric"
            placeholder="مثال: 25"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            icon={<Calendar size={18} />}
          />
          <div className="mt-auto pt-6">
            <Button
              className="w-full py-4 text-base"
              disabled={!step1Valid}
              onClick={() => setStep(2)}
            >
              التالي
              <ChevronLeft size={20} />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2 - Vehicle info */}
      {step === 2 && (
        <div className="space-y-4 animate-slide-up">
          <Field
            label="نوع السيارة"
            placeholder="مثال: تويوتا كورولا"
            value={car}
            onChange={(e) => setCar(e.target.value)}
            icon={<Car size={18} />}
          />
          <Field
            label="لون السيارة"
            placeholder="مثال: أبيض"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            icon={<Palette size={18} />}
          />
          <Field
            label="رقم اللوحة"
            placeholder="مثال: 123456"
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            icon={<Hash size={18} />}
          />
          <Field
            label="سنة الصنع"
            type="number"
            inputMode="numeric"
            placeholder="مثال: 2020"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            icon={<Calendar size={18} />}
          />

          {error && (
            <p className="text-sm text-danger text-center">{error}</p>
          )}

          <div className="pt-4">
            <Button
              className="w-full py-4 text-base"
              disabled={!step2Valid || submitting}
              onClick={handleSubmit}
            >
              {submitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                <>إرسال الطلب</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
