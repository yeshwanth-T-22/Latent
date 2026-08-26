import type { EventContext } from '@cloudflare/workers-types';
import type { Env } from './_shared/supabase';

export async function onRequestGet(context: EventContext<Env, string, Record<string, unknown>>): Promise<Response> {
  const { env } = context;
  return new Response(JSON.stringify({
    hasSupabaseUrl: !!env.SUPABASE_URL,
    urlValue: env.SUPABASE_URL || 'MISSING',
    hasServiceKey: !!env.SUPABASE_SERVICE_ROLE_KEY,
    hasGemini: !!env.GEMINI_API_KEY,
  }, null, 2), { headers: { 'Content-Type': 'application/json' } });
}
