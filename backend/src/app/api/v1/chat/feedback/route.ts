import { NextRequest } from 'next/server';
import { db } from '@/lib/firebase';
import { getUserFromHeader } from '@/lib/jwt';
import { handleOptions, jsonResponse, errorResponse } from '@/lib/cors';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/v1/chat/feedback
 *
 * Submits a feedback score (1-5) for a specific chat log entry.
 *
 * Body: { log_id: string, score: number }
 * Response: { success: true }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const user = getUserFromHeader(request.headers.get('Authorization'));
    if (!user) {
      return errorResponse('Unauthorized — missing or invalid token', 401);
    }

    const body = await request.json();
    const { log_id, score } = body;

    if (!log_id || typeof log_id !== 'string') {
      return errorResponse('log_id is required', 400);
    }

    if (typeof score !== 'number' || score < 1 || score > 5) {
      return errorResponse('score must be a number between 1 and 5', 400);
    }

    if (db) {
      const logRef = db.collection('ChatLogs').doc(log_id);
      const logDoc = await logRef.get();

      if (!logDoc.exists) {
        return errorResponse('Chat log not found', 404);
      }

      // Verify the log belongs to this user
      const logData = logDoc.data();
      if (logData?.user_id !== user.userId) {
        return errorResponse('Forbidden — log does not belong to this user', 403);
      }

      await logRef.update({
        feedback_score: score,
        feedback_at: new Date().toISOString(),
      });
    } else {
      console.log('[mock] Feedback received for log', log_id, '— score:', score);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('[chat/feedback] Error:', error);
    return errorResponse('Failed to save feedback', 500);
  }
}
