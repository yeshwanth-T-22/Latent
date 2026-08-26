// functions/api/explain.ts
// POST /api/explain — Explain-Back evaluation
// Body: { topic, explanation }
// Auth: Bearer JWT required

import type { EventContext } from '@cloudflare/workers-types';
import { getAuthUser, upsertTopic, updateTopicScores, appendHistory, json, errorResponse } from './_shared/supabase';
import { evaluateExplainBack } from './_shared/gemini';
import type { Env } from './_shared/supabase';

export async function onRequestPost(context: EventContext<Env, string, Record<string, unknown>>): Promise<Response> {
  const { request, env } = context;

  try {
    const user = await getAuthUser(request, env);
    if (!user) return errorResponse('Authentication required.', 401);

    const body = await request.json() as { topic?: string; explanation?: string };
    const { topic, explanation } = body;

    if (!topic || !explanation?.trim()) {
      return errorResponse('topic and explanation are required.', 400);
    }
    if (explanation.trim().length < 20) {
      return errorResponse('Please write at least a few sentences so Latent can give useful feedback.', 400);
    }

    const evaluation = await evaluateExplainBack(env.GEMINI_API_KEY, topic, explanation);

    const topicRow = await upsertTopic(env, user.id, topic);
    await updateTopicScores(env, user.id, topic, {
      true_understanding_score: evaluation.trueScore,
    });

    await appendHistory(
      env,
      user.id,
      topicRow.id,
      'explainback',
      `Snippet: ${explanation.substring(0, 150)}`,
      evaluation.trueScore
    );

    return json(evaluation);
  } catch (err: unknown) {
    console.error('[explain]', err);
    return errorResponse("Latent couldn't evaluate your explanation right now. Please try again.", 500);
  }
}
