import { createServerFn } from "@tanstack/react-start";
import type { WeatherData } from "./weather-types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type ChatTurn = { role: "user" | "assistant"; content: string };

const validateChat = (input: {
      message: string;
      weather: WeatherData | null;
      history?: ChatTurn[];
      cropFocus?: string;
    }) => ({ ...input, message: z.string().trim().min(1).max(4000).parse(input.message), history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(20000) })).max(100).optional().parse(input.history) });

export const askFarmGuardAI = createServerFn({ method: "POST" })
  .inputValidator(validateChat)
  .handler(async ({ data }) => {
    const { generateFarmReply } = await import("./farm-ai.server");
    return generateFarmReply(data);
  });

export const askFarmGuardWithCrops = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateChat)
  .handler(async ({ data, context }) => {
    const { data: fields, error } = await context.supabase.from("crop_fields").select("*").eq("user_id", context.userId).order("created_at", { ascending: false });
    if (error) throw new Error("Your crop records could not be loaded. Please try again.");
    const { generateFarmReply } = await import("./farm-ai.server");
    return generateFarmReply(data, fields);
  });
