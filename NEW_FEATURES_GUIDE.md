# Trade Control - New Features Guide

This guide covers all the newly implemented features in your Trade Control application.

## 🎉 What's New

### 1. **Contacts Management** ✅
Full CRUD (Create, Read, Update, Delete) functionality for managing customers and suppliers.

**Features:**
- Add new contacts (customers or suppliers)
- Edit existing contact information
- Delete contacts
- Search and filter contacts
- View contact details including:
  - Company name and contact person
  - Email, phone, and mobile
  - Full address details
  - ABN
  - Notes

**Location:** `/contacts`

---

### 2. **Job Codes Management** ✅
Manage standardized job items with preset pricing for quick quote generation.

**Features:**
- Create job codes with descriptions and pricing
- Set unit types (each, hour, day, metre, etc.)
- Categorize job codes
- Mark codes as active/inactive
- Search and filter by category
- Quick pricing lookup for quotes

**Location:** `/job-codes`

---

### 3. **Inventory Management** ✅
Comprehensive inventory tracking system with low stock alerts.

**Features:**
- Add and manage inventory items
- Track quantity with quick +/- adjustments
- Set reorder levels with automatic low stock alerts
- Track unit costs and total inventory value
- Organize by location and category
- SKU management
- Real-time inventory value calculations

**Location:** `/inventory`

**Dashboard Stats:**
- Total items count
- Low stock items alert
- Total inventory value

---

### 4. **Inventory Allocation to Jobs** ✅
Allocate inventory items to specific jobs and track material usage.

**Features:**
- Allocate inventory items to jobs
- Automatically deduct from inventory
- Return inventory to stock
- Track allocated quantities and values
- Add notes to allocations
- View total allocated value per job

**Location:** `/jobs/[id]/inventory-allocation`

