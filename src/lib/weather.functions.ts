import { createServerFn } from "@tanstack/react-start";
import { buildForecastUrl, buildWeatherData } from "./weather-core";
import type { FarmLocation, WeatherData } from "./weather-types";

export const fetchWeatherData = createServerFn({ method: "POST" })
  .inputValidator((input: { location: FarmLocation }) => input)
  .handler(async ({ data }): Promise<WeatherData> => {
    const { location } = data;
    const url = buildForecastUrl(location);

    // Open-Meteo occasionally rate-limits or drops a request; retry briefly
    // so a single hiccup never blanks the dashboard.
    let lastError = "unknown error";
    for (let attempt = 0; attempt < 4; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 300 * attempt));
      try {
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) {
          lastError = `provider status ${res.status}`;
          continue;
        }
        const raw = (await res.json()) as Record<string, never>;
        return buildWeatherData(location, raw);
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }
    throw new Error(`Weather provider unavailable (${lastError})`);
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
      results?: {
        name: string;
        country?: string;
        admin1?: string;
        latitude: number;
        longitude: number;
      }[];
    };
    return (json.results ?? []).map((r) => ({
      name: r.name,
      country: r.country ?? "",
      ...(r.admin1 ? { region: r.admin1 } : {}),
      latitude: r.latitude,
      longitude: r.longitude,
    }));
  });
