# Supabase Storage Setup for Organization Logos

This guide will help you set up the Supabase Storage bucket required for the logo upload feature.

## Quick Setup

### Step 1: Create the Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Enter the following details:
   - **Name:** `organization-logos`
   - **Public bucket:** ✅ Enabled (check this box)
5. Click **Create bucket**

### Step 2: Set Up Storage Policies

After creating the bucket, you need to add security policies. Here are the SQL commands:

#### Option A: Using Supabase SQL Editor

1. Go to **SQL Editor** in your Supabase Dashboard
2. Click **New query**
3. Copy and paste the SQL below
4. Click **Run**

```sql
-- Policy 1: Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'organization-logos');

-- Policy 2: Allow public read access to all logos
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'organization-logos');

-- Policy 3: Allow authenticated users to update their uploads
CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'organization-logos');

-- Policy 4: Allow authenticated users to delete their uploads
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'organization-logos');
```

#### Option B: Using Storage Policy Editor

1. Go to **Storage** in Supabase Dashboard
2. Click on the `organization-logos` bucket
3. Click on **Policies** tab
4. Click **New policy**

**For Upload Policy:**
- Operation: INSERT
- Target roles: authenticated
- Policy definition: `bucket_id = 'organization-logos'`
- Click **Review** and **Save policy**

**For Read Policy:**
- Operation: SELECT
- Target roles: public
- Policy definition: `bucket_id = 'organization-logos'`
- Click **Review** and **Save policy**

**For Update Policy:**
- Operation: UPDATE
- Target roles: authenticated
- Policy definition: `bucket_id = 'organization-logos'`
- Click **Review** and **Save policy**

**For Delete Policy:**
- Operation: DELETE
- Target roles: authenticated
- Policy definition: `bucket_id = 'organization-logos'`
- Click **Review** and **Save policy**

## Verification

### Test the Setup

1. Go to your application's onboarding page
2. Try uploading a logo image
3. If successful, you should see:
   - Image preview appears
   - No errors in browser console
   - Logo saved to organization

### Check in Supabase Dashboard

1. Go to **Storage** → `organization-logos`
2. You should see uploaded files
3. Click on a file to get its public URL
4. Paste the URL in a browser - image should load

## Troubleshooting

### Problem: Upload fails with "Permission denied"

**Solution:** Check that policies are correctly set. Run this query to verify:

```sql
SELECT * FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%organization-logos%';
```

You should see 4 policies (INSERT, SELECT, UPDATE, DELETE).

### Problem: Images upload but don't display

**Solution:** 
1. Ensure bucket is set to **public**
2. Check the public URL format matches: `https://[project-id].supabase.co/storage/v1/object/public/organization-logos/[filename]`

### Problem: File size too large error

**Solution:** 
- The app limits uploads to 5MB
- Supabase default limit is 50MB
- If you need to change the app limit, edit `app/(auth)/onboarding/page.tsx`:

```typescript
// Change this line
if (file.size > 5 * 1024 * 1024) {
  // To your preferred size (in bytes)
  if (file.size > 10 * 1024 * 1024) { // 10MB example
```

### Problem: Wrong file type uploaded

**Solution:** The app validates file types client-side. Accepted types:
- image/jpeg
- image/jpg  
- image/png
- image/gif
- image/webp

To add more types, edit `app/(auth)/onboarding/page.tsx`:

```typescript
// Change this line
if (!file.type.startsWith('image/')) {
```

## Security Best Practices

### Current Setup (Recommended for Most Cases)

- ✅ Public read access - Anyone can view logos (needed for invoices/quotes)
- ✅ Authenticated write - Only logged-in users can upload
- ✅ No anonymous uploads - Prevents spam

### Alternative: More Restrictive Setup

If you want only organization members to see logos:

```sql
-- Remove public read policy
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;

-- Add authenticated read policy
CREATE POLICY "Allow authenticated read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'organization-logos');
```

**Note:** This will prevent logos from appearing on invoices/quotes sent to customers unless they're also logged in.

### Alternative: Allow User-Specific Access

If you want users to only access their own organization's logo:

```sql
-- Remove public read policy
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;

-- Add organization-specific read policy
CREATE POLICY "Allow organization read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'organization-logos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**Note:** This requires changing the upload path to include user ID or organization ID.

## Storage Limits

### Supabase Free Tier
- 1GB storage
- 2GB bandwidth per month
- 50MB max file size

### Supabase Pro Tier
- 100GB storage
- 200GB bandwidth per month
- 5GB max file size

### Monitoring Usage

1. Go to Supabase Dashboard → **Settings** → **Billing**
2. Check **Storage** and **Bandwidth** usage
3. Set up alerts if approaching limits

## Cleanup

### Remove Old/Unused Logos

Create a scheduled function to clean up old logos:

```sql
-- Find logos not referenced by any organization
SELECT * FROM storage.objects 
WHERE bucket_id = 'organization-logos'
AND name NOT IN (
  SELECT REPLACE(logo_url, 'https://[your-project].supabase.co/storage/v1/object/public/organization-logos/', '')
  FROM organizations
  WHERE logo_url IS NOT NULL
);
```

Then delete them:
1. Go to **Storage** → `organization-logos`
2. Select unused files
3. Click **Delete**

## Migration Script

If you need to migrate existing logo URLs to the new storage:

```typescript
// Run this in your app or as a script
const migrateLogos = async () => {
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, logo_url')
    .not('logo_url', 'is', null);
  
  for (const org of orgs || []) {
    // If logo_url is an external URL, download and re-upload
    if (org.logo_url.startsWith('http') && !org.logo_url.includes('supabase')) {
      try {
        const response = await fetch(org.logo_url);
        const blob = await response.blob();
        const file = new File([blob], 'logo.png', { type: blob.type });
        
        // Upload to Supabase Storage
        const fileName = `${org.id}-${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from('organization-logos')
          .upload(fileName, file);
        
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('organization-logos')
            .getPublicUrl(fileName);
          
          // Update organization
          await supabase
            .from('organizations')
            .update({ logo_url: publicUrl })
            .eq('id', org.id);
        }
      } catch (err) {
        console.error(`Failed to migrate logo for org ${org.id}:`, err);
      }
    }
  }
};
```

## Summary

After completing this setup:
- ✅ Users can upload logo images during onboarding
- ✅ Logos are stored securely in Supabase Storage
- ✅ Logos are publicly accessible for invoices/quotes
- ✅ Only authenticated users can upload/modify logos

If you have any issues, check the Troubleshooting section or contact support.
