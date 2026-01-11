# User Entry and Onboarding Flow Refactoring - Summary

## Overview
This document summarizes all changes made to refactor the user entry and onboarding flow based on the provided requirements.

## 1. Database Schema Changes

### New Migration: `006_add_organization_profile_fields.sql`
Added comprehensive organization profile fields:
- `trading_name` - Trading name (if different from business name)
- `gst_registered` - Boolean for GST registration status
- `logo_url` - URL/path to organization logo for invoices and quotes
- `brand_color` - Primary brand color in hex format (default: #2563eb)
- `website_url` - Organization website URL
- `billing_email` - Email address for billing and financial communications
- `job_code_prefix` - Prefix for auto-generated job codes (default: 'JOB')
- `quote_prefix` - Prefix for auto-generated quote numbers (default: 'QT')
- `invoice_prefix` - Prefix for auto-generated invoice numbers (default: 'INV')
- `payment_details` - Payment details (BSB, Account Number, etc.) for invoices

## 2. Sign-up Page Updates

**File:** `app/(auth)/signup/page.tsx`

### Changes:
- ✅ Changed "Full Name" field to separate "First Name" and "Last Name" fields
- ✅ Both fields are now required
- ✅ First and last names are stored in user metadata during signup
- ✅ Profile is automatically updated with first and last name after user creation

## 3. Onboarding Page Updates

**File:** `app/(auth)/onboarding/page.tsx`

### Changes:
- ✅ Pre-populates first name and last name from user profile (captured during signup)
- ✅ Added all mandatory fields in business step:
  - Business Name (required)
  - Trading Name (required)
  - ABN (required)
  - GST Status dropdown (required)
  - Business Phone (required)
  - Business Email (required)
  - Billing Email Address (required)
  - Website URL (required)
  - Business Physical/Registered Address with autocomplete (required)
  - City, State, Postcode (required, auto-populated from address)
  - Logo URL (required)
  - Brand Colour with color picker (required)
  - Job Code Prefix (required, default: 'JOB')
  - Quote Prefix (required, default: 'QT')
  - Invoice Prefix (required, default: 'INV')
  - Payment Details textarea (required)
- ✅ Owner profile step shows pre-populated first/last name
- ✅ Owner phone is now required

## 4. Address Autocomplete Component

**File:** `components/AddressAutocomplete.tsx`

### Changes:
- ✅ Global Australia-only restriction applied to all address predictions and geocoding
- ✅ `componentRestrictions: { country: 'au' }` is set in the autocomplete configuration
- ✅ This ensures all address inputs throughout the app are restricted to Australian addresses

## 5. Organization Settings Page

**File:** `app/(protected)/settings/organization/page.tsx`

### Changes:
- ✅ Added all new mandatory fields from onboarding
- ✅ All fields are now required (marked with red asterisk)
- ✅ Uses AddressAutocomplete component for address input
- ✅ Added color picker for brand color
- ✅ Added text inputs for prefixes (Job Code, Quote, Invoice)
- ✅ Added textarea for payment details
- ✅ Form validation ensures all required fields are filled
- ✅ Organized into clear sections: Business Information, Business Address, Branding & Document Settings

## 6. License Allocation Updates

**File:** `app/(protected)/licenses/[id]/assign/page.tsx`

### Changes:
- ✅ Removed prompt saying "The user must already have an account or will need to create one"
- ✅ Auto-creates user accounts in the background if they don't exist
- ✅ Uses Supabase Auth Admin API to create users with temporary password
- ✅ Generates password reset link via Supabase
- ✅ Sends invitation email with password reset link using Resend
- ✅ Email includes user details, organization name, and role information
- ✅ Logs email communication in the database
- ✅ Updates help text to: "If the user doesn't have an account, we'll create one and send them an email to set their password"

### New Email Template: `generateUserInvitationEmail()`
**File:** `lib/services/resend-mock.ts`

- Professional email template with Trade Control branding
- Includes first name, last name, email, company name, role, and password reset link
- Clear instructions for new users to set their password
- Branded styling consistent with other system emails

## 7. User Account Settings Page (NEW)

**File:** `app/(protected)/settings/account/page.tsx`

### New Features:
- ✅ Created dedicated account settings page for password changes
- ✅ Users can change their password securely
- ✅ Validates current password before allowing change
- ✅ Enforces password strength requirements (minimum 6 characters)
- ✅ Confirms new password matches
- ✅ Shows success/error messages
- ✅ Includes security tips for users
- ✅ Clean, professional UI consistent with the rest of the app

## 8. Invoice and Quote Updates

### Quote Generator
**File:** `components/jobs/QuoteForm.tsx`

- ✅ Uses organization's custom `quote_prefix` for quote numbering
- ✅ Fetches organization settings to apply custom prefix

### Invoice Generator
**File:** `components/jobs/InvoiceGenerator.tsx`

- ✅ Uses organization's custom `invoice_prefix` for invoice numbering
- ✅ Fetches organization settings to apply custom prefix

### Quote View Page
**File:** `app/(protected)/jobs/[id]/quotes/[quoteId]/view/page.tsx`

- ✅ Displays organization logo at the top (if provided)
- ✅ Uses brand color for:
  - "QUOTE" heading
  - Border colors
  - Table header background (15% opacity)
  - Total amount color
- ✅ Shows website URL in header
- ✅ Professional layout optimized for printing/PDF

### Invoice View Page
**File:** `app/(protected)/jobs/[id]/invoices/[invoiceId]/view/page.tsx`

- ✅ Displays organization logo at the top (if provided)
- ✅ Uses brand color for:
  - "INVOICE" heading
  - Border colors
  - Table header background (15% opacity)
  - Balance due/amount due color
- ✅ Shows website URL in header
- ✅ Displays payment details section with BSB, account number, etc.
- ✅ Professional layout optimized for printing/PDF

## 9. Field Mapping

### Logo Field
- Stored in: `organizations.logo_url`
- Used in: Quote view page, Invoice view page
- Display: Image component with max height of 80px, auto width
- Positioned: Top right of invoice/quote header

### Brand Colour Field
- Stored in: `organizations.brand_color` (hex format, e.g., #2563eb)
- Used in: Quote view page, Invoice view page
- Applied to:
  - Document heading (QUOTE/INVOICE)
  - Border colors
  - Table header backgrounds (with 15% opacity)
  - Total/Balance amounts
- Default: #2563eb (primary blue)

### Document Prefixes
- Job Code Prefix: Used in job numbering
- Quote Prefix: Used in quote numbering (e.g., "QT-0001")
- Invoice Prefix: Used in invoice numbering (e.g., "INV-0001")

### Payment Details
- Stored in: `organizations.payment_details`
- Used in: Invoice view page
- Display: Dedicated section showing BSB, account number, account name
- Format: Multiline text preserved with whitespace

## 10. Summary of Files Modified

### New Files Created:
1. `supabase/migrations/006_add_organization_profile_fields.sql`
2. `app/(protected)/settings/account/page.tsx`

### Files Modified:
1. `app/(auth)/signup/page.tsx`
2. `app/(auth)/onboarding/page.tsx`
3. `components/AddressAutocomplete.tsx`
4. `app/(protected)/settings/organization/page.tsx`
5. `app/(protected)/licenses/[id]/assign/page.tsx`
6. `lib/services/resend-mock.ts`
7. `components/jobs/QuoteForm.tsx`
8. `components/jobs/InvoiceGenerator.tsx`
9. `app/(protected)/jobs/[id]/quotes/[quoteId]/view/page.tsx`
10. `app/(protected)/jobs/[id]/invoices/[invoiceId]/view/page.tsx`

## 11. Testing Checklist

### Sign-up Flow:
- [ ] Sign up with first name and last name
- [ ] Verify fields are required
- [ ] Check that names are captured in user metadata

### Onboarding Flow:
- [ ] Verify first/last name pre-populate in owner step
- [ ] Test address autocomplete (Australia only)
- [ ] Verify all mandatory fields are enforced
- [ ] Test GST status dropdown
- [ ] Test color picker for brand color
- [ ] Verify prefixes are saved correctly
- [ ] Test payment details textarea

### Organization Settings:
- [ ] Verify all fields are editable
- [ ] Test address autocomplete in settings
- [ ] Verify form validation for required fields
- [ ] Test color picker updates
- [ ] Verify changes are saved correctly

### License Allocation:
- [ ] Assign license to new user (doesn't exist)
- [ ] Verify user is created automatically
- [ ] Check invitation email is sent
- [ ] Verify password reset link works
- [ ] Assign license to existing user
- [ ] Verify user is updated correctly

### Account Settings:
- [ ] Navigate to account settings page
- [ ] Test password change with correct current password
- [ ] Test password change with incorrect current password
- [ ] Verify password strength validation
- [ ] Test password confirmation matching

### Invoice/Quote Display:
- [ ] Create quote and view it
- [ ] Verify logo displays correctly
- [ ] Verify brand color is applied
- [ ] Test print/PDF functionality
- [ ] Create invoice and view it
- [ ] Verify payment details section appears
- [ ] Verify custom prefixes are used

## 12. Notes

### Migration Required:
- The new migration file `006_add_organization_profile_fields.sql` must be applied to the database
- This will add all new columns to the organizations table
- Existing organizations will have default values for new fields

### User Experience Improvements:
- Streamlined onboarding with pre-populated data
- Clearer field labels and requirements
- Professional invoice/quote appearance with branding
- Seamless user creation for license allocation
- Secure password management via account settings

### Australia-Only Address Restriction:
- All address inputs throughout the app now restrict to Australian addresses
- This includes onboarding, organization settings, and any other forms using AddressAutocomplete
- Provides better UX for Australian businesses

### Branding Consistency:
- Logo and brand color are consistently applied across quotes and invoices
- Professional appearance enhances business credibility
- Payment details section makes it easy for clients to pay

## 13. Future Enhancements (Optional)

- Add logo upload functionality (currently accepts URL)
- Add more color customization options (secondary color, text color)
- Add invoice template selection (different layouts)
- Add email template customization
- Add support for multiple currencies
- Add automated email reminders for overdue invoices