**How it works:**
1. Go to a job's Inventory tab
2. Click "Allocate Inventory"
3. Select an item and quantity (can't exceed available stock)
4. Inventory is automatically reduced
5. Can return items to stock at any time

---

### 5. **Tabbed Job Interface** ✅
Improved job detail page with easy-to-navigate tabs.

**New Tab Layout:**
- **Details** - Job information
- **Quotes** - Quote management
- **Invoices** - Invoice generation
- **Timesheets** - Time tracking
- **Documents** - File management
- **Inventory** - Material allocation
- **Travel** - Travel tracking (new!)

**Location:** `/jobs/[id]`

---

### 6. **Google Maps Integration** ✅

#### Address Autocomplete
Automatic address suggestions for all address fields across the application.

**Features:**
- Real-time address suggestions as you type
- Automatic population of city, state, and postcode
- Restricted to Australian addresses
- Works in:
  - Contact forms
  - Job site addresses
  - Organization setup
  - Travel tracking

**Component:** `AddressAutocomplete.tsx`

---

### 7. **Travel Tracking (Standalone)** ✅
Track travel distance and time between locations.

**Features:**
- Automatic route calculation using Google Maps
- Manual entry option
- Optional job association
- Track:
  - Origin and destination addresses
  - Distance in kilometers
  - Duration in minutes
  - Notes
- Summary statistics:
  - Total trips
  - Total distance
  - Total time

**Location:** `/travel-tracking`

**How to use:**
1. Click "Log Travel"
2. Enter origin and destination addresses (autocomplete enabled)
3. Click "Calculate Route" for automatic calculation OR
4. Check "Manual Entry" to enter distance/time manually
5. Optionally associate with a job
6. Save the log

---

### 8. **Travel Tracking (Job-Specific)** ✅
Track travel specifically for individual jobs.

**Features:**
- Pre-filled with job site address
- All travel tracking features
- Automatic job association
- Job-specific summary statistics
- View all travel logs for a job

**Location:** `/jobs/[id]/travel`

**Access from:** Job details page → Travel tab

---

## 🔧 Setup Requirements

### Database Migration

Run the new migration file in your Supabase SQL Editor:

```sql
-- File: supabase/migrations/002_inventory_and_travel.sql
```

This creates:
- `job_inventory_allocations` table
- `travel_logs` table
- Row Level Security policies
- Necessary triggers

### Environment Variables

Update your `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### Google Maps API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable these APIs:
   - **Places API** (for address autocomplete)
   - **Directions API** (for route calculation)
   - **Maps JavaScript API** (for map functionality)
4. Create credentials → API Key
5. Restrict the API key:
   - Application restrictions: HTTP referrers
   - Add your domain(s)
   - API restrictions: Select the 3 APIs above
6. Copy the API key to your `.env.local` file

**Important:** For development, you can use an unrestricted key, but ALWAYS restrict it for production!

---

## 📦 Dependencies

The following packages were installed:

```bash
npm install @googlemaps/js-api-loader
```

This package is used for loading the Google Maps JavaScript API.

---

## 🎯 Usage Tips

### Contacts
- Use the type filter to quickly switch between customers and suppliers
- Search works across name, company, email, and phone
- Contacts can be selected when creating new jobs

### Job Codes
- Create codes for frequently used items/services
- Use categories to organize codes
- Mark inactive codes you no longer use (they won't appear in quotes)
- Codes are used in the quote generation system

### Inventory
- Set reorder levels to get automatic low stock alerts
- Use the "Low Stock Only" filter to see what needs reordering
- The total value helps track your inventory investment
- Use locations to track where items are stored

### Travel Tracking
- For regular routes, save time by using "Calculate Route"
- Manual entry is useful for approximate distances
- Associate travel with jobs for better job costing
- Export data (future feature) for tax/reimbursement purposes

---

## 🔐 Security Notes

All new features include:
- Row Level Security (RLS) policies
- Organization-based data isolation
- Proper authentication checks
- Secure API key handling

---

## 🚀 Next Steps

1. **Run the database migration** in Supabase
2. **Add Google Maps API key** to `.env.local`
3. **Restart your development server**: `npm run dev`
4. **Test the new features:**
   - Add a contact
   - Create some job codes
   - Add inventory items
   - Create a job and allocate inventory
   - Try the travel tracking with route calculation

---

## 📝 Known Limitations

- Google Maps API requires a valid API key to work
- Address autocomplete is restricted to Australian addresses
- Travel route calculation requires valid addresses
- Inventory allocation can't be partially returned (all or nothing)

---

## 🐛 Troubleshooting

### Address autocomplete not working
- Check that `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set in `.env.local`
- Verify the API key has Places API enabled
- Check browser console for API errors
- Ensure you've restarted the dev server after adding the key

### Route calculation fails
- Verify Directions API is enabled in Google Cloud
- Check that both addresses are valid
- Ensure addresses are in Australia (or remove region restriction)
- Check API key restrictions aren't too strict

### Inventory allocation errors
- Ensure you're not allocating more than available quantity
- Check that inventory item still exists
- Verify you have the necessary permissions

---

## 💡 Feature Enhancements (Future)

Potential improvements:
- Partial inventory returns
- Travel logs export for tax purposes
- Bulk inventory updates
- Job code templates
- Contact import/export
- Integration with accounting software

---

## 📚 Technical Details

### New Database Tables

**job_inventory_allocations**
- Links inventory items to jobs
- Tracks quantity allocated
- Timestamps allocation

**travel_logs**
- Records travel details
- Optionally links to jobs
- Stores calculated or manual data

### New Components

**AddressAutocomplete**
- Reusable component for address input
- Google Places Autocomplete integration
- Australian address parsing

### New Pages

1. `/contacts` - Contact management
2. `/job-codes` - Job codes management
3. `/inventory` - Inventory management
4. `/travel-tracking` - Standalone travel tracking
5. `/jobs/[id]/inventory-allocation` - Job inventory
6. `/jobs/[id]/travel` - Job-specific travel

---

## 🎓 Best Practices

1. **Always set reorder levels** for inventory items you regularly use
2. **Use job codes** to standardize pricing and speed up quotes
3. **Associate travel with jobs** for accurate job costing
4. **Keep contact information updated** for smooth communication
5. **Review low stock alerts** regularly to avoid running out

---

## 📞 Support

For issues or questions:
1. Check this guide
2. Review the main README.md
3. Check browser console for errors
4. Verify database migrations ran successfully
5. Ensure all environment variables are set

---

**Enjoy your enhanced Trade Control application! 🎉**
