import { useState } from 'react';
import type { GeneratedComponent } from '../types';
import { LivePreview } from './LivePreview';
import { CodeView } from './CodeView';

interface ComponentCardProps {
  component: GeneratedComponent;
  onRemove: (id: string) => void;
  onRegenerate: (prompt: string) => void;
  isLoading: boolean;
  isStreaming?: boolean;
}

type Tab = 'preview' | 'code';

export function ComponentCard({
  component,
  onRemove,
  onRegenerate,
  isLoading,
  isStreaming = false,
}: ComponentCardProps) {
  // 스트리밍 중에는 코드 탭을 열어 두고, 완료되면 미리보기 탭으로 시작하는 새 카드가 마운트된다.
  const [activeTab, setActiveTab] = useState<Tab>(isStreaming ? 'code' : 'preview');
  const [previewKey, setPreviewKey] = useState(0);
  const createdAt = component.createdAt.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="window component-card">
      <div className="title-bar">
        <span className="title-box" aria-hidden="true" />
        <span className="title-text">{isStreaming ? '생성 중...' : `${createdAt} 생성`}</span>
      </div>
      <div className="card-header">
        <p className="card-prompt">{component.prompt}</p>
        <div className="card-actions">
          {!isStreaming && (
            <button
              className="btn-refresh"
              onClick={() => setPreviewKey((k) => k + 1)}
              title="미리보기 새로고침"
              aria-label="미리보기 새로고침"
            >
              ↻
            </button>
          )}
          <button
            className="btn-regenerate"
            onClick={() => onRegenerate(component.prompt)}
            disabled={isLoading}
          >
            {isLoading ? '생성 중...' : '재생성'}
          </button>
          {!isStreaming && (
            <button
              className="btn-remove"
              onClick={() => onRemove(component.id)}
            >
              삭제
            </button>
          )}
        </div>
      </div>
      <div className="card-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'preview'}
          className={`tab ${activeTab === 'preview' ? 'tab--active' : ''}`}
          onClick={() => setActiveTab('preview')}
          disabled={isStreaming}
        >
          미리보기
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'code'}
          className={`tab ${activeTab === 'code' ? 'tab--active' : ''}`}
          onClick={() => setActiveTab('code')}
        >
          코드
        </button>
      </div>
      <div className="card-content">
        {activeTab === 'preview' ? (
          <LivePreview key={previewKey} code={component.code} />
        ) : (
          <CodeView code={component.code} isStreaming={isStreaming} />
        )}
      </div>
    </div>
  );
}
