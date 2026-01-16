# Quick Fix Reference

## 🚨 CRITICAL: Fix Database Error First

### The Problem
Users cannot sign up - getting "Database error finding user" with 500 error.

### The Solution (5 minutes)

1. **Open Supabase Dashboard** → **SQL Editor**
2. **Click "New query"**
3. **Copy/paste this SQL**:

```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, created_at, updated_at)
  VALUES (NEW.id, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.profiles TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
```

4. **Click "Run"**
5. **Test signup** - should work now!

### Verify It Worked

```sql
-- Check trigger exists
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Should return 1 row
```

## ✅ User Experience Improvements

### What Changed

**Home Page**:
- "Start Free Trial" → "Create Free Account" (clearer)

**Get-Started Page**:
- Added: "Step 1 of 4: Choose Your Plan"
- Added visual flow diagram

**Signup Page**:
- Added: "Step 2 of 4: Create Your Account"
- Shows selected plan
- Better email verification explanation

**Login Page**:
- Added context about next steps

**Subscribe Page**:
- Added: "Step 4 of 4: Complete Subscription Setup"

### The New Flow

```
Home → Get Started → Signup → Verify Email → Login → Subscribe → Payment → Onboarding → Dashboard
  ↓         ↓           ↓           ↓           ↓         ↓          ↓           ↓           ↓
Step 1    Step 1     Step 2      Step 3      Step 3   Step 4     Step 4    Complete    Ready!
```

## 📋 Quick Test

1. ✅ Run database SQL (above)
2. ✅ Go to your app
3. ✅ Click "Create Free Account"
4. ✅ Select a plan
5. ✅ Fill in signup form
6. ✅ Check email and verify
7. ✅ Log in
8. ✅ Complete subscription
9. ✅ Complete onboarding
10. ✅ Access dashboard

## 🆘 If Something Goes Wrong

### "Database error finding user"
→ Run the SQL above in Supabase

### "User not authenticated"
→ Expected if not logged in - will redirect to signup

### Email not received
→ Check spam folder
→ Check Supabase Auth settings (email confirmations enabled)

### Redirect loop
→ Clear browser cache
→ Check organization was created in database

### Tier not showing
→ Check user metadata has `selected_tier` field

## 📁 Files Changed

- `supabase/migrations/011_fix_profile_creation_trigger.sql` - **RUN THIS SQL**
- `app/page.tsx` - Home page text
- `app/(auth)/get-started/page.tsx` - Progress indicator
- `app/(auth)/signup/page.tsx` - Progress indicator
- `app/(auth)/login/page.tsx` - Context text
- `app/(auth)/subscribe/page.tsx` - Progress indicator

## 📚 Full Documentation

- `SIGNUP_FIXES_GUIDE.md` - Complete guide with testing checklist
- `DATABASE_ERROR_FIX.md` - Detailed database fix instructions
- `FLOW_ANALYSIS_AND_FIXES.md` - Technical analysis of the flow

## 🎯 Summary

**Problem 1**: Database trigger missing → **Fix**: Run SQL migration
**Problem 2**: Confusing flow → **Fix**: Added progress indicators

**Action Required**: Run the SQL in Supabase SQL Editor (takes 1 minute)

**Result**: Users can now sign up successfully with clear guidance through each step.
