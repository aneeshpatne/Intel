import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function IndiaMap() {
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
      </MapContainer>
    </section>
  );
}
