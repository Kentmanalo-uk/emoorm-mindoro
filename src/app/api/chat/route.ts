/**
 * POST /api/chat — AI assistant endpoint.
 * Uses Qwen2.5-72B-Instruct via HuggingFace Inference API (free).
 * Works both locally and in deployment — just needs HF_TOKEN env var.
 */

import { NextRequest, NextResponse } from 'next/server';
import { askAssistant, getRelevantData } from '@/ai/local-assistant';

// Vercel: use Node.js runtime (not Edge) and allow up to 60s
export const runtime = 'nodejs';
export const maxDuration = 60;

// GET /api/chat — quick diagnostic to check if HF_TOKEN is available
export async function GET() {
  const token = process.env.HF_TOKEN;
  return NextResponse.json({
    ok: !!token,
    tokenLength: token?.length ?? 0,
    tokenPrefix: token ? token.slice(0, 6) + '...' : 'MISSING',
    env: process.env.NODE_ENV,
    allEnvKeys: Object.keys(process.env).filter(k => k.includes('HF') || k.includes('HUGGING')).join(', ') || 'none found',
  });
}

export async function POST(req: NextRequest) {
  try {
    let message = '';
    let language = 'english';
    let userName: string | undefined;
    let history: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    try {
      const body = await req.json();
      message = body.message || '';
      language = body.language || 'english';

      if (typeof body.userName === 'string') {
        userName = body.userName.slice(0, 60) || undefined;
      }

      if (Array.isArray(body.history)) {
        history = body.history
          .filter((h: unknown) => {
            if (!h || typeof h !== 'object') return false;
            const entry = h as Record<string, unknown>;
            return ['user', 'assistant'].includes(entry.role as string) && typeof entry.content === 'string';
          })
          .slice(-8)
          .map((h: Record<string, unknown>) => ({
            role: h.role as 'user' | 'assistant',
            content: String(h.content).slice(0, 500),
          }));
      }
    } catch {
      return NextResponse.json({ reply: "Sorry, I couldn't understand that request." });
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ reply: "Please type a message to get started!" });
    }

    // Fetch relevant context from Supabase
    let context = '';
    try {
      context = await getRelevantData(message);
    } catch (e) {
      console.error('[api/chat] getRelevantData failed:', e);
    }

    // Call HuggingFace Inference API
    const reply = await askAssistant(message, context, language, history, userName);

    return NextResponse.json({ reply });
  } catch (err: unknown) {
    console.error('[api/chat] Unexpected error:', err);
    // Always return 200 with a reply so the frontend shows it in chat
    return NextResponse.json({
      reply: "Sorry, I'm experiencing a temporary issue. Please try again in a moment!"
    });
  }
}
