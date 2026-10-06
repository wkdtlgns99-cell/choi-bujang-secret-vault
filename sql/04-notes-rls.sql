-- Review-only proposal. Not executed by the app or build.
SELECT 'before' AS phase, grantee, privilege_type, is_grantable
FROM information_schema.role_table_grants
WHERE table_schema='public' AND table_name='learning_notes'
AND grantee IN ('anon','authenticated') ORDER BY grantee,privilege_type;
SELECT 'before' AS phase,r.role_name,p.privilege,
has_table_privilege(r.role_name,'public.learning_notes',p.privilege) AS actually_allowed
FROM (VALUES ('anon'),('authenticated')) AS r(role_name)
CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) AS p(privilege)
ORDER BY r.role_name,p.privilege;
BEGIN;
REVOKE ALL ON TABLE public.learning_notes FROM PUBLIC,anon,authenticated;
ALTER TABLE public.learning_notes ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE existing_policy record;
BEGIN
FOR existing_policy IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='learning_notes'
LOOP EXECUTE format('DROP POLICY %I ON public.learning_notes',existing_policy.policyname); END LOOP;
END $$;
CREATE POLICY notes_select_own ON public.learning_notes FOR SELECT TO authenticated USING ((SELECT auth.uid())=owner_id);
CREATE POLICY notes_insert_own ON public.learning_notes FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid())=owner_id);
CREATE POLICY notes_update_own ON public.learning_notes FOR UPDATE TO authenticated USING ((SELECT auth.uid())=owner_id) WITH CHECK ((SELECT auth.uid())=owner_id);
CREATE POLICY notes_delete_own ON public.learning_notes FOR DELETE TO authenticated USING ((SELECT auth.uid())=owner_id);
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.learning_notes TO authenticated;
COMMIT;
SELECT 'after' AS phase, grantee, privilege_type, is_grantable
FROM information_schema.role_table_grants
WHERE table_schema='public' AND table_name='learning_notes'
AND grantee IN ('anon','authenticated') ORDER BY grantee,privilege_type;
SELECT 'after' AS phase,r.role_name,p.privilege,
has_table_privilege(r.role_name,'public.learning_notes',p.privilege) AS actually_allowed
FROM (VALUES ('anon'),('authenticated')) AS r(role_name)
CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) AS p(privilege)
ORDER BY r.role_name,p.privilege;
