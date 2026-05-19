import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";

// Fix broken default icons in vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const makeDeviceIcon = (online: boolean) =>
  L.divIcon({
    className: "",
    html: `<div style="width:30px;height:30px;border-radius:50%;background:${online ? "#22c55e" : "#94a3b8"};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
      </svg>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -18],
  });

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  type: "device" | "geofence" | "user";
  status?: "online" | "offline";
  info?: string;
}

export interface GeoFenceCircle {
  id: string;
  lat: number;
  lng: number;
  radius: number;
  name: string;
  status: "active" | "inactive";
}

interface GPSMapProps {
  markers?: MapMarker[];
  geoFences?: GeoFenceCircle[];
  center?: { lat: number; lng: number };
  zoom?: number;
  onMarkerClick?: (marker: MapMarker) => void;
  onGeoFenceClick?: (geoFence: GeoFenceCircle) => void;
  onRefresh?: () => void;
  className?: string;
  showControls?: boolean;
  interactive?: boolean;
  isRefreshingExternal?: boolean;
}

export function GPSMap({
  markers = [],
  geoFences = [],
  center = { lat: 20.5937, lng: 78.9629 },
  zoom = 6,
  onMarkerClick,
  onGeoFenceClick,
  className,
}: GPSMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapRef.current = L.map(containerRef.current, { zoomControl: true }).setView(
      [center.lat, center.lng],
      zoom
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers & fences whenever data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous layers (except tile layer)
    map.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer)) map.removeLayer(layer);
    });

    const allPoints: L.LatLngExpression[] = [];

    // Draw geo-fence circles
    geoFences.forEach((fence) => {
      allPoints.push([fence.lat, fence.lng]);
      const circle = L.circle([fence.lat, fence.lng], {
        radius: fence.radius,
        color: fence.status === "active" ? "#6366f1" : "#94a3b8",
        fillColor: fence.status === "active" ? "#6366f1" : "#94a3b8",
        fillOpacity: 0.12,
        weight: 2,
      }).addTo(map);

      circle.bindPopup(
        `<div style="min-width:140px">
          <p style="font-weight:600;margin:0 0 2px">${fence.name}</p>
          <p style="font-size:12px;color:#6b7280;margin:0">Radius: ${fence.radius}m</p>
          <p style="font-size:11px;color:#9ca3af;margin:2px 0 0">${fence.lat.toFixed(5)}°, ${fence.lng.toFixed(5)}°</p>
        </div>`
      );
      circle.on("click", () => onGeoFenceClick?.(fence));
    });

    // Draw device markers
    markers.forEach((m) => {
      allPoints.push([m.lat, m.lng]);
      const marker = L.marker([m.lat, m.lng], {
        icon: makeDeviceIcon(m.status === "online"),
      }).addTo(map);

      marker.bindPopup(
        `<div style="min-width:140px">
          <p style="font-weight:600;margin:0 0 2px">${m.label}</p>
          ${m.info ? `<p style="font-size:12px;color:#6b7280;margin:0">${m.info}</p>` : ""}
          <span style="display:inline-block;margin-top:4px;padding:1px 8px;border-radius:9999px;font-size:11px;color:white;background:${m.status === "online" ? "#22c55e" : "#94a3b8"}">${m.status}</span>
        </div>`
      );
      marker.on("click", () => onMarkerClick?.(m));
    });

    // Fit bounds to all points
    if (allPoints.length > 0) {
      map.fitBounds(L.latLngBounds(allPoints), { padding: [50, 50], maxZoom: 14 });
    }
  }, [markers, geoFences, onMarkerClick, onGeoFenceClick]);

  return (
    <div
      ref={containerRef}
      className={cn("w-full h-full", className)}
      style={{ minHeight: "400px" }}
    />
  );
}
