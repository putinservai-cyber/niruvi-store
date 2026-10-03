-- ============================================================================
-- Niruvi Store — Supabase Linter 0028 & 0029 Remediation Script
-- Migration: 0006_fix_supabase_linter_warnings.sql
--
-- Resolves all linter warnings for:
--   - anon_security_definer_function_executable (0028)
--   - authenticated_security_definer_function_executable (0029)
--
-- Actions:
--   1. Converts RBAC helper functions to `SECURITY INVOKER`
--   2. Ensures search_path is set securely to 'public'
--   3. Revokes execute from anon where appropriate
-- ============================================================================

-- 1. Helper function to get current user's role (Security Invoker)
create or replace function public.current_user_role()
returns text
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    (select p.role from public.profiles p where p.id = auth.uid()),
    'user'
  );
$$;

-- 2. Helper function to check if current user is moderator or admin (Security Invoker)
create or replace function public.is_moderator_or_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select public.current_user_role() in ('moderator', 'admin');
$$;

-- 3. Helper function to check if current user is admin (Security Invoker)
create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select public.current_user_role() = 'admin';
$$;

-- 4. Helper function to check if current user is publisher (Security Invoker)
create or replace function public.is_publisher()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select public.current_user_role() in ('publisher', 'moderator', 'admin');
$$;

-- 5. Trigger guards (Security Invoker)
create or replace function public.guard_profile_updates_and_audit()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  caller_role text;
begin
  new.updated_at := now();
  caller_role := public.current_user_role();

  if new.role is distinct from old.role then
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

create or replace function public.guard_app_moderation_and_audit()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  caller_role text;
begin
  new.updated_at := now();
  caller_role := public.current_user_role();

  if new.status is distinct from old.status or new.trust_tier is distinct from old.trust_tier then
    if not public.is_moderator_or_admin() then
      if new.status not in ('draft', 'pending') then
        raise exception 'Forbidden: regular users can only save draft or submit for pending review.';
      end if;
      if new.trust_tier is distinct from old.trust_tier then
        raise exception 'Forbidden: only moderators or admins may modify trust tier.';
      end if;
    end if;

    insert into public.audit_log (
      actor_id, actor_role, action, target_type, target_id, previous_state, new_state
    ) values (
      auth.uid(),
      caller_role,
      'app_moderated',
      'app',
      new.id::text,
      jsonb_build_object('status', old.status, 'trust_tier', old.trust_tier),
      jsonb_build_object('status', new.status, 'trust_tier', new.trust_tier)
    );
  end if;

  return new;
end;
$$;

-- 6. Lock down trigger functions so they cannot be executed directly via RPC
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
