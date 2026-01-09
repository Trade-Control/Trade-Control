# Trade Control

A comprehensive business management web application designed specifically for Australian tradespeople to manage their business operations efficiently.

## Features

- **User Authentication**: Secure signup and login with Supabase authentication
- **Organisation Management**: Multi-user organisation setup with mandatory organisation association
- **Dashboard**: Overview of business metrics and quick actions
- **Jobs Management**: Create and manage jobs with detailed tracking and tabbed interface
- **Contacts Management**: Full CRUD for customers and suppliers with search and filtering
- **Job Codes Management**: Standardized job items with preset costs for quick quoting
- **Inventory Management**: Track stock levels, set reorder points, and monitor inventory value
- **Inventory Allocation**: Allocate inventory items to jobs with automatic stock updates
- **Quotes**: Generate quotes with standardized job codes or manual line items
- **Invoices**: Convert accepted quotes to invoices with print-friendly views
- **Timesheets**: Track time with clock on/off functionality and manual entries
- **Documents**: Upload and manage job-related files with Supabase Storage
- **Travel Tracking**: Track travel distance and time with Google Maps integration
- **Address Autocomplete**: Google Maps powered address suggestions for all address fields
- **Mobile Optimized**: Fully responsive design for on-the-go access

> 📖 **See [NEW_FEATURES_GUIDE.md](./NEW_FEATURES_GUIDE.md) for detailed information about the latest features!**

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Deployment Ready**: Vercel/Netlify compatible

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js 18.x or higher
- npm or yarn
- A Supabase account (free tier works fine)

## Getting Started

### 1. Clone or Setup the Project

If you haven't already, ensure all project files are in place.

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Once your project is created, go to Project Settings → API
3. Copy your project URL and anon/public key

### 4. Run the Database Migrations

1. In your Supabase project, go to the SQL Editor
2. **CRITICAL**: Open and run `CRITICAL_FIX_RUN_THIS.sql` FIRST (if it exists)
3. Then open `supabase/migrations/001_initial_schema.sql`
4. Copy the entire contents and paste it into the SQL Editor
5. Click "Run" to execute the migration
6. **NEW**: Run `supabase/migrations/002_inventory_and_travel.sql` for new features
7. This will create all necessary tables, policies, and triggers

### 5. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

