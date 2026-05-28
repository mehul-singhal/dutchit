-- DutchIt Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- USERS (extends auth.users)
-- ============================================================
create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  avatar_url text,
  upi_id text,
  onboarding_complete boolean default false not null,
  created_at timestamptz default now() not null
);

comment on table public.users is 'Extended user profiles for DutchIt';

-- ============================================================
-- GROUPS
-- ============================================================
create type group_category as enum ('trip', 'home', 'couple', 'friends', 'work', 'other');

create table if not exists public.groups (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  category group_category not null default 'other',
  description text,
  created_by uuid references public.users(id) on delete set null,
  invite_code text unique default encode(gen_random_bytes(6), 'hex') not null,
  archived boolean default false not null,
  created_at timestamptz default now() not null
);

-- ============================================================
-- GROUP MEMBERS
-- ============================================================
create type member_role as enum ('admin', 'member');

create table if not exists public.group_members (
  id uuid default uuid_generate_v4() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  role member_role default 'member' not null,
  joined_at timestamptz default now() not null,
  unique(group_id, user_id)
);

-- ============================================================
-- EXPENSES
-- ============================================================
create type expense_category as enum ('food', 'travel', 'accommodation', 'entertainment', 'shopping', 'utilities', 'other');

create table if not exists public.expenses (
  id uuid default uuid_generate_v4() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  title text not null,
  amount numeric(10, 2) not null check (amount > 0),
  currency text default 'INR' not null,
  paid_by uuid references public.users(id) on delete set null not null,
  category expense_category default 'other' not null,
  date date not null,
  notes text,
  receipt_url text,
  created_by uuid references public.users(id) on delete set null not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ============================================================
-- EXPENSE SPLITS
-- ============================================================
create type split_type as enum ('equal', 'exact', 'percentage', 'shares', 'adjustment', 'settle');

create table if not exists public.expense_splits (
  id uuid default uuid_generate_v4() primary key,
  expense_id uuid references public.expenses(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  split_type split_type not null,
  amount numeric(10, 2) not null,
  percentage numeric(5, 2),
  shares numeric(5, 2),
  adjusted_amount numeric(10, 2),
  unique(expense_id, user_id)
);

-- ============================================================
-- SETTLEMENTS
-- ============================================================
create type settlement_status as enum ('pending_confirmation', 'confirmed', 'disputed');

create table if not exists public.settlements (
  id uuid default uuid_generate_v4() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  paid_by uuid references public.users(id) on delete set null not null,
  paid_to uuid references public.users(id) on delete set null not null,
  amount numeric(10, 2) not null check (amount > 0),
  upi_ref text,
  payment_app text,
  status settlement_status default 'pending_confirmation' not null,
  created_at timestamptz default now() not null,
  confirmed_at timestamptz
);

-- ============================================================
-- PERSONAL EXPENSES
-- ============================================================
create table if not exists public.personal_expenses (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  amount numeric(10, 2) not null check (amount > 0),
  category expense_category default 'other' not null,
  date date not null,
  notes text,
  created_at timestamptz default now() not null
);

-- ============================================================
-- BUDGETS
-- ============================================================
create table if not exists public.budgets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  category expense_category not null,
  amount numeric(10, 2) not null check (amount > 0),
  month integer not null check (month >= 1 and month <= 12),
  year integer not null check (year >= 2020),
  unique(user_id, category, month, year)
);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_expenses_updated
  before update on public.expenses
  for each row execute procedure public.handle_updated_at();

-- ============================================================
-- NEW USER TRIGGER (auto-create profile)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_group_members_group_id on public.group_members(group_id);
create index if not exists idx_group_members_user_id on public.group_members(user_id);
create index if not exists idx_expenses_group_id on public.expenses(group_id);
create index if not exists idx_expenses_paid_by on public.expenses(paid_by);
create index if not exists idx_expense_splits_expense_id on public.expense_splits(expense_id);
create index if not exists idx_expense_splits_user_id on public.expense_splits(user_id);
create index if not exists idx_settlements_group_id on public.settlements(group_id);
create index if not exists idx_settlements_paid_by on public.settlements(paid_by);
create index if not exists idx_settlements_paid_to on public.settlements(paid_to);
create index if not exists idx_personal_expenses_user_id on public.personal_expenses(user_id);
create index if not exists idx_budgets_user_id on public.budgets(user_id);

-- ============================================================
-- REALTIME (enable for activity feeds)
-- ============================================================
alter publication supabase_realtime add table public.expenses;
alter publication supabase_realtime add table public.expense_splits;
alter publication supabase_realtime add table public.settlements;
alter publication supabase_realtime add table public.group_members;
