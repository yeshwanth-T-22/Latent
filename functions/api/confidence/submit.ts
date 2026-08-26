// functions/api/confidence/submit.ts
// POST /api/confidence/submit
// Body: { topic, answers, selfConfidence, reasoning }
// Auth: Bearer JWT required

import type { EventContext } from '@cloudflare/workers-types';
import { getAuthUser, upsertTopic, updateTopicScores, appendHistory, json, errorResponse } from '../_shared/supabase';
import { evaluateAnswers } from '../_shared/gemini';
import type { Env } from '../_shared/supabase';

export async function onRequestPost(context: EventContext<Env, string, Record<string, unknown>>): Promise<Response> {
  const { request, env } = context;

  try {
    const user = await getAuthUser(request, env);
    if (!user) return errorResponse('Authentication required.', 401);

    const body = await request.json() as {
      topic?: string;
      answers?: { questionText: string; chosenOption: string; correct: boolean }[];
      selfConfidence?: number;
      reasoning?: string;
    };

    const { topic, answers, selfConfidence, reasoning } = body;
    if (!topic || !Array.isArray(answers) || selfConfidence == null) {
      return errorResponse('topic, answers, and selfConfidence are required.', 400);
    }

    const evaluation = await evaluateAnswers(
      env.GEMINI_API_KEY,
      topic,
      answers,
      selfConfidence,
      reasoning || ''
    );

    // Map 1–5 scale to 0–100
    const confidenceScore = Math.round((selfConfidence / 5) * 100);

    // Upsert topic and update scores
    const topicRow = await upsertTopic(env, user.id, topic);
    await updateTopicScores(env, user.id, topic, {
      confidence_score: confidenceScore,
      true_understanding_score: evaluation.trueScore,
      is_weak_spot: evaluation.isWeakSpot,
    });

    await appendHistory(
      env,
      user.id,
      topicRow.id,
      'quiz',
      `Self-confidence: ${selfConfidence}/5, Weak spot: ${evaluation.isWeakSpot}`,
      evaluation.trueScore
    );

    return json(evaluation);
  } catch (err: unknown) {
    console.error('[confidence/submit]', err);
    return errorResponse("Couldn't evaluate your answers right now. Please try again.", 500);
  }
}
