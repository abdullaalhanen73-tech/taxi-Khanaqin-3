import { useState } from "react";
import {
  Power,
  Car,
  Star,
  TrendingUp,
  Check,
  X,
  MapPin,
  Navigation,
  Clock,
  Phone,
  Navigation2,
  Flag,
  UserCheck,
  Wallet,
  CreditCard,
  Loader2,
  AlertCircle,
  CheckCircle2,
  MessageCircle,
} from "lucide-react";
import type { Driver, Trip } from "../lib/types";
import { Button } from "./Button";
import { Chat } from "./Chat";
import { Modal } from "./Modal";
import { Field } from "./Field";

interface DriverHomeProps {
  driver: Driver | null;
  todayTrips: Trip[];
  pendingTrips: Trip[];
  activeTrip: Trip | null;
  completedTripSummary: TripSummary | null;
  onToggleOnline: (online: boolean) => void;
  onAccept: (tripId: string) => void;
  onReject: (tripId: string) => void;
  onPickedUp: (tripId: string) => void;
  onDriverArrived: (tripId: string) => void;
  onComplete: (tripId: string) => void;
  onCancelByDriver: (tripId: string) => void;
  onToggleSuper: (isSuper: boolean) => void;
  onDismissSummary: () => void;
  onRecharge: (amount: number, code: string) => Promise<void>;
}

export interface TripSummary {
  tripId: string;
  fare: number;
  commission: number;
  earnings: number;
  newBalance: number;
}

const MIN_BALANCE = -5000;

