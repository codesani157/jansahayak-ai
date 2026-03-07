import { jsonResponse } from '@/lib/cors';
import { uploadToS3, publishSMS } from '@/lib/aws';

/**
 * GET /api/v1/aws-demo
 *
 * Demonstrates AWS S3 + SNS integration for hackathon evaluation.
 * Runs in mock mode by default (safe, no credentials required).
 * Set USE_AWS=true + AWS env vars in Vercel to enable real calls.
 */
export async function GET() {
  const mode = process.env.USE_AWS === 'true' ? 'live' : 'mock';

  // Demo: upload a small text blob to S3
  const demoPayload = Buffer.from(
    JSON.stringify({ demo: true, ts: new Date().toISOString() }),
  );
  const s3Result = await uploadToS3(demoPayload, `demo/${Date.now()}.json`);

  // Demo: send an SMS reminder via SNS
  const snsResult = await publishSMS(
    '+919876543210',
    'GovGuide reminder: Your PM-KISAN instalment is due. Check status on govguide.in',
  );

  return jsonResponse({
    service: 'aws-demo',
    mode,
    s3: s3Result,
    sns: snsResult,
    note:
      mode === 'mock'
        ? 'Running in mock mode. Set USE_AWS=true and configure AWS credentials to enable real AWS calls.'
        : 'Connected to real AWS services.',
  });
}
