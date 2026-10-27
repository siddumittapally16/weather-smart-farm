import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/jobs/rainfall-alerts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Single-flight lock: a second concurrent run exits instead of doubling alerts.
        const lock = await supabaseAdmin
          .from("rainfall_monitor_lock")
          .update({ locked_until: new Date(Date.now() + 4 * 60 * 1000).toISOString() })
          .eq("id", 1)
          .lt("locked_until", new Date().toISOString())
          .select();
        if (lock.error || !lock.data?.length) {
          return Response.json({ skipped: true, reason: "another monitor run is active" });
        }

        const result = await runRainfallMonitorSafe();
        return Response.json(result, { status: result.ok ? 200 : 500 });

        async function runRainfallMonitorSafe() {
          try {
            const { runRainfallMonitor } = await import("@/lib/rainfall-monitor.server");
            return { ok: true, ...(await runRainfallMonitor(supabaseAdmin)) };
          } catch (err) {
            console.error("Rainfall monitor failed:", err);
            return { ok: false, error: err instanceof Error ? err.message : String(err) };
          }
        }
      },
    },
  },
});
