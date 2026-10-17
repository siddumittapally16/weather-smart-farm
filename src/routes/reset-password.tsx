import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — FarmGuard AI" }, { name: "description", content: "Choose a new password for your farm account." }, { property: "og:title", content: "Reset password — FarmGuard AI" }, { property: "og:description", content: "Secure your FarmGuard AI account." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ResetPassword,
});
function ResetPassword() {
  const [notice, setNotice] = useState(""); const [busy, setBusy] = useState(false); const navigate = useNavigate();
  return <main className="mx-auto max-w-md space-y-5 px-5 py-16"><h1 className="text-2xl font-semibold">Choose a new password</h1>
    <form className="space-y-4" onSubmit={async e => {
      e.preventDefault(); setBusy(true);
      try { const { error } = await supabase.auth.updateUser({ password: String(new FormData(e.currentTarget).get("password")) });
        if (error) setNotice(error.message); else await navigate({ to: "/crop-tracker" });
      } catch { setNotice("Unable to update your password. Please try again."); } finally { setBusy(false); }
    }}><Label htmlFor="new-password">New password</Label><Input id="new-password" name="password" type="password" minLength={8} autoComplete="new-password" required />
      {notice && <p role="status" className="text-sm">{notice}</p>}<Button disabled={busy}>Save password</Button>
    </form></main>;
}