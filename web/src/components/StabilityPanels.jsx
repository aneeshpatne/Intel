// @ts-check
import { useEffect, useMemo, useState } from "react";

/**
 * @typedef {"yellow" | "orange" | "red" | "green"} AlertColor
 */

/**
 * @typedef {Object} StabilityData
 * @property {number} score
 * @property {string[]} top_risk_factors
 * @property {string[]} top_stabilizers
 * @property {string} trend
 * @property {AlertColor} alert_color
 */

/** @type {StabilityData} */
const FALLBACK = {
  score: 0,
  top_risk_factors: [],
  top_stabilizers: [],
  trend: "flat",
  alert_color: "yellow",
};

/** @type {Record<AlertColor, string>} */
const COLOR_MAP = {
  yellow: "#eab308",
  orange: "#f97316",
  red: "#ef4444",
  green: "#22c55e",
};

/**
 * @param {unknown} value
 * @returns {AlertColor}
 */
function normalizeAlertColor(value) {
  if (
    value === "yellow" ||
    value === "orange" ||
    value === "red" ||
    value === "green"
  ) {
    return value;
  }
  return "yellow";
}

/**
 * @param {unknown} value
 * @returns {StabilityData}
 */
function normalizeData(value) {
  if (!value || typeof value !== "object") return FALLBACK;
  const typed = /** @type {Record<string, unknown>} */ (value);

  return {
    score: Number.isFinite(typed.score)
      ? /** @type {number} */ (typed.score)
      : 0,
    top_risk_factors: Array.isArray(typed.top_risk_factors)
      ? /** @type {string[]} */ (typed.top_risk_factors)
      : [],
    top_stabilizers: Array.isArray(typed.top_stabilizers)
      ? /** @type {string[]} */ (typed.top_stabilizers)
      : [],
    trend: typeof typed.trend === "string" ? typed.trend : "flat",
    alert_color: normalizeAlertColor(typed.alert_color),
  };
}

/**
 * @param {{ score: number; color: string }} props
 */
function ScoreRing({ score, color }) {
  const clamped = Math.max(0, Math.min(100, score));
  const circumference = 2 * Math.PI * 44;
  const dash = (clamped / 100) * circumference;

  return (
    <svg
      viewBox="0 0 120 120"
      className="h-[92px] w-[92px] shrink-0 sm:h-[112px] sm:w-[112px] drop-shadow-lg"
    >
      <circle
        cx="60"
        cy="60"
        r="44"
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth="6"
      />
      <circle
        cx="60"
        cy="60"
        r="44"
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference}`}
        transform="rotate(-90 60 60)"
        className="transition-all duration-1000 ease-out"
        style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
      />
      <text
        x="60"
        y="67"
        textAnchor="middle"
        className="fill-white text-[28px] font-semibold tracking-tight"
      >
        {clamped.toFixed(1)}
      </text>
    </svg>
  );
}

/**
 * @param {{ label: string; panelData: unknown }} props
 */
export default function StabilityPanels({ label, panelData }) {
  const data = useMemo(() => normalizeData(panelData), [panelData]);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const cycleTimer = setInterval(() => setStep((prev) => prev + 1), 3000);
    return () => clearInterval(cycleTimer);
  }, []);

  const riskItems = data.top_risk_factors;
  const stabilizerItems = data.top_stabilizers;

  const riskText =
    riskItems.length > 0
      ? riskItems[step % riskItems.length]
      : "No risk factor data";
  const stabilizerText =
    stabilizerItems.length > 0
      ? stabilizerItems[step % stabilizerItems.length]
      : "No stabilizer data";

  const color = COLOR_MAP[data.alert_color];
  const isUp = String(data.trend).toLowerCase() === "up";

  return (
    <article className="glass-panel glass-panel-hover group relative rounded-3xl p-6 sm:p-8 overflow-hidden bg-white/[0.01] border border-white/[0.05] shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-3xl">
      {/* Ambient panel glow */}
      <div className="absolute -inset-x-20 -top-20 h-40 w-full bg-white/[0.02] blur-3xl rounded-full pointer-events-none transition-opacity duration-700 group-hover:opacity-100 opacity-50"></div>

      <div className="relative flex items-start justify-between border-b border-white/[0.06] pb-6 transition-colors duration-500 group-hover:border-white/[0.12]">
        <div className="flex flex-col justify-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-400 drop-shadow-sm">
            {label} Region
          </p>
          <h2 className="intel-title-font mt-2 text-5xl font-light tracking-wide text-zinc-100 drop-shadow-sm">
            Stability Index
          </h2>
          <div className="mt-4 flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              Trend
            </span>
            <div className="h-px w-8 bg-zinc-700 transition-colors duration-500 group-hover:bg-zinc-500"></div>
            <span
              className={`text-[11px] font-bold uppercase tracking-[0.2em] ${isUp ? "text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.5)]" : "text-zinc-300"}`}
            >
              {data.trend}
            </span>
          </div>
        </div>
        <div className="-mr-2 -mt-2 shrink-0">
          <ScoreRing score={data.score} color={color} />
        </div>
      </div>

      <div className="relative mt-8 grid grid-cols-1 gap-[1px] bg-white/[0.06] rounded-2xl overflow-hidden transition-colors duration-500 md:grid-cols-2 shadow-inner">
        <div className="bg-black/50 backdrop-blur-2xl p-6 transition-colors duration-700 group-hover:bg-black/70 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]"></span>
            </span>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-400">
              Top Risk Factor
            </p>
          </div>
          <p className="min-h-[48px] text-[15px] font-light tracking-wide leading-relaxed text-zinc-200">
            {riskText}
          </p>
        </div>

        <div className="bg-black/50 backdrop-blur-2xl p-6 transition-colors duration-700 group-hover:bg-black/70 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]"></span>
            </span>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-400">
              Key Stabilizer
            </p>
          </div>
          <p className="min-h-[48px] text-[15px] font-light tracking-wide leading-relaxed text-zinc-200">
            {stabilizerText}
          </p>
        </div>
      </div>
    </article>
  );
}
