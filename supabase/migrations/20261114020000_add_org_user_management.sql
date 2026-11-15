-- Migration: Add email and title to user_profiles and support manual organization user management

-- 1. Add email and title columns to user_profiles if they don't exist
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT;

-- 2. Allow auto-generated UUIDs for manually added organization users (who don't yet have an auth.users entry)
ALTER TABLE public.user_profiles
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 3. Backfill email from auth.users for existing user_profiles
UPDATE public.user_profiles up
SET email = au.email
FROM auth.users au
WHERE up.id = au.id
  AND (up.email IS NULL OR up.email = '');

-- 4. Create trigger function to auto-populate email from auth.users when an authenticated user profile is created/updated
CREATE OR REPLACE FUNCTION public.sync_user_profile_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NULL OR NEW.email = '' THEN
    SELECT email INTO NEW.email FROM auth.users WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_user_profile_email ON public.user_profiles;
CREATE TRIGGER trg_sync_user_profile_email
BEFORE INSERT OR UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_profile_email();

-- 5. Security definer helper to check if the current user can manage users in a target organization
CREATE OR REPLACE FUNCTION public.can_manage_org_users(target_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
      AND (
        organization_id = target_org_id
        OR role = 'corporate'::public.user_role
        OR role = 'admin'::public.user_role
      )
  );
$$;

-- 6. RLS policies allowing organization members to insert, update, and delete users in their organization
DROP POLICY IF EXISTS "Organization members can insert users into their organization." ON public.user_profiles;
CREATE POLICY "Organization members can insert users into their organization."
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = id
  OR public.can_manage_org_users(organization_id)
);

DROP POLICY IF EXISTS "Organization members can update users in their organization." ON public.user_profiles;
CREATE POLICY "Organization members can update users in their organization."
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id
  OR public.can_manage_org_users(organization_id)
);

DROP POLICY IF EXISTS "Organization members can delete users in their organization." ON public.user_profiles;
CREATE POLICY "Organization members can delete users in their organization."
ON public.user_profiles
FOR DELETE
TO authenticated
USING (
  public.can_manage_org_users(organization_id)
);
