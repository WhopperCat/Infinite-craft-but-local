// worker.js — browser-side AI inference Web Worker.
//
// Loads a tiny instruct model via @huggingface/transformers running on WebGPU
// and answers element-combination requests from the main thread.

import { pipeline } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4';

const MODEL_ID = 'onnx-community/Falcon-H1-Tiny-90M-Instruct-ONNX';

let generator = null;

// ---------- Prompt builders ----------
function combinePrompt(a, b) {
  return `You are a creative word association game. Given two elements, respond with ONLY a single word or short phrase (max 3 words). No explanation, no punctuation, just the result.

Element 1: ${a}
Element 2: ${b}
Result:`;
}

function emojiPrompt(element) {
  return `Give one emoji that best represents: ${element}
Reply with only the emoji character.`;
}

// ---------- Output parsing ----------
function parseResult(text) {
  if (!text) return '';
  // First line only.
  const firstLine = text.split('\n')[0];
  // Strip punctuation and surrounding whitespace, collapse inner spaces.
  const cleaned = firstLine
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim()
    .replace(/\s+/g, ' ');
  return cleaned;
}

// Extract the model's continuation only (strip the prompt echo if present).
function continuation(output, prompt) {
  if (typeof output !== 'string') return '';
  if (output.startsWith(prompt)) return output.slice(prompt.length);
  return output;
}

// Validate that a string is (starts with) a single emoji.
function firstEmoji(text) {
  if (!text) return null;
  const match = text.match(
    /(\p{Extended_Pictographic}(‍\p{Extended_Pictographic})*[️\u{1F3FB}-\u{1F3FF}]*)/u
  );
  return match ? match[0] : null;
}

// ---------- Model calls ----------
async function generate(prompt, maxNewTokens) {
  const output = await generator(prompt, {
    max_new_tokens: maxNewTokens,
    do_sample: false,
    return_full_text: false
  });
  // transformers.js returns [{ generated_text }]
  let text = '';
  if (Array.isArray(output) && output.length) {
    text = output[0].generated_text ?? '';
  } else if (output && typeof output.generated_text === 'string') {
    text = output.generated_text;
  } else if (typeof output === 'string') {
    text = output;
  }
  // Some configurations still echo the prompt despite return_full_text:false.
  return continuation(text, prompt).trim() || text.trim();
}

async function getCombination(a, b) {
  const prompt = combinePrompt(a, b);
  const raw = await generate(prompt, 10);
  return parseResult(raw);
}

async function getEmoji(element) {
  const prompt = emojiPrompt(element);
  const raw = await generate(prompt, 6);
  return firstEmoji(raw) || '✨';
}

// Try once, retry once, then fall back to a safe default.
async function combineWithRetry(a, b) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await getCombination(a, b);
      if (result) {
        const emoji = await getEmoji(result);
        return { result, emoji };
      }
    } catch (e) {
      // fall through to retry / fallback
    }
  }
  return { result: 'Mixture', emoji: '✨' };
}

// ---------- Worker message protocol ----------
self.addEventListener('message', async (event) => {
  const msg = event.data || {};

  if (msg.type === 'load') {
    try {
      generator = await pipeline('text-generation', MODEL_ID, {
        dtype: 'q4f16',
        device: 'webgpu',
        progress_callback: (p) => {
          if (p && p.status === 'progress') {
            self.postMessage({
              type: 'progress',
              file: p.file || '',
              percent: Math.round(p.progress || 0)
            });
          }
        }
      });
      self.postMessage({ type: 'ready' });
    } catch (e) {
      self.postMessage({
        type: 'error',
        message: e?.message || 'Failed to load model'
      });
    }
    return;
  }

  if (msg.type === 'combine') {
    const { a, b, id } = msg;
    try {
      const { result, emoji } = await combineWithRetry(a, b);
      self.postMessage({ type: 'result', result, emoji, id });
    } catch (e) {
      self.postMessage({
        type: 'error',
        message: e?.message || 'Inference failed',
        id
      });
    }
    return;
  }
});
