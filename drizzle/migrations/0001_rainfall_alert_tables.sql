create table public.rainfall_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  field_id uuid not null,
  event_start timestamptz not null,
  predicted_intensity_mm numeric(6,2) not null,
  expected_total_mm numeric(6,2),
  expected_duration_minutes integer,
  rain_probability integer,
  lead_minutes integer not null,
  alert_version integer not null default 1,
  sent_count integer not null default 0,
  last_send_status text,
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (field_id, event_start)
);
create index rainfall_alerts_user_idx on public.rainfall_alerts (user_id);

create table public.rainfall_alert_prefs (
  user_id uuid primary key,
  email_enabled boolean not null default true,
  min_lead_minutes integer not null default 20,
  updated_at timestamptz not null default now()
);

create table public.rainfall_monitor_lock (
  id integer primary key default 1 check (id = 1),
  locked_until timestamptz not null default '1970-01-01'
);
insert into public.rainfall_monitor_lock (id) values (1);

grant select, insert, update, delete on public.rainfall_alerts to authenticated;
grant select, update on public.rainfall_alert_prefs to authenticated;
grant all on public.rainfall_alerts to service_role;
grant all on public.rainfall_alert_prefs to service_role;
grant all on public.rainfall_monitor_lock to service_role;

alter table public.rainfall_alerts enable row level security;
alter table public.rainfall_alert_prefs enable row level security;
alter table public.rainfall_monitor_lock enable row level security;

create policy "Users can view their own rainfall alerts"
  on public.rainfall_alerts for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can read their own alert preferences"
  on public.rainfall_alert_prefs for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own alert preferences"
  on public.rainfall_alert_prefs for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own alert preferences"
  on public.rainfall_alert_prefs for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);