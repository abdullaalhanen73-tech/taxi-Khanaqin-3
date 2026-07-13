import { useEffect, useState, useMemo, useRef } from "react";
import { CheckCircle2 } from "lucide-react";
import type { AppUser, Driver, Trip, TaxiType, AcRating, Coordinates } from "./lib/types";
import {
  subscribeUsers,
  subscribeDrivers,
  subscribeTrips,
  subscribePendingTripsForDriver,
  subscribeActiveTripsForDriver,
  subscribeTripById,
  addTrip,
  updateTripStatus,
  acceptTrip,
  rejectTrip,
  cancelTripByDriver,
  updateDriverOnline,
  updateDriverSuper,
  updateDriverLocation,
  completeTripWithCommission,
  addRechargeRequest,
  subscribeRechargeRequestsForDriver,
  creditDriverBalance,
  backfillApprovedBalances,
  submitRating,
} from "./lib/firestore";
import { SplashScreen } from "./components/SplashScreen";
import { LoginScreen } from "./components/LoginScreen";
import { PassengerHome } from "./components/PassengerHome";
import { BookingFlow } from "./components/BookingFlow";
import { DriverHome, type TripSummary } from "./components/DriverHome";
import { TripHistory } from "./components/TripHistory";
import { ProfileScreen } from "./components/ProfileScreen";
import { BottomNav, type TabId } from "./components/BottomNav";

type Screen = "splash" | "login" | "app";
type Role = "rider" | "driver";
type BookingPhase = null | {
  from: string;
  to: string;
  fromCoords?: { lat: number; lng: number };
  toCoords?: { lat: number; lng: number };
  distance: number;
  taxiType: TaxiType;
  fare: number;
};

const COMMISSION = 250;

