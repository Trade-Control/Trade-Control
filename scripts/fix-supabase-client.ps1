#!/usr/bin/env pwsh
# PowerShell script to batch update files for safe Supabase client usage

$files = @(
    "app/(protected)/settings/organization/page.tsx",
    "app/(protected)/licenses/add/page.tsx",
    "app/(protected)/jobs/new/page.tsx",
    "app/(protected)/job-codes/page.tsx",
    "app/(protected)/licenses/page.tsx",
    "app/(protected)/contacts/page.tsx",
    "app/(protected)/inventory/page.tsx",
    "app/(protected)/contractors/page.tsx",
    "app/(protected)/compliance/page.tsx",
    "app/(protected)/scheduling/page.tsx",
    "app/(protected)/travel-tracking/page.tsx",
    "app/(protected)/my-jobs/page.tsx",
    "app/(protected)/settings/account/page.tsx"
)

foreach ($file in $files) {
    Write-Host "Processing $file..."
    
    # Check if file contains the pattern
    $content = Get-Content $file -Raw
    
    if ($content -match "from '@/lib/supabase/client'") {
        Write-Host "  - Updating import..."
        $content = $content -replace "from '@/lib/supabase/client'", "from '@/lib/supabase/safe-client'"
        $content = $content -replace "const supabase = createClient\(\);", "const supabase = useSafeSupabaseClient();"
        
        Set-Content -Path $file -Value $content
        Write-Host "  - Updated $file" -ForegroundColor Green
    } else {
        Write-Host "  - Skipping (no pattern match)" -ForegroundColor Yellow
    }
}

Write-Host "`nDone! Remember to add null checks manually where needed." -ForegroundColor Cyan
