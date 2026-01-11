# Resend Email Troubleshooting Guide

## ❌ Common Issue: "API Connection Works But Emails Don't Send"

### Root Cause: Domain Verification Required

**You do NOT need webhooks to send emails.** Webhooks are only for receiving events (email opened, bounced, etc.).

The most common issue is **domain verification**. Resend has two modes:

### 1. **Free Tier / Testing Mode** ✅
- **FROM email must be:** `onboarding@resend.dev`
- **Limit:** 100 emails/day
- **No domain verification needed**
- **Use this for:** Development and testing

### 2. **Production Mode** ✅
- **FROM email can be:** Any email from your verified domain (e.g., `noreply@yourdomain.com`)
- **Requires:** Domain verification in Resend Dashboard
- **Use this for:** Production applications

---

## 🔍 How to Diagnose

### Step 1: Check Debug Page
Visit `/debug/resend` to see:
- ✅ API key is set correctly
- ✅ API connection works
- ⚠️ Domain verification status

### Step 2: Send Test Email
On the debug page, use the "Test Email" feature:
1. Enter your email address
2. Click "Send Test"
3. Check the error message (if any)

### Common Error Messages:

#### ❌ "Domain not verified"
**Solution:** 
- Use `onboarding@resend.dev` as FROM email for testing
- Or verify your domain in Resend Dashboard

#### ❌ "Unauthorized" or "401"
**Solution:**
- Check `RESEND_API_KEY` in Vercel environment variables
- Verify API key is active in Resend Dashboard

#### ❌ "Rate limit exceeded"
**Solution:**
- Free tier: 100 emails/day limit
- Check usage in Resend Dashboard
- Upgrade plan if needed

---

## ✅ Quick Fixes

### Fix 1: Use Resend Test Domain (Immediate)

**Update `RESEND_FROM_EMAIL` in Vercel:**
```
RESEND_FROM_EMAIL=onboarding@resend.dev
```

**Or update code default** (already done):
```typescript
// lib/services/resend.ts
const DEFAULT_FROM_EMAIL = 'onboarding@resend.dev';
```

**Then redeploy** your Vercel application.

### Fix 2: Verify Your Domain (Production)

1. **Go to Resend Dashboard:** https://resend.com/domains
2. **Click "Add Domain"**
3. **Enter your domain** (e.g., `tradecontrol.app`)
4. **Add DNS records** to your domain:
   - SPF record
   - DKIM records
   - DMARC record (optional)
5. **Wait for verification** (usually 5-10 minutes)
6. **Update `RESEND_FROM_EMAIL`** to use your verified domain:
   ```
   RESEND_FROM_EMAIL=Trade Control <noreply@yourdomain.com>
   ```
7. **Redeploy** your application

---

## 🧪 Testing Your Setup

### Option 1: Use Debug Page Test Feature
1. Visit `/debug/resend`
2. Enter your email in "Test Email" section
3. Click "Send Test"
4. Check your inbox

### Option 2: Test via API
```bash
curl -X POST https://your-app.vercel.app/api/debug/resend/test-email \
  -H "Content-Type: application/json" \
  -d '{"to": "your@email.com"}'
```

### Option 3: Check Application Logs
When sending emails from your app, check:
- Browser console (for client-side errors)
- Vercel function logs (for server-side errors)
- Resend Dashboard → Logs (for email delivery status)

---

## 📋 Checklist

- [ ] `RESEND_API_KEY` is set in Vercel environment variables
- [ ] `RESEND_FROM_EMAIL` is set to `onboarding@resend.dev` (for testing) OR verified domain (for production)
- [ ] API connection test passes on `/debug/resend`
- [ ] Test email sends successfully from debug page
- [ ] Domain is verified in Resend Dashboard (if using custom domain)
- [ ] DNS records are correct (if using custom domain)
- [ ] Application has been redeployed after setting environment variables

---

## 🚨 Still Not Working?

### Check These:

1. **Environment Variables:**
   - Are they set in Vercel Dashboard?
   - Are they set for the correct environment (Production/Preview/Development)?
   - Did you redeploy after adding them?

2. **Email Addresses:**
   - Is the recipient email valid?
   - Check spam/junk folder
   - Try a different email address

3. **Resend Dashboard:**
   - Check API key is active
   - Check email logs for delivery status
   - Check if you've hit rate limits

4. **Code Issues:**
   - Are you using `@/lib/services/resend` (not `resend-mock`)?
   - Check browser console for errors
   - Check Vercel function logs

---

## 📚 Resources

- **Resend Dashboard:** https://resend.com
- **Resend Documentation:** https://resend.com/docs
- **Domain Verification Guide:** https://resend.com/docs/dashboard/domains/introduction
- **API Reference:** https://resend.com/docs/api-reference/emails/send-email

---

## Summary

**You don't need webhooks to send emails.** The issue is likely:

1. ✅ **API connection works** (you confirmed this)
2. ❌ **Domain not verified** → Use `onboarding@resend.dev` for testing
3. ❌ **FROM email incorrect** → Set `RESEND_FROM_EMAIL=onboarding@resend.dev`
4. ❌ **Not redeployed** → Redeploy after setting environment variables

**Quick fix:** Set `RESEND_FROM_EMAIL=onboarding@resend.dev` in Vercel and redeploy!
