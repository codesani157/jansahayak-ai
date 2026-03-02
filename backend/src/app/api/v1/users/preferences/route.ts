import { NextRequest } from 'next/server';
import { db } from '@/lib/firebase';
import { getUserFromHeader } from '@/lib/jwt';
import { handleOptions, jsonResponse, errorResponse } from '@/lib/cors';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * PUT /api/v1/users/preferences
 *
 * Updates the authenticated user's language and role preferences.
 *
 * Body: { preferred_language: string, role_name: string }
 * Response: { success: true }
 */
export async function PUT(request: NextRequest) {
  try {
    // Authenticate
    const user = getUserFromHeader(request.headers.get('Authorization'));
    if (!user) {
      return errorResponse('Unauthorized — missing or invalid token', 401);
    }

    const body = await request.json();
    const { preferred_language, role_name } = body;

    if (!preferred_language || !role_name) {
      return errorResponse('preferred_language and role_name are required', 400);
    }

    if (db) {
      const userRef = db.collection('Users').doc(user.userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return errorResponse('User not found', 404);
      }

      await userRef.update({
        preferred_language,
        role_name,
        updated_at: new Date().toISOString(),
      });
    } else {
      console.log('[mock] Updated preferences for', user.userId, { preferred_language, role_name });
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('[users/preferences] Error:', error);
    return errorResponse('Failed to update preferences', 500);
  }
}
