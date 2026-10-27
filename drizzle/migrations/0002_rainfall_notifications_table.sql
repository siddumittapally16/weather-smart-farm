create table public.rainfall_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  alert_id uuid not null,
  field_name text not null,
  crop text not null,
  location_name text not null,
  event_start timestamptz not null,
  lead_minutes integer not null,
  intensity_mm numeric(6,2) not null,
  message text not null,
  seen_at timestamptz,
  created_at timestamptz not null default now()
);
create index rainfall_notifications_user_idx on public.rainfall_notifications (user_id, created_at desc);

alter table public.rainfall_alert_prefs add column notify_in_app boolean not null default true;

grant select, update on public.rainfall_notifications to authenticated;
grant all on public.rainfall_notifications to service_role;

alter table public.rainfall_notifications enable row level security;

create policy "Users can view their own rain notifications"
  on public.rainfall_notifications for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can mark their own rain notifications seen"
  on public.rainfall_notifications for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);