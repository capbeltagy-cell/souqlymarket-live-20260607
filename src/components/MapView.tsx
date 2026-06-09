import "leaflet/dist/leaflet.css";
import type { ReactNode } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMapEvents } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import type { ListingType } from "@/lib/marketplace";

type MarkerData = {
  id: string;
  lat: number;
  lng: number;
  type: ListingType;
  title: string;
  description?: string;
};

type Props = {
  markers: MarkerData[];
  center?: [number, number];
  zoom?: number;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
  className?: string;
};

const COLORS: Record<ListingType | "default", string> = {
  land: "red",
  real_estate: "orange",
  factory: "blue",
  market: "green",
  fish_shed: "green",
  service: "purple",
  product: "gray",
  opportunity: "gray",
  default: "gray",
};

function MapClickHandler({ onMapClick }: { onMapClick?: (coords: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(e) {
      onMapClick?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export function MapView({ markers, center, zoom = 6, onMapClick, className }: Props) {
  const validMarkers = markers.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng));
  const initialCenter: LatLngExpression = center ?? (validMarkers.length > 0 ? [validMarkers[0].lat, validMarkers[0].lng] : [26.8206, 30.8025]);

  return (
    <div className={`rounded-xl overflow-hidden border border-border bg-card ${className ?? ""}`}>
      <MapContainer center={initialCenter} zoom={zoom} scrollWheelZoom={true} className="h-96 w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {onMapClick && <MapClickHandler onMapClick={onMapClick} />}
        {validMarkers.map((marker) => (
          <CircleMarker
            key={marker.id}
            center={[marker.lat, marker.lng]}
            radius={10}
            fillColor={COLORS[marker.type] ?? COLORS.default}
            color="#000"
            weight={1}
            opacity={1}
            fillOpacity={0.8}
          >
            <Popup>
              <div className="space-y-1">
                <div className="font-semibold">{marker.title}</div>
                {marker.description ? <div className="text-sm text-muted-foreground">{marker.description}</div> : null}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
