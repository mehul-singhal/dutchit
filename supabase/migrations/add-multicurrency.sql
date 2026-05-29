-- Dutch It! — Multi-Currency Migration
-- Run this in Supabase SQL Editor
-- Safe to run multiple times (uses IF NOT EXISTS / conditional updates)

-- 1. expenses: add inr_amount and exchange_rate
alter table public.expenses
  add column if not exists inr_amount numeric(10, 2) default null,
  add column if not exists exchange_rate numeric(12, 6) default null;

-- Back-fill existing INR expenses
update public.expenses
  set inr_amount = amount, exchange_rate = 1
  where currency = 'INR' and inr_amount is null;

-- 2. personal_expenses: add currency, inr_amount, exchange_rate
alter table public.personal_expenses
  add column if not exists currency text not null default 'INR',
  add column if not exists inr_amount numeric(10, 2) default null,
  add column if not exists exchange_rate numeric(12, 6) default null;

update public.personal_expenses
  set inr_amount = amount, exchange_rate = 1
  where inr_amount is null;

-- 3. personal_income: add currency, inr_amount, exchange_rate
alter table public.personal_income
  add column if not exists currency text not null default 'INR',
  add column if not exists inr_amount numeric(10, 2) default null,
  add column if not exists exchange_rate numeric(12, 6) default null;

update public.personal_income
  set inr_amount = amount, exchange_rate = 1
  where inr_amount is null;

-- 4. personal_savings: add currency, inr_amount, exchange_rate
alter table public.personal_savings
  add column if not exists currency text not null default 'INR',
  add column if not exists inr_amount numeric(10, 2) default null,
  add column if not exists exchange_rate numeric(12, 6) default null;

update public.personal_savings
  set inr_amount = amount, exchange_rate = 1
  where inr_amount is null;
