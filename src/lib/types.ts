export type UserRole = "rider" | "driver";

export interface AppUser {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  createdAt: number;
}

export type DriverStatus = "pending" | "approved" | "rejected";

export type TaxiType = "normal" | "super";

export interface Driver {
  id: string;
  name: string;
  phone: string;
  age: number;
  car: string;
  color: string;
  plate: string;
  year: number;
  rating: number;
  TotalTrips: number;
  isonline: boolean;
  IsAvailable: boolean;
  status: DriverStatus;
  balance: number;
  isSuper: boolean;
  currentLat: number | null;
  currentLng: number | null;
  createdAt: number;
}

export type TripStatus =
  | "pending"
  | "accepted"
  | "driver_arrived"
  | "picked_up"
  | "completed"
  | "rejected"
  | "cancelled"
  | "Cancelled";

export type PaymentMethod = "cash" | "card";

export interface Coordinates {
  lat: number;
  lng: number;
}

export type AcRating = "yes" | "no";

export interface Trip {
  id: string;
  Fromaddress: string;
  Toaddress: string;
  fromCoords?: Coordinates;
  toCoords?: Coordinates;
  distance: number;
  driverid: string | null;
  passengerid: string;
  fare: number;
  taxiType: TaxiType;
  paymentMethod: PaymentMethod;
  status: TripStatus;
  rejectedBy: string[];
  passengerRating: number | null;
  passengerComment: string | null;
  acRating: AcRating | null;
  ratedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export type ChatSender = "passenger" | "driver";

export interface ChatMessage {
  id: string;
  text: string;
  sender: ChatSender;
  timestamp: number;
}

export type RechargeStatus = "pending" | "approved" | "rejected";

export interface RechargeRequest {
  id: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  amount: number;
  code: string;
  status: RechargeStatus;
  createdAt: number;
}
