# Configuration Summary - SVUP Notifications App

This document provides an overview of all configuration files and their purposes.

## Configuration Files

### 1. `.env.example` - Environment Variables Template

**Purpose**: Template for required environment variables with detailed documentation

**Location**: Root directory

**Usage**: 
```bash
cp .env.example .env
# Then fill in your actual values
```

**Contains**:
- Astro DB (Turso) configuration
- External Backend API URL
- Firebase client configuration (public variables)
- Firebase Admin SDK configuration (server-side only)
- Detailed comments explaining each variable
- Security notes and deployment instructions

**Important**: Never commit `.env` to version control (already in `.gitignore`)

---

### 2. `netlify.toml` - Netlify Deployment Configuration

**Purpose**: Configure Netlify build, redirects, headers, and security settings

**Location**: Root directory

**Key Configurations**:

#### Build Settings
- Build command: `npm run build`
- Publish directory: `dist`
- Node version: 20

#### Redirects
- API routes proxied to Netlify Functions for SSR

#### Security Headers
- **Service Worker**: Proper headers for FCM functionality
  - `Service-Worker-Allowed: /`
  - No caching to ensure updates
  
- **Global Security**: Applied to all pages
  - `X-Frame-Options: DENY` (prevent clickjacking)
  - `X-Content-Type-Options: nosniff` (prevent MIME sniffing)
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy` (restrict browser features)
  - `Content-Security-Policy` (CSP) with allowed domains

- **API Endpoints**: CORS and caching headers
  - `Access-Control-Allow-Origin: *` (for webhook)
  - No caching for API responses

- **Static Assets**: Aggressive caching
  - 1 year cache for hashed assets
  - 1 day cache for images/favicon

#### Functions Configuration
- Node bundler: esbuild
- Optimized for SSR function

---

### 3. `public/firebase-messaging-sw.js` - Service Worker

**Purpose**: Handle background push notifications via Firebase Cloud Messaging

**Location**: `public/` directory (served as static file)

**Configuration Required**:
- Replace placeholder values with actual Firebase config
- Must match `PUBLIC_FIREBASE_*` environment variables
- Cannot use environment variables (service workers run in separate context)

**Functionality**:
- Handles background FCM messages
- Displays browser notifications
- Opens app when notification clicked
- Supports service worker updates

**Headers** (configured in `netlify.toml`):
- `Service-Worker-Allowed: /` - allows control of entire site
- `Cache-Control: no-cache` - ensures users get updates

---

### 4. `src/lib/firebase-client.ts` - Firebase Client Configuration

**Purpose**: Initialize Firebase SDK for client-side use

**Location**: `src/lib/` directory

**Uses Environment Variables**:
- `PUBLIC_FIREBASE_API_KEY`
- `PUBLIC_FIREBASE_AUTH_DOMAIN`
- `PUBLIC_FIREBASE_PROJECT_ID`
- `PUBLIC_FIREBASE_STORAGE_BUCKET`
- `PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `PUBLIC_FIREBASE_APP_ID`
- `PUBLIC_FIREBASE_VAPID_KEY`

**Exports**:
- `firebaseApp` - initialized Firebase app
- `messaging` - Firebase messaging instance
- `VAPID_KEY` - for FCM token generation

---

### 5. `db/config.ts` - Database Schema

**Purpose**: Define Astro DB tables and schema

**Location**: `db/` directory

**Tables**:
- `fcm_tokens` - stores user FCM tokens
- `notifications` - stores notification history

**Indexes**:
- Username indexes for efficient queries
- Timestamp indexes for sorting

---

### 6. `.gitignore` - Git Ignore Rules

**Purpose**: Exclude files from version control

**Location**: Root directory

**Key Exclusions**:
- `.env` and `.env.production` (sensitive credentials)
- `node_modules/` (dependencies)
- `dist/` (build output)
- `.astro/` (generated types)
- `.netlify/` (local Netlify folder)

---

## Environment Variables Reference

### Public Variables (Client-Side)

These are prefixed with `PUBLIC_` and are safe to expose:

| Variable | Purpose | Example |
|----------|---------|---------|
| `PUBLIC_FIREBASE_API_KEY` | Firebase API key | `AIzaSyC...` |
| `PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | `project.firebaseapp.com` |
| `PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | `my-project` |
| `PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage | `project.appspot.com` |
| `PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | FCM sender ID | `123456789` |
| `PUBLIC_FIREBASE_APP_ID` | Firebase app ID | `1:123:web:abc` |
| `PUBLIC_FIREBASE_VAPID_KEY` | Web push key | `BNxxx...` |

