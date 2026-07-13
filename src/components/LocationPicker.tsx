import { useState, useEffect, useRef, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
} from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import { Icon } from "leaflet";
import { LocateFixed, X, Loader2, MapPin, Navigation } from "lucide-react";

const KHANAQIN_CENTER: [number, number] = [34.3489, 45.3850];
const DEFAULT_ZOOM = 14;

const PICKUP_COLOR = "#4A9EFF";
const DEST_COLOR = "#D4A843";

export interface PickedLocation {
  lat: number;
  lng: number;
  address: string;
}

interface LocationPickerProps {
  step: "pickup" | "destination";
  initialCenter?: [number, number];
  /** Already-confirmed pickup — shown as a fixed blue pin while picking destination */
  existingPickup?: PickedLocation | null;
  onConfirm: (loc: PickedLocation) => void;
  onClose: () => void;
}

function makePinIcon(color: string) {
  return new Icon({
    iconUrl: `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="42" viewBox="0 0 24 36"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24c0-6.6-5.4-12-12-12z" fill="${color}" stroke="#fff" stroke-width="1.5"/><circle cx="12" cy="12" r="5" fill="#fff"/></svg>`
    )}`,
    iconSize: [28, 42],
    iconAnchor: [14, 42],
  });
}

const pickupPinIcon = makePinIcon(PICKUP_COLOR);

// Track map center as user drags, fire reverse geocoding
function CenterTracker({
  onCenterChange,
}: {
  onCenterChange: (lat: number, lng: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    const handler = () => {
      const c = map.getCenter();
      onCenterChange(c.lat, c.lng);
    };
    map.on("move", handler);
    map.on("moveend", handler);
    handler(); // fire once for initial center
    return () => {
      map.off("move", handler);
      map.off("moveend", handler);
    };
  }, [map, onCenterChange]);

  return null;
}

// Imperative controller: lets parent recenter the map (GPS button)
function MapController({
  mapRef,
}: {
  mapRef: React.MutableRefObject<LeafletMap | null>;
}) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);
  return null;
}

export function LocationPicker({
  step,
  initialCenter,
  existingPickup,
  onConfirm,
  onClose,
}: LocationPickerProps) {
  const [center, setCenter] = useState<{ lat: number; lng: number }>({
    lat: initialCenter ? initialCenter[0] : KHANAQIN_CENTER[0],
    lng: initialCenter ? initialCenter[1] : KHANAQIN_CENTER[1],
  });
  const [address, setAddress] = useState("جاري تحديد الموقع...");
  const [loadingAddr, setLoadingAddr] = useState(false);
  const [locating, setLocating] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null);
  const reverseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastGeocode = useRef<string>("");

  const isPickup = step === "pickup";
  const pinColor = isPickup ? PICKUP_COLOR : DEST_COLOR;

  // Debounced reverse geocoding via Nominatim
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (key === lastGeocode.current) return;
    lastGeocode.current = key;

    setLoadingAddr(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar&zoom=18`,
        { headers: { "Accept-Language": "ar" } }
      );
      const data = await res.json();
      if (data && data.display_name) {
        const parts = data.display_name.split(",").slice(0, 3).join("، ");
        setAddress(parts || data.display_name);
      } else {
        setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch {
      setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setLoadingAddr(false);
    }
  }, []);

  const handleCenterChange = useCallback(
    (lat: number, lng: number) => {
      setCenter({ lat, lng });
      if (reverseTimer.current) clearTimeout(reverseTimer.current);
      reverseTimer.current = setTimeout(() => {
        reverseGeocode(lat, lng);
      }, 500);
    },
    [reverseGeocode]
  );

  // GPS locate
  const handleLocateMe = () => {
    if (!navigator.geolocation || !mapRef.current) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        mapRef.current!.setView([latitude, longitude], 16, { animate: false });
        setLocating(false);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  function handleConfirm() {
    onConfirm({
      lat: center.lat,
      lng: center.lng,
      address,
    });
  }

  return (
    <div className="fixed inset-0 z-[2000] bg-white animate-fade-in">
      {/* Map */}
      <div className="absolute inset-0">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={DEFAULT_ZOOM}
          maxZoom={19}
          className="h-full w-full"
          zoomControl={true}
          attributionControl={true}
          scrollWheelZoom={true}
          touchZoom={true}
          dragging={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <MapController mapRef={mapRef} />
          <CenterTracker onCenterChange={handleCenterChange} />

          {/* Existing pickup pin (blue) — visible while picking destination */}
          {existingPickup && (
            <Marker
              position={[existingPickup.lat, existingPickup.lng]}
              icon={pickupPinIcon}
            />
          )}
        </MapContainer>
      </div>

      {/* Fixed center pin (stays in screen center while map moves) */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full z-[1500]">
        <div className="relative flex flex-col items-center">
          <svg
            width="40"
            height="56"
            viewBox="0 0 24 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24c0-6.6-5.4-12-12-12z"
              fill={pinColor}
              stroke="#fff"
              strokeWidth="1.5"
            />
            <circle cx="12" cy="12" r="5" fill="#fff" />
          </svg>
          <div
            className="absolute -bottom-1 w-2 h-2 rounded-full ring-2 ring-white shadow"
            style={{ backgroundColor: pinColor }}
          />
        </div>
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-[1600] pt-3 px-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white border border-gray-200 shadow-md text-gray-700 hover:bg-gray-100 transition"
          >
            <X size={20} />
          </button>
          <div className="flex-1 bg-white/95 backdrop-blur-sm rounded-full border border-gray-200 shadow-sm px-4 py-2">
            <p className="text-sm font-bold text-gray-800 text-center">
              {isPickup ? "📍 نقطة بداية الرحلة" : "🏁 نقطة نهاية الرحلة"}
            </p>
          </div>
          <div className="w-10" />
        </div>
      </div>

      {/* GPS button */}
      <button
        onClick={handleLocateMe}
        disabled={locating}
        className="absolute bottom-44 right-3 z-[1600] flex items-center justify-center w-12 h-12 rounded-full bg-white border border-gray-200 shadow-md hover:opacity-80 transition disabled:opacity-50"
        style={{ color: pinColor }}
        title="موقعي الحالي"
      >
        {locating ? (
          <Loader2 size={22} className="animate-spin" />
        ) : (
          <LocateFixed size={22} />
        )}
      </button>

      {/* Bottom panel */}
      <div className="absolute bottom-0 left-0 right-0 z-[1600] bg-white rounded-t-3xl shadow-2xl px-5 pt-4 pb-6 animate-slide-up">
        <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-3" />

        <div className="flex items-start gap-3 mb-4">
          <div
            className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: isPickup
                ? "rgba(74,158,255,0.15)"
                : "rgba(212,168,67,0.15)",
              color: pinColor,
            }}
          >
            {isPickup ? <MapPin size={18} /> : <Navigation size={18} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 mb-0.5">
              {isPickup ? "موقع الانطلاق" : "موقع الوصول"}
            </p>
            <div className="flex items-center gap-2">
              {loadingAddr && (
                <Loader2
                  size={14}
                  className="animate-spin text-gray-400 flex-shrink-0"
                />
              )}
              <p
                className="text-sm font-semibold text-gray-800 line-clamp-2"
                dir="rtl"
              >
                {address}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleConfirm}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-card font-bold text-base hover:opacity-90 transition text-white"
          style={{ backgroundColor: pinColor }}
        >
          {isPickup ? "تأكيد نقطة بداية الرحلة" : "تأكيد نقطة نهاية الرحلة"}
        </button>
      </div>
    </div>
  );
}