export function DriverHome({
  driver,
  todayTrips,
  pendingTrips,
  activeTrip,
  completedTripSummary,
  onToggleOnline,
  onAccept,
  onReject,
  onPickedUp,
  onDriverArrived,
  onComplete,
  onCancelByDriver,
  onToggleSuper,
  onDismissSummary,
  onRecharge,
}: DriverHomeProps) {
  const isOnline = driver?.isonline ?? false;
  const isSuper = driver?.isSuper ?? false;
  const balance = driver?.balance ?? 0;
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [superWarningOpen, setSuperWarningOpen] = useState(false);

  const earnings = todayTrips
    .filter((t) => t.status === "completed")
    .reduce((sum, t) => sum + t.fare, 0);
  const completedCount = todayTrips.filter(
    (t) => t.status === "completed"
  ).length;
  const rating = driver?.rating ?? 0;

  function toggle() {
    onToggleOnline(!isOnline);
  }

  function openGoogleMaps(lat: number, lng: number) {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  const balanceBlocked = balance <= MIN_BALANCE;
  const hasPending = isOnline && !balanceBlocked && pendingTrips.length > 0;
  const latestPending = pendingTrips[0] ?? null;

  // Balance bar color
  const balanceColor =
    balance > 2000
      ? "text-success border-success/30 bg-success/10"
      : balance > MIN_BALANCE
      ? "text-gold border-gold/30 bg-gold/10"
      : "text-danger border-danger/30 bg-danger/10";

  return (
    <div className="flex flex-col min-h-screen bg-ink-bg px-5 pt-6 pb-24 animate-fade-in">
      {/* Balance bar */}
      <div
        className={`flex items-center justify-between px-4 py-3 rounded-card border mb-4 ${balanceColor}`}
      >
        <div className="flex items-center gap-2">
          <Wallet size={18} />
          <span className="text-sm font-bold">رصيدك</span>
        </div>
        <span className="text-lg font-extrabold">
          {balance.toLocaleString()} <span className="text-xs">دينار</span>
        </span>
      </div>

      {/* Header with toggle */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-txt">
            {driver?.name || "السائق"}
          </h2>
          <p className="text-xs text-txt-muted">
            {isOnline ? "متاح للرحلات" : "غير متصل"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Super toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-txt-sub">سوبر ❄️</span>
            <button
              onClick={() => {
                if (!isSuper) {
                  setSuperWarningOpen(true);
                } else {
                  onToggleSuper(false);
                }
              }}
              className={`relative w-14 h-8 rounded-full transition-colors ${
                isSuper ? "bg-gold" : "bg-ink-border"
              }`}
            >
              <span
                className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${
                  isSuper ? "left-1" : "right-1"
                }`}
              />
            </button>
          </div>
          {/* Online toggle */}
          <button
            onClick={toggle}
            disabled={balanceBlocked}
            className={`relative w-14 h-8 rounded-full transition-colors disabled:opacity-40 ${
              isOnline ? "bg-success" : "bg-ink-border"
            }`}
          >
            <span
              className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${
                isOnline ? "left-1" : "right-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Status banner */}
      <div
        className={`flex items-center gap-2 px-4 py-3 rounded-card border mb-5 transition ${
          isOnline
            ? "bg-success/10 border-success/30"
            : "bg-ink-card border-ink-border"
        }`}
      >
        <Power
          size={18}
          className={isOnline ? "text-success" : "text-txt-muted"}
        />
        <span
          className={`text-sm font-semibold ${
            isOnline ? "text-success" : "text-txt-muted"
          }`}
        >
          {isOnline ? "أنت متصل وجاهز لاستقبال الطلبات" : "أنت غير متصل"}
        </span>
      </div>

      {/* Balance blocked warning */}
      {balanceBlocked && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-card border border-danger/30 bg-danger/10 mb-5">
          <AlertCircle size={18} className="text-danger flex-shrink-0" />
          <span className="text-sm font-semibold text-danger">
            ⛔ رصيدك نفد، يرجى تعبئة الرصيد للمتابعة
          </span>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatBox
          icon={<Car size={18} />}
          value={completedCount}
          label="رحلات اليوم"
        />
        <StatBox
          icon={<TrendingUp size={18} />}
          value={earnings.toLocaleString()}
          label="الأرباح (د.ع)"
        />
        <StatBox
          icon={<Star size={18} />}
          value={rating > 0 ? rating.toFixed(1) : "—"}
          label="التقييم"
        />
      </div>

      {/* Recharge button */}
      <button
        onClick={() => setRechargeOpen(true)}
        className="flex items-center justify-center gap-2 w-full py-3 rounded-card bg-ink-card border border-ink-border text-gold font-semibold text-sm hover:bg-gold/10 transition mb-5"
      >
        <CreditCard size={18} />
        تعبئة الرصيد 💳
      </button>

      {/* Active trip (accepted, driver_arrived, or picked_up) — driver flow */}
      {activeTrip ? (
        <ActiveTripCard
          trip={activeTrip}
          onPickedUp={onPickedUp}
          onDriverArrived={onDriverArrived}
          onComplete={onComplete}
          onCancelByDriver={onCancelByDriver}
          onOpenMaps={openGoogleMaps}
        />
      ) : hasPending && latestPending ? (
        /* Pending request — all online drivers see this */
        <div className="bg-ink-card rounded-card border-2 border-gold/40 p-4 animate-pulse-ring">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-gold animate-pulse-gold" />
            <span className="text-sm font-bold text-gold">طلب رحلة جديد!</span>
          </div>
          <div className="space-y-2 mb-4">
            <div className="flex items-start gap-2">
              <MapPin size={16} className="text-mapblue mt-0.5" />
              <div>
                <p className="text-xs text-txt-muted">من</p>
                <p className="text-sm text-txt">{latestPending.Fromaddress}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Navigation size={16} className="text-gold mt-0.5" />
              <div>
                <p className="text-xs text-txt-muted">إلى</p>
                <p className="text-sm text-txt">{latestPending.Toaddress}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1 text-xs text-txt-sub">
              <Clock size={13} />
              {latestPending.distance > 0
                ? `${latestPending.distance.toFixed(1)} كم`
                : "—"}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full ${
                  latestPending.taxiType === "super"
                    ? "bg-gold/15 text-gold border border-gold/30"
                    : "bg-ink-border text-txt-sub"
                }`}
              >
                {latestPending.taxiType === "super" ? "🚖 سوبر" : "🚕 عادي"}
              </span>
              <span className="text-lg font-extrabold text-gold">
                {latestPending.fare.toLocaleString()} د.ع
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-txt-muted mb-4">
            <Phone size={13} />
            <span>الراكب:</span>
            <span className="text-txt-sub" dir="ltr">
              {latestPending.passengerid}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="danger"
              className="py-3.5"
              onClick={() => onReject(latestPending.id)}
            >
              <X size={18} />
              رفض
            </Button>
            <Button
              className="py-3.5"
              onClick={() => onAccept(latestPending.id)}
            >
              <Check size={18} />
              قبول
            </Button>
          </div>
        </div>
      ) : isOnline && !balanceBlocked ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="relative w-20 h-20 flex items-center justify-center mb-4">
            <div className="absolute inset-0 rounded-full bg-gold/10 animate-radar" />
            <Car size={32} className="text-txt-muted" />
          </div>
          <p className="text-txt-sub font-semibold">في انتظار الطلبات...</p>
          <p className="text-txt-muted text-sm mt-1">
            ستظهر الطلبات الجديدة هنا فورًا
          </p>
        </div>
      ) : !isOnline ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-ink-card border border-ink-border flex items-center justify-center text-txt-muted mb-4">
            <Power size={28} />
          </div>
          <p className="text-txt-sub font-semibold">أنت غير متصل</p>
          <p className="text-txt-muted text-sm mt-1">
            فعّل الزر للبدء في استقبال الطلبات
          </p>
        </div>
      ) : null}

      {/* End-of-trip summary modal */}
      {completedTripSummary && (
        <TripSummaryModal
          summary={completedTripSummary}
          onDismiss={onDismissSummary}
        />
      )}

      {/* Super mode warning popup */}
      <Modal
        open={superWarningOpen}
        onClose={() => setSuperWarningOpen(false)}
        title="⚠️ تنبيه مهم"
      >
        <div className="space-y-5">
          <p className="text-sm text-txt-sub leading-relaxed text-center">
            إذا قبلت طلب سوبر تكسي، يجب عليك تشغيل التبريد (AC) طوال مدة الرحلة.
            إذا لم تكن قادراً على ذلك، لا تقبل طلبات السوبر.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="danger"
              className="py-3.5"
              onClick={() => setSuperWarningOpen(false)}
            >
              <X size={18} />
              إلغاء ❌
            </Button>
            <Button
              className="py-3.5"
              onClick={() => {
                onToggleSuper(true);
                setSuperWarningOpen(false);
              }}
            >
              <Check size={18} />
              فهمت، سأشغل التبريد ✅
            </Button>
          </div>
        </div>
      </Modal>

      {/* Recharge modal */}
      <RechargeModal
        open={rechargeOpen}
        onClose={() => setRechargeOpen(false)}
        onSubmit={onRecharge}
      />
    </div>
  );
}

