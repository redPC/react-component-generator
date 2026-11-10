import type { GeneratedComponent } from '../types';

export const STORAGE_KEYS = {
  apiKey: 'rcg:apiKey',
  provider: 'rcg:provider',
  promptHistory: 'rcg:promptHistory',
  components: 'rcg:components',
} as const;

export const MAX_PROMPT_HISTORY = 20;

export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 용량 초과나 접근 차단 시에도 앱은 계속 동작한다.
  }
}

export function addPromptHistory(
  history: string[],
  prompt: string,
  max = MAX_PROMPT_HISTORY,
): string[] {
  return [prompt, ...history.filter((p) => p !== prompt)].slice(0, max);
}

export function reviveComponents(raw: unknown): GeneratedComponent[] {
  if (!Array.isArray(raw)) return [];
  const result: GeneratedComponent[] = [];
  for (const item of raw) {
    if (
      item &&
      typeof item.id === 'string' &&
      typeof item.prompt === 'string' &&
      typeof item.code === 'string'
    ) {
      const createdAt = new Date(item.createdAt);
      if (!Number.isNaN(createdAt.getTime())) {
        result.push({ id: item.id, prompt: item.prompt, code: item.code, createdAt });
      }
    }
  }
  return result;
}
