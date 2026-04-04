"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icons broken by webpack
if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

function makeEmojiIcon(emoji: string) {
  return L.divIcon({
    html: `<div style="font-size:30px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))">${emoji}</div>`,
    className: "",
    iconAnchor: [15, 15],
    iconSize: [30, 30],
  });
}

function makeUserIcon() {
  return L.divIcon({
    html: `<div style="width:18px;height:18px;background:#3B82F6;border:3px solid white;border-radius:50%;box-shadow:0 0 10px rgba(59,130,246,0.7)"></div>`,
    className: "",
    iconAnchor: [9, 9],
    iconSize: [18, 18],
  });
}

// Centre la carte sur l'utilisateur à chaque mise à jour
function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.panTo([lat, lng], { animate: true, duration: 0.5 });
  }, [lat, lng, map]);
  return null;
}

interface Props {
  userLat: number;
  userLng: number;
  targetLat: number;
  targetLng: number;
  targetEmoji: string;
  isInGeofence: boolean;
}

export default function RallyMap({
  userLat,
  userLng,
  targetLat,
  targetLng,
  targetEmoji,
  isInGeofence,
}: Props) {
  return (
    <MapContainer
      center={[userLat, userLng]}
      zoom={17}
      style={{ height: "100%", width: "100%" }}
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <RecenterMap lat={userLat} lng={userLng} />
      {/* Position utilisateur */}
      <Marker position={[userLat, userLng]} icon={makeUserIcon()} />
      {/* Animal cible */}
      <Marker position={[targetLat, targetLng]} icon={makeEmojiIcon(targetEmoji)} />
      {/* Ligne pointillée entre les deux */}
      <Polyline
        positions={[
          [userLat, userLng],
          [targetLat, targetLng],
        ]}
        color={isInGeofence ? "#2D7D46" : "#EF9F27"}
        dashArray="8 10"
        weight={3}
        opacity={0.8}
      />
    </MapContainer>
  );
}
