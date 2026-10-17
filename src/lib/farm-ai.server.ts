import type { WeatherData } from "./weather-types";
import { buildAiContext, FARM_AI_SYSTEM_PROMPT } from "./farm-ai-core";
import { buildKnowledgeContext } from "./farm-knowledge";
import { buildCropContext, type CropFieldInput } from "./crop-core";

export async function generateFarmReply(data: { message: string; weather: WeatherData | null; history?: { role: "user" | "assistant"; content: string }[]; cropFocus?: string }, fields?: CropFieldInput[]): Promise<{ reply: string }> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("FarmGuard AI is temporarily unavailable.");
  const context = `${buildAiContext(data.weather, data.cropFocus)}\n\n${buildKnowledgeContext(data.weather)}\n\n${fields ? buildCropContext(fields, data.weather?.location) : "No saved crop records available: the user is not signed in. Do not invent records."}`;
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "openai/gpt-5.6-sol", input: [
      { role: "system", content: `${FARM_AI_SYSTEM_PROMPT}\n\n${context}` },
      ...(data.history ?? []).slice(-8), { role: "user", content: data.message },
    ] }),
  });
  if (!res.ok) {
    console.error(`FarmGuard AI gateway error [${res.status}]`);
    throw new Error(res.status === 429 ? "FarmGuard AI is busy right now. Please try again in a moment." : "FarmGuard AI is temporarily unavailable. You can still use the live weather dashboard.");
  }
  const json = await res.json() as { output_text?: string; output?: { content?: { type?: string; text?: string }[] }[] };
  const reply = json.output_text ?? json.output?.flatMap(o => o.content ?? []).filter(c => c.type === "output_text" || typeof c.text === "string").map(c => c.text ?? "").join("\n").trim();
  return { reply: reply || "I couldn't form an answer just now. Please rephrase your question." };
}