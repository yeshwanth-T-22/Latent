// functions/api/mentor.ts
// GET /api/mentor — Mentor/parent read-only view
// Auth: Bearer JWT required

import type { EventContext } from '@cloudflare/workers-types';
import { getAuthUser, getAdminClient, json, errorResponse } from './_shared/supabase';
import { generateMentorNote } from './_shared/gemini';
import type { Env } from './_shared/supabase';

export async function onRequestGet(context: EventContext<Env, string, Record<string, unknown>>): Promise<Response> {
  const { request, env } = context;

  try {
    const user = await getAuthUser(request, env);
    if (!user) return errorResponse('Authentication required.', 401);

    const db = getAdminClient(env);

    // Fetch profile
    const { data: profile } = await db
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle();

    // Fetch all topics
    const { data: topics } = await db
      .from('topics')
      .select('topic_name, confidence_score, true_understanding_score, is_weak_spot, last_interaction')
      .eq('student_id', user.id)
      .order('last_interaction', { ascending: false });

    // Fetch history for trends (last 30 days)
    const { data: history } = await db
      .from('history')
      .select('topic_id, interaction_type, true_score, created_at')
      .eq('student_id', user.id)
      .in('interaction_type', ['quiz', 'explainback'])
      .order('created_at', { ascending: true })
      .limit(100);

    const topicsList = topics || [];
    const historyList = history || [];

    const avgUnderstanding = topicsList.length
      ? Math.round(topicsList.reduce((s, t) => s + t.true_understanding_score, 0) / topicsList.length)
      : 0;
    const avgConfidence = topicsList.length
      ? Math.round(topicsList.reduce((s, t) => s + t.confidence_score, 0) / topicsList.length)
      : 0;
    const weakSpots = topicsList.filter(t => t.is_weak_spot).map(t => t.topic_name);

    // Build per-topic trend data
    const trends = topicsList.map(t => {
      const points = historyList
        .filter(h => h.true_score != null)
        .map(h => ({
          date: (h.created_at as string).substring(0, 10),
          score: h.true_score as number,
        }));
      return { topic: t.topic_name, historyPoints: points };
    });

    // Generate mentor note
    let mentorNote = 'Keep encouraging this student — every question asked is progress.';
    try {
      mentorNote = await generateMentorNote(
        env.GEMINI_API_KEY,
        profile?.display_name || 'this student',
        topicsList.map(t => ({ name: t.topic_name, confidence: t.confidence_score, understanding: t.true_understanding_score })),
        weakSpots
      );
    } catch { /* use fallback */ }

    return json({
      studentId: user.id,
      displayName: profile?.display_name || 'Student',
      averageUnderstanding: avgUnderstanding,
      averageConfidence: avgConfidence,
      topicsCount: topicsList.length,
      weakSpotsCount: weakSpots.length,
      trends,
      mentorNote,
    });
  } catch (err: unknown) {
    console.error('[mentor]', err);
    return errorResponse("Couldn't load the mentor view. Please try again.", 500);
  }
}
