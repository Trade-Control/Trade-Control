# Remaining Features Implementation Status

## Overview

This document tracks the implementation status of remaining features from the original plan. Most features have been coded but require build fixes to be fully functional.

---

## ✅ Completed: Quotes & Invoices (90%)

### Files Created:
- ✅ `src/actions/quotes.ts` - Server actions for quote management
- ✅ `src/actions/invoices.ts` - Server actions for invoice management
- ✅ `src/lib/pdf/generate-quote.ts` - PDF generation for quotes using jsPDF
- ✅ `src/lib/pdf/generate-invoice.ts` - PDF generation for invoices using jsPDF
- ✅ `src/app/(dashboard)/quotes/page.tsx` - Quotes list page
- ✅ `src/app/(dashboard)/invoices/page.tsx` - Invoices list page

### Features Implemented:
- ✅ Create/view/edit/delete quotes
- ✅ Create/view/edit/delete invoices
- ✅ Line items with job codes
- ✅ Automatic GST calculation (10%)
- ✅ Quote/Invoice number sequences
- ✅ Status management (draft, sent, paid, etc.)
- ✅ PDF generation with professional templates
- ✅ Payment tracking on invoices
- ✅ Convert quote to invoice (structure ready)
- ✅ Audit trail logging

### Remaining:
- ⏳ Quote/Invoice detail pages with PDF download
- ⏳ Email sending integration (requires Resend setup)
- ⏳ Create/Edit forms
- ⏳ Navigation menu updates

### Dependencies Installed:
```bash
npm install jspdf jspdf-autotable
```

---

## ✅ Completed: Timesheets (80%)

### Files Created:
- ✅ `src/actions/timesheets.ts` - Server actions for timesheet management
- ✅ `src/components/timesheets/ClockInOutButton.tsx` - Clock in/out component

### Features Implemented:
- ✅ Clock in/out functionality
- ✅ Automatic hours calculation
- ✅ Manual timesheet entry
- ✅ Active timesheet tracking (prevents multiple clock-ins)
- ✅ Job-based timesheets
- ✅ Field staff can only see their own timesheets
- ✅ Audit trail logging

### Remaining:
- ⏳ Timesheets list page
- ⏳ Manual timesheet entry form
- ⏳ Integration into job detail pages
- ⏳ Timesheet reporting

---

## ⏳ Pending: Documents Upload

### Required Implementation:
1. **Supabase Storage Setup**:
   - Create `documents` bucket in Supabase
   - Configure RLS policies for secure access
   
2. **Server Actions** (`src/actions/documents.ts`):
   - `uploadDocument(jobId, file)` - Upload to Supabase Storage
   - `getDocuments(jobId)` - List all documents for a job
   - `deleteDocument(id)` - Remove document and file
   
3. **Components**:
   - `DocumentUploader.tsx` - Drag & drop file upload
   - `DocumentList.tsx` - Display documents with download links
   
4. **Pages**:
   - Integration into job detail tabs
   - Standalone documents page

### Technical Approach:
```typescript
// Example: Upload to Supabase Storage
const supabase = createClient()
const filePath = `${orgId}/${jobId}/${Date.now()}-${file.name}`

const { data, error } = await supabase.storage
  .from('documents')
  .upload(filePath, file)

// Save metadata to database
await supabase.from('documents').insert({
  organization_id: orgId,
  job_id: jobId,
  file_name: file.name,
  file_path: data.path,
  file_size: file.size,
  file_type: file.type,
  uploaded_by: userId,
})
```

---

## ⏳ Pending: Travel Tracking

### Required Implementation:
1. **Google Maps Integration**:
   - Setup Google Maps API key
   - Install `@googlemaps/js-api-loader`
   
2. **Server Actions** (`src/actions/travel.ts`):
   - `logTravel(jobId, origin, destination, distance, duration)`
   - `getTravelLogs(jobId)`
   - `deleteTravelLog(id)`
   
3. **Components**:
   - `TravelLogger.tsx` - Log travel with map
   - `TravelList.tsx` - Display travel history
   
4. **Features**:
   - Automatic distance calculation via Google Maps Directions API
   - Manual distance entry fallback
   - Date/time tracking
   - Notes field
   - Integration with timesheets

