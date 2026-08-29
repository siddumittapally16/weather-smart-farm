import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { Leaf, RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LocationSearch } from "@/components/farm/LocationSearch";
import { AIChatBox } from "@/components/farm/AIChatBox";
import {
  BestTimeActivities,
  CurrentWeatherCard,
  FarmingRecommendations,
  HourlyForecast,
  MetricsGrid,
  SafetyAlerts,
} from "@/components/farm/WeatherCards";
import { fetchWeatherData } from "@/lib/weather.functions";
import { buildForecastUrl, buildWeatherData } from "@/lib/weather-core";

import {
  DEFAULT_LOCATION,
  WEATHER_REFRESH_INTERVAL_MS,
  type FarmLocation,
  type WeatherData,
} from "@/lib/weather-types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FarmGuard AI — Agricultural Weather Dashboard" },
      {
        name: "description",
        content:
          "Live agricultural weather, hourly forecasts, spraying and irrigation windows, safety alerts and an AI farm assistant for your fields.",
      },
      { property: "og:title", content: "FarmGuard AI — Agricultural Weather Dashboard" },
      {
        property: "og:description",
        content:
          "Live agricultural weather, hourly forecasts, spraying and irrigation windows, safety alerts and an AI farm assistant.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function relativeTime(iso: string | null): string {
  if (!iso) return "--";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins <= 0) return "just now";
  if (mins === 1) return "1 minute ago";
  if (mins < 60) return `${mins} minutes ago`;
  const hrs = Math.floor(mins / 60);
  return hrs === 1 ? "1 hour ago" : `${hrs} hours ago`;
}

function Dashboard() {
  const [location, setLocation] = useState<FarmLocation>(DEFAULT_LOCATION);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [updating, setUpdating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, forceTick] = useState(0);
  const getWeather = useServerFn(fetchWeatherData);
  const locationRef = useRef(location);
  locationRef.current = location;

  const refresh = useCallback(
    async (target: FarmLocation) => {
      setUpdating(true);
      try {
        let data: WeatherData;
        try {
          data = await getWeather({ data: { location: target } });
        } catch {
          // Fallback: fetch straight from the browser (Open-Meteo allows CORS)
          // so a backend hiccup never blanks the dashboard.
          const res = await fetch(buildForecastUrl(target), {
            headers: { Accept: "application/json" },
          });
          if (!res.ok) throw new Error(`provider status ${res.status}`);
          data = buildWeatherData(target, (await res.json()) as never);
        }
        setWeather(data);
        setError(null);
        return true;
      } catch {
        setWeather((prev) => (prev ? prev : null));
        setError(
          "Unable to retrieve live weather data. Please check your connection and try again.",
        );
        return false;
      } finally {
        setUpdating(false);
      }
    },
    [getWeather],
  );


  // Load the default agricultural location immediately, then whenever it changes.
  // If the provider hiccups, retry automatically with a short backoff.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const attempt = async (tries: number) => {
      const ok = await refresh(location);
      if (!ok && !cancelled && tries < 4) {
        timer = setTimeout(() => void attempt(tries + 1), 3000 * (tries + 1));
      }
    };
    void attempt(0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [location, refresh]);

  // Periodic auto-refresh (interval configurable in weather-types.ts).
  useEffect(() => {
    const id = setInterval(() => void refresh(locationRef.current), WEATHER_REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  // Keep the "updated x minutes ago" label fresh.
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const staleNotice = error && weather;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Leaf className="size-4.5" />
          </span>
          <div className="flex-1">
            <h1 className="text-base font-semibold tracking-tight">FarmGuard AI</h1>
            <p className="text-xs text-muted-foreground">
              {updating
                ? "Updating weather…"
                : `Weather updated ${relativeTime(weather?.fetchedAt ?? null)}`}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => void refresh(location)}
            disabled={updating}
          >
            <RefreshCw className={updating ? "size-4 animate-spin" : "size-4"} />
            <span className="hidden sm:inline">Refresh Weather</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 pb-28 sm:px-6">
        <LocationSearch active={location} onSelect={setLocation} />

        {staleNotice ? (
          <Card className="border-warning/40 bg-warning/10 shadow-none">
            <CardContent className="flex items-center gap-3 p-4 text-sm">
              <TriangleAlert className="size-4 text-warning" />
              <span>Weather update unavailable. Showing the last successful update.</span>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto rounded-full"
                onClick={() => void refresh(location)}
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {!weather && error ? (
          <Card className="shadow-card">
            <CardContent className="flex flex-col items-start gap-3 p-6">
              <p className="font-medium">{error}</p>
              <Button className="rounded-full" onClick={() => void refresh(location)}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {!weather && !error ? (
          <Card className="shadow-card">
            <CardContent className="p-6 text-sm text-muted-foreground">
              Loading live weather for {location.name}…
            </CardContent>
          </Card>
        ) : null}

        {weather ? (
          <>
            <CurrentWeatherCard weather={weather} />
            <MetricsGrid weather={weather} />
            <HourlyForecast weather={weather} />
            <div className="grid gap-5 lg:grid-cols-2">
              <FarmingRecommendations weather={weather} />
              <div className="space-y-5">
                <SafetyAlerts weather={weather} />
                <BestTimeActivities weather={weather} />
              </div>
            </div>
          </>
        ) : null}
      </main>

      <AIChatBox weather={weather} />
    </div>
  );
}
