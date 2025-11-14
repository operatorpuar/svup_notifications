import type { APIRoute } from 'astro';
import { db, FCMToken, eq } from 'astro:db';
import { initializeApp, cert, getApps, type App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

// Initialize Firebase Admin SDK (singleton pattern)
let firebaseAdmin: App;

function getFirebaseAdmin(): App {
  if (!firebaseAdmin) {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      firebaseAdmin = existingApps[0];
    } else {
      // Validate credentials before initialization
      const projectId = import.meta.env.FIREBASE_PROJECT_ID;
      const clientEmail = import.meta.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = import.meta.env.FIREBASE_PRIVATE_KEY;

      if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Missing Firebase Admin SDK credentials');
      }

      firebaseAdmin = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n')
        })
      });
    }
  }
  return firebaseAdmin;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  
  try {
    const body = await request.json();
    let { username, notification_title } = body;
    
    // If username not provided in body, try to get from cookies
    if (!username) {
      username = cookies.get('username')?.value;
    }
    
    // Validation
    if (!username || !notification_title) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'username and notification_title are required',
        fcmMessageId: null
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Lookup FCM token for user
    const fcmRecord = await db
      .select()
      .from(FCMToken)
      .where(eq(FCMToken.username, username))
      .get();
    
    if (!fcmRecord?.fcm_token) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No FCM token registered for user',
        fcmMessageId: null
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    try {
      const admin = getFirebaseAdmin();
      const messaging = getMessaging(admin);
      
      // Generate unique notification ID
      const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      
      console.log(`[${requestId}] Sending FCM message...`);
      
      // Send FCM push notification using HTTP v1 API (via Admin SDK)
      // Include both 'notification' (for automatic display) and 'data' (for custom handling)
      const message = {
        token: fcmRecord.fcm_token,
        notification: {
          title: 'СВУП',
          body: notification_title
        },
        data: {
          notificationBody: notification_title,
          notificationId: notificationId.toString(),
          username: username.toString(),
          timestamp: new Date().toISOString()
        },
        webpush: {
          fcmOptions: {
            link: '/notifications'
          }
        }
      };
      
      const fcmMessageId = await messaging.send(message);
      
      console.log(`[${requestId}] ✅ FCM message sent successfully, ID: ${fcmMessageId}`);
      
      return new Response(JSON.stringify({
        success: true,
        fcmMessageId: fcmMessageId,
        error: null
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (fcmError: any) {
      console.error(`[${requestId}] FCM send error:`, {
        code: fcmError.code,
        message: fcmError.message,
        details: fcmError.errorInfo
      });
      // Handle invalid/expired token
      if (fcmError.code === 'messaging/invalid-registration-token' || 
          fcmError.code === 'messaging/registration-token-not-registered') {
        try {
          await db.delete(FCMToken).where(eq(FCMToken.username, username));
        } catch (deleteError: any) {
          console.error(`[${requestId}] Failed to delete invalid token:`, deleteError.message);
        }
        
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid or expired FCM token (token removed)',
          fcmMessageId: null
        }), {
          status: 410,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Handle quota exceeded
      if (fcmError.code === 'messaging/quota-exceeded') {
        return new Response(JSON.stringify({
          success: false,
          error: 'FCM quota exceeded, please try again later',
          fcmMessageId: null
        }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Handle authentication errors
      if (fcmError.code === 'messaging/authentication-error') {
        return new Response(JSON.stringify({
          success: false,
          error: 'FCM authentication failed',
          fcmMessageId: null
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Other FCM errors
      return new Response(JSON.stringify({
        success: false,
        error: `FCM send failed: ${fcmError.message}`,
        fcmMessageId: null
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
  } catch (error: any) {
    console.error(`[${requestId}] Unexpected webhook error:`, error.message);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error',
      fcmMessageId: null
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
