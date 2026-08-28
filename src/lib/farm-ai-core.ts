import { fmt, windLabel, type WeatherData } from "./weather-types";

export const FARM_AI_SYSTEM_PROMPT = `You are FarmGuard AI, a practical agricultural decision-support assistant for farmers.

Rules:
- Use ONLY the weather data provided in the context below. Never invent or estimate temperature, rainfall, wind, humidity, UV, or forecast values.
- If a value is missing or shown as "--", reply exactly: "Weather data is currently unavailable for this value."
- Be concise, farmer-friendly and practical. Prefer short sections with emoji headers (e.g. "🌱 Irrigation:") and short bullet lists.
- Clearly separate weather information, agricultural recommendations, and safety warnings.
- For pesticide spraying, fertiliser application, machinery use and extreme weather, prioritise safety and tell the user to follow the product label and local agricultural guidance.
- Always answer for the location given in the context; never assume any other location.
- For "what should I do on my farm today", give a prioritised list: 1. Irrigation 2. Spraying 3. Harvesting 4. Field work 5. Weather risks.
- Avoid heavy technical jargon unless the user asks for detail.`;

export function buildAiContext(weather: WeatherData | null, cropFocus?: string): string {
  if (!weather) {
    return "CONTEXT: No weather data is currently available. Tell the user that weather data is currently unavailable for these values and suggest refreshing the dashboard.";
  }
  const { location: l, current: c } = weather;
  const hourly = weather.hourly
    .slice(0, 12)
    .map(
      (h) =>
        `${h.label} ${h.condition}, ${fmt(h.temperature, "°C")}, rain ${fmt(h.rainProbability, "%")} / ${fmt(h.precipitation, " mm", 1)}, wind ${fmt(h.windSpeed, " km/h")} ${windLabel(h.windDirection)}, humidity ${fmt(h.humidity, "%")} — ${h.suitability}`,
    )
    .join("\n");
  const daily = weather.daily
    .map(
      (d) =>
        `${d.label}: ${d.condition}, high ${fmt(d.high, "°C")}, low ${fmt(d.low, "°C")}, rain ${fmt(d.rainProbability, "%")} / ${fmt(d.precipitation, " mm", 1)}, UV max ${fmt(d.uvIndexMax)}, wind max ${fmt(d.windSpeedMax, " km/h")}, ET0 ${fmt(d.et0, " mm", 1)}`,
    )
    .join("\n");

  return `CONTEXT (latest data from the weather API, fetched ${weather.fetchedAt}):

LOCATION: ${l.name}${l.region ? `, ${l.region}` : ""}${l.country ? `, ${l.country}` : ""}
Latitude: ${l.latitude} | Longitude: ${l.longitude}
Crop focus: ${cropFocus ?? l.cropFocus ?? "not specified"}

CURRENT CONDITIONS:
Condition: ${c.condition}
Temperature: ${fmt(c.temperature, "°C")} | Feels like: ${fmt(c.feelsLike, "°C")} | Min: ${fmt(c.low, "°C")} | Max: ${fmt(c.high, "°C")}
Humidity: ${fmt(c.humidity, "%")} | Dew point: ${fmt(c.dewPoint, "°C")}
Rain probability: ${fmt(c.rainProbability, "%")} | Rain amount: ${fmt(c.precipitation, " mm", 1)}
Wind: ${fmt(c.windSpeed, " km/h")} from ${windLabel(c.windDirection)} | Gusts: ${fmt(c.windGust, " km/h")}
UV index: ${fmt(c.uvIndex)} | Evapotranspiration (ET0 today): ${fmt(c.et0, " mm", 1)}

HOURLY FORECAST (next 12 h):
${hourly || "--"}

DAILY FORECAST:
${daily || "--"}

SAFETY ALERTS:
${weather.safetyAlerts.map((a) => `[${a.severity}] ${a.title}: ${a.detail}`).join("\n")}

FARMING RECOMMENDATIONS:
${weather.recommendations.map((r) => `${r.category} (${r.status}): ${r.advice}`).join("\n")}

BEST TIME WINDOWS:
${weather.bestTimeActivities.map((b) => `${b.activity}: ${b.window} — ${b.reason}`).join("\n")}`;
}
