import { useEffect, useState } from "react";
import {
  Car,
  Users,
  Wallet,
  TrendingUp,
  Check,
  X,
  ChevronRight,
  LogOut,
  Lock,
  Shield,
  CreditCard,
  User,
} from "lucide-react";
import type { Driver, RechargeRequest, Transaction, Trip } from "../lib/types";
import {
  subscribePendingDrivers,
  subscribeApprovedDrivers,
  subscribeRechargeRequests,
  subscribeTrips,
  subscribeTransactions,
  approveDriver,
  rejectDriver,
  approveRechargeRequest,
  rejectRechargeRequest,
} from "../lib/firestore";
import { Button } from "./Button";
import { Field } from "./Field";

const ADMIN_USER = "5353AIN";
const ADMIN_PASS = "5353AIN";

const RECHARGE_AMOUNTS = [5000, 10000, 25000];

type AdminTab = "overview" | "drivers" | "recharge" | "trips" | "transactions";

interface AdminPanelProps {
  onExit: () => void;
}

export function AdminPanel({ onExit }: AdminPanelProps) {
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<AdminTab>("overview");

  const [pendingDrivers, setPendingDrivers] = useState<Driver[]>([]);
  const [approvedDrivers, setApprovedDrivers] = useState<Driver[]>([]);
  const [rechargeReqs, setRechargeReqs] = useState<RechargeRequest[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Selected recharge amount per request
  const [amountMap, setAmountMap] = useState<Record<string, number>>({});

  function handleLogin() {
    if (user.trim() === ADMIN_USER && pass.trim() === ADMIN_PASS) {
      setAuthed(true);
      setError("");
    } else {
      setError("❌ اسم المستخدم أو كلمة المرور غير صحيحة");
    }
  }

  useEffect(() => {
    if (!authed) return;
    const unsubs = [
      subscribePendingDrivers(setPendingDrivers),
      subscribeApprovedDrivers(setApprovedDrivers),
      subscribeRechargeRequests(setRechargeReqs),
      subscribeTrips(setTrips),
      subscribeTransactions(setTransactions),
    ];
    return () => unsubs.forEach((u) => u && u());
  }, [authed]);

  // --- Login screen ---
  if (!authed) {
    return (
      <div className="min-h-screen bg-ink-bg flex items-center justify-center px-6">
        <div className="w-full max-w-sm bg-ink-surface rounded-card border border-ink-border p-6 animate-fade-in">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 rounded-full bg-gold/15 border-2 border-gold/40 flex items-center justify-center mb-4">
              <Shield size={30} className="text-gold" />
            </div>
            <h1 className="text-lg font-bold text-txt">لوحة تحكم الإدارة</h1>
            <p className="text-xs text-txt-muted mt-1">أدخل بيانات الدخول</p>
          </div>

          <div className="space-y-4">
            <Field
              label="اسم المستخدم"
              placeholder="اسم المستخدم"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              icon={<User size={18} />}
            />
            <Field
              label="كلمة المرور"
              type="password"
              placeholder="كلمة المرور"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              icon={<Lock size={18} />}
            />

            {error && (
              <p className="text-sm text-danger text-center">{error}</p>
            )}

            <Button className="w-full py-3.5" onClick={handleLogin}>
              دخول
            </Button>

            <button
              onClick={onExit}
              className="w-full flex items-center justify-center gap-1 py-2 text-txt-muted text-sm hover:text-txt transition"
            >
              <ChevronRight size={16} />
              العودة
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pendingRecharges = rechargeReqs.filter((r) => r.status === "pending");
  const completedTrips = trips.filter((t) => t.status === "completed");
  const totalRevenue = transactions
    .filter((t) => t.type === "commission")
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  const tabs: { id: AdminTab; label: string; icon: typeof Car }[] = [
    { id: "overview", label: "نظرة عامة", icon: TrendingUp },
    { id: "drivers", label: `السائقون (${pendingDrivers.length})`, icon: Users },
    { id: "recharge", label: `تعبئة (${pendingRecharges.length})`, icon: Wallet },
    { id: "trips", label: "الرحلات", icon: Car },
    { id: "transactions", label: "المعاملات", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-ink-bg" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-ink-surface/95 backdrop-blur-md border-b border-ink-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-gold" />
            <h1 className="text-base font-bold text-txt">لوحة الإدارة</h1>
          </div>
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 text-txt-muted hover:text-danger transition text-sm"
          >
            <LogOut size={16} />
            خروج
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-3xl mx-auto px-4 pb-2 flex gap-1 overflow-x-auto">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  active
                    ? "bg-gold text-ink-bg"
                    : "text-txt-muted hover:bg-ink-card"
                }`}
              >
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 pb-16">
        {/* Overview */}
        {tab === "overview" && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard
              icon={<Car size={18} />}
              label="إجمالي الرحلات"
              value={trips.length}
            />
            <StatCard
              icon={<Car size={18} />}
              label="رحلات مكتملة"
              value={completedTrips.length}
              color="text-success"
            />
            <StatCard
              icon={<Users size={18} />}
              label="سائقون معتمدون"
              value={approvedDrivers.length}
            />
            <StatCard
              icon={<Users size={18} />}
              label="سائقون بانتظار الموافقة"
              value={pendingDrivers.length}
              color="text-gold"
            />
            <StatCard
              icon={<Wallet size={18} />}
              label="طلبات تعبئة معلقة"
              value={pendingRecharges.length}
              color="text-gold"
            />
            <StatCard
              icon={<TrendingUp size={18} />}
              label="إجمالي العمولات (د.ع)"
              value={totalRevenue.toLocaleString()}
              color="text-gold"
            />
          </div>
        )}

        {/* Drivers */}
        {tab === "drivers" && (
          <div className="space-y-6">
            {/* Pending */}
            <section>
              <h2 className="text-sm font-bold text-txt mb-3">
                بانتظار الموافقة ({pendingDrivers.length})
              </h2>
              {pendingDrivers.length === 0 ? (
                <EmptyRow text="لا توجد طلبات تسجيل معلقة" />
              ) : (
                <div className="space-y-3">
                  {pendingDrivers.map((d) => (
                    <DriverCard
                      key={d.id}
                      driver={d}
                      pending
                      onApprove={() => approveDriver(d.id)}
                      onReject={() => rejectDriver(d.id)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Approved */}
            <section>
              <h2 className="text-sm font-bold text-txt mb-3">
                سائقون معتمدون ({approvedDrivers.length})
              </h2>
              {approvedDrivers.length === 0 ? (
                <EmptyRow text="لا يوجد سائقون معتمدون" />
              ) : (
                <div className="space-y-3">
                  {approvedDrivers.map((d) => (
                    <DriverCard key={d.id} driver={d} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* Recharge requests */}
        {tab === "recharge" && (
          <div className="space-y-3">
            {rechargeReqs.length === 0 ? (
              <EmptyRow text="لا توجد طلبات تعبئة" />
            ) : (
              rechargeReqs.map((r) => (
                <div
                  key={r.id}
                  className="bg-ink-card rounded-card border border-ink-border p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Wallet size={16} className="text-gold" />
                      <span className="text-sm font-bold text-txt">
                        {r.driverName}
                      </span>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="text-xs text-txt-muted space-y-1 mb-3">
                    <p>
                      الهاتف: <span dir="ltr">{r.driverPhone}</span>
                    </p>
                    <p>رمز الكارت: {r.code}</p>
                    <p>
                      المبلغ المقترح:{" "}
                      {(amountMap[r.id] ?? 5000).toLocaleString()} د.ع
                    </p>
                  </div>

                  {r.status === "pending" && (
                    <>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {RECHARGE_AMOUNTS.map((amt) => (
                          <button
                            key={amt}
                            onClick={() =>
                              setAmountMap((m) => ({ ...m, [r.id]: amt }))
                            }
                            className={`py-2 rounded-lg border-2 text-xs font-bold transition ${
                              (amountMap[r.id] ?? 5000) === amt
                                ? "border-gold bg-gold/10 text-gold"
                                : "border-ink-border text-txt-sub"
                            }`}
                          >
                            {amt.toLocaleString()}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="danger"
                          className="py-2.5"
                          onClick={() => rejectRechargeRequest(r.id)}
                        >
                          <X size={16} />
                          رفض
                        </Button>
                        <Button
                          className="py-2.5"
                          onClick={() =>
                            approveRechargeRequest(
                              r.id,
                              r.driverId,
                              amountMap[r.id] ?? 5000
                            )
                          }
                        >
                          <Check size={16} />
                          موافقة
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Trips */}
        {tab === "trips" && (
          <div className="space-y-3">
            {trips.length === 0 ? (
              <EmptyRow text="لا توجد رحلات" />
            ) : (
              trips.slice(0, 50).map((t) => (
                <div
                  key={t.id}
                  className="bg-ink-card rounded-card border border-ink-border p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <StatusBadge status={t.status} />
                    <span className="text-xs text-txt-muted">
                      {new Date(t.createdAt).toLocaleString("ar-IQ")}
                    </span>
                  </div>
                  <div className="text-xs text-txt space-y-1">
                    <p>
                      الراكب: {t.passengerName || "—"} ({t.passengerid})
                    </p>
                    <p>من: {t.Fromaddress}</p>
                    <p>إلى: {t.Toaddress}</p>
                    <p>النوع: {t.taxiType === "super" ? "سوبر" : "عادي"}</p>
                    <p className="text-gold font-bold">
                      الأجرة: {t.fare.toLocaleString()} د.ع
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Transactions */}
        {tab === "transactions" && (
          <div className="space-y-3">
            {transactions.length === 0 ? (
              <EmptyRow text="لا توجد معاملات" />
            ) : (
              transactions.slice(0, 50).map((tx) => (
                <div
                  key={tx.id}
                  className="bg-ink-card rounded-card border border-ink-border p-4 flex items-center justify-between"
                >
                  <div className="text-xs text-txt space-y-1">
                    <p>
                      السائق:{" "}
                      {
                        [...pendingDrivers, ...approvedDrivers].find(
                          (d) => d.id === tx.driverId
                        )?.name ?? tx.driverId
                      }
                    </p>
                    <p className="text-txt-muted">
                      {new Date(tx.createdAt).toLocaleString("ar-IQ")}
                    </p>
                    {tx.tripId && <p>الرحلة: {tx.tripId.slice(0, 8)}…</p>}
                  </div>
                  <div className="text-left">
                    <p
                      className={`text-sm font-extrabold ${
                        tx.amount >= 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {tx.amount >= 0 ? "+" : ""}
                      {tx.amount.toLocaleString()} د.ع
                    </p>
                    <p className="text-[10px] text-txt-muted">
                      {tx.type === "commission" ? "عمولة" : "تعبئة"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color = "text-txt",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="bg-ink-card rounded-card border border-ink-border p-4">
      <div className="flex items-center gap-2 text-gold mb-2">{icon}</div>
      <p className={`text-xl font-extrabold ${color}`}>{value}</p>
      <p className="text-[10px] text-txt-muted mt-0.5">{label}</p>
    </div>
  );
}

function DriverCard({
  driver,
  pending,
  onApprove,
  onReject,
}: {
  driver: Driver;
  pending?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  return (
    <div className="bg-ink-card rounded-card border border-ink-border p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gold/15 flex items-center justify-center text-gold font-bold">
          {driver.name.charAt(0)}
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-txt">{driver.name}</p>
          <p className="text-xs text-txt-muted" dir="ltr">
            {driver.phone}
          </p>
        </div>
        <StatusBadge status={driver.status} />
      </div>
      <div className="text-xs text-txt space-y-1 mb-3">
        <p>السيارة: {driver.car} ({driver.year})</p>
        <p>اللون: {driver.color}</p>
        <p>اللوحة: {driver.plate}</p>
        <p>العمر: {driver.age}</p>
        {driver.status === "approved" && (
          <p className="text-gold font-bold">
            الرصيد: {driver.balance.toLocaleString()} د.ع
          </p>
        )}
      </div>
      {pending && onApprove && onReject && (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="danger" className="py-2.5" onClick={onReject}>
            <X size={16} />
            رفض
          </Button>
          <Button className="py-2.5" onClick={onApprove}>
            <Check size={16} />
            موافقة
          </Button>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "معلق", cls: "bg-gold/15 text-gold border-gold/30" },
    approved: { label: "معتمد", cls: "bg-success/15 text-success border-success/30" },
    rejected: { label: "مرفوض", cls: "bg-danger/15 text-danger border-danger/30" },
    accepted: { label: "مقبولة", cls: "bg-mapblue/15 text-mapblue border-mapblue/30" },
    driver_arrived: { label: "وصل السائق", cls: "bg-mapblue/15 text-mapblue border-mapblue/30" },
    picked_up: { label: "على متن", cls: "bg-gold/15 text-gold border-gold/30" },
    completed: { label: "مكتملة", cls: "bg-success/15 text-success border-success/30" },
    cancelled: { label: "ملغاة", cls: "bg-danger/15 text-danger border-danger/30" },
    Cancelled: { label: "ملغاة", cls: "bg-danger/15 text-danger border-danger/30" },
  };
  const b = map[status] ?? { label: status, cls: "bg-ink-card text-txt-sub border-ink-border" };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${b.cls}`}>
      {b.label}
    </span>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="bg-ink-card rounded-card border border-ink-border p-8 text-center text-sm text-txt-muted">
      {text}
    </div>
  );
}
