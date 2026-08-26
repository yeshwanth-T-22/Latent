// functions/api/voice.ts
// POST /api/voice/transcribe — Voice input via Google Cloud Speech-to-Text
// Accepts multipart/form-data with field "audio" (webm blob)
// Falls back to a graceful error if Speech API is not configured

import type { EventContext } from '@cloudflare/workers-types';
import { getAuthUser, json, errorResponse } from './_shared/supabase';
import type { Env } from './_shared/supabase';

// Extend Env to include optional Speech-to-Text key
interface ExtendedEnv extends Env {
  GOOGLE_SPEECH_API_KEY?: string;
}

export async function onRequestPost(
  context: EventContext<ExtendedEnv, string, Record<string, unknown>>
): Promise<Response> {
  const { request, env } = context;

  try {
    const user = await getAuthUser(request, env as unknown as Env);
    if (!user) return errorResponse('Authentication required.', 401);

    if (!env.GOOGLE_SPEECH_API_KEY) {
      return errorResponse(
        'Voice transcription is not yet configured on this server. Please type your question instead.',
        503
      );
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    if (!audioFile) return errorResponse('No audio file received. Send as multipart field "audio".', 400);

    const audioBytes = await audioFile.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBytes)));

    // Call Google Cloud Speech-to-Text REST API
    const speechRes = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${env.GOOGLE_SPEECH_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            encoding: 'WEBM_OPUS',
            sampleRateHertz: 48000,
            languageCode: 'en-US',
            model: 'latest_short',
            enableAutomaticPunctuation: true,
          },
          audio: { content: base64Audio },
        }),
      }
    );

    if (!speechRes.ok) {
      const errBody = await speechRes.text();
      console.error('[voice] Speech API error:', errBody);
      return errorResponse('Voice transcription failed. Please type instead.', 502);
    }

    const speechData = await speechRes.json() as {
      results?: { alternatives: { transcript: string }[] }[];
    };

    const transcription = (speechData.results || [])
      .map(r => r.alternatives[0]?.transcript || '')
      .join(' ')
      .trim();

    if (!transcription) {
      return errorResponse('No speech detected. Please speak clearly and try again.', 422);
    }

    return json({ transcription });
  } catch (err: unknown) {
    console.error('[voice]', err);
    return errorResponse('Voice transcription failed. Please type instead.', 500);
  }
}
