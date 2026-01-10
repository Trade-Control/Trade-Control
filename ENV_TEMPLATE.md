# Environment Variables Template
# Copy this file to .env.local and fill in your values

# Stripe Configuration (Mock by default - replace with real keys for production)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_mock
STRIPE_SECRET_KEY=sk_test_mock
STRIPE_WEBHOOK_SECRET=whsec_mock

# Resend Email Configuration (Mock by default - replace with real key for production)
RESEND_API_KEY=re_mock_key
RESEND_FROM_EMAIL=Trade Control <noreply@tradecontrol.app>

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

# Google Maps API (Optional)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
