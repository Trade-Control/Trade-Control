# Prerender Fix for Supabase Client Components

## Issue
Client components that use `createClient()` at the component level fail during build/prerender because environment variables are not available at build time on Cloudflare Pages.

## Solution
Use the `useSafeSupabaseClient()` hook instead of directly calling `createClient()`.

## Files Fixed
- [x] app/organization-setup/page.tsx
- [x] app/(protected)/contractors/onboard/page.tsx
- [ ] app/(protected)/settings/organization/page.tsx
- [ ] app/(protected)/jobs/[id]/assign-contractor/page.tsx
- [ ] app/(protected)/licenses/add/page.tsx
- [ ] app/(protected)/jobs/new/page.tsx
- [ ] app/(protected)/job-codes/page.tsx
- [ ] app/(protected)/jobs/[id]/quotes/page.tsx
- [ ] app/(protected)/licenses/page.tsx
- [ ] app/contractor-onboard/[token]/page.tsx
- [ ] app/(auth)/signup/page.tsx
- [ ] app/(protected)/jobs/[id]/timesheets/page.tsx
- [ ] app/(auth)/subscribe/page.tsx
- [ ] app/(protected)/jobs/[id]/documents/page.tsx
- [ ] app/(auth)/onboarding/page.tsx
- [ ] app/(protected)/migration/page.tsx
- [ ] components/jobs/TimesheetClock.tsx
- [ ] app/(protected)/contractors/submissions/page.tsx
- [ ] app/(protected)/jobs/[id]/inventory-allocation/page.tsx
- [ ] components/jobs/DocumentUpload.tsx
- [ ] app/contractor-access/[token]/page.tsx
- [ ] app/(protected)/contacts/page.tsx
- [ ] app/(protected)/contractors/submissions/[id]/page.tsx
- [ ] app/(protected)/jobs/[id]/invoices/[invoiceId]/view/page.tsx
- [ ] app/(protected)/jobs/[id]/invoices/page.tsx
- [ ] app/(protected)/subscription/manage/page.tsx
- [ ] app/(protected)/reports/page.tsx
- [ ] components/jobs/InvoiceGenerator.tsx
- [ ] components/jobs/QuoteForm.tsx
- [ ] app/(protected)/layout.tsx
- [ ] components/layout/Sidebar.tsx
- [ ] app/(auth)/login/page.tsx
- [ ] app/(protected)/jobs/[id]/travel/page.tsx
- [ ] app/(protected)/compliance/page.tsx
- [ ] app/(protected)/contractors/page.tsx
- [ ] app/contractor-access/[token]/submit/page.tsx
- [ ] app/(protected)/licenses/[id]/assign/page.tsx
- [ ] app/(protected)/inventory/page.tsx
- [ ] app/(protected)/travel-tracking/page.tsx
- [ ] app/(protected)/jobs/[id]/quotes/[quoteId]/view/page.tsx
- [ ] app/(protected)/scheduling/page.tsx
- [ ] app/(protected)/jobs/[id]/page.tsx
- [ ] app/(protected)/jobs/[id]/activity/page.tsx
- [ ] app/(protected)/my-jobs/page.tsx
- [ ] app/(protected)/audit/page.tsx
- [ ] app/(protected)/contractors/[id]/page.tsx
- [ ] app/(protected)/settings/account/page.tsx

## Quick Fix Pattern

### Before
```typescript
import { createClient } from '@/lib/supabase/client';

export default function MyComponent() {
  const supabase = createClient();
  // ... rest of component
}
```

### After
```typescript
import { useSafeSupabaseClient } from '@/lib/supabase/safe-client';

export default function MyComponent() {
  const supabase = useSafeSupabaseClient();
  
  // Add null check before first usage
  if (!supabase) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Configuration error. Please check your environment variables.</p>
      </div>
    );
  }
  
  // ... rest of component
  // Add guards to all supabase usage: if (!supabase) return;
}
```

## Automatic Fix Script

Run this to fix all remaining files:

```bash
# This will be a manual process - too many files to automate safely
```
