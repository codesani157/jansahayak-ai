import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/firebase';
import { signToken } from '@/lib/jwt';
import { handleOptions, jsonResponse, errorResponse } from '@/lib/cors';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/v1/auth/session
 *
 * Creates or retrieves an anonymous user session.
 * Accepts an optional X-Device-Id header for device fingerprinting.
 *
 * Response: { user_id: string, token: string }
 */
export async function POST(request: NextRequest) {
  try {
    const deviceId = request.headers.get('X-Device-Id') || uuidv4();

    // If Firestore is available, look up or create the user
    if (db) {
      // Check if a user with this device_id already exists
      const usersRef = db.collection('Users');
      const existingQuery = await usersRef
        .where('device_id', '==', deviceId)
        .limit(1)
        .get();

      if (!existingQuery.empty) {
        // Return existing user
        const existingDoc = existingQuery.docs[0];
        const token = signToken(existingDoc.id, 'anonymous');
        return jsonResponse({ user_id: existingDoc.id, token });
      }

      // Create new anonymous user
      const userId = uuidv4();
      await usersRef.doc(userId).set({
        device_id: deviceId,
        auth_scope: 'anonymous',
        preferred_language: null,
        role_name: null,
        phone_number: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const token = signToken(userId, 'anonymous');
      return jsonResponse({ user_id: userId, token });
    }

    // Mock mode (no Firebase credentials)
    const mockUserId = `mock_${deviceId.slice(0, 8)}`;
    const token = signToken(mockUserId, 'anonymous');
    return jsonResponse({ user_id: mockUserId, token });
  } catch (error) {
    console.error('[auth/session] Error:', error);
    return errorResponse('Failed to create session', 500);
  }
}
