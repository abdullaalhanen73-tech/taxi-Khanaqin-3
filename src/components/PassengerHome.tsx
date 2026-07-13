import { useState } from "react";
import {
  MapPin,
  Navigation,
  Search,
  Star,
  Home,
  Briefcase,
  Building2,
  PlusCircle,
} from "lucide-react";
import { Button } from "./Button";
import {
  LocationPicker,
  type PickedLocation,
} from "./LocationPicker";
import type { Coordinates, TaxiType } from "../lib/types";

const suggestions = [
  { name: "سوق خانقين", icon: Building2 },
  { name: "جسر خانقين", icon: Building2 },
  { name: "محطة الوقود", icon: Home },
  { name: "المستشفى العام", icon: Building2 },
  { name: "الجامع الكبير", icon: Building2 },
  { name: "المحطة البريلية", icon: Briefcase },
];

const chips = [
  { label: "المنزل", icon: Home },
  { label: "العمل", icon: Briefcase },
  { label: "السوق", icon: Building2 },
];

// Pricing: normal vs super, based on distance
function calcFare(taxiType: TaxiType, distance: number | null): number {
  const d = distance ?? 0;
  if (taxiType === "super") {
    if (d < 1) return 2250;
    if (d <= 5) return 3250;
    return 4250;
  }
  // normal
  if (d < 1) return 2000;
  if (d <= 5) return 3000;
  return 4000;
}

interface PassengerHomeProps {
  userName: string;
  onRequest: (
    from: string,
    to: string,
    fromCoords: Coordinates | undefined,
    toCoords: Coordinates | undefined,
    distance: number | undefined,
    taxiType: TaxiType,
    fare: number
  ) => void;
}

