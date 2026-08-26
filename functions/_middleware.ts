// functions/_middleware.ts
// Runs before every Pages Function request.
// Adds CORS headers and parses the Supabase JWT to extract the user.

import type { EventContext } from '@cloudflare/workers-types';

interface Env {
  GEMINI_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_JWT_SECRET: string;
}

export async function onRequest(context: EventContext<Env, string, Record<string, unknown>>) {
  const { request, next } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  const response = await next();

  // Attach CORS headers to every response
  response.headers.set('Access-Control-Allow-Origin', '*');
  return response;
}
