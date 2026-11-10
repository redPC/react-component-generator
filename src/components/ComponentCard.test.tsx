import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComponentCard } from './ComponentCard';

const component = {
  id: 'card-1',
  prompt: '버튼 하나',
  code: 'const Button = () => null;',
  createdAt: new Date('2026-01-01T10:00:00'),
};

describe('ComponentCard', () => {
  it('생성 중인 카드는 코드 탭이 선택되어 있다', () => {
    render(
      <ComponentCard
        component={component}
        onRemove={vi.fn()}
        onRegenerate={vi.fn()}
        isLoading={true}
        isStreaming={true}
      />,
    );

    expect(screen.getByRole('tab', { name: '코드' })).toHaveAttribute('aria-selected', 'true');
  });

  it('생성 중인 카드는 현재까지 쌓인 코드를 보여준다', () => {
    render(
      <ComponentCard
        component={component}
        onRemove={vi.fn()}
        onRegenerate={vi.fn()}
        isLoading={true}
        isStreaming={true}
      />,
    );

    expect(screen.getByText('const Button = () => null;')).toBeInTheDocument();
  });

  it('생성 중인 카드에는 삭제 버튼을 보여주지 않는다', () => {
    render(
      <ComponentCard
        component={component}
        onRemove={vi.fn()}
        onRegenerate={vi.fn()}
        isLoading={true}
        isStreaming={true}
      />,
    );

    expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument();
  });

  it('완료된 카드는 미리보기 탭이 선택되어 있다', () => {
    render(
      <ComponentCard
        component={component}
        onRemove={vi.fn()}
        onRegenerate={vi.fn()}
        isLoading={false}
      />,
    );

    expect(screen.getByRole('tab', { name: '미리보기' })).toHaveAttribute('aria-selected', 'true');
  });
});
