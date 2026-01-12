# Environment Variables Template
# Copy this file to .env.local and fill in your values

# Stripe Configuration (Test Mode for sandbox)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

# Stripe Price IDs (create products in Stripe Dashboard and copy Price IDs)
STRIPE_PRICE_ID_OPERATIONS_BASE=price_YOUR_PRICE_ID_HERE
STRIPE_PRICE_ID_MANAGEMENT_LICENSE=price_YOUR_PRICE_ID_HERE
STRIPE_PRICE_ID_FIELD_STAFF_LICENSE=price_YOUR_PRICE_ID_HERE
STRIPE_PRICE_ID_OPERATIONS_PRO_SCALE=price_YOUR_PRICE_ID_HERE
STRIPE_PRICE_ID_OPERATIONS_PRO_UNLIMITED=price_YOUR_PRICE_ID_HERE

# Stripe Payment Links (create Payment Links in Stripe Dashboard > Products > Payment Links)
# These are ONLY for new signups. Upgrades and license additions use Checkout Sessions API.
STRIPE_PAYMENT_LINK_OPERATIONS=https://buy.stripe.com/YOUR_PAYMENT_LINK_ID
STRIPE_PAYMENT_LINK_OPERATIONS_PRO_SCALE=https://buy.stripe.com/YOUR_PAYMENT_LINK_ID
STRIPE_PAYMENT_LINK_OPERATIONS_PRO_UNLIMITED=https://buy.stripe.com/YOUR_PAYMENT_LINK_ID

# Resend Email Configuration (Free tier: 100 emails/day)
RESEND_API_KEY=re_YOUR_API_KEY_HERE
RESEND_FROM_EMAIL=Trade Control <onboarding@resend.dev>
# Note: For production, verify your domain and use: Trade Control <noreply@yourdomain.com>

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Subscription Pricing (in cents AUD)
OPERATIONS_BASE_PRICE=4900
MANAGEMENT_LICENSE_PRICE=3500
FIELD_STAFF_LICENSE_PRICE=1500
OPERATIONS_PRO_SCALE_PRICE=9900
OPERATIONS_PRO_UNLIMITED_PRICE=19900

# Supabase Configuration (Add your real values)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here
# Service role key is required for admin operations like creating users
# Find it in Supabase Dashboard > Settings > API > service_role (secret)
# ⚠️ NEVER expose this key in client-side code - only use in API routes
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here

# Google Maps API (Optional)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
