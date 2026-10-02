-- ============================================================================
-- Niruvi Store — Phase 2 Supabase Postgres Schema & Row Level Security (RLS)
-- Migration: 0001_accounts_and_marketplace_rls.sql
--
-- Tables:
--   1. public.profiles      (user, publisher, moderator, admin)
--   2. public.apps          (Linux AppImage listings; binaries hosted on GitHub Releases)
--   3. public.app_versions  (Direct .AppImage asset URLs + SHA-256 per architecture)
--   4. public.reviews       (1–5 star ratings & reviews per user/app)
--   5. public.library       (Saved/bookmarked apps & update notification preferences)
--   6. public.downloads     (Anonymous & authenticated download history)
--   7. public.reports       (Community moderation reports)
--   8. public.audit_log     (Immutable log for every moderation or role action)
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. PROFILES TABLE (Roles stored in DB; never trust client-supplied role)
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text unique check (username is null or username ~ '^[a-zA-Z0-9_]{3,24}$'),
  display_name text not null default 'Linux User',
  avatar_url text,
  bio text default '' check (char_length(bio) <= 500),
  website_url text check (website_url is null or website_url ~* '^https://'),
  github_username text,
  auth_provider text default 'oauth',
  role text not null default 'user' check (role in ('user', 'publisher', 'moderator', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_username on public.profiles(lower(username));

-- ============================================================================
-- 2. APPS TABLE
-- ============================================================================
create table if not exists public.apps (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9._-]{1,63}$'),
  name text not null check (char_length(name) between 1 and 100),
  description text not null default '' check (char_length(description) <= 4000),
  category text not null,
  license text not null default 'Open Source' check (char_length(license) <= 80),
  homepage_url text check (homepage_url is null or homepage_url ~* '^https://'),
  source_repo_url text check (source_repo_url is null or source_repo_url ~* '^https://'),
  publisher_id uuid references public.profiles(id) on delete set null,
  status text not null default 'draft' check (
    status in ('draft', 'pending', 'published', 'rejected', 'taken_down')
  ),
  trust_tier text not null default 'unverified' check (
    trust_tier in ('publisher_verified', 'checksum_verified', 'unverified')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_apps_status on public.apps(status);
create index if not exists idx_apps_publisher_id on public.apps(publisher_id);
create index if not exists idx_apps_category on public.apps(category);

-- ============================================================================
-- 3. APP_VERSIONS TABLE (Direct .AppImage URL + 64-char hex SHA-256)
-- ============================================================================
create table if not exists public.app_versions (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps(id) on delete cascade,
  version text not null check (
    char_length(version) between 1 and 48
    and lower(version) not in ('latest', 'vlatest', 'unknown')
  ),
  asset_url text not null check (asset_url ~* '^https://.+\.appimage$'),
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  sha256 text not null check (sha256 ~ '^[a-fA-F0-9]{64}$'),
  arch text not null check (arch in ('x86_64', 'aarch64', 'armhf')),
  release_notes text default '',
  scan_status text not null default 'pending' check (
    scan_status in ('pending', 'clean', 'flagged', 'failed')
  ),
  created_at timestamptz not null default now(),
  unique (app_id, version, arch)
);

create index if not exists idx_app_versions_app_id on public.app_versions(app_id);

-- ============================================================================
-- 4. REVIEWS TABLE
-- ============================================================================
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  title text default '' check (char_length(title) <= 120),
  body text not null default '' check (char_length(body) <= 2000),
  distro text default '' check (char_length(distro) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (app_id, user_id)
);

create index if not exists idx_reviews_app_id on public.reviews(app_id);
create index if not exists idx_reviews_user_id on public.reviews(user_id);

-- ============================================================================
-- 5. LIBRARY TABLE (Saved apps & update notifications for signed-in users)
-- ============================================================================
create table if not exists public.library (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  app_id uuid references public.apps(id) on delete cascade,
  app_slug text not null,
  pinned_version text,
  notify_updates boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, app_slug)
);

create index if not exists idx_library_user_id on public.library(user_id);

-- ============================================================================
-- 6. DOWNLOADS TABLE (Anonymous & authenticated download tracking)
-- ============================================================================
create table if not exists public.downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  app_id uuid references public.apps(id) on delete cascade,
  app_version_id uuid references public.app_versions(id) on delete set null,
  app_slug text not null,
  version text,
  arch text not null default 'x86_64' check (arch in ('x86_64', 'aarch64', 'armhf')),
  created_at timestamptz not null default now()
);

create index if not exists idx_downloads_user_id on public.downloads(user_id);
create index if not exists idx_downloads_app_slug on public.downloads(app_slug);

-- ============================================================================
-- 7. REPORTS TABLE
-- ============================================================================
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  app_id uuid references public.apps(id) on delete cascade,
  app_slug text not null,
  reporter_id uuid references public.profiles(id) on delete set null,
  reason text not null check (char_length(reason) between 2 and 120),
  details text not null check (char_length(details) between 5 and 2000),
  status text not null default 'open' check (
    status in ('open', 'investigating', 'resolved', 'dismissed')
  ),
  resolved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_reports_status on public.reports(status);

-- ============================================================================
-- 8. AUDIT_LOG TABLE (Every moderation or role change creates an audit row)
-- ============================================================================
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role text not null,
  action text not null,
  target_type text not null check (
    target_type in ('app', 'app_version', 'profile', 'report', 'review')
  ),
  target_id text not null,
  previous_state jsonb,
  new_state jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_log_created_at on public.audit_log(created_at desc);

-- ============================================================================
-- HELPER FUNCTIONS FOR SERVER-AUTHORITATIVE RBAC
-- ============================================================================
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.role from public.profiles p where p.id = auth.uid()),
    'user'
  );
