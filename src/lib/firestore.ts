import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  Timestamp,
  runTransaction,
  arrayUnion,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  AppUser,
  Driver,
  Trip,
  TripStatus,
  PaymentMethod,
  Coordinates,
  ChatMessage,
  ChatSender,
  TaxiType,
  AcRating,
} from "./types";

const USERS = "users";
const DRIVERS = "drivers";
const TRIPS = "Trips";
const RECHARGE = "recharge_requests";

const WELCOME_BALANCE = 15000;
const COMMISSION = 250;
const MIN_BALANCE = -5000;

function tsToMillis(value: unknown): number {
  if (!value) return Date.now();
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === "number") return value;
  return Date.now();
}

// ---------- Users ----------

export function subscribeUsers(cb: (users: AppUser[]) => void) {
  return onSnapshot(collection(db, USERS), (snap) => {
    cb(
      snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name ?? "",
          phone: data.phone ?? d.id,
          role: data.role ?? "rider",
          createdAt: tsToMillis(data.createdAt),
        } as AppUser;
      })
    );
  });
}

export async function upsertUserByPhone(
  phone: string
): Promise<AppUser> {
  const ref = doc(db, USERS, phone);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    return {
      id: snap.id,
      name: data.name ?? "",
      phone: data.phone ?? snap.id,
      role: data.role ?? "rider",
      createdAt: tsToMillis(data.createdAt),
    };
  }
  await setDoc(ref, {
    phone,
    role: "rider",
    createdAt: serverTimestamp(),
  });
  return {
    id: phone,
    name: "",
    phone,
    role: "rider",
    createdAt: Date.now(),
  };
}

// ---------- Drivers ----------

export function subscribeDrivers(cb: (drivers: Driver[]) => void) {
  return onSnapshot(collection(db, DRIVERS), (snap) => {
    cb(snap.docs.map((d) => mapDriver(d.id, d.data())));
  });
}

export async function findDriverByPhone(
  phone: string
): Promise<Driver | null> {
  const q = query(collection(db, DRIVERS), where("phone", "==", phone));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return mapDriver(d.id, d.data());
}

export interface DriverRegistrationInput {
  name: string;
  phone: string;
  age: number;
  car: string;
  color: string;
  plate: string;
  year: number;
}

export async function registerDriver(input: DriverRegistrationInput) {
  await addDoc(collection(db, DRIVERS), {
    name: input.name,
    phone: input.phone,
    age: input.age,
    car: input.car,
    color: input.color,
    plate: input.plate,
    year: input.year,
    rating: 0,
    TotalTrips: 0,
    isonline: false,
    IsAvailable: false,
    isSuper: false,
    currentLat: null,
    currentLng: null,
    status: "pending",
    createdAt: serverTimestamp(),
  });
}

export async function updateDriverOnline(
  id: string,
  isonline: boolean
) {
  await updateDoc(doc(db, DRIVERS, id), {
    isonline,
    IsAvailable: isonline,
  });
}

export async function updateDriverSuper(
  id: string,
  isSuper: boolean
) {
  await updateDoc(doc(db, DRIVERS, id), { isSuper });
}

export async function updateDriverLocation(
  id: string,
  lat: number,
  lng: number
) {
  await updateDoc(doc(db, DRIVERS, id), {
    currentLat: lat,
    currentLng: lng,
    lastLocationUpdate: serverTimestamp(),
  });
}

export function subscribeDriverLocation(
  driverId: string,
  cb: (loc: { lat: number; lng: number } | null) => void
): () => void {
  return onSnapshot(doc(db, DRIVERS, driverId), (d) => {
    if (!d.exists()) {
      cb(null);
      return;
    }
    const data = d.data();
    if (data.currentLat != null && data.currentLng != null) {
      cb({ lat: data.currentLat as number, lng: data.currentLng as number });
    } else {
      cb(null);
    }
  });
}

export async function deleteDriver(id: string) {
  await deleteDoc(doc(db, DRIVERS, id));
}

// ---------- Trips ----------

