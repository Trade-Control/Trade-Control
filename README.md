# Trade Control

A comprehensive SaaS platform for Australian trade businesses to manage their entire operations lifecycle.

## Overview

Trade Control enables trade companies to manage jobs from quote to completion, handle team members and external contractors, generate professional quotes and invoices, track inventory and travel, and maintain compliance—all while providing role-based access control and flexible subscription tiers.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Server Actions
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **Payments**: Stripe
- **Email**: Resend
- **Maps**: Google Maps API (optional)

## Project Structure

```
trade-control/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── (auth)/            # Auth pages (login, signup)
│   │   ├── (dashboard)/       # Protected dashboard pages
│   │   ├── api/               # API routes (webhooks)
│   │   ├── onboarding/        # Onboarding flow
│   │   └── contractor-access/ # Token-based contractor access
│   ├── actions/               # Server actions
│   ├── components/            # React components
│   ├── lib/                   # Utilities and clients
│   │   ├── supabase/         # Supabase client configs
│   │   ├── stripe/           # Stripe integration
│   │   ├── auth/             # Auth utilities
│   │   └── utils/            # Helper functions
│   └── types/                # TypeScript type definitions
├── supabase/
│   └── migrations/           # Database migrations
└── public/                   # Static assets
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Stripe account
- Resend account
- Google Maps API key (optional)

### Environment Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in the required values:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Stripe Price IDs (create products in Stripe Dashboard)
STRIPE_OPERATIONS_PRICE_ID=price_xxx
STRIPE_OPERATIONS_PRO_SCALE_ADDON_PRICE_ID=price_xxx
STRIPE_OPERATIONS_PRO_UNLIMITED_ADDON_PRICE_ID=price_xxx
STRIPE_MANAGEMENT_LICENSE_PRICE_ID=price_xxx
STRIPE_FIELD_STAFF_LICENSE_PRICE_ID=price_xxx

# Resend
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Google Maps (Optional)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Installation

```bash
# Install dependencies
npm install

# Run database migrations (in Supabase dashboard SQL editor)
# 1. Run supabase/migrations/20240101000000_initial_schema.sql
# 2. Run supabase/migrations/20240101000001_rls_policies.sql

# Run development server
npm run dev
```

Visit `http://localhost:3000` to see the application.

## Stripe Setup

### 1. Create Products in Stripe Dashboard

Create the following products with recurring monthly pricing (AUD):

1. **Operations Base** - $49/month
2. **Operations Pro Scale Addon** - $99/month (addon to base)
3. **Operations Pro Unlimited Addon** - $199/month (addon to base)
4. **Management License** - $35/month
5. **Field Staff License** - $15/month

Copy the Price IDs into your `.env` file.

### 2. Setup Webhook

1. In Stripe Dashboard, go to Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy the webhook signing secret to `.env` as `STRIPE_WEBHOOK_SECRET`

## Supabase Setup

### 1. Create Project

Create a new Supabase project and copy the URL and keys to `.env`.

### 2. Run Migrations

In the Supabase SQL Editor, run the migration files in order:
1. `supabase/migrations/20240101000000_initial_schema.sql`
2. `supabase/migrations/20240101000001_rls_policies.sql`

### 3. Configure Storage (Optional)

For document uploads and contractor submissions, create storage buckets:
- `documents`
- `contractor-submissions`

Apply RLS policies to restrict access based on organization.

## Features Implemented

### ✅ Core Infrastructure
- [x] Next.js 14 with App Router
- [x] TypeScript configuration
- [x] Tailwind CSS with custom theme
- [x] Supabase integration (client, server, middleware)
- [x] Stripe integration with webhook handlers
- [x] Authentication system with role-based permissions
- [x] Row Level Security (RLS) policies

### ✅ User Flows
- [x] Signup with Stripe checkout
- [x] Login with subscription check
- [x] Onboarding flow for organization setup
- [x] Protected dashboard layout with navigation

### ✅ Core Features
- [x] **Dashboard** - Stats, quick actions, recent jobs
- [x] **Job Management** - CRUD operations, status workflow, auto job numbering
- [x] **Contacts** - Customer and supplier management
- [x] **Inventory** - Item management, stock tracking, allocation to jobs
- [x] **License Management** - View licenses, assign/unassign users
- [x] **Subscription Management** - View plan, billing info, upgrade options
- [x] **Audit Trail** - System action logging and viewer (owner only)

### ⚠️ Features Pending Implementation
- [ ] **Quotes & Invoices** - PDF generation, email delivery, payment tracking
- [ ] **Timesheets** - Clock in/out, manual entry, hours calculation
- [ ] **Documents** - File upload to Supabase Storage, signed URLs
- [ ] **Travel Tracking** - Google Maps integration for distance/duration
- [ ] **Contractor Management** - CRUD, compliance tracking (Operations Pro)
- [ ] **Contractor Access** - Token-based job access, work submissions
- [ ] **Resend Email Integration** - Send quotes, invoices, notifications
- [ ] **Google Maps Autocomplete** - Address fields in contacts and jobs

## Database Schema

The application uses PostgreSQL with the following main tables:

- **organizations** - Company/business entities
- **profiles** - User profiles linked to auth.users
- **subscriptions** - Stripe subscription tracking
- **licenses** - License seats (Owner/Management/Field Staff)
- **jobs** - Core job records
- **contacts** - Customers and suppliers
- **quotes** / **quote_line_items** - Quote documents
- **invoices** / **invoice_line_items** - Invoice documents
- **timesheets** - Time tracking
- **documents** - File metadata
- **inventory_items** / **inventory_allocations** - Inventory management
- **travel_logs** - Travel tracking
- **contractors** - External contractor records (Pro tier)
- **contractor_job_assignments** - Token-based job access
- **contractor_submissions** - Work submissions from contractors
- **email_communications** - Email log
- **audit_trail** - System action logging

All tables implement Row Level Security (RLS) to ensure data isolation by organization.

## Subscription Tiers

### Operations - $49 AUD/month
- Job management
- Contacts
- Quotes & Invoices
- Timesheets
- Documents
- Inventory
- Travel tracking
- 14-day free trial

### Operations Pro Scale - $148 AUD/month
- Everything in Operations
- Contractor management (up to 50 contractors)
- Compliance tracking
- Token-based contractor access
- Activity feed

### Operations Pro Unlimited - $248 AUD/month
- Everything in Operations Pro Scale
- Unlimited contractors

### License Add-Ons
- **Management License** - $35 AUD/month per seat
- **Field Staff License** - $15 AUD/month per seat

## User Roles & Permissions

### Owner
- Full access to all features
- Manage licenses and subscriptions
- View audit trail
- Manage organization settings

### Management
- Full job, quote, and invoice management
- Can assign contractors (if Operations Pro)
- Cannot manage licenses or subscriptions
- Cannot access audit trail

### Field Staff
- View-only access to assigned jobs
- Can update job status and notes for assigned jobs
- Can clock in/out and submit timesheets for assigned jobs
- Can upload documents and log travel for assigned jobs
- Cannot access quotes, invoices, or other jobs

## Development

### Run Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## Deployment

The application can be deployed to:
- **Vercel** (recommended for Next.js)
- **Netlify**
- Any Node.js hosting platform

Ensure all environment variables are set in your hosting platform.

## Security Considerations

- All database tables use Row Level Security (RLS)
- Authentication required for all protected routes
- Server-side permission checks in all actions
- Input validation with Zod schemas
- Stripe webhook signature verification
- Secure token generation for contractor access

## License

Proprietary - All rights reserved

## Support

For support and questions, please contact the development team.