// --- Active trip card with the 4-step driver flow ---
function ActiveTripCard({
  trip,
  onPickedUp,
  onDriverArrived,
  onComplete,
  onCancelByDriver,
  onOpenMaps,
}: {
  trip: Trip;
  onPickedUp: (tripId: string) => void;
  onDriverArrived: (tripId: string) => void;
  onComplete: (tripId: string) => void;
  onCancelByDriver: (tripId: string) => void;
  onOpenMaps: (lat: number, lng: number) => void;
}) {
  const status = trip.status;

  const statusLabel =
    status === "accepted"
      ? "رحلة نشطة — توجه للراكب"
      : status === "driver_arrived"
      ? "وصلت للراكب — انتظر الركوب"
      : status === "picked_up"
      ? "الراكب على متن — توجه للوجهة"
      : "رحلة نشطة";

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="bg-ink-card rounded-card border border-ink-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-success" />
          <span className="text-sm font-bold text-success">{statusLabel}</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <MapPin size={16} className="text-mapblue mt-0.5" />
            <div>
              <p className="text-xs text-txt-muted">من</p>
              <p className="text-sm text-txt">{trip.Fromaddress}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Navigation size={16} className="text-gold mt-0.5" />
            <div>
              <p className="text-xs text-txt-muted">إلى</p>
              <p className="text-sm text-txt">{trip.Toaddress}</p>
            </div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-ink-border flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-txt-muted">
            <Phone size={13} />
            <span dir="ltr">{trip.passengerid}</span>
          </div>
          <span className="text-lg font-extrabold text-gold">{trip.fare.toLocaleString()} د.ع</span>
        </div>
      </div>

      {/* Contact passenger: call + WhatsApp */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => {
            const passengerPhone = trip.passengerid;
            console.log("Calling passenger, phone:", passengerPhone);
            window.location.href = "tel:" + passengerPhone;
          }}
          className="flex items-center justify-center gap-2 py-3.5 rounded-card bg-ink-card border border-gold/40 text-gold font-bold text-sm hover:bg-gold/10 transition"
        >
          <Phone size={18} />
          اتصل بالراكب 📞
        </button>
        <button
          onClick={() => {
            const passengerPhone = trip.passengerid;
            console.log("WhatsApp passenger, phone:", passengerPhone);
            window.open(
              "https://wa.me/" + passengerPhone.replace("+", ""),
              "_blank"
            );
          }}
          className="flex items-center justify-center gap-2 py-3.5 rounded-card bg-ink-card border border-gold/40 text-gold font-bold text-sm hover:bg-gold/10 transition"
        >
          <MessageCircle size={18} />
          واتساب الراكب 💬
        </button>
      </div>

      {/* Cancel trip (driver cancels after accepting) */}
      <button
        onClick={() => onCancelByDriver(trip.id)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-card bg-danger/10 border border-danger/30 text-danger font-semibold text-sm hover:bg-danger/20 transition"
      >
        <X size={18} />
        إلغاء الرحلة
      </button>

      {/* Step 1: accepted → navigate to pickup + arrived */}
      {status === "accepted" && (
        <>
          {trip.fromCoords && (
            <button
              onClick={() =>
                onOpenMaps(trip.fromCoords!.lat, trip.fromCoords!.lng)
              }
              className="w-full flex items-center justify-center gap-2 py-4 rounded-card bg-mapblue/15 border border-mapblue/30 text-mapblue font-bold text-base hover:bg-mapblue/25 transition"
            >
              <Navigation2 size={22} />
              توجه للراكب 🧭
            </button>
          )}
          <button
            onClick={() => onDriverArrived(trip.id)}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-card bg-mapblue/15 border border-mapblue/30 text-mapblue font-bold text-base hover:bg-mapblue/25 transition"
          >
            <MapPin size={22} />
            لقد وصلت 📍
          </button>
        </>
      )}

      {/* Step 2: driver_arrived → passenger boarded */}
      {status === "driver_arrived" && (
        <button
          onClick={() => onPickedUp(trip.id)}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-card bg-success/15 border border-success/30 text-success font-bold text-base hover:bg-success/25 transition"
        >
          <UserCheck size={22} />
          ركب الراكب ✅
        </button>
      )}

      {/* Step 3: picked_up → navigate to destination + end trip */}
      {status === "picked_up" && (
        <>
          {trip.toCoords && (
            <button
              onClick={() =>
                onOpenMaps(trip.toCoords!.lat, trip.toCoords!.lng)
              }
              className="w-full flex items-center justify-center gap-2 py-4 rounded-card bg-gold/15 border border-gold/30 text-gold font-bold text-base hover:bg-gold/25 transition"
            >
              <Flag size={22} />
              توجه للوجهة 🏁
            </button>
          )}
          <button
            onClick={() => onComplete(trip.id)}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-card bg-gradient-to-b from-gold-light to-gold-dark text-ink-bg font-bold text-base hover:opacity-90 transition"
          >
            <Flag size={22} />
            إنهاء الرحلة ✅
          </button>
        </>
      )}

      <Chat tripId={trip.id} sender="driver" />
    </div>
  );
}

