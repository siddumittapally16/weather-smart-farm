import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Eraser, Send, X, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askFarmGuardAI, askFarmGuardWithCrops, type ChatTurn } from "@/lib/farm-ai.functions";
import { useAccount } from "./AccountProvider";
import type { WeatherData } from "@/lib/weather-types";

type Message = { id: string; role: "user" | "assistant"; content: string; at: number };

const WELCOME =
  "Hello! I'm FarmGuard AI 🌱\n\nI can help you make smarter farming decisions using current weather conditions, forecasts, crop information, irrigation conditions, spraying conditions, and farm safety data.";

const SUGGESTIONS = [
  "Should I irrigate now?",
  "Is it safe to spray?",
  "Will it rain today?",
  "What is the best time to harvest?",
  "Is the wind safe for spraying?",
  "Explain today's weather",
  "What should I do on my farm today?",
];

const time = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });

function welcomeMessage(): Message {
  return { id: "welcome", role: "assistant", content: WELCOME, at: Date.now() };
}

/** Renders **bold** markers without pulling in a full markdown renderer. */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/(\*\*[^*]+\*\*)/g)
        .map((part, i) =>
          part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
            <strong key={i}>{part.slice(2, -2)}</strong>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
    </>
  );
}

export function AIChatBox({ weather }: { weather: WeatherData | null }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const ask = useServerFn(askFarmGuardAI);
  const askWithCrops = useServerFn(askFarmGuardWithCrops);
  const { user } = useAccount();
  const identity = user?.id;
  const contextVersion = useRef(0);

  useEffect(() => { contextVersion.current += 1; setMessages([welcomeMessage()]); setInput(""); setLoading(false); }, [identity, weather?.location.latitude, weather?.location.longitude]);

  useEffect(() => {
    if (messages.length === 0) setMessages([welcomeMessage()]);
  }, [messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const requestVersion = contextVersion.current;
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      at: Date.now(),
    };
    const history: ChatTurn[] = messages
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await (user ? askWithCrops : ask)({
        data: {
          message: trimmed,
          weather,
          history,
          ...(weather?.location.cropFocus ? { cropFocus: weather.location.cropFocus } : {}),
        },
      });
      if (requestVersion !== contextVersion.current) return;
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: res.reply, at: Date.now() },
      ]);
    } catch (err) {
      if (requestVersion !== contextVersion.current) return;
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            err instanceof Error && err.message.includes("busy")
              ? err.message
              : "FarmGuard AI is temporarily unavailable. You can still use the live weather dashboard.",
          at: Date.now(),
        },
      ]);
    } finally {
      if (requestVersion === contextVersion.current) setLoading(false);
    }
  };

  return (
    <div className="fixed right-5 bottom-5 z-[999] flex flex-col items-end gap-3">
      {open ? (
        <div className="animate-chat-in flex h-[min(560px,calc(100dvh-7rem))] w-[calc(100vw-24px)] max-w-[420px] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-float sm:w-[380px]">
          <header className="flex items-center gap-3 bg-hero-gradient px-4 py-3 text-primary-foreground">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary-foreground/20">
              <Leaf className="size-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">FarmGuard AI</p>
              <p className="truncate text-xs opacity-85">Your Smart Agricultural Assistant</p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Clear chat"
              className="size-8 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => setMessages([welcomeMessage()])}
            >
              <Eraser className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Minimize chat"
              className="size-8 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => setOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </header>

          {weather ? (
            <p className="border-b border-border bg-muted px-4 py-1.5 text-[11px] text-muted-foreground">
              Using live weather for {weather.location.name}
              {weather.location.region ? `, ${weather.location.region}` : ""}
              {user ? " · Saved crop records included" : ""}
            </p>
          ) : null}

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "user" ? "flex flex-col items-end" : "flex flex-col items-start"
                }
              >
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm whitespace-pre-wrap text-primary-foreground"
                      : "max-w-[92%] text-sm whitespace-pre-wrap text-foreground"
                  }
                >
                  <RichText text={m.content} />
                </div>
                <span className="mt-1 text-[10px] text-muted-foreground">
                  {m.role === "user" ? "You" : "FarmGuard AI"} · {time(m.at)}
                </span>
              </div>
            ))}

            {loading ? (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <span className="animate-typing-dot size-1.5 rounded-full bg-primary" />
                <span className="animate-typing-dot size-1.5 rounded-full bg-primary [animation-delay:0.15s]" />
                <span className="animate-typing-dot size-1.5 rounded-full bg-primary [animation-delay:0.3s]" />
                <span className="ml-1 text-xs">FarmGuard AI is thinking…</span>
              </div>
            ) : null}

            {messages.length <= 1 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => void send(s)}
                    className="rounded-full border border-border bg-muted px-3 py-1.5 text-xs transition-colors hover:bg-accent"
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <form
            className="flex items-end gap-2 border-t border-border p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              rows={1}
              placeholder="Ask about irrigation, spraying, rain…"
              className="max-h-28 min-h-10 resize-none rounded-2xl bg-muted text-sm"
              aria-label="Message FarmGuard AI"
            />
            <Button
              type="submit"
              size="icon"
              className="size-10 shrink-0 rounded-full"
              disabled={loading || !input.trim()}
            >
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      ) : null}

      <Button
        size="icon"
        aria-label={open ? "Minimize FarmGuard AI" : "Open FarmGuard AI"}
        onClick={() => setOpen((o) => !o)}
        className="size-14 rounded-full shadow-float transition-transform hover:scale-105"
      >
        {open ? <X className="size-6" /> : <Bot className="size-6" />}
      </Button>
    </div>
  );
}
