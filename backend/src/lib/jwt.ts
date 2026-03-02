import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_in_production';

interface JwtPayload {
  userId: string;
  scope: 'anonymous' | 'verified';
  iat: number;
  exp: number;
}

/**
 * Lightweight JWT implementation using Node's built-in crypto.
 * No external JWT library needed — keeps the serverless bundle small.
 */
function base64url(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64url');
}

export function signToken(userId: string, scope: 'anonymous' | 'verified' = 'anonymous'): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(
    JSON.stringify({
      userId,
      scope,
      iat: now,
      exp: now + 7 * 24 * 60 * 60, // 7 days
    }),
  );

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;

    // Verify signature
    const expected = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64url');

    if (signature !== expected) return null;

    // Decode payload
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString()) as JwtPayload;

    // Check expiry
    if (decoded.exp < Math.floor(Date.now() / 1000)) return null;

    return decoded;
  } catch {
    return null;
  }
}

/**
 * Extract and verify the JWT from an Authorization header.
 */
export function getUserFromHeader(authHeader: string | null): JwtPayload | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyToken(authHeader.slice(7));
}
