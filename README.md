# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

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

## Railway environment variables

Set the following variables in Railway before deploying or testing the payment webhook:

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
- `SUPER_ADMIN_EMAILS=the-owner-login-email` — comma-separated server-only ezWar allow list
- `SUPER_ADMIN_USER_IDS=` — comma-separated server-only ezWar user ID allow list

Keep `META_CONVERSIONS_API_TOKEN`, `META_TEST_EVENT_CODE`, `SUPER_ADMIN_EMAILS`, and `SUPER_ADMIN_USER_IDS` in Railway server variables only. Never use a `VITE_` prefix for these values or expose them to the browser. The ezWar engine does not accept patient names, photographs, diagnoses, scan findings, treatment concerns, or clinical records as Meta payload data.

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
