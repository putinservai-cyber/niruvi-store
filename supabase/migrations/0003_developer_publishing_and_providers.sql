-- ============================================================================
-- Niruvi Store — Developer Center, Multi-Version Releases & Provider Health
-- Migration: 0003_developer_publishing_and_providers.sql
-- ============================================================================

-- 1. DEVELOPER PROFILES & PUBLISHER REQUESTS
-- Stores public publisher metadata separately from private payout/contact email.
create table if not exists public.developer_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9._-]{1,63}$'),
  org_name text not null check (char_length(org_name) between 2 and 100),
  org_description text default '' check (char_length(org_description) <= 1000),
  org_website text check (org_website is null or org_website ~* '^https://'),
  source_url text check (source_url is null or source_url ~* '^https://'),
  avatar_url text check (avatar_url is null or avatar_url ~* '^https://'),
  verified boolean not null default false,
  status text not null default 'pending' check (
    status in ('pending', 'approved', 'rejected')
  ),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Private developer settings (never readable by public users; only owner and admin)
create table if not exists public.developer_private_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  payout_email text check (payout_email is null or char_length(payout_email) <= 160),
  release_webhook_url text check (release_webhook_url is null or release_webhook_url ~* '^https://'),
  updated_at timestamptz not null default now()
);

-- Enhance public.apps with provider/source tracking and rejection reason
alter table public.apps
  add column if not exists icon_url text,
  add column if not exists screenshots jsonb default '[]'::jsonb,
  add column if not exists provider_id text default 'community',
  add column if not exists release_source text default 'direct',
  add column if not exists availability_status text default 'available' check (
    availability_status in ('available', 'upstream_only', 'temporarily_unavailable', 'removed', 'unknown')
  ),
  add column if not exists rejection_reason text;

-- Enhance public.app_versions with upstream release URL and optional checksum status
alter table public.app_versions
  add column if not exists upstream_release_url text check (
    upstream_release_url is null or upstream_release_url ~* '^https://'
  ),
  add column if not exists checksum_verified boolean not null default false,
  add column if not exists availability_status text not null default 'available' check (
    availability_status in ('available', 'temporarily_unavailable', 'removed', 'unknown')
  );

-- Provider configuration & synchronization status table (admin-managed)
create table if not exists public.catalog_providers (
  id text primary key check (id in ('appimagehub', 'github', 'gitlab', 'sourceforge', 'community')),
  name text not null,
  enabled boolean not null default true,
  description text not null default '',
  status text not null default 'healthy' check (
    status in ('healthy', 'degraded', 'configuration_required', 'disabled', 'error')
  ),
  last_successful_sync timestamptz,
  last_attempted_sync timestamptz,
  imported_count integer not null default 0,
  updated_count integer not null default 0,
  failed_count integer not null default 0,
  last_error text,
  updated_at timestamptz not null default now()
);

insert into public.catalog_providers (id, name, enabled, description, status)
values
  ('appimagehub', 'AppImageHub', true, 'Upstream AppImageHub community catalog metadata feed', 'healthy'),
  ('github', 'GitHub Releases', true, 'Official GitHub Releases assets and SHA-256 digests', 'healthy'),
  ('gitlab', 'GitLab Releases', true, 'GitLab project releases and portable Linux binaries', 'healthy'),
  ('sourceforge', 'SourceForge', false, 'SourceForge release mirrors (disabled by default)', 'disabled'),
  ('community', 'Community Submissions', true, 'Moderated developer and community AppImage submissions', 'healthy')
on conflict (id) do nothing;

-- Enable RLS on new tables
alter table public.developer_profiles enable row level security;
alter table public.developer_private_settings enable row level security;
alter table public.catalog_providers enable row level security;

-- Public can view approved developer profiles; owners and staff can view their own pending/rejected profile
create policy "developer_profiles_select_public_or_own"
  on public.developer_profiles for select
  using (status = 'approved' or auth.uid() = user_id or public.is_moderator_or_admin());

create policy "developer_profiles_insert_own"
  on public.developer_profiles for insert
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and verified = false
  );

create policy "developer_profiles_update_own_or_staff"
  on public.developer_profiles for update
  using (auth.uid() = user_id or public.is_moderator_or_admin())
  with check (auth.uid() = user_id or public.is_moderator_or_admin());

-- Private developer settings: strictly owner or admin (never public)
create policy "developer_private_select_own_or_admin"
  on public.developer_private_settings for select
  using (auth.uid() = user_id or public.is_admin());

create policy "developer_private_upsert_own"
  on public.developer_private_settings for insert
  with check (auth.uid() = user_id);

create policy "developer_private_update_own"
  on public.developer_private_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Catalog providers: readable by staff, updatable by admin only
create policy "catalog_providers_select_staff"
  on public.catalog_providers for select
  using (public.is_moderator_or_admin());

create policy "catalog_providers_update_admin"
  on public.catalog_providers for update
  using (public.is_admin())
  with check (public.is_admin());
