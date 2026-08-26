// functions/api/_shared/supabase.ts
// Supabase client factory for Pages Functions (Workers runtime).
// Uses @supabase/supabase-js which is already in the frontend package.json.

import { createClient } from '@supabase/supabase-js';

export interface Env {
  GEMINI_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY: string;
}

/**
 * Admin client — bypasses RLS. Use ONLY for server-side mutations.
 */
export function getAdminClient(env: Env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Extract the Bearer token from the Authorization header.
 */
export function getBearerToken(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

/**
 * Get the authenticated user from the JWT in the Authorization header.
 * Returns null if unauthenticated.
 */
export async function getAuthUser(request: Request, env: Env) {
  const token = getBearerToken(request);
  if (!token) return null;

  // Use an anon client to verify the JWT against Supabase Auth
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return null;
  return user;
}

/**
 * Ensure a topic row exists, creating it if needed.
 * Returns the topic row.
 */
export async function upsertTopic(
  env: Env,
  studentId: string,
  topicName: string,
  subject = ''
) {
  const db = getAdminClient(env);
  const { data, error } = await db
    .from('topics')
    .upsert(
      { student_id: studentId, topic_name: topicName, subject },
      { onConflict: 'student_id,topic_name', ignoreDuplicates: false }
    )
    .select()
    .single();

  if (error) throw new Error(`Failed to upsert topic: ${error.message}`);
  return data;
}

/**
 * Update confidence and/or true understanding scores for a topic.
 */
export async function updateTopicScores(
  env: Env,
  studentId: string,
  topicName: string,
  scores: { confidence_score?: number; true_understanding_score?: number; is_weak_spot?: boolean }
) {
  const db = getAdminClient(env);
  const clamp = (n: number) => Math.min(100, Math.max(0, n));
  const update: Record<string, unknown> = { last_interaction: new Date().toISOString() };
  if (scores.confidence_score !== undefined) update.confidence_score = clamp(scores.confidence_score);
  if (scores.true_understanding_score !== undefined) update.true_understanding_score = clamp(scores.true_understanding_score);
  if (scores.is_weak_spot !== undefined) update.is_weak_spot = scores.is_weak_spot;

  const { error } = await db
    .from('topics')
    .update(update)
    .match({ student_id: studentId, topic_name: topicName });

  if (error) throw new Error(`Failed to update topic scores: ${error.message}`);
}

/**
 * Append a history entry for a topic.
 */
export async function appendHistory(
  env: Env,
  studentId: string,
  topicId: string,
  type: 'doubt' | 'quiz' | 'explainback',
  notes: string,
  trueScore?: number
) {
  const db = getAdminClient(env);
  const { error } = await db.from('history').insert({
    student_id: studentId,
    topic_id: topicId,
    interaction_type: type,
    notes: notes.substring(0, 500),
    true_score: trueScore ?? null,
  });
  if (error) console.error('[history] Insert failed:', error.message);
}

/**
 * Standard JSON response helper.
 */
export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Standard error response helper.
 */
export function errorResponse(message: string, status = 500): Response {
  return json({ error: message }, status);
}
