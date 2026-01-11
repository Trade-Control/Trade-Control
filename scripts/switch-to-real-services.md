# Quick Migration: Switch from Mocks to Real Services

## Automated Migration (Recommended)

Run this command in your terminal from the project root:

### Windows PowerShell:
```powershell
# Switch Stripe imports
Get-ChildItem -Recurse -Include *.tsx,*.ts | ForEach-Object {
    (Get-Content $_.FullName) -replace "@/lib/services/stripe-mock", "@/lib/services/stripe" | Set-Content $_.FullName
}

# Switch Resend imports
Get-ChildItem -Recurse -Include *.tsx,*.ts | ForEach-Object {
    (Get-Content $_.FullName) -replace "@/lib/services/resend-mock", "@/lib/services/resend" | Set-Content $_.FullName
}
```

### macOS/Linux:
```bash
# Switch Stripe imports
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's|@/lib/services/stripe-mock|@/lib/services/stripe|g' {} +

# Switch Resend imports
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's|@/lib/services/resend-mock|@/lib/services/resend|g' {} +
```

## Manual Migration

If you prefer to do it manually, update these files:

### Files to Update:

1. `app/(auth)/subscribe/page.tsx`
   - Change: `from '@/lib/services/stripe-mock'` → `from '@/lib/services/stripe'`

2. `app/(protected)/subscription/manage/page.tsx`
   - Change: `from '@/lib/services/stripe-mock'` → `from '@/lib/services/stripe'`

3. `app/(protected)/licenses/add/page.tsx`
   - Change: `from '@/lib/services/stripe-mock'` → `from '@/lib/services/stripe'`

4. `app/(protected)/licenses/page.tsx`
   - Change: `from '@/lib/services/stripe-mock'` → `from '@/lib/services/stripe'`

5. `app/(protected)/migration/page.tsx`
   - Change: `from '@/lib/services/stripe-mock'` → `from '@/lib/services/stripe'`

6. `app/(protected)/jobs/[id]/quotes/page.tsx`
   - Change: `from '@/lib/services/resend-mock'` → `from '@/lib/services/resend'`

7. `app/(protected)/jobs/[id]/invoices/page.tsx`
   - Change: `from '@/lib/services/resend-mock'` → `from '@/lib/services/resend'`

8. `app/(protected)/jobs/[id]/assign-contractor/page.tsx`
   - Change: `from '@/lib/services/resend-mock'` → `from '@/lib/services/resend'`

9. `app/(protected)/compliance/page.tsx`
   - Change: `from '@/lib/services/resend-mock'` → `from '@/lib/services/resend'`

10. `app/api/webhooks/stripe/route.ts` (if it exists)
    - Change: `from '@/lib/services/stripe-mock'` → `from '@/lib/services/stripe'`

## After Migration

1. Install packages:
   ```bash
   npm install stripe resend
   ```

2. Update environment variables (see ROLLOUT_GUIDE.md)

3. Test locally before deploying

4. Deploy to Vercel
