-- The secret key (service_role) is used by the seed command and by trusted
-- server code (Dev Bar sign-in, adding shops). The local CLI stack grants
-- service_role everything in public by default, but newer hosted projects
-- don't, so grant it explicitly. service_role bypasses RLS; it never reaches
-- the browser.

grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
