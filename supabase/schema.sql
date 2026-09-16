create extension if not exists pgcrypto;

create table if not exists public.portfolio_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on public.portfolio_settings;
create trigger set_updated_at
before update on public.portfolio_settings
for each row
execute procedure public.update_updated_at_column();

alter table public.portfolio_settings enable row level security;

create policy "public can read portfolio settings"
on public.portfolio_settings
for select
using (true);

create policy "authenticated users can insert portfolio settings"
on public.portfolio_settings
for insert
with check (auth.role() = 'authenticated');

create policy "authenticated users can update portfolio settings"
on public.portfolio_settings
for update
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "authenticated users can delete portfolio settings"
on public.portfolio_settings
for delete
using (auth.role() = 'authenticated');
