-- ============================================================================
-- Niruvi Store — Supabase Linter 0028 & 0029 Remediation Patch
-- Migration: 0002_fix_security_definer_functions.sql
--
-- Resolves all 12 warnings:
--   - 0028_anon_security_definer_function_executable
--   - 0029_authenticated_security_definer_function_executable
--
-- 1. Switches RBAC helpers (`current_user_role`, `is_moderator_or_admin`,
--    `is_admin`) and table triggers (`guard_profile_updates_and_audit`,
--    `guard_app_moderation_and_audit`) to `SECURITY INVOKER`.
-- 2. Revokes `EXECUTE` on `public.handle_new_auth_user()` from `PUBLIC`,
--    `anon`, and `authenticated` so it cannot be called via `/rest/v1/rpc/...`
--    while still running as a trigger on `auth.users`.
-- ============================================================================

alter function public.current_user_role() security invoker;
alter function public.is_moderator_or_admin() security invoker;
alter function public.is_admin() security invoker;
alter function public.guard_profile_updates_and_audit() security invoker;
alter function public.guard_app_moderation_and_audit() security invoker;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
