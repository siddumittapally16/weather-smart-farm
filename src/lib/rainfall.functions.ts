import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type RainNotification = {
  id: string;
  field_name: string;
  crop: string;
  location_name: string;
  event_start: string;
  lead_minutes: number;
  intensity_mm: number;
  message: string;
  seen_at: string | null;
  created_at: string;
};

export const listRainfallNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RainNotification[]> => {
    const { data, error } = await context.supabase
      .from("rainfall_notifications")
      .select("id, field_name, crop, location_name, event_start, lead_minutes, intensity_mm, message, seen_at, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error("Rain notifications could not be loaded.");
    return data as RainNotification[];
  });

export const markRainfallNotificationsSeen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("rainfall_notifications")
      .update({ seen_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .is("seen_at", null);
    if (error) throw new Error("Rain notifications could not be marked as read.");
    return { success: true };
  });

export const setRainfallAlertPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { notifyInApp?: boolean }) =>
    z.object({ notifyInApp: z.boolean().optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const values: { user_id: string; updated_at: string; notify_in_app?: boolean } = {
      user_id: context.userId,
      updated_at: new Date().toISOString(),
    };
    if (data.notifyInApp !== undefined) values.notify_in_app = data.notifyInApp;
    const { error } = await context.supabase.from("rainfall_alert_prefs").upsert(values);
    if (error) throw new Error("Alert settings could not be saved.");
    return { success: true };
  });

export const getRainfallAlertPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("rainfall_alert_prefs")
      .select("notify_in_app")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { notifyInApp: data?.["notify_in_app"] ?? true };
  });
