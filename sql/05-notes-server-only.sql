-- Review-only proposal. Do not apply until real A-account server CRUD is checked.
-- Targets public.learning_notes only. Keeps server grants and RLS policies unchanged.
SELECT 'before' AS phase, grantee,privilege_type,is_grantable
FROM information_schema.role_table_grants
WHERE table_schema='public' AND table_name='learning_notes'
AND grantee IN ('anon','authenticated','service_role') ORDER BY grantee,privilege_type;
SELECT 'before' AS phase,r.role_name,p.privilege,
has_table_privilege(r.role_name,'public.learning_notes',p.privilege) AS actually_allowed
FROM (VALUES ('anon'),('authenticated'),('service_role')) AS r(role_name)
CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) AS p(privilege)
ORDER BY r.role_name,p.privilege;
SELECT 'before' AS phase,r.role_name,p.privilege,
has_any_column_privilege(r.role_name,'public.learning_notes',p.privilege) AS any_column_allowed
FROM (VALUES ('anon'),('authenticated')) AS r(role_name)
CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('REFERENCES')) AS p(privilege)
ORDER BY r.role_name,p.privilege;
BEGIN;
-- Abort rather than remove a server privilege on which the app currently relies.
DO $$ BEGIN
IF NOT (
  has_table_privilege('service_role','public.learning_notes','SELECT') AND
  has_table_privilege('service_role','public.learning_notes','INSERT') AND
  has_table_privilege('service_role','public.learning_notes','UPDATE') AND
  has_table_privilege('service_role','public.learning_notes','DELETE')
) THEN RAISE EXCEPTION 'Server CRUD privileges must be verified before revocation'; END IF;
END $$;
REVOKE ALL ON TABLE public.learning_notes FROM PUBLIC,anon,authenticated;
-- Also close any separate column grants on this same table, if present.
DO $$ DECLARE col record;
BEGIN
FOR col IN SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='learning_notes'
LOOP EXECUTE format('REVOKE SELECT (%1$I), INSERT (%1$I), UPDATE (%1$I), REFERENCES (%1$I) ON TABLE public.learning_notes FROM PUBLIC, anon, authenticated',col.column_name);
END LOOP;
END $$;
-- Fail closed if inherited access remains; do not alter any other roles or tables.
DO $$ DECLARE role_name text; privilege_name text;
BEGIN
FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
FOREACH privilege_name IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] LOOP
IF has_table_privilege(role_name,'public.learning_notes',privilege_name) THEN
RAISE EXCEPTION 'Unexpected inherited table access for role %',role_name;
END IF;
END LOOP;
FOREACH privilege_name IN ARRAY ARRAY['SELECT','INSERT','UPDATE','REFERENCES'] LOOP
IF has_any_column_privilege(role_name,'public.learning_notes',privilege_name) THEN
RAISE EXCEPTION 'Unexpected inherited column access for role %',role_name;
END IF;
END LOOP;
END LOOP;
END $$;
COMMIT;
SELECT 'after' AS phase, grantee,privilege_type,is_grantable
FROM information_schema.role_table_grants
WHERE table_schema='public' AND table_name='learning_notes'
AND grantee IN ('anon','authenticated','service_role') ORDER BY grantee,privilege_type;
SELECT 'after' AS phase,r.role_name,p.privilege,
has_table_privilege(r.role_name,'public.learning_notes',p.privilege) AS actually_allowed
FROM (VALUES ('anon'),('authenticated'),('service_role')) AS r(role_name)
CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) AS p(privilege)
ORDER BY r.role_name,p.privilege;
SELECT 'after' AS phase,r.role_name,p.privilege,
has_any_column_privilege(r.role_name,'public.learning_notes',p.privilege) AS any_column_allowed
FROM (VALUES ('anon'),('authenticated')) AS r(role_name)
CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('REFERENCES')) AS p(privilege)
ORDER BY r.role_name,p.privilege;
