-- ============================================================================
-- Niruvi Store — Complete Marketplace Migration & Multi-Tier Schema
-- Migration: 0004_complete_marketplace_migration.sql
-- ============================================================================

-- 1. Ensure required extensions
create extension if not exists "pgcrypto";

-- 2. Update profiles table with clean OAuth and identity support
alter table public.profiles
  add column if not exists website_url text check (website_url is null or website_url ~* '^https://'),
  add column if not exists github_username text,
  add column if not exists gitlab_username text,
  add column if not exists google_email text;

-- 3. Enhance public.apps to match the complete Application Model
alter table public.apps
  add column if not exists short_description text default '' check (char_length(short_description) <= 240),
  add column if not exists website_url text check (website_url is null or website_url ~* '^https://'),
  add column if not exists source_url text check (source_url is null or source_url ~* '^https://'),
  add column if not exists verified boolean not null default false;

-- Sync existing homepage_url and source_repo_url if website_url or source_url are null
update public.apps
set website_url = coalesce(website_url, homepage_url),
    source_url = coalesce(source_url, source_repo_url),
    short_description = coalesce(nullif(short_description, ''), substring(description from 1 for 200))
where website_url is null or source_url is null or short_description = '';

-- Broaden app status constraint to support complete lifecycle
alter table public.apps drop constraint if exists apps_status_check;
alter table public.apps add constraint apps_status_check check (
  status in (
    'draft',
    'pending_review',
    'pending',
    'approved',
    'published',
    'rejected',
    'suspended',
    'archived',
    'taken_down'
  )
);

-- 4. Create / Update app_versions Table (Version / Release Model)
-- Each version belongs to an app and tracks release metadata
alter table public.app_versions
  add column if not exists release_date timestamptz not null default now(),
  add column if not exists status text not null default 'published' check (
    status in ('draft', 'pending_review', 'pending', 'approved', 'published', 'rejected', 'archived')
  ),
  add column if not exists updated_at timestamptz not null default now();

-- Drop asset_url not null constraint on app_versions if app_assets handles multi-assets
alter table public.app_versions alter column asset_url drop not null;
alter table public.app_versions alter column sha256 drop not null;
alter table public.app_versions alter column arch drop not null;

-- 5. Create app_assets Table (Multi-Architecture Binary Assets)
create table if not exists public.app_assets (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.app_versions(id) on delete cascade,
  architecture text not null check (architecture in ('x86_64', 'aarch64', 'armhf')),
  download_url text not null check (download_url ~* '^https://'),
  sha256 text not null check (sha256 ~ '^[a-fA-F0-9]{64}$'),
  file_size bigint check (file_size is null or file_size >= 0),
  filename text not null default '',
  asset_type text not null default 'appimage' check (asset_type in ('appimage', 'checksum', 'signature', 'archive')),
  created_at timestamptz not null default now(),
  unique (version_id, architecture)
);

create index if not exists idx_app_assets_version_id on public.app_assets(version_id);
create index if not exists idx_app_assets_arch on public.app_assets(architecture);

-- Backfill app_assets from existing app_versions if any version has legacy asset_url
insert into public.app_assets (version_id, architecture, download_url, sha256, file_size, filename, asset_type, created_at)
select
  av.id,
  coalesce(av.arch, 'x86_64'),
  av.asset_url,
  av.sha256,
  av.size_bytes,
  substring(av.asset_url from '/([^/]+)$'),
  'appimage',
  av.created_at
from public.app_versions av
where av.asset_url is not null and av.sha256 is not null
on conflict (version_id, architecture) do nothing;

-- 6. Publisher Profiles Table (alias or maintain developer_profiles)
create table if not exists public.publisher_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9._-]{1,63}$'),
  org_name text not null check (char_length(org_name) between 2 and 100),
  org_description text default '' check (char_length(org_description) <= 1000),
  org_website text check (org_website is null or org_website ~* '^https://'),
  source_url text check (source_url is null or source_url ~* '^https://'),
  avatar_url text check (avatar_url is null or avatar_url ~* '^https://'),
  verified boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Sync data between developer_profiles and publisher_profiles if developer_profiles existed
insert into public.publisher_profiles (user_id, slug, org_name, org_description, org_website, source_url, avatar_url, verified, status, rejection_reason, created_at, updated_at)
select user_id, slug, org_name, org_description, org_website, source_url, avatar_url, verified, status, rejection_reason, created_at, updated_at
from public.developer_profiles
on conflict (user_id) do update set
  org_name = excluded.org_name,
  org_description = excluded.org_description,
  org_website = excluded.org_website,
  source_url = excluded.source_url,
  status = excluded.status,
  verified = excluded.verified;

-- 7. Update Library Table
alter table public.library
  add column if not exists app_id uuid references public.apps(id) on delete cascade;

-- 8. Update Downloads Table
alter table public.downloads
  add column if not exists app_id uuid references public.apps(id) on delete set null,
  add column if not exists version_id uuid references public.app_versions(id) on delete set null,
  add column if not exists asset_id uuid references public.app_assets(id) on delete set null;

