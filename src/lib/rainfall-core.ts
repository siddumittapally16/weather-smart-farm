/**
 * Pure rainfall early-warning logic. Real forecast data only — values come
 * from the Open-Meteo forecast API; nothing here invents measurements.
 */

export const MIN_RAIN_MM_PER_SLOT = 0.1; // mm per 15-minute slot counts as rain starting
export const QUALIFYING_LEAD_MAX_MINUTES = 60; // alert for events starting within the next hour
export const MINIMUM_LEAD_FOR_ADVANCE_NOTICE = 20; // requested advance-warning target

export type RainfallForecastInput = {
  minutelyTime: string[];
  minutelyPrecip: (number | null)[];
  hourlyTime?: string[];
  hourlyPrecipProb?: (number | null)[];
};

export type RainfallEvent = {
  /** ISO time of the first 15-minute slot with forecast rain. */
  startTime: string;
  minutesToStart: number;
  /** mm forecast in the first raining slot. */
  intensityMm: number;
  /** Consecutive raining slots × 15 minutes; null when unknown. */
  expectedDurationMinutes: number | null;
  /** Total mm forecast across the event window. */
  expectedTotalMm: number;
  /** Hourly precipitation probability for the hour containing the start, when available. */
  rainProbability: number | null;
  /** "scheduled" when lead ≥ 20 min, "immediate" when less. */
  alertClass: "scheduled" | "immediate";
};

/** Finds the next predicted rainfall start within the qualifying window. */
export function detectRainfallEvent(
  forecast: RainfallForecastInput,
  nowMs: number,
): RainfallEvent | null {
  const slots = forecast.minutelyTime
    .map((time, i) => ({ time, precip: forecast.minutelyPrecip[i] ?? null }))
    .filter((s) => {
      const t = Date.parse(s.time);
      return Number.isFinite(t) && t >= nowMs - 5 * 60 * 1000;
    });

  const startIdx = slots.findIndex((s) => (s.precip ?? 0) >= MIN_RAIN_MM_PER_SLOT);
  if (startIdx < 0) return null;

  const start = slots[startIdx]!;
  const minutesToStart = Math.round((Date.parse(start.time) - nowMs) / 60000);
  if (minutesToStart > QUALIFYING_LEAD_MAX_MINUTES) return null;

  let durationSlots = 1;
  let total = start.precip ?? 0;
  for (let i = startIdx + 1; i < slots.length; i++) {
    const p = slots[i]!.precip;
    if (p === null || p < MIN_RAIN_MM_PER_SLOT) break;
    durationSlots++;
    total += p;
  }

  const prob = hourProbability(forecast, start.time);

  return {
    startTime: start.time,
    minutesToStart,
    intensityMm: start.precip ?? 0,
    expectedDurationMinutes: durationSlots * 15,
    expectedTotalMm: Math.round(total * 10) / 10,
    rainProbability: prob,
    alertClass: minutesToStart >= MINIMUM_LEAD_FOR_ADVANCE_NOTICE ? "scheduled" : "immediate",
  };
}

function hourProbability(forecast: RainfallForecastInput, slotTime: string): number | null {
  const { hourlyTime, hourlyPrecipProb } = forecast;
  if (!hourlyTime || !hourlyPrecipProb) return null;
  const hour = slotTime.slice(0, 13);
  const idx = hourlyTime.findIndex((t) => t.slice(0, 13) === hour);
  const v = idx >= 0 ? hourlyPrecipProb[idx] : null;
  return typeof v === "number" ? v : null;
}

/**
 * True when a re-check of the same field shows the forecast shifted enough
 * to justify one updated alert: start moved >30 minutes, or intensity changed
 * materially. Never true for small jitter, which prevents duplicate emails.
 */
export function isSignificantForecastChange(
  previous: { startTime: string; intensityMm: number },
  next: { startTime: string; intensityMm: number },
): boolean {
  const shiftMinutes = Math.abs(Date.parse(next.startTime) - Date.parse(previous.startTime)) / 60000;
  if (shiftMinutes > 30) return true;
  const ratio =
    previous.intensityMm > 0 ? next.intensityMm / previous.intensityMm : next.intensityMm > 0 ? Infinity : 1;
  return ratio >= 3 || ratio <= 1 / 3;
}

export type GrowthStage =
  | "Early vegetative"
  | "Vegetative"
  | "Flowering / reproductive"
  | "Grain filling / fruiting"
  | "Maturity / harvest";

/** Qualitative growth stage from the farmer's own logged data — never a forecast. */
export function deriveGrowthStage(sowingDate: string, harvestProgress: number, nowMs: number): GrowthStage {
  if (harvestProgress >= 90) return "Maturity / harvest";
  const days = Math.max(0, Math.floor((nowMs - Date.parse(`${sowingDate}T00:00:00Z`)) / 86400000));
  if (days <= 30) return "Early vegetative";
  if (days <= 75) return "Vegetative";
  if (days <= 110) return "Flowering / reproductive";
  return "Grain filling / fruiting";
}

export type CropRiskAssessment = {
  damageRisk: string;
  yieldImpact: string;
  confidence: string;
  precautions: string[];
};

