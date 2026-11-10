import { describe, it, expect, vi } from 'vitest';
import { fetchUpstream } from './upstream';

describe('fetchUpstream', () => {
  it('fetch 자체가 실패하면 URL과 키를 빼고 제공사 라벨만 담은 에러를 던진다', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('connect failed https://generativelanguage.googleapis.com/x?key=SECRET-KEY-123');
    });

    const err = await fetchUpstream(
      'Gemini',
      'https://generativelanguage.googleapis.com/x?key=SECRET-KEY-123',
      {},
      fetchImpl as unknown as typeof fetch,
    ).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toBe('Gemini API network error');
    expect((err as Error).message).not.toContain('SECRET-KEY-123');
  });

  it('fetch가 성공하면 응답을 그대로 반환한다', async () => {
    const res = new Response('ok');
    const fetchImpl = vi.fn(async () => res);

    await expect(
      fetchUpstream('Claude', 'https://api.anthropic.com/v1/messages', {}, fetchImpl as unknown as typeof fetch),
    ).resolves.toBe(res);
  });
});
