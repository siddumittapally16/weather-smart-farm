import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAccount } from "@/components/farm/AccountProvider";
import "@lovable.dev/cloud-auth-js/styles.css";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Sign in — FarmGuard AI" }, { name: "description", content: "Sign in to save and manage your FarmGuard AI crop records." },
    { property: "og:title", content: "Sign in — FarmGuard AI" }, { property: "og:description", content: "Your private field and crop records." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: AuthPage,
});
function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const { user, ready } = useAccount();
  const navigate = useNavigate();
  useEffect(() => { if (ready && user) void navigate({ to: "/crop-tracker", replace: true }); }, [user, ready, navigate]);
  async function social(provider: "google" | "lovable") {
    setBusy(true); setNotice("");
    try {
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: `${window.location.origin}/auth` });
      if (result.error) setNotice("Sign-in could not be completed. Please try again.");
    } catch { setNotice("Sign-in could not be completed. Please try again."); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-md px-5 py-16">
    <Link to="/" className="mb-8 flex items-center gap-2 text-lg font-semibold"><Leaf className="text-primary" />FarmGuard AI</Link>
    <h1 className="text-2xl font-semibold">{mode === "signup" ? "Create your farm account" : mode === "reset" ? "Reset your password" : "Welcome back"}</h1>
    <p className="mt-2 mb-7 text-sm text-muted-foreground">Your fields, your crops, your season.</p>
    {mode !== "reset" && <div className="mb-5 grid gap-3">
      <Button variant="outline" disabled={busy} onClick={() => void social("google")}>Continue with Google</Button>
      <Button className="lovable-auth-button" variant="outline" disabled={busy} onClick={() => void social("lovable")}>Continue with Lovable</Button>
      <p className="text-center text-xs text-muted-foreground">or with email</p>
    </div>}
    <form className="space-y-4" onSubmit={async e => {
      e.preventDefault(); setBusy(true); setNotice("");
      const form = new FormData(e.currentTarget); const email = String(form.get("email")); const password = String(form.get("password") ?? "");
      try {
        const result = mode === "signup" ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth` } })
          : mode === "reset" ? await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
          : await supabase.auth.signInWithPassword({ email, password });
        if (result.error) setNotice(result.error.message);
        else if (mode === "signup") setNotice("Check your email to confirm your account before signing in.");
        else if (mode === "reset") setNotice("Check your email for a password reset link.");
        else await navigate({ to: "/crop-tracker" });
      } catch { setNotice("Unable to connect. Please try again."); } finally { setBusy(false); }
    }}>
      <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" autoComplete="email" required /></div>
      {mode !== "reset" && <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} required /></div>}
      {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
      <Button className="w-full" disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "reset" ? "Send reset link" : "Sign in"}</Button>
    </form>
    <div className="mt-4 flex flex-wrap justify-center gap-1">
      <Button variant="ghost" size="sm" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setNotice(""); }}>{mode === "signup" ? "Already have an account? Sign in" : "Create an account"}</Button>
      <Button variant="ghost" size="sm" onClick={() => { setMode(mode === "reset" ? "signin" : "reset"); setNotice(""); }}>{mode === "reset" ? "Back to sign in" : "Forgot password?"}</Button>
    </div>
  </main>;
}