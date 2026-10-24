import { describe, expect, it } from "vitest";
import {
  assessCropRisk,
  detectRainfallEvent,
  deriveGrowthStage,
  intensityLabel,
  isSignificantForecastChange,
} from "./rainfall-core";

const NOW = Date.parse("2026-10-24T09:00:00Z");
const slot = (n: number) => new Date(NOW + n * 15 * 60 * 1000).toISOString().replace(".000Z", "Z");

function forecast(firstRainSlot: number | null, mm = 1.2, count = 3) {
  const times: string[] = [];
  const precip: (number | null)[] = [];
  for (let i = 0; i < 12; i++) {
    times.push(slot(i));
    const isRain = firstRainSlot !== null && i >= firstRainSlot && i < firstRainSlot + count;
    precip.push(isRain ? mm : 0);
  }
  return {
    minutelyTime: times,
    minutelyPrecip: precip,
    hourlyTime: [slot(0).slice(0, 13) + ":00:00Z"],
    hourlyPrecipProb: [70],
  };
}

describe("rainfall early warning", () => {
  it("detects rain 45 minutes ahead as a scheduled alert", () => {
    const event = detectRainfallEvent(forecast(3), NOW);
    expect(event).not.toBeNull();
    expect(event!.minutesToStart).toBe(45);
    expect(event!.alertClass).toBe("scheduled");
    expect(event!.intensityMm).toBe(1.2);
    expect(event!.expectedDurationMinutes).toBe(45);
    expect(event!.expectedTotalMm).toBeCloseTo(3.6, 1);
    expect(event!.rainProbability).toBe(70);
  });

  it("treats rain less than 20 minutes ahead as an immediate alert with stated lead", () => {
    const event = detectRainfallEvent(forecast(1), NOW);
    expect(event!.minutesToStart).toBe(15);
    expect(event!.alertClass).toBe("immediate");
  });

  it("ignores rain further than 60 minutes out", () => {
    expect(detectRainfallEvent(forecast(5), NOW)).toBeNull();
  });

  it("returns null when no rain is forecast", () => {
    expect(detectRainfallEvent(forecast(null), NOW)).toBeNull();
  });

  it("does not resend for small forecast jitter but resends for a real change", () => {
    expect(isSignificantForecastChange({ startTime: slot(4), intensityMm: 1 }, { startTime: slot(5), intensityMm: 1.2 })).toBe(false);
    expect(isSignificantForecastChange({ startTime: slot(4), intensityMm: 1 }, { startTime: slot(8), intensityMm: 1 })).toBe(true);
    expect(isSignificantForecastChange({ startTime: slot(4), intensityMm: 0.3 }, { startTime: slot(4), intensityMm: 3 })).toBe(true);
  });

  it("derives growth stage from logged sowing date and progress", () => {
    expect(deriveGrowthStage("2026-10-10", 10, NOW)).toBe("Early vegetative");
    expect(deriveGrowthStage("2026-07-01", 35, NOW)).toBe("Vegetative");
    expect(deriveGrowthStage("2026-06-01", 35, NOW)).toBe("Flowering / reproductive");
    expect(deriveGrowthStage("2026-06-01", 95, NOW)).toBe("Maturity / harvest");
  });

  it("gives crop-specific qualitative risks without invented percentages", () => {
    const paddy = assessCropRisk("Paddy", "Maturity / harvest", 3, 60, 45);
    expect(paddy.damageRisk).toContain("Lodging");
    expect(paddy.yieldImpact).not.toMatch(/\d+%/);
    expect(paddy.precautions.length).toBeGreaterThan(0);

    const cotton = assessCropRisk("Cotton", "Flowering / reproductive", 1, 30, 30);
    expect(cotton.damageRisk).toContain("pest");
    expect(intensityLabel(3)).toBe("Heavy burst expected");
  });
});
