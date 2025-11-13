# SVUP Notifications App - Deployment Checklist

Use this checklist to ensure all deployment steps are completed correctly.

## Pre-Deployment Setup

### 1. Firebase Configuration

- [ ] Firebase project created
- [ ] Cloud Messaging API enabled
- [ ] VAPID key generated (Project Settings → Cloud Messaging → Web Push certificates)
- [ ] Service account key downloaded (Project Settings → Service Accounts → Generate new private key)
- [ ] Firebase configuration values copied to `.env` file

### 2. Turso Database Configuration

- [ ] Turso CLI installed (`curl -sSfL https://get.tur.so/install.sh | bash`)
- [ ] Logged in to Turso (`turso auth login`)
- [ ] Database created (`turso db create svup-notifications --location aws-us-east-2`)
- [ ] Database URL obtained (`turso db show svup-notifications --url`)
- [ ] Authentication token created (`turso db tokens create svup-notifications`)
- [ ] Database schema pushed (`npm run astro db push --remote`)
- [ ] Database seeded (optional: `npm run astro db execute db/seed.ts --remote`)

### 3. Local Environment Setup

- [ ] `.env` file created from `.env.example`
- [ ] All environment variables filled in `.env`
- [ ] Local development server tested (`npm run dev`)
- [ ] Login functionality tested locally
- [ ] Notifications display tested locally
- [ ] FCM token registration tested locally

### 4. Service Worker Configuration

- [ ] `public/firebase-messaging-sw.js` updated with actual Firebase config values
- [ ] Service worker tested in local development
- [ ] Background notifications tested locally

## Netlify Deployment

### 1. Site Setup

- [ ] Netlify account created/logged in
- [ ] New site created or existing site selected
- [ ] Repository connected (if using Git deployment)
- [ ] Build settings verified:
  - Build command: `npm run build`
  - Publish directory: `dist`
  - Node version: 20

### 2. Environment Variables

Go to: **Site configuration** → **Environment variables**

#### Database Variables
- [ ] `ASTRO_DB_REMOTE_URL` added
- [ ] `ASTRO_DB_APP_TOKEN` added

#### Backend API Variable
- [ ] `BACKEND_API_URL` added (default: `https://firebackend-6c859a037589.herokuapp.com/api`)

#### Firebase Client Variables (Public)
- [ ] `PUBLIC_FIREBASE_API_KEY` added
- [ ] `PUBLIC_FIREBASE_AUTH_DOMAIN` added
- [ ] `PUBLIC_FIREBASE_PROJECT_ID` added
- [ ] `PUBLIC_FIREBASE_STORAGE_BUCKET` added
- [ ] `PUBLIC_FIREBASE_MESSAGING_SENDER_ID` added
- [ ] `PUBLIC_FIREBASE_APP_ID` added
- [ ] `PUBLIC_FIREBASE_VAPID_KEY` added

#### Firebase Admin Variables (Server-side)
- [ ] `FIREBASE_PROJECT_ID` added
- [ ] `FIREBASE_CLIENT_EMAIL` added
- [ ] `FIREBASE_PRIVATE_KEY` added (with quotes and `\n` characters)

### 3. Deploy

- [ ] Initial deployment triggered
- [ ] Build logs checked for errors
- [ ] Build completed successfully
- [ ] Site URL obtained

## Post-Deployment Verification

### 1. Basic Functionality

- [ ] Site loads without errors
- [ ] Login page displays correctly
- [ ] Login with valid credentials works
- [ ] JWT token stored in cookies
- [ ] Redirect to notifications page works
- [ ] Logout functionality works

### 2. Notifications

- [ ] Notifications page displays correctly
- [ ] Notifications list loads from database
- [ ] Notification count displays correctly
- [ ] "Нове" badge shows for new notifications
- [ ] Click on notification marks it as read
- [ ] "Всі прочитані" button works
- [ ] UI updates after marking as read

### 3. Service Worker

- [ ] Service worker registers successfully (check DevTools → Application → Service Workers)
- [ ] No errors in browser console
- [ ] Service worker scope is correct (`/`)
- [ ] Update check button works

