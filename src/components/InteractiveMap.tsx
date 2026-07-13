import { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, Polyline, useMap } from "react-leaflet";
import { Icon } from "leaflet";
import type { Map as LeafletMap } from "leaflet";
import { Search, X, MapPin, Navigation, LocateFixed } from "lucide-react";

// Khanaqin, Iraq coordinates
const KHANAQIN_CENTER: [number, number] = [34.3489, 45.3850];
const DEFAULT_ZOOM = 14;

// Custom marker icons
const createCustomIcon = (color: string, size: number = 24) =>
  new Icon({
    iconUrl: `data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size * 1.5}" viewBox="0 0 24 36">
        <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24c0-6.6-5.4-12-12-12z" fill="${color}"/>
        <circle cx="12" cy="12" r="5" fill="#0D0D0D"/>
      </svg>
    `)}`,
    iconSize: [size, size * 1.5],
    iconAnchor: [size / 2, size * 1.5],
    popupAnchor: [0, -size * 1.5],
  });

const pickupIcon = createCustomIcon("#3B82F6", 28);
const destinationIcon = createCustomIcon("#D4A843", 28);

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Nominatim search result
interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

// Map click handler component
function MapClickHandler({
  onMapClick,
  disabled,
}: {
  onMapClick: (lat: number, lng: number) => void;
  disabled: boolean;
}) {
  useMapEvents({
    click: (e) => {
      if (!disabled) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// Map controller to expose map instance
function MapController({ onMapReady }: { onMapReady: (map: LeafletMap) => void }) {
  const map = useMap();
  useEffect(() => {
    onMapReady(map);
  }, [map, onMapReady]);
  return null;
}

export interface LocationPin {
  lat: number;
  lng: number;
  address?: string;
}

interface InteractiveMapProps {
  pickup: LocationPin | null;
  destination: LocationPin | null;
  onPickupChange: (pin: LocationPin | null) => void;
  onDestinationChange: (pin: LocationPin | null) => void;
  onDistanceChange?: (distance: number) => void;
  className?: string;
}

export function InteractiveMap({
  pickup,
  destination,
  onPickupChange,
  onDestinationChange,
  onDistanceChange,
  className = "",
}: InteractiveMapProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTarget, setSearchTarget] = useState<"pickup" | "destination">("pickup");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  const handleMapReady = useCallback((map: LeafletMap) => {
    mapRef.current = map;
  }, []);

  // Calculate distance when both pins are set
  useEffect(() => {
    if (pickup && destination && onDistanceChange) {
      const dist = calculateDistance(pickup.lat, pickup.lng, destination.lat, destination.lng);
      onDistanceChange(dist);
    }
  }, [pickup, destination, onDistanceChange]);

  // Debounced Nominatim search
  const performSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query + " خانقين العراق"
        )}&limit=5&accept-language=ar`
      );
      const data = await response.json();
      setSearchResults(data as SearchResult[]);
    } catch (error) {
      console.error("Geocoding error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    setShowSearchResults(true);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  const handleMapClick = (lat: number, lng: number) => {
    const newPin: LocationPin = { lat, lng };

    if (!pickup) {
      onPickupChange(newPin);
    } else if (!destination) {
      onDestinationChange(newPin);
    }
  };

  const handleSearchResultSelect = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const pin: LocationPin = { lat, lng, address: result.display_name.split(",")[0] };

    if (searchTarget === "pickup" || pickup === null) {
      onPickupChange(pin);
    } else {
      onDestinationChange(pin);
    }

    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const handleReset = () => {
    onPickupChange(null);
    onDestinationChange(null);
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
  };

  // Geolocation: place pickup marker at user's current location
  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        onPickupChange({ lat: latitude, lng: longitude });
      },
      (err) => {
        console.error("Geolocation error:", err);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const distance =
    pickup && destination
      ? calculateDistance(pickup.lat, pickup.lng, destination.lat, destination.lng)
      : null;

  return (
    <div className={`relative ${className}`}>
      {/* Search bar */}
      <div className="absolute top-3 left-3 right-3 z-[1000]">
        <div className="bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 shadow-lg">
          {/* Search target selector */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setSearchTarget("pickup")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm transition ${
                searchTarget === "pickup"
                  ? "text-mapblue bg-mapblue/10"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <MapPin size={14} />
              <span>من أين</span>
              {pickup && <span className="w-2 h-2 rounded-full bg-mapblue" />}
            </button>
            <button
              onClick={() => setSearchTarget("destination")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm transition ${
                searchTarget === "destination"
                  ? "text-gold bg-gold/10"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Navigation size={14} />
              <span>إلى أين</span>
              {destination && <span className="w-2 h-2 rounded-full bg-gold" />}
            </button>
          </div>

          {/* Search input */}
          <div className="flex items-center px-3 py-2">
            <Search size={16} className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              onFocus={() => setShowSearchResults(true)}
              placeholder="ابحث عن موقع..."
              className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 mr-2 focus:outline-none"
              dir="rtl"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                className="p-1 text-gray-400 hover:text-gray-700"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Search results dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="border-t border-gray-200 max-h-48 overflow-y-auto">
              {searchResults.map((result, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSearchResultSelect(result)}
                  className="w-full px-3 py-2.5 text-right hover:bg-gray-100 transition"
                >
                  <p className="text-xs text-gray-800 line-clamp-2" dir="rtl">
                    {result.display_name}
                  </p>
                </button>
              ))}
            </div>
          )}

          {showSearchResults && isSearching && (
            <div className="border-t border-gray-200 px-3 py-2">
              <p className="text-xs text-gray-500 text-center">جاري البحث...</p>
            </div>
          )}
        </div>
      </div>

      {/* Map container */}
      <div className="h-full w-full rounded-lg overflow-hidden">
        <MapContainer
          center={KHANAQIN_CENTER}
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
          <MapController onMapReady={handleMapReady} />
          <MapClickHandler onMapClick={handleMapClick} disabled={!!pickup && !!destination} />

          {/* Pickup marker */}
          {pickup && (
            <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon} />
          )}

          {/* Destination marker */}
          {destination && (
            <Marker position={[destination.lat, destination.lng]} icon={destinationIcon} />
          )}

          {/* Route line */}
          {pickup && destination && (
            <Polyline
              positions={[
                [pickup.lat, pickup.lng],
                [destination.lat, destination.lng],
              ]}
              pathOptions={{
                color: "#D4A843",
                weight: 3,
                opacity: 0.7,
                dashArray: "8,8",
              }}
            />
          )}
        </MapContainer>
      </div>

      {/* Instructions overlay */}
      {!pickup && !destination && (
        <div className="absolute bottom-20 left-3 right-3 z-[999] flex justify-center">
          <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-700 text-center">
              انقر على الخريطة لتحديد موقع الانطلاق
            </p>
          </div>
        </div>
      )}

      {pickup && !destination && (
        <div className="absolute bottom-20 left-3 right-3 z-[999] flex justify-center">
          <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full border border-gold/30 shadow-sm">
            <p className="text-xs text-gold text-center">
              انقر مرة أخرى لتحديد الوجهة
            </p>
          </div>
        </div>
      )}

      {/* Locate me button */}
      <button
        onClick={handleLocateMe}
        className="absolute bottom-20 right-3 z-[1000] flex items-center justify-center w-11 h-11 rounded-full bg-white border border-gray-200 shadow-md text-gold hover:bg-gold/10 transition"
        title="موقعي الحالي"
      >
        <LocateFixed size={20} />
      </button>

      {/* Bottom controls */}
      {(pickup || destination || distance) && (
        <div className="absolute bottom-3 left-3 right-16 z-[999]">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 p-3 shadow-sm">
            {/* Distance display */}
            {distance !== null && (
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
                <span className="text-xs text-gray-500">المسافة</span>
                <span className="text-lg font-bold text-gold">
                  {distance < 1
                    ? `${Math.round(distance * 1000)} م`
                    : `${distance.toFixed(1)} كم`}
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-100 border border-gray-200 text-danger text-sm font-semibold hover:bg-danger/10 transition"
              >
                <X size={16} />
                إعادة تعيين
              </button>
              {pickup && destination && (
                <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-b from-gold-light to-gold-dark text-ink-bg text-sm font-bold hover:opacity-90 transition">
                  تأكيد
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
