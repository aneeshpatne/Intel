import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const redTriangleIcon = L.divIcon({
  className: "",
  html: '<div style="width:6px;height:6px;transform:rotate(45deg);background:#f59e0b;opacity:0.85;box-shadow:0 0 5px rgba(245,158,11,0.5);"></div>',
  iconSize: [6, 6],
  iconAnchor: [3, 3],
});

const conflictMarkerIcon = L.divIcon({
  className: "",
  html: '<div style="position:relative;width:8px;height:8px;"><span style="position:absolute;top:3px;left:0;width:8px;height:2px;background:#dc2626;border-radius:1px;opacity:0.9;"></span><span style="position:absolute;top:0;left:3px;width:2px;height:8px;background:#dc2626;border-radius:1px;opacity:0.9;"></span></div>',
  iconSize: [8, 8],
  iconAnchor: [4, 4],
});

const weatherMarkerIcon = L.divIcon({
  className: "",
  html: '<div style="width:7px;height:7px;border-radius:50%;border:1.5px solid rgba(125,211,252,0.8);background:transparent;box-shadow:0 0 4px rgba(56,189,248,0.35);"></div>',
  iconSize: [7, 7],
  iconAnchor: [3, 3],
});

export default function IndiaMap({ conflict = [], weather = [], concern = [] }) {
  return (
    <section className="mx-auto mt-8 w-full max-w-[80rem] border border-zinc-800/80 bg-[#090c12] p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between border-b border-zinc-800/90 pb-4">
        <h2 className="text-lg font-semibold uppercase tracking-[0.14em] text-zinc-200">
          World Map
        </h2>
      </div>

      <MapContainer
        center={[20, 0]}
        zoom={2}
        style={{ height: "500px", width: "100%" }}
        scrollWheelZoom={false}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {conflict.map((position, index) => (
          <Marker key={`conflict-${index}`} position={position} icon={conflictMarkerIcon}>
            <Popup>Conflict marker</Popup>
          </Marker>
        ))}
        {weather.map((position, index) => (
          <Marker key={`weather-${index}`} position={position} icon={weatherMarkerIcon}>
            <Popup>Weather marker</Popup>
          </Marker>
        ))}
        {concern.map((position, index) => (
          <Marker key={`concern-${index}`} position={position} icon={redTriangleIcon}>
            <Popup>Concern marker</Popup>
          </Marker>
        ))}
      </MapContainer>
    </section>
  );
}
