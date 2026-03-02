const RISK_WEIGHTS = {
  diplomatic_tension: 1.2,
  economic_financial_instability: 1.1,
  government_stability: 1.0,
  institutional_trust_legitimacy: 0.9,
  armed_conflict_intensity: 0.9,
  civilian_harm: 1.0,
  protest_unrest_intensity: 0.8,
  inflation_cost_of_living_stress: 0.8,
  critical_infra_outages: 0.7,
  disaster_climate_impact: 0.7,
  sanctions_trade_constraints: 0.7,
};

const STABILIZER_WEIGHTS = {
  deescalation_peace_process: 1.0,
  governance_effectiveness: 0.9,
  economic_relief_positive: 0.7,
  services_restored: 0.8,
};

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function weightedAvg(values, weights) {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const raw = values?.[key];
    const safe = clamp(typeof raw === "number" ? raw : 0);
    weightedSum += safe * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) {
    return 0;
  }

  return weightedSum / totalWeight;
}

export function computeStabilityIndex(result, options = {}) {
  const baseline = options.baseline ?? 75;
  const maxMove = options.maxMove ?? 35;

  const R = weightedAvg(result?.risk, RISK_WEIGHTS);
  const S = weightedAvg(result?.stabilizers, STABILIZER_WEIGHTS);
  const U = clamp(result?.meta?.uncertainty ?? 0);

  const domestic = clamp(result?.exposure?.domestic ?? 0);
  const externalSpillover = clamp(result?.exposure?.external_spillover ?? 0);
  const E = clamp(0.7 * domestic + 0.3 * externalSpillover);

  const pressure = 0.95 * R + 0.55 * U - 0.6 * S;

  const intensityOverall = clamp(result?.meta?.intensity_overall ?? 0);
  const confidence = clamp(result?.meta?.confidence ?? 0);
  const gate = clamp(intensityOverall * confidence);
  const gate2 = clamp(gate * (0.6 + 0.4 * E));

  const raw = baseline - maxMove * pressure * gate2;
  const stabilityScore = clamp(raw, 0, 100);
  const strictValue = Number(stabilityScore.toFixed(2));

  return {
    strict_value: strictValue,
    stability_score: strictValue,
    components: { R, S, U, E, pressure, gate, gate2, raw },
    config: { baseline, maxMove },
  };
}
