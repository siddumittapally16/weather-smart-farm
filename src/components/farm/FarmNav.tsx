import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CloudSun, Sprout, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "./AccountProvider";

export function FarmNav() {
  const { user } = useAccount();
  const client = useQueryClient();
  const navigate = useNavigate();
  return <nav aria-label="Farm navigation" className="flex flex-wrap items-center gap-1">
    <Button asChild size="sm" variant="ghost"><Link to="/"><CloudSun className="size-4" /><span className="hidden sm:inline">Weather</span></Link></Button>
    <Button asChild size="sm" variant="outline"><Link to="/crop-tracker"><Sprout className="size-4" />Crop tracker</Link></Button>
    {user ? <Button size="icon" variant="ghost" aria-label="Sign out" title="Sign out" onClick={async () => {
      await client.cancelQueries(); client.clear(); await supabase.auth.signOut(); await navigate({ to: "/auth", replace: true });
    }}><LogOut className="size-4" /></Button> : <Button asChild size="sm" variant="ghost"><Link to="/auth">Sign in</Link></Button>}
  </nav>;
}