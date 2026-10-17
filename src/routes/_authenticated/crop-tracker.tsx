import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { CropTracker, cropFieldsQuery } from "@/components/farm/CropTracker";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/crop-tracker")({
  head: () => ({ meta: [
    { title: "Crop tracker — FarmGuard AI" }, { name: "description", content: "Log your fields, sowing dates, and harvest progress with FarmGuard AI." },
    { property: "og:title", content: "Crop tracker — FarmGuard AI" }, { property: "og:description", content: "Your fields and harvest progress in one place." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(cropFieldsQuery),
  component: CropTracker,
  pendingComponent: () => <p className="p-8 text-muted-foreground">Loading your fields…</p>,
  errorComponent: CropError,
  notFoundComponent: () => <p className="p-8">Field records not found.</p>,
});
function CropError() {
  const router = useRouter();
  return <main className="mx-auto max-w-xl space-y-4 p-8"><h1 className="text-xl font-semibold">Your fields could not be loaded</h1><Button onClick={() => void router.invalidate()}>Try again</Button><Button asChild variant="outline"><Link to="/">Back to weather</Link></Button></main>;
}