$$;

create or replace function public.is_moderator_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('moderator', 'admin');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'admin';
$$;

-- ============================================================================
-- AUTOMATIC PROFILE PROVISIONING ON OAUTH SIGN-IN (GitHub / Google PKCE)
-- ============================================================================
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_username text;
  clean_username text;
  display text;
  avatar text;
  provider text;
begin
  raw_username := coalesce(
    new.raw_user_meta_data->>'user_name',
    new.raw_user_meta_data->>'preferred_username',
    split_part(coalesce(new.email, 'linux_user'), '@', 1)
  );
  clean_username := regexp_replace(lower(raw_username), '[^a-z0-9_]', '_', 'g');
  clean_username := substring(clean_username from 1 for 20);
  if char_length(clean_username) < 3 then
    clean_username := 'user_' || substring(replace(new.id::text, '-', '') from 1 for 6);
  end if;

  if exists (select 1 from public.profiles where lower(username) = lower(clean_username)) then
    clean_username := substring(clean_username from 1 for 18) || '_' || substring(replace(new.id::text, '-', '') from 1 for 4);
  end if;

  display := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    clean_username
  );
  avatar := new.raw_user_meta_data->>'avatar_url';
  provider := coalesce(new.raw_app_meta_data->>'provider', 'oauth');

  insert into public.profiles (
    id, email, username, display_name, avatar_url, github_username, auth_provider, role
  )
  values (
    new.id,
    new.email,
    clean_username,
    display,
    avatar,
    case when provider = 'github' then raw_username else null end,
    provider,
    'user' -- Always 'user' on creation; never trust client metadata for role
  )
  on conflict (id) do update
    set email = excluded.email,
        avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ============================================================================
