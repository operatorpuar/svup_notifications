// Import Firebase scripts for service worker compatibility
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in service worker context
// Service workers cannot access environment variables, so these must be hardcoded
firebase.initializeApp({
  apiKey: 'AIzaSyBwJ7Mh4DGxVTBYsZyS2p6dAb8gpVJELwc',
  authDomain: 'svup-notifications.firebaseapp.com',
  projectId: 'svup-notifications',
  storageBucket: 'svup-notifications.firebasestorage.app',
  messagingSenderId: '1045455308957',
  appId: '1:1045455308957:web:8798c07a9ef087e9f8ac74'
});

const messaging = firebase.messaging();

// IndexedDB helper function for fallback storage
async function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('NotificationsDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending-notifications')) {
        db.createObjectStore('pending-notifications', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// Save notification to database with fallback to IndexedDB
async function saveNotificationToDB(data) {
  try {
    const response = await fetch('/api/notifications/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Include cookies for authentication
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`Save failed with status: ${response.status}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('[SW] Failed to save notification:', error.message);
    
    // Fallback: Store in IndexedDB for retry later
    try {
      const db = await openIndexedDB();
      const transaction = db.transaction(['pending-notifications'], 'readwrite');
      const store = transaction.objectStore('pending-notifications');
      await store.add({ ...data, failedAt: new Date().toISOString() });
      console.log('[SW] Notification stored in IndexedDB for retry');
    } catch (dbError) {
      console.error('[SW] Failed to store in IndexedDB:', dbError.message);
    }
    
    throw error;
  }
}

// Handle background messages. Called when:
// - the app is in the background (not focused)
// - the app is completely closed
messaging.onBackgroundMessage(async (payload) => {
  console.log('[SW] ===== BACKGROUND MESSAGE RECEIVED =====');
  console.log('[SW] Full payload:', JSON.stringify(payload, null, 2));
  console.log('[SW] payload.data:', payload.data);
  
  // Extract notification data from payload.data (data-only message)
  const notificationTitle = payload.data?.title || 'СВУП';
  const notificationBody = payload.data?.body || payload.data?.notificationBody || 'Нове сповіщення';
  const notificationId = payload.data?.notificationId;
  const username = payload.data?.username;
  const timestamp = payload.data?.timestamp || new Date().toISOString();
  
  console.log('[SW] Extracted data:', {
    title: notificationTitle,
    body: notificationBody,
    notificationId,
    username
  });
  
  // Customize notification here
  const notificationOptions = {
    body: notificationBody,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'svup-notification',
    requireInteraction: false,
    data: {
      url: '/notifications',
      notificationBody: notificationBody,
      notificationId: notificationId,
      timestamp: timestamp
    }
  };
  
  console.log('[SW] Showing notification with options:', notificationOptions);
  
  // Show notification
  try {
    await self.registration.showNotification(notificationTitle, notificationOptions);
    console.log('[SW] ✅ Notification shown successfully');
  } catch (error) {
    console.error('[SW] ❌ Failed to show notification:', error);
  }
  
  // Save to database (with IndexedDB fallback on failure)
  try {
    await saveNotificationToDB({
      notification_title: notificationBody,
      fcm_message_id: notificationId,
      username: username, // Pass username to API
      timestamp: timestamp
    });
    console.log('[firebase-messaging-sw.js] Notification saved to database');
  } catch (error) {
    console.error('[firebase-messaging-sw.js] Failed to save, stored in IndexedDB for retry');
  }
});

// Handle notification click - open or focus app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/notifications';
  
  // Check if app is already open, focus it; otherwise open new window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if found
        for (const client of clientList) {
          if (client.url.includes('/notifications') && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window if not found
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
      .catch((error) => {
        console.error('[SW] Error handling notification click:', error.message);
      })
  );
});

// Handle service worker update messages
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
