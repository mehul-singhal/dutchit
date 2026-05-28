-- DutchIt Row Level Security Policies
-- Run this AFTER schema.sql in Supabase SQL Editor

-- ============================================================
-- ENABLE RLS on all tables
-- ============================================================
alter table public.users enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;
alter table public.settlements enable row level security;
alter table public.personal_expenses enable row level security;
alter table public.budgets enable row level security;

-- ============================================================
-- USERS policies
-- ============================================================
create policy "Users can view their own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id);

-- Users can view profiles of people in their groups
create policy "Users can view group members profiles"
  on public.users for select
  using (
    id in (
      select gm.user_id from public.group_members gm
      where gm.group_id in (
        select group_id from public.group_members
        where user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- GROUPS policies
-- ============================================================
create policy "Group members can view groups"
  on public.groups for select
  using (
    id in (
      select group_id from public.group_members
      where user_id = auth.uid()
    )
  );

create policy "Authenticated users can create groups"
  on public.groups for insert
  with check (auth.uid() = created_by);

create policy "Group admins can update groups"
  on public.groups for update
  using (
    id in (
      select group_id from public.group_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

create policy "Group admins can delete groups"
  on public.groups for delete
  using (auth.uid() = created_by);

-- Allow joining via invite code (anyone with valid code)
create policy "Anyone can view group by invite code for joining"
  on public.groups for select
  using (true);

-- ============================================================
-- GROUP MEMBERS helper functions (security definer to avoid RLS recursion)
-- ============================================================
create or replace function public.is_group_member(gid uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

create or replace function public.is_group_admin(gid uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================
-- GROUP MEMBERS policies
-- ============================================================
create policy "Members can view group membership"
  on public.group_members for select
  using (public.is_group_member(group_id));

create policy "Group admins can add members"
  on public.group_members for insert
  with check (
    auth.uid() = user_id
    or public.is_group_admin(group_id)
  );

create policy "Group admins can update member roles"
  on public.group_members for update
  using (public.is_group_admin(group_id));

create policy "Members can remove themselves or admins can remove members"
  on public.group_members for delete
  using (
    user_id = auth.uid()
    or public.is_group_admin(group_id)
  );

-- ============================================================
-- EXPENSES policies
-- ============================================================
create policy "Group members can view expenses"
  on public.expenses for select
  using (
    group_id in (
      select group_id from public.group_members
      where user_id = auth.uid()
    )
  );

create policy "Group members can create expenses"
  on public.expenses for insert
  with check (
    auth.uid() = created_by
    and group_id in (
      select group_id from public.group_members
      where user_id = auth.uid()
    )
  );

create policy "Expense creator or group admin can update expenses"
  on public.expenses for update
  using (
    created_by = auth.uid()
    or group_id in (
      select group_id from public.group_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

create policy "Expense creator or group admin can delete expenses"
  on public.expenses for delete
  using (
    created_by = auth.uid()
    or group_id in (
      select group_id from public.group_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- ============================================================
-- EXPENSE SPLITS policies
-- ============================================================
create policy "Group members can view expense splits"
  on public.expense_splits for select
  using (
    expense_id in (
      select id from public.expenses
      where group_id in (
        select group_id from public.group_members
        where user_id = auth.uid()
      )
    )
  );

create policy "Group members can create expense splits"
  on public.expense_splits for insert
  with check (
    expense_id in (
      select id from public.expenses
      where group_id in (
        select group_id from public.group_members
        where user_id = auth.uid()
      )
    )
  );

create policy "Expense creator can update splits"
  on public.expense_splits for update
  using (
    expense_id in (
      select id from public.expenses
      where created_by = auth.uid()
    )
  );

create policy "Expense creator can delete splits"
  on public.expense_splits for delete
  using (
    expense_id in (
      select id from public.expenses
      where created_by = auth.uid()
    )
  );

-- ============================================================
-- SETTLEMENTS policies
-- ============================================================
create policy "Group members can view settlements"
  on public.settlements for select
  using (
    group_id in (
      select group_id from public.group_members
      where user_id = auth.uid()
    )
  );

create policy "Payer can create settlements"
  on public.settlements for insert
  with check (
    auth.uid() = paid_by
    and group_id in (
      select group_id from public.group_members
      where user_id = auth.uid()
    )
  );

create policy "Payer or recipient can update settlement status"
  on public.settlements for update
  using (paid_by = auth.uid() or paid_to = auth.uid());

-- ============================================================
-- PERSONAL EXPENSES policies
-- ============================================================
create policy "Users can manage their own personal expenses"
  on public.personal_expenses for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================
-- BUDGETS policies
-- ============================================================
create policy "Users can manage their own budgets"
  on public.budgets for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================
-- STORAGE: Receipts bucket policies
-- Set up the bucket manually in Supabase dashboard first:
-- Storage > New Bucket > "receipts" > Public
-- ============================================================
-- Run these after creating the receipts bucket:

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

create policy "Anyone can view receipts"
  on storage.objects for select
  using (bucket_id = 'receipts');

create policy "Authenticated users can upload receipts"
  on storage.objects for insert
  with check (
    bucket_id = 'receipts'
    and auth.role() = 'authenticated'
  );

create policy "Users can update their own receipts"
  on storage.objects for update
  using (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own receipts"
  on storage.objects for delete
  using (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- AVATARS bucket
-- ============================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Anyone can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
