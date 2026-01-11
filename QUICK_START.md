# Quick Start Guide - New Features

## For Administrators

### Running the Migration
```bash
# Navigate to project directory
cd "c:\Users\vinee\OneDrive\Trade Control\Trade Control"

# Run the migration
npx supabase migration up

# Or if using Supabase CLI directly
supabase db push
```

### Verify Installation
1. Check new tables exist:
   - `invoice_payments`
   - `reporting_snapshots`
   - `audit_logs` (should already exist from migration 008)

2. Test new features:
   - Create a quote with searchable job codes
   - Record a payment on an invoice
   - View the reports page as management/owner
   - Check audit trail

## For Users

### New Quote Features
1. **Searchable Job Codes**: When creating a quote, type to search through job codes
2. **Unaccept Quotes**: Revert an accepted quote back to sent status
3. **Delete Quotes**: Delete draft quotes (soft delete - keeps audit trail)

### New Invoice Features  
1. **Record Payments**: Click "Record Payment" to add partial or full payments
2. **Deposits**: Set optional deposit amounts when creating invoices
3. **Delete Invoices**: Delete draft invoices

### Inventory
1. **List View**: Inventory now shows in searchable table format
2. **Quick Adjust**: Use +/- buttons to adjust quantities
3. **Job Allocation**: Search inventory when allocating to jobs

### Reporting (Management/Owners Only)
- Access via sidebar: "Reports"
- View financial overview, job metrics, quote performance
- Filter by date range

### Audit Trail (Role-Based)
- Access via sidebar: "Audit"
- **Owners**: See all organization activity
- **Management**: See organization and job activity  
- **Field Staff**: See only your assigned job activity

## Important Notes

### Pro Upgrade
When upgrading to Operations Pro:
1. Subscription is updated immediately
2. New tabs appear after re-login
3. **You must log out and log back in to see new features**

### Subscription Expiry
- If subscription expires, you have 30 days read-only access
- Field staff accounts are deactivated after 30 days
- Owner/Management can still view data

### Compliance
- "Update" buttons now properly styled
- License quantity can be manually entered (1-100)

## File Locations

### Database
- Migration: `supabase/migrations/009_financial_controls_and_features.sql`
- Types: `lib/types/database.types.ts`

### Features
- Quotes: `app/(protected)/jobs/[id]/quotes/page.tsx`
- Invoices: `app/(protected)/jobs/[id]/invoices/page.tsx`
- Inventory: `app/(protected)/inventory/page.tsx`
- Reports: `app/(protected)/reports/page.tsx`
- Audit: `app/(protected)/audit/page.tsx`

### Middleware
- Subscription checks: `lib/middleware/subscription-check.ts`
- Role checks: `lib/middleware/role-check.ts`

## Troubleshooting

### Migration Fails
- Check if migration 008 has been run first
- Verify database connection
- Check Supabase logs for specific errors

### Features Not Showing
- Clear browser cache
- Log out and log back in
- Check user role and permissions

### RLS Errors
- Verify user has correct role assigned
- Check organization_id is set on profile
- Review subscription status

### Payment Not Recording
- Check invoice is not in 'paid' or 'cancelled' status
- Verify amount is positive number
- Check user has management/owner role

## Support
For issues or questions, refer to:
- Full documentation: `IMPLEMENTATION_SUMMARY.md`
- Database schema: `lib/types/database.types.ts`
- Migration file: `supabase/migrations/009_financial_controls_and_features.sql`