export function subscribeTrips(cb: (trips: Trip[]) => void) {
  return onSnapshot(collection(db, TRIPS), (snap) => {
    const trips = snap.docs.map((d) => mapTrip(d.id, d.data()));
    trips.sort((a, b) => b.createdAt - a.createdAt);
    cb(trips);
  });
}

export function subscribeAvailableDrivers(cb: (drivers: Driver[]) => void) {
  const q = query(
    collection(db, DRIVERS),
    where("status", "==", "approved"),
    where("isonline", "==", true)
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => mapDriver(d.id, d.data())));
  });
}

export async function addTrip(input: {
  Fromaddress: string;
  Toaddress: string;
  fromCoords?: Coordinates;
  toCoords?: Coordinates;
  distance: number;
  fare: number;
  taxiType: TaxiType;
  passengerid: string;
  paymentMethod: PaymentMethod;
}) {
  const docRef = await addDoc(collection(db, TRIPS), {
    Fromaddress: input.Fromaddress,
    Toaddress: input.Toaddress,
    fromCoords: input.fromCoords ?? null,
    toCoords: input.toCoords ?? null,
    distance: input.distance,
    fare: input.fare,
    taxiType: input.taxiType,
    passengerid: input.passengerid,
    paymentMethod: input.paymentMethod,
    driverid: null,
    status: "pending",
    rejectedBy: [],
    passengerRating: null,
    passengerComment: null,
    acRating: null,
    ratedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateTripStatus(id: string, status: TripStatus) {
  await updateDoc(doc(db, TRIPS, id), {
    status,
    updatedAt: serverTimestamp(),
  });
}

// Driver rejects a trip: add their ID to rejectedBy array. Trip stays pending for others.
export async function rejectTrip(tripId: string, driverId: string) {
  await updateDoc(doc(db, TRIPS, tripId), {
    rejectedBy: arrayUnion(driverId),
    updatedAt: serverTimestamp(),
  });
}

// Driver cancels AFTER accepting: trip → cancelled, driver returns to available.
export async function cancelTripByDriver(tripId: string) {
  await updateDoc(doc(db, TRIPS, tripId), {
    status: "cancelled",
    updatedAt: serverTimestamp(),
  });
}

// First driver to accept wins: atomically set driverid + status to accepted
export async function acceptTrip(tripId: string, driverId: string) {
  await updateDoc(doc(db, TRIPS, tripId), {
    driverid: driverId,
    status: "accepted",
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTrip(id: string) {
  await deleteDoc(doc(db, TRIPS, id));
}

// Pending trips NOT rejected by this driver — visible to this online driver.
export function subscribePendingTripsForDriver(
  driverId: string,
  cb: (trips: Trip[]) => void
): () => void {
  const q = query(collection(db, TRIPS), where("status", "==", "pending"));
  return onSnapshot(q, (snap) => {
    const trips = snap.docs
      .map((d) => mapTrip(d.id, d.data()))
      .filter((t) => !t.rejectedBy.includes(driverId));
    trips.sort((a, b) => b.createdAt - a.createdAt);
    cb(trips);
  });
}

// All pending trips — visible to every online driver. First to accept wins.
export function subscribePendingTrips(cb: (trips: Trip[]) => void): () => void {
  const q = query(collection(db, TRIPS), where("status", "==", "pending"));
  return onSnapshot(q, (snap) => {
    const trips = snap.docs.map((d) => mapTrip(d.id, d.data()));
    trips.sort((a, b) => b.createdAt - a.createdAt);
    cb(trips);
  });
}

// Active trips assigned to this driver (accepted, driver_arrived, picked_up)
export function subscribeActiveTripsForDriver(
  driverId: string,
  cb: (trips: Trip[]) => void
): () => void {
  const q = query(
    collection(db, TRIPS),
    where("driverid", "==", driverId),
    where("status", "in", ["accepted", "driver_arrived", "picked_up"])
  );
  return onSnapshot(q, (snap) => {
    const trips = snap.docs.map((d) => mapTrip(d.id, d.data()));
    trips.sort((a, b) => b.createdAt - a.createdAt);
    cb(trips);
  });
}

export function subscribeTripById(
  tripId: string,
  cb: (trip: Trip | null) => void
): () => void {
  return onSnapshot(doc(db, TRIPS, tripId), (d) => {
    if (!d.exists()) {
      cb(null);
      return;
    }
    cb(mapTrip(d.id, d.data()));
  });
}

// ---------- Chat ----------

export function subscribeMessages(
  tripId: string,
  cb: (messages: ChatMessage[]) => void
): () => void {
  const col = collection(db, TRIPS, tripId, "messages");
  const q = query(col);
  return onSnapshot(q, (snap) => {
    const messages = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        text: (data.text as string) ?? "",
        sender: (data.sender as ChatSender) ?? "passenger",
        timestamp: tsToMillis(data.timestamp),
      } as ChatMessage;
    });
    messages.sort((a, b) => a.timestamp - b.timestamp);
    cb(messages);
  });
}

export async function sendMessage(
  tripId: string,
  text: string,
  sender: ChatSender
) {
  const col = collection(db, TRIPS, tripId, "messages");
  await addDoc(col, {
    text,
    sender,
    timestamp: serverTimestamp(),
  });
}

// Submit passenger rating: update trip + recalculate driver average rating + TotalTrips +1
export async function submitRating(
  tripId: string,
  driverId: string,
  rating: number,
  comment: string,
  acRating: AcRating | null
) {
  await runTransaction(db, async (tx) => {
    const tripRef = doc(db, TRIPS, tripId);
    const driverRef = doc(db, DRIVERS, driverId);
    const tripSnap = await tx.get(tripRef);
    const driverSnap = await tx.get(driverRef);
    if (!tripSnap.exists() || !driverSnap.exists()) return;

    const driverData = driverSnap.data();
    const currentTotal = (driverData.TotalTrips as number) ?? 0;
    const currentRating = (driverData.rating as number) ?? 0;
    // Recalculate average: (oldAvg * oldCount + newRating) / (oldCount + 1)
    const newTotal = currentTotal + 1;
    const newRating =
      newTotal > 0
        ? (currentRating * currentTotal + rating) / newTotal
        : rating;

    tx.update(driverRef, {
      TotalTrips: newTotal,
      rating: Math.round(newRating * 10) / 10,
    });

    tx.update(tripRef, {
      passengerRating: rating,
      passengerComment: comment,
      acRating: acRating,
      ratedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}

function mapDriver(id: string, data: Record<string, unknown>): Driver {
  return {
    id,
    name: (data.name as string) ?? "",
    phone: (data.phone as string) ?? "",
    age: (data.age as number) ?? 0,
    car: (data.car as string) ?? "",
    color: (data.color as string) ?? "",
    plate: (data.plate as string) ?? "",
    year: (data.year as number) ?? 0,
    rating: (data.rating as number) ?? 0,
    TotalTrips: (data.TotalTrips as number) ?? 0,
    isonline: (data.isonline as boolean) ?? false,
    IsAvailable: (data.IsAvailable as boolean) ?? false,
    isSuper: (data.isSuper as boolean) ?? false,
    currentLat: (data.currentLat as number | null) ?? null,
    currentLng: (data.currentLng as number | null) ?? null,
    status: (data.status as Driver["status"]) ?? "pending",
    balance: (data.balance as number) ?? 0,
    createdAt: tsToMillis(data.createdAt),
  };
}

// ---------- Wallet ----------

// Backfill: set balance to 15000 for approved drivers missing the field.
// Also acts as the "welcome gift" when a driver is first approved.
export async function ensureDriverBalance(driverId: string) {
  await runTransaction(db, async (tx) => {
    const ref = doc(db, DRIVERS, driverId);
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    if (data.balance === undefined || data.balance === null) {
      tx.update(ref, { balance: WELCOME_BALANCE });
    }
  });
}

// Backfill all approved drivers in one pass (called on app start).
export async function backfillApprovedBalances() {
  const q = query(
    collection(db, DRIVERS),
    where("status", "==", "approved")
  );
  const snap = await getDocs(q);
  const batch = snap.docs.filter((d) => {
    const data = d.data();
    return data.balance === undefined || data.balance === null;
  });
  await Promise.all(
    batch.map((d) =>
      updateDoc(doc(db, DRIVERS, d.id), { balance: WELCOME_BALANCE })
    )
  );
}

// Complete a trip and deduct commission in a single transaction.
// Returns the driver's new balance, or null if the trip/driver was missing.
export async function completeTripWithCommission(
  tripId: string,
  driverId: string
): Promise<number | null> {
  return runTransaction(db, async (tx) => {
    const tripRef = doc(db, TRIPS, tripId);
    const driverRef = doc(db, DRIVERS, driverId);

    const tripSnap = await tx.get(tripRef);
    const driverSnap = await tx.get(driverRef);

    if (!tripSnap.exists() || !driverSnap.exists()) return null;

    const tripData = tripSnap.data();
    if (tripData.status === "completed") {
      // Already completed — return current balance
      return (driverSnap.data().balance as number) ?? 0;
    }

    tx.update(tripRef, {
      status: "completed",
      updatedAt: serverTimestamp(),
    });

    const currentBalance = (driverSnap.data().balance as number) ?? 0;
    const newBalance = currentBalance - COMMISSION;
    tx.update(driverRef, {
      balance: newBalance,
      TotalTrips: ((driverSnap.data().TotalTrips as number) ?? 0) + 1,
    });

    return newBalance;
  });
}

export function canReceiveTrips(driver: Driver | null): boolean {
  if (!driver) return false;
  return driver.balance > MIN_BALANCE;
}

// ---------- Recharge ----------

export async function addRechargeRequest(input: {
  driverId: string;
  driverName: string;
  driverPhone: string;
  amount: number;
  code: string;
}) {
  await addDoc(collection(db, RECHARGE), {
    driverId: input.driverId,
    driverName: input.driverName,
    driverPhone: input.driverPhone,
    amount: input.amount,
    code: input.code,
    status: "pending",
    createdAt: serverTimestamp(),
  });
}

// Listen to this driver's recharge requests. When one transitions
// from "pending" to "approved", credit the driver's balance.
export function subscribeRechargeRequestsForDriver(
  driverId: string,
  onApproved: (amount: number) => void
): () => void {
  const q = query(collection(db, RECHARGE), where("driverId", "==", driverId));
  const seen = new Set<string>();

  return onSnapshot(q, (snap) => {
    snap.docChanges().forEach((change) => {
      if (change.type !== "modified") return;
      const data = change.doc.data();
      const id = change.doc.id;
      if (data.status === "approved" && !seen.has(id)) {
        seen.add(id);
        onApproved(data.amount as number);
      }
    });
  });
}

// Credit a driver's balance (used when a recharge is approved).
export async function creditDriverBalance(
  driverId: string,
  amount: number
) {
  await runTransaction(db, async (tx) => {
    const ref = doc(db, DRIVERS, driverId);
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const current = (snap.data().balance as number) ?? 0;
    tx.update(ref, { balance: current + amount });
  });
}

function mapTrip(id: string, data: Record<string, unknown>): Trip {
  return {
    id,
    Fromaddress: (data.Fromaddress as string) ?? "",
    Toaddress: (data.Toaddress as string) ?? "",
    fromCoords: (data.fromCoords as Coordinates | undefined) ?? undefined,
    toCoords: (data.toCoords as Coordinates | undefined) ?? undefined,
    distance: (data.distance as number) ?? 0,
    driverid: (data.driverid as string | null) ?? null,
    passengerid: (data.passengerid as string) ?? "",
    fare: (data.fare as number) ?? 0,
    taxiType: (data.taxiType as TaxiType) ?? "normal",
    paymentMethod: (data.paymentMethod as PaymentMethod) ?? "cash",
    status: (data.status as TripStatus) ?? "pending",
    rejectedBy: (data.rejectedBy as string[]) ?? [],
    passengerRating: (data.passengerRating as number | null) ?? null,
    passengerComment: (data.passengerComment as string | null) ?? null,
    acRating: (data.acRating as AcRating | null) ?? null,
    ratedAt: data.ratedAt ? tsToMillis(data.ratedAt) : null,
    createdAt: tsToMillis(data.createdAt),
    updatedAt: tsToMillis(data.updatedAt),
  };
}
