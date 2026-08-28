import { useEffect, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchLocations } from "@/lib/weather.functions";
import { PRESET_LOCATIONS, type FarmLocation } from "@/lib/weather-types";

export function LocationSearch({
  active,
  onSelect,
}: {
  active: FarmLocation;
  onSelect: (location: FarmLocation) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FarmLocation[]>([]);
  const [searching, setSearching] = useState(false);
  const search = useServerFn(searchLocations);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const found = await search({ data: { query: q } });
        if (!cancelled) setResults(found);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, search]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search an agricultural location…"
          className="h-11 rounded-full bg-card pl-9"
          aria-label="Search location"
        />
      </div>

      {query.trim().length >= 2 ? (
        <div className="rounded-2xl border border-border bg-card p-2 shadow-card">
          {searching && results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">No matching location found.</p>
          ) : (
            results.map((r) => (
              <button
                key={`${r.latitude},${r.longitude}`}
                onClick={() => {
                  onSelect(r);
                  setQuery("");
                  setResults([]);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
              >
                <MapPin className="size-4 text-primary" />
                <span>
                  {r.name}
                  {r.region ? `, ${r.region}` : ""} · {r.country}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {PRESET_LOCATIONS.map((p) => {
          const isActive = p.latitude === active.latitude && p.longitude === active.longitude;
          return (
            <Button
              key={p.name}
              size="sm"
              variant={isActive ? "default" : "outline"}
              className="rounded-full"
              onClick={() => onSelect(p)}
            >
              {p.name}
              {p.region ? `, ${p.region}` : ""}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
