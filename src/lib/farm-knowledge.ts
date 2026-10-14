import type { WeatherData } from "./weather-types";

// Curated agronomic knowledge injected into FarmGuard AI so advice reflects
// local farming practice (seasons, crops, methods), not only raw weather.

type RegionProfile = {
  id: string;
  name: string;
  match: (lat: number, lon: number, country: string, region: string) => boolean;
  seasons: (month: number) => string;
  crops: string;
  practices: string[];
};

const has = (s: string, ...k: string[]) => k.some((x) => s.toLowerCase().includes(x));

const REGIONS: RegionProfile[] = [
  {
    id: "india-deccan",
    name: "India – Deccan Plateau (Telangana, Andhra Pradesh, Karnataka, Maharashtra interior)",
    match: (lat, lon, c, r) =>
      has(c, "india") &&
      (has(r, "telangana", "andhra", "karnataka", "maharashtra") || (lat > 12 && lat < 21 && lon > 74 && lon < 82)),
    seasons: (m) =>
      m >= 6 && m <= 10
        ? "Kharif (SW monsoon, Jun–Oct): main sowing/growing season for rainfed crops."
        : m >= 11 || m <= 3
          ? "Rabi (Nov–Mar): irrigated/residual-moisture crops; cool dry nights."
          : "Zaid/summer (Apr–May): extreme heat (40°C+), only short irrigated crops; land preparation for Kharif.",
    crops:
      "Paddy (Kharif & Rabi under tanks/borewells), cotton, maize, red gram (tur), chilli, groundnut, soybean, turmeric, Bengal gram (Rabi), jowar, mango orchards.",
    practices: [
      "Cotton: sow after ≥60–75 mm cumulative monsoon rain; watch pink bollworm (pheromone traps, avoid late sowing) and sucking pests (whitefly, jassids) in humid spells.",
      "Paddy: maintain 2–5 cm standing water at tillering; Alternate Wetting & Drying (AWD) saves 25–30% water; blast risk rises with humidity >90% and night temps 20–25°C; BPH risk in humid, still conditions.",
      "Chilli: thrips/mites rise in dry hot spells, fruit rot/anthracnose after continuous rain.",
      "Red gram & groundnut: avoid waterlogging; drain fields after heavy rain (>50 mm/day).",
      "Summer: irrigate early morning/evening, mulch, shade nurseries; heat stress for livestock above 38°C.",
      "Spraying: common practice is early morning (6–10 AM) or after 4 PM; avoid if rain expected within 4–6 h.",
      "Refer farmers to local KVK (Krishi Vigyan Kendra), state agriculture department, PJTSAU / ANGRAU advisories, and IMD agromet bulletins.",
    ],
  },
  {
    id: "india-north",
    name: "India – Indo-Gangetic Plains (Punjab, Haryana, UP, Bihar)",
    match: (lat, _l, c) => has(c, "india") && lat >= 24,
    seasons: (m) =>
      m >= 6 && m <= 10
        ? "Kharif: paddy, maize, cotton, sugarcane under monsoon."
        : m >= 11 || m <= 3
          ? "Rabi: wheat, mustard, chickpea; fog and frost risk Dec–Jan."
          : "Zaid: moong, vegetables; heat waves and loo winds.",
    crops: "Wheat, paddy (basmati/non-basmati), mustard, sugarcane, potato, maize, cotton.",
    practices: [
      "Wheat: irrigate at crown root initiation (~21 days after sowing); frost below 2°C — light irrigation protects crop.",
      "Avoid paddy-stubble burning; use Happy Seeder or decomposer.",
      "Yellow rust in wheat is favoured by cool (10–20°C), humid weather.",
      "Refer to KVK, PAU / state university advisories, IMD agromet bulletins.",
    ],
  },
  {
    id: "india-other",
    name: "India – general",
    match: (_a, _b, c) => has(c, "india"),
    seasons: (m) =>
      m >= 6 && m <= 10 ? "Kharif (monsoon)." : m >= 11 || m <= 3 ? "Rabi (winter)." : "Zaid (summer).",
    crops: "Region-dependent: paddy, pulses, oilseeds, cotton, vegetables, plantation crops.",
    practices: ["Follow local KVK and IMD agromet advisories; spray in calm early mornings."],
  },
  {
    id: "us-central-valley",
    name: "USA – California Central Valley",
    match: (lat, lon, c) => has(c, "united states", "usa") && lat > 34 && lat < 40.5 && lon < -118,
    seasons: (m) =>
      m >= 11 || m <= 3 ? "Wet/dormant season: almond/fruit dormancy, rains, tule fog." : "Dry season: fully irrigated, hot (35°C+ summers).",
    crops: "Almonds, pistachios, grapes, tomatoes (processing), citrus, stone fruit, cotton, alfalfa.",
    practices: [
      "Drip/micro-sprinkler irrigation scheduled by ET (CIMIS ETo × crop coefficient).",
      "Almond bloom (Feb): frost and rain raise brown rot/shot-hole risk; bee activity needs >13°C and low wind.",
      "Drift rules: many county permits restrict spraying above ~16 km/h (10 mph) winds and during inversions.",
      "Refer to UC Cooperative Extension / UC IPM and county agricultural commissioner.",
    ],
  },
];

