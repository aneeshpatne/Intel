import { useEffect, useState } from "react";
import L from "leaflet";
import { GeoJSON, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { feature } from "topojson-client";
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

const INDIA_OUTLINE_URL = "/data/outline_of_india.topo.json";

function toFeatureCollection(source) {
  if (!source) return null;
  if (source.type === "FeatureCollection") return source;
  if (source.type === "Feature") {
    return { type: "FeatureCollection", features: [source] };
  }
  if (Array.isArray(source)) {
    return {
      type: "FeatureCollection",
      features: source.flatMap((item) => toFeatureCollection(item)?.features ?? []),
    };
  }
  if (typeof source === "object") {
    return {
      type: "FeatureCollection",
      features: Object.values(source).flatMap((item) => toFeatureCollection(item)?.features ?? []),
    };
  }
  return null;
}

function MapControls() {
  const map = useMap();

  useEffect(() => {
    const scale = L.control.scale({ imperial: false, position: "bottomleft" });
    scale.addTo(map);

    return () => {
      scale.remove();
    };
  }, [map]);

  return null;
}

export default function IndiaMap({ conflict = [], weather = [], concern = [] }) {
  const [boundaryData, setBoundaryData] = useState(null);

  useEffect(() => {
    let isActive = true;

    fetch(INDIA_OUTLINE_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load India outline");
        }
        return response.json();
      })
      .then((topology) => {
        if (!isActive) return;
        const objectName = Object.keys(topology.objects || {})[0];
        if (!objectName) {
          setBoundaryData(null);
          return;
        }
        setBoundaryData(toFeatureCollection(feature(topology, topology.objects[objectName])));
      })
      .catch(() => {
        if (!isActive) return;
        setBoundaryData(null);
      });

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <section className="mx-auto mt-8 w-full max-w-[80rem] border border-zinc-800/80 bg-[#090c12] p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between border-b border-zinc-800/90 pb-4">
        <h2 className="text-lg font-semibold uppercase tracking-[0.14em] text-zinc-200">
          India Map
        </h2>
        <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
          Survey of India outline
        </span>
      </div>

      <MapContainer
        center={[20, 0]}
        zoom={2.4}
        style={{ height: "500px", width: "100%", background: "#05070b" }}
        scrollWheelZoom={false}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a> | India outline: <a href="https://surveyofindia.gov.in/documents/Outline_of_India.zip">Survey of India</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <MapControls />
        {boundaryData?.features?.length ? (
          <GeoJSON
            data={boundaryData}
            style={{
              color: "#64748b",
              weight: 0.9,
              opacity: 0.55,
              fillColor: "#0b1220",
              fillOpacity: 0.14,
            }}
          />
        ) : null}
        {conflict.map((item, index) => (
          <Marker key={`conflict-${index}`} position={item.position} icon={conflictMarkerIcon}>
            <Popup className="intel-popup">
              <div className="intel-popup-content">
                <p className="intel-popup-label">Conflict</p>
                <p className="intel-popup-text">{item.comment || "Conflict marker"}</p>
              </div>
            </Popup>
          </Marker>
        ))}
        {weather.map((item, index) => (
          <Marker key={`weather-${index}`} position={item.position} icon={weatherMarkerIcon}>
            <Popup className="intel-popup">
              <div className="intel-popup-content">
                <p className="intel-popup-label">Weather</p>
                <p className="intel-popup-text">{item.comment || "Weather marker"}</p>
              </div>
            </Popup>
          </Marker>
        ))}
        {concern.map((item, index) => (
          <Marker key={`concern-${index}`} position={item.position} icon={redTriangleIcon}>
            <Popup className="intel-popup">
              <div className="intel-popup-content">
                <p className="intel-popup-label">Concern</p>
                <p className="intel-popup-text">{item.comment || "Concern marker"}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </section>
  );
}
