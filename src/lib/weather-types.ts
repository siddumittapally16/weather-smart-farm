export type FarmLocation = {
  name: string;
  country: string;
  region?: string;
  latitude: number;
  longitude: number;
  cropFocus?: string;
};

export type HourlyPoint = {
  time: string;
  label: string;
  condition: string;
  temperature: number | null;
  rainProbability: number | null;
  precipitation: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  humidity: number | null;
  suitability: string;
  suitabilityLevel: "good" | "caution" | "poor";
};

export type DailyPoint = {
  date: string;
  label: string;
  condition: string;
  high: number | null;
  low: number | null;
  rainProbability: number | null;
  precipitation: number | null;
  uvIndexMax: number | null;
  windSpeedMax: number | null;
  et0: number | null;
};

export type CurrentWeather = {
  temperature: number | null;
  feelsLike: number | null;
  humidity: number | null;
  dewPoint: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  windGust: number | null;
  rainProbability: number | null;
  precipitation: number | null;
  uvIndex: number | null;
  et0: number | null;
  condition: string;
  high: number | null;
  low: number | null;
  isDay: boolean;
};

export type SafetyAlert = {
  id: string;
  title: string;
  detail: string;
  severity: "info" | "warning" | "danger";
};

export type Recommendation = {
  id: string;
  category: string;
  advice: string;
  status: "good" | "caution" | "avoid";
};

export type BestTimeActivity = {
  activity: string;
  window: string;
  reason: string;
};

export type WeatherData = {
  location: FarmLocation;
  current: CurrentWeather;
  hourly: HourlyPoint[];
  daily: DailyPoint[];
  safetyAlerts: SafetyAlert[];
  recommendations: Recommendation[];
  bestTimeActivities: BestTimeActivity[];
  fetchedAt: string;
};

/** Formats a possibly-missing measurement, never rendering "undefined". */
export function fmt(value: number | null | undefined, unit = "", digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return `${value.toFixed(digits)}${unit ? unit : ""}`;
}

export function windLabel(deg: number | null | undefined): string {
  if (deg === null || deg === undefined || Number.isNaN(deg)) return "--";
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16]!;
}

export const DEFAULT_LOCATION: FarmLocation = {
  name: "Fresno",
  region: "California",
  country: "United States",
  latitude: 36.7378,
  longitude: -119.7871,
  cropFocus: "Almonds, grapes, tomatoes",
};

export const PRESET_LOCATIONS: FarmLocation[] = [
  DEFAULT_LOCATION,
  { name: "Ludhiana", region: "Punjab", country: "India", latitude: 30.901, longitude: 75.8573, cropFocus: "Wheat, rice" },
  { name: "Warangal", region: "Telangana", country: "India", latitude: 17.9689, longitude: 79.5941, cropFocus: "Cotton, paddy" },
  { name: "Guntur", region: "Andhra Pradesh", country: "India", latitude: 16.3067, longitude: 80.4365, cropFocus: "Chilli, paddy" },
  { name: "Nashik", region: "Maharashtra", country: "India", latitude: 19.9975, longitude: 73.7898, cropFocus: "Grapes, onion" },
  { name: "Belagavi", region: "Karnataka", country: "India", latitude: 15.8497, longitude: 74.4977, cropFocus: "Sugarcane, maize" },
];

export const WEATHER_REFRESH_INTERVAL_MS = 10 * 60 * 1000;
