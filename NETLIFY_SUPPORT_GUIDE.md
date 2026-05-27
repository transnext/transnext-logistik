# Netlify Deployment Issue - Supabase Login Not Working

## Problem Summary

My Next.js application at **transnext.de** builds successfully but the admin login is not working because the deployed version appears to be outdated or missing environment variables.

## Expected Behavior

- Admin should be able to login at: `https://transnext.de/admin`
- Using Supabase authentication
- Admin credentials:
  - Email: `n.mandzel@transnext.de`
  - Password: [set in Supabase]
  - Role: `admin` (configured in Supabase `profiles` table)

## Current Issue

Login fails with error: **"Ungültige Zugangsdaten oder keine Admin-Berechtigung"** (Invalid credentials or no admin permission)

The Supabase database is correctly configured:
- User exists and is confirmed
- Profile exists with `role = 'admin'`
- Supabase connection works from local build

## Site Configuration

- **Site Name:** transnext
- **Site URL:** https://transnext.de
- **Site ID:** `20ac1966-14ce-48a9-88bb-b2f467d558af`
- **Framework:** Next.js 15.3.2
- **Build Command:** `bun run build`
- **Publish Directory:** `out`
- **Export Type:** Static export (`output: 'export'` in next.config.js)

## Required Environment Variables

The following environment variables MUST be set in Netlify:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://jrghrymgjkpyfnopzxyp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZ2hyeW1namtweWZub3B6eHlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNjI0OTEsImV4cCI6MjA3OTczODQ5MX0.HozQj-Z-9GChXgB_XGgq1s30bv5bSRUkPDGc792WOJM
```

## Files to Check

### 1. `next.config.js`
Should contain:
```javascript
const nextConfig = {
  output: 'export',
  distDir: 'out',
  // ... other config
};
```

### 2. `netlify.toml`
Should contain:
```toml
[build]
  command = "bun run build"
  publish = "out"
```

### 3. `src/lib/supabase.ts`
Uses the environment variables correctly:
```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### 4. `src/app/admin/page.tsx`
Login logic with Supabase Auth and role check

## Steps to Fix

### Option 1: Fresh Deploy (Recommended)

1. **Verify environment variables are set:**
   - Go to: Site settings → Environment variables
   - Ensure both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are present
   - Values should match those listed above

2. **Clear cache and redeploy:**
   - Go to: Deploys → Trigger deploy → Clear cache and deploy site
   - Wait for build to complete
   - Verify build succeeds (should take ~2-3 minutes)

3. **Test the deployment:**
   - Visit: https://transnext.de/admin
   - Try login with admin credentials
   - Should redirect to `/admin/dashboard` on success

### Option 2: Manual Deploy

If automated builds fail, accept a manual deployment:

1. Download the pre-built `out/` folder from the repository
2. Use Netlify's drag-and-drop interface at: https://app.netlify.com/drop
3. Deploy to site: transnext (20ac1966-14ce-48a9-88bb-b2f467d558af)

## Verification Steps

After deployment, verify:

1. **Environment variables are loaded:**
   - Check browser console at https://transnext.de
   - Should NOT see errors about missing Supabase URL/key

2. **Supabase client initializes:**
   - Open browser DevTools → Network tab
   - Login attempt should make request to: `https://jrghrymgjkpyfnopzxyp.supabase.co/auth/v1/token`

3. **Admin login works:**
   - Email: `n.mandzel@transnext.de`
   - Should authenticate and redirect to dashboard

## Build Output Should Show

```
Route (app)                                 Size  First Load JS
┌ ○ /                                      186 B         110 kB
├ ○ /admin                                1.7 kB         170 kB
├ ○ /admin/dashboard                     9.21 kB         203 kB
├ ○ /fahrerportal                        1.31 kB         169 kB
...
○  (Static)  prerendered as static content
```

All routes should be marked as `○ (Static)`.

## Common Issues

### Issue: "out directory does not exist"
**Solution:** Ensure `distDir: 'out'` is in `next.config.js`

### Issue: "Supabase is not defined"
**Solution:** Verify environment variables are set and start with `NEXT_PUBLIC_`

### Issue: "Invalid login credentials"
**Solution:**
- Check Supabase database has user with email `n.mandzel@transnext.de`
- Check `profiles` table has matching entry with `role = 'admin'`
- Password was set in Supabase Authentication panel

## Additional Information

- **Local build works perfectly** - issue is only on deployed version
- **Previous deploys failed** due to missing `distDir` configuration (now fixed)
- **Site is currently live** but running old code without Supabase integration
- **Latest code is ready** - just needs fresh deployment with correct env vars

## Contact

If you need access to the repository or have questions:
- Developer: Nicholas Mandzel
- Email: n.mandzel@transnext.de

## Expected Timeline

This should be a quick fix:
1. Set environment variables: 2 minutes
2. Trigger new deploy: 3 minutes
3. Test login: 1 minute

**Total: ~6 minutes**

Thank you for your help!
