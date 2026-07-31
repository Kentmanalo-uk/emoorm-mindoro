"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  CircleMarker,
} from "react-leaflet";
// Haversine formula to calculate distance between two lat/lng points in km
function getDistanceFromLatLonInKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const R = 6371; // Radius of the earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    0.5 -
    Math.cos(dLat) / 2 +
    (Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      (1 - Math.cos(dLon))) /
      2;
  return R * 2 * Math.asin(Math.sqrt(a));
}
import L from "leaflet";
import Link from "next/link";
import Image from "next/image";
interface MindoroStoreMapProps {
  stores: StoreMarker[];
  isLoading?: boolean;
}
import { Navigation, Store as StoreIcon } from "lucide-react";
import "leaflet/dist/leaflet.css";

// Fix default marker icon issue with webpack/next
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface StoreMarker {
  id: string;
  name: string;
  imageUrl: string;
  category: string;
  city: string;
  latitude: number;
  longitude: number;
}

// Custom store marker icon creator
function createStoreIcon(imageUrl: string, name: string) {
  return L.divIcon({
    className: "store-map-marker",
    html: `
 <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);">
 <div style="width:48px;height:48px;border-radius:50%;border:3px solid #e03d8f;overflow:hidden;background:#fff;box-shadow:0 4px 16px rgba(0,0,0,0.18);">
 <img src="${imageUrl || "/placeholder.svg"}" style="width:100%;height:100%;object-fit:cover;" alt="${name}" />
 </div>
 <div style="width:3px;height:10px;background:#e03d8f;border-radius:0 0 2px 2px;"></div>
 <div style="width:8px;height:4px;background:rgba(0,0,0,0.15);border-radius:50%;margin-top:-1px;"></div>
 </div>
 `,
    iconSize: [48, 68],
    iconAnchor: [24, 68],
    popupAnchor: [0, -72],
  });
}

// Mindoro bounds to lock the map
const MINDORO_CENTER: [number, number] = [12.88, 121.1];
const MINDORO_BOUNDS: L.LatLngBoundsExpression = [
  [12.25, 120.45], // SW
  [13.55, 121.65], // NE
];

function LocationButton() {
  const map = useMap();
  const [locating, setLocating] = useState(false);

  const handleLocate = () => {
    setLocating(true);
    map.locate({ setView: true, maxZoom: 14 });
    map.once("locationfound", () => setLocating(false));
    map.once("locationerror", () => setLocating(false));
  };

  return (
    <button
      onClick={handleLocate}
      className="absolute bottom-4 right-4 z-[1000] bg-white p-3 rounded-full shadow-lg border border-black/10 hover:bg-primary/10 transition-colors"
      title="Find my location"
    >
      <Navigation
        className={`h-5 w-5 text-primary ${locating ? "animate-pulse" : ""}`}
      />
    </button>
  );
}

function MindoroStoreMap({ stores, isLoading }: MindoroStoreMapProps) {
  // All hooks must be called unconditionally and in the same order
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const storesWithLocation = useMemo(() => {
    return stores.filter((s: StoreMarker) => s.latitude && s.longitude);
  }, [stores]);

  useEffect(() => {
    setMapReady(true);
  }, []);

  // Ask for geolocation permission and get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }),
        () => {},
        { enableHighAccuracy: true },
      );
    }
  }, []);

  // Fullscreen API handlers
  const handleFullscreen = () => {
    const el = mapContainerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  if (!mapReady) {
    return (
      <div className="w-full h-[60vh] md:h-[70vh] rounded-[32px] bg-[#f5f5f5] flex items-center justify-center animate-pulse">
        <div className="text-center">
          <StoreIcon className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapContainerRef}
      className={`relative w-full h-[60vh] md:h-[70vh] rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-black/[0.04] bg-white ${isFullscreen ? "z-[9999] fixed inset-0 rounded-none h-full w-full" : ""}`}
      style={isFullscreen ? { height: "100vh", width: "100vw" } : {}}
    >
      {/* Fullscreen button */}
      <button
        onClick={handleFullscreen}
        className="absolute top-4 right-4 z-[1100] bg-white/90 backdrop-blur-sm px-3 py-2 rounded-full shadow-sm border border-black/10 hover:bg-primary/10 transition-colors flex items-center gap-2 text-xs font-bold"
        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        type="button"
      >
        {isFullscreen ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 13H5v6h6v-4m6-6h4V5h-6v4m-6 6v4m0 0H5v-6h4m6-6V5h6v6h-4"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4h6v2H6v4H4V4zm10 0h6v6h-2V6h-4V4zm6 10v6h-6v-2h4v-4h2zm-10 6H4v-6h2v4h4v2z"
            />
          </svg>
        )}
        {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
      </button>

      {/* Store count badge */}
      <div className="absolute top-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-black/5 flex items-center gap-2">
        <StoreIcon className="h-4 w-4 text-primary" />
        <span className="text-xs font-bold">
          {storesWithLocation.length}{" "}
          {storesWithLocation.length === 1 ? "Store" : "Stores"} on Map
        </span>
      </div>

      <MapContainer
        center={MINDORO_CENTER}
        zoom={9}
        minZoom={8}
        maxZoom={18}
        maxBounds={MINDORO_BOUNDS}
        maxBoundsViscosity={1.0}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* User location blue dot */}
        {userLocation && (
          <CircleMarker
            center={[userLocation.lat, userLocation.lng]}
            radius={10}
            pathOptions={{
              color: "#2563eb",
              fillColor: "#2563eb",
              fillOpacity: 0.7,
            }}
          />
        )}

        {storesWithLocation.map((store) => {
          let distance = null;
          if (userLocation) {
            distance = getDistanceFromLatLonInKm(
              userLocation.lat,
              userLocation.lng,
              store.latitude,
              store.longitude,
            );
          }
          return (
            <Marker
              key={store.id}
              position={[store.latitude, store.longitude]}
              icon={createStoreIcon(store.imageUrl, store.name)}
            >
              <Popup>
                <div className="flex flex-col items-center gap-2 p-1 min-w-[160px]">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-primary/20 bg-[#f8f8f8]">
                    {store.imageUrl ? (
                      <img
                        src={store.imageUrl}
                        alt={store.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <StoreIcon className="h-6 w-6 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-sm">{store.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {store.category} · {store.city || "Oriental Mindoro"}
                    </p>
                    {distance !== null && (
                      <p className="text-xs text-blue-600 font-semibold mt-1">
                        {distance.toFixed(2)} km from you
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 w-full mt-1">
                    <a
                      href={`/stores/${store.id}`}
                      className="px-4 py-1.5 bg-primary text-white !text-white text-[10px] font-bold rounded-full hover:bg-primary/90 transition-colors w-full block text-center"
                    >
                      Visit Shop
                    </a>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-1.5 bg-blue-600 text-white !text-white text-[10px] font-bold rounded-full hover:bg-blue-700 transition-colors w-full block text-center"
                    >
                      Get Directions
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        <LocationButton />
      </MapContainer>
      {storesWithLocation.length === 0 && !isLoading && (
        <div className="absolute inset-0 z-[500] bg-white/60 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="text-center p-8">
            <StoreIcon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-lg font-headline tracking-tight mb-1">
              No stores pinned yet
            </p>
            <p className="text-sm text-muted-foreground">
              Stores will appear here once sellers pin their location.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default MindoroStoreMap;
