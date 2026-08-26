// functions/api/dashboard.ts
// GET /api/dashboard — Fetch user profile, streak, and recent history
// Auth: Bearer JWT required

import type { EventContext } from '@cloudflare/workers-types';
import { getAuthUser, getAdminClient, json, errorResponse } from './_shared/supabase';
import type { Env } from './_shared/supabase';

export async function onRequestGet(context: EventContext<Env, string, Record<string, unknown>>): Promise<Response> {
  const { request, env } = context;

  try {
    const user = await getAuthUser(request, env);
    if (!user) return errorResponse('Authentication required.', 401);

    const db = getAdminClient(env);

    // Fetch user profile
    const { data: profile } = await db
      .from('profiles')
      .select('display_name, year_group, created_at')
      .eq('id', user.id)
      .maybeSingle();

    // Fetch recent history joined with topic name
    const { data: historyData } = await db
      .from('history')
      .select('*, topics(topic_name)')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50); // Get enough to calculate streak

    const history = historyData || [];

    // Map recent 5 for activity feed
    const recentActivity = history.slice(0, 5).map(h => {
      // @ts-ignore - Supabase joined data typing
      const topicName = h.topics?.topic_name || 'General';
      return {
        id: h.id,
        type: h.interaction_type,
        topicName,
        createdAt: h.created_at,
        score: h.true_score,
      };
    });

    // Calculate Streak (unique days of activity)
    let currentStreak = 0;
    let maxStreak = 0;
    
    if (history.length > 0) {
      const dates = [...new Set(history.map(h => new Date(h.created_at).toISOString().split('T')[0]))].sort().reverse();
      
      const todayStr = new Date().toISOString().split('T')[0];
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

      let streak = 0;
      let checkDate = new Date();
      
      // Check if active today or yesterday to continue current streak
      if (dates.includes(todayStr) || dates.includes(yesterdayStr)) {
         let tempDate = dates.includes(todayStr) ? new Date() : yesterdayDate;
         while (true) {
            const dateStr = tempDate.toISOString().split('T')[0];
            if (dates.includes(dateStr)) {
              streak++;
              tempDate.setDate(tempDate.getDate() - 1);
            } else {
              break;
            }
         }
      }
      currentStreak = streak;

      // Calculate max streak ever
      let currentRun = 1;
      maxStreak = 1;
      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i-1]);
        const curr = new Date(dates[i]);
        const diffDays = (prev.getTime() - curr.getTime()) / (1000 * 3600 * 24);
        if (Math.round(diffDays) === 1) {
          currentRun++;
          if (currentRun > maxStreak) maxStreak = currentRun;
        } else {
          currentRun = 1;
        }
      }
      if (dates.length === 0) maxStreak = 0;
    }

    return json({ 
      profile, 
      streak: currentStreak, 
      maxStreak,
      recentActivity 
    });
  } catch (err: unknown) {
    console.error('[dashboard]', err);
    return errorResponse("Couldn't load dashboard data.", 500);
  }
}