type CropProfile = {
  keywords: RegExp;
  precautions: string[];
  damage: (intensityMm: number, durationMin: number, stage: GrowthStage) => string;
};

const PROFILES: CropProfile[] = [
  {
    keywords: /paddy|rice/i,
    precautions: [
      "Open field drains so standing water does not submerge young plants.",
      "Postpone urea or top-dressing until after the rain — it washes away.",
      "If close to harvest, arrange covered drying space for the cut crop.",
    ],
    damage: (i, _d, stage) =>
      i >= 2.5 && (stage === "Maturity / harvest" || stage === "Grain filling / fruiting")
        ? "Lodging and grain sprouting are possible in a heavy burst close to maturity; drained fields usually escape with little damage."
        : "Standing rainwater is generally tolerable for paddy, but sudden heavy bursts can flatten tall varieties.",
  },
  {
    keywords: /cotton/i,
    precautions: [
      "Hold pesticide and fertilizer sprays — rain washes them off and wastes cost.",
      "Pick any ready bolls before the rain arrives; wet cotton stains and loses grade.",
      "Check for pink bollworm after the rain; humid spells favour build-up.",
    ],
    damage: (_i, _d, stage) =>
      stage === "Maturity / harvest"
        ? "Open bolls can be stained and lint grade reduced; unpicked fields suffer most."
        : "Young cotton usually recovers, but wet canopies raise pest and disease pressure.",
  },
  {
    keywords: /chilli|chili|pepper|tomato|brinjal|okra|vegetable/i,
    precautions: [
      "Support or stake plants that could be flattened by heavy rain.",
      "Harvest ripe fruits before the rain — wet fruit rots in transit.",
      "Plan a protective fungicide spray only after the rain, on a calm dry day.",
    ],
    damage: (_i, d, stage) =>
      (stage === "Flowering / reproductive" || stage === "Grain filling / fruiting")
        ? `Flower and fruit drop plus fruit-rot risk (anthracnose, bacterial leaf spot) rise sharply in wet spells${d >= 45 ? " lasting over an hour" : ""}.`
        : "Young plants may recover, but waterlogging in nursery beds is damaging.",
  },
  {
    keywords: /grape|vine/i,
    precautions: [
      "Expect downy mildew pressure after rain — plan a post-rain fungicide on a dry calm day.",
      "Avoid canopy work and pruning in wet conditions.",
      "Check drainage between rows so water does not pool at the roots.",
    ],
    damage: () =>
      "Wet canopies strongly favour downy mildew and botrytis near harvest; bunch quality can drop.",
  },
  {
    keywords: /wheat|barley|maize|corn/i,
    precautions: [
      "Delay harvest until grain dries; wet grain needs immediate artificial drying.",
      "Watch for yellow rust after humid spells and scout the field.",
      "Clear field drains to prevent waterlogging in low spots.",
    ],
    damage: (_i, _d, stage) =>
      stage === "Maturity / harvest"
        ? "Rain on standing or cut crop lowers grain quality and test weight; sprouting is possible."
        : "Waterlogging at flowering can cut grain set; well-drained fields are less affected.",
  },
];

const GENERAL: CropProfile = {
  keywords: /.*/,
  precautions: [
    "Secure loose equipment, covers and harvested produce before the rain.",
    "Check field drains and bunds so water can escape.",
    "Hold spraying and fertilizer application until after the rain.",
  ],
  damage: (i) =>
    i >= 2.5
      ? "A heavy burst can cause surface runoff, soil erosion and waterlogging in low spots."
      : "Light rain is unlikely to cause crop damage on its own; watch waterlogging in low-lying patches.",
};

/** Rule-based, qualitative assessment. No invented percentages — uncertain predictions stay qualitative. */
export function assessCropRisk(
  crop: string,
  stage: GrowthStage,
  intensityMm: number,
  durationMin: number | null,
  leadMinutes: number,
): CropRiskAssessment {
  const profile = PROFILES.find((p) => p.keywords.test(crop)) ?? GENERAL;
  return {
    damageRisk: profile.damage(intensityMm, durationMin ?? 0, stage),
    yieldImpact:
      intensityMm >= 2.5 && (stage === "Maturity / harvest" || stage === "Flowering / reproductive")
        ? "Qualitatively, a yield or quality loss is possible if the heavy burst materialises; the actual impact depends on drainage and how much rain falls."
        : "No reliable numerical estimate is possible from this forecast; a single short shower usually has little effect on yield at this stage.",
    confidence:
      leadMinutes <= 60
        ? "Moderate confidence in rain starting within the next hour (short-range nowcast); confidence in exact intensity and duration is lower."
        : "Low confidence — the forecast is beyond the reliable nowcast range.",
    precautions: profile.precautions,
  };
}

/** Intensity wording for the email, tied to real forecast mm per 15 minutes. */
export function intensityLabel(intensityMm: number): string {
  if (intensityMm >= 2.5) return "Heavy burst expected";
  if (intensityMm >= 1) return "Moderate rain expected";
  return "Light rain expected";
}
