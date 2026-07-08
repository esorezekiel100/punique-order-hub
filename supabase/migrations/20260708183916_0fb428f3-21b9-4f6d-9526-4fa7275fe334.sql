
-- These functions are only invoked by triggers or by RLS policies (which run
-- with definer privileges regardless of EXECUTE grants). Lock them down so
-- users cannot call them directly.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_admin_for_verified_domain() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
-- has_role stays callable by authenticated users so the frontend can check
-- "am I admin" from the client. RLS still enforces server-side.
