-- Add base_currency to groups table
-- Safe to run multiple times
alter table public.groups
  add column if not exists base_currency text not null default 'INR';
