// functions/api/_shared/gemini.ts
// Gemini API helpers for Cloudflare Workers runtime.
// Uses the @google/generative-ai SDK via npm (bundled by wrangler/vite).

import { GoogleGenerativeAI } from '@google/generative-ai';

function getModel(apiKey: string) {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
}

function safeParseJSON<T>(text: string): T | null {
  const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  try { return JSON.parse(cleaned) as T; } catch { return null; }
}

// ── 1. Doubt Solver ──────────────────────────────────────────────────────────

export async function askDoubt(
  apiKey: string,
  question: string,
  topic: string,
  topicContext: { confidence_score: number; true_understanding_score: number } | null
): Promise<string> {
  const model = getModel(apiKey);

  const ctx = topicContext
    ? `The student's self-rated confidence is ${topicContext.confidence_score}/100 and their assessed understanding is ${topicContext.true_understanding_score}/100.`
    : 'This appears to be a new topic for the student.';

  const prompt = `You are Latent, a calm and thoughtful AI learning companion for students.
Your job is to help students understand concepts deeply, not just give them answers to copy.

Topic: ${topic || 'General'}
Student context: ${ctx}

The student asks: "${question}"

Respond in a warm, encouraging, Socratic tone.
- If confidence < 40, use simpler language and more analogies.
- If confidence is high but understanding is low, gently highlight there may be gaps to explore.
- Be concise (3–5 sentences), then optionally offer a follow-up prompt.
- Plain conversational text only — no markdown headers.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

// ── 2. Quiz Generation ───────────────────────────────────────────────────────

export interface QuizQuestion {
  text: string;
  options: string[];
  correct: number;
  explanation: string;
}

export async function generateQuiz(
  apiKey: string,
  topic: string
): Promise<{ questions: QuizQuestion[] }> {
  const model = getModel(apiKey);

  const prompt = `Generate a micro-quiz with exactly 2 multiple-choice questions to test a student's understanding of: "${topic}".

Return ONLY valid JSON (no markdown):
{
  "questions": [
    { "text": "Question?", "options": ["A", "B", "C"], "correct": 0, "explanation": "Because A." },
    { "text": "Question?", "options": ["A", "B", "C"], "correct": 1, "explanation": "Because B." }
  ]
}

"correct" is the 0-based index of the correct option. Test conceptual understanding, not rote recall.`;

  const result = await model.generateContent(prompt);
  const parsed = safeParseJSON<{ questions: QuizQuestion[] }>(result.response.text());
  if (!parsed?.questions) throw new Error('Gemini returned an invalid quiz format.');
  return parsed;
}

// ── 3. Answer Evaluation ─────────────────────────────────────────────────────

export interface EvaluationResult {
  trueScore: number;
  isWeakSpot: boolean;
  feedback: string;
  gotRight: string[];
  toStrengthen: string[];
}

export async function evaluateAnswers(
  apiKey: string,
  topic: string,
  answers: { questionText: string; chosenOption: string; correct: boolean }[],
  selfConfidence: number,
  reasoning: string
): Promise<EvaluationResult> {
  const model = getModel(apiKey);

  const summary = answers
    .map((a, i) => `Q${i+1}: "${a.questionText}" — chose: "${a.chosenOption}" (${a.correct ? 'correct' : 'incorrect'})`)
    .join('\n');

  const prompt = `Assess a student's understanding of "${topic}".

Quiz:
${summary}

Self-confidence: ${selfConfidence}/5
Reasoning: "${reasoning || 'No reasoning provided.'}"

Evaluate reasoning quality (not just answer correctness). Return ONLY valid JSON:
{
  "trueScore": 72,
  "isWeakSpot": false,
  "feedback": "Encouraging 2–3 sentence feedback.",
  "gotRight": ["Conceptual point"],
  "toStrengthen": ["Gap to address"]
}

isWeakSpot = true if self-confidence ≥ 4 AND trueScore < 60, OR reasoning reveals misconceptions.`;

  const result = await model.generateContent(prompt);
  const parsed = safeParseJSON<EvaluationResult>(result.response.text());
  if (!parsed || typeof parsed.trueScore !== 'number') throw new Error('Gemini returned an invalid evaluation format.');
  return parsed;
}

// ── 4. Explain-Back ──────────────────────────────────────────────────────────

export interface ExplainBackResult {
  trueScore: number;
  summary: string;
  gotRight: string[];
  toStrengthen: string[];
}

export async function evaluateExplainBack(
  apiKey: string,
  topic: string,
  explanation: string
): Promise<ExplainBackResult> {
  const model = getModel(apiKey);

  const prompt = `Assess this student explanation of "${topic}" for clarity, completeness, and accuracy.

Explanation: "${explanation}"

Return ONLY valid JSON:
{
  "trueScore": 68,
  "summary": "1–2 sentence assessment in an encouraging tone.",
  "gotRight": ["Clear idea 1", "Clear idea 2"],
  "toStrengthen": ["Gap 1", "Gap 2"]
}

trueScore is 0–100. Be specific — name actual concepts.`;

  const result = await model.generateContent(prompt);
  const parsed = safeParseJSON<ExplainBackResult>(result.response.text());
  if (!parsed || typeof parsed.trueScore !== 'number') throw new Error('Gemini returned an invalid explain-back format.');
  return parsed;
}

// ── 5. Revision Plan ─────────────────────────────────────────────────────────

export async function generateRevisionPlan(
  apiKey: string,
  topic: string,
  confidenceScore: number,
  trueScore: number
): Promise<string[]> {
  const model = getModel(apiKey);

  const prompt = `Create a 3-step revision plan for a student who needs to strengthen their understanding of "${topic}".
Their confidence is ${confidenceScore}/100 and true understanding is ${trueScore}/100.

Each step = one short, actionable task sentence.
Return ONLY valid JSON:
{ "steps": ["Step 1", "Step 2", "Step 3"] }`;

  const result = await model.generateContent(prompt);
  const parsed = safeParseJSON<{ steps: string[] }>(result.response.text());
  if (!parsed?.steps) return ['Review your notes', 'Explain it to a friend', 'Test yourself with 3 questions'];
  return parsed.steps;
}

// ── 6. Mentor Note ───────────────────────────────────────────────────────────

export async function generateMentorNote(
  apiKey: string,
  displayName: string,
  topicSummaries: { name: string; confidence: number; understanding: number }[],
  weakSpots: string[]
): Promise<string> {
  const model = getModel(apiKey);

  const topicLines = topicSummaries
    .map(t => `- ${t.name}: confidence ${t.confidence}/100, understanding ${t.understanding}/100`)
    .join('\n');

  const prompt = `Write a brief, encouraging progress note for a mentor or parent about a student named ${displayName}.

Topics:
${topicLines || '(No topics yet)'}
Weak spots: ${weakSpots.join(', ') || 'none'}

2–3 sentences: what they're doing well, one area to watch, encouraging close.
Plain text only — no bullets, no markdown.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
