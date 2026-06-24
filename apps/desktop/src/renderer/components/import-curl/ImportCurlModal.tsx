import React, { useState, useRef, useEffect } from 'react';
import { parseCurl, CurlParseResult } from '../../utils/curl-parser';
import { useTabStore } from '../../store/tab-store';
import { ImportNameModal } from '../common/ImportNameModal';

interface ImportCurlModalProps {
  onClose: () => void;
  initialValue?: string;
}

export function ImportCurlModal({ onClose, initialValue }: ImportCurlModalProps) {
  const [curlInput, setCurlInput] = useState(initialValue || '');
  const [parseResult, setParseResult] = useState<CurlParseResult | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { loadRequest } = useTabStore();

  useEffect(() => {
    textareaRef.current?.focus();
    if (initialValue) {
      handleParse(initialValue);
    }
  }, []);

  const handleParse = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      setParseResult(null);
      return;
    }
    setParseResult(parseCurl(trimmed));
  };

  const handleChange = (value: string) => {
    setCurlInput(value);
    handleParse(value);
  };

  const handleImportClick = () => {
    if (parseResult?.success && parseResult.request) {
      setShowNameModal(true);
    }
  };

  const handleNameConfirm = (name: string) => {
    if (parseResult?.success && parseResult.request) {
      // Create tab with the custom name as the title
      const request = { ...parseResult.request };
      // Store name in a way that loadRequest will pick up as tab title
      loadRequest(request, name);
      onClose();
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const req = parseResult?.request;

  // Generate default name suggestion
  const getDefaultName = (): string => {
    if (!req) return 'New Request';
    try {
      const urlObj = new URL(req.url.startsWith('http') ? req.url : `http://${req.url}`);
      return `${req.method} ${urlObj.pathname}`;
    } catch {
      return `${req.method} ${req.url}`;
    }
  };

  const methodColor: Record<string, string> = {
    GET: 'var(--method-get)', POST: 'var(--method-post)', PUT: 'var(--method-put)',
    PATCH: 'var(--method-patch)', DELETE: 'var(--method-delete)',
  };

  // Show import name modal
  if (showNameModal) {
    return (
      <ImportNameModal
        title="Enter Request Name"
        subtitle="Choose a name for the imported request"
        defaultName={getDefaultName()}
        onConfirm={handleNameConfirm}
        onCancel={() => setShowNameModal(false)}
      />
    );
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal" style={{ width: 720, maxHeight: '90vh' }}>
        <div className="modal-header">
          <span className="modal-title">Import from cURL</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {/* Input area */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>
              Paste your cURL command
            </label>
            <textarea
              ref={textareaRef}
              className="curl-import-textarea"
              value={curlInput}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={`curl -X POST https://api.example.com/data \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer token123" \\
  -d '{"name": "John", "email": "john@example.com"}'`}
              spellCheck={false}
            />
          </div>

          {/* Error state */}
          {parseResult && !parseResult.success && (
            <div className="curl-parse-error">
              <span style={{ fontWeight: 600 }}>⚠ Parse Error:</span> {parseResult.error}
            </div>
          )}

          {/* Warnings */}
          {parseResult?.warnings && parseResult.warnings.length > 0 && (
            <div className="curl-parse-warnings">
              {parseResult.warnings.map((w, i) => (
                <div key={i} style={{ fontSize: 11 }}>⚡ {w}</div>
              ))}
            </div>
          )}

          {/* Preview */}
          {parseResult?.success && req && (
            <div className="curl-preview">
              <div className="curl-preview-title">Preview</div>

              {/* Method + URL */}
              <div className="curl-preview-row">
                <span className="curl-preview-method" style={{ color: methodColor[req.method] || 'var(--text-primary)' }}>
                  {req.method}
                </span>
                <span className="curl-preview-url">{req.url}</span>
              </div>

              {/* Query params */}
              {req.params.filter(p => p.key).length > 0 && (
                <div className="curl-preview-section">
                  <div className="curl-preview-label">Query Parameters ({req.params.filter(p => p.key).length})</div>
                  {req.params.filter(p => p.key).map(p => (
                    <div key={p.id} className="curl-preview-kv">
                      <span className="curl-kv-key">{p.key}</span>
                      <span className="curl-kv-eq">=</span>
                      <span className="curl-kv-val">{p.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Headers */}
              {req.headers.filter(h => h.key).length > 0 && (
                <div className="curl-preview-section">
                  <div className="curl-preview-label">Headers ({req.headers.filter(h => h.key).length})</div>
                  {req.headers.filter(h => h.key).map(h => (
                    <div key={h.id} className="curl-preview-kv">
                      <span className="curl-kv-key">{h.key}</span>
                      <span className="curl-kv-eq">:</span>
                      <span className="curl-kv-val">{h.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Auth */}
              {req.auth.type !== 'none' && (
                <div className="curl-preview-section">
                  <div className="curl-preview-label">Authentication</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    {req.auth.type === 'bearer' && `Bearer Token: ${req.auth.bearer?.token?.substring(0, 20)}...`}
                    {req.auth.type === 'basic' && `Basic Auth: ${req.auth.basic?.username} / ••••`}
                  </div>
                </div>
              )}

              {/* Body */}
              {req.body.type !== 'none' && (
                <div className="curl-preview-section">
                  <div className="curl-preview-label">Body ({req.body.type})</div>
                  {req.body.raw && (
                    <pre className="curl-preview-body">{req.body.raw.substring(0, 500)}{req.body.raw.length > 500 ? '...' : ''}</pre>
                  )}
                  {req.body.type === 'form-data' && req.body.formData?.filter(f => f.key).map(f => (
                    <div key={f.id} className="curl-preview-kv">
                      <span className="curl-kv-key">{f.key}</span>
                      <span className="curl-kv-eq">=</span>
                      <span className="curl-kv-val">{f.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="toolbar-btn" onClick={onClose}>Cancel</button>
          <button
            className="send-btn"
            onClick={handleImportClick}
            disabled={!parseResult?.success}
            style={{ padding: '6px 24px' }}
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
