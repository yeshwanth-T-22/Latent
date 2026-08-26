// functions/api/confidence/quiz.ts
// GET /api/confidence/quiz?topic=...
// Auth: Bearer JWT required

import type { EventContext } from '@cloudflare/workers-types';
import { getAuthUser, json, errorResponse } from '../_shared/supabase';
import { generateQuiz } from '../_shared/gemini';
import type { Env } from '../_shared/supabase';

export async function onRequestGet(context: EventContext<Env, string, Record<string, unknown>>): Promise<Response> {
  const { request, env } = context;

  try {
    const user = await getAuthUser(request, env);
    if (!user) return errorResponse('Authentication required.', 401);

    const url = new URL(request.url);
    const topic = url.searchParams.get('topic');
    if (!topic) return errorResponse('topic query parameter is required.', 400);

    const quiz = await generateQuiz(env.GEMINI_API_KEY, topic);
    return json(quiz);
  } catch (err: unknown) {
    console.error('[confidence/quiz]', err);
    return errorResponse("Couldn't generate a quiz right now. Please try again.", 500);
  }
}
