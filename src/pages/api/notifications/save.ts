import type { APIRoute } from 'astro';
import { db, Notification } from 'astro:db';

export const POST: APIRoute = async ({ request, cookies }) => {
  const requestId = `save_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  
  try {
    console.log(`[${requestId}] Save Notification API called`);
    
    // Parse request body first
    const body = await request.json();
    const { notification_title, fcm_message_id, timestamp, username: bodyUsername } = body;
    
    // Check authentication - prefer username from body (for Service Worker), fallback to cookies
    const username = bodyUsername || cookies.get('username')?.value;
    
    if (!username) {
      console.error(`[${requestId}] No username in body or cookies`);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Not authenticated',
        notification: null
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log(`[${requestId}] Authenticated user: ${username} (from ${bodyUsername ? 'body' : 'cookies'})`);
    
    console.log(`[${requestId}] Request data:`, { 
      notification_title: notification_title?.substring(0, 50),
      fcm_message_id,
      timestamp
    });
    
    // Validate
    if (!notification_title || typeof notification_title !== 'string') {
      console.error(`[${requestId}] Invalid notification_title`);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'notification_title is required',
        notification: null
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Sanitize
    const sanitizedTitle = notification_title.trim().substring(0, 500);
    
    if (sanitizedTitle.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'notification_title cannot be empty',
        notification: null
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Insert into database
    console.log(`[${requestId}] Saving to database...`);
    const insertedNotifications = await db.insert(Notification).values({
      username,
      notification_title: sanitizedTitle,
      status: 'New',
      created_at: new Date()
    }).returning();
    
    const notification = insertedNotifications[0];
    console.log(`[${requestId}] ✅ Saved successfully, ID: ${notification.id}`);
    
    return new Response(JSON.stringify({
      success: true,
      error: '',
      notification: {
        id: notification.id,
        username: notification.username,
        notification_title: notification.notification_title,
        status: notification.status,
        created_at: notification.created_at.toISOString()
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    console.error(`[${requestId}] Error:`, error.message);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error',
      notification: null
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
