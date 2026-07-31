"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { Navigation, MapPin } from "lucide-react";
import "leaflet/dist/leaflet.css";

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const pinIcon = L.divIcon({
  className: "location-pin-marker",
  html: `
 <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);">
 <div style="width:40px;height:40px;border-radius:50%;background:#e03d8f;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(224,61,143,0.4);">
 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
 </div>
 <div style="width:3px;height:10px;background:#e03d8f;border-radius:0 0 2px 2px;"></div>
 <div style="width:8px;height:4px;background:rgba(0,0,0,0.15);border-radius:50%;margin-top:-1px;"></div>
 </div>
 `,
  iconSize: [40, 58],
  iconAnchor: [20, 58],
});

const MINDORO_CENTER: [number, number] = [12.88, 121.1];
const MINDORO_BOUNDS: L.LatLngBoundsExpression = [
  [12.25, 120.45],
  [13.55, 121.65],
];

interface ClickHandlerProps {
  onLocationSelect: (lat: number, lng: number) => void;
}

function ClickHandler({ onLocationSelect }: ClickHandlerProps) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function LocateButton() {
  const map = useMap();
  const [locating, setLocating] = useState(false);

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setLocating(true);
        map.locate({ setView: true, maxZoom: 16 });
        map.once("locationfound", () => setLocating(false));
        map.once("locationerror", () => {
          setLocating(false);
          alert(
            "Could not get your location. Please allow location access in your browser.",
          );
        });
      }}
      type="button"
      className="absolute bottom-4 right-4 z-[1000] bg-white p-3 rounded-full shadow-lg border border-black/10 hover:bg-primary/10 transition-colors"
      title="Use my current location"
    >
      <Navigation
        className={`h-5 w-5 text-primary ${locating ? "animate-pulse" : ""}`}
      />
    </button>
  );
}

interface LocationPickerMapProps {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (lat: number, lng: number) => void;
}

export default function LocationPickerMap({
  latitude,
  longitude,
  onLocationChange,
}: LocationPickerMapProps) {
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    setMapReady(true);
  }, []);

  const center: [number, number] =
    latitude && longitude ? [latitude, longitude] : MINDORO_CENTER;

  const zoom = latitude && longitude ? 15 : 9;

  if (!mapReady) {
    return (
      <div className="w-full h-[300px] rounded-2xl bg-[#f5f5f5] flex items-center justify-center animate-pulse">
        <div className="text-center">
          <MapPin className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative w-full h-[300px] rounded-2xl overflow-hidden border border-black/[0.06] shadow-sm">
        <MapContainer
          center={center}
          zoom={zoom}
          minZoom={8}
          maxZoom={18}
          maxBounds={MINDORO_BOUNDS}
          maxBoundsViscosity={1.0}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onLocationSelect={onLocationChange} />
          {latitude && longitude && (
            <Marker position={[latitude, longitude]} icon={pinIcon} />
          )}
          <LocateButton />
        </MapContainer>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
        <MapPin className="h-3 w-3 shrink-0" />
        {latitude && longitude ? (
          <span>
            Pinned at {latitude.toFixed(5)}, {longitude.toFixed(5)} — Tap the
            map to move pin
          </span>
        ) : (
          <span>
            Tap the map to pin your store&apos;s exact location, or use the
            locate button
          </span>
        )}
      </div>
    </div>
  );
}
