# Authentication System Rework Guide

## Overview

The authentication system has been completely reworked to use server-side API routes instead of database triggers. This eliminates the "Database error finding user" issue that occurred during signup.

## What Changed

### Previous Approach (Broken)
1. Client called `supabase.auth.signUp()` directly
2. Database trigger `on_auth_user_created` should create profile
3. Trigger didn't fire reliably in hosted Supabase
4. RLS policies blocked profile creation (auth.uid() was NULL)
5. Result: "Database error finding user"

### New Approach (Fixed)
1. Client calls `/api/auth/signup` API route
2. Server uses `service_role` key to create user via Admin API
3. Server creates profile with `service_role` (bypasses RLS)
4. Result: Reliable signup with guaranteed profile creation

## Files Created

### `lib/supabase/admin.ts`
Server-side Supabase client using `service_role` key. Bypasses RLS for admin operations.

### `app/api/auth/signup/route.ts`
Handles user signup:
- Validates input
- Creates user via Supabase Auth Admin API
- Creates profile with service_role (bypasses RLS)
- Returns success/error response

### `app/api/auth/ensure-profile/route.ts`
Ensures profile exists for users:
- Called after login
- Checks if profile exists
- Creates profile if missing (handles legacy users)

### `supabase/migrations/014_remove_trigger_add_service_role_policy.sql`
- Removes the problematic trigger
- Adds RLS policy for service_role

## Files Modified

### `app/(auth)/signup/page.tsx`
- Now calls `/api/auth/signup` instead of Supabase directly
- Simplified error handling
- No more fallback logic needed

### `app/(auth)/login/page.tsx`
- Calls `/api/auth/ensure-profile` after successful login
- Handles users who signed up before the fix
- Improved error messages

### `ENV_TEMPLATE.md`
- Added emphasis on `SUPABASE_SERVICE_ROLE_KEY` requirement

## Setup Instructions

### 1. Add Service Role Key

1. Go to Supabase Dashboard
2. Navigate to **Settings** → **API**
3. Copy the **service_role** key (under "Project API keys")
4. Add to your `.env.local`:

```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 2. Run Database Migration

Run this migration in Supabase SQL Editor:

```sql
-- Remove the old trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Add service role policy
DROP POLICY IF EXISTS "Service role can manage profiles" ON profiles;
CREATE POLICY "Service role can manage profiles"
  ON profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.profiles TO service_role;
```

Or run the full migration: `supabase/migrations/014_remove_trigger_add_service_role_policy.sql`

### 3. Deploy and Test

1. Restart your development server
2. Test signup with a new email
3. Verify user and profile are created
4. Test login with the new user

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         SIGNUP FLOW                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│   ┌─────────────────┐         ┌─────────────────┐                │
│   │  Signup Form    │─────────│  /api/auth/     │                │
│   │  (Client)       │  POST   │  signup         │                │
│   └─────────────────┘         └────────┬────────┘                │
│                                        │                          │
│                               ┌────────▼────────┐                │
│                               │  Admin Client   │                │
│                               │  (service_role) │                │
│                               └────────┬────────┘                │
│                                        │                          │
│                    ┌───────────────────┼───────────────────┐     │
│                    │                   │                   │     │
│           ┌────────▼────────┐ ┌────────▼────────┐          │     │
│           │  auth.admin.    │ │  profiles       │          │     │
│           │  createUser()   │ │  .insert()      │          │     │
│           │  (Auth API)     │ │  (Bypasses RLS) │          │     │
│           └────────┬────────┘ └────────┬────────┘          │     │
│                    │                   │                   │     │
│                    └───────────────────┼───────────────────┘     │
│                                        │                          │
│                               ┌────────▼────────┐                │
│                               │  Success        │                │
│                               │  Response       │                │
│                               └─────────────────┘                │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                          LOGIN FLOW                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│   ┌─────────────────┐         ┌─────────────────┐                │
│   │  Login Form     │─────────│  Supabase Auth  │                │
│   │  (Client)       │  Login  │  signIn()       │                │
│   └────────┬────────┘         └────────┬────────┘                │
│            │                           │                          │
│            │                  ┌────────▼────────┐                │
│            │                  │  Success        │                │
│            │                  │  (User exists)  │                │
│            │                  └────────┬────────┘                │
│            │                           │                          │
│   ┌────────▼────────┐                  │                          │
│   │  /api/auth/     │◄─────────────────┘                          │
│   │  ensure-profile │                                             │
│   └────────┬────────┘                                             │
│            │                                                      │
│   ┌────────▼────────┐                                             │
│   │  Check profile  │                                             │
│   │  Create if      │                                             │
│   │  missing        │                                             │
│   └────────┬────────┘                                             │
│            │                                                      │
│   ┌────────▼────────┐                                             │
│   │  Redirect to    │                                             │
│   │  dashboard or   │                                             │
│   │  subscribe      │                                             │
│   └─────────────────┘                                             │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## Troubleshooting

### "Server configuration error"
- **Cause**: `SUPABASE_SERVICE_ROLE_KEY` not set
- **Fix**: Add the service role key to your environment variables

### "This email is already registered"
- **Cause**: User already exists in auth.users
- **Fix**: Use login instead, or reset the password

### Profile not found after login
- **Cause**: User signed up before the fix
- **Fix**: The ensure-profile endpoint should create it automatically

### API route returns 500
- **Cause**: Check server logs for specific error
- **Fix**: Usually a configuration or database issue

## Security Notes

1. **Service Role Key**: Never expose in client-side code
2. **API Routes**: Only server-side code can use admin client
3. **Input Validation**: All inputs validated server-side
4. **RLS**: Still active for regular user operations

## Testing Checklist

- [ ] Service role key is configured
- [ ] Migration 014 has been run
- [ ] Signup creates user and profile
- [ ] Email verification is sent
- [ ] Login works for new users
- [ ] Login creates profile for legacy users
- [ ] Correct redirects after login
- [ ] Error messages are helpful

## Rollback Plan

If issues occur:

1. Revert code changes
2. Re-enable trigger:
   ```sql
   -- Re-create the trigger function and trigger
   -- (Use migration 011_fix_profile_creation_trigger.sql)
   ```
3. Monitor for specific errors
4. Investigate with database logs

## Summary

The authentication system now uses a server-side approach that:
- Guarantees profile creation on signup
- Handles legacy users on login
- Provides clear error messages
- Works reliably in all Supabase environments
