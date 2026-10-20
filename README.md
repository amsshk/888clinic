# Welcome to 888clinic

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Cloudflare Workers deployment

Before building, add these in Cloudflare **Workers & Pages → 888clinic →
Settings → Build → Variables and secrets**:

- `VITE_SUPABASE_URL` — the Supabase project URL.
- `VITE_SUPABASE_PUBLISHABLE_KEY` — that project's public publishable/anon key.

These values are embedded into the browser bundle by Vite. Setting only
`SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY`, or setting variables only on the
running Worker, does not configure the browser. Rebuild after changing them.
Never use a Supabase service-role or secret key in a `VITE_` variable.
Builds fail early if either required browser variable is absent.

Use `NITRO_PRESET=cloudflare-module bun run build` as the Cloudflare build
command and `npx wrangler deploy` as the deploy command. The build generates
`.output/server/wrangler.json` and `.wrangler/deploy/config.json`; Wrangler
automatically uses this generated configuration.

Keep the route pattern as `888clinic.co/*` so Cloudflare routes every page
and `/assets/*` request to this deployment. A bare `888clinic.co` pattern
does not cover the stylesheet, JavaScript, and image URLs used by the page.

Keep production settings at the top level of `wrangler.toml`. Nitro copies
the source configuration into its generated file, and Wrangler rejects named
`[env.*]` environments in redirected configurations. Deploy without
`--env production`. Build before deploying; a `[build]` hook would be copied
into the generated configuration and run again during deployment.

Configure actual secret bindings in Cloudflare's dashboard or with
`wrangler secret put`; do not add placeholder values or a `[secrets]` table
to `wrangler.toml`.

Keep `onnxruntime-web` pinned to `1.21.0`, the peer version required by
`@imgly/background-removal`. Version `1.27.0` also emits a 25.6 MiB WASM
asset, exceeding Cloudflare Workers' 25 MiB per-asset limit.

## Railway environment variables

Set the following variables in Railway before deploying or testing the payment webhook:

- `VITE_EZ888N_APP_URL` — the non-secret public HTTPS URL for the deployed EZ888N application (e.g. `https://ez888n.888clinic.co`)
- `SUPABASE_URL` — the Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — the Supabase service-role key used by server-side functions
- `STRIPE_SANDBOX_API_KEY` / `STRIPE_LIVE_API_KEY` — the Stripe connection API keys for each environment
- `PAYMENTS_SANDBOX_WEBHOOK_SECRET` / `PAYMENTS_LIVE_WEBHOOK_SECRET` — the corresponding Stripe webhook secrets
- `LOVABLE_API_KEY` — the Lovable connector key used for the Stripe gateway
- `META_PIXEL_ID` — the Meta Pixel ID for the clinic (`1437834427873532`)
- `VITE_META_PIXEL_ENABLED` — set to `true` only after privacy review; defaults to `false`
- `META_CONVERSIONS_API_ENABLED` — set to `true` only after privacy review; defaults to `false`
- `META_CONVERSIONS_API_TOKEN` — the server-only Meta Conversions API token
- `META_TEST_EVENT_CODE` — optional server-only Meta test event code
- `SUPER_ADMIN_EMAILS=the-owner-login-email` — comma-separated server-only EZ888N allow list
- `SUPER_ADMIN_USER_IDS=` — comma-separated server-only EZ888N user ID allow list
- `OPENAI_API_KEY` — optional server-only OpenAI key for EZ888N marketing video generation
- `OPENAI_VIDEO_MODEL` — optional server-only OpenAI video model name (defaults to `sora-2`)

Keep `META_CONVERSIONS_API_TOKEN`, `META_TEST_EVENT_CODE`, `SUPER_ADMIN_EMAILS`, `SUPER_ADMIN_USER_IDS`, `OPENAI_API_KEY`, and `LOVABLE_API_KEY` in Railway server variables only. Never use a `VITE_` prefix for these values or expose them to the browser. The EZ888N engine does not accept patient names, photographs, diagnoses, scan findings, treatment concerns, or clinical records as Meta payload data.

### EZ888N Production & Meta Ads Requirements

To run EZ888N features in production:
- **Authentication**: Supabase project credentials with an active user session.
- **Super Admin Access**: The signed-in user's email or ID must match `SUPER_ADMIN_EMAILS` or `SUPER_ADMIN_USER_IDS`.
- **Application URL**: Configure `VITE_EZ888N_APP_URL` with your EZ888N application's HTTPS endpoint to enable the admin connection.
- **AI Copywriting**: Requires `LOVABLE_API_KEY` configured in server variables to generate bilingual ad angles.
- **AI Video Generation (Optional)**: Requires `OPENAI_API_KEY` with access to the configured video model (`OPENAI_VIDEO_MODEL`).
- **Meta Insights & Reporting**: Any displayed campaign benchmarks in the UI represent reference historical campaign performance snapshots. Live Meta Insights require a separate Meta Marketing API app integration, approved `ads_read`/`read_insights` permissions, an Ad Account ID, and a long-lived System User Access Token. Note that `META_CONVERSIONS_API_TOKEN` is strictly scoped for server-side event tracking and cannot be used for Insights API requests.

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
