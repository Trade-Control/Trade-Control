# Cloudflare Pages Deployment

This project is configured for Cloudflare Pages deployment.

## Environment Variables

Set the following environment variables in Cloudflare Pages dashboard:
- Go to your project → Settings → Environment Variables
- Add all variables from `ENV_TEMPLATE.md`

## Build Configuration

- Build command: `npm run build`
- Build output directory: `.next`

## API Routes

All API routes use Edge Runtime for optimal performance on Cloudflare Pages.

## Stripe Webhooks

Configure webhook endpoint in Stripe Dashboard:
- URL: `https://your-domain.pages.dev/api/webhooks/stripe`
- Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET` environment variable
