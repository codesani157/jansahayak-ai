import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/firebase';
import { getUserFromHeader } from '@/lib/jwt';
import { getIndex } from '@/lib/pinecone';
import { embedText, generateELI5 } from '@/lib/gemini';
import { handleOptions, jsonResponse, errorResponse } from '@/lib/cors';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/v1/chat/query
 *
 * RAG pipeline: embed query → Pinecone search → Gemini ELI5 generation.
 *
 * Body: { text_query: string, audio_blob?: string }
 * Response: { log_id: string, reply: string, source_schemes: SchemeCard[] }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const user = getUserFromHeader(request.headers.get('Authorization'));
    if (!user) {
      return errorResponse('Unauthorized — missing or invalid token', 401);
    }

    const body = await request.json();
    const { text_query } = body;

    if (!text_query || typeof text_query !== 'string' || text_query.trim().length === 0) {
      return errorResponse('text_query is required', 400);
    }

    // Fetch user profile for context
    let language = 'en';
    let role = 'general';
    if (db) {
      const userDoc = await db.collection('Users').doc(user.userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        language = userData?.preferred_language || 'en';
        role = userData?.role_name || 'general';
      }
    }

    // Step 1: Embed the query
    const queryVector = await embedText(text_query);

    // Step 2: Search Pinecone for relevant schemes
    const index = getIndex();
    const contextChunks: string[] = [];
    interface SchemeCard {
      scheme_id: string;
      title: string;
      summary: string;
      eligibility: string;
      benefit_amount: string;
      apply_url: string;
      score: number;
    }
    const sourceSchemes: SchemeCard[] = [];

    if (index) {
      const searchResults = await index.query({
        vector: queryVector,
        topK: 5,
        includeMetadata: true,
      });

      if (searchResults.matches) {
        for (const match of searchResults.matches) {
          const meta = match.metadata as Record<string, string> | undefined;
          if (meta) {
            contextChunks.push(
              `Scheme: ${meta.title || 'Unknown'}\n` +
              `Summary: ${meta.summary || ''}\n` +
              `Eligibility: ${meta.eligibility || ''}\n` +
              `Benefit: ${meta.benefit_amount || ''}\n` +
              `Apply URL: ${meta.apply_url || ''}`,
            );

            sourceSchemes.push({
              scheme_id: match.id,
              title: meta.title || 'Government Scheme',
              summary: meta.summary || '',
              eligibility: meta.eligibility || '',
              benefit_amount: meta.benefit_amount || '',
              apply_url: meta.apply_url || '',
              score: match.score ?? 0,
            });
          }
        }
      }
    } else {
      // Mock mode: return sample scheme data
      sourceSchemes.push({
        scheme_id: 'mock_pm_kisan',
        title: 'PM-KISAN',
        summary: 'Direct income support of ₹6,000/year to small farmer families.',
        eligibility: 'Small and marginal farmers with cultivable land.',
        benefit_amount: '₹6,000 per year in 3 instalments',
        apply_url: 'https://pmkisan.gov.in',
        score: 0.92,
      });
      contextChunks.push(
        'Scheme: PM-KISAN\nSummary: Direct income support of ₹6,000/year to small farmer families.\nEligibility: Small and marginal farmers with cultivable land.\nBenefit: ₹6,000 per year in 3 instalments\nApply URL: https://pmkisan.gov.in',
      );
    }

    // Step 3: Generate ELI5 response with Gemini
    const context = contextChunks.join('\n\n---\n\n');
    const reply = await generateELI5(text_query, context, language, role);

    // Step 4: Log to Firestore
    const logId = uuidv4();
    if (db) {
      await db.collection('ChatLogs').doc(logId).set({
        user_id: user.userId,
        query: text_query,
        response: reply,
        source_scheme_ids: sourceSchemes.map((s) => s.scheme_id),
        feedback_score: null,
        language,
        role,
        created_at: new Date().toISOString(),
      });
    }

    return jsonResponse({
      log_id: logId,
      reply,
      source_schemes: sourceSchemes,
    });
  } catch (error) {
    console.error('[chat/query] Error:', error);
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('429')) {
      return errorResponse('AI service is temporarily rate-limited. Please try again in a moment.', 429);
    }
    return errorResponse('Failed to process query', 500);
  }
}
