-- Add organization_name to seller_listings and keep it in sync with organizations.organization_name.

ALTER TABLE public.seller_listings
    ADD COLUMN IF NOT EXISTS organization_name text;

-- 1. Trigger function on seller_listings insert/update
CREATE OR REPLACE FUNCTION public.sync_seller_listings_organization_name()
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

DROP TRIGGER IF EXISTS trigger_sync_seller_listings_organization_name ON public.seller_listings;
CREATE TRIGGER trigger_sync_seller_listings_organization_name
    BEFORE INSERT OR UPDATE ON public.seller_listings
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_seller_listings_organization_name();

-- 2. Extend organizations name-change trigger function to sync both buyer_criteria and seller_listings
CREATE OR REPLACE FUNCTION public.sync_organization_name_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.organization_name IS DISTINCT FROM OLD.organization_name THEN
        UPDATE public.buyer_criteria
        SET organization_name = NEW.organization_name
        WHERE organization_id = NEW.id;

        UPDATE public.seller_listings
        SET organization_name = NEW.organization_name
        WHERE organization_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Backfill existing seller_listings rows
UPDATE public.seller_listings sl
SET organization_name = org.organization_name
FROM public.organizations org
WHERE sl.organization_id = org.id
  AND (sl.organization_name IS DISTINCT FROM org.organization_name OR sl.organization_name IS NULL);
