// functions/api/doubt.ts
// POST /api/doubt — Doubt Solver endpoint
// Body: { topic: string, question: string }
// Auth: Bearer JWT required

import type { EventContext } from '@cloudflare/workers-types';
import { getAuthUser, getAdminClient, upsertTopic, appendHistory, json, errorResponse } from './_shared/supabase';
import { askDoubt } from './_shared/gemini';
import type { Env } from './_shared/supabase';

export async function onRequestPost(context: EventContext<Env, string, Record<string, unknown>>): Promise<Response> {
  const { request, env } = context;

  try {
    const user = await getAuthUser(request, env);
    if (!user) return errorResponse('Authentication required.', 401);

    const body = await request.json() as { topic?: string; question?: string };
    const { topic, question } = body;

    if (!question?.trim()) return errorResponse('question is required.', 400);
    const topicName = topic?.trim() || 'General';

    // Fetch existing topic data for context (best-effort)
    const db = getAdminClient(env);
    const { data: topicRow } = await db
      .from('topics')
      .select('id, confidence_score, true_understanding_score')
      .match({ student_id: user.id, topic_name: topicName })
      .maybeSingle();

    // Call Gemini
    const answer = await askDoubt(env.GEMINI_API_KEY, question, topicName, topicRow ?? null);

    // Upsert topic and append history (non-blocking on await to keep response fast)
    const ensuredTopic = await upsertTopic(env, user.id, topicName);
    appendHistory(env, user.id, ensuredTopic.id, 'doubt', `Q: ${question.substring(0, 200)}`).catch(console.error);

    return json({ answer });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[doubt]', msg);
    return errorResponse("Latent couldn't process your question right now. Please try again.", 500);
  }
}
