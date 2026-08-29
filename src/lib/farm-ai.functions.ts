import { createServerFn } from "@tanstack/react-start";
import type { WeatherData } from "./weather-types";
import { buildAiContext, FARM_AI_SYSTEM_PROMPT } from "./farm-ai-core";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export const askFarmGuardAI = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      message: string;
      weather: WeatherData | null;
      history?: ChatTurn[];
      cropFocus?: string;
    }) => input,
  )
  .handler(async ({ data }): Promise<{ reply: string }> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("FarmGuard AI is temporarily unavailable.");

    const context = buildAiContext(data.weather, data.cropFocus);
    const history = (data.history ?? []).slice(-8);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "openai/gpt-5.6-sol",
        input: [
          { role: "system", content: `${FARM_AI_SYSTEM_PROMPT}\n\n${context}` },
          ...history.map((t) => ({ role: t.role, content: t.content })),
          { role: "user", content: data.message },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`FarmGuard AI gateway error [${res.status}]: ${body}`);
      throw new Error(
        res.status === 429
          ? "FarmGuard AI is busy right now. Please try again in a moment."
          : "FarmGuard AI is temporarily unavailable. You can still use the live weather dashboard.",
      );
    }

    const json = (await res.json()) as {
      output_text?: string;
      output?: { content?: { type?: string; text?: string }[] }[];
    };
    const reply =
      json.output_text ??
      json.output
        ?.flatMap((o) => o.content ?? [])
        .filter((c) => c.type === "output_text" || typeof c.text === "string")
        .map((c) => c.text ?? "")
        .join("\n")
        .trim();

    return {
      reply:
        reply && reply.length > 0
          ? reply
          : "I couldn't form an answer just now. Please rephrase your question.",
    };
  });
