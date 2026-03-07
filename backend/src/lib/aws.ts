/**
 * AWS service adapter for GovGuide.
 *
 * Defaults to a safe mock implementation (no SDK, no network calls).
 * Set USE_AWS=true in env + install @aws-sdk/* packages to enable real calls.
 *
 * Mock mode is production-safe — it logs to console and returns stub data.
 */

/* ---------- Types ---------- */

export interface S3UploadResult {
  url: string;
  bucket: string;
  key: string;
}

export interface SNSPublishResult {
  MessageId: string;
  Status: 'SENT' | 'MOCK';
}

/* ---------- S3 — Document / PDF storage ---------- */

export async function uploadToS3(
  buffer: Buffer,
  key: string,
): Promise<S3UploadResult> {
  if (process.env.USE_AWS === 'true') {
    // Dynamic import keeps the SDK out of the bundle when unused
    // @ts-ignore — @aws-sdk/client-s3 is an optional peer dep, installed only when USE_AWS=true
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');

    const client = new S3Client({ region: process.env.AWS_REGION ?? 'ap-south-1' });
    const bucket = process.env.AWS_S3_BUCKET!;

    await client.send(
      new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer }),
    );

    return {
      url: `https://${bucket}.s3.${process.env.AWS_REGION ?? 'ap-south-1'}.amazonaws.com/${key}`,
      bucket,
      key,
    };
  }

  // ---- Mock mode (default) ----
  console.log(`[aws-mock] uploadToS3 key=${key} size=${buffer.length}`);
  return {
    url: `https://govguide-mock.s3.ap-south-1.amazonaws.com/${key}`,
    bucket: 'govguide-mock',
    key,
  };
}

/* ---------- SNS — SMS reminders ---------- */

export async function publishSMS(
  phone: string,
  message: string,
): Promise<SNSPublishResult> {
  if (process.env.USE_AWS === 'true') {
    // @ts-ignore — @aws-sdk/client-sns is an optional peer dep, installed only when USE_AWS=true
    const { SNSClient, PublishCommand } = await import('@aws-sdk/client-sns');

    const client = new SNSClient({ region: process.env.AWS_REGION ?? 'ap-south-1' });

    const res = await client.send(
      new PublishCommand({ PhoneNumber: phone, Message: message }),
    );

    return { MessageId: res.MessageId ?? 'unknown', Status: 'SENT' };
  }

  // ---- Mock mode (default) ----
  console.log(`[aws-mock] publishSMS to=${phone} msg=${message.slice(0, 60)}…`);
  return { MessageId: `mock-${Date.now()}`, Status: 'MOCK' };
}
