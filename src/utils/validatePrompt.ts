export const MAX_PROMPT_LENGTH = 500;

export interface PromptValidation {
  valid: boolean;
  length: number;
  error?: string;
}

export function validatePrompt(prompt: string): PromptValidation {
  const length = prompt.trim().length;
  if (length > MAX_PROMPT_LENGTH) {
    return {
      valid: false,
      length,
      error: `프롬프트는 ${MAX_PROMPT_LENGTH}자까지 입력할 수 있습니다. (현재 ${length}자)`,
    };
  }
  return { valid: true, length };
}
