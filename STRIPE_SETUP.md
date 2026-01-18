# Stripe Products and Prices Setup Guide

This guide explains how Stripe products and prices work in the Trade Control subscription system.

## How It Works

**Payment Links vs Checkout Sessions:**
- **Payment Links** (pre-configured): Used for NEW subscription signups only
- **Checkout Sessions** (dynamic): Used for adding licenses to EXISTING subscriptions

**Products/Prices:**
- Products and prices are **automatically created** by the application if they don't exist
- You can optionally create them manually in Stripe Dashboard for better control
- If you create them manually, add the Price IDs to environment variables (optional but recommended)

## Required Stripe Products

The application will automatically create these products if they don't exist. However, you can create them manually in your Stripe Dashboard for better organization:

### 1. Operations Base Plan
- **Product Name**: Operations Base Plan
- **Price**: $49.00 AUD/month (recurring)
- **Billing**: Monthly
- **Usage**: Base subscription for all organizations

### 2. Operations Pro Scale
- **Product Name**: Operations Pro - Scale
- **Price**: $99.00 AUD/month (recurring)
- **Billing**: Monthly
- **Usage**: Add-on for Operations Pro tier (50 contractors)

### 3. Operations Pro Unlimited
- **Product Name**: Operations Pro - Unlimited
- **Price**: $199.00 AUD/month (recurring)
- **Billing**: Monthly
- **Usage**: Add-on for Operations Pro tier (unlimited contractors)

### 4. Management License
- **Product Name**: Management License
- **Price**: $35.00 AUD/month (recurring)
- **Billing**: Monthly
- **Usage**: Individual management user license (can be added/removed)

### 5. Field Staff License
- **Product Name**: Field Staff License
- **Price**: $15.00 AUD/month (recurring)
- **Billing**: Monthly
- **Usage**: Individual field staff user license (can be added/removed)

## Setup Instructions

### Step 1: Create Products in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → Products
2. Click "Add product" for each product above
3. For each product:
   - Enter the product name
   - Set pricing to recurring monthly
   - Set currency to AUD (Australian Dollars)
   - Set the price amount
   - Save the product

### Step 2: Copy Price IDs (Optional but Recommended)

After creating each product, Stripe will generate a Price ID (starts with `price_`).

1. Click on each product
2. Find the Price ID (it will look like `price_1ABC123...`)
3. Copy each Price ID

**Note:** If you don't add Price IDs to environment variables, the application will automatically create products/prices when needed. However, adding them manually gives you better control and organization.

### Step 3: Add Price IDs to Environment Variables (Optional)

Add the following environment variables to your `.env.local` file (or your hosting platform's environment variables):

```env
# Stripe Price IDs (optional - app will create if missing)
STRIPE_PRICE_ID_OPERATIONS_BASE=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_OPERATIONS_PRO_SCALE=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_OPERATIONS_PRO_UNLIMITED=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_MANAGEMENT_LICENSE=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_FIELD_STAFF_LICENSE=price_xxxxxxxxxxxxx
```

Replace `price_xxxxxxxxxxxxx` with the actual Price IDs from your Stripe Dashboard.

**If you skip this step:** The application will automatically create products and prices when licenses are added for the first time.

### Step 4: Verify Setup

You can verify your Stripe setup by:

1. Visiting `/debug/stripe` in your application (if available)
2. Checking that all Price IDs are configured
3. Testing license addition/removal flows

## Important Notes

### Automatic Product Creation
- **License products** (Management & Field Staff) are automatically created by the app if Price IDs aren't configured
- The app checks for existing products by name and metadata before creating new ones
- Products are created with metadata `license_type` and `created_by: trade_control_app` for identification

### License Products (Management & Field Staff)
- These must be set up as **recurring monthly subscriptions**
- They will be added/removed from existing subscriptions dynamically
- Stripe automatically handles pro-rata billing when licenses are added/removed
- Licenses remain active until the end of the billing period when removed
- **Pro-rata billing:** When adding a license mid-cycle, customer pays pro-rated amount upfront, then recurring monthly charge starts next cycle

### Base Plan
- This is the foundation subscription that all organizations must have
- Operations Pro add-ons are added on top of this base plan
- Total cost = Base Plan + Operations Pro (if applicable) + Licenses

### Testing
- Use Stripe Test Mode for development
- Test Price IDs will start with `price_` but will be different from production IDs
- Make sure to use test Price IDs in your development environment

## Troubleshooting

### "Price ID not configured" Error
- Check that all environment variables are set correctly
- Verify Price IDs match what's in Stripe Dashboard
- Ensure Price IDs are for the correct currency (AUD)

### License Addition Fails
- Verify the Price ID exists in Stripe
- Check that the Price is set to recurring monthly
- Ensure the Price is active (not archived)

### Pro-Rata Billing Issues
- Stripe handles pro-rata automatically for subscription items
- When a license is removed, it stays active until period end
- Credits/refunds are calculated automatically by Stripe

## Production Checklist

Before going live:

- [ ] All 5 products created in Stripe Dashboard
- [ ] All Price IDs copied and added to environment variables
- [ ] Tested license addition flow
- [ ] Tested license removal flow
- [ ] Tested upgrade to Operations Pro flow
- [ ] Verified pro-rata billing works correctly
- [ ] Webhook endpoint configured in Stripe Dashboard
- [ ] Webhook secret added to environment variables
