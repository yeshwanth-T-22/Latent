import type { EventContext } from '@cloudflare/workers-types';
import { getAuthUser, json, errorResponse, getAdminClient } from '../_shared/supabase';
import type { Env } from '../_shared/supabase';

export async function onRequestGet(context: EventContext<Env, string, Record<string, unknown>>): Promise<Response> {
  const { request, env } = context;

  try {
    const user = await getAuthUser(request, env);
    if (!user) return errorResponse('Authentication required.', 401);

    const url = new URL(request.url);
    const topic = url.searchParams.get('topic');
    if (!topic) return errorResponse('Topic is required.', 400);

    const supabase = getAdminClient(env);

    const { data, error } = await supabase
      .from('topics')
      .select('doubt_state, quiz_state, explain_state')
      .eq('student_id', user.id)
      .eq('topic_name', topic)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[topics/state GET]', error);
      return errorResponse('Failed to fetch topic state.', 500);
    }

    return json(data || { doubt_state: null, quiz_state: null, explain_state: null });
  } catch (err: unknown) {
    console.error('[topics/state GET]', err);
    return errorResponse('Failed to fetch topic state.', 500);
  }
}

export async function onRequestPatch(context: EventContext<Env, string, Record<string, unknown>>): Promise<Response> {
  const { request, env } = context;

  try {
    const user = await getAuthUser(request, env);
    if (!user) return errorResponse('Authentication required.', 401);

    const body = await request.json() as any;
    const { topic, feature, state } = body;

    if (!topic || !feature || state === undefined) {
      return errorResponse('topic, feature, and state are required.', 400);
    }

    const column = feature === 'doubt' ? 'doubt_state' 
                 : feature === 'quiz' ? 'quiz_state' 
                 : feature === 'explain' ? 'explain_state' 
                 : null;

    if (!column) return errorResponse('Invalid feature.', 400);

    const supabase = getAdminClient(env);

    // Upsert the topic if it doesn't exist to save state
    const { error } = await supabase
      .from('topics')
      .upsert({
        student_id: user.id,
        topic_name: topic,
        [column]: state,
        last_interaction: new Date().toISOString()
      }, { onConflict: 'student_id, topic_name' });

    if (error) {
      console.error('[topics/state PATCH]', error);
      return errorResponse('Failed to update topic state.', 500);
    }

    return json({ success: true });
  } catch (err: unknown) {
    console.error('[topics/state PATCH]', err);
    return errorResponse('Failed to update topic state.', 500);
  }
}
