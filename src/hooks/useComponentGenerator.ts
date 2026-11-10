import { useState, useCallback } from 'react';
import type { GeneratedComponent, Provider } from '../types';
import { usePersistentState } from './usePersistentState';
import { STORAGE_KEYS, reviveComponents } from '../utils/storage';
import { readSseStream } from '../utils/sse';

/** 생성 진행 중인 코드. 스트리밍 동안 델타가 쌓이고, 완료되면 null로 돌아간다. */
export interface StreamingComponent {
  prompt: string;
  code: string;
}

interface UseComponentGeneratorReturn {
  components: GeneratedComponent[];
  isLoading: boolean;
  error: string | null;
  streaming: StreamingComponent | null;
  generate: (prompt: string, apiKey: string | undefined, provider: Provider) => Promise<void>;
  removeComponent: (id: string) => void;
  clearAll: () => void;
}

export function useComponentGenerator(): UseComponentGeneratorReturn {
  const [components, setComponents] = usePersistentState<GeneratedComponent[]>(
    STORAGE_KEYS.components,
    [],
    reviveComponents,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState<StreamingComponent | null>(null);

  const generate = useCallback(async (prompt: string, apiKey: string | undefined, provider: Provider) => {
    setIsLoading(true);
    setError(null);
    setStreaming({ prompt, code: '' });

    // 콜백 안에서 대입되므로 객체로 감싸 TypeScript의 좁히기 문제를 피한다.
    const result: { code: string | null } = { code: null };

    try {
      const res = await fetch('/api/generate/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, ...(apiKey && { apiKey }), provider }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate component');
      }

      if (!res.body) {
        throw new Error('Failed to generate component');
      }

      await readSseStream(res.body, (event) => {
        const data = JSON.parse(event.data);

        if (event.event === 'delta') {
          setStreaming((prev) => (prev ? { ...prev, code: prev.code + data.text } : prev));
        } else if (event.event === 'done') {
          result.code = data.code;
        } else if (event.event === 'error') {
          throw new Error(data.error || 'Failed to generate component');
        }
      });

      if (result.code === null) {
        throw new Error('Failed to generate component');
      }

      const newComponent: GeneratedComponent = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        prompt,
        code: result.code,
        createdAt: new Date(),
      };

      setComponents((prev) => [newComponent, ...prev]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsLoading(false);
      setStreaming(null);
    }
  }, [setComponents]);

  const removeComponent = useCallback((id: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
  }, [setComponents]);

  const clearAll = useCallback(() => {
    setComponents([]);
  }, [setComponents]);

  return { components, isLoading, error, streaming, generate, removeComponent, clearAll };
}
