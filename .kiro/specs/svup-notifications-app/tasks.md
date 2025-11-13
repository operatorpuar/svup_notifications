# Implementation Plan

- [x] 1. Configure Astro for SSR and setup database schema
  - Enable SSR mode with Netlify adapter in astro.config.mjs
  - Define FCMToken and Notification tables in db/config.ts with proper columns and indexes
  - Create database seed file with sample data for development
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 2. Install and configure Firebase dependencies
  - Install firebase, firebase-admin, and required npm packages
  - Create Firebase client configuration file at src/lib/firebase-client.ts
  - Create environment variable template with Firebase and Backend API configuration
  - _Requirements: 5.1, 5.7, 6.5_

- [x] 3. Implement authentication utilities and middleware
  - Create auth middleware function in src/lib/auth-middleware.ts for JWT validation
  - Implement cookie management utilities for secure token storage
  - _Requirements: 1.3, 2.5_

- [x] 4. Build login page with TOTP authentication
  - Create src/pages/index.astro with dark theme (#1E293B background)
  - Implement login form with username, password, and TOTP code fields
  - Add client-side form validation to enable submit button only when all fields are filled
  - Implement form submission handler that calls /api/auth/login endpoint
  - Add error message display for authentication failures
  - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 1.7_

- [x] 5. Create authentication API endpoints
- [x] 5.1 Implement login endpoint at src/pages/api/auth/login.ts
  - Validate input fields (username, password, totp_code)
  - Proxy authentication request to external Backend API
  - Store JWT token and username in HTTP-only secure cookies
  - Return appropriate error messages for different failure scenarios
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 5.2 Implement logout endpoint at src/pages/api/auth/logout.ts
  - Call external Backend API logout-all endpoint with JWT token
  - Clear JWT token and username cookies
  - Return success response
  - _Requirements: 2.2, 2.3_

- [x] 6. Build notifications display page
  - Create src/pages/notifications.astro with authentication check
  - Implement server-side logic to fetch notifications from Turso DB
  - Design header with SVUP logo, update check button, and logout button
  - Create notifications section with "Сповіщення (n)" heading and "Всі прочитані" button
  - Render notification containers with title, timestamp (dd.mm.yy hh:mm format), and conditional "Нове" badge
  - Sort notifications by created_at in descending order
  - _Requirements: 2.1, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 7. Implement FCM client-side integration
- [x] 7.1 Add Firebase initialization script to notifications page
  - Initialize Firebase app with client configuration
  - Request notification permission from user's browser
  - Retrieve FCM registration token when permission is granted
  - Call /api/fcm/register-token endpoint to store token
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 7.2 Implement foreground message handler
  - Set up onMessage listener for FCM messages
  - Add new notification to UI dynamically when message arrives
  - Update notification count in heading
  - _Requirements: 5.5_

- [x] 8. Create FCM token registration endpoint
  - Implement src/pages/api/fcm/register-token.ts endpoint
  - Validate authentication using auth middleware
  - Implement upsert logic to insert new or update existing FCM token
  - Store username and fcm_token with timestamps in FCMToken table
  - _Requirements: 5.4, 7.3_

- [x] 9. Implement notification management endpoints
- [x] 9.1 Create mark-read endpoint at src/pages/api/notifications/mark-read.ts
  - Validate authentication using auth middleware
  - Support marking single notification as read by ID
  - Support marking all notifications as read for current user
  - Update notification status from "New" to "Read" in database
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 10. Add client-side notification interaction handlers
  - Implement click handler on notification containers to mark individual notification as read
  - Implement "Всі прочитані" button handler to mark all notifications as read
  - Update UI to remove "Нове" badge when notification is marked as read
  - Update notification count in heading after status changes
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 11. Build webhook endpoint for receiving notifications
  - Create src/pages/api/notifications/webhook.ts endpoint
  - Validate webhook payload contains username and notification_title
  - Insert new notification record into Turso DB with status "New"
  - Query FCMToken table to retrieve user's FCM token
  - Initialize Firebase Admin SDK with service account credentials
  - Send push notification via Firebase Admin SDK if FCM token exists
  - Return success response with created notification data
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [x] 12. Create and configure Firebase service worker
  - Create public/firebase-messaging-sw.js service worker file
  - Import Firebase scripts for service worker compatibility
  - Initialize Firebase in service worker context
  - Implement onBackgroundMessage handler to display notifications
  - Add notification click handler to open notifications page
  - _Requirements: 5.6, 5.7_

- [x] 13. Implement app update check functionality
  - Add update check button handler in notifications page header
  - Check for service worker updates when button is clicked
  - Display message to user when new version is available
  - Implement reload functionality to update service worker
  - Display "up to date" message when no updates are available
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 14. Add error handling and user feedback
  - Implement error display for authentication failures (invalid credentials, TOTP, blacklisted token)
  - Add error handling for FCM permission denied scenario
  - Implement network error handling with retry capability
  - Add loading states for async operations (login, logout, mark as read)
  - _Requirements: 1.4, 1.5, 1.6, 2.4_

- [x] 15. Style components with Tailwind CSS
  - Apply dark theme styling to login page with #1E293B background
  - Style login form with centered layout and proper spacing
  - Design notification containers with proper layout for title, timestamp, and badge
  - Style "Нове" badge with distinctive appearance
  - Implement responsive design for mobile devices
  - Style header with logo, buttons, and proper alignment
  - _Requirements: 1.1, 3.1, 3.4_

- [x] 16. Configure environment variables and deployment
  - Document all required environment variables in .env.example
  - Configure Netlify deployment settings in netlify.toml
  - Set up service worker headers for proper caching
  - Configure CORS and security headers
  - Add environment variables to Netlify dashboard
  - _Requirements: 2.5, 5.7, 6.5_

- [ ]* 17. Test authentication and session management
  - Test login with valid credentials and TOTP code
  - Test login with invalid username/password
  - Test login with invalid TOTP code
  - Test token expiration and blacklist scenarios
  - Test logout functionality and cookie clearing
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 2.2, 2.3_

- [ ]* 18. Test notification functionality
  - Test webhook endpoint with valid and invalid payloads
  - Test notification display and sorting
  - Test mark as read for individual notifications
  - Test mark all as read functionality
  - Test notification count updates
  - _Requirements: 3.5, 3.6, 4.1, 4.2, 4.3, 6.1, 6.2, 6.6_

- [ ]* 19. Test FCM integration
  - Test FCM token registration and storage
  - Test foreground message reception and display
  - Test background message reception via service worker
  - Test notification click behavior
  - Test FCM permission denied scenario
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.5_
