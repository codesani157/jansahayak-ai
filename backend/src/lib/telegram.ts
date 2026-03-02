/**
 * Telegram Bot API utility for document blob storage.
 *
 * Uses a private Telegram channel as free PDF/document storage.
 * Upload scheme PDFs → get file_id → store reference in Pinecone metadata.
 *
 * SETUP:
 *   1. Create a bot via @BotFather on Telegram
 *   2. Create a private channel
 *   3. Add the bot as an admin to the channel
 *   4. Get the channel ID (send a message, use https://api.telegram.org/bot<TOKEN>/getUpdates)
 *   5. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID in .env.local
 */

const TELEGRAM_API = 'https://api.telegram.org/bot';

function getBotToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN || null;
}

function getChannelId(): string | null {
  return process.env.TELEGRAM_CHANNEL_ID || null;
}

/**
 * Upload a document (PDF) to the Telegram channel.
 * Returns the file_id which can be used to retrieve the file later.
 */
export async function uploadDocument(
  fileBuffer: Buffer,
  fileName: string,
  caption?: string,
): Promise<{ file_id: string; file_unique_id: string } | null> {
  const token = getBotToken();
  const channelId = getChannelId();

  if (!token || !channelId) {
    console.warn('[telegram] Missing bot token or channel ID — skipping upload');
    return null;
  }

  const formData = new FormData();
  formData.append('chat_id', channelId);
  formData.append('document', new Blob([new Uint8Array(fileBuffer)]), fileName);
  if (caption) {
    formData.append('caption', caption.slice(0, 1024)); // Telegram caption limit
  }

  const response = await fetch(`${TELEGRAM_API}${token}/sendDocument`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[telegram] Upload failed:', error);
    return null;
  }

  const result = await response.json();
  const doc = result.result?.document;

  if (!doc) {
    console.error('[telegram] Unexpected response format:', result);
    return null;
  }

  return {
    file_id: doc.file_id,
    file_unique_id: doc.file_unique_id,
  };
}

/**
 * Get a download URL for a Telegram file by file_id.
 * Note: URLs are temporary (valid for ~1 hour).
 */
export async function getFileUrl(fileId: string): Promise<string | null> {
  const token = getBotToken();
  if (!token) return null;

  const response = await fetch(`${TELEGRAM_API}${token}/getFile?file_id=${fileId}`);
  if (!response.ok) return null;

  const result = await response.json();
  const filePath = result.result?.file_path;
  if (!filePath) return null;

  return `https://api.telegram.org/file/bot${token}/${filePath}`;
}
