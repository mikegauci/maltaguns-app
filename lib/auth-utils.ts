/**
 * Auth utilities for handling authentication-related operations
 */

/**
 * Force logout by clearing all auth-related data from localStorage and cookies,
 * then redirecting to the homepage
 */
export function forceLogout() {
  // Clear all Supabase auth data from localStorage
  if (typeof window !== 'undefined') {
    // Clear all storage related to authentication
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('supabase.auth.') || key.includes('supabase'))) {
        localStorage.removeItem(key);
      }
    }
    
    // Clear cookies related to auth
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.trim().split('=');
      if (name && (name.includes('supabase') || name.includes('auth'))) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
      }
    });
    
    // Redirect to homepage without cache-busting query param
    window.location.href = '/';
  }
} 