const GENERIC: RegionProfile = {
  id: "generic",
  name: "General (no specific regional profile)",
  match: () => true,
  seasons: () => "Infer season from dates and forecast; ask the farmer which crop stage they are at.",
  crops: "Ask the farmer which crops they grow.",
  practices: ["Refer to the local agricultural extension service for crop-specific guidance."],
};

// Scenario playbooks: weather thresholds → field-tested responses.
const SCENARIOS = `
AGRONOMIC SCENARIO PLAYBOOK (apply when conditions match):
- Spraying: ideal wind 3–15 km/h; avoid <3 km/h (inversion/drift hang) and >15 km/h (drift). No rain for 4–6 h after (contact) or 1–2 h (systemic, check label). Avoid >30°C or humidity <40% (evaporation). Leaf wetness from dew reduces efficacy.
- Fungal disease risk: humidity >85% for 10+ h with 18–28°C → high risk (blast, blight, downy mildew, anthracnose). Suggest scouting and preventive (not curative) sprays in the next dry window.
- Irrigation: skip if ≥10 mm rain likely in next 24–48 h. Use ET0 × crop coefficient (e.g. paddy Kc ~1.05–1.2, cotton mid-season ~1.15, vegetables ~1.0). Irrigate early morning to reduce evaporation.
- Heavy rain (>50 mm/day) or thunderstorms: clear drainage channels, delay fertiliser (nitrogen leaches), postpone harvest, secure produce, keep livestock sheltered; no field work during lightning.
- Heat stress (>38°C): light frequent irrigation, mulch, avoid midday work, extra shade and water for livestock; flowering crops (rice, pulses) suffer pollen sterility above ~35°C.
- Cold/frost (<4°C): irrigate evening before, cover nurseries, avoid pruning.
- Fertiliser: apply urea to moist soil before light rain, not before heavy rain; avoid on waterlogged soil.
- Harvest: need 2–3 dry days; grain moisture for paddy ~20–22% at harvest, dry to 12–14% for storage.
- Sowing: wait for adequate soil moisture (rainfed: ~60–75 mm cumulative rain in monsoon regions).
`;

export function getRegionProfile(weather: WeatherData | null): RegionProfile {
  if (!weather) return GENERIC;
  const l = weather.location;
  return (
    REGIONS.find((r) => r.match(l.latitude, l.longitude, l.country ?? "", l.region ?? "")) ?? GENERIC
  );
}

export function buildKnowledgeContext(weather: WeatherData | null): string {
  const p = getRegionProfile(weather);
  const month = new Date().getMonth() + 1;
  return `LOCAL FARMING KNOWLEDGE:
Region profile: ${p.name}
Current season: ${p.seasons(month)}
Typical local crops: ${p.crops}
Local practices:
${p.practices.map((x) => `- ${x}`).join("\n")}
${SCENARIOS}
Use this knowledge to tailor advice to local crops, season and methods, but weather numbers must come only from the CONTEXT data.`;
}
