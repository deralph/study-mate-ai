import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
let client: GoogleGenerativeAI | null = null;

export function hasAi(): boolean {
  return !!apiKey;
}

function getModel() {
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');
  if (!client) client = new GoogleGenerativeAI(apiKey);
  // Free-tier model
  return client.getGenerativeModel({ model: 'gemini-1.5-flash' });
}

export async function aiText(prompt: string, system?: string): Promise<string> {
  const model = getModel();
  const full = system ? `${system}\n\n${prompt}` : prompt;
  const res = await model.generateContent(full);
  return res.response.text();
}

export async function aiJson<T = any>(prompt: string, system?: string): Promise<T> {
  const text = await aiText(prompt, system);
  // Strip ```json fences if model adds them
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  try { return JSON.parse(cleaned) as T; }
  catch {
    const match = cleaned.match(/[\[{][\s\S]*[\]}]/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error('AI returned non-JSON: ' + cleaned.slice(0, 200));
  }
}