// --- End-of-trip summary modal ---
function TripSummaryModal({
  summary,
  onDismiss,
}: {
  summary: TripSummary;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6 animate-fade-in">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-[340px] bg-ink-surface rounded-3xl shadow-2xl p-6 animate-scale-in">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-success/15 border-2 border-success/40 flex items-center justify-center mb-4">
            <CheckCircle2 size={36} className="text-success" />
          </div>
          <h2 className="text-lg font-extrabold text-txt">✅ تمت الرحلة بنجاح</h2>
        </div>

        <div className="mt-5 space-y-3">
          <SummaryRow label="أجرة الرحلة" value={`${summary.fare.toLocaleString()} دينار`} />
          <SummaryRow
            label="عمولة المنصة"
            value={`- ${summary.commission.toLocaleString()} دينار`}
            valueClass="text-danger"
          />
          <div className="h-px bg-ink-border" />
          <SummaryRow
            label="أرباحك"
            value={`${summary.earnings.toLocaleString()} دينار`}
            valueClass="text-success font-extrabold"
          />
          <SummaryRow
            label="رصيدك الحالي"
            value={`${summary.newBalance.toLocaleString()} دينار`}
            valueClass={
              summary.newBalance > 2000
                ? "text-success"
                : summary.newBalance > -5000
                ? "text-gold"
                : "text-danger"
            }
          />
        </div>

        <Button className="w-full mt-6 py-3.5" onClick={onDismiss}>
          العودة للرئيسية
        </Button>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  valueClass = "text-txt",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-txt-sub">{label}</span>
      <span className={`text-sm font-bold ${valueClass}`}>{value}</span>
    </div>
  );
}