function App() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [role, setRole] = useState<Role>("rider");
  const [phone, setPhone] = useState("");
  const [driverDoc, setDriverDoc] = useState<Driver | null>(null);
  const [tab, setTab] = useState<TabId>("home");
  const [booking, setBooking] = useState<BookingPhase>(null);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);

  const [users, setUsers] = useState<AppUser[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [pendingTrips, setPendingTrips] = useState<Trip[]>([]);
  const [driverActiveTrip, setDriverActiveTrip] = useState<Trip | null>(null);
  const [tripSummary, setTripSummary] = useState<TripSummary | null>(null);
  const [rechargeNotice, setRechargeNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Global subscriptions: users, drivers, all trips
  useEffect(() => {
    const unsubs = [
      subscribeUsers(setUsers),
      subscribeDrivers(setDrivers),
      subscribeTrips(setTrips),
    ];
    return () => unsubs.forEach((u) => u && u());
  }, []);

  // Backfill approved drivers missing a balance field (one-time on startup)
  useEffect(() => {
    backfillApprovedBalances();
  }, []);

  // Keep driverDoc in sync with the global drivers subscription
  const currentDriver = useMemo(() => {
    if (role !== "driver") return null;
    return drivers.find((d) => d.id === driverDoc?.id) ?? driverDoc;
  }, [drivers, role, driverDoc]);

  const currentUser = useMemo(
    () => users.find((u) => u.phone === phone) ?? null,
    [users, phone]
  );

  // All online drivers see pending trips (excluding ones they rejected)
  useEffect(() => {
    if (role !== "driver" || !currentDriver) {
      setPendingTrips([]);
      return;
    }
    return subscribePendingTripsForDriver(currentDriver.id, (trips) => {
      // Non-super drivers only see normal trips; super drivers see both
      if (currentDriver.isSuper) {
        setPendingTrips(trips);
      } else {
        setPendingTrips(trips.filter((t) => t.taxiType === "normal"));
      }
    });
  }, [role, currentDriver]);

  // Driver: subscribe to active trips assigned to this driver (accepted/picked_up)
  useEffect(() => {
    if (role !== "driver" || !currentDriver) {
      setDriverActiveTrip(null);
      return;
    }
    return subscribeActiveTripsForDriver(currentDriver.id, (trips) => {
      setDriverActiveTrip(trips[0] ?? null);
    });
  }, [role, currentDriver]);

  // Driver: live location tracking — watchPosition while an active trip exists
  useEffect(() => {
    if (role !== "driver" || !currentDriver || !driverActiveTrip) return;
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        updateDriverLocation(currentDriver.id, latitude, longitude);
      },
      (err) => {
        console.error("Driver location watch error:", err);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [role, currentDriver, driverActiveTrip]);

  // Driver: listen for recharge approvals — credit balance + show notification
  useEffect(() => {
    if (role !== "driver" || !currentDriver) return;
    return subscribeRechargeRequestsForDriver(currentDriver.id, async (amount) => {
      await creditDriverBalance(currentDriver.id, amount);
      setRechargeNotice(`✅ تم إضافة ${amount.toLocaleString()} دينار لرصيدك`);
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
      noticeTimer.current = setTimeout(() => setRechargeNotice(null), 5000);
    });
  }, [role, currentDriver]);

  // Passenger: subscribe to the active trip document in real-time
  useEffect(() => {
    if (!activeTripId) {
      setActiveTrip(null);
      return;
    }
    return subscribeTripById(activeTripId, setActiveTrip);
  }, [activeTripId]);

  // Auto-cancel pending trips after 5 minutes with no driver acceptance
  useEffect(() => {
    if (!activeTrip || activeTrip.status !== "pending") return;
    const elapsed = Date.now() - activeTrip.createdAt;
    const FIVE_MIN = 5 * 60 * 1000;
    if (elapsed >= FIVE_MIN) {
      updateTripStatus(activeTrip.id, "Cancelled");
      return;
    }
    const remaining = FIVE_MIN - elapsed;
    const timer = setTimeout(() => {
      updateTripStatus(activeTrip.id, "Cancelled");
    }, remaining);
    return () => clearTimeout(timer);
  }, [activeTrip]);

  // Trips for current user (history)
  const myTrips = useMemo(() => {
    if (role === "driver") {
      return trips.filter((t) => t.driverid === currentDriver?.id);
    }
    return trips.filter((t) => t.passengerid === phone);
  }, [trips, role, phone, currentDriver]);

  const todayTrips = useMemo(() => {
    const today = new Date().setHours(0, 0, 0, 0);
    return myTrips.filter((t) => t.createdAt >= today);
  }, [myTrips]);

  const earnings = useMemo(
    () =>
      todayTrips
        .filter((t) => t.status === "completed")
        .reduce((sum, t) => sum + t.fare, 0),
    [todayTrips]
  );

  // The driver whose ID matches the active trip's driverid
  const activeTripDriver = useMemo(() => {
    if (!activeTrip?.driverid) return null;
    return drivers.find((d) => d.id === activeTrip.driverid) ?? null;
  }, [activeTrip, drivers]);

  function handleLogin(p: string, r: Role, driver?: Driver) {
    setPhone(p);
    setRole(r);
    setDriverDoc(driver ?? null);
    setScreen("app");
    setTab("home");
  }

  function handleLogout() {
    setPhone("");
    setRole("rider");
    setDriverDoc(null);
    setScreen("login");
    setTab("home");
    setBooking(null);
    setActiveTripId(null);
    setActiveTrip(null);
  }

  // Passenger taps "اطلب تكسي" — create trip with NO driverid, status "pending"
  async function handleRequest(
    from: string,
    to: string,
    fromCoords: Coordinates | undefined,
    toCoords: Coordinates | undefined,
    distance: number | undefined,
    taxiType: TaxiType,
    fare: number
  ) {
    const tripId = await addTrip({
      Fromaddress: from,
      Toaddress: to,
      fromCoords,
      toCoords,
      distance: distance ?? 0,
      fare,
      taxiType,
      passengerid: phone,
      paymentMethod: "cash",
    });
    setBooking({ from, to, fromCoords, toCoords, distance: distance ?? 0, taxiType, fare });
    setActiveTripId(tripId);
    setActiveTrip(null);
  }

  // Passenger cancels the booking
  function handleCancelBooking() {
    if (activeTripId) {
      updateTripStatus(activeTripId, "Cancelled");
    }
    setBooking(null);
    setActiveTripId(null);
    setActiveTrip(null);
  }

  // Passenger retries after rejection
  function handleRetry() {
    setBooking(null);
    setActiveTripId(null);
    setActiveTrip(null);
  }

  // Driver accepts a trip — first to accept wins (sets driverid + status)
  function handleAcceptTrip(tripId: string) {
    if (currentDriver) {
      acceptTrip(tripId, currentDriver.id);
    }
  }

  // Driver rejects a trip: add to rejectedBy, trip stays pending for others
  function handleRejectTrip(tripId: string) {
    if (currentDriver) {
      rejectTrip(tripId, currentDriver.id);
    }
  }

  // Driver cancels AFTER accepting: trip → cancelled
  function handleCancelByDriver(tripId: string) {
    cancelTripByDriver(tripId);
  }

  // Driver toggles super mode
  function handleToggleSuper(isSuper: boolean) {
    if (currentDriver) {
      updateDriverSuper(currentDriver.id, isSuper);
    }
  }

  // Passenger submits rating after completed trip
  async function handleRating(
    tripId: string,
    driverId: string,
    rating: number,
    comment: string,
    acRating: AcRating | null
  ) {
    await submitRating(tripId, driverId, rating, comment, acRating);
    // Clear the booking so passenger returns home
    setBooking(null);
    setActiveTripId(null);
    setActiveTrip(null);
  }

  // Driver: passenger boarded
  function handlePickedUp(tripId: string) {
    updateTripStatus(tripId, "picked_up");
  }

  // Driver: arrived at pickup location
  function handleDriverArrived(tripId: string) {
    updateTripStatus(tripId, "driver_arrived");
  }

  // Driver: complete trip — deduct commission via transaction, show summary
  async function handleCompleteTrip(tripId: string) {
    if (!currentDriver) return;
    const trip = trips.find((t) => t.id === tripId);
    const fare = trip?.fare ?? 0;
    try {
      const newBalance = await completeTripWithCommission(tripId, currentDriver.id);
      setTripSummary({
        tripId,
        fare,
        commission: COMMISSION,
        earnings: fare - COMMISSION,
        newBalance: newBalance ?? 0,
      });
    } catch (e) {
      console.error("Complete trip error:", e);
      // Fallback: mark completed + still show summary
      updateTripStatus(tripId, "completed");
      setTripSummary({
        tripId,
        fare,
        commission: COMMISSION,
        earnings: fare - COMMISSION,
        newBalance: (currentDriver?.balance ?? 0) - COMMISSION,
      });
    }
  }

  // Driver: submit recharge request
  async function handleRecharge(amount: number, code: string) {
    if (!currentDriver) return;
    await addRechargeRequest({
      driverId: currentDriver.id,
      driverName: currentDriver.name,
      driverPhone: currentDriver.phone,
      amount,
      code,
    });
  }

  function handleToggleOnline(online: boolean) {
    if (currentDriver) {
      updateDriverOnline(currentDriver.id, online);
    }
  }

  // --- Splash ---
  if (screen === "splash") {
    return (
      <PhoneFrame>
        <SplashScreen onDone={() => setScreen("login")} />
      </PhoneFrame>
    );
  }

  // --- Login ---
  if (screen === "login") {
    return (
      <PhoneFrame>
        <LoginScreen onLogin={handleLogin} />
      </PhoneFrame>
    );
  }

  // --- App ---
  const showBooking = role === "rider" && booking !== null;

  return (
    <PhoneFrame>
      {showBooking ? (
        <BookingFlow
          from={booking!.from}
          to={booking!.to}
          trip={activeTrip}
          driver={activeTripDriver}
          onCancel={handleCancelBooking}
          onRetry={handleRetry}
          onRating={handleRating}
        />
      ) : (
        <>
          {tab === "home" &&
            (role === "rider" ? (
              <PassengerHome
                userName={currentUser?.name ?? ""}
                onRequest={handleRequest}
              />
            ) : (
              <DriverHome
                driver={currentDriver}
                todayTrips={todayTrips}
                pendingTrips={pendingTrips}
                activeTrip={driverActiveTrip}
                completedTripSummary={tripSummary}
                onToggleOnline={handleToggleOnline}
                onAccept={handleAcceptTrip}
                onReject={handleRejectTrip}
                onPickedUp={handlePickedUp}
                onDriverArrived={handleDriverArrived}
                onComplete={handleCompleteTrip}
                onCancelByDriver={handleCancelByDriver}
                onToggleSuper={handleToggleSuper}
                onDismissSummary={() => setTripSummary(null)}
                onRecharge={handleRecharge}
              />
            ))}

          {tab === "history" && <TripHistory trips={myTrips} />}

          {tab === "profile" && (
            <ProfileScreen
              name={
                currentUser?.name ??
                (role === "driver" ? currentDriver?.name ?? "سائق" : "راكب")
              }
              phone={phone}
              role={role}
              tripCount={myTrips.length}
              earnings={earnings}
              rating={currentDriver?.rating ?? 0}
              onLogout={handleLogout}
            />
          )}

          <BottomNav active={tab} role={role} onChange={setTab} />
        </>
      )}

      {/* Recharge approval notification toast */}
      {rechargeNotice && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] animate-slide-up-sm">
          <div className="flex items-center gap-2 px-5 py-3 rounded-card bg-success/15 border border-success/30 backdrop-blur-md shadow-lg">
            <CheckCircle2 size={18} className="text-success" />
            <span className="text-sm font-bold text-success">{rechargeNotice}</span>
          </div>
        </div>
      )}
    </PhoneFrame>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="relative w-full max-w-[390px] min-h-screen bg-ink-bg overflow-hidden shadow-2xl">
        {children}
      </div>
    </div>
  );
}

export default App;
