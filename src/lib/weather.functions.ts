import { createServerFn } from "@tanstack/react-start";
import { FORECAST_PARAMS, FORECAST_URL, buildWeatherData } from "./weather-core";
import type { FarmLocation, WeatherData } from "./weather-types";

export const fetchWeatherData = createServerFn({ method: "POST" })
  .inputValidator((input: { location: FarmLocation }) => input)
  .handler(async ({ data }): Promise<WeatherData> => {
    const { location } = data;
    const url = new URL(FORECAST_URL);
    url.searchParams.set("latitude", String(location.latitude));
    url.searchParams.set("longitude", String(location.longitude));
    url.searchParams.set("current", FORECAST_PARAMS.current);
    url.searchParams.set("hourly", FORECAST_PARAMS.hourly);
    url.searchParams.set("daily", FORECAST_PARAMS.daily);
    url.searchParams.set("timezone", "auto");
    url.searchParams.set("forecast_days", "7");
    url.searchParams.set("wind_speed_unit", "kmh");

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Weather provider error (${res.status})`);
    }
    const raw = (await res.json()) as Record<string, never>;
    return buildWeatherData(location, raw);
  });

export const searchLocations = createServerFn({ method: "POST" })
  .inputValidator((input: { query: string }) => input)
  .handler(async ({ data }): Promise<FarmLocation[]> => {
    const q = data.query.trim();
    if (q.length < 2) return [];
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", q);
    url.searchParams.set("count", "6");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = (await res.json()) as {
      results?: { name: string; country?: string; admin1?: string; latitude: number; longitude: number }[];
    };
    return (json.results ?? []).map((r) => ({
      name: r.name,
      country: r.country ?? "",
      ...(r.admin1 ? { region: r.admin1 } : {}),
      latitude: r.latitude,
      longitude: r.longitude,
    }));
  });