// --- Recharge modal ---
const RECHARGE_AMOUNTS = [5000, 10000, 25000];

function RechargeModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (amount: number, code: string) => Promise<void>;
}) {
  const [amount, setAmount] = useState<number>(5000);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (!code.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(amount, code.trim());
      setDone(true);
    } catch (e) {
      // keep modal open on error
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setCode("");
    setDone(false);
    setSubmitting(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="تعبئة الرصيد 💳">
      {done ? (
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-14 h-14 rounded-full bg-gold/15 border-2 border-gold/40 flex items-center justify-center mb-4">
            <CheckCircle2 size={30} className="text-gold" />
          </div>
          <p className="text-sm text-txt-sub leading-relaxed">
            ⏳ تم إرسال طلب التعبئة، سيتم مراجعته من قبل الإدارة
          </p>
          <Button className="w-full mt-5" onClick={handleClose}>
            تم
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <span className="block text-xs font-semibold text-txt-sub mb-1.5">
              اختر المبلغ
            </span>
            <div className="grid grid-cols-3 gap-2">
              {RECHARGE_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setAmount(amt)}
                  className={`py-3 rounded-card border-2 text-sm font-bold transition ${
                    amount === amt
                      ? "border-gold bg-gold/10 text-gold"
                      : "border-ink-border bg-ink-card text-txt-sub"
                  }`}
                >
                  {amt.toLocaleString()}
                </button>
              ))}
            </div>
            <p className="text-xs text-txt-muted mt-1.5">دينار</p>
          </div>

          <Field
            label="رمز التعبئة"
            placeholder="أدخل رمز التعبئة"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />

          <Button
            className="w-full py-3.5"
            disabled={!code.trim() || submitting}
            onClick={handleSubmit}
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                جاري الإرسال...
              </>
            ) : (
              "إرسال الطلب"
            )}
          </Button>
        </div>
      )}
    </Modal>
  );
}

function StatBox({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <div className="bg-ink-card rounded-card border border-ink-border p-3 text-center">
      <div className="flex items-center justify-center text-gold mb-1.5">
        {icon}
      </div>
      <p className="text-lg font-extrabold text-txt">{value}</p>
      <p className="text-[10px] text-txt-muted mt-0.5">{label}</p>
    </div>
  );
}
