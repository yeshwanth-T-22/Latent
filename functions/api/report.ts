// functions/api/report.ts
// GET /api/report — Weekly weak-spot report with revision plans
// Auth: Bearer JWT required

import type { EventContext } from '@cloudflare/workers-types';
import { getAuthUser, getAdminClient, json, errorResponse } from './_shared/supabase';
import { generateRevisionPlan } from './_shared/gemini';
import type { Env } from './_shared/supabase';

export async function onRequestGet(context: EventContext<Env, string, Record<string, unknown>>): Promise<Response> {
  const { request, env } = context;

  try {
    const user = await getAuthUser(request, env);
    if (!user) return errorResponse('Authentication required.', 401);

    const db = getAdminClient(env);

    // Fetch all topics for this student
    const { data: topics, error } = await db
      .from('topics')
      .select('*')
      .eq('student_id', user.id)
      .order('last_interaction', { ascending: false });

    if (error) throw new Error(error.message);

    // Detect diverging topics (confidence ahead of understanding by >20)
    const topicsWithFlags = (topics || []).map(t => ({
      ...t,
      isDiverging: (t.confidence_score - t.true_understanding_score) > 20,
      isWeak: t.is_weak_spot || (t.confidence_score - t.true_understanding_score) > 20,
    }));

    // Generate revision plans for weak topics (in parallel)
    const topicsWithPlans = await Promise.all(
      topicsWithFlags.map(async (t) => {
        let plan: string[] = [];
        if (t.isWeak) {
          try {
            plan = await generateRevisionPlan(
              env.GEMINI_API_KEY,
              t.topic_name,
              t.confidence_score,
              t.true_understanding_score
            );
          } catch {
            plan = ['Review your notes', 'Explain it to a friend', 'Test yourself with 3 questions'];
          }
        }
        return {
          name: t.topic_name,
          subject: t.subject || '',
          confidenceScore: t.confidence_score,
          trueUnderstandingScore: t.true_understanding_score,
          isWeakSpot: t.isWeak,
          lastInteraction: t.last_interaction,
          plan,
        };
      })
    );

    // Sort: weak spots first, then by gap size
    topicsWithPlans.sort((a, b) => {
      if (a.isWeakSpot !== b.isWeakSpot) return a.isWeakSpot ? -1 : 1;
      return (b.confidenceScore - b.trueUnderstandingScore) - (a.confidenceScore - a.trueUnderstandingScore);
    });

    const weakSpots = topicsWithPlans.filter(t => t.isWeakSpot).map(t => t.name);

    // Week label
    const now = new Date();
    const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const weekLabel = `${fmt(mon)} – ${fmt(sun)}`;

    return json({ topics: topicsWithPlans, weakSpots, weekLabel });
  } catch (err: unknown) {
    console.error('[report]', err);
    return errorResponse("Couldn't load your weekly report. Please try again.", 500);
  }
}
