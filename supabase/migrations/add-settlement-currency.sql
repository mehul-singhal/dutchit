alter table public.groups
  add column if not exists settlement_currency text not null default 'INR';
