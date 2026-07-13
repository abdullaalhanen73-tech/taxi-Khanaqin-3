import { Navigation, Clock, CreditCard, Banknote } from "lucide-react";
import type { Trip, TripStatus } from "../lib/types";
import { EmptyState } from "./EmptyState";

const statusBadge: Record<TripStatus, { label: string; cls: string }> = {
  pending: { label: "بانتظار السائق", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  accepted: { label: "تم القبول", cls: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  driver_arrived: { label: "وصل السائق", cls: "bg-mapblue/15 text-mapblue border-mapblue/30" },
  picked_up: { label: "الراكب على متن", cls: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" },
  completed: { label: "مكتملة", cls: "bg-success/15 text-success border-success/30" },
  rejected: { label: "مرفوضة", cls: "bg-danger/15 text-danger border-danger/30" },
  cancelled: { label: "ملغاة", cls: "bg-danger/15 text-danger border-danger/30" },
  Cancelled: { label: "ملغاة", cls: "bg-danger/15 text-danger border-danger/30" },
};

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `قبل ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `قبل ${h} ساعة`;
  const d = Math.floor(h / 24);
  return `قبل ${d} يوم`;
}

interface TripHistoryProps {
  trips: Trip[];
}

export function TripHistory({ trips }: TripHistoryProps) {
  if (trips.length === 0) {
    return (
      <div className="px-5 pt-6">
        <h2 className="text-lg font-bold text-txt mb-4">سجل الرحلات</h2>
        <EmptyState
          icon={<Navigation size={28} />}
          title="لا توجد رحلات بعد"
          subtitle="ستظهر رحلاتك السابقة هنا"
        />
      </div>
    );
  }

  return (
    <div className="px-5 pt-6 pb-24 animate-fade-in">
      <h2 className="text-lg font-bold text-txt mb-4">سجل الرحلات</h2>
      <div className="space-y-3">
        {trips.map((trip, i) => {
          const badge = statusBadge[trip.status];
          return (
            <div
              key={trip.id}
              className="bg-ink-card rounded-card border border-ink-border p-4 animate-slide-up"
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold border ${badge.cls}`}
                >
                  {badge.label}
                </span>
                <span className="text-xs text-txt-muted flex items-center gap-1">
                  <Clock size={12} />
                  {timeAgo(trip.createdAt)}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="mt-1 w-2 h-2 rounded-full bg-mapblue flex-shrink-0" />
                  <span className="text-sm text-txt">{trip.Fromaddress}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1 w-2 h-2 rounded-full bg-gold flex-shrink-0" />
                  <span className="text-sm text-txt">{trip.Toaddress}</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-ink-border flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs text-txt-sub">
                  {trip.paymentMethod === "card" ? (
                    <CreditCard size={13} />
                  ) : (
                    <Banknote size={13} />
                  )}
                  {trip.paymentMethod === "card" ? "بطاقة" : "نقدًا"}
                </span>
                <span className="text-lg font-extrabold text-gold">
                  {trip.fare.toLocaleString()}{" "}
                  <span className="text-xs">د.ع</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
