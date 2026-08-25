-- Migration to automatically sync buyer_criteria.organization_name with organizations.organization_name.

-- 1. Create or replace trigger function on buyer_criteria updates
CREATE OR REPLACE FUNCTION public.sync_buyer_criteria_organization_name()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR NEW.organization_id IS DISTINCT FROM OLD.organization_id) THEN
        IF NEW.organization_id IS NOT NULL THEN
            SELECT organization_name INTO NEW.organization_name
            FROM public.organizations
            WHERE id = NEW.organization_id;
        ELSE
            NEW.organization_name := NULL;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger on buyer_criteria
DROP TRIGGER IF EXISTS trigger_sync_buyer_criteria_organization_name ON public.buyer_criteria;
CREATE TRIGGER trigger_sync_buyer_criteria_organization_name
    BEFORE INSERT OR UPDATE ON public.buyer_criteria
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_buyer_criteria_organization_name();

-- 3. Create or replace trigger function on organizations name changes
CREATE OR REPLACE FUNCTION public.sync_organization_name_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.organization_name IS DISTINCT FROM OLD.organization_name THEN
        UPDATE public.buyer_criteria
        SET organization_name = NEW.organization_name
        WHERE organization_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create the trigger on organizations
DROP TRIGGER IF EXISTS trigger_sync_organization_name_changes ON public.organizations;
CREATE TRIGGER trigger_sync_organization_name_changes
    AFTER UPDATE OF organization_name ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_organization_name_changes();

-- 5. Backfill existing data
UPDATE public.buyer_criteria bc
SET organization_name = org.organization_name
FROM public.organizations org
WHERE bc.organization_id = org.id
  AND (bc.organization_name IS DISTINCT FROM org.organization_name OR bc.organization_name IS NULL);
