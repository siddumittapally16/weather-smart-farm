/**
 * Server-only rainfall monitor. Fetches real 15-minute precipitation
 * forecasts from Open-Meteo for saved fields, detects rain starting within
 * the next hour, records alerts (deduplicated) and creates in-app
 * notifications. The email step is added after sender-domain setup.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assessCropRisk,
  detectRainfallEvent,
  deriveGrowthStage,
  intensityLabel,
  isSignificantForecastChange,
} from "./rainfall-core";
import type { CropFieldInput } from "./crop-core";

const FIELD_BATCH_LIMIT = 25;
const MAX_ALERT_UPDATES_PER_EVENT = 3;
const FETCH_TIMEOUT_MS = 5000;

export type MonitorResult = {
  checkedFields: number;
  newAlerts: number;
  updatedAlerts: number;
  skipped: string[];
};

type AlertRow = {
  id: string;
  field_id: string;
  event_start: string;
  predicted_intensity_mm: number;
  alert_version: number;
};

function notificationMessage(field: { field_name: string; crop: string }, intensityMm: number, leadMinutes: number, stage: string): string {
  const assessment = assessCropRisk(field.crop, stage as never, intensityMm, null, leadMinutes);
  const timing =
    leadMinutes <= 0
      ? `${intensityLabel(intensityMm)} — starting around now.`
      : `${intensityLabel(intensityMm)} — starts in about ${leadMinutes} minutes.`;
  return `${timing} ${assessment.damageRisk} First step: ${assessment.precautions[0]}`;
}

async function fetchForecast(lat: number, lon: number): Promise<Record<string, never> | null> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("minutely_15", "precipitation");
  url.searchParams.set("hourly", "precipitation_probability");
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code");
  url.searchParams.set("forecast_minutely_15", "8");
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, never>;
  } catch {
    return null;
  }
}

export async function runRainfallMonitor(admin: SupabaseClient, nowMs = Date.now()): Promise<MonitorResult> {
  const result: MonitorResult = { checkedFields: 0, newAlerts: 0, updatedAlerts: 0, skipped: [] };

  const [{ data: fields, error: fieldsError }, { data: disabledPrefs }] = await Promise.all([
    admin.from("crop_fields").select("*").order("created_at", { ascending: true }).limit(FIELD_BATCH_LIMIT),
    admin.from("rainfall_alert_prefs").select("user_id").eq("notify_in_app", false),
  ]);
  if (fieldsError) {
    result.skipped.push(`fields: ${fieldsError.message}`);
    return result;
  }
  const disabledUsers = new Set((disabledPrefs ?? []).map((p) => p.user_id));
  const allFields = (fields ?? []) as (CropFieldInput & { id: string; user_id: string })[];
  const batch = allFields.filter((f) => !disabledUsers.has(f.user_id));
  result.checkedFields = batch.length;
  if (batch.length === 0) return result;

  // One forecast request per unique location, shared across fields.
  const forecastCache = new Map<string, Promise<Record<string, never> | null>>();
  const getForecast = (lat: number, lon: number) => {
    const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    let entry = forecastCache.get(key);
    if (!entry) {
      entry = fetchForecast(lat, lon);
      forecastCache.set(key, entry);
    }
    return entry;
  };

  await Promise.all(
    batch.map(async (field) => {
      const raw = await getForecast(field.latitude, field.longitude);
      if (!raw) {
        result.skipped.push(`forecast unavailable for ${field.field_name}`);
        return;
      }
      const minutely = (raw["minutely_15"] ?? {}) as { time?: string[]; precipitation?: (number | null)[] };
      const hourly = (raw["hourly"] ?? {}) as { time?: string[]; precipitation_probability?: (number | null)[] };
      const event = detectRainfallEvent(
        {
          minutelyTime: minutely.time ?? [],
          minutelyPrecip: minutely.precipitation ?? [],
          hourlyTime: hourly.time ?? [],
          hourlyPrecipProb: hourly.precipitation_probability ?? [],
        },
        nowMs,
      );
      if (!event) return;

      const { data: recent, error: recentError } = await admin
        .from("rainfall_alerts")
        .select("id, field_id, event_start, predicted_intensity_mm, alert_version")
        .eq("field_id", field.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (recentError) {
        result.skipped.push(`alert lookup failed for ${field.field_name}`);
        return;
      }
      const alerts = (recent ?? []) as AlertRow[];
      const sameEvent = alerts.find((a) => Math.abs(Date.parse(a.event_start) - Date.parse(event.startTime)) < 60 * 1000);
      if (sameEvent) return; // Already alerted for this event — no duplicate.

      const priorEvent = alerts[0];
      const isUpdate = !!priorEvent && isSignificantForecastChange(
        { startTime: priorEvent.event_start, intensityMm: Number(priorEvent.predicted_intensity_mm) },
        { startTime: event.startTime, intensityMm: event.intensityMm },
      );
      if (isUpdate && priorEvent && priorEvent.alert_version >= MAX_ALERT_UPDATES_PER_EVENT) return;

      const stage = deriveGrowthStage(field.sowing_date, field.harvest_progress, nowMs);
      const message = notificationMessage(field, event.intensityMm, event.minutesToStart, stage);

      if (isUpdate && priorEvent) {
        const updated = await admin
          .from("rainfall_alerts")
          .update({
            event_start: event.startTime,
            predicted_intensity_mm: event.intensityMm,
            expected_total_mm: event.expectedTotalMm,
            expected_duration_minutes: event.expectedDurationMinutes,
            rain_probability: event.rainProbability,
            lead_minutes: event.minutesToStart,
            alert_version: priorEvent.alert_version + 1,
            updated_at: new Date(nowMs).toISOString(),
          })
          .eq("id", priorEvent.id)
          .select()
          .single();
        if (updated.error) {
          result.skipped.push(`alert update failed for ${field.field_name}`);
          return;
        }
        await admin
          .from("rainfall_notifications")
          .update({ event_start: event.startTime, lead_minutes: event.minutesToStart, intensity_mm: event.intensityMm, message })
          .eq("alert_id", priorEvent.id);
        result.updatedAlerts++;
        return;
      }

      const inserted = await admin
        .from("rainfall_alerts")
        .insert({
          user_id: field.user_id,
          field_id: field.id,
          event_start: event.startTime,
          predicted_intensity_mm: event.intensityMm,
          expected_total_mm: event.expectedTotalMm,
          expected_duration_minutes: event.expectedDurationMinutes,
          rain_probability: event.rainProbability,
          lead_minutes: event.minutesToStart,
        })
        .select()
        .single();
      if (inserted.error) {
        // A duplicate insert (same field + event start) is expected on a re-run; ignore it.
        result.skipped.push(`alert insert failed for ${field.field_name}`);
        return;
      }
      await admin.from("rainfall_notifications").insert({
        user_id: field.user_id,
        alert_id: inserted.data.id,
        field_name: field.field_name,
        crop: field.crop,
        location_name: field.location_name,
        event_start: event.startTime,
        lead_minutes: event.minutesToStart,
        intensity_mm: event.intensityMm,
        message,
      });
      result.newAlerts++;
    }),
  );

  return result;
}
