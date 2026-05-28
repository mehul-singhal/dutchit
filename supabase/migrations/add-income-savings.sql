-- Dutch It! — Income & Savings Migration
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- This is safe to run multiple times (uses IF NOT EXISTS / IF NOT EXISTS guards)

-- 1. New enum types
do $$ begin
  create type expense_funding_source as enum ('income', 'savings');
exception when duplicate_object then null; end $$;

do $$ begin
  create type income_source as enum ('salary', 'freelance', 'rental', 'investment', 'gift', 'other');
exception when duplicate_object then null; end $$;

-- 2. Add paid_from column to personal_expenses
alter table public.personal_expenses
  add column if not exists paid_from expense_funding_source default null;

-- 3. Personal income table
create table if not exists public.personal_income (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  source income_source not null default 'salary',
  title text not null,
  amount numeric(10, 2) not null check (amount > 0),
  month integer not null check (month >= 1 and month <= 12),
  year integer not null check (year >= 2020),
  notes text,
  created_at timestamptz default now() not null
);

create index if not exists idx_personal_income_user_id on public.personal_income(user_id);
create index if not exists idx_personal_income_user_month on public.personal_income(user_id, year, month);

-- 4. Personal savings table
create table if not exists public.personal_savings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  amount numeric(10, 2) not null check (amount > 0),
  date date not null,
  notes text,
  created_at timestamptz default now() not null
);

create index if not exists idx_personal_savings_user_id on public.personal_savings(user_id);
create index if not exists idx_personal_savings_user_date on public.personal_savings(user_id, date);

-- 5. Personal finance settings (savings goal)
create table if not exists public.personal_finance_settings (
  user_id uuid references public.users(id) on delete cascade primary key,
  monthly_savings_goal numeric(10, 2) default null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 6. Enable RLS
alter table public.personal_income enable row level security;
alter table public.personal_savings enable row level security;
alter table public.personal_finance_settings enable row level security;

-- 7. RLS policies
create policy "Users can manage their own income"
  on public.personal_income for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can manage their own savings"
  on public.personal_savings for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can manage their own finance settings"
  on public.personal_finance_settings for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
