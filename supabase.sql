create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  currency text not null default 'USD',
  display_name text,
  avatar_path text,
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar_path text;

alter table public.profiles enable row level security;

drop policy if exists "Users read their own profile" on public.profiles;
create policy "Users read their own profile"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users insert their own profile" on public.profiles;
create policy "Users insert their own profile"
on public.profiles for insert
with check (auth.uid() = id);

create table if not exists public.transactions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount numeric(12,2) not null check (amount > 0),
  description text not null,
  category text not null,
  date date not null,
  currency text not null default 'USD',
  created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;

drop policy if exists "Users read their own transactions" on public.transactions;
create policy "Users read their own transactions"
on public.transactions for select
using (auth.uid() = user_id);

drop policy if exists "Users insert their own transactions" on public.transactions;
create policy "Users insert their own transactions"
on public.transactions for insert
with check (auth.uid() = user_id);

drop policy if exists "Users update their own transactions" on public.transactions;
create policy "Users update their own transactions"
on public.transactions for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users delete their own transactions" on public.transactions;
create policy "Users delete their own transactions"
on public.transactions for delete
using (auth.uid() = user_id);

create index if not exists transactions_user_date_idx
on public.transactions (user_id, date desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = 2097152,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Users read their own profile photos" on storage.objects;
create policy "Users read their own profile photos"
on storage.objects for select to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users upload their own profile photos" on storage.objects;
create policy "Users upload their own profile photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users update their own profile photos" on storage.objects;
create policy "Users update their own profile photos"
on storage.objects for update to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users delete their own profile photos" on storage.objects;
create policy "Users delete their own profile photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