Replace the values with your actual credentials:
- Supabase credentials from step 3
- Google Maps API key from [Google Cloud Console](https://console.cloud.google.com/) (required for address autocomplete and travel tracking)

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## First Time Setup

### 1. Create Your Account

1. Navigate to the signup page
2. Enter your email and password (minimum 6 characters)
3. Click "Sign Up"

### 2. Set Up Your Organization

After signing up, you'll be redirected to the organization setup page:

1. Enter your business name (required)
2. Fill in optional details:
   - ABN
   - Business address
   - Contact information
3. Click "Complete Setup"

### 3. Start Using Trade Control

Once your organization is set up, you'll be redirected to the dashboard where you can:
- Create your first job
- Add contacts
- Set up job codes for quick quoting
- Manage inventory

## Application Structure

```
trade-control/
├── app/
│   ├── (auth)/              # Authentication pages (login, signup)
│   ├── (protected)/         # Protected pages requiring authentication
│   │   ├── dashboard/       # Main dashboard
│   │   ├── jobs/           # Jobs management
│   │   ├── contacts/       # Contacts (placeholder)
│   │   ├── job-codes/      # Job codes (placeholder)
│   │   └── inventory/      # Inventory (placeholder)
│   ├── organization-setup/ # Organization setup flow
│   └── layout.tsx          # Root layout
├── components/
│   ├── layout/             # Layout components (sidebar, dashboard)
│   └── jobs/               # Jobs-related components
├── lib/
│   ├── supabase/           # Supabase client utilities
│   └── types/              # TypeScript type definitions
├── supabase/
│   └── migrations/         # Database migration files
└── public/                 # Static assets
```

## Key Features Explained

### Jobs Module

The jobs module is the core of Trade Control:

1. **Create Jobs**: Add new jobs with client information, site details, and dates
2. **Quotes**: 
   - Pull from standardized job codes or create manual line items
   - Automatic GST calculation (10%)
   - Email quotes via default email client
   - Accept quotes to convert to invoices
3. **Invoices**:
   - Auto-generated from accepted quotes
   - Track payment status
   - Print-friendly view for PDF generation
   - Email invoices to clients
4. **Timesheets**:
   - Clock on/off for automatic time tracking
   - Real-time timer display
   - Manual time entry option
   - Total hours summary per job
5. **Documents**:
   - Upload files related to jobs
   - Secure storage with Supabase
   - Download and delete functionality

### Authentication & Security

- **Row Level Security (RLS)**: All data is automatically filtered by organization
- **Multi-tenant Architecture**: Multiple organizations can use the app independently
- **Secure Authentication**: Supabase handles all authentication securely
- **Protected Routes**: Middleware ensures only authenticated users with organizations can access the app

### Email Integration

Quotes and invoices use `mailto:` links to open the user's default email client with pre-filled content. This approach:
- Works on all devices
- Doesn't require email service configuration
- Gives users full control over their emails
- No additional costs for email services

## Database Schema

The application uses a comprehensive database schema with the following key tables:

- **organizations**: Business information
- **profiles**: User profiles linked to organizations
- **contacts**: Customers and suppliers
- **job_codes**: Standardized job items with preset costs
- **inventory**: Stock and materials tracking
- **jobs**: Main job records
- **quotes**: Quote generation
- **quote_line_items**: Individual quote lines
- **invoices**: Invoice records
- **invoice_line_items**: Individual invoice lines
- **timesheets**: Time tracking entries
- **documents**: File metadata

All tables include:
- `organization_id`: Links data to organizations
- `created_by`: Tracks the user who created the record
- `created_at` / `updated_at`: Audit timestamps

## Styling & Theming

The application uses a custom color scheme:
- **Primary Color**: #2391cd (Trade Control Blue)
- **Font Family**: Segoe UI, Tahoma, Geneva, Verdana, sans-serif

Colors are defined in:
- `tailwind.config.ts`: Tailwind theme configuration
- `app/globals.css`: CSS variables for consistent theming

## Mobile Optimization

Trade Control is fully mobile-responsive:
- Collapsible sidebar navigation on mobile
- Touch-friendly buttons and controls
- Responsive tables and grids
- Mobile-optimized forms
- Print-friendly invoice and quote views

## Recent Updates ✨

**Latest Features (2025):**
- ✅ Full Contacts Management (customers & suppliers)
- ✅ Job Codes Management with categorization
- ✅ Comprehensive Inventory Tracking with low stock alerts
- ✅ Inventory Allocation to jobs
- ✅ Tabbed job interface for better navigation
- ✅ Google Maps Address Autocomplete
- ✅ Travel Tracking with route calculation
- ✅ Job-specific travel logs

## Future Enhancements

Additional features that could be added:

1. **User Management**: Invite team members to organizations
2. **Licensing System**: Job allocation across team members
3. **Payment Integration**: Accept payments online
4. **Reporting**: Business analytics and reports
5. **Mobile App**: Native mobile applications
6. **Export/Import**: CSV exports for contacts, inventory, etc.
7. **Accounting Integration**: Connect with Xero, QuickBooks, etc.

## Troubleshooting

### "Not authenticated" errors
- Ensure you're logged in
- Clear browser cache and cookies
- Check that environment variables are set correctly

### Database errors
- Verify the migration was run successfully in Supabase
- Check that RLS policies are enabled
- Ensure your Supabase project is active

### File upload issues
- Verify the storage bucket "job-documents" exists in Supabase
- Check storage policies are correctly set
- Ensure file size is within Supabase limits (default: 50MB)

### Email links not working
- Ensure the contact has an email address
- Check that you have a default email client configured
- Some web browsers may block mailto: links - try a different browser

## Development

### Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm start`: Start production server
- `npm run lint`: Run ESLint

### Adding New Features

1. Create components in `components/`
2. Add pages in `app/(protected)/`
3. Update database schema in Supabase
4. Add TypeScript types in `lib/types/`

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel project settings
4. Deploy

### Deploy to Netlify

1. Push your code to GitHub
2. Import project in Netlify
3. Add environment variables in Netlify site settings
4. Set build command: `npm run build`
5. Set publish directory: `.next`
6. Deploy

## Support

For issues or questions:
1. Check this README thoroughly
2. Review the Supabase documentation
3. Check Next.js documentation for framework-specific questions

## License

This project is provided as-is for business use.

## Acknowledgments

- Built with Next.js and Supabase
- Designed for Australian tradespeople
- Focused on simplicity and efficiency
