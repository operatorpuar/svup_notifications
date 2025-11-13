# SVUP Notifications App - Deployment Guide

## Prerequisites

Before deploying to Netlify, ensure you have:

1. **Turso Database** set up and configured
2. **Firebase Project** created with Cloud Messaging enabled
3. **Firebase Service Account** credentials downloaded
4. **Netlify Account** with site created

## Environment Variables Setup

### Step 1: Prepare Your Environment Variables

Copy `.env.example` to `.env` and fill in all values:

```bash
cp .env.example .env
```

### Step 2: Configure Netlify Environment Variables

Go to your Netlify site dashboard:

1. Navigate to: **Site Settings** → **Environment Variables**
2. Click **Add a variable** for each of the following:

#### Required Variables

| Variable Name | Description | Example Value |
|--------------|-------------|---------------|
| `ASTRO_DB_REMOTE_URL` | Turso database URL | `libsql://your-db.turso.io` |
| `ASTRO_DB_APP_TOKEN` | Turso authentication token | `eyJhbGc...` |
| `BACKEND_API_URL` | External backend API endpoint | `https://firebackend-6c859a037589.herokuapp.com/api` |
| `PUBLIC_FIREBASE_API_KEY` | Firebase API key (public) | `AIzaSyC...` |
| `PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | `your-project.firebaseapp.com` |
| `PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | `your-project-id` |
| `PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | `your-project.appspot.com` |
| `PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | `123456789` |
| `PUBLIC_FIREBASE_APP_ID` | Firebase app ID | `1:123:web:abc` |
| `PUBLIC_FIREBASE_VAPID_KEY` | Firebase VAPID key for web push | `BNxxx...` |
| `FIREBASE_PROJECT_ID` | Firebase project ID (server) | `your-project-id` |
| `FIREBASE_CLIENT_EMAIL` | Service account email | `firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | Service account private key | `"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"` |

#### Important Notes

- **FIREBASE_PRIVATE_KEY**: Must include the quotes and `\n` characters for line breaks
- **PUBLIC_* variables**: These are safe to expose (designed for client-side use)
- **Server-only variables**: Keep `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, and `ASTRO_DB_APP_TOKEN` secret

### Step 3: Verify Configuration

After adding all environment variables:

1. Go to **Deploys** tab
2. Click **Trigger deploy** → **Clear cache and deploy site**
3. Monitor the build logs for any errors

## Firebase Configuration

### 1. Enable Cloud Messaging

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Project Settings** → **Cloud Messaging**
4. Enable **Cloud Messaging API (Legacy)** if not already enabled

### 2. Generate VAPID Key

1. In Firebase Console, go to **Project Settings** → **Cloud Messaging**
2. Scroll to **Web Push certificates**
3. Click **Generate key pair**
4. Copy the key and add it as `PUBLIC_FIREBASE_VAPID_KEY`

### 3. Download Service Account Key

1. Go to **Project Settings** → **Service Accounts**
2. Click **Generate new private key**
3. Download the JSON file
4. Extract the following values:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (keep the `\n` characters!)

## Turso Database Setup

### 1. Create Database

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Login to Turso
turso auth login

# Create database
turso db create svup-notifications --location aws-us-east-2

# Get database URL
turso db show svup-notifications --url

# Create authentication token
turso db tokens create svup-notifications
```

### 2. Push Database Schema

```bash
# From your project directory
npm run astro db push --remote
```

### 3. Seed Database (Optional)

```bash
# Run seed script
npm run astro db execute db/seed.ts --remote
```

## Netlify Configuration

### Build Settings

The `netlify.toml` file is already configured with:

- ✅ Build command: `npm run build`
- ✅ Publish directory: `dist`
- ✅ API redirects for SSR endpoints
- ✅ Security headers (CSP, CORS, X-Frame-Options, etc.)
- ✅ Service worker headers for FCM
- ✅ Cache control for static assets

### Custom Domain (Optional)

1. Go to **Domain Settings**
2. Click **Add custom domain**
3. Follow the DNS configuration instructions

## Testing the Deployment

### 1. Test Authentication

1. Visit your deployed site
2. Try logging in with valid credentials
3. Verify JWT token is stored in cookies
4. Check that you're redirected to `/notifications`

### 2. Test Notifications

1. Send a test webhook request:

```bash
curl -X POST https://your-site.netlify.app/api/notifications/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "notification_title": "Test notification"
  }'
```

2. Verify the notification appears in the database
3. Check that FCM push notification is sent

### 3. Test Service Worker

1. Open browser DevTools → Application → Service Workers
2. Verify `firebase-messaging-sw.js` is registered
3. Check for any errors in the console

### 4. Test Push Notifications

1. Grant notification permission when prompted
2. Send a test notification via webhook
3. Verify notification appears (foreground and background)

## Troubleshooting

### Build Fails

- **Check environment variables**: Ensure all required variables are set
- **Check build logs**: Look for specific error messages
- **Verify Node version**: Should be Node 20 (configured in netlify.toml)

### Service Worker Not Working

- **Check headers**: Verify `Service-Worker-Allowed` header is set
- **Check HTTPS**: Service workers require HTTPS (Netlify provides this)
- **Clear cache**: Try clearing browser cache and re-registering

### Push Notifications Not Received

- **Check FCM token**: Verify token is stored in database
- **Check Firebase credentials**: Ensure service account has correct permissions
- **Check browser permissions**: Verify notification permission is granted
- **Check console**: Look for FCM errors in browser console

### Database Connection Issues

- **Verify Turso credentials**: Check `ASTRO_DB_REMOTE_URL` and `ASTRO_DB_APP_TOKEN`
- **Check network**: Ensure Netlify can reach Turso (should work by default)
- **Check schema**: Run `npm run astro db push --remote` to sync schema

### CORS Errors

- **Check netlify.toml**: Verify CORS headers are configured for `/api/*`
- **Check CSP**: Ensure `connect-src` includes all required domains
- **Check webhook origin**: If restricting CORS, add allowed origins

## Security Checklist

- [ ] All environment variables are set in Netlify (not in code)
- [ ] `.env` file is in `.gitignore` (never committed)
- [ ] `FIREBASE_PRIVATE_KEY` is kept secret
- [ ] `ASTRO_DB_APP_TOKEN` is kept secret
- [ ] HTTPS is enabled (automatic with Netlify)
- [ ] Security headers are configured in `netlify.toml`
- [ ] CSP policy allows only necessary domains
- [ ] Cookies are set with `httpOnly`, `secure`, and `sameSite` flags

## Monitoring and Maintenance

### Check Logs

1. **Netlify Functions Logs**: Site Settings → Functions → View logs
2. **Build Logs**: Deploys tab → Click on a deploy
3. **Browser Console**: Check for client-side errors

### Update Dependencies

```bash
# Check for updates
npm outdated

# Update dependencies
npm update

# Update Astro
npm install astro@latest
```

### Rotate Credentials

If credentials are compromised:

1. **Firebase**: Generate new service account key
2. **Turso**: Create new authentication token
3. **Update Netlify**: Replace environment variables
4. **Redeploy**: Trigger new deployment

## Support

For issues or questions:

- **Astro Docs**: https://docs.astro.build
- **Firebase Docs**: https://firebase.google.com/docs
- **Turso Docs**: https://docs.turso.tech
- **Netlify Docs**: https://docs.netlify.com
