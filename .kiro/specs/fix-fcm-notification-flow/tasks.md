# Implementation Plan

- [x] 1. Create new Save Notification API endpoint
  - Create `/api/notifications/save.ts` file with POST handler
  - Implement authentication check using cookies
  - Add database insert logic for Notification table
  - Add error handling and validation
  - Return created notification with success status
  - _Requirements: 2.1, 2.2, 2.3, 4.4_

- [x] 2. Update Webhook API to only send FCM
  - Remove database insert code from `/api/notifications/webhook.ts`
  - Keep only FCM token lookup and message sending
  - Update response format to return fcmMessageId
  - Add error handling for invalid/expired tokens
  - Update logging to reflect new flow
  - _Requirements: 1.1, 4.1, 4.2_

- [x] 3. Update client-side foreground message handler
  - [x] 3.1 Add saveNotificationToDB function in notifications.astro
    - Create async function to call save API
    - Add retry logic with MAX_RETRIES = 2
    - Add 1 second delay between retries
    - Store failed notifications in localStorage as fallback
    - _Requirements: 2.1, 2.4, 4.3_

  - [x] 3.2 Update onMessage callback
    - Extract notification data from payload
    - Show browser notification first
    - Call saveNotificationToDB after showing notification
    - Update UI only after successful save
    - Show toast notification
    - _Requirements: 1.3, 2.1, 3.1, 3.2, 3.5_

  - [x] 3.3 Add localStorage fallback handling
    - Create function to check for pending notifications on page load
    - Retry saving pending notifications from localStorage
    - Clear localStorage after successful save
    - _Requirements: 4.3_

- [x] 4. Update Service Worker background message handler
  - [x] 4.1 Update onBackgroundMessage callback
    - Extract notification data from payload
    - Show system notification with self.registration.showNotification
    - Call save API using fetch in SW context
    - Add error handling for fetch failures
    - _Requirements: 1.4, 5.1, 5.2, 5.5_

  - [x] 4.2 Add IndexedDB fallback for Service Worker
    - Create openIndexedDB helper function
    - Store failed notifications in IndexedDB
    - Add retry logic when app opens
    - _Requirements: 4.3_

  - [x] 4.3 Update notificationclick handler
    - Check if app is already open using clients.matchAll
    - Focus existing window if found
    - Open new window to /notifications if not found
    - Pass notification data to opened window
    - _Requirements: 5.3, 5.4_

- [x] 5. Add retry mechanism for failed saves
  - Create retryPendingNotifications function
  - Check localStorage and IndexedDB on app load
  - Attempt to save all pending notifications
  - Remove successfully saved items
  - Log failures for monitoring
  - _Requirements: 2.4, 4.3_

- [x] 6. Update error handling and logging
  - Add detailed console logging for each step
  - Log FCM send success/failure with messageId
  - Log database save attempts and results
  - Add error messages for user-facing errors
  - Update toast notifications for different error types
  - _Requirements: 4.4, 4.5_

- [x] 7. Remove unused code and cleanup
  - Remove database insert code from webhook.ts
  - Remove unused imports
  - Update comments to reflect new flow
  - Clean up console.log statements
  - _Requirements: All_

- [ ]* 8. Update documentation
  - Update FCM_IMPLEMENTATION.md with new flow
  - Update TESTING_NOTIFICATIONS.md with new test cases
  - Add troubleshooting section for common issues
  - Document retry mechanisms and fallback storage
  - _Requirements: All_
