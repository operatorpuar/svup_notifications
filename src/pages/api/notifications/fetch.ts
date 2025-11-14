import type { APIRoute } from 'astro';
import { db, Notification, eq, desc } from 'astro:db';

export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    // Check authentication
    const username = cookies.get('username')?.value;
    
    if (!username) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Not authenticated' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get pagination parameters
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Fetch all notifications for this user
    const allNotifications = await db
      .select()
      .from(Notification)
      .where(eq(Notification.username, username))
      .orderBy(desc(Notification.created_at));

    // Filter only unread notifications
    const unreadNotifications = allNotifications.filter(n => n.status === 'New');
    
    // Apply pagination to unread notifications
    const paginatedNotifications = unreadNotifications.slice(offset, offset + limit);

    const totalCount = unreadNotifications.length;
    const unreadCount = totalCount;

    return new Response(JSON.stringify({
      success: true,
      notifications: paginatedNotifications,
      totalCount,
      unreadCount,
      hasMore: totalCount > (page * limit)
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Fetch notifications error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to fetch notifications'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
