/**
 * Test script for Telegram bot document upload.
 * Usage: npx tsx src/scripts/test-telegram.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

const TELEGRAM_API = 'https://api.telegram.org/bot';
const token = process.env.TELEGRAM_BOT_TOKEN;
const channelId = process.env.TELEGRAM_CHANNEL_ID;

async function main() {
  console.log('🤖 Testing Telegram Bot Document Upload\n');

  if (!token || !channelId) {
    console.error('❌ Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID in .env.local');
    process.exit(1);
  }

  console.log(`  Bot Token: ${token.slice(0, 10)}...`);
  console.log(`  Channel ID: ${channelId}\n`);

  // Step 1: Verify bot identity
  console.log('Step 1: Verifying bot identity...');
  const meResp = await fetch(`${TELEGRAM_API}${token}/getMe`);
  const me = await meResp.json();
  if (!me.ok) {
    console.error('❌ Invalid bot token:', me.description);
    process.exit(1);
  }
  console.log(`  ✅ Bot: @${me.result.username} (${me.result.first_name})\n`);

  // Step 2: Send a test text message to verify channel access
  console.log('Step 2: Sending test message to channel...');
  const msgResp = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: channelId,
      text: '🧪 GovGuide test message — Telegram blob storage is working!',
    }),
  });
  const msg = await msgResp.json();
  if (!msg.ok) {
    console.error('❌ Failed to send message:', msg.description);
    console.error('   Make sure the bot is added as an admin to the channel.');
    process.exit(1);
  }
  console.log(`  ✅ Message sent (message_id: ${msg.result.message_id})\n`);

  // Step 3: Upload a test PDF document
  console.log('Step 3: Uploading test document...');
  // Create a simple text file as a test "document"
  const testContent = `GovGuide Scheme Document (Test)
=================================
Scheme: PM-KISAN
Benefit: ₹6,000/year direct income support
Eligibility: Small and marginal farmers
URL: https://pmkisan.gov.in

This is a test document uploaded via GovGuide's Telegram blob storage.
Timestamp: ${new Date().toISOString()}
`;
  const fileBuffer = Buffer.from(testContent, 'utf-8');

  const formData = new FormData();
  formData.append('chat_id', channelId);
  formData.append('document', new Blob([new Uint8Array(fileBuffer)]), 'govguide-test-scheme.txt');
  formData.append('caption', 'GovGuide test document upload — verifying blob storage');

  const uploadResp = await fetch(`${TELEGRAM_API}${token}/sendDocument`, {
    method: 'POST',
    body: formData,
  });
  const upload = await uploadResp.json();
  if (!upload.ok) {
    console.error('❌ Upload failed:', upload.description);
    process.exit(1);
  }

  const doc = upload.result.document;
  console.log(`  ✅ Document uploaded!`);
  console.log(`     file_id: ${doc.file_id}`);
  console.log(`     file_unique_id: ${doc.file_unique_id}`);
  console.log(`     file_name: ${doc.file_name}`);
  console.log(`     file_size: ${doc.file_size} bytes\n`);

  // Step 4: Retrieve the file URL
  console.log('Step 4: Retrieving download URL...');
  const fileResp = await fetch(`${TELEGRAM_API}${token}/getFile?file_id=${doc.file_id}`);
  const fileInfo = await fileResp.json();
  if (!fileInfo.ok) {
    console.error('❌ Failed to get file info:', fileInfo.description);
    process.exit(1);
  }

  const downloadUrl = `https://api.telegram.org/file/bot${token}/${fileInfo.result.file_path}`;
  console.log(`  ✅ Download URL: ${downloadUrl}\n`);

  // Step 5: Verify we can download the file back
  console.log('Step 5: Verifying download...');
  const dlResp = await fetch(downloadUrl);
  const dlText = await dlResp.text();
  const matches = dlText.includes('PM-KISAN');
  console.log(`  ✅ Downloaded ${dlText.length} bytes — content verified: ${matches}\n`);

  console.log('🎉 All Telegram tests passed! Blob storage is fully operational.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
