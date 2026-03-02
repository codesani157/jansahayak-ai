import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/firebase';
import { getUserFromHeader } from '@/lib/jwt';
import { handleOptions, jsonResponse, errorResponse } from '@/lib/cors';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/v1/reminders/opt-in
 *
 * Opts the user in for deadline reminders for a specific scheme.
 * Requires a phone number for SMS delivery.
 *
 * Body: { scheme_id: string, phone_number: string }
 * Response: { reminder_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const user = getUserFromHeader(request.headers.get('Authorization'));
    if (!user) {
      return errorResponse('Unauthorized — missing or invalid token', 401);
    }

    const body = await request.json();
    const { scheme_id, phone_number } = body;

    if (!scheme_id || typeof scheme_id !== 'string') {
      return errorResponse('scheme_id is required', 400);
    }

    if (!phone_number || typeof phone_number !== 'string') {
      return errorResponse('phone_number is required', 400);
    }

    // Basic phone validation (Indian numbers)
    const phoneRegex = /^\+91\d{10}$/;
    if (!phoneRegex.test(phone_number)) {
      return errorResponse('phone_number must be in format +91XXXXXXXXXX', 400);
    }

    const reminderId = uuidv4();

    if (db) {
      // Update user's phone number if not set
      const userRef = db.collection('Users').doc(user.userId);
      await userRef.update({
        phone_number,
        updated_at: new Date().toISOString(),
      });

      // Create the reminder entry
      await db.collection('Reminders').doc(reminderId).set({
        user_id: user.userId,
        scheme_id,
        phone_number,
        status: 'active',
        created_at: new Date().toISOString(),
        next_reminder_at: null, // Will be set by cron job based on scheme deadlines
      });
    } else {
      console.log('[mock] Reminder created:', { reminderId, scheme_id, phone_number });
    }

    return jsonResponse({ reminder_id: reminderId });
  } catch (error) {
    console.error('[reminders/opt-in] Error:', error);
    return errorResponse('Failed to create reminder', 500);
  }
}
