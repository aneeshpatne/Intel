import { useEffect, useState } from "react";
import L from "leaflet";
import {
  GeoJSON,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
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

function isValidPosition(position) {
  return (
    Array.isArray(position) &&
    position.length === 2 &&
    typeof position[0] === "number" &&
    Number.isFinite(position[0]) &&
    typeof position[1] === "number" &&
    Number.isFinite(position[1])
  );
}

function normalizeMarkers(items) {
  if (!Array.isArray(items)) return [];

  return items.filter((item) => isValidPosition(item?.position));
}

function toFeatureCollection(source) {
  if (!source) return null;
  if (source.type === "FeatureCollection") return source;
  if (source.type === "Feature") {
    return { type: "FeatureCollection", features: [source] };
  }
  if (Array.isArray(source)) {
    return {
      type: "FeatureCollection",
      features: source.flatMap(
        (item) => toFeatureCollection(item)?.features ?? [],
      ),
    };
  }
  if (typeof source === "object") {
    return {
      type: "FeatureCollection",
      features: Object.values(source).flatMap(
        (item) => toFeatureCollection(item)?.features ?? [],
      ),
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

export default function IndiaMap({
  conflict = [],
  weather = [],
  concern = [],
}) {
  const [boundaryData, setBoundaryData] = useState(null);
  const conflictMarkers = normalizeMarkers(conflict);
  const weatherMarkers = normalizeMarkers(weather);
  const concernMarkers = normalizeMarkers(concern);

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
        setBoundaryData(
          toFeatureCollection(feature(topology, topology.objects[objectName])),
        );
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
    <section className="mx-auto w-full max-w-[80rem] rounded-3xl p-6 sm:p-8 bg-black/40 border border-white/[0.05] shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-2xl relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.03] via-transparent to-white/[0.01] opacity-0 transition-opacity duration-700 group-hover:opacity-100 pointer-events-none"></div>
      <div className="mb-6 flex items-end justify-between border-b border-white/[0.08] pb-4 relative z-10 w-full">
        <div className="flex flex-col">
          <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-400 font-bold mb-1.5 flex items-center gap-2">
            <svg
              className="w-3 h-3 text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Global Mapping
          </p>
          <h2 className="text-3xl font-light tracking-wide text-zinc-100 uppercase intel-title-font">
            Geospatial Intelligence
          </h2>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.05]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-zinc-300"></span>
          </span>
          <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-zinc-400 mt-0.5">
            Live Sat-Link
          </span>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl relative z-10 w-full group/map">
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_40px_rgba(0,0,0,0.8)] z-[20]"></div>
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.6)_100%)] z-[20]"></div>

        <MapContainer
          center={[20, 0]}
          zoom={2.4}
          style={{ height: "450px", width: "100%", background: "#020408" }}
          scrollWheelZoom={false}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <MapControls />
          {boundaryData?.features?.length ? (
            <GeoJSON
              data={boundaryData}
              style={{
                color: "#a1a1aa",
                weight: 1,
                opacity: 0.5,
                fillColor: "#ffffff",
                fillOpacity: 0.02,
              }}
            />
          ) : null}
          {conflictMarkers.map((item, index) => (
            <Marker
              key={`conflict-${index}`}
              position={item.position}
              icon={conflictMarkerIcon}
            >
              <Popup className="intel-popup">
                <div className="intel-popup-content">
                  <p className="intel-popup-label flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-600 rounded-sm inline-block"></span>{" "}
                    Conflict
                  </p>
                  <p className="intel-popup-text">
                    {item.comment || "Conflict marker"}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
          {weatherMarkers.map((item, index) => (
            <Marker
              key={`weather-${index}`}
              position={item.position}
              icon={weatherMarkerIcon}
            >
              <Popup className="intel-popup">
                <div className="intel-popup-content">
                  <p className="intel-popup-label flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-sky-400 rounded-full inline-block"></span>{" "}
                    Weather
                  </p>
                  <p className="intel-popup-text">
                    {item.comment || "Weather marker"}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
          {concernMarkers.map((item, index) => (
            <Marker
              key={`concern-${index}`}
              position={item.position}
              icon={redTriangleIcon}
            >
              <Popup className="intel-popup">
                <div className="intel-popup-content">
                  <p className="intel-popup-label flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-sm rotate-45 inline-block"></span>{" "}
                    Concern
                  </p>
                  <p className="intel-popup-text">
                    {item.comment || "Concern marker"}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </section>
  );
}
