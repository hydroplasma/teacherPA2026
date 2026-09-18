# Security and Supabase configuration

## Environment variables

Never commit `.env` or any file containing a Supabase key. Copy `.env.example` to `.env` locally and fill in the values through the deployment platform's encrypted environment-variable settings.

`SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be exposed to browser code, static assets, logs, or client-side configuration. If it has ever been committed or shared, revoke and rotate it in Supabase immediately. The public anon key is still subject to Row Level Security and should not be used as a substitute for the service-role key on the server.

## Data flow

The browser reads `GET /api/config`. The Express API reads the single `portfolio_settings` row whose `key` is `config`. The row's `value` column is `jsonb`, and updates from the Admin page are sent to `PUT /api/config` after Supabase authentication. When Supabase is not configured, the application intentionally falls back to `data/config.json` for local/demo use.

The API now accepts Supabase `jsonb` values returned as either JavaScript objects or legacy JSON strings. The config endpoint is also marked `no-store` so browsers and deployment proxies do not serve stale data after an Admin update.

## Database setup

Run `supabase/schema.sql` in the Supabase SQL editor. It creates `public.portfolio_settings`, enables Row Level Security, permits public reads, and restricts writes to authenticated users. Use a server-side service-role key only in the backend environment; do not put it in HTML, JavaScript, or Git.