export function PassengerHome({ userName, onRequest }: PassengerHomeProps) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [activeField, setActiveField] = useState<"from" | "to" | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Map-picked locations (from the fullscreen picker)
  const [pickupLoc, setPickupLoc] = useState<PickedLocation | null>(null);
  const [destLoc, setDestLoc] = useState<PickedLocation | null>(null);

  // Picker state
  const [pickerStep, setPickerStep] = useState<"pickup" | "destination" | null>(null);

  // Taxi type selection
  const [taxiType, setTaxiType] = useState<TaxiType>("normal");

  const filtered = suggestions.filter((s) =>
    activeField && (activeField === "from" ? from : to)
      ? s.name.includes(activeField === "from" ? from : to)
      : true
  );

  // Button enabled when EITHER option is complete:
  // Option A: both text fields filled
  // Option B: both map locations picked
  const canRequest =
    (from.trim() !== "" && to.trim() !== "") ||
    (pickupLoc !== null && destLoc !== null);

  function pick(name: string) {
    if (activeField === "from") setFrom(name);
    else if (activeField === "to") setTo(name);
    setActiveField(null);
    setShowSuggestions(false);
  }

  function openPickerForPickup() {
    setPickerStep("pickup");
  }

  function openPickerForDestination() {
    setPickerStep("destination");
  }

  function handlePickerConfirm(loc: PickedLocation) {
    if (pickerStep === "pickup") {
      setPickupLoc(loc);
      setFrom(loc.address);
      // auto-advance to destination
      setPickerStep("destination");
    } else if (pickerStep === "destination") {
      setDestLoc(loc);
      setTo(loc.address);
      setPickerStep(null);
    }
  }

  function handlePickerClose() {
    setPickerStep(null);
  }

  // Haversine distance
  function calcDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  const distance =
    pickupLoc && destLoc
      ? calcDistance(
          pickupLoc.lat,
          pickupLoc.lng,
          destLoc.lat,
          destLoc.lng
        )
      : null;

  const fare = calcFare(taxiType, distance);

  function handleRequest() {
    const fromText = from || (pickupLoc ? pickupLoc.address : "");
    const toText = to || (destLoc ? destLoc.address : "");
    onRequest(
      fromText,
      toText,
      pickupLoc ? { lat: pickupLoc.lat, lng: pickupLoc.lng } : undefined,
      destLoc ? { lat: destLoc.lat, lng: destLoc.lng } : undefined,
      distance ?? undefined,
      taxiType,
      fare
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-ink-bg animate-fade-in">
      {/* Map preview / location picker entry */}
      <div className="relative h-[34vh] min-h-[240px] bg-ink-card">
        {/* Static preview with two tap zones */}
        <div className="absolute inset-0 flex flex-col">
          <button
            onClick={openPickerForPickup}
            className="flex-1 flex items-center justify-between px-5 border-b border-ink-border hover:bg-ink-surface transition text-right"
          >
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-mapblue" />
              <div>
                <p className="text-xs text-txt-muted">نقطة بداية الرحلة</p>
                <p className="text-sm text-txt line-clamp-1 max-w-[200px]">
                  {from || (pickupLoc ? pickupLoc.address : "اضغط لتحديد الموقع")}
                </p>
              </div>
            </div>
            <MapPin size={18} className="text-mapblue" />
          </button>

          <button
            onClick={openPickerForDestination}
            className="flex-1 flex items-center justify-between px-5 hover:bg-ink-surface transition text-right"
          >
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-sm bg-gold" />
              <div>
                <p className="text-xs text-txt-muted">نقطة نهاية الرحلة</p>
                <p className="text-sm text-txt line-clamp-1 max-w-[200px]">
                  {to || (destLoc ? destLoc.address : "اضغط لتحديد الموقع")}
                </p>
              </div>
            </div>
            <Navigation size={18} className="text-gold" />
          </button>
        </div>

        {/* Hint overlay when nothing picked */}
        {!pickupLoc && !destLoc && !from && !to && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-ink-bg/80 backdrop-blur-sm px-4 py-2 rounded-full border border-gold/30">
              <p className="text-xs text-gold text-center">
                اضغط لفتح الخريطة وتحديد موقعك
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom sheet */}
      <div className="flex-1 -mt-6 rounded-t-3xl bg-ink-bg px-5 pt-5 pb-24">
        <div className="w-10 h-1 rounded-full bg-ink-border mx-auto mb-4" />

        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">مرحبًا</span>
          <span className="text-lg font-bold text-gold">
            {userName || "بك"}
          </span>
        </div>

        {/* From / To text inputs (fallback) */}
        <div className="bg-ink-card rounded-card border border-ink-border p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center pt-1">
              <div className="w-3 h-3 rounded-full bg-mapblue" />
              <div className="w-0.5 h-6 bg-ink-border my-1" />
              <div className="w-3 h-3 rounded-sm bg-gold" />
            </div>
            <div className="flex-1 space-y-2">
              <input
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                onFocus={() => {
                  setActiveField("from");
                  setShowSuggestions(true);
                }}
                placeholder="من أين؟ (نص)"
                className="w-full bg-transparent text-sm text-txt placeholder:text-txt-muted focus:outline-none"
              />
              <div className="h-px bg-ink-border" />
              <input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                onFocus={() => {
                  setActiveField("to");
                  setShowSuggestions(true);
                }}
                placeholder="إلى أين؟ (نص)"
                className="w-full bg-transparent text-sm text-txt placeholder:text-txt-muted focus:outline-none"
              />
            </div>
            <Search size={18} className="text-txt-muted" />
          </div>
        </div>

        {/* Suggestions */}
        {showSuggestions && filtered.length > 0 && (
          <div className="mt-2 bg-ink-card rounded-card border border-ink-border overflow-hidden animate-slide-up-sm">
            {filtered.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.name}
                  onClick={() => pick(s.name)}
                  className="flex items-center gap-3 w-full px-4 py-3 hover:bg-ink-surface transition text-right"
                >
                  <MapPin size={16} className="text-txt-muted" />
                  <Icon size={16} className="text-gold" />
                  <span className="text-sm text-txt">{s.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Quick chips */}
        {!showSuggestions && (
          <div className="flex gap-2 mt-3">
            {chips.map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.label}
                  onClick={() => {
                    if (!from) setFrom(c.label);
                    else setTo(c.label);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-ink-card border border-ink-border text-xs text-txt-sub hover:border-gold/40 transition"
                >
                  <Icon size={14} className="text-gold" />
                  {c.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Taxi type selection */}
        {canRequest && !showSuggestions && (
          <div className="mt-4 grid grid-cols-2 gap-3 animate-slide-up-sm">
            <button
              onClick={() => setTaxiType("normal")}
              className={`relative flex flex-col items-center p-4 rounded-card border-2 transition text-center ${
                taxiType === "normal"
                  ? "border-gold bg-gold/10"
                  : "border-ink-border bg-ink-card"
              }`}
            >
              <span className="text-3xl mb-1">🚕</span>
              <span className="text-sm font-bold text-txt">عادي</span>
              <span className="text-[10px] text-txt-muted mt-0.5">عادي</span>
              <span className="text-xs font-extrabold text-gold mt-1">
                {calcFare("normal", distance).toLocaleString()} د.ع
              </span>
            </button>
            <button
              onClick={() => setTaxiType("super")}
              className={`relative flex flex-col items-center p-4 rounded-card border-2 transition text-center ${
                taxiType === "super"
                  ? "border-gold bg-gold/10"
                  : "border-ink-border bg-ink-card"
              }`}
            >
              <span className="text-3xl mb-1">🚖</span>
              <span className="text-sm font-bold text-txt">سوبر</span>
              <span className="text-[10px] text-txt-muted mt-0.5">
                تبريد إجباري
              </span>
              <span className="text-xs font-extrabold text-gold mt-1">
                {calcFare("super", distance).toLocaleString()} د.ع
              </span>
            </button>
          </div>
        )}

        {/* Fare estimate */}
        {canRequest && !showSuggestions && (
          <div className="mt-4 flex items-center justify-between bg-ink-card rounded-card border border-ink-border p-4 animate-slide-up-sm">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-txt-muted">الأجرة التقديرية</p>
                <p className="text-xl font-extrabold text-gold">
                  {fare.toLocaleString()} <span className="text-sm">د.ع</span>
                </p>
              </div>
              <div className="w-px h-10 bg-ink-border" />
              <div>
                <p className="text-xs text-txt-muted">المسافة</p>
                <p className="text-lg font-bold text-txt flex items-center gap-1">
                  {distance !== null
                    ? distance < 1
                      ? `${Math.round(distance * 1000)} م`
                      : `${distance.toFixed(1)} كم`
                    : "--"}
                </p>
              </div>
            </div>
            <Star size={20} className="text-gold" />
          </div>
        )}

        {/* Request button */}
        <div className="mt-5">
          <Button
            className="w-full py-4 text-base"
            disabled={!canRequest}
            onClick={handleRequest}
          >
            <Navigation size={20} />
            اطلب تكسي
          </Button>
        </div>

        {/* Recent destinations */}
        {!from && !to && (
          <div className="mt-6">
            <p className="text-xs font-semibold text-txt-sub mb-2">
              وجهات سابقة
            </p>
            <div className="space-y-2">
              {suggestions.slice(0, 3).map((s) => (
                <button
                  key={s.name}
                  onClick={() => setTo(s.name)}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-card bg-ink-card border border-ink-border hover:border-gold/30 transition text-right"
                >
                  <PlusCircle size={18} className="text-txt-muted" />
                  <span className="text-sm text-txt-sub">{s.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen location picker */}
      {pickerStep && (
        <LocationPicker
          step={pickerStep}
          initialCenter={
            pickupLoc
              ? [pickupLoc.lat, pickupLoc.lng]
              : undefined
          }
          existingPickup={pickerStep === "destination" ? pickupLoc : null}
          onConfirm={handlePickerConfirm}
          onClose={handlePickerClose}
        />
      )}
    </div>
  );
}