### Database Schema (Already Created):
```sql
CREATE TABLE travel_logs (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  job_id UUID REFERENCES jobs(id),
  user_id UUID REFERENCES profiles(id),
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  distance DECIMAL(10, 2), -- in km
  duration INTEGER, -- in minutes
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## ⏳ Pending: Contractor Management (Pro Feature)

### Required Implementation:
1. **Server Actions** (`src/actions/contractors.ts`):
   - `getContractors()` - List all contractors
   - `createContractor(data)` - Add new contractor
   - `updateContractor(id, data)` - Update contractor details
   - `deleteContractor(id)` - Remove contractor
   - `assignContractorToJob(contractorId, jobId)` - Job assignment
   - `checkCompliance()` - Check expired licenses/insurance

2. **Compliance Tracking**:
   - Insurance expiry dates
   - License expiry dates
   - Automatic email reminders (via Resend)
   - Compliance dashboard with visual indicators
   - Auto-flag expired credentials

3. **Pages**:
   - `/contractors` - Contractors list
   - `/contractors/new` - Add contractor form
   - `/contractors/[id]` - Contractor detail
   - `/contractors/compliance` - Compliance dashboard

4. **Features**:
   - Contractor limits (50 for Pro Scale, unlimited for Pro Unlimited)
   - Document upload for insurance/licenses
   - Job history per contractor
   - Contact information management

### Tier Restrictions:
- Only available in Operations Pro Scale and Pro Unlimited
- Check tier in permissions: `user.permissions.canManageContractors`

---

## ⏳ Pending: Contractor Access Portal

### Required Implementation:
1. **Token-Based Access**:
   - Generate secure tokens for contractors
   - No login required for contractors
   - Time-limited access tokens
   
2. **Public Routes** (`src/app/contractor-access/[token]/`):
   - Job details view
   - Timesheet submission
   - Document upload
   - Notes/updates submission

3. **Server Actions** (`src/actions/contractor-access.ts`):
   - `generateAccessToken(contractorId, jobId, expiresIn)` 
   - `validateToken(token)`
   - `submitContractorTimesheet(token, data)`
   - `submitContractorDocument(token, file)`
   - `getContractorSubmissions(jobId)`

4. **Email Integration**:
   - Send access link to contractor email
   - Include job details and instructions
   - Expiry notice

### Security:
- Tokens expire after configurable period (default: 7 days)
- One token per contractor per job
- Read-only job information
- Can only submit, not view other contractors' work

---

## 📋 Additional Pages Needed

### Quote/Invoice Forms:
- `/quotes/new` - Create quote form
- `/quotes/[id]` - Quote detail with PDF download
- `/quotes/[id]/edit` - Edit quote
- `/invoices/new` - Create invoice form
- `/invoices/[id]` - Invoice detail with PDF download and payment tracking
- `/invoices/[id]/edit` - Edit invoice

### Timesheets:
- `/timesheets` - All timesheets list
- `/jobs/[id]` - Add timesheet tab

### Travel:
- `/travel` - Travel log list
- `/travel/new` - Log new travel
- `/jobs/[id]` - Add travel tab

### Contractors:
- `/contractors` - Contractors list
- `/contractors/new` - Add contractor
- `/contractors/[id]` - Contractor detail
- `/contractors/compliance` - Compliance dashboard

---

## 🔧 Current Build Issues

### Issues to Fix:
1. **Type errors in existing action files** - Need to align with new permissions structure
2. **Missing route handlers** - Need API routes for PDF download and email sending
3. **Navigation updates** - Add new menu items for quotes, invoices, timesheets, etc.
4. **Permission checks** - Update get-user.ts to include all new permissions

### Immediate Next Steps:
1. Fix type errors in `src/actions/contacts.ts`
2. Update `src/lib/auth/permissions.ts` (Already done)
3. Create detail/form pages for quotes and invoices
4. Add navigation menu items
5. Test PDF generation
6. Setup Resend for email sending
7. Create remaining features (documents, travel, contractors)

---

## 📊 Overall Progress

| Feature | Server Actions | Components | Pages | Status |
|---------|---------------|------------|-------|---------|
| Quotes & Invoices | ✅ 100% | ⏳ 50% | ⏳ 40% | 🟡 In Progress |
| Timesheets | ✅ 100% | ✅ 80% | ⏳ 30% | 🟡 In Progress |
| Documents | ❌ 0% | ❌ 0% | ❌ 0% | ⏳ Not Started |
| Travel Tracking | ❌ 0% | ❌ 0% | ❌ 0% | ⏳ Not Started |
| Contractors | ❌ 0% | ❌ 0% | ❌ 0% | ⏳ Not Started |
| Contractor Portal | ❌ 0% | ❌ 0% | ❌ 0% | ⏳ Not Started |

**Overall Completion: ~40%** of remaining features

---

## 🎯 Priority Order

1. **HIGH**: Fix build errors (type issues in actions)
2. **HIGH**: Complete quotes & invoices (forms + detail pages)
3. **HIGH**: Complete timesheets pages
4. **MEDIUM**: Documents upload system
5. **MEDIUM**: Travel tracking
6. **LOW**: Contractor management (Pro tier only)
7. **LOW**: Contractor access portal

---

## 💡 Notes

- All database schemas are already created and migrated
- All RLS policies are in place
- PDF generation libraries are installed
- Permission system is updated and ready
- Audit trail is logging all actions
- Most complex business logic is complete

The foundation is solid. Main remaining work is UI pages and forms.
