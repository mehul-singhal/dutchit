-- Stores the expense amount converted to INR regardless of group base currency.
-- Null for rows created before this migration.
alter table public.expenses
  add column if not exists true_inr_amount numeric(12, 2) null;
