import { GoogleGenerativeAI } from '@google/generative-ai';

export interface GeneratedCode {
  html: string;
  css: string;
  js: string;
  /** Where the code came from, so the UI never claims AI output it did not get. */
  source: 'gemini' | 'template';
}

export type DesignKind = 'ui' | 'anim' | 'bg' | 'svg';

const API_KEY = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim();
const MODEL = 'gemini-2.0-flash';

export const hasAiKey = Boolean(API_KEY);

const KIND_LABEL: Record<DesignKind, string> = {
  ui: 'a UI element (button, card, input, form)',
  anim: 'a CSS/JS animation',
  bg: 'a page background',
  svg: 'an inline SVG graphic',
};

const instruction = `You generate self-contained frontend designs for the NexNote code editor.
Return ONLY a JSON object, no markdown fences, no commentary, exactly this shape:
{"html":"...","css":"...","js":"..."}
Rules:
- html is a body fragment (no <html>, <head> or <body> tags, no <style> or <script> tags)
- css contains all styling
- js contains optional vanilla JavaScript, or an empty string
- never reference external images, fonts or libraries
- escape newlines properly so the JSON stays valid`;

function firstJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function parseGenerated(text: string): GeneratedCode | null {
  const candidate = firstJsonObject(text);
  if (!candidate) return null;
  try {
    const raw = JSON.parse(candidate) as { html?: unknown; css?: unknown; js?: unknown };
    return {
      html: typeof raw.html === 'string' ? raw.html : '',
      css: typeof raw.css === 'string' ? raw.css : '',
      js: typeof raw.js === 'string' ? raw.js : '',
      source: 'gemini',
    };
  } catch {
    return null;
  }
}

/** Deterministic local designs used when no API key is configured or the request fails. */
export function templateCode(prompt: string): GeneratedCode {
  const lower = prompt.toLowerCase();

  if (lower.includes('neon') || lower.includes('glow') || lower.includes('ljus')) {
    return {
      source: 'template',
      html: '<div class="neon-card">\n  <h2>NexNote</h2>\n  <p>Pulserande neondesign</p>\n  <div class="glow-ring"></div>\n</div>',
      css: '.neon-card { background: #0a0a0f; color: #fff; padding: 40px; border-radius: 20px; border: 1px solid #00f2ff; box-shadow: 0 0 20px rgba(0,242,255,0.2); position: relative; overflow: hidden; font-family: system-ui, sans-serif; }\n.glow-ring { position: absolute; width: 200px; height: 200px; border: 2px solid #00f2ff; border-radius: 50%; top: -50px; right: -50px; filter: blur(50px); animation: pulse 3s infinite; }\n@keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.8; } }',
      js: 'const card = document.querySelector(".neon-card");\nif (card) {\n  card.style.opacity = "0";\n  setTimeout(() => { card.style.transition = "opacity 1s"; card.style.opacity = "1"; }, 100);\n}',
    };
  }

  if (lower.includes('glass') || lower.includes('blur') || lower.includes('glas')) {
    return {
      source: 'template',
      html: '<div class="glass-orb">\n  <div class="content">Glassmorphism</div>\n</div>',
      css: '.glass-orb { width: 200px; height: 200px; background: rgba(255,255,255,0.1); backdrop-filter: blur(15px); border: 1px solid rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; box-shadow: 0 20px 40px rgba(0,0,0,0.4); font-family: system-ui, sans-serif; }\nbody { background: linear-gradient(45deg, #0f0c29, #302b63, #24243e); }',
      js: 'document.addEventListener("mousemove", (e) => {\n  const orb = document.querySelector(".glass-orb");\n  if (!orb) return;\n  const x = (window.innerWidth / 2 - e.pageX) / 20;\n  const y = (window.innerHeight / 2 - e.pageY) / 20;\n  orb.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`;\n});',
    };
  }

  return {
    source: 'template',
    html: '<div class="animated-bg">\n  <div class="particle"></div>\n  <h1 class="title">NexNote Design</h1>\n  <p>En lokal startpunkt — beskriv mer för ett eget förslag.</p>\n</div>',
    css: '.animated-bg { font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #fff; background: #0b0d17; overflow: hidden; }\n.title { background: linear-gradient(to right, #00f2ff, #00b4ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 3rem; margin-bottom: 10px; }\n.particle { position: absolute; width: 4px; height: 4px; background: #00f2ff; border-radius: 50%; animation: drift 10s linear infinite; }\n@keyframes drift { from { transform: translateY(100vh); } to { transform: translateY(-100px); } }',
    js: '',
  };
}

/**
 * Generates a design with Gemini when VITE_GEMINI_API_KEY is configured.
 * Falls back to a local template (and reports source: 'template') otherwise.
 */
export async function generateDesignCode(prompt: string, kind: DesignKind = 'ui'): Promise<GeneratedCode> {
  const cleanPrompt = prompt.trim();
  if (!cleanPrompt) throw new Error('Empty prompt');
  if (!API_KEY) return templateCode(cleanPrompt);

  try {
    const client = new GoogleGenerativeAI(API_KEY);
    const model = client.getGenerativeModel({
      model: MODEL,
      generationConfig: { temperature: 0.9, maxOutputTokens: 2048 },
    });
    const result = await model.generateContent(
      `${instruction}\n\nBuild ${KIND_LABEL[kind]}.\nUser prompt: ${cleanPrompt}`,
    );
    const parsed = parseGenerated(result.response.text());
    return parsed ?? templateCode(cleanPrompt);
  } catch {
    // A missing/denied key or a network failure must not block the editor.
    return templateCode(cleanPrompt);
  }
}
