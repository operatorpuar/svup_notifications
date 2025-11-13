// Import Firebase scripts for service worker compatibility
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in service worker context
// IMPORTANT: Replace these placeholder values with your actual Firebase configuration
// These should match the PUBLIC_FIREBASE_* environment variables from your .env file
// Service workers cannot access environment variables, so these must be hardcoded
firebase.initializeApp({
  apiKey: 'YOUR_API_KEY',                    // Replace with PUBLIC_FIREBASE_API_KEY
  authDomain: 'YOUR_AUTH_DOMAIN',            // Replace with PUBLIC_FIREBASE_AUTH_DOMAIN
  projectId: 'YOUR_PROJECT_ID',              // Replace with PUBLIC_FIREBASE_PROJECT_ID
  storageBucket: 'YOUR_STORAGE_BUCKET',      // Replace with PUBLIC_FIREBASE_STORAGE_BUCKET
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID', // Replace with PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  appId: 'YOUR_APP_ID'                       // Replace with PUBLIC_FIREBASE_APP_ID
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);
  
  const notificationTitle = payload.notification?.title || 'СВУП';
  const notificationOptions = {
    body: payload.notification?.body || 'Нове сповіщення',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: payload.data || {}
  };
  
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();
  
  // Open the notifications page when notification is clicked
  event.waitUntil(
    clients.openWindow('/notifications')
  );
});

// Handle service worker update messages
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('SKIP_WAITING message received, activating new service worker');
    self.skipWaiting();
  }
});
