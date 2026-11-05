create table if not exists public.lemon_user_data (
    user_id uuid primary key references auth.users (id) on delete cascade,
    data jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now()
);

alter table public.lemon_user_data enable row level security;

grant select, insert, update on public.lemon_user_data to authenticated;

drop policy if exists "Users can read their own Lemon Station data" on public.lemon_user_data;
create policy "Users can read their own Lemon Station data"
    on public.lemon_user_data
    for select
    to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own Lemon Station data" on public.lemon_user_data;
create policy "Users can insert their own Lemon Station data"
    on public.lemon_user_data
    for insert
    to authenticated
    with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own Lemon Station data" on public.lemon_user_data;
create policy "Users can update their own Lemon Station data"
    on public.lemon_user_data
    for update
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
