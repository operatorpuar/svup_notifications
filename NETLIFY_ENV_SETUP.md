# Quick Reference: Netlify Environment Variables Setup

This is a quick checklist for setting up environment variables in the Netlify dashboard.

## Access Environment Variables

1. Log in to [Netlify](https://app.netlify.com/)
2. Select your site
3. Go to: **Site configuration** → **Environment variables**
4. Click **Add a variable**

## Variables to Add

Copy and paste these variable names and add your actual values:

### Database Configuration

```
ASTRO_DB_REMOTE_URL
ASTRO_DB_APP_TOKEN
```

### Backend API

```
BACKEND_API_URL
```

### Firebase Client (Public)

```
PUBLIC_FIREBASE_API_KEY
PUBLIC_FIREBASE_AUTH_DOMAIN
PUBLIC_FIREBASE_PROJECT_ID
PUBLIC_FIREBASE_STORAGE_BUCKET
PUBLIC_FIREBASE_MESSAGING_SENDER_ID
PUBLIC_FIREBASE_APP_ID
PUBLIC_FIREBASE_VAPID_KEY
```

### Firebase Admin (Server-side)

```
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

## Important Notes

### FIREBASE_PRIVATE_KEY Format

When adding `FIREBASE_PRIVATE_KEY`, make sure to:

1. Include the surrounding quotes: `"-----BEGIN PRIVATE KEY-----\n..."`
2. Keep the `\n` characters (they represent line breaks)
3. The full value should look like:
   ```
   "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
   ```

### Scopes

All variables should be set for:
- ✅ Production
- ✅ Deploy previews (optional but recommended)
- ✅ Branch deploys (optional but recommended)

## After Adding Variables

1. Click **Save** for each variable
2. Go to **Deploys** tab
3. Click **Trigger deploy** → **Clear cache and deploy site**
4. Wait for build to complete
5. Check build logs for any errors

## Verification

After deployment, verify:

- [ ] Site loads without errors
- [ ] Login works
- [ ] Notifications page is accessible
- [ ] Service worker registers successfully
- [ ] Push notifications can be received

## Getting Values

### Turso Database

```bash
turso db show svup-notifications --url
turso db tokens create svup-notifications
```

### Firebase

1. **Client config**: Firebase Console → Project Settings → General → Your apps
2. **VAPID key**: Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
3. **Service account**: Firebase Console → Project Settings → Service Accounts → Generate new private key

## Troubleshooting

### Build fails with "Missing environment variable"

- Double-check variable names (they're case-sensitive)
- Ensure no extra spaces in variable names
- Verify all required variables are added

### "Invalid private key" error

- Check `FIREBASE_PRIVATE_KEY` format
- Ensure quotes and `\n` characters are included
- Try copying directly from the downloaded JSON file

### Database connection fails

- Verify `ASTRO_DB_REMOTE_URL` format: `libsql://your-db.turso.io`
- Check `ASTRO_DB_APP_TOKEN` is valid (tokens can expire)
- Ensure database exists and is accessible