-- ROLE ESCALATION GUARD & MODERATION AUDIT LOG TRIGGERS
-- ============================================================================
create or replace function public.guard_profile_updates_and_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
begin
  new.updated_at := now();
  caller_role := public.current_user_role();

  if new.role is distinct from old.role then
    -- Only admins (or moderators promoting 'user' -> 'publisher') may change roles
    if caller_role = 'admin' then
      null;
    elsif caller_role = 'moderator' and old.role = 'user' and new.role = 'publisher' then
      null;
    else
      raise exception 'Forbidden: only moderators or admins may change user roles.';
    end if;

    insert into public.audit_log (
      actor_id, actor_role, action, target_type, target_id, previous_state, new_state
    ) values (
      auth.uid(),
      caller_role,
      'role_changed',
      'profile',
      new.id::text,
      jsonb_build_object('role', old.role),
      jsonb_build_object('role', new.role)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_profile_updates on public.profiles;
create trigger trg_guard_profile_updates
  before update on public.profiles
  for each row execute function public.guard_profile_updates_and_audit();

create or replace function public.guard_app_moderation_and_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
begin
  new.updated_at := now();
  caller_role := public.current_user_role();

  -- Publishers can only move their own app between 'draft' and 'pending'
  if (new.status is distinct from old.status or new.trust_tier is distinct from old.trust_tier) then
    if caller_role not in ('moderator', 'admin') then
      if new.trust_tier is distinct from old.trust_tier then
        raise exception 'Forbidden: only moderators or admins may change trust_tier.';
      end if;
      if new.status not in ('draft', 'pending') then
        raise exception 'Forbidden: only moderators or admins may publish, reject, or take down apps.';
      end if;
    else
      insert into public.audit_log (
        actor_id, actor_role, action, target_type, target_id, previous_state, new_state
      ) values (
        auth.uid(),
        caller_role,
        'app_moderation_update',
        'app',
        new.id::text,
        jsonb_build_object('status', old.status, 'trust_tier', old.trust_tier),
        jsonb_build_object('status', new.status, 'trust_tier', new.trust_tier)
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_app_moderation on public.apps;
create trigger trg_guard_app_moderation
  before update on public.apps
  for each row execute function public.guard_app_moderation_and_audit();

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY (RLS) ON EVERY TABLE
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.apps enable row level security;
alter table public.app_versions enable row level security;
alter table public.reviews enable row level security;
alter table public.library enable row level security;
alter table public.downloads enable row level security;
alter table public.reports enable row level security;
alter table public.audit_log enable row level security;

-- 1. PROFILES POLICIES
create policy "profiles_select_public"
  on public.profiles for select
  using (true);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id and role = 'user');

create policy "profiles_update_own_or_moderator"
  on public.profiles for update
  using (auth.uid() = id or public.is_moderator_or_admin())
  with check (auth.uid() = id or public.is_moderator_or_admin());

-- 2. APPS POLICIES
create policy "apps_select_published_or_own_or_staff"
  on public.apps for select
  using (
    status = 'published'
    or publisher_id = auth.uid()
    or public.is_moderator_or_admin()
  );

create policy "apps_insert_publisher"
  on public.apps for insert
  with check (
    auth.uid() = publisher_id
    and public.current_user_role() in ('publisher', 'moderator', 'admin')
    and status in ('draft', 'pending')
    and trust_tier = 'unverified'
  );

create policy "apps_update_own_or_staff"
  on public.apps for update
  using (publisher_id = auth.uid() or public.is_moderator_or_admin())
  with check (publisher_id = auth.uid() or public.is_moderator_or_admin());

create policy "apps_delete_admin_only"
  on public.apps for delete
  using (public.is_admin());

-- 3. APP_VERSIONS POLICIES
create policy "app_versions_select_visible_apps"
  on public.app_versions for select
  using (
    exists (
      select 1 from public.apps a
      where a.id = app_versions.app_id
        and (
          a.status = 'published'
          or a.publisher_id = auth.uid()
          or public.is_moderator_or_admin()
        )
    )
  );

create policy "app_versions_insert_publisher_or_staff"
  on public.app_versions for insert
  with check (
    exists (
      select 1 from public.apps a
      where a.id = app_versions.app_id
        and (a.publisher_id = auth.uid() or public.is_moderator_or_admin())
    )
  );

create policy "app_versions_update_publisher_or_staff"
  on public.app_versions for update
  using (
    exists (
      select 1 from public.apps a
      where a.id = app_versions.app_id
        and (a.publisher_id = auth.uid() or public.is_moderator_or_admin())
    )
  );

-- 4. REVIEWS POLICIES
create policy "reviews_select_public"
  on public.reviews for select
  using (true);

create policy "reviews_insert_own"
  on public.reviews for insert
  with check (auth.uid() = user_id);

create policy "reviews_update_own"
  on public.reviews for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "reviews_delete_own_or_staff"
  on public.reviews for delete
  using (auth.uid() = user_id or public.is_moderator_or_admin());

-- 5. LIBRARY POLICIES
create policy "library_select_own"
  on public.library for select
  using (auth.uid() = user_id);

create policy "library_insert_own"
  on public.library for insert
  with check (auth.uid() = user_id);

create policy "library_update_own"
  on public.library for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "library_delete_own"
  on public.library for delete
  using (auth.uid() = user_id);

-- 6. DOWNLOADS POLICIES (Anonymous downloads allowed; users read own history)
create policy "downloads_insert_anon_or_own"
  on public.downloads for insert
  with check (user_id is null or auth.uid() = user_id);

create policy "downloads_select_own_or_staff"
  on public.downloads for select
  using (auth.uid() = user_id or public.is_moderator_or_admin());

-- 7. REPORTS POLICIES
create policy "reports_insert_authenticated_or_anon"
  on public.reports for insert
  with check (reporter_id is null or auth.uid() = reporter_id);

create policy "reports_select_own_or_staff"
  on public.reports for select
  using (auth.uid() = reporter_id or public.is_moderator_or_admin());

create policy "reports_update_staff_only"
  on public.reports for update
  using (public.is_moderator_or_admin())
  with check (public.is_moderator_or_admin());

-- 8. AUDIT_LOG POLICIES
create policy "audit_log_select_staff_only"
  on public.audit_log for select
  using (public.is_moderator_or_admin());

create policy "audit_log_insert_staff_only"
  on public.audit_log for insert
  with check (public.is_moderator_or_admin());
