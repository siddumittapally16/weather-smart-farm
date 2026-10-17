import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { cropFieldSchema } from "./crop-core";

export const listCropFields = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("crop_fields").select("*").eq("user_id", context.userId).order("created_at", { ascending: false });
    if (error) throw new Error("Your fields could not be loaded. Please try again.");
    return data;
  });

export const saveCropField = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id?: string; field: unknown }) => ({ id: z.string().uuid().optional().parse(input.id), field: cropFieldSchema.parse(input.field) }))
  .handler(async ({ data, context }) => {
    const values = { ...data.field, user_id: context.userId };
    const result = data.id
      ? await context.supabase.from("crop_fields").update(values).eq("id", data.id).eq("user_id", context.userId).select().single()
      : await context.supabase.from("crop_fields").insert(values).select().single();
    if (result.error) throw new Error("Your field could not be saved. Please try again.");
    return result.data;
  });

export const deleteCropField = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("crop_fields").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error("Your field could not be deleted. Please try again.");
    return { success: true };
  });