-- 9. Enable RLS on all tables
alter table public.apps enable row level security;
alter table public.app_versions enable row level security;
alter table public.app_assets enable row level security;
alter table public.publisher_profiles enable row level security;
alter table public.library enable row level security;
alter table public.downloads enable row level security;
alter table public.reviews enable row level security;
alter table public.audit_log enable row level security;

-- 10. Helper function to check role safely
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'user'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (public.current_user_role() = 'admin');
$$;

create or replace function public.is_moderator_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (public.current_user_role() in ('admin', 'moderator'));
$$;

create or replace function public.is_publisher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (public.current_user_role() in ('admin', 'moderator', 'publisher'));
$$;

-- 11. Row Level Security Policies

-- APPS RLS
drop policy if exists "apps_select_public_or_owner" on public.apps;
create policy "apps_select_public_or_owner"
  on public.apps for select
  using (
    status = 'published'
    or publisher_id = auth.uid()
    or public.is_moderator_or_admin()
  );

drop policy if exists "apps_insert_publisher" on public.apps;
create policy "apps_insert_publisher"
  on public.apps for insert
  with check (
    auth.uid() = publisher_id
    and (public.is_publisher() or public.is_moderator_or_admin())
    and status in ('draft', 'pending_review')
  );

drop policy if exists "apps_update_owner_or_staff" on public.apps;
create policy "apps_update_owner_or_staff"
  on public.apps for update
  using (
    publisher_id = auth.uid()
    or public.is_moderator_or_admin()
  )
  with check (
    (
      publisher_id = auth.uid()
      and not public.is_moderator_or_admin()
      and status in ('draft', 'pending_review')
      and verified = false
    )
    or public.is_moderator_or_admin()
  );

drop policy if exists "apps_delete_admin" on public.apps;
create policy "apps_delete_admin"
  on public.apps for delete
  using (public.is_admin());

-- APP_VERSIONS RLS
drop policy if exists "app_versions_select" on public.app_versions;
create policy "app_versions_select"
  on public.app_versions for select
  using (
    status = 'published'
    or exists (
      select 1 from public.apps a
      where a.id = app_id
        and (a.publisher_id = auth.uid() or public.is_moderator_or_admin())
    )
  );

drop policy if exists "app_versions_insert_owner" on public.app_versions;
create policy "app_versions_insert_owner"
  on public.app_versions for insert
  with check (
    exists (
      select 1 from public.apps a
      where a.id = app_id
        and (a.publisher_id = auth.uid() or public.is_moderator_or_admin())
    )
  );

drop policy if exists "app_versions_update_owner_or_staff" on public.app_versions;
create policy "app_versions_update_owner_or_staff"
  on public.app_versions for update
  using (
    exists (
      select 1 from public.apps a
      where a.id = app_id
        and (a.publisher_id = auth.uid() or public.is_moderator_or_admin())
    )
  );

-- APP_ASSETS RLS
drop policy if exists "app_assets_select" on public.app_assets;
create policy "app_assets_select"
  on public.app_assets for select
  using (
    exists (
      select 1 from public.app_versions av
      join public.apps a on a.id = av.app_id
      where av.id = version_id
        and (
          (a.status = 'published' and av.status = 'published')
          or a.publisher_id = auth.uid()
          or public.is_moderator_or_admin()
        )
    )
  );

drop policy if exists "app_assets_insert_owner" on public.app_assets;
create policy "app_assets_insert_owner"
  on public.app_assets for insert
  with check (
    exists (
      select 1 from public.app_versions av
      join public.apps a on a.id = av.app_id
      where av.id = version_id
        and (a.publisher_id = auth.uid() or public.is_moderator_or_admin())
    )
  );

drop policy if exists "app_assets_update_owner" on public.app_assets;
create policy "app_assets_update_owner"
  on public.app_assets for update
  using (
    exists (
      select 1 from public.app_versions av
      join public.apps a on a.id = av.app_id
      where av.id = version_id
        and (a.publisher_id = auth.uid() or public.is_moderator_or_admin())
    )
  );

-- PUBLISHER_PROFILES RLS
drop policy if exists "publisher_profiles_select" on public.publisher_profiles;
create policy "publisher_profiles_select"
  on public.publisher_profiles for select
  using (
    status = 'approved'
    or auth.uid() = user_id
    or public.is_moderator_or_admin()
  );

drop policy if exists "publisher_profiles_insert" on public.publisher_profiles;
create policy "publisher_profiles_insert"
  on public.publisher_profiles for insert
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and verified = false
  );

drop policy if exists "publisher_profiles_update" on public.publisher_profiles;
create policy "publisher_profiles_update"
  on public.publisher_profiles for update
  using (
    auth.uid() = user_id
    or public.is_moderator_or_admin()
  )
  with check (
    (
      auth.uid() = user_id
      and not public.is_moderator_or_admin()
      and status = 'pending'
      and verified = false
    )
    or public.is_moderator_or_admin()
  );
