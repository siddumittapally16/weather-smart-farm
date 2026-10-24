import { useState } from "react";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Leaf, Sprout, Plus, Pencil, Trash2, MapPin, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { LocationSearch } from "./LocationSearch";
import { FarmNav } from "./FarmNav";
import { cropFieldSchema, type CropField } from "@/lib/crop-core";
import { listCropFields, saveCropField, deleteCropField } from "@/lib/crops.functions";
import { DEFAULT_LOCATION, type FarmLocation } from "@/lib/weather-types";

export const cropFieldsQuery = queryOptions({ queryKey: ["crop-fields"], queryFn: () => listCropFields() });
const dateLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export function CropTracker() {
  const { data: fields } = useSuspenseQuery(cropFieldsQuery);
  const client = useQueryClient();
  const save = useServerFn(saveCropField); const remove = useServerFn(deleteCropField);
  const [editing, setEditing] = useState<CropField | null>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<CropField | null>(null);
  const [location, setLocation] = useState<FarmLocation>(DEFAULT_LOCATION);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function startEdit(field: CropField | null) {
    setEditing(field); setProgress(field?.harvest_progress ?? 0); setError("");
    setLocation(field ? { name: field.location_name, ...(field.region ? { region: field.region } : {}), country: field.country ?? "", latitude: field.latitude, longitude: field.longitude } : DEFAULT_LOCATION);
    setOpen(true);
  }
  return <div className="min-h-screen bg-background">
    <header className="border-b border-border bg-card"><div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6"><Leaf className="size-6 text-primary" /><span className="flex-1 font-semibold">FarmGuard AI</span><FarmNav /></div></header>
    <main className="mx-auto max-w-6xl space-y-7 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-semibold uppercase text-primary">Your growing season</p><h1 className="text-3xl font-semibold">Crop tracker</h1></div><Button onClick={() => startEdit(null)}><Plus className="size-4" />Add field</Button></div>
      <div className="grid grid-cols-3 gap-4 border-y border-border py-5">
        {[{ label: "Fields", value: fields.length }, { label: "Growing", value: fields.filter(f => f.harvest_progress < 100).length }, { label: "Harvested", value: fields.filter(f => f.harvest_progress === 100).length }].map(s => <div key={s.label}><p className="text-2xl font-semibold">{s.value}</p><p className="mt-1 text-sm text-muted-foreground">{s.label}</p></div>)}
      </div>
      {!fields.length ? <div className="flex flex-col items-center py-16 text-center"><Sprout className="mb-5 size-12 text-primary" /><h2 className="text-xl font-semibold">Your first field starts here</h2><p className="mt-2 mb-5 text-sm text-muted-foreground">No fields logged yet.</p><Button onClick={() => startEdit(null)}><Plus className="size-4" />Add field</Button></div> : <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {fields.map(f => <article key={f.id} className="flex flex-col rounded-lg border border-border bg-card p-5 shadow-card">
          <div className="mb-4 flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary"><Sprout className="size-5" /></span><div className="min-w-0 flex-1"><h2 className="break-words text-lg font-semibold">{f.field_name}</h2><p className="break-words text-sm text-muted-foreground">{f.crop}{f.area_acres ? ` · ${f.area_acres} acres` : ""}</p></div><Button size="icon" variant="ghost" aria-label={`Edit ${f.field_name}`} title="Edit field" onClick={() => startEdit(f)}><Pencil className="size-4" /></Button></div>
          <p className="mb-3 flex items-start gap-2 text-xs text-muted-foreground"><MapPin className="size-3.5 shrink-0" /><span>{f.location_name}{f.region ? `, ${f.region}` : ""}</span></p>
          <div className="mb-5 space-y-2 text-sm"><p className="flex items-center gap-2"><CalendarDays className="size-4 text-muted-foreground" /><span>Sown {dateLabel(f.sowing_date)}</span></p>{f.expected_harvest_date && <p className="text-muted-foreground">Expected harvest {dateLabel(f.expected_harvest_date)}</p>}</div>
          <div className="mt-auto"><div className="mb-2 flex justify-between text-sm"><span>{f.harvest_progress === 100 ? "Harvest complete" : f.harvest_progress > 0 ? "Harvest in progress" : "Growing"}</span><span className="font-semibold text-primary">{f.harvest_progress}%</span></div><Progress value={f.harvest_progress} className="h-2" /></div>
          {f.notes && <p className="mt-4 line-clamp-3 break-words text-sm text-muted-foreground">{f.notes}</p>}
          <div className="mt-4 flex justify-end border-t border-border pt-2"><Button size="icon" variant="ghost" aria-label={`Delete ${f.field_name}`} title="Delete field" onClick={() => { setError(""); setDeleting(f); }}><Trash2 className="size-4 text-muted-foreground" /></Button></div>
        </article>)}
      </div>}
    </main>
    <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{editing ? "Edit field" : "Add field"}</DialogTitle></DialogHeader>
      <form className="space-y-5" onSubmit={async e => {
        e.preventDefault(); setError("");
        const data = new FormData(e.currentTarget);
        const field = { field_name: String(data.get("field_name")), crop: String(data.get("crop")), sowing_date: String(data.get("sowing_date")), expected_harvest_date: String(data.get("expected_harvest_date")) || null, area_acres: data.get("area_acres") ? Number(data.get("area_acres")) : null, harvest_progress: progress, notes: String(data.get("notes")), location_name: location.name, region: location.region ?? null, country: location.country, latitude: location.latitude, longitude: location.longitude };
        const parsed = cropFieldSchema.safeParse(field);
        if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Please check your field details."); return; }
        setBusy(true);
        try { await save({ data: { ...(editing ? { id: editing.id } : {}), field: parsed.data } }); await client.invalidateQueries({ queryKey: ["crop-fields"] }); setOpen(false); }
        catch (err) { setError(err instanceof Error ? err.message : "Could not save your field."); } finally { setBusy(false); }
      }}>
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="field-name">Field name</Label><Input id="field-name" name="field_name" placeholder="North field" defaultValue={editing?.field_name} maxLength={100} required /></div><div className="space-y-2"><Label htmlFor="crop">Crop</Label><Input id="crop" name="crop" placeholder="Paddy, cotton, maize…" defaultValue={editing?.crop} maxLength={100} required /></div></div>
        <div className="space-y-2"><Label>Field location</Label><p className="text-sm text-primary">{location.name}{location.region ? `, ${location.region}` : ""}</p><LocationSearch active={location} onSelect={setLocation} /></div>
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="sowing-date">Sowing date</Label><Input id="sowing-date" name="sowing_date" type="date" defaultValue={editing?.sowing_date} required /></div><div className="space-y-2"><Label htmlFor="harvest-date">Expected harvest date (optional)</Label><Input id="harvest-date" name="expected_harvest_date" type="date" defaultValue={editing?.expected_harvest_date ?? ""} /></div></div>
        <div className="space-y-2"><Label htmlFor="area">Area in acres (optional)</Label><Input id="area" name="area_acres" type="number" min="0.01" step="0.01" defaultValue={editing?.area_acres ?? ""} /></div>
        <div className="space-y-3"><div className="flex justify-between"><Label htmlFor="harvest-progress">Harvest progress</Label><span className="text-sm font-semibold text-primary">{progress}%</span></div><Slider id="harvest-progress" aria-label="Harvest progress" value={[progress]} onValueChange={v => setProgress(v[0] ?? 0)} min={0} max={100} step={1} /><p className="text-xs text-muted-foreground">{progress === 100 ? "Harvest complete" : progress === 0 ? "Not harvested yet" : `${progress}% of the field harvested`}</p></div>
        <div className="space-y-2"><Label htmlFor="notes">Field notes (optional)</Label><Textarea id="notes" name="notes" defaultValue={editing?.notes} maxLength={2000} placeholder="Variety, irrigation, crop observations…" /></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button><Button disabled={busy}>{busy ? "Saving…" : "Save field"}</Button></div>
      </form>
    </DialogContent></Dialog>
    <AlertDialog open={!!deleting} onOpenChange={v => { if (!v && !busy) setDeleting(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {deleting?.field_name}?</AlertDialogTitle><AlertDialogDescription>This removes the field and its crop record permanently.</AlertDialogDescription></AlertDialogHeader>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><Button variant="destructive" disabled={busy} onClick={async () => {
      if (!deleting) return; setBusy(true); try { await remove({ data: { id: deleting.id } }); await client.invalidateQueries({ queryKey: ["crop-fields"] }); setDeleting(null); } catch (err) { setError(err instanceof Error ? err.message : "Could not delete field."); } finally { setBusy(false); }
    }}>{busy ? "Deleting…" : "Delete field"}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}