# 🚀 Quick Start Guide

## Get Running in 5 Minutes

### 1. Install Dependencies (if not done)
```bash
npm install
```

### 2. Set Up Environment
Copy `ENV_TEMPLATE.md` to `.env.local` and add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Leave other values as mock for testing.

### 3. Run Database Migration
1. Open Supabase SQL Editor
2. Copy entire contents of `supabase/migrations/003_subscription_system.sql`
3. Paste and execute

### 4. Start Development
```bash
npm run dev
```

### 5. Test the System
Visit: `http://localhost:3000/get-started`

---

## 🎯 Test Flow

1. **Sign Up** → Choose plan → Complete onboarding
2. **Add Licenses** → Go to Licenses page → Add Management/Field Staff
3. **Upgrade** → Go to Subscription → Upgrade to Operations Pro
4. **Add Contractors** → Go to Contractors → Add contractor with expiry dates
5. **Check Compliance** → Go to Compliance → View auto-flagging
6. **Assign Job** → Create job → Assign contractor → Get token URL from console
7. **Test Token Access** → Open token URL in incognito → Submit progress

---

## 📝 Console Logs

Look for these in browser console:
- 🔵 `[Stripe Mock]` - Payment operations
- 📧 `[Resend Mock]` - Email operations
- ✅ Success indicators
- Token URLs for contractor access

---

## 🔐 Test Accounts

Create users with different roles:
- **Owner** - Full access, manages licenses
- **Management** - Manages jobs, can't manage licenses
- **Field Staff** - Views assigned jobs only

---

## 📚 Key Pages

| Role | Page | URL |
|------|------|-----|
| All | Get Started | `/get-started` |
| New | Subscribe | `/subscribe` |
| New | Onboarding | `/onboarding` |
| Owner | Licenses | `/licenses` |
| Owner | Subscription | `/subscription/manage` |
| Owner | Migration | `/migration` |
| Pro | Contractors | `/contractors` |
| Pro | Compliance | `/compliance` |
| Field Staff | My Jobs | `/my-jobs` |
| Public | Token Access | `/contractor-access/[token]` |

---

## ⚡ Quick Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Check for errors
npm run lint
```

---

## 🐛 Common Issues

### Build error with role-check
**Fixed!** Separated into `role-check.ts` (client) and `role-check-server.ts` (server)

### Subscription not found
Run the database migration first

### Token access denied
Check token hasn't expired (30 days default)

---

## 📖 Full Documentation

- `README.md` - Complete setup guide
- `FINAL_SUMMARY.md` - Implementation status
- `IMPLEMENTATION_COMPLETE.md` - Feature details

---

## ✅ Checklist

- [ ] Dependencies installed
- [ ] Environment variables set
- [ ] Database migration run
- [ ] Dev server started
- [ ] Tested signup flow
- [ ] Console logs working

---

**You're ready to go! 🎉**
