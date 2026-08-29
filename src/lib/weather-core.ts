import {
  type BestTimeActivity,
  type CurrentWeather,
  type DailyPoint,
  type FarmLocation,
  type HourlyPoint,
  type Recommendation,
  type SafetyAlert,
  type WeatherData,
} from "./weather-types";

const WMO: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Freezing fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  56: "Freezing drizzle",
  57: "Freezing drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Rain showers",
  81: "Rain showers",
  82: "Violent rain showers",
  85: "Snow showers",
  86: "Snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Severe thunderstorm with hail",
};

export function conditionFromCode(code: number | null | undefined): string {
  if (code === null || code === undefined) return "Unknown";
  return WMO[code] ?? "Unknown";
}

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? Math.round(v * 10) / 10 : null;

type OpenMeteoResponse = {
  current?: Record<string, unknown>;
  hourly?: Record<string, unknown[]>;
  daily?: Record<string, unknown[]>;
};

function hourLabel(iso: string): string {
  return iso.slice(11, 16);
}

function dayLabel(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function suitability(
  wind: number | null,
  rainProb: number | null,
  precip: number | null,
  temp: number | null,
): { text: string; level: HourlyPoint["suitabilityLevel"] } {
  if ((precip ?? 0) > 0.5 || (rainProb ?? 0) >= 70)
    return { text: "Wet — postpone field work", level: "poor" };
  if ((wind ?? 0) > 25 || (temp ?? 0) >= 38)
    return { text: "Harsh conditions — limit work", level: "poor" };
  if ((wind ?? 0) > 15 || (rainProb ?? 0) >= 40)
    return { text: "Usable, avoid spraying", level: "caution" };
  return { text: "Good for farm work", level: "good" };
}

export function buildWeatherData(location: FarmLocation, raw: OpenMeteoResponse): WeatherData {
  const c = raw.current ?? {};
  const h = raw.hourly ?? {};
  const d = raw.daily ?? {};

  const times = (h["time"] as string[] | undefined) ?? [];
  const nowIso = (c["time"] as string | undefined) ?? new Date().toISOString().slice(0, 13);
  let startIdx = times.findIndex((t) => t >= nowIso.slice(0, 13));
  if (startIdx < 0) startIdx = 0;

  const hourly: HourlyPoint[] = times.slice(startIdx, startIdx + 24).map((t, i) => {
    const k = startIdx + i;
    const temperature = num(h["temperature_2m"]?.[k]);
    const rainProbability = num(h["precipitation_probability"]?.[k]);
    const precipitation = num(h["precipitation"]?.[k]);
    const windSpeed = num(h["wind_speed_10m"]?.[k]);
    const s = suitability(windSpeed, rainProbability, precipitation, temperature);
    return {
      time: t,
      label: hourLabel(t),
      condition: conditionFromCode(num(h["weather_code"]?.[k])),
      temperature,
      rainProbability,
      precipitation,
      windSpeed,
      windDirection: num(h["wind_direction_10m"]?.[k]),
      humidity: num(h["relative_humidity_2m"]?.[k]),
      suitability: s.text,
      suitabilityLevel: s.level,
    };
  });

  const dTimes = (d["time"] as string[] | undefined) ?? [];
  const daily: DailyPoint[] = dTimes.map((t, i) => ({
    date: t,
    label: i === 0 ? "Today" : dayLabel(t),
    condition: conditionFromCode(num(d["weather_code"]?.[i])),
    high: num(d["temperature_2m_max"]?.[i]),
    low: num(d["temperature_2m_min"]?.[i]),
    rainProbability: num(d["precipitation_probability_max"]?.[i]),
    precipitation: num(d["precipitation_sum"]?.[i]),
    uvIndexMax: num(d["uv_index_max"]?.[i]),
    windSpeedMax: num(d["wind_speed_10m_max"]?.[i]),
    et0: num(d["et0_fao_evapotranspiration"]?.[i]),
  }));

  const current: CurrentWeather = {
    temperature: num(c["temperature_2m"]),
    feelsLike: num(c["apparent_temperature"]),
    humidity: num(c["relative_humidity_2m"]),
    dewPoint: num(c["dew_point_2m"]),
    windSpeed: num(c["wind_speed_10m"]),
    windDirection: num(c["wind_direction_10m"]),
    windGust: num(c["wind_gusts_10m"]),
    rainProbability: hourly[0]?.rainProbability ?? daily[0]?.rainProbability ?? null,
    precipitation: num(c["precipitation"]),
    uvIndex: num(c["uv_index"]),
    et0: daily[0]?.et0 ?? null,
    condition: conditionFromCode(num(c["weather_code"])),
    high: daily[0]?.high ?? null,
    low: daily[0]?.low ?? null,
    isDay: c["is_day"] === 1,
  };

  return {
    location,
    current,
    hourly,
    daily,
    safetyAlerts: buildAlerts(current, hourly),
    recommendations: buildRecommendations(current, hourly, daily),
    bestTimeActivities: buildBestTimes(hourly),
    fetchedAt: new Date().toISOString(),
  };
}

function buildAlerts(c: CurrentWeather, hourly: HourlyPoint[]): SafetyAlert[] {
  const alerts: SafetyAlert[] = [];
  const next6 = hourly.slice(0, 6);
  if ((c.temperature ?? 0) >= 38)
    alerts.push({
      id: "heat",
      title: "Heat stress risk",
      detail: `Temperature is ${c.temperature}°C. Schedule labour early morning, hydrate crews and watch livestock.`,
      severity: "danger",
    });
  if ((c.windGust ?? c.windSpeed ?? 0) >= 30)
    alerts.push({
      id: "wind",
      title: "High wind — spray drift hazard",
      detail: `Gusts near ${c.windGust ?? c.windSpeed} km/h. Stop pesticide and fertiliser spraying.`,
      severity: "danger",
    });
  if (next6.some((x) => x.condition.toLowerCase().includes("thunder")))
    alerts.push({
      id: "storm",
      title: "Thunderstorm expected",
      detail: "Keep crews and machinery away from open fields and tall equipment during storms.",
      severity: "danger",
    });
  if ((c.uvIndex ?? 0) >= 8)
    alerts.push({
      id: "uv",
      title: "Very high UV index",
      detail: `UV index ${c.uvIndex}. Use covered clothing and sun protection for field workers.`,
      severity: "warning",
    });
  if (next6.reduce((s, x) => s + (x.precipitation ?? 0), 0) >= 5)
    alerts.push({
      id: "rain",
      title: "Heavy rain in next 6 hours",
      detail: "Protect harvested produce, check drainage and delay fertiliser application.",
      severity: "warning",
    });
  if ((c.temperature ?? 99) <= 2)
    alerts.push({
      id: "frost",
      title: "Frost risk",
      detail: "Consider frost protection for sensitive crops overnight.",
      severity: "warning",
    });
  if (alerts.length === 0)
    alerts.push({
      id: "clear",
      title: "No active weather hazards",
      detail:
        "Conditions are within normal working limits. Keep following product labels and local guidance.",
      severity: "info",
    });
  return alerts;
}

function buildRecommendations(
  c: CurrentWeather,
  hourly: HourlyPoint[],
  daily: DailyPoint[],
): Recommendation[] {
  const next12 = hourly.slice(0, 12);
  const rainSoon = next12.reduce((s, x) => s + (x.precipitation ?? 0), 0);
  const maxProb = next12.reduce((m, x) => Math.max(m, x.rainProbability ?? 0), 0);

  const irrigation: Recommendation =
    rainSoon >= 3
      ? {
          id: "irrigation",
          category: "Irrigation",
          status: "avoid",
          advice: `About ${rainSoon.toFixed(1)} mm of rain is expected in the next 12 hours — hold irrigation and reassess after the rain.`,
        }
      : (c.et0 ?? 0) >= 5 || (c.temperature ?? 0) >= 33
        ? {
            id: "irrigation",
            category: "Irrigation",
            status: "caution",
            advice: `High evaporative demand (ET₀ ${c.et0 ?? "--"} mm). Irrigate early morning or after sunset to cut losses.`,
          }
        : {
            id: "irrigation",
            category: "Irrigation",
            status: "good",
            advice:
              "Moderate demand. Irrigate on your normal schedule, preferably in the cooler hours.",
          };

  const spraying: Recommendation =
    (c.windSpeed ?? 0) > 15 || (c.windGust ?? 0) > 25 || maxProb >= 60
      ? {
          id: "spraying",
          category: "Spraying",
          status: "avoid",
          advice: `Wind ${c.windSpeed ?? "--"} km/h (gusts ${c.windGust ?? "--"}) and rain chance ${maxProb}% raise drift and wash-off risk. Wait for calmer, drier hours.`,
        }
      : (c.windSpeed ?? 0) < 3
        ? {
            id: "spraying",
            category: "Spraying",
            status: "caution",
            advice:
              "Very light wind can cause inversion and drift. Spray when wind is 3–12 km/h and always follow the product label.",
          }
        : {
            id: "spraying",
            category: "Spraying",
            status: "good",
            advice:
              "Wind and rain conditions are suitable for spraying. Check the product label before application.",
          };

  const harvest: Recommendation =
    (c.humidity ?? 0) > 85 || rainSoon > 1
      ? {
          id: "harvest",
          category: "Harvesting",
          status: "caution",
          advice:
            "Moisture is high — grain and produce may need drying. Prefer a drier window later.",
        }
      : {
          id: "harvest",
          category: "Harvesting",
          status: "good",
          advice: "Dry conditions favour harvesting and safe storage.",
        };

  const fieldwork: Recommendation =
    rainSoon > 2
      ? {
          id: "fieldwork",
          category: "Field work",
          status: "avoid",
          advice:
            "Wet soil risks compaction and machinery bogging. Delay tillage and heavy traffic.",
        }
      : {
          id: "fieldwork",
          category: "Field work",
          status: "good",
          advice: "Soil conditions should support machinery. Watch for changes after any showers.",
        };

  const outlook: Recommendation = {
    id: "outlook",
    category: "Week ahead",
    status:
      daily.slice(0, 3).reduce((s, x) => s + (x.precipitation ?? 0), 0) > 10 ? "caution" : "good",
    advice: daily
      .slice(0, 3)
      .map(
        (x) =>
          `${x.label}: ${x.condition}, ${x.high ?? "--"}/${x.low ?? "--"}°C, rain ${x.rainProbability ?? "--"}%`,
      )
      .join(" · "),
  };

  return [irrigation, spraying, harvest, fieldwork, outlook];
}

function buildBestTimes(hourly: HourlyPoint[]): BestTimeActivity[] {
  const window = hourly.slice(0, 18);
  const pick = (score: (h: HourlyPoint) => number) => {
    let best: HourlyPoint | undefined;
    let bestScore = -Infinity;
    for (const h of window) {
      const s = score(h);
      if (s > bestScore) {
        bestScore = s;
        best = h;
      }
    }
    return best;
  };

  const irrig = pick(
    (h) => -(h.temperature ?? 50) - (h.windSpeed ?? 0) * 0.2 - (h.rainProbability ?? 0) * 0.1,
  );
  const spray = pick((h) => {
    const w = h.windSpeed ?? 0;
    const windScore = w >= 3 && w <= 12 ? 20 : -Math.abs(w - 7);
    return windScore - (h.rainProbability ?? 0) * 0.5 - (h.precipitation ?? 0) * 10;
  });
  const harvest = pick((h) => -(h.humidity ?? 100) - (h.rainProbability ?? 0));
  const field = pick((h) => -(h.rainProbability ?? 0) - Math.abs((h.temperature ?? 25) - 24));

  const line = (h: HourlyPoint | undefined) => (h ? `${h.label}` : "--");
  return [
    {
      activity: "Irrigation",
      window: line(irrig),
      reason: `Coolest low-loss window (${irrig?.temperature ?? "--"}°C)`,
    },
    {
      activity: "Spraying",
      window: line(spray),
      reason: `Wind ${spray?.windSpeed ?? "--"} km/h, rain ${spray?.rainProbability ?? "--"}%`,
    },
    {
      activity: "Harvesting",
      window: line(harvest),
      reason: `Driest air (humidity ${harvest?.humidity ?? "--"}%)`,
    },
    {
      activity: "Field work",
      window: line(field),
      reason: `Mild and dry (${field?.temperature ?? "--"}°C, rain ${field?.rainProbability ?? "--"}%)`,
    },
  ];
}

export const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

export const FORECAST_PARAMS = {
  current:
    "temperature_2m,relative_humidity_2m,dew_point_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,is_day",
  hourly:
    "temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_direction_10m",
  daily:
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,uv_index_max,wind_speed_10m_max,et0_fao_evapotranspiration",
};
