// @ts-check
import { useEffect, useMemo, useState } from "react";

/**
 * @typedef {Object} StabilityData
 * @property {number} score
 * @property {string[]} top_risk_factors
 * @property {string[]} top_stabilizers
 * @property {string} trend
 * @property {string} alert_color
 */

/** @type {StabilityData} */
const FALLBACK = {
  score: 0,
  top_risk_factors: [],
  top_stabilizers: [],
  trend: "flat",
  alert_color: "yellow",
};

const COLOR_MAP = {
  yellow: "#eab308",
  orange: "#f97316",
  red: "#ef4444",
  green: "#22c55e",
};

/**
 * @param {unknown} value
 * @returns {StabilityData}
 */
function normalizeData(value) {
  if (!value || typeof value !== "object") return FALLBACK;
  const typed = /** @type {Record<string, unknown>} */ (value);

  return {
    score: Number.isFinite(typed.score) ? /** @type {number} */ (typed.score) : 0,
    top_risk_factors: Array.isArray(typed.top_risk_factors)
      ? /** @type {string[]} */ (typed.top_risk_factors)
      : [],
    top_stabilizers: Array.isArray(typed.top_stabilizers)
      ? /** @type {string[]} */ (typed.top_stabilizers)
      : [],
    trend: typeof typed.trend === "string" ? typed.trend : "flat",
    alert_color: typeof typed.alert_color === "string" ? typed.alert_color : "yellow",
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
    <svg viewBox="0 0 120 120" className="h-[92px] w-[92px] shrink-0 sm:h-[112px] sm:w-[112px]">
      <circle cx="60" cy="60" r="44" fill="none" stroke="#18181b" strokeWidth="6" />
      <circle
        cx="60"
        cy="60"
        r="44"
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="square"
        strokeDasharray={`${dash} ${circumference}`}
        transform="rotate(-90 60 60)"
      />
      <text x="60" y="67" textAnchor="middle" className="fill-zinc-100 text-[26px] font-bold tracking-tight">
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

  const riskText = riskItems.length > 0 ? riskItems[step % riskItems.length] : "No risk factor data";
  const stabilizerText =
    stabilizerItems.length > 0
      ? stabilizerItems[step % stabilizerItems.length]
      : "No stabilizer data";

  const color = COLOR_MAP[data.alert_color] ?? "#a1a1aa";
  const isUp = String(data.trend).toLowerCase() === "up";

  return (
    <article className="group relative border border-zinc-800/80 bg-transparent p-6 transition-all duration-500 hover:border-zinc-500/80 hover:bg-zinc-900/10 sm:p-8">
      <div className="flex items-start justify-between border-b border-zinc-800/80 pb-6 transition-colors duration-500 group-hover:border-zinc-700">
        <div className="flex flex-col justify-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">{label} Region</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-wide text-zinc-100">Stability Index</h2>
          <div className="mt-4 flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Trend</span>
            <div className="h-px w-6 bg-zinc-700 transition-colors duration-500 group-hover:bg-zinc-500"></div>
            <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isUp ? "text-[#eab308]" : "text-zinc-300"}`}>
              {data.trend}
            </span>
          </div>
        </div>
        <div className="-mr-2 -mt-2 shrink-0">
          <ScoreRing score={data.score} color={color} />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-px border border-zinc-800/80 bg-zinc-800/80 transition-colors duration-500 group-hover:border-zinc-700/80 group-hover:bg-zinc-700/80 md:grid-cols-2">
        <div className="bg-[#07090d] p-6 transition-colors duration-500 group-hover:bg-[#0a0d14]">
          <div className="mb-5 flex items-center gap-3">
            <div className="h-2 w-2 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Top Risk Factor</p>
          </div>
          <p className="min-h-[48px] text-sm font-medium leading-relaxed text-zinc-200">{riskText}</p>
        </div>

        <div className="bg-[#07090d] p-6 transition-colors duration-500 group-hover:bg-[#0a0d14]">
          <div className="mb-5 flex items-center gap-3">
            <div className="h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Key Stabilizer</p>
          </div>
          <p className="min-h-[48px] text-sm font-medium leading-relaxed text-zinc-200">{stabilizerText}</p>
        </div>
      </div>
    </article>
  );
}