### 4. Push Notifications

- [ ] Notification permission prompt appears
- [ ] FCM token registration works
- [ ] FCM token stored in database
- [ ] Test webhook request works:

```bash
curl -X POST https://your-site.netlify.app/api/notifications/webhook \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "notification_title": "Test notification"}'
```

- [ ] Notification appears in database
- [ ] Push notification received (foreground)
- [ ] Push notification received (background)
- [ ] Notification click opens app

### 5. Security

- [ ] HTTPS enabled (automatic with Netlify)
- [ ] Security headers present (check DevTools → Network → Response Headers)
- [ ] CSP policy working (no console errors)
- [ ] Cookies have `httpOnly`, `secure`, `sameSite` flags
- [ ] Service worker headers correct (`Service-Worker-Allowed: /`)
- [ ] CORS headers present on API endpoints

### 6. Performance

- [ ] Page load time acceptable
- [ ] Static assets cached properly
- [ ] API responses not cached
- [ ] Service worker caching working
- [ ] No unnecessary network requests

## Browser Testing

Test on multiple browsers:

- [ ] Chrome/Chromium (desktop)
- [ ] Firefox (desktop)
- [ ] Safari (desktop)
- [ ] Edge (desktop)
- [ ] Chrome (mobile)
- [ ] Safari (mobile)

## Error Scenarios

Test error handling:

- [ ] Invalid login credentials
- [ ] Invalid TOTP code
- [ ] Expired JWT token
- [ ] Network error during login
- [ ] Notification permission denied
- [ ] Invalid webhook payload
- [ ] Database connection error

## Monitoring Setup

- [ ] Netlify function logs accessible
- [ ] Error tracking configured (optional)
- [ ] Uptime monitoring configured (optional)
- [ ] Analytics configured (optional)

## Documentation

- [ ] `.env.example` updated with all variables
- [ ] `DEPLOYMENT.md` reviewed
- [ ] `NETLIFY_ENV_SETUP.md` reviewed
- [ ] Team members have access to credentials
- [ ] Credentials stored securely (password manager)

## Security Audit

- [ ] `.env` file not committed to git
- [ ] `.gitignore` includes `.env`
- [ ] No sensitive data in client-side code
- [ ] Firebase private key kept secret
- [ ] Turso token kept secret
- [ ] Service account has minimal required permissions
- [ ] CORS configured appropriately
- [ ] Rate limiting considered (if needed)

## Backup and Recovery

- [ ] Database backup strategy defined
- [ ] Environment variables documented
- [ ] Deployment rollback procedure tested
- [ ] Incident response plan created

## Final Steps

- [ ] Custom domain configured (if applicable)
- [ ] DNS records updated (if applicable)
- [ ] SSL certificate verified
- [ ] Redirect from www to non-www (or vice versa) configured
- [ ] 404 page configured
- [ ] Favicon displays correctly

## Sign-off

- [ ] Development team approval
- [ ] QA testing completed
- [ ] Stakeholder approval
- [ ] Production deployment scheduled
- [ ] Team notified of deployment

---

## Quick Reference

### Netlify Dashboard URLs

- Site overview: `https://app.netlify.com/sites/YOUR-SITE-NAME`
- Environment variables: `https://app.netlify.com/sites/YOUR-SITE-NAME/configuration/env`
- Deploy logs: `https://app.netlify.com/sites/YOUR-SITE-NAME/deploys`
- Functions logs: `https://app.netlify.com/sites/YOUR-SITE-NAME/functions`

### Useful Commands

```bash
# Check Turso database
turso db show svup-notifications

# Push database schema
npm run astro db push --remote

# Test webhook locally
curl -X POST http://localhost:4321/api/notifications/webhook \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "notification_title": "Test"}'

# Check service worker registration
# Open DevTools → Application → Service Workers

# Clear service worker cache
# DevTools → Application → Service Workers → Unregister
```

### Support Resources

- Astro Docs: https://docs.astro.build
- Firebase Docs: https://firebase.google.com/docs/cloud-messaging
- Turso Docs: https://docs.turso.tech
- Netlify Docs: https://docs.netlify.com
