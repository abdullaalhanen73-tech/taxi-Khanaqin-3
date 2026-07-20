import { useState, useEffect, useRef } from "react";
import {
  Star,
  Phone,
  Check,
  X,
  MapPin,
  ChevronRight,
  Navigation,
  AlertCircle,
  Clock,
  MessageCircle,
} from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Marker,
} from "react-leaflet";
import { Icon } from "leaflet";
import type { Driver, Trip, AcRating } from "../lib/types";
import { Chat } from "./Chat";
import { Button } from "./Button";
import { subscribeDriverLocation } from "../lib/firestore";
import { startAlarm, stopAlarm } from "../lib/notification";

type Phase = "waiting" | "confirmed" | "rejected" | "cancelled" | "rating";

interface BookingFlowProps {
  from: string;
  to: string;
  trip: Trip | null;
  driver: Driver | null;
  onCancel: () => void;
  onRetry: () => void;
  onRating: (
    tripId: string,
    driverId: string,
    rating: number,
    comment: string,
    acRating: AcRating | null
  ) => Promise<void>;
}

export function BookingFlow({
  from,
  to,
  trip,
  driver,
  onCancel,
  onRetry,
  onRating,
}: BookingFlowProps) {
  const [phase, setPhase] = useState<Phase>("waiting");
  const [waitTime, setWaitTime] = useState(0);

  // Driver live location
  const [driverLoc, setDriverLoc] = useState<{ lat: number; lng: number } | null>(null);

  // Rating state
  const [ratingStep, setRatingStep] = useState<"ac" | "stars" | "done">("ac");
  const [acRating, setAcRating] = useState<AcRating | null>(null);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Track previous trip status to detect transitions (for notification sound)
  const prevStatusRef = useRef<string | null>(null);

  // Subscribe to driver live location when trip is accepted/active
  useEffect(() => {
    if (!trip || !trip.driverid || trip.status === "pending" || trip.status === "completed" || trip.status === "cancelled" || trip.status === "rejected") {
      setDriverLoc(null);
      return;
    }
    return subscribeDriverLocation(trip.driverid, setDriverLoc);
  }, [trip?.driverid, trip?.status]);

  useEffect(() => {
    if (!trip) {
      setPhase("waiting");
      prevStatusRef.current = null;
      return;
    }

    const prevStatus = prevStatusRef.current;
    // Transition to accepted → loud continuous alarm + message
    if (trip.status === "accepted" && prevStatus !== "accepted") {
      startAlarm();
      // Stop after a few seconds; the passenger will see the confirmed screen
      setTimeout(() => stopAlarm(), 6000);
    }
    // Transition to driver_arrived → loud continuous alarm
    if (trip.status === "driver_arrived" && prevStatus !== "driver_arrived") {
      startAlarm();
      setTimeout(() => stopAlarm(), 6000);
    }
    prevStatusRef.current = trip.status;

    if (
      trip.status === "accepted" ||
      trip.status === "driver_arrived" ||
      trip.status === "picked_up"
    ) {
      setPhase("confirmed");
    } else if (trip.status === "cancelled" || trip.status === "Cancelled") {
      setPhase("cancelled");
    } else if (trip.status === "rejected") {
      setPhase("rejected");
    } else if (trip.status === "completed") {
      if (trip.passengerRating == null) {
        setPhase("rating");
        setRatingStep(trip.taxiType === "super" ? "ac" : "stars");
      } else {
        setPhase("confirmed");
      }
    }
  }, [trip]);

  useEffect(() => {
    if (phase === "waiting") {
      const timer = setInterval(() => setWaitTime((w) => w + 1), 1000);
      return () => clearInterval(timer);
    }
  }, [phase]);

  // Cleanup alarm on unmount
  useEffect(() => {
    return () => stopAlarm();
  }, []);

  // --- Waiting phase ---
  if (phase === "waiting") {
    return (
      <div className="flex flex-col min-h-screen bg-ink-bg animate-fade-in">
        <div className="flex items-center gap-3 px-5 pt-6 pb-4">
          <button
            onClick={onCancel}
            className="p-2 rounded-full bg-ink-card border border-ink-border text-txt-sub hover:text-txt transition"
          >
            <ChevronRight size={20} />
          </button>
          <div>
            <h2 className="text-lg font-bold text-txt">جاري البحث عن سائق</h2>
            <p className="text-xs text-txt-muted line-clamp-1">
              {from} ← {to}
            </p>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-gold/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-gold animate-spin" />
            <div className="w-20 h-20 rounded-full bg-gradient-to-b from-gold-light to-gold-dark flex items-center justify-center text-3xl">
              🚕
            </div>
          </div>
          <h2 className="mt-8 text-xl font-bold text-txt">
            جاري البحث عن سائق... ⏳
          </h2>
          <p className="mt-2 text-sm text-txt-muted">
            نبحث عن أقرب سائق متاح لك ({waitTime}ث)
          </p>
          <div className="mt-6 flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-gold animate-bounce-dot"
                style={{ animationDelay: `${i * 0.16}s` }}
              />
            ))}
          </div>

          <div className="mt-8 w-full bg-ink-card rounded-card border border-ink-border p-4">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-ink-border">
              <span className="text-xs text-txt-sub">الأجرة</span>
              <span className="text-lg font-extrabold text-gold">
                {trip ? trip.fare.toLocaleString() : "—"}{" "}
                <span className="text-xs">د.ع</span>
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <MapPin size={14} className="text-mapblue mt-0.5" />
                <span className="text-xs text-txt">{from}</span>
              </div>
              <div className="flex items-start gap-2">
                <Navigation size={14} className="text-gold mt-0.5" />
                <span className="text-xs text-txt">{to}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="mt-8 px-6 py-2.5 rounded-card bg-ink-card border border-ink-border text-danger text-sm font-semibold hover:bg-danger/10 transition"
          >
            إلغاء الطلب
          </button>
        </div>
      </div>
    );
  }

  // --- Rejected phase (no driver accepted) ---
  if (phase === "rejected") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-ink-bg px-6 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-danger/15 border border-danger/30 flex items-center justify-center text-danger mb-5">
          <AlertCircle size={36} />
        </div>
        <h2 className="text-xl font-bold text-txt">❌ السائق رفض الطلب</h2>
        <p className="mt-2 text-sm text-txt-muted text-center max-w-xs">
          لم يتمكن السائق من قبول طلبك. يمكنك المحاولة مرة أخرى.
        </p>
        <button
          onClick={onRetry}
          className="mt-8 flex items-center gap-2 px-6 py-3 rounded-card bg-gradient-to-b from-gold-light to-gold-dark text-ink-bg font-bold text-sm hover:opacity-90 transition"
        >
          <Clock size={18} />
          طلب تكسي جديد
        </button>
        <button
          onClick={onCancel}
          className="mt-3 px-6 py-2.5 text-txt-muted text-sm font-semibold hover:text-txt transition"
        >
          إلغاء
        </button>
      </div>
    );
  }

  // --- Cancelled by driver phase ---
  if (phase === "cancelled") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-ink-bg px-6 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-danger/15 border border-danger/30 flex items-center justify-center text-danger mb-5">
          <X size={36} />
        </div>
        <h2 className="text-xl font-bold text-txt">❌ السائق ألغى الرحلة</h2>
        <p className="mt-2 text-sm text-txt-muted text-center max-w-xs">
          اعتذر السائق عن إكمال الرحلة. يمكنك طلب تكسي جديد.
        </p>
        <button
          onClick={onRetry}
          className="mt-8 flex items-center gap-2 px-6 py-3 rounded-card bg-gradient-to-b from-gold-light to-gold-dark text-ink-bg font-bold text-sm hover:opacity-90 transition"
        >
          <Clock size={18} />
          طلب تكسي جديد
        </button>
        <button
          onClick={onCancel}
          className="mt-3 px-6 py-2.5 text-txt-muted text-sm font-semibold hover:text-txt transition"
        >
          العودة للرئيسية
        </button>
      </div>
    );
  }

  // --- Rating phase (after completed) ---
  if (phase === "rating" && trip) {
    const isSuper = trip.taxiType === "super";

    async function handleSubmit() {
      if (!trip || !driver || stars === 0) return;
      setSubmitting(true);
      try {
        await onRating(
          trip.id,
          driver.id,
          stars,
          comment,
          isSuper ? acRating : null
        );
        setRatingStep("done");
      } catch (e) {
        console.error("Rating submit error:", e);
      } finally {
        setSubmitting(false);
      }
    }

    if (ratingStep === "done") {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-ink-bg px-6 animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-success/15 border border-success/30 flex items-center justify-center text-success mb-5">
            <Check size={36} />
          </div>
          <h2 className="text-xl font-bold text-txt text-center">
            ✅ شكراً على تقييمك! نتمنى أن تكون رحلتك ممتعة
          </h2>
          <button
            onClick={onCancel}
            className="mt-8 flex items-center gap-2 px-6 py-3 rounded-card bg-gradient-to-b from-gold-light to-gold-dark text-ink-bg font-bold text-sm hover:opacity-90 transition"
          >
            العودة للرئيسية
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col min-h-screen bg-ink-bg px-5 pt-8 pb-8 animate-fade-in">
        <div className="w-10 h-1 rounded-full bg-ink-border mx-auto mb-6" />

        {/* AC rating step (super only) */}
        {ratingStep === "ac" && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center text-3xl mb-5">
              ❄️
            </div>
            <h2 className="text-lg font-bold text-txt text-center mb-6">
              هل قام السائق بتشغيل التبريد؟
            </h2>
            <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
              <button
                onClick={() => {
                  setAcRating("yes");
                  setRatingStep("stars");
                }}
                className="flex items-center justify-center gap-2 py-4 rounded-card bg-success/15 border border-success/30 text-success font-bold text-base hover:bg-success/25 transition"
              >
                <Check size={22} />
                نعم ✅
              </button>
              <button
                onClick={() => {
                  setAcRating("no");
                  setRatingStep("stars");
                }}
                className="flex items-center justify-center gap-2 py-4 rounded-card bg-danger/15 border border-danger/30 text-danger font-bold text-base hover:bg-danger/25 transition"
              >
                <X size={22} />
                لا ❌
              </button>
            </div>
          </div>
        )}

        {/* Stars + comment step (all trips) */}
        {ratingStep === "stars" && (
          <div className="flex-1 flex flex-col">
            {/* Driver info */}
            {driver && (
              <div className="flex items-center gap-3 mb-6 bg-ink-card rounded-card border border-ink-border p-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-b from-gold-light to-gold-dark flex items-center justify-center text-ink-bg font-bold text-xl">
                  {driver.name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-txt">{driver.name}</p>
                  <p className="text-xs text-txt-muted">{driver.car}</p>
                </div>
              </div>
            )}

            {/* Stars */}
            <h2 className="text-lg font-bold text-txt text-center mb-4">
              قيّم السائق
            </h2>
            <div className="flex items-center justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setStars(n)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    size={40}
                    className={
                      n <= stars ? "text-gold" : "text-ink-border"
                    }
                    fill={n <= stars ? "#D4A843" : "none"}
                  />
                </button>
              ))}
            </div>

            {/* Comment */}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="أضف ملاحظة (اختياري)"
              rows={3}
              className="w-full bg-ink-card rounded-card border border-ink-border p-4 text-sm text-txt placeholder:text-txt-muted focus:outline-none resize-none"
              dir="rtl"
            />

            <div className="mt-auto pt-6 space-y-3">
              <Button
                className="w-full py-4 text-base"
                disabled={stars === 0 || submitting}
                onClick={handleSubmit}
              >
                {submitting ? "جاري الإرسال..." : "إرسال التقييم"}
              </Button>
              <button
                onClick={onCancel}
                className="w-full py-3 text-txt-muted text-sm font-semibold hover:text-txt transition"
              >
                العودة للرئيسية
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- Confirmed phase ---
  return (
    <div className="flex flex-col min-h-screen bg-ink-bg animate-fade-in">
      {/* Live map with driver car marker */}
      <div className="relative h-[30vh] min-h-[220px] bg-ink-surface overflow-hidden">
        {driverLoc ? (
          <MapContainer
            center={[driverLoc.lat, driverLoc.lng]}
            zoom={15}
            maxZoom={19}
            className="h-full w-full"
            zoomControl={false}
            attributionControl={false}
            dragging={false}
            scrollWheelZoom={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker
              position={[driverLoc.lat, driverLoc.lng]}
              icon={new Icon({
                iconUrl: `data:image/svg+xml,${encodeURIComponent(
                  `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" fill="#D4A843" stroke="#fff" stroke-width="2"/><text x="18" y="24" font-size="18" text-anchor="middle">🚕</text></svg>`
                )}`,
                iconSize: [36, 36],
                iconAnchor: [18, 18],
              })}
            />
          </MapContainer>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gold/10 animate-radar" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-gradient-to-b from-gold-light to-gold-dark flex items-center justify-center text-xl">
                  🚕
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/15 border border-success/30 z-[500]">
          <Check size={14} className="text-success" />
          <span className="text-xs font-bold text-success">تم تأكيد الرحلة</span>
        </div>
        {trip && trip.status !== "picked_up" && (
          <button
            onClick={onCancel}
            className="absolute top-4 left-4 p-2 rounded-full bg-ink-card/90 border border-ink-border text-txt-sub hover:text-txt transition z-[500]"
          >
            <X size={18} />
          </button>
        )}
        {driverLoc && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ink-bg/90 border border-gold/30">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs text-gold font-semibold">السائق في طريقه إليك</span>
          </div>
        )}
      </div>

      <div className="flex-1 -mt-6 rounded-t-3xl bg-ink-bg px-5 pt-5 pb-8">
        <div className="w-10 h-1 rounded-full bg-ink-border mx-auto mb-5" />

        {/* Driver card */}
        {driver && (
          <div className="bg-ink-card rounded-card border border-ink-border p-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-gradient-to-b from-gold-light to-gold-dark flex items-center justify-center text-ink-bg font-bold text-xl">
                {driver.name.charAt(0)}
              </div>
              <div className="flex-1">
                <span className="font-bold text-txt">{driver.name}</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-0.5 text-xs text-gold">
                    <Star size={12} fill="currentColor" />
                    {driver.rating > 0 ? driver.rating.toFixed(1) : "جديد"}
                  </span>
                  <span className="text-xs text-txt-muted">·</span>
                  <span className="text-xs text-txt-muted">{driver.car}</span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-ink-border grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-txt-muted">رقم اللوحة</p>
                <p className="text-sm font-bold text-txt bg-ink-bg px-3 py-1.5 rounded-lg border border-ink-border inline-block mt-1">
                  {driver.plate}
                </p>
              </div>
              <div>
                <p className="text-xs text-txt-muted">رقم الهاتف</p>
                <p className="text-sm font-bold text-txt mt-1" dir="ltr">
                  {driver.phone}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Real-time trip status banner */}
        {trip &&
          (trip.status === "driver_arrived" ||
            trip.status === "picked_up" ||
            trip.status === "completed") && (
            <div
              className={`mt-4 flex items-center gap-3 p-4 rounded-card border animate-slide-up-sm ${
                trip.status === "driver_arrived"
                  ? "bg-mapblue/10 border-mapblue/30"
                  : trip.status === "picked_up"
                  ? "bg-gold/10 border-gold/30"
                  : "bg-success/10 border-success/30"
              }`}
            >
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                  trip.status === "driver_arrived"
                    ? "bg-mapblue/20"
                    : trip.status === "picked_up"
                    ? "bg-gold/20"
                    : "bg-success/20"
                }`}
              >
                {trip.status === "driver_arrived"
                  ? "🚕"
                  : trip.status === "picked_up"
                  ? "🚗"
                  : "✅"}
              </div>
              <p
                className={`text-sm font-bold ${
                  trip.status === "driver_arrived"
                    ? "text-mapblue"
                    : trip.status === "picked_up"
                    ? "text-gold"
                    : "text-success"
                }`}
              >
                {trip.status === "driver_arrived"
                  ? "🚕 السائق وصل إلى موقعك، استعد للركوب"
                  : trip.status === "picked_up"
                  ? "🚗 أنت في الطريق إلى وجهتك"
                  : "✅ وصلت إلى وجهتك، شكراً لاستخدامك تكسي خانقين"}
              </p>
            </div>
          )}

        {/* Trip details */}
        <div className="mt-4 bg-ink-card rounded-card border border-ink-border p-4 space-y-3">
          <div className="flex items-start gap-3">
            <MapPin size={18} className="text-mapblue mt-0.5" />
            <div>
              <p className="text-xs text-txt-muted">من</p>
              <p className="text-sm text-txt">{from}</p>
            </div>
          </div>
          <div className="h-px bg-ink-border" />
          <div className="flex items-start gap-3">
            <Navigation size={18} className="text-gold mt-0.5" />
            <div>
              <p className="text-xs text-txt-muted">إلى</p>
              <p className="text-sm text-txt">{to}</p>
            </div>
          </div>
        </div>

        {/* Fare */}
        <div className="mt-4 flex items-center justify-between bg-ink-card rounded-card border border-ink-border p-4">
          <span className="text-sm text-txt-sub">الأجرة</span>
          <span className="text-2xl font-extrabold text-gold">
            {trip ? trip.fare.toLocaleString() : "3,000"}{" "}
            <span className="text-sm">د.ع</span>
          </span>
        </div>

        {/* Contact buttons: call + WhatsApp */}
        {driver && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                const driverPhone = driver.phone;
                window.location.href = "tel:" + driverPhone;
              }}
              className="flex items-center justify-center gap-2 py-3.5 rounded-card bg-ink-card border border-gold/40 text-gold font-bold text-sm hover:bg-gold/10 transition"
            >
              <Phone size={18} />
              اتصل 📞
            </button>
            <button
              onClick={() => {
                const driverPhone = driver.phone;
                window.open(
                  "https://wa.me/" + driverPhone.replace("+", ""),
                  "_blank"
                );
              }}
              className="flex items-center justify-center gap-2 py-3.5 rounded-card bg-ink-card border border-gold/40 text-gold font-bold text-sm hover:bg-gold/10 transition"
            >
              <MessageCircle size={18} />
              واتساب 💬
            </button>
          </div>
        )}

        {/* In-app chat */}
        {trip && (
          <div className="mt-4">
            <Chat tripId={trip.id} sender="passenger" />
          </div>
        )}

        {/* Cancel — only available BEFORE pickup. After picked_up, only driver can end. */}
        {trip &&
          (trip.status === "accepted" ||
            trip.status === "driver_arrived") && (
            <button
              onClick={onCancel}
              className="mt-3 w-full flex items-center justify-center gap-2 py-3.5 rounded-card bg-danger/10 border border-danger/30 text-danger font-semibold text-sm hover:bg-danger/20 transition"
            >
              <X size={18} />
              إلغاء الرحلة
            </button>
          )}
      </div>
    </div>
  );
}
