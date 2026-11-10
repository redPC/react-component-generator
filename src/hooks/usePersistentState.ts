import { useState, useEffect } from 'react';
import { readStorage, writeStorage } from '../utils/storage';

export function usePersistentState<T>(
  key: string,
  initial: T,
  revive?: (raw: unknown) => T,
) {
  const [value, setValue] = useState<T>(() => {
    const raw = readStorage<unknown>(key, undefined);
    if (raw === undefined) return initial;
    return revive ? revive(raw) : (raw as T);
  });

  useEffect(() => {
    writeStorage(key, value);
  }, [key, value]);

  return [value, setValue] as const;
}
