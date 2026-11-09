/**
 * Fails fast with one clear message if the local Supabase instance's
 * env vars aren't set, instead of every test failing one by one with
 * an opaque "fetch failed" / missing-key error.
 *
 * To run these tests locally (once Docker is available):
 *   supabase start
 *   eval "$(supabase status -o env \
 *     --override-name api.url=NEXT_PUBLIC_SUPABASE_URL \
 *     --override-name auth.anon_key=NEXT_PUBLIC_SUPABASE_ANON_KEY \
 *     --override-name auth.service_role_key=SUPABASE_SERVICE_ROLE_KEY)"
 *   npm run test:integration
 *   supabase stop
 */
const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(
    `Integration tests need a running local Supabase instance. Missing env var(s): ${missing.join(", ")}. ` +
      `Run "supabase start", export its status as env vars (see the comment at the top of this file), then retry.`
  );
}
