import type { AstroCookies } from 'astro';

/**
 * Authentication middleware for validating JWT tokens and managing user sessions
 */

/**
 * Validates authentication by checking for JWT token and username in cookies
 * 
 * @param cookies - Astro cookies object
 * @returns username if authenticated, null otherwise
 */
export function requireAuth(cookies: AstroCookies): string | null {
  const token = cookies.get('jwt_token')?.value;
  const username = cookies.get('username')?.value;
  
  if (!token || !username) {
    return null;
  }
  
  return username;
}

/**
 * Gets the JWT token from cookies
 * 
 * @param cookies - Astro cookies object
 * @returns JWT token if exists, null otherwise
 */
export function getAuthToken(cookies: AstroCookies): string | null {
  return cookies.get('jwt_token')?.value || null;
}

/**
 * Gets the username from cookies
 * 
 * @param cookies - Astro cookies object
 * @returns username if exists, null otherwise
 */
export function getUsername(cookies: AstroCookies): string | null {
  return cookies.get('username')?.value || null;
}

/**
 * Cookie configuration for secure token storage
 */
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict' as const,
  maxAge: 86400, // 24 hours
  path: '/'
};

/**
 * Stores authentication credentials in secure HTTP-only cookies
 * 
 * @param cookies - Astro cookies object
 * @param token - JWT access token
 * @param username - Username to store
 */
export function setAuthCookies(
  cookies: AstroCookies,
  token: string,
  username: string
): void {
  cookies.set('jwt_token', token, COOKIE_OPTIONS);
  cookies.set('username', username, COOKIE_OPTIONS);
}

/**
 * Clears authentication cookies on logout
 * 
 * @param cookies - Astro cookies object
 */
export function clearAuthCookies(cookies: AstroCookies): void {
  cookies.delete('jwt_token', { path: '/' });
  cookies.delete('username', { path: '/' });
}

/**
 * Checks if user is authenticated
 * 
 * @param cookies - Astro cookies object
 * @returns true if authenticated, false otherwise
 */
export function isAuthenticated(cookies: AstroCookies): boolean {
  return requireAuth(cookies) !== null;
}
