import { NextResponse } from 'next/server';

/**
 * Standard CORS headers for all API responses.
 * Allows requests from Expo dev client and production domains.
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Device-Id',
};

/**
 * Handle preflight OPTIONS requests.
 */
export function handleOptions() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Create a JSON response with CORS headers.
 */
export function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: CORS_HEADERS });
}

/**
 * Create an error JSON response with CORS headers.
 */
export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: CORS_HEADERS });
}
