// functions/api/profile.ts
// GET  /api/profile  — fetch the authenticated user's profile + stats
// PATCH /api/profile — update display_name and/or year_group
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

    // Fetch profile row
    const { data: profile, error: pErr } = await db
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (pErr) throw new Error(pErr.message);

    // Stats: total sessions by type
    const { data: history } = await db
      .from('history')
      .select('interaction_type, true_score, created_at')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false });

    const h = history || [];
    const totalSessions = h.length;
    const totalDoubt = h.filter(r => r.interaction_type === 'doubt').length;
    const totalQuiz = h.filter(r => r.interaction_type === 'quiz').length;
    const totalExplain = h.filter(r => r.interaction_type === 'explainback').length;
    const scores = h.filter(r => r.true_score !== null).map(r => r.true_score as number);
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

    // Topics count
    const { count: topicsCount } = await db
      .from('topics')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', user.id);

    // Weak spots count
    const { count: weakSpotsCount } = await db
      .from('topics')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', user.id)
      .eq('is_weak_spot', true);

    return json({
      profile: profile || { id: user.id, display_name: user.user_metadata?.display_name || 'Student', year_group: null, created_at: user.created_at },
      email: user.email,
      stats: {
        totalSessions,
        totalDoubt,
        totalQuiz,
        totalExplain,
        avgScore,
        topicsCount: topicsCount || 0,
        weakSpotsCount: weakSpotsCount || 0,
        memberSince: profile?.created_at || user.created_at,
      }
    });
  } catch (err: unknown) {
    console.error('[profile GET]', err);
    return errorResponse("Couldn't load profile.", 500);
  }
}

export async function onRequestPatch(context: EventContext<Env, string, Record<string, unknown>>): Promise<Response> {
  const { request, env } = context;
  try {
    const user = await getAuthUser(request, env);
    if (!user) return errorResponse('Authentication required.', 401);

    const body = await request.json() as { display_name?: string; year_group?: string; avatar_color?: string };
    const { display_name, year_group, avatar_color } = body;

    const db = getAdminClient(env);
    const updates: Record<string, string> = {};
    if (display_name !== undefined) updates.display_name = display_name.trim().slice(0, 60) || 'Student';
    if (year_group !== undefined) updates.year_group = year_group.trim().slice(0, 30);
    if (avatar_color !== undefined) updates.avatar_color = avatar_color;

    if (Object.keys(updates).length === 0) return errorResponse('No fields to update.', 400);

    const { error } = await db
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) throw new Error(error.message);

    // Also update auth metadata for display_name so session reflects it
    if (display_name !== undefined) {
      await getAdminClient(env).auth.admin.updateUserById(user.id, {
        user_metadata: { ...user.user_metadata, display_name: updates.display_name }
      });
    }

    return json({ success: true, updates });
  } catch (err: unknown) {
    console.error('[profile PATCH]', err);
    return errorResponse("Couldn't update profile.", 500);
  }
}
