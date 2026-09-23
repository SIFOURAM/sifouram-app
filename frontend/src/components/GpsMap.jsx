import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const icon = L.divIcon({
  className: "",
  html: `<div style="width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#FF6B00;border:3px solid #fff;box-shadow:0 4px 14px rgba(255,107,0,.5)"></div>`,
  iconSize: [34, 34], iconAnchor: [17, 34],
});

export default function GpsMap({ points = [], height = 360 }) {
  const center = points.length ? [points[0].lat, points[0].lng] : [-6.2, 106.8167];
  return (
    <div style={{ height }} data-testid="gps-map">
      <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {points.map((p) => (
          <Marker key={p.rider_id} position={[p.lat, p.lng]} icon={icon}>
            <Popup><b>{p.rider_name}</b><br />{new Date(p.updated_at).toLocaleTimeString()}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
