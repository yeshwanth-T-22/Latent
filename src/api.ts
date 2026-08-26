import { createClient } from '@supabase/supabase-js';
import type {
  DoubtResponse,
  QuizResponse,
  ConfidenceSubmitResponse,
  ExplainBackResponse,
  ReportResponse,
  MentorResponse,
  TranscribeResponse,
} from './types';

// ── Supabase client (frontend) ───────────────────────────────────────────────
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/**
 * Get the current session's JWT for API calls.
 */
async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

/**
 * Generic fetch wrapper — attaches auth header, handles errors.
 */
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const authHeaders = await getAuthHeader();

  const res = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    let message = 'Something went wrong. Please try again.';
    try {
      const body = await res.json();
      if (body.error) message = body.error;
    } catch { /* ignore */ }
    throw new Error(message);
  }

  return res.json();
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function signUp(email: string, password: string, displayName: string) {
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
}

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export function onAuthStateChange(callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]) {
  return supabase.auth.onAuthStateChange(callback);
}

// ── Doubt Solver ─────────────────────────────────────────────────────────────

export async function sendDoubt(topic: string, question: string): Promise<DoubtResponse> {
  return apiFetch<DoubtResponse>('/api/doubt', {
    method: 'POST',
    body: JSON.stringify({ topic, question }),
  });
}

// ── Confidence Check ─────────────────────────────────────────────────────────

export async function fetchQuiz(topic: string): Promise<QuizResponse> {
  return apiFetch<QuizResponse>(`/api/confidence/quiz?topic=${encodeURIComponent(topic)}`);
}

export async function submitConfidenceCheck(
  topic: string,
  answers: { questionText: string; chosenOption: string; correct: boolean }[],
  selfConfidence: number,
  reasoning: string
): Promise<ConfidenceSubmitResponse> {
  return apiFetch<ConfidenceSubmitResponse>('/api/confidence/submit', {
    method: 'POST',
    body: JSON.stringify({ topic, answers, selfConfidence, reasoning }),
  });
}

// ── Explain-Back ─────────────────────────────────────────────────────────────

export async function submitExplainBack(topic: string, explanation: string): Promise<ExplainBackResponse> {
  return apiFetch<ExplainBackResponse>('/api/explain', {
    method: 'POST',
    body: JSON.stringify({ topic, explanation }),
  });
}

// ── Weekly Report ─────────────────────────────────────────────────────────────

export async function fetchReport(): Promise<ReportResponse> {
  return apiFetch<ReportResponse>('/api/report');
}

// ── Mentor View ───────────────────────────────────────────────────────────────

export async function fetchMentor(): Promise<MentorResponse> {
  return apiFetch<MentorResponse>('/api/mentor');
}

// ── Voice Transcription ───────────────────────────────────────────────────────

export async function transcribeAudio(audioBlob: Blob): Promise<TranscribeResponse> {
  const authHeaders = await getAuthHeader();
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');

  const res = await fetch('/api/voice', {
    method: 'POST',
    headers: authHeaders,
    body: formData,
  });

  if (!res.ok) {
    let message = 'Voice transcription failed. Please type instead.';
    try { const b = await res.json(); if (b.error) message = b.error; } catch { /* ignore */ }
    throw new Error(message);
  }
  return res.json();
}
