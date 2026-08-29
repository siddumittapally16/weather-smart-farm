import {
  CloudRain,
  Droplets,
  Gauge,
  Leaf,
  ShieldAlert,
  Sun,
  Thermometer,
  Wind,
  Clock,
  Sprout,
  TriangleAlert,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmt, windLabel, type WeatherData } from "@/lib/weather-types";

export function CurrentWeatherCard({ weather }: { weather: WeatherData }) {
  const { current: c, location: l } = weather;
  return (
    <Card className="overflow-hidden border-0 bg-hero-gradient text-primary-foreground shadow-float">
      <CardContent className="p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-sm/6 opacity-85">
              {l.name}
              {l.region ? `, ${l.region}` : ""}
              {l.country ? ` · ${l.country}` : ""}
            </p>
            <div className="mt-2 flex items-end gap-3">
              <span className="text-6xl font-semibold tracking-tight">
                {fmt(c.temperature, "°")}
              </span>
              <span className="pb-2 text-lg opacity-90">C</span>
            </div>
            <p className="mt-1 text-base font-medium">{c.condition}</p>
            <p className="text-sm opacity-85">
              Feels like {fmt(c.feelsLike, "°C")} · High {fmt(c.high, "°C")} · Low{" "}
              {fmt(c.low, "°C")}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <Stat label="Humidity" value={fmt(c.humidity, "%")} />
            <Stat label="Dew point" value={fmt(c.dewPoint, "°C")} />
            <Stat
              label="Wind"
              value={`${fmt(c.windSpeed, " km/h")} ${windLabel(c.windDirection)}`}
            />
            <Stat label="Gusts" value={fmt(c.windGust, " km/h")} />
            <Stat label="Rain chance" value={fmt(c.rainProbability, "%")} />
            <Stat label="Rain" value={fmt(c.precipitation, " mm", 1)} />
          </div>
        </div>
        {l.cropFocus ? (
          <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-medium">
            <Sprout className="size-3.5" /> Crop focus: {l.cropFocus}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide opacity-75">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

export function MetricsGrid({ weather }: { weather: WeatherData }) {
  const c = weather.current;
  const items = [
    { icon: Thermometer, label: "Feels like", value: fmt(c.feelsLike, "°C") },
    { icon: Droplets, label: "Humidity", value: fmt(c.humidity, "%") },
    { icon: CloudRain, label: "Rain chance", value: fmt(c.rainProbability, "%") },
    { icon: Wind, label: "Wind", value: fmt(c.windSpeed, " km/h") },
    { icon: Gauge, label: "Gusts", value: fmt(c.windGust, " km/h") },
    { icon: Sun, label: "UV index", value: fmt(c.uvIndex) },
    { icon: Droplets, label: "Dew point", value: fmt(c.dewPoint, "°C") },
    { icon: Leaf, label: "ET₀ today", value: fmt(c.et0, " mm", 1) },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((i) => (
        <Card key={i.label} className="shadow-card">
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex size-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
              <i.icon className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">{i.label}</p>
              <p className="font-semibold">{i.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function HourlyForecast({ weather }: { weather: WeatherData }) {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="size-4 text-primary" /> Hourly forecast
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="-mx-2 flex gap-3 overflow-x-auto px-2 pb-2">
          {weather.hourly.length === 0 ? (
            <p className="text-sm text-muted-foreground">Hourly forecast unavailable.</p>
          ) : (
            weather.hourly.map((h) => (
              <div
                key={h.time}
                className="min-w-[168px] shrink-0 rounded-2xl border border-border bg-card p-4"
              >
                <p className="text-sm font-semibold">{h.label}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{h.condition}</p>
                <p className="mt-2 text-2xl font-semibold">{fmt(h.temperature, "°C")}</p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <li>
                    Rain {fmt(h.rainProbability, "%")} · {fmt(h.precipitation, " mm", 1)}
                  </li>
                  <li>
                    Wind {fmt(h.windSpeed, " km/h")} {windLabel(h.windDirection)}
                  </li>
                  <li>Humidity {fmt(h.humidity, "%")}</li>
                </ul>
                <Badge
                  variant="secondary"
                  className={
                    h.suitabilityLevel === "good"
                      ? "mt-3 bg-secondary text-secondary-foreground"
                      : h.suitabilityLevel === "caution"
                        ? "mt-3 bg-warning/20 text-warning-foreground"
                        : "mt-3 bg-destructive/15 text-destructive"
                  }
                >
                  {h.suitability}
                </Badge>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function FarmingRecommendations({ weather }: { weather: WeatherData }) {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sprout className="size-4 text-primary" /> Farming recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {weather.recommendations.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">{r.category}</p>
              <Badge
                variant="secondary"
                className={
                  r.status === "good"
                    ? "bg-secondary text-secondary-foreground"
                    : r.status === "caution"
                      ? "bg-warning/20 text-warning-foreground"
                      : "bg-destructive/15 text-destructive"
                }
              >
                {r.status === "good" ? "Favourable" : r.status === "caution" ? "Caution" : "Avoid"}
              </Badge>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">{r.advice}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function SafetyAlerts({ weather }: { weather: WeatherData }) {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldAlert className="size-4 text-primary" /> Safety alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {weather.safetyAlerts.map((a) => {
          const Icon =
            a.severity === "info" ? Info : a.severity === "warning" ? TriangleAlert : ShieldAlert;
          return (
            <div
              key={a.id}
              className={
                a.severity === "danger"
                  ? "flex gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4"
                  : a.severity === "warning"
                    ? "flex gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4"
                    : "flex gap-3 rounded-2xl border border-border bg-muted p-4"
              }
            >
              <Icon
                className={
                  a.severity === "danger"
                    ? "mt-0.5 size-4 shrink-0 text-destructive"
                    : a.severity === "warning"
                      ? "mt-0.5 size-4 shrink-0 text-warning"
                      : "mt-0.5 size-4 shrink-0 text-muted-foreground"
                }
              />
              <div>
                <p className="text-sm font-medium">{a.title}</p>
                <p className="text-sm text-muted-foreground">{a.detail}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function BestTimeActivities({ weather }: { weather: WeatherData }) {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="size-4 text-primary" /> Best time for activities
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {weather.bestTimeActivities.map((b) => (
          <div key={b.activity} className="rounded-2xl border border-border p-4">
            <p className="text-sm text-muted-foreground">{b.activity}</p>
            <p className="text-xl font-semibold">{b.window}</p>
            <p className="mt-1 text-xs text-muted-foreground">{b.reason}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
