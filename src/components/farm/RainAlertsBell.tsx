import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CloudRain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRainfallAlertPrefs, listRainfallNotifications, markRainfallNotificationsSeen, setRainfallAlertPrefs, type RainNotification } from "@/lib/rainfall.functions";
import { useAccount } from "./AccountProvider";

function eventTime(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
  return sameDay ? `today around ${time}` : `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} around ${time}`;
}

export function RainAlertsBell() {
  const { user } = useAccount();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const client = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["rain-notifications"],
    queryFn: listRainfallNotifications,
    enabled: !!user,
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
  });

  const { data: prefs } = useQuery({
    queryKey: ["rain-alert-prefs"],
    queryFn: getRainfallAlertPrefs,
    enabled: !!user,
  });

  const markSeen = useMutation({
    mutationFn: markRainfallNotificationsSeen,
    onSuccess: () => client.invalidateQueries({ queryKey: ["rain-notifications"] }),
  });

  const togglePrefs = useMutation({
    mutationFn: (notifyInApp: boolean) => setRainfallAlertPrefs({ data: { notifyInApp } }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["rain-alert-prefs"] }),
  });

  const unread = notifications.filter((n) => !n.seen_at).length;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!user) return null;

  return (
    <div className="relative" ref={panelRef}>
      <Button
        size="icon"
        variant={unread > 0 ? "outline" : "ghost"}
        aria-label={unread > 0 ? `Rain alerts, ${unread} unread` : "Rain alerts"}
        title="Rain alerts"
        onClick={() => {
          setOpen((v) => !v);
          if (unread > 0) markSeen.mutate();
        }}
      >
        <Bell className="size-4" />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </Button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">Rain alerts for your fields</p>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={prefs?.notifyInApp ?? true}
                onChange={(e) => togglePrefs.mutate(e.target.checked)}
                className="accent-[var(--primary)]"
              />
              Notify me
            </label>
          </div>
          {notifications.length === 0 ? (
            <p className="py-2 text-xs text-muted-foreground">
              No rain warnings yet. The monitor checks your saved fields every 5 minutes and warns you here when rain is expected within the hour.
            </p>
          ) : (
            <ul className="max-h-80 space-y-2 overflow-y-auto">
              {notifications.map((n: RainNotification) => (
                <li key={n.id} className="rounded-lg border border-border p-2.5">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <CloudRain className="size-3.5 text-primary" />
                    {n.field_name} — {n.location_name}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {n.crop} · {eventTime(n.event_start)}
                  </p>
                  <p className="mt-1 text-xs leading-snug">{n.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