### Private Variables (Server-Side Only)

These must be kept secret:

| Variable | Purpose | Security Level |
|----------|---------|----------------|
| `ASTRO_DB_REMOTE_URL` | Turso database URL | 🔴 High |
| `ASTRO_DB_APP_TOKEN` | Turso auth token | 🔴 High |
| `BACKEND_API_URL` | External API endpoint | 🟡 Medium |
| `FIREBASE_PROJECT_ID` | Firebase project ID | 🟢 Low |
| `FIREBASE_CLIENT_EMAIL` | Service account email | 🔴 High |
| `FIREBASE_PRIVATE_KEY` | Service account key | 🔴 Critical |

---

## Security Configuration

### 1. Cookie Security

Configured in API endpoints (`src/pages/api/auth/login.ts`):

```typescript
cookies.set('jwt_token', token, {
  httpOnly: true,    // Prevent JavaScript access
  secure: true,      // HTTPS only
  sameSite: 'strict', // CSRF protection
  maxAge: 86400,     // 24 hours
  path: '/'
});
```

### 2. Content Security Policy (CSP)

Configured in `netlify.toml`:

- **Allowed domains**:
  - Firebase: `https://www.gstatic.com`, `https://fcm.googleapis.com`, `https://firebase.googleapis.com`
  - Backend API: `https://firebackend-6c859a037589.herokuapp.com`
  - Turso: `https://*.turso.io`, `wss://*.turso.io`

- **Restrictions**:
  - No frames allowed (`frame-src 'none'`)
  - No objects allowed (`object-src 'none'`)
  - Upgrade insecure requests to HTTPS

### 3. CORS Configuration

Configured in `netlify.toml` for `/api/*` endpoints:

```toml
Access-Control-Allow-Origin = "*"
Access-Control-Allow-Methods = "GET, POST, OPTIONS"
Access-Control-Allow-Headers = "Content-Type, Authorization"
```

**Note**: For production, consider restricting `Access-Control-Allow-Origin` to specific domains.

---

## Deployment Workflow

### 1. Local Development

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Fill in .env with your values
# Edit .env file

# Update service worker with Firebase config
# Edit public/firebase-messaging-sw.js

# Start development server
npm run dev
```

### 2. Netlify Deployment

```bash
# Push code to repository
git add .
git commit -m "Ready for deployment"
git push

# Or deploy directly
netlify deploy --prod
```

### 3. Post-Deployment

1. Add environment variables in Netlify dashboard
2. Trigger new deployment
3. Verify all functionality
4. Test push notifications
5. Monitor logs for errors

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Service worker not registering | Check headers in `netlify.toml`, ensure HTTPS |
| Push notifications not working | Verify Firebase config in service worker matches env vars |
| Database connection fails | Check Turso credentials, ensure token is valid |
| Build fails | Verify all environment variables are set in Netlify |
| CORS errors | Check `netlify.toml` CORS headers for `/api/*` |
| CSP violations | Check browser console, update CSP in `netlify.toml` |

### Debug Commands

```bash
# Check environment variables locally
cat .env

# Test database connection
npm run astro db push --remote

# Check Netlify environment variables
netlify env:list

# View Netlify logs
netlify logs:function ssr

# Test webhook
curl -X POST https://your-site.netlify.app/api/notifications/webhook \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "notification_title": "Test"}'
```

---

## Maintenance

### Regular Tasks

- **Weekly**: Check Netlify function logs for errors
- **Monthly**: Review and rotate credentials if needed
- **Quarterly**: Update dependencies (`npm update`)
- **Yearly**: Review and update security headers

### Credential Rotation

If credentials are compromised:

1. **Firebase**: Generate new service account key
2. **Turso**: Create new authentication token
3. **Update**: Replace in Netlify environment variables
4. **Deploy**: Trigger new deployment
5. **Verify**: Test all functionality

---

## Additional Resources

- **Deployment Guide**: See `DEPLOYMENT.md` for detailed deployment instructions
- **Netlify Setup**: See `NETLIFY_ENV_SETUP.md` for quick Netlify configuration
- **Checklist**: See `DEPLOYMENT_CHECKLIST.md` for comprehensive deployment checklist

---

## Support

For configuration issues:

- **Astro**: https://docs.astro.build
- **Firebase**: https://firebase.google.com/docs
- **Turso**: https://docs.turso.tech
- **Netlify**: https://docs.netlify.com
