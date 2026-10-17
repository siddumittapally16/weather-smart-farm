import { describe, expect, it } from "vitest";
import { buildCropContext, cropFieldSchema, type CropFieldInput } from "./crop-core";

const field: CropFieldInput = { field_name: "North field", crop: "Paddy", sowing_date: "2026-07-01", expected_harvest_date: "2026-11-01", harvest_progress: 35, area_acres: 2.5, notes: "Swarna variety", location_name: "Warangal", region: "Telangana", country: "India", latitude: 17.9689, longitude: 79.5941 };
describe("crop records", () => {
  it("preserves logged fields, sowing dates, and harvest progress in AI context", () => {
    const context = buildCropContext([field], { name: "Warangal", country: "India", latitude: 17.9689, longitude: 79.5941 });
    const record = JSON.parse(context.split("\n")[1] ?? "[]")[0];
    expect(record.field).toBe("North field"); expect(record.crop).toBe("Paddy"); expect(record.sowingDate).toBe("2026-07-01"); expect(record.harvestProgressPercent).toBe(35); expect(record.matchesWeatherLocation).toBe(true);
  });
  it("does not match a field to weather in another location", () => {
    const context = buildCropContext([field], { name: "Fresno", country: "United States", latitude: 36.7378, longitude: -119.7871 });
    expect(JSON.parse(context.split("\n")[1] ?? "[]")[0].matchesWeatherLocation).toBe(false);
  });
  it("bounds harvested progress at zero to one hundred", () => {
    expect(cropFieldSchema.safeParse({ ...field, harvest_progress: 0 }).success).toBe(true);
    expect(cropFieldSchema.safeParse({ ...field, harvest_progress: 100 }).success).toBe(true);
    expect(cropFieldSchema.safeParse({ ...field, harvest_progress: 101 }).success).toBe(false);
    expect(cropFieldSchema.safeParse({ ...field, harvest_progress: -1 }).success).toBe(false);
  });
  it("rejects a harvest date before the sowing date", () => { expect(cropFieldSchema.safeParse({ ...field, expected_harvest_date: "2026-06-30" }).success).toBe(false); });
});