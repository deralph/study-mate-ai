import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
let client: GoogleGenerativeAI | null = null;

export function hasAi(): boolean {
  return !!apiKey;
}

function getModel() {
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');
  if (!client) client = new GoogleGenerativeAI(apiKey);
  // Current free-tier friendly model. Override with GEMINI_MODEL if needed.
  return client.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 8192,
    },
  });
}

export async function aiText(prompt: string, system?: string): Promise<string> {
  const model = getModel();
  const full = system ? `${system}\n\n${prompt}` : prompt;
  try {
    const res = await model.generateContent(full);
    const text = res.response.text();
    if (!text?.trim()) throw new Error('AI returned an empty response. Try a shorter input.');
    return text;
  } catch (e: any) {
    const message = String(e?.message || e);
    if (message.includes('404') || message.includes('not found')) {
      throw new Error(`Configured AI model "${modelName}" is unavailable. Set GEMINI_MODEL to a supported model such as gemini-2.5-flash.`);
    }
    throw e;
  }